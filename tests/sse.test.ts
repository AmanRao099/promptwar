import { describe, it, expect } from "vitest";
import { parseSSELine } from "@/lib/genai/client";

// Protocol-level tests for the Groq / OpenAI-compatible SSE stream parser.
describe("parseSSELine", () => {
  it("extracts a content delta", () => {
    const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
    expect(parseSSELine(line)).toEqual({ type: "delta", content: "Hello" });
  });

  it("recognizes the stream terminator", () => {
    expect(parseSSELine("data: [DONE]")).toEqual({ type: "done" });
  });

  it("ignores non-data lines (keep-alives, comments, blanks)", () => {
    expect(parseSSELine("")).toEqual({ type: "ignore" });
    expect(parseSSELine(": keep-alive")).toEqual({ type: "ignore" });
    expect(parseSSELine("event: message")).toEqual({ type: "ignore" });
  });

  it("ignores a chunk with no content (e.g. role-only first delta)", () => {
    const line = 'data: {"choices":[{"delta":{"role":"assistant"}}]}';
    expect(parseSSELine(line)).toEqual({ type: "ignore" });
  });

  it("ignores malformed JSON without throwing", () => {
    expect(parseSSELine("data: {not json")).toEqual({ type: "ignore" });
  });

  it("reassembles a full JSON body from sequential deltas", () => {
    const stream = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}',
      'data: {"choices":[{"delta":{"content":"{\\"a\\":"}}]}',
      'data: {"choices":[{"delta":{"content":"1}"}}]}',
      "data: [DONE]",
    ];
    let out = "";
    for (const line of stream) {
      const ev = parseSSELine(line);
      if (ev.type === "done") break;
      if (ev.type === "delta") out += ev.content;
    }
    expect(JSON.parse(out)).toEqual({ a: 1 });
  });
});
