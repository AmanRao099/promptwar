import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports ok and the gemini mode without leaking the key", async () => {
    const res = GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(["live", "mock"]).toContain(body.geminiMode);
    expect(JSON.stringify(body)).not.toMatch(/AIza|AQ\./);
    expect(typeof body.time).toBe("string");
  });
});
