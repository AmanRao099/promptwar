import { NextRequest, NextResponse } from "next/server";
import { locationSchema } from "@/lib/schemas/auth";
import { getSession } from "@/lib/auth/session";
import { logEvent } from "@/lib/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Emergency live-location share. Stored as a location event so linked
// caretakers see it at the top of their feed.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "user") {
    return NextResponse.json({ error: "user_only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 422 });
  }

  logEvent(session.userId, "location", parsed.data);
  return NextResponse.json({ ok: true });
}
