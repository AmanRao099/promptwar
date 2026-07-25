import { NextRequest } from "next/server";
import { caregiverRequestSchema } from "@/lib/schemas/request";
import { detectCrisis } from "@/lib/safety/failSafe";
import { scrubPII } from "@/lib/safety/scrubber";
import { caregiverSystemPrompt, buildCaregiverUserTurn } from "@/lib/prompts";
import { streamScript } from "@/lib/genai/client";
import { buildCaregiverMock } from "@/lib/genai/mocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = caregiverRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const { tagId, note } = parsed.data;

  // ---- DETERMINISTIC SAFETY GUARDRAIL (pre-LLM, highest priority) ----
  const crisis = detectCrisis(note);
  if (crisis.triggered) {
    return Response.json(
      { crisis: true, categories: [...new Set(crisis.matches.map((m) => m.category))] },
      { status: 200, headers: { "x-haven-safety": "crisis-bypass" } },
    );
  }

  const scrubbedNote = note ? scrubPII(note).clean : undefined;

  const userTurn = buildCaregiverUserTurn({ tagId, scrubbedNote });
  const mock = buildCaregiverMock({ tagId });
  const { mode, chunks } = streamScript({
    systemPrompt: caregiverSystemPrompt,
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
        console.error("[caregiver-copilot] stream error", err);
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
