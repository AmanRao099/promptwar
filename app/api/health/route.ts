import { hasLiveKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness + readiness probe. Never leaks the key — only whether one is set.
export function GET() {
  return Response.json(
    {
      status: "ok",
      geminiMode: hasLiveKey() ? "live" : "mock",
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
