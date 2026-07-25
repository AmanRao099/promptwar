"use client";

import { useCaregiverStore } from "@/lib/store/caregiver";
import { AudioGroundingButton } from "@/components/recovery/AudioGroundingButton";

// Live display of the streaming caregiver script: word-for-word lines, tone,
// posture, and things to avoid. Reads partial state for progressive reveal.
export function CaregiverScriptStream() {
  const status = useCaregiverStore((s) => s.status);
  const partial = useCaregiverStore((s) => s.partial);
  const mode = useCaregiverStore((s) => s.mode);

  if (status === "idle") return null;

  const { sayThis, toneAdvice, postureAdvice, avoid } = partial;

  return (
    <section aria-label="Your co-pilot script" aria-live="polite" className="space-y-8">
      {status === "streaming" && sayThis.length === 0 && (
        <p className="text-lg text-haven-muted">
          <span className="mr-2 inline-block animate-pulse">•••</span>
          Finding the words with you…
        </p>
      )}

      {sayThis.length > 0 && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-haven-accent">
              Say this, out loud
            </h3>
            <AudioGroundingButton lines={sayThis} />
          </div>
          <ul className="mt-3 space-y-3">
            {sayThis.map((line, i) => (
              <li
                key={i}
                className="rounded-xl border-2 border-haven-accent bg-haven-surfaceHi px-5 py-4 text-xl font-semibold leading-snug text-haven-text"
              >
                <span aria-hidden="true" className="mr-2 text-haven-accent">
                  &ldquo;
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(toneAdvice || postureAdvice) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {toneAdvice && (
            <div className="rounded-xl border border-haven-border bg-haven-surface px-5 py-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-haven-calm">
                Your voice
              </h4>
              <p className="mt-2 text-lg text-haven-text">{toneAdvice}</p>
            </div>
          )}
          {postureAdvice && (
            <div className="rounded-xl border border-haven-border bg-haven-surface px-5 py-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-haven-calm">
                Your body
              </h4>
              <p className="mt-2 text-lg text-haven-text">{postureAdvice}</p>
            </div>
          )}
        </div>
      )}

      {avoid.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-haven-warn">
            Not right now
          </h3>
          <ul className="mt-3 space-y-2">
            {avoid.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-haven-border bg-haven-surface px-4 py-3 text-lg text-haven-text"
              >
                <span aria-hidden="true" className="text-haven-warn">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
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
