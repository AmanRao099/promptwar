"use client";

import { situationTags } from "@/lib/config/tags";
import { useCaregiverStore } from "@/lib/store/caregiver";
import { useRovingRadio } from "@/lib/client/useRovingRadio";
import { Icon } from "@/components/ui/Icon";

const TAG_IDS = situationTags.map((t) => t.id);

const SEVERITY: Record<string, { ring: string; fill: string; icon: string }> = {
  support: { ring: "border-secondary", fill: "bg-secondary/20", icon: "bolt" },
  tense: { ring: "border-primary", fill: "bg-primary/20", icon: "warning" },
  acute: { ring: "border-error", fill: "bg-error/20", icon: "medical_services" },
};

// One-tap situation picker. Tags come from schema-validated config.
export function SituationTags() {
  const selected = useCaregiverStore((s) => s.tagId);
  const setTag = useCaregiverStore((s) => s.setTag);
  const { onKeyDown, getTabIndex } = useRovingRadio(TAG_IDS, selected, setTag);

  return (
    <fieldset>
      <legend className="text-label-lg uppercase text-on-surface-variant">
        Active situation
      </legend>
      <div
        role="radiogroup"
        aria-label="Situation"
        className="mt-stack-sm grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {situationTags.map((tag, index) => {
          const active = selected === tag.id;
          const sev = SEVERITY[tag.severity];
          return (
            <button
              key={tag.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${tag.label}. ${tag.context}`}
              tabIndex={getTabIndex(index)}
              onKeyDown={onKeyDown}
              onClick={() => setTag(tag.id)}
              className={[
                "group flex min-h-touch items-center justify-between gap-3 rounded-2xl border-2 px-6 py-4 text-left transition-all active:scale-95",
                sev.ring,
                active ? sev.fill : "bg-surface-container hover:bg-surface-container-high",
              ].join(" ")}
            >
              <span>
                <span className="block text-label-lg text-on-surface">{tag.label}</span>
                <span className="mt-1 block text-sm text-on-surface-variant">
                  {tag.context}
                </span>
              </span>
              <Icon
                name={sev.icon}
                className={`shrink-0 transition-opacity ${
                  active ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                }`}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
