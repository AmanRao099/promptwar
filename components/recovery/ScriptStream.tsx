"use client";

import { useRecoveryStore } from "@/lib/store/recovery";
import { BoundaryCard } from "@/components/BoundaryCard";
import { AudioGroundingButton } from "./AudioGroundingButton";

// Live display of the streaming recovery script. Reads partial state so lines
// appear as they arrive; the final validated object replaces partial on done.
export function ScriptStream() {
  const status = useRecoveryStore((s) => s.status);
  const partial = useRecoveryStore((s) => s.partial);
  const mode = useRecoveryStore((s) => s.mode);

  if (status === "idle") return null;

  const { boundaryLines, grounding, affirmation } = partial;
  const groundingLines = [grounding.intro, ...grounding.steps].filter(
    (x): x is string => Boolean(x),
  );

  return (
    <section aria-label="Your script" aria-live="polite" className="space-y-8">
      {status === "streaming" && boundaryLines.length === 0 && (
        <p className="text-lg text-haven-muted">
          <span className="mr-2 inline-block animate-pulse">•••</span>
          Finding your words…
        </p>
      )}

      {boundaryLines.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-haven-accent">
            Say this
          </h3>
          <ul className="mt-3 space-y-3">
            {boundaryLines.map((line, i) => (
              <BoundaryCard key={i} line={line} index={i} />
            ))}
          </ul>
        </div>
      )}

      {groundingLines.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-haven-calm">
              Ground yourself
            </h3>
            <AudioGroundingButton lines={groundingLines} />
          </div>
          {grounding.intro && (
            <p className="mt-3 text-lg text-haven-text">{grounding.intro}</p>
          )}
          <ol className="mt-3 space-y-2">
            {grounding.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-haven-border bg-haven-surface px-4 py-3 text-lg text-haven-text"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-haven-calm/20 font-bold text-haven-calm"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {affirmation && (
        <p className="rounded-xl border-l-4 border-haven-accent bg-haven-surface px-5 py-4 text-xl font-medium italic text-haven-text">
          {affirmation}
        </p>
      )}

      {status === "done" && mode === "mock" && (
        <p className="text-sm text-haven-muted">
          Offline demo mode — set <code>GEMINI_API_KEY</code> for live Gemini
          responses.
        </p>
      )}
    </section>
  );
}
