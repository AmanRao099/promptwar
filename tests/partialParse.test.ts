import { describe, it, expect } from "vitest";
import {
  parseRecoveryPartial,
  parseCaregiverPartial,
} from "@/lib/client/partialParse";

describe("partialParse — incremental streaming reveal", () => {
  it("extracts only fully-closed boundary lines mid-stream", () => {
    const chunk = '{"boundaryLines":["Not today.","This craving is a wa';
    const p = parseRecoveryPartial(chunk);
    // Second line is not closed yet -> only the first appears.
    expect(p.boundaryLines).toEqual(["Not today."]);
  });

  it("reveals grounding intro + closed steps progressively", () => {
    const chunk =
      '{"boundaryLines":["A"],"grounding":{"intro":"Soften your chest.","steps":["Breathe in.","Breathe ou';
    const p = parseRecoveryPartial(chunk);
    expect(p.grounding.intro).toBe("Soften your chest.");
    expect(p.grounding.steps).toEqual(["Breathe in."]);
  });

  it("parses a complete recovery document fully", () => {
    const full = JSON.stringify({
      boundaryLines: ["Not today.", "It passes."],
      grounding: { intro: "Here.", steps: ["In", "Out", "Again"] },
      affirmation: "You're still here.",
    });
    const p = parseRecoveryPartial(full);
    expect(p.boundaryLines).toHaveLength(2);
    expect(p.grounding.steps).toHaveLength(3);
    expect(p.affirmation).toBe("You're still here.");
  });

  it("handles escaped quotes inside a line", () => {
    const full = '{"boundaryLines":["I said \\"no\\" and meant it."]}';
    const p = parseRecoveryPartial(full);
    expect(p.boundaryLines[0]).toBe('I said "no" and meant it.');
  });

  it("parses caregiver sayThis + avoid", () => {
    const full = JSON.stringify({
      sayThis: ["I'm here.", "Take your time."],
      toneAdvice: "Slow and warm.",
      postureAdvice: "Sit at their level.",
      avoid: ["Don't lecture."],
    });
    const p = parseCaregiverPartial(full);
    expect(p.sayThis).toHaveLength(2);
    expect(p.avoid).toEqual(["Don't lecture."]);
    expect(p.toneAdvice).toBe("Slow and warm.");
  });

  it("returns empty structures for empty input", () => {
    const p = parseRecoveryPartial("");
    expect(p.boundaryLines).toEqual([]);
    expect(p.grounding.steps).toEqual([]);
  });
});
