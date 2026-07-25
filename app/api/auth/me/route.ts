import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUser, linkedUsers } from "@/lib/auth/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ user: null });
  const user = getUser(session.userId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      shareCode: user.share_code,
      linked:
        user.role === "caretaker"
          ? linkedUsers(user.id).map((u) => ({ id: u.id, email: u.email }))
          : undefined,
    },
  });
}
