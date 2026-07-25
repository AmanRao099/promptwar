"use client";

import { useCaregiverStore } from "@/lib/store/caregiver";
import { ErrorRetry } from "@/components/ErrorRetry";
import { Icon } from "@/components/ui/Icon";
import { AudioGroundingButton } from "@/components/recovery/AudioGroundingButton";

// Live display of the streaming caregiver script: word-for-word lines, tone,
// posture, and things to avoid. Reads partial state for progressive reveal.
export function CaregiverScriptStream() {
  const status = useCaregiverStore((s) => s.status);
  const partial = useCaregiverStore((s) => s.partial);
  const generate = useCaregiverStore((s) => s.generate);

  if (status === "idle") return null;
  if (status === "error") return <ErrorRetry onRetry={generate} />;

  const { sayThis, toneAdvice, postureAdvice, avoid } = partial;

  return (
    <section aria-label="Your co-pilot script" aria-live="polite" className="space-y-8">
      {status === "streaming" && sayThis.length === 0 && (
        <p className="flex items-center gap-2 text-body-lg text-on-surface-variant">
          <span className="inline-block animate-pulse">•••</span>
          Finding the words with you…
        </p>
      )}

      {sayThis.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-secondary bg-surface-container/80 p-6 backdrop-blur md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-label-lg uppercase tracking-widest text-secondary">
              <Icon name="chat_bubble" />
              Say this, out loud
            </h3>
            <AudioGroundingButton lines={sayThis} />
          </div>
          <ul className="space-y-3">
            {sayThis.map((line, i) => (
              <li
                key={i}
                className="rounded-xl border border-secondary/40 bg-surface-container-high px-5 py-4 text-headline-md leading-snug text-on-surface"
              >
                <span aria-hidden="true" className="mr-2 text-secondary">
                  &ldquo;
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(toneAdvice || postureAdvice) && (
        <div className="grid gap-stack-md md:grid-cols-2">
          {toneAdvice && (
            <div className="flex items-start gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-6">
              <span className="rounded-lg bg-secondary/20 p-3">
                <Icon name="record_voice_over" className="text-secondary" />
              </span>
              <div>
                <h4 className="text-label-lg text-secondary">Your voice</h4>
                <p className="mt-1 text-body-lg font-semibold text-on-surface">
                  {toneAdvice}
                </p>
              </div>
            </div>
          )}
          {postureAdvice && (
            <div className="flex items-start gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-6">
              <span className="rounded-lg bg-secondary/20 p-3">
                <Icon name="accessibility_new" className="text-secondary" />
              </span>
              <div>
                <h4 className="text-label-lg text-secondary">Your body</h4>
                <p className="mt-1 text-body-lg font-semibold text-on-surface">
                  {postureAdvice}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {avoid.length > 0 && (
        <div>
          <h3 className="text-label-lg uppercase tracking-widest text-tertiary">
            Not right now
          </h3>
          <ul className="mt-3 space-y-2">
            {avoid.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-lg text-on-surface"
              >
                <Icon name="do_not_disturb_on" className="text-tertiary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
