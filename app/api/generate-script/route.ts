import { NextRequest } from "next/server";
import { generateScriptRequestSchema } from "@/lib/schemas/request";
import { detectCrisis } from "@/lib/safety/failSafe";
import { scrubPII } from "@/lib/safety/scrubber";
import { refusalSystemPrompt, buildRecoveryUserTurn } from "@/lib/prompts";
import { streamScript } from "@/lib/genai/client";
import { buildRecoveryMock } from "@/lib/genai/mocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = generateScriptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { cravingValue, somaticId, note } = parsed.data;

  // ---- DETERMINISTIC SAFETY GUARDRAIL (pre-LLM, highest priority) ----
  const crisis = detectCrisis(note);
  if (crisis.triggered) {
    // Bypass Gemini entirely. Client renders the hardcoded 988/911 overlay.
    return Response.json(
      { crisis: true, categories: [...new Set(crisis.matches.map((m) => m.category))] },
      { status: 200, headers: { "x-haven-safety": "crisis-bypass" } },
    );
  }

  // Scrub PII before anything leaves for the model.
  const scrubbedNote = note ? scrubPII(note).clean : undefined;

  const userTurn = buildRecoveryUserTurn({ cravingValue, somaticId, scrubbedNote });
  const mock = buildRecoveryMock({ cravingValue, somaticId });
  const { mode, chunks } = streamScript({
    systemPrompt: refusalSystemPrompt,
    userTurn,
    mock,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        // On live-model failure mid-stream, close cleanly; client falls back to
        // whatever it has parsed. Never surface raw errors to a person in crisis.
        console.error("[generate-script] stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-haven-mode": mode,
    },
  });
}
