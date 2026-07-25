import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as voiceSupport } from "@/app/api/voice-support/route";
import { voiceReplySchema } from "@/lib/schemas/response";
import { parseVoicePartial } from "@/lib/client/partialParse";

const FAKE_REPLY = {
  reflection: "That sounds heavy, and you noticed it — that matters.",
  guidance: ["Take one slow breath out.", "Step into another room."],
  affirmation: "You're still steering.",
};

function groqSSEResponse(obj: unknown, status = 200): Response {
  const json = JSON.stringify(obj);
  const mid = Math.floor(json.length / 2);
  const lines = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: json.slice(0, mid) } }] })}\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: json.slice(mid) } }] })}\n`,
    "data: [DONE]\n",
  ];
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l));
      c.close();
    },
  });
  return new Response(status === 200 ? stream : "error", { status });
}

function post(body: unknown): Request {
  return new Request("http://t/api/voice-support", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
  }
  return acc;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => groqSSEResponse(FAKE_REPLY)));
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/voice-support", () => {
  it("streams a valid voice reply from the provider", async () => {
    const res = await voiceSupport(
      post({ transcript: "my chest is tight and I keep thinking about using" }) as never,
    );
    expect(res.headers.get("x-haven-provider")).toBe("groq");
    const json = JSON.parse(await readStream(res));
    expect(() => voiceReplySchema.parse(json)).not.toThrow();
  });

  it("BYPASSES the model when the spoken transcript is a crisis", async () => {
    const res = await voiceSupport(
      post({ transcript: "I think I want to die tonight" }) as never,
    );
    expect(res.headers.get("x-haven-safety")).toBe("crisis-bypass");
    const data = await res.json();
    expect(data.crisis).toBe(true);
    expect(data.categories).toContain("self_harm");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("scrubs PII from the transcript before it reaches the provider", async () => {
    await voiceSupport(
      post({ transcript: "call my sponsor at (415) 555-2671 I am shaky" }) as never,
    );
    const sent = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const body = String(sent.body);
    expect(body).not.toContain("555-2671");
    expect(body).toContain("[PHONE]");
  });

  it("rejects an empty transcript with 422", async () => {
    const res = await voiceSupport(post({ transcript: "" }) as never);
    expect(res.status).toBe(422);
  });
});

describe("parseVoicePartial", () => {
  it("reveals reflection and closed guidance steps mid-stream", () => {
    const chunk =
      '{"reflection":"Heard you.","guidance":["Breathe out slow.","Step outsi';
    const p = parseVoicePartial(chunk);
    expect(p.reflection).toBe("Heard you.");
    expect(p.guidance).toEqual(["Breathe out slow."]);
    expect(p.affirmation).toBeUndefined();
  });

  it("parses a complete reply", () => {
    const p = parseVoicePartial(JSON.stringify(FAKE_REPLY));
    expect(p.guidance).toHaveLength(2);
    expect(p.affirmation).toBe("You're still steering.");
  });
});
