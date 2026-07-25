import { randomInt } from "node:crypto";
import { getDb } from "./db";
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

export function createUser(
  email: string,
  password: string,
  role: "user" | "caretaker",
): UserRow {
  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) throw new Error("email_taken");

  // Only the recovery-side role has a share code to hand to a caretaker.
  let shareCode: string | null = null;
  if (role === "user") {
    do {
      shareCode = newShareCode();
    } while (db.prepare("SELECT id FROM users WHERE share_code = ?").get(shareCode));
  }

  const info = db
    .prepare(
      "INSERT INTO users (email, password_hash, role, share_code) VALUES (?, ?, ?, ?)",
    )
    .run(email, hashPassword(password), role, shareCode);
  return {
    id: Number(info.lastInsertRowid),
    email,
    role,
    share_code: shareCode,
  };
}

export function authenticate(email: string, password: string): UserRow | null {
  const row = getDb()
    .prepare(
      "SELECT id, email, password_hash, role, share_code FROM users WHERE email = ?",
    )
    .get(email) as (UserRow & { password_hash: string }) | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    share_code: row.share_code,
  };
}

export function getUser(id: number): UserRow | null {
  const row = getDb()
    .prepare("SELECT id, email, role, share_code FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
  return row ?? null;
}

/** Caretaker links to a recovery user via that user's share code (consent). */
export function linkByCode(caretakerId: number, code: string): UserRow {
  const db = getDb();
  const target = db
    .prepare(
      "SELECT id, email, role, share_code FROM users WHERE share_code = ? AND role = 'user'",
    )
    .get(code) as UserRow | undefined;
  if (!target) throw new Error("code_not_found");
  db.prepare(
    "INSERT OR IGNORE INTO links (caretaker_id, user_id) VALUES (?, ?)",
  ).run(caretakerId, target.id);
  return target;
}

export function linkedUsers(caretakerId: number): UserRow[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, u.role, u.share_code FROM links l
       JOIN users u ON u.id = l.user_id WHERE l.caretaker_id = ?`,
    )
    .all(caretakerId) as UserRow[];
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

export function logEvent(
  userId: number,
  type: "checkin" | "voice" | "sos" | "location",
  payload: Record<string, unknown>,
): void {
  getDb()
    .prepare("INSERT INTO events (user_id, type, payload) VALUES (?, ?, ?)")
    .run(userId, type, JSON.stringify(scrubPayload(payload)));
}

/**
 * Feed access control:
 * - caretaker: events of users linked to them (only those).
 * - user: their own events.
 */
export function feedFor(
  viewer: { userId: number; role: "user" | "caretaker" },
  limit = 50,
): EventRow[] {
  const db = getDb();
  const rows =
    viewer.role === "caretaker"
      ? db
          .prepare(
            `SELECT e.id, e.user_id, u.email AS user_email, e.type, e.payload, e.created_at
             FROM events e
             JOIN links l ON l.user_id = e.user_id AND l.caretaker_id = ?
             JOIN users u ON u.id = e.user_id
             ORDER BY e.id DESC LIMIT ?`,
          )
          .all(viewer.userId, limit)
      : db
          .prepare(
            `SELECT e.id, e.user_id, u.email AS user_email, e.type, e.payload, e.created_at
             FROM events e JOIN users u ON u.id = e.user_id
             WHERE e.user_id = ? ORDER BY e.id DESC LIMIT ?`,
          )
          .all(viewer.userId, limit);
  return (rows as Array<Omit<EventRow, "payload"> & { payload: string }>).map(
    (r) => ({ ...r, payload: JSON.parse(r.payload) }),
  );
}
