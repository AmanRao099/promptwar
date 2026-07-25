import { describe, it, expect } from "vitest";
import { detectCrisis, isCrisis } from "@/lib/safety/failSafe";

describe("failSafe — deterministic crisis detection", () => {
  it("triggers on overdose language", () => {
    const r = detectCrisis("i think he took an overdose");
    expect(r.triggered).toBe(true);
    expect(r.matches[0].category).toBe("overdose");
  });

  it("triggers on 'unresponsive' medical emergency", () => {
    expect(isCrisis("she is unresponsive and cold")).toBe(true);
  });

  it("triggers on 'stopped breathing'", () => {
    expect(isCrisis("he stopped breathing please help")).toBe(true);
  });

  it("triggers on self-harm intent", () => {
    const r = detectCrisis("I want to die tonight");
    expect(r.triggered).toBe(true);
    expect(r.matches.some((m) => m.category === "self_harm")).toBe(true);
  });

  it("handles curly apostrophes (od’d)", () => {
    expect(isCrisis("my brother od’d again")).toBe(true);
  });

  it("does NOT trigger on ordinary craving text", () => {
    expect(isCrisis("i have a strong craving and my chest is tight")).toBe(false);
  });

  it("does NOT trigger on substrings inside safe words", () => {
    // 'god' contains 'od' but must not match overdose keyword 'od'd'.
    expect(isCrisis("thank god i called my sponsor")).toBe(false);
  });

  it("is safe on null/empty input", () => {
    expect(isCrisis(null)).toBe(false);
    expect(isCrisis(undefined)).toBe(false);
    expect(isCrisis("")).toBe(false);
  });

  it("reports every distinct matched category", () => {
    const r = detectCrisis("he is unresponsive after an overdose");
    const cats = new Set(r.matches.map((m) => m.category));
    expect(cats.has("overdose")).toBe(true);
    expect(cats.has("medical")).toBe(true);
  });
});
