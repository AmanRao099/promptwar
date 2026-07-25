import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

// SQLite store. Single file under ./data (gitignored). Synchronous API keeps
// route handlers simple; volume here is tiny (personal check-ins, not telemetry).
// NOTE: on serverless hosts with ephemeral filesystems (e.g. Vercel) this
// resets per deploy — point DATABASE_PATH at a mounted volume, or swap the
// store for a hosted DB. All access goes through lib/auth/service.ts.

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const file =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "haven.db");
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user','caretaker')),
      share_code TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS links (
      caretaker_id INTEGER NOT NULL REFERENCES users(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (caretaker_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK (type IN ('checkin','voice','sos','location')),
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, id DESC);
  `);
  return db;
}

/** Test hook: swap in an isolated in-memory database. */
export function resetDbForTests(): void {
  db?.close();
  db = null;
  process.env.DATABASE_PATH = ":memory:";
}
