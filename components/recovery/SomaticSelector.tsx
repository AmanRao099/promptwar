"use client";

import { somaticPoints } from "@/lib/config/somatic";
import { useRecoveryStore } from "@/lib/store/recovery";

// Zero-typing body map. Tap where the craving lives. Points come from config.
export function SomaticSelector() {
  const selected = useRecoveryStore((s) => s.somaticId);
  const setSomatic = useRecoveryStore((s) => s.setSomatic);

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-haven-text">
        Where do you feel it in your body?
      </legend>

      <div className="mt-4 grid gap-6 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
        {/* Silhouette with tappable points */}
        <div
          role="group"
          aria-label="Body map"
          className="relative mx-auto aspect-[1/2] w-40 rounded-2xl border border-haven-border bg-haven-surface"
        >
          {somaticPoints.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                aria-label={`${p.label}: ${p.sensation}`}
                title={p.label}
                onClick={() => setSomatic(p.id)}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className={[
                  "absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-xs font-bold transition",
                  active
                    ? "border-haven-accent bg-haven-accent text-black"
                    : "border-haven-border bg-haven-surfaceHi text-haven-muted hover:border-haven-accent",
                ].join(" ")}
              >
                {p.label[0]}
              </button>
            );
          })}
        </div>

        {/* Text-list fallback / equivalent — also fully tappable (a11y) */}
        <ul className="grid grid-cols-2 gap-2">
          {somaticPoints.map((p) => {
            const active = selected === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSomatic(p.id)}
                  className={[
                    "min-h-touch w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-haven-accent bg-haven-surfaceHi text-haven-text"
                      : "border-haven-border bg-haven-surface text-haven-muted hover:bg-haven-surfaceHi",
                  ].join(" ")}
                >
                  <span className="block font-semibold text-haven-text">
                    {p.label}
                  </span>
                  <span className="block text-xs text-haven-muted">
                    {p.sensation}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </fieldset>
  );
}
