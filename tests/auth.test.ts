import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createToken, verifyToken } from "@/lib/auth/session";
import { resetDbForTests } from "@/lib/auth/db";
import {
  createUser,
  authenticate,
  linkByCode,
  linkedUsers,
  logEvent,
  feedFor,
} from "@/lib/auth/service";

beforeAll(() => {
  resetDbForTests();
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", () => {
    const stored = hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("never stores the plaintext", () => {
    expect(hashPassword("supersecret1")).not.toContain("supersecret1");
  });
});

describe("session tokens", () => {
  it("round-trips a valid session", () => {
    const token = createToken({ userId: 7, role: "user", email: "a@b.c" });
    const s = verifyToken(token);
    expect(s?.userId).toBe(7);
    expect(s?.role).toBe("user");
  });

  it("rejects tampered tokens and expired sessions", () => {
    const token = createToken({ userId: 7, role: "user", email: "a@b.c" });
    expect(verifyToken(token.slice(0, -2) + "xx")).toBeNull();
    const expired = createToken({ userId: 7, role: "user", email: "a@b.c" }, -10);
    expect(verifyToken(expired)).toBeNull();
    expect(verifyToken(undefined)).toBeNull();
  });
});

describe("accounts, linking, and feed access control", () => {
  it("signs up both roles; only the recovery user gets a share code", () => {
    const u = createUser("pat@example.com", "password123", "user");
    const c = createUser("care@example.com", "password123", "caretaker");
    expect(u.share_code).toMatch(/^[A-Z0-9]{6}$/);
    expect(c.share_code).toBeNull();
    expect(() => createUser("pat@example.com", "x".repeat(10), "user")).toThrow(
      "email_taken",
    );
  });

  it("authenticates with correct credentials only", () => {
    expect(authenticate("pat@example.com", "password123")?.email).toBe(
      "pat@example.com",
    );
    expect(authenticate("pat@example.com", "nope-nope")).toBeNull();
  });

  it("links caretaker via share code and shows only linked users' events", () => {
    const pat = authenticate("pat@example.com", "password123")!;
    const care = authenticate("care@example.com", "password123")!;
    const stranger = createUser("stranger@example.com", "password123", "user");

    linkByCode(care.id, pat.share_code!);
    expect(linkedUsers(care.id).map((u) => u.email)).toEqual(["pat@example.com"]);

    logEvent(pat.id, "checkin", { cravingValue: 4, somaticId: "chest" });
    logEvent(pat.id, "location", { lat: 12.9, lng: 77.6, accuracy: 20 });
    logEvent(stranger.id, "sos", { trigger: "manual" });

    const feed = feedFor({ userId: care.id, role: "caretaker" });
    expect(feed).toHaveLength(2); // stranger's SOS is NOT visible
    expect(feed.every((e) => e.user_email === "pat@example.com")).toBe(true);
    expect(feed[0].type).toBe("location");
  });

  it("rejects unknown share codes", () => {
    const care = authenticate("care@example.com", "password123")!;
    expect(() => linkByCode(care.id, "ZZZZZZ")).toThrow("code_not_found");
  });

  it("scrubs PII from event payloads before storing", () => {
    const pat = authenticate("pat@example.com", "password123")!;
    logEvent(pat.id, "voice", {
      transcript: "call me at (415) 555-2671 or mail pat@example.com",
    });
    const feed = feedFor({ userId: pat.id, role: "user" }, 1);
    const stored = String(feed[0].payload.transcript);
    expect(stored).not.toContain("555-2671");
    expect(stored).toContain("[PHONE]");
    expect(stored).toContain("[EMAIL]");
  });

  it("a user sees only their own events", () => {
    const pat = authenticate("pat@example.com", "password123")!;
    const feed = feedFor({ userId: pat.id, role: "user" });
    expect(feed.every((e) => e.user_email === "pat@example.com")).toBe(true);
  });
});

describe("event payload bounds", () => {
  it("rejects oversized payloads at the schema", async () => {
    const { eventSchema } = await import("@/lib/schemas/auth");
    const big = eventSchema.safeParse({
      type: "voice",
      payload: { transcript: "x".repeat(3000) },
    });
    expect(big.success).toBe(false);
    const ok = eventSchema.safeParse({
      type: "checkin",
      payload: { cravingValue: 3, somaticId: "chest" },
    });
    expect(ok.success).toBe(true);
  });
});
