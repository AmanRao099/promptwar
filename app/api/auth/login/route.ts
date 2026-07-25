import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas/auth";
import { authenticate } from "@/lib/auth/service";
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
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 422 });
  }

  const user = authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

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
}
