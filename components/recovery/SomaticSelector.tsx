"use client";

import { somaticPoints } from "@/lib/config/somatic";
import { useRecoveryStore } from "@/lib/store/recovery";
import { Icon } from "@/components/ui/Icon";

// Zero-typing body selector. One tap on where the craving lives; options come
// from schema-validated config.
export function SomaticSelector() {
  const selected = useRecoveryStore((s) => s.somaticId);
  const setSomatic = useRecoveryStore((s) => s.setSomatic);

  return (
    <div className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6 md:p-8">
      <fieldset>
        <legend className="text-headline-md text-on-surface">
          Where do you feel it?
        </legend>

        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {somaticPoints.map((p) => {
            const active = selected === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSomatic(p.id)}
                  className={[
                    "flex min-h-touch w-full items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-95",
                    active
                      ? "border-primary bg-primary/15 text-on-surface"
                      : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline hover:bg-surface-container-high",
                  ].join(" ")}
                >
                  <span>
                    <span className="block font-semibold text-on-surface">
                      {p.label}
                    </span>
                    <span className="block text-xs text-on-surface-variant">
                      {p.sensation}
                    </span>
                  </span>
                  {active && (
                    <Icon name="check" className="shrink-0 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
