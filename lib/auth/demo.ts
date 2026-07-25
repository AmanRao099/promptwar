import { timingSafeEqual } from "node:crypto";
import type { UserRow, EventRow } from "./service";

/**
 * Built-in demo accounts. They authenticate WITHOUT any database, so login
 * works on every deploy (including serverless hosts where the native SQLite
 * addon can't load and no Turso DB is configured). Real, DB-backed accounts
 * still work normally when storage is available.
 *
 * These are clearly-labeled shared demo logins — not private user accounts.
 * The demo caretaker is pre-linked to the demo user, and their activity is
 * kept in a small in-process log so the caretaker feed still demonstrates.
 */

export const DEMO_PASSWORD = "haven1234";

const DEMO_USER: UserRow = {
  id: 1_000_001,
  email: "demo@haven.app",
  role: "user",
  share_code: "DEMO01",
};
const DEMO_CARETAKER: UserRow = {
  id: 1_000_002,
  email: "care@haven.app",
  role: "caretaker",
  share_code: null,
};

const DEMO_USERS: Record<string, UserRow> = {
  [DEMO_USER.email]: DEMO_USER,
  [DEMO_CARETAKER.email]: DEMO_CARETAKER,
};

// In-process activity log for the demo user only. Ephemeral by design.
const demoEvents: EventRow[] = [];
let demoSeq = 1;

export function isDemoId(id: number): boolean {
  return id === DEMO_USER.id || id === DEMO_CARETAKER.id;
}

export function isDemoEmail(email: string): boolean {
  return email in DEMO_USERS;
}

export function demoAuthenticate(email: string, password: string): UserRow | null {
  const user = DEMO_USERS[email];
  if (!user) return null;
  const a = Buffer.from(password);
  const b = Buffer.from(DEMO_PASSWORD);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return user;
}

export function demoGetUser(id: number): UserRow | null {
  if (id === DEMO_USER.id) return DEMO_USER;
  if (id === DEMO_CARETAKER.id) return DEMO_CARETAKER;
  return null;
}

// The demo caretaker always sees the demo user (pre-consented).
export function demoLinkedUsers(): UserRow[] {
  return [DEMO_USER];
}

export function demoLogEvent(
  userId: number,
  type: EventRow["type"],
  payload: Record<string, unknown>,
): void {
  if (userId !== DEMO_USER.id) return;
  demoEvents.unshift({
    id: demoSeq++,
    user_id: DEMO_USER.id,
    user_email: DEMO_USER.email,
    type,
    payload,
    created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
  });
  if (demoEvents.length > 100) demoEvents.length = 100;
}

export function demoFeed(viewer: { userId: number; role: string }): EventRow[] {
  // Both the demo user (own history) and demo caretaker (linked) see the log.
  return isDemoId(viewer.userId) ? demoEvents.slice(0, 50) : [];
}
