import { describe, it, expect } from "vitest";
import { POST as generateScript } from "@/app/api/generate-script/route";
import { POST as caregiver } from "@/app/api/caregiver-copilot/route";
import { recoveryScriptSchema, caregiverScriptSchema } from "@/lib/schemas/response";

// No GEMINI_API_KEY in the test env -> routes use the deterministic mock path.

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

describe("POST /api/generate-script", () => {
  it("streams a valid recovery script (mock mode) for normal input", async () => {
    const res = await generateScript(
      post("http://t/api/generate-script", { cravingValue: 4, somaticId: "chest" }) as never,
    );
    expect(res.headers.get("x-haven-mode")).toBe("mock");
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
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(data.crisis).toBe(true);
    expect(data.categories).toContain("medical");
  });

  it("rejects invalid payload with 422", async () => {
    const res = await generateScript(
      post("http://t/api/generate-script", { cravingValue: 99, somaticId: "nope" }) as never,
    );
    expect(res.status).toBe(422);
  });
});

describe("POST /api/caregiver-copilot", () => {
  it("streams a valid caregiver script (mock mode)", async () => {
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
  });
});
