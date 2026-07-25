import { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { detectCrisis } from "@/lib/safety/failSafe";
import { scrubPII } from "@/lib/safety/scrubber";
import { streamScript } from "@/lib/genai/client";
import type { RecoveryScript, CaregiverScript } from "@/lib/schemas/response";
import { rateLimit, clientKey } from "@/lib/http/rateLimit";

export interface ScriptRouteConfig<T> {
  scope: string;
  schema: ZodType<T>;
  systemPrompt: string;
  getNote: (data: T) => string | undefined;
  buildUserTurn: (data: T, scrubbedNote?: string) => string;
  buildMock: (data: T) => RecoveryScript | CaregiverScript;
}

const jsonHeaders = { "content-type": "application/json" };

/**
 * Shared handler for both persona routes. One place for the invariant order:
 *   rate-limit -> parse -> validate -> DETERMINISTIC CRISIS BYPASS -> scrub -> stream.
 * The crisis bypass must always precede any model dispatch.
 */
export async function handleScriptRoute<T>(
  req: NextRequest,
  cfg: ScriptRouteConfig<T>,
): Promise<Response> {
  // 1. Rate limit (abuse / cost protection).
  const rl = rateLimit(clientKey(req, cfg.scope));
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }),
      {
        status: 429,
        headers: { ...jsonHeaders, "retry-after": String(rl.retryAfterSec) },
      },
    );
  }

  // 2. Parse body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // 3. Validate payload.
  const parsed = cfg.schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // 4. DETERMINISTIC SAFETY GUARDRAIL — bypass the model entirely.
  const note = cfg.getNote(data);
  const crisis = detectCrisis(note);
  if (crisis.triggered) {
    return Response.json(
      { crisis: true, categories: [...new Set(crisis.matches.map((m) => m.category))] },
      { status: 200, headers: { "x-haven-safety": "crisis-bypass" } },
    );
  }

  // 5. Scrub PII before anything leaves for the model.
  const scrubbedNote = note ? scrubPII(note).clean : undefined;

  // 6. Stream (live Gemini or deterministic mock fallback).
  const userTurn = cfg.buildUserTurn(data, scrubbedNote);
  const mock = cfg.buildMock(data);
  const { mode, chunks } = streamScript({
    systemPrompt: cfg.systemPrompt,
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
        // Never surface raw model errors to a person in distress.
        console.error(`[${cfg.scope}] stream error`, err);
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
      "x-ratelimit-remaining": String(rl.remaining),
    },
  });
}
