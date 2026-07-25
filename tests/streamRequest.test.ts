import { describe, it, expect, afterEach, vi } from "vitest";
import { streamRequest } from "@/lib/client/streamRequest";

function textStreamResponse(chunks: string[], headers: Record<string, string> = {}): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const chunk of chunks) c.enqueue(enc.encode(chunk));
      c.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", ...headers },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("streamRequest", () => {
  it("accumulates chunks, reports provider, and resolves done", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        textStreamResponse(['{"a":', "1}"], { "x-haven-provider": "groq" }),
      ),
    );
    const seen: string[] = [];
    const r = await streamRequest("/x", {}, {
      signal: new AbortController().signal,
      onChunk: (acc) => seen.push(acc),
    });
    expect(r.outcome).toBe("done");
    expect(r.text).toBe('{"a":1}');
    expect(r.provider).toBe("groq");
    expect(seen.at(-1)).toBe('{"a":1}');
  });

  it("maps the crisis JSON bypass to a crisis outcome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ crisis: true, categories: ["medical"] }),
      ),
    );
    const r = await streamRequest("/x", {}, {
      signal: new AbortController().signal,
      onChunk: () => {},
    });
    expect(r.outcome).toBe("crisis");
    expect(r.crisisCategories).toEqual(["medical"]);
  });

  it("maps non-OK responses to error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 502 })),
    );
    const r = await streamRequest("/x", {}, {
      signal: new AbortController().signal,
      onChunk: () => {},
    });
    expect(r.outcome).toBe("error");
  });

  it("maps an aborted fetch to aborted, not error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const r = await streamRequest("/x", {}, {
      signal: new AbortController().signal,
      onChunk: () => {},
    });
    expect(r.outcome).toBe("aborted");
  });
});
