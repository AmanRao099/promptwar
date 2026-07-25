import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/schemas/auth";
import { createUser } from "@/lib/auth/service";
import {
  createToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/http/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth"), 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const user = await createUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.role,
    );
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        shareCode: user.share_code,
      },
    });
    res.cookies.set(
      SESSION_COOKIE,
      createToken({ userId: user.id, role: user.role, email: user.email }),
      sessionCookieOptions(),
    );
    return res;
  } catch (err) {
    if ((err as Error).message === "email_taken") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    // Most common production cause: no writable disk and no TURSO_DATABASE_URL
    // configured (serverless filesystems are ephemeral/read-only).
    console.error("[auth/signup] storage error", err);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
