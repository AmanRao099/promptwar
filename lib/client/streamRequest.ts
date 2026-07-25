/**
 * Shared client-side streaming POST. One implementation of the fetch/abort/
 * crisis-bypass/reader loop consumed by the recovery store, caregiver store,
 * and voice check-in — behavior stays identical across all three.
 */

export interface StreamResult {
  outcome: "done" | "crisis" | "error" | "aborted";
  /** Accumulated raw text (may be partial on error/abort). */
  text: string;
  provider: string | null;
  crisisCategories: string[];
}

export async function streamRequest(
  url: string,
  body: unknown,
  opts: {
    signal: AbortSignal;
    /** Called with the full accumulated text after each chunk. */
    onChunk: (accumulated: string) => void;
  },
): Promise<StreamResult> {
  const fail: StreamResult = {
    outcome: "error",
    text: "",
    provider: null,
    crisisCategories: [],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: opts.signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return (err as Error)?.name === "AbortError"
      ? { ...fail, outcome: "aborted" }
      : fail;
  }

  if (!res.ok) return fail;

  // Deterministic crisis bypass returns JSON, not a stream.
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    const data = (await res.json().catch(() => ({}))) as {
      crisis?: boolean;
      categories?: string[];
    };
    if (data.crisis) {
      return {
        outcome: "crisis",
        text: "",
        provider: null,
        crisisCategories: data.categories ?? [],
      };
    }
    return fail;
  }

  if (!res.body) return fail;

  const provider = res.headers.get("x-haven-provider");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      opts.onChunk(acc);
    }
  } catch (err) {
    return (err as Error)?.name === "AbortError"
      ? { ...fail, outcome: "aborted", text: acc, provider }
      : { ...fail, text: acc, provider };
  }

  return { outcome: "done", text: acc, provider, crisisCategories: [] };
}
