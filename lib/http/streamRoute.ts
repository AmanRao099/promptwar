import { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { detectCrisis } from "@/lib/safety/failSafe";
import { scrubPII } from "@/lib/safety/scrubber";
import { streamScript } from "@/lib/genai/client";
import { rateLimit, clientKey } from "@/lib/http/rateLimit";

export interface ScriptRouteConfig<T> {
  scope: string;
  schema: ZodType<T>;
  systemPrompt: string;
  getNote: (data: T) => string | undefined;
  buildUserTurn: (data: T, scrubbedNote?: string) => string;
}

const jsonHeaders = { "content-type": "application/json" };

function isTransient(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /\b(429|500|502|503|504|ECONNRESET|ETIMEDOUT|fetch failed)\b/i.test(msg);
}

// Open the provider stream and pull the first chunk, with one retry on a
// transient failure. Returning the first chunk here lets us fail with a proper
// 502 *before* committing to a 200 streaming response.
async function openStream(
  systemPrompt: string,
  userTurn: string,
): Promise<{
  provider: string;
  first: string;
  rest: AsyncGenerator<string, void, unknown>;
}> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { provider, chunks } = streamScript({ systemPrompt, userTurn });
      const firstResult = await chunks.next();
      if (firstResult.done || !firstResult.value) {
        throw new Error("provider returned an empty stream");
      }
      return { provider, first: firstResult.value, rest: chunks };
    } catch (err) {
      lastErr = err;
      if (attempt === 0 && isTransient(err)) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

/**
 * Shared handler for both persona routes. Invariant order:
 *   rate-limit -> parse -> validate -> DETERMINISTIC CRISIS BYPASS -> scrub -> stream.
 * The crisis bypass always precedes any model dispatch. No mock fallback: a
 * provider failure surfaces as a 502 so the client shows an honest retry.
 */
export async function handleScriptRoute<T>(
  req: NextRequest,
  cfg: ScriptRouteConfig<T>,
): Promise<Response> {
  // 1. Rate limit.
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
  const userTurn = cfg.buildUserTurn(data, scrubbedNote);

  // 6. Open the live stream (fails fast with 502 if the provider is down).
  let opened: Awaited<ReturnType<typeof openStream>>;
  try {
    opened = await openStream(cfg.systemPrompt, userTurn);
  } catch (err) {
    console.error(`[${cfg.scope}] provider unavailable`, err);
    return Response.json(
      { error: "provider_unavailable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  // 7. Stream the first chunk + the remainder.
  const encoder = new TextEncoder();
  const { first, rest } = opened;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(first));
        for await (const chunk of rest) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        // Mid-stream failure after headers are sent: log and close. The client
        // keeps whatever streamed and can retry.
        console.error(`[${cfg.scope}] stream interrupted`, err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-haven-provider": opened.provider,
      "x-ratelimit-remaining": String(rl.remaining),
    },
  });
}
