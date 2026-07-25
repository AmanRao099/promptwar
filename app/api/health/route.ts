import { activeProvider } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness + readiness probe. Never leaks keys — only which provider is active.
export function GET() {
  const provider = activeProvider();
  return Response.json(
    {
      status: "ok",
      provider, // "groq" | "gemini"
      mode: "live",
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
