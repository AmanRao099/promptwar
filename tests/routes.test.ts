import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as generateScript } from "@/app/api/generate-script/route";
import { POST as caregiver } from "@/app/api/caregiver-copilot/route";
import { recoveryScriptSchema, caregiverScriptSchema } from "@/lib/schemas/response";

// A single JSON body that satisfies BOTH persona schemas (schemas are
// non-strict, so extra keys are allowed) — lets one fake stream serve both.
const FAKE_JSON = {
  boundaryLines: ["Not today.", "It passes."],
  grounding: { intro: "Breathe.", steps: ["In", "Out"] },
  affirmation: "You're here.",
  sayThis: ["I'm here."],
  toneAdvice: "Slow.",
  postureAdvice: "Sit.",
  avoid: ["Don't lecture."],
};

// Build an OpenAI-compatible SSE stream, splitting the JSON across two deltas
// to exercise the client's buffering.
function groqSSEResponse(obj: unknown, status = 200): Response {
  const json = JSON.stringify(obj);
  const mid = Math.floor(json.length / 2);
  const parts = [json.slice(0, mid), json.slice(mid)];
  const lines = [
    ...parts.map(
      (p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n`,
    ),
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

function post(url: string, body: unknown): Request {
  return new Request(url, {
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => groqSSEResponse(FAKE_JSON)),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/generate-script", () => {
  it("streams a valid recovery script from the provider", async () => {
    const res = await generateScript(
      post("http://t/api/generate-script", { cravingValue: 4, somaticId: "chest" }) as never,
    );
    expect(res.headers.get("x-haven-provider")).toBe("groq");
    const json = JSON.parse(await readStream(res));
    expect(() => recoveryScriptSchema.parse(json)).not.toThrow();
  });

  it("BYPASSES the model and returns crisis flag on emergency note", async () => {
    const res = await generateScript(
      post("http://t/api/generate-script", {
        cravingValue: 5,
        somaticId: "chest",
        note: "my friend is unresponsive and stopped breathing",
      }) as never,
    );
    expect(res.headers.get("x-haven-safety")).toBe("crisis-bypass");
    const data = await res.json();
    expect(data.crisis).toBe(true);
    expect(data.categories).toContain("medical");
    // The provider must NOT have been called on a crisis.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects invalid payload with 422", async () => {
    const res = await generateScript(
      post("http://t/api/generate-script", { cravingValue: 99, somaticId: "nope" }) as never,
    );
    expect(res.status).toBe(422);
  });

  it("returns 502 when the provider is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => groqSSEResponse(null, 500)),
    );
    const res = await generateScript(
      post("http://t/api/generate-script", { cravingValue: 2, somaticId: "hands" }) as never,
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("provider_unavailable");
  });
});

describe("POST /api/caregiver-copilot", () => {
  it("streams a valid caregiver script from the provider", async () => {
    const res = await caregiver(
      post("http://t/api/caregiver-copilot", { tagId: "angry" }) as never,
    );
    const json = JSON.parse(await readStream(res));
    expect(() => caregiverScriptSchema.parse(json)).not.toThrow();
  });

  it("bypasses model on self-harm language", async () => {
    const res = await caregiver(
      post("http://t/api/caregiver-copilot", {
        tagId: "shame",
        note: "they said they want to die",
      }) as never,
    );
    const data = await res.json();
    expect(data.crisis).toBe(true);
    expect(data.categories).toContain("self_harm");
    expect(fetch).not.toHaveBeenCalled();
  });
});
