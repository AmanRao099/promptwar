import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("reports ok and the active provider without leaking keys", async () => {
    const res = GET();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(["groq", "gemini", "mock"]).toContain(body.provider);
    expect(["live", "mock"]).toContain(body.mode);
    expect(JSON.stringify(body)).not.toMatch(/AIza|AQ\.|gsk_/);
    expect(typeof body.time).toBe("string");
  });
});
