import { GoogleGenAI } from "@google/genai";
import { getEnv, activeProvider } from "@/lib/env";

export interface StreamParams {
  systemPrompt: string;
  userTurn: string;
}

export interface HavenStream {
  provider: "groq" | "gemini";
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
    const detail = await res.text().catch(() => "");
    throw new Error(`groq responded ${res.status} ${detail.slice(0, 200)}`);
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
// Provider dispatch
// ---------------------------------------------------------------------------

/**
 * Live text-chunk stream from the active provider (Groq → Gemini). No mock
 * fallback: if the provider fails, the error propagates to the caller, which
 * surfaces an honest error + retry to the user. The connection is established
 * lazily on the first `.next()`, so the route can detect failures before it
 * commits to a 200 streaming response.
 */
export function streamScript(params: StreamParams): HavenStream {
  const provider = activeProvider();
  const chunks =
    provider === "groq"
      ? groqChunks(params.systemPrompt, params.userTurn)
      : geminiChunks(params.systemPrompt, params.userTurn);
  return { provider, chunks };
}
