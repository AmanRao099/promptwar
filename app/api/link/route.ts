import { NextRequest, NextResponse } from "next/server";
import { linkSchema } from "@/lib/schemas/auth";
import { getSession } from "@/lib/auth/session";
import { linkByCode } from "@/lib/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Caretaker enters the share code a recovery user handed them. Consent-based:
// no code, no access.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "caretaker") {
    return NextResponse.json({ error: "caretaker_only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_code" }, { status: 422 });
  }

  try {
    const user = await linkByCode(session.userId, parsed.data.code);
    return NextResponse.json({ linked: { id: user.id, email: user.email } });
  } catch (err) {
    if ((err as Error).message === "code_not_found") {
      return NextResponse.json({ error: "code_not_found" }, { status: 404 });
    }
    console.error("[link] storage error", err);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
