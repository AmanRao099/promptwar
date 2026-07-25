import { describe, it, expect } from "vitest";
import {
  generateScriptRequestSchema,
  caregiverRequestSchema,
} from "@/lib/schemas/request";
import {
  recoveryScriptSchema,
  caregiverScriptSchema,
} from "@/lib/schemas/response";
import { cravingLevels } from "@/lib/config/craving";
import { somaticPoints } from "@/lib/config/somatic";
import { situationTags } from "@/lib/config/tags";

describe("config integrity", () => {
  it("craving levels are unique 1..5", () => {
    const values = cravingLevels.map((c) => c.value).sort();
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });
  it("somatic points have unique ids and in-bounds coords", () => {
    const ids = new Set(somaticPoints.map((p) => p.id));
    expect(ids.size).toBe(somaticPoints.length);
    for (const p of somaticPoints) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
    }
  });
  it("situation tags have valid severities", () => {
    for (const t of situationTags) {
      expect(["support", "tense", "acute"]).toContain(t.severity);
    }
  });
});

describe("request schemas", () => {
  it("accepts a valid generate-script payload", () => {
    const r = generateScriptRequestSchema.safeParse({
      cravingValue: 3,
      somaticId: somaticPoints[0].id,
    });
    expect(r.success).toBe(true);
  });
  it("rejects unknown somatic id", () => {
    const r = generateScriptRequestSchema.safeParse({
      cravingValue: 3,
      somaticId: "elbow",
    });
    expect(r.success).toBe(false);
  });
  it("rejects out-of-range craving", () => {
    const r = generateScriptRequestSchema.safeParse({
      cravingValue: 7,
      somaticId: somaticPoints[0].id,
    });
    expect(r.success).toBe(false);
  });
  it("caps note length at 500", () => {
    const r = generateScriptRequestSchema.safeParse({
      cravingValue: 1,
      somaticId: somaticPoints[0].id,
      note: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });
  it("accepts a valid caregiver payload and rejects bad tag", () => {
    expect(
      caregiverRequestSchema.safeParse({ tagId: situationTags[0].id }).success,
    ).toBe(true);
    expect(caregiverRequestSchema.safeParse({ tagId: "nope" }).success).toBe(false);
  });
});

describe("response schemas", () => {
  it("validates a well-formed recovery script", () => {
    const ok = recoveryScriptSchema.safeParse({
      boundaryLines: ["Not today."],
      grounding: { intro: "Breathe.", steps: ["In", "Out"] },
      affirmation: "You're okay.",
    });
    expect(ok.success).toBe(true);
  });
  it("rejects a recovery script with too few grounding steps", () => {
    const bad = recoveryScriptSchema.safeParse({
      boundaryLines: ["Not today."],
      grounding: { intro: "Breathe.", steps: ["In"] },
      affirmation: "You're okay.",
    });
    expect(bad.success).toBe(false);
  });
  it("validates a well-formed caregiver script", () => {
    const ok = caregiverScriptSchema.safeParse({
      sayThis: ["I'm here."],
      toneAdvice: "Slow.",
      postureAdvice: "Sit down.",
      avoid: ["Don't lecture."],
    });
    expect(ok.success).toBe(true);
  });
});
