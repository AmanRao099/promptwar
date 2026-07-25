import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// HMAC-signed session token in an httpOnly cookie. 30 days — the user stays
// signed in across visits until they sign out.

export const SESSION_COOKIE = "haven_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  userId: number;
  role: "user" | "caretaker";
  email: string;
  exp: number; // unix seconds
}

function secret(): string {
  // AUTH_SECRET should be set in production; the fallback keeps local dev
  // working but is not suitable for a deployed instance.
  return process.env.AUTH_SECRET || "haven-dev-secret-set-AUTH_SECRET-in-prod";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createToken(
  data: Omit<Session, "exp">,
  maxAgeSec = SESSION_MAX_AGE,
): string {
  const session: Session = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Session;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    if (session.role !== "user" && session.role !== "caretaker") return null;
    return session;
  } catch {
    return null;
  }
}

/** Read the current session from the request cookie (route handlers). */
export function getSession(): Session | null {
  return verifyToken(cookies().get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
