import { GoogleGenAI } from "@google/genai";
import { getEnv, hasLiveKey } from "@/lib/env";
import type { RecoveryScript, CaregiverScript } from "@/lib/schemas/response";

export type StreamMode = "live" | "mock";

export interface StreamParams {
  systemPrompt: string;
  userTurn: string;
  // Deterministic fallback payload streamed when no API key is configured.
  mock: RecoveryScript | CaregiverScript;
}

export interface HavenStream {
  mode: StreamMode;
  chunks: AsyncGenerator<string, void, unknown>;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const { GEMINI_API_KEY } = getEnv();
    // hasLiveKey() is checked by callers before we get here.
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY as string });
  }
  return client;
}

async function* liveChunks(
  systemPrompt: string,
  userTurn: string,
  fallback: RecoveryScript | CaregiverScript,
): AsyncGenerator<string, void, unknown> {
  const { GEMINI_MODEL } = getEnv();
  let yielded = 0;
  try {
    const stream = await getClient().models.generateContentStream({
      model: GEMINI_MODEL,
      contents: userTurn,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yielded += text.length;
        yield text;
      }
    }
  } catch (err) {
    // Live model failed (e.g. 429 quota, network). If nothing streamed yet,
    // fall back cleanly to the deterministic mock so the user is never left
    // with a blank screen. If we already emitted partial JSON, don't corrupt
    // it — rethrow so the route closes and the client keeps what parsed.
    console.error("[genai] live failed, falling back to mock:", err);
    if (yielded === 0) {
      yield* mockChunks(fallback);
      return;
    }
    throw err;
  }
}

// Stream a canned object as if typed, so the mock path exercises the exact
// same client rendering code as the live path.
async function* mockChunks(
  payload: RecoveryScript | CaregiverScript,
): AsyncGenerator<string, void, unknown> {
  const json = JSON.stringify(payload);
  const step = 24;
  for (let i = 0; i < json.length; i += step) {
    yield json.slice(i, i + step);
    // Small delay so the reveal is visible in the UI.
    await new Promise((r) => setTimeout(r, 18));
  }
}

/**
 * Returns a text-chunk stream. Uses Gemini when GEMINI_API_KEY is set,
 * otherwise streams the deterministic mock. Never throws for missing key.
 */
export function streamScript(params: StreamParams): HavenStream {
  if (hasLiveKey()) {
    return {
      mode: "live",
      chunks: liveChunks(params.systemPrompt, params.userTurn, params.mock),
    };
  }
  return { mode: "mock", chunks: mockChunks(params.mock) };
}
