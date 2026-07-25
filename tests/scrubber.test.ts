import { describe, it, expect } from "vitest";
import { scrubPII } from "@/lib/safety/scrubber";

describe("scrubber — PII redaction before Gemini dispatch", () => {
  it("redacts email", () => {
    const { clean, redactions } = scrubPII("reach me at jane.doe@mail.com ok");
    expect(clean).not.toContain("jane.doe@mail.com");
    expect(clean).toContain("[EMAIL]");
    expect(redactions.EMAIL).toBe(1);
  });

  it("redacts phone numbers", () => {
    const { clean } = scrubPII("call (415) 555-2671 now");
    expect(clean).toContain("[PHONE]");
    expect(clean).not.toContain("555-2671");
  });

  it("redacts SSN", () => {
    const { clean } = scrubPII("ssn 123-45-6789");
    expect(clean).toContain("[SSN]");
  });

  it("redacts street address", () => {
    const { clean } = scrubPII("I live at 220 Baker Street apt 2");
    expect(clean).toContain("[ADDRESS]");
    expect(clean).not.toMatch(/220 Baker Street/i);
  });

  it("redacts URLs", () => {
    const { clean } = scrubPII("see https://example.com/secret");
    expect(clean).toContain("[URL]");
  });

  it("keeps non-PII wording intact", () => {
    const { clean } = scrubPII("my chest is tight and I feel a surge");
    expect(clean).toBe("my chest is tight and I feel a surge");
  });

  it("is safe on null/empty", () => {
    expect(scrubPII(null).clean).toBe("");
    expect(scrubPII(undefined).clean).toBe("");
  });

  it("counts multiple redactions", () => {
    const { redactions } = scrubPII("a@b.com and c@d.org");
    expect(redactions.EMAIL).toBe(2);
  });
});
