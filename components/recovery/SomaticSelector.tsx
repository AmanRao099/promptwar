"use client";

import { somaticPoints } from "@/lib/config/somatic";
import { useRecoveryStore } from "@/lib/store/recovery";

// Zero-typing body map. Tap where the craving lives. Points come from config.
export function SomaticSelector() {
  const selected = useRecoveryStore((s) => s.somaticId);
  const setSomatic = useRecoveryStore((s) => s.setSomatic);

  return (
    <div className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6 md:p-8">
      <fieldset>
        <legend className="text-headline-md text-on-surface">Body tension</legend>
        <p className="mt-1 text-sm italic text-on-surface-variant">
          Tap where you feel it in your body.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-center">
          {/* Silhouette with tappable points */}
          <div
            role="group"
            aria-label="Body map"
            className="relative mx-auto aspect-[1/2] w-44 rounded-2xl border border-outline-variant bg-surface-container-low"
          >
            <svg
              viewBox="0 0 200 400"
              className="absolute inset-0 h-full w-full text-surface-variant/60"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M100 16c14 0 25 11 25 25s-11 25-25 25-25-11-25-25 11-25 25-25M60 78h80c11 0 20 9 20 20v46H40V98c0-11 9-20 20-20M52 150h96l-4 78c0 15-16 28-44 28s-44-13-44-28l-4-78M56 262h40l-6 118c-1 10-24 10-26 0zM104 262h40l-8 118c-2 10-25 10-26 0z"
              />
            </svg>
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
                    "absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-xs font-bold transition-all active:scale-90",
                    active
                      ? "border-primary bg-primary text-on-primary shadow-[0_0_12px_theme(colors.primary)]"
                      : "border-outline bg-surface-container-high text-on-surface-variant hover:border-primary",
                  ].join(" ")}
                >
                  {p.label[0]}
                </button>
              );
            })}
          </div>

          {/* Equivalent tappable text list (a11y + desktop clarity) */}
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
                      "min-h-touch w-full rounded-lg border px-3 py-2 text-left text-sm transition-all active:scale-95",
                      active
                        ? "border-primary bg-surface-container-high text-on-surface"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
                    ].join(" ")}
                  >
                    <span className="block font-semibold text-on-surface">{p.label}</span>
                    <span className="block text-xs text-on-surface-variant">
                      {p.sensation}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </fieldset>
    </div>
  );
}
