import { randomInt } from "node:crypto";
import { getDriver } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { scrubPII } from "@/lib/safety/scrubber";

export interface UserRow {
  id: number;
  email: string;
  role: "user" | "caretaker";
  share_code: string | null;
}

export interface EventRow {
  id: number;
  user_id: number;
  user_email: string;
  type: "checkin" | "voice" | "sos" | "location";
  payload: Record<string, unknown>;
  created_at: string;
}

// Share codes skip easily-confused characters (0/O, 1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newShareCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function createUser(
  email: string,
  password: string,
  role: "user" | "caretaker",
): Promise<UserRow> {
  const db = await getDriver();
  const exists = await db.get("SELECT id FROM users WHERE email = ?", [email]);
  if (exists) throw new Error("email_taken");

  // Only the recovery-side role has a share code to hand to a caretaker.
  let shareCode: string | null = null;
  if (role === "user") {
    do {
      shareCode = newShareCode();
    } while (await db.get("SELECT id FROM users WHERE share_code = ?", [shareCode]));
  }

  const { lastId } = await db.run(
    "INSERT INTO users (email, password_hash, role, share_code) VALUES (?, ?, ?, ?)",
    [email, hashPassword(password), role, shareCode],
  );
  return { id: lastId, email, role, share_code: shareCode };
}

export async function authenticate(
  email: string,
  password: string,
): Promise<UserRow | null> {
  const db = await getDriver();
  const row = await db.get<UserRow & { password_hash: string }>(
    "SELECT id, email, password_hash, role, share_code FROM users WHERE email = ?",
    [email],
  );
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    share_code: row.share_code,
  };
}

export async function getUser(id: number): Promise<UserRow | null> {
  const db = await getDriver();
  const row = await db.get<UserRow>(
    "SELECT id, email, role, share_code FROM users WHERE id = ?",
    [id],
  );
  return row ?? null;
}

/** Caretaker links to a recovery user via that user's share code (consent). */
export async function linkByCode(
  caretakerId: number,
  code: string,
): Promise<UserRow> {
  const db = await getDriver();
  const target = await db.get<UserRow>(
    "SELECT id, email, role, share_code FROM users WHERE share_code = ? AND role = 'user'",
    [code],
  );
  if (!target) throw new Error("code_not_found");
  await db.run(
    "INSERT OR IGNORE INTO links (caretaker_id, user_id) VALUES (?, ?)",
    [caretakerId, target.id],
  );
  return target;
}

export async function linkedUsers(caretakerId: number): Promise<UserRow[]> {
  const db = await getDriver();
  return db.all<UserRow>(
    `SELECT u.id, u.email, u.role, u.share_code FROM links l
     JOIN users u ON u.id = l.user_id WHERE l.caretaker_id = ?`,
    [caretakerId],
  );
}

// Scrub every string field before anything is persisted — transcripts and
// notes must never store raw PII.
function scrubPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = typeof v === "string" ? scrubPII(v).clean : v;
  }
  return out;
}

export async function logEvent(
  userId: number,
  type: "checkin" | "voice" | "sos" | "location",
  payload: Record<string, unknown>,
): Promise<void> {
  const db = await getDriver();
  await db.run("INSERT INTO events (user_id, type, payload) VALUES (?, ?, ?)", [
    userId,
    type,
    JSON.stringify(scrubPayload(payload)),
  ]);
}

/**
 * Feed access control:
 * - caretaker: events of users linked to them (only those).
 * - user: their own events.
 */
export async function feedFor(
  viewer: { userId: number; role: "user" | "caretaker" },
  limit = 50,
): Promise<EventRow[]> {
  const db = await getDriver();
  const rows =
    viewer.role === "caretaker"
      ? await db.all<Omit<EventRow, "payload"> & { payload: string }>(
          `SELECT e.id, e.user_id, u.email AS user_email, e.type, e.payload, e.created_at
           FROM events e
           JOIN links l ON l.user_id = e.user_id AND l.caretaker_id = ?
           JOIN users u ON u.id = e.user_id
           ORDER BY e.id DESC LIMIT ?`,
          [viewer.userId, limit],
        )
      : await db.all<Omit<EventRow, "payload"> & { payload: string }>(
          `SELECT e.id, e.user_id, u.email AS user_email, e.type, e.payload, e.created_at
           FROM events e JOIN users u ON u.id = e.user_id
           WHERE e.user_id = ? ORDER BY e.id DESC LIMIT ?`,
          [viewer.userId, limit],
        );
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}
