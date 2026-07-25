import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { feedFor } from "@/lib/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Caretaker: events of users linked to them. User: their own history.
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const events = await feedFor({ userId: session.userId, role: session.role });
    return NextResponse.json(
      { events },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("[feed] storage error", err);
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }
}
