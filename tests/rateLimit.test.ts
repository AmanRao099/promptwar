import { describe, it, expect } from "vitest";
import { rateLimit, clientKey } from "@/lib/http/rateLimit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks with a retry-after", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks remaining count downward", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
  });

  it("isolates buckets by key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it("derives a client key from x-forwarded-for", () => {
    const req = new Request("http://t", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(req, "scope")).toBe("scope:203.0.113.7");
  });

  it("falls back to anon without proxy headers", () => {
    expect(clientKey(new Request("http://t"), "scope")).toBe("scope:anon");
  });
});
