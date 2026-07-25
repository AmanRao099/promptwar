"use client";

import { useRecoveryStore } from "@/lib/store/recovery";
import { BoundaryCard } from "@/components/BoundaryCard";
import { ErrorRetry } from "@/components/ErrorRetry";
import { Icon } from "@/components/ui/Icon";
import { AudioGroundingButton } from "./AudioGroundingButton";

// Live display of the streaming recovery script. Reads partial state so lines
// appear as they arrive; the final validated object replaces partial on done.
export function ScriptStream() {
  const status = useRecoveryStore((s) => s.status);
  const partial = useRecoveryStore((s) => s.partial);
  const generate = useRecoveryStore((s) => s.generate);

  if (status === "idle") return null;
  if (status === "error") return <ErrorRetry onRetry={generate} />;

  const { boundaryLines, grounding, affirmation } = partial;
  const groundingLines = [grounding.intro, ...grounding.steps].filter(
    (x): x is string => Boolean(x),
  );

  return (
    <section aria-label="Your script" aria-live="polite" className="space-y-8">
      {status === "streaming" && boundaryLines.length === 0 && (
        <p className="flex items-center gap-2 text-body-lg text-on-surface-variant">
          <span className="inline-block animate-pulse">•••</span>
          Finding your words…
        </p>
      )}

      {boundaryLines.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-surface-container/80 p-6 backdrop-blur md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="mb-4 flex items-center gap-2">
            <Icon name="format_quote" className="text-primary" />
            <h3 className="text-label-lg uppercase tracking-widest text-primary">
              Say this
            </h3>
          </div>
          <ul className="space-y-3">
            {boundaryLines.map((line, i) => (
              <BoundaryCard key={i} line={line} index={i} />
            ))}
          </ul>
        </div>
      )}

      {groundingLines.length > 0 && (
        <div className="rounded-2xl border-2 border-secondary/40 bg-secondary-container/10 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-label-lg uppercase tracking-widest text-secondary">
              <Icon name="self_improvement" />
              Ground yourself
            </h3>
            <AudioGroundingButton lines={groundingLines} />
          </div>
          {grounding.intro && (
            <p className="mt-4 text-body-lg text-on-surface">{grounding.intro}</p>
          )}
          <ol className="mt-4 space-y-2">
            {grounding.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-lg text-on-surface"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 font-bold text-secondary"
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
        <p className="rounded-xl border-l-4 border-primary bg-surface-container px-5 py-4 text-body-lg font-medium italic text-on-surface">
          {affirmation}
        </p>
      )}
    </section>
  );
}
