import { NextRequest } from "next/server";
import { voiceRequestSchema, type VoiceRequest } from "@/lib/schemas/request";
import { voiceSystemPrompt, buildVoiceUserTurn } from "@/lib/prompts";
import { handleScriptRoute } from "@/lib/http/streamRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free-form spoken check-in. The transcript is treated as the note, so the
// shared handler runs the full invariant order on it: rate-limit -> validate
// -> DETERMINISTIC CRISIS BYPASS -> PII scrub -> stream.
export function POST(req: NextRequest) {
  return handleScriptRoute<VoiceRequest>(req, {
    scope: "voice-support",
    schema: voiceRequestSchema,
    systemPrompt: voiceSystemPrompt,
    getNote: (d) => d.transcript,
    buildUserTurn: (_d, scrubbedNote) => buildVoiceUserTurn(scrubbedNote ?? ""),
  });
}
