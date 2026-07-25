import { GoogleGenAI } from "@google/genai";
import { getEnv, activeProvider } from "@/lib/env";
import type { RecoveryScript, CaregiverScript } from "@/lib/schemas/response";

export type StreamMode = "live" | "mock";

export interface StreamParams {
  systemPrompt: string;
  userTurn: string;
  // Deterministic fallback payload streamed when no provider is configured
  // (or when a live provider fails before emitting anything).
  mock: RecoveryScript | CaregiverScript;
}

export interface HavenStream {
  mode: StreamMode;
  chunks: AsyncGenerator<string, void, unknown>;
}

// ---------------------------------------------------------------------------
// Gemini (Google GenAI)
// ---------------------------------------------------------------------------
let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const { GEMINI_API_KEY } = getEnv();
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY as string });
  }
  return geminiClient;
}

async function* geminiChunks(
  systemPrompt: string,
  userTurn: string,
): AsyncGenerator<string, void, unknown> {
  const { GEMINI_MODEL } = getEnv();
  const stream = await getGemini().models.generateContentStream({
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
    if (text) yield text;
  }
}

// ---------------------------------------------------------------------------
// Groq (OpenAI-compatible, streaming SSE, JSON mode)
// ---------------------------------------------------------------------------

export type SSEEvent =
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "ignore" };

// Pure parser for a single SSE line from an OpenAI-compatible stream. Kept
// separate so the streaming protocol can be unit-tested without a network.
export function parseSSELine(line: string): SSEEvent {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { type: "ignore" };
  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") return { type: "done" };
  try {
    const json = JSON.parse(data);
    const content: string | undefined = json.choices?.[0]?.delta?.content;
    return content ? { type: "delta", content } : { type: "ignore" };
  } catch {
    return { type: "ignore" };
  }
}

async function* groqChunks(
  systemPrompt: string,
  userTurn: string,
): AsyncGenerator<string, void, unknown> {
  const { GROQ_API_KEY, GROQ_MODEL } = getEnv();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      temperature: 0.7,
      // JSON mode — the system prompts already instruct "return ONLY JSON".
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userTurn },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`groq responded ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the trailing partial line
    for (const line of lines) {
      const event = parseSSELine(line);
      if (event.type === "done") return;
      if (event.type === "delta") yield event.content;
    }
  }
}

// ---------------------------------------------------------------------------
// Mock (deterministic offline fallback)
// ---------------------------------------------------------------------------
async function* mockChunks(
  payload: RecoveryScript | CaregiverScript,
): AsyncGenerator<string, void, unknown> {
  const json = JSON.stringify(payload);
  const step = 24;
  for (let i = 0; i < json.length; i += step) {
    yield json.slice(i, i + step);
    await new Promise((r) => setTimeout(r, 18));
  }
}

// ---------------------------------------------------------------------------
// Provider dispatch + graceful fallback
// ---------------------------------------------------------------------------
async function* liveWithFallback(
  provider: "groq" | "gemini",
  systemPrompt: string,
  userTurn: string,
  fallback: RecoveryScript | CaregiverScript,
): AsyncGenerator<string, void, unknown> {
  let yielded = 0;
  try {
    const source =
      provider === "groq"
        ? groqChunks(systemPrompt, userTurn)
        : geminiChunks(systemPrompt, userTurn);
    for await (const chunk of source) {
      if (chunk) {
        yielded += chunk.length;
        yield chunk;
      }
    }
  } catch (err) {
    // Live provider failed (quota, suspension, network). If nothing streamed
    // yet, fall back cleanly to the mock so the user never sees a blank screen.
    // If partial JSON already went out, don't corrupt it — rethrow.
    console.error(`[genai] ${provider} failed, falling back to mock:`, err);
    if (yielded === 0) {
      yield* mockChunks(fallback);
      return;
    }
    throw err;
  }
}

/**
 * Returns a text-chunk stream. Provider order: Groq → Gemini → mock
 * (see lib/env.ts activeProvider). Never throws for a missing/failing key.
 */
export function streamScript(params: StreamParams): HavenStream {
  const provider = activeProvider();
  if (provider === "mock") {
    return { mode: "mock", chunks: mockChunks(params.mock) };
  }
  return {
    mode: "live",
    chunks: liveWithFallback(
      provider,
      params.systemPrompt,
      params.userTurn,
      params.mock,
    ),
  };
}
