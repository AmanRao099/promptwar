import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Storage driver. Two backends, one interface:
 *
 * - Turso / libSQL (hosted SQLite) — used when TURSO_DATABASE_URL is set.
 *   Required on serverless hosts (Vercel etc.) whose filesystems are
 *   ephemeral/read-only: a local .db file there loses accounts per deploy
 *   and can't be shared across lambda instances.
 * - Local better-sqlite3 file — default for dev, Docker, and any host with a
 *   persistent disk (DATABASE_PATH, defaults to ./data/haven.db).
 *
 * All access goes through lib/auth/service.ts.
 */

export interface Driver {
  run(sql: string, args?: unknown[]): Promise<{ lastId: number }>;
  get<T = Record<string, unknown>>(sql: string, args?: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, args?: unknown[]): Promise<T[]>;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user','caretaker')),
    share_code TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    caretaker_id INTEGER NOT NULL REFERENCES users(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (caretaker_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('checkin','voice','sos','location')),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, id DESC)`,
];

async function createLibsqlDriver(): Promise<Driver> {
  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN,
    intMode: "number",
  });
  for (const stmt of SCHEMA) await client.execute(stmt);
  return {
    async run(sql, args = []) {
      const r = await client.execute({ sql, args: args as never });
      return { lastId: Number(r.lastInsertRowid ?? 0) };
    },
    async get(sql, args = []) {
      const r = await client.execute({ sql, args: args as never });
      return r.rows[0] as never;
    },
    async all(sql, args = []) {
      const r = await client.execute({ sql, args: args as never });
      return r.rows as never;
    },
  };
}

async function createSqliteDriver(): Promise<Driver> {
  // Lazy import: never loaded when Turso is configured (serverless hosts).
  const { default: Database } = await import("better-sqlite3");
  const file =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "haven.db");
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA.join(";"));
  return {
    async run(sql, args = []) {
      const info = db.prepare(sql).run(...(args as never[]));
      return { lastId: Number(info.lastInsertRowid) };
    },
    async get(sql, args = []) {
      return db.prepare(sql).get(...(args as never[])) as never;
    },
    async all(sql, args = []) {
      return db.prepare(sql).all(...(args as never[])) as never;
    },
  };
}

let ready: Promise<Driver> | null = null;

export function getDriver(): Promise<Driver> {
  if (!ready) {
    ready = process.env.TURSO_DATABASE_URL
      ? createLibsqlDriver()
      : createSqliteDriver();
  }
  return ready;
}

/** Test hook: swap in an isolated in-memory database. */
export function resetDbForTests(): void {
  ready = null;
  delete process.env.TURSO_DATABASE_URL;
  process.env.DATABASE_PATH = ":memory:";
}
