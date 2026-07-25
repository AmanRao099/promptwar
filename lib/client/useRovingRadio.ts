"use client";

import { useCallback } from "react";

/**
 * WCAG radiogroup keyboard behavior for a list of custom radio buttons:
 * Arrow keys move (and select) the active option, with wraparound, and a
 * roving tabindex keeps exactly one option in the tab order.
 */
export function useRovingRadio<T>(
  values: T[],
  current: T | null,
  onChange: (v: T) => void,
) {
  const activeIndex = current == null ? -1 : values.indexOf(current);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
      const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
      if (!forward && !back) return;
      e.preventDefault();
      const base = activeIndex < 0 ? 0 : activeIndex;
      const next = forward
        ? (base + 1) % values.length
        : (base - 1 + values.length) % values.length;
      onChange(values[next]);
    },
    [activeIndex, values, onChange],
  );

  // tabIndex 0 for the active option (or the first when none selected yet),
  // -1 for the rest — so Tab enters the group once and arrows move within it.
  const getTabIndex = useCallback(
    (index: number) => {
      if (activeIndex < 0) return index === 0 ? 0 : -1;
      return index === activeIndex ? 0 : -1;
    },
    [activeIndex],
  );

  return { onKeyDown, getTabIndex };
}
