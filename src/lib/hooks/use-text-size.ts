"use client";

import { useEffect, useState } from "react";

export type TextSize = "normal" | "besar" | "sangat-besar";

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "besar", label: "Besar" },
  { value: "sangat-besar", label: "Sangat Besar" },
];

const STORAGE_KEY = "catchup_text_size";

function apply(size: TextSize) {
  if (typeof document === "undefined") return;
  if (size === "normal") delete document.documentElement.dataset.textSize;
  else document.documentElement.dataset.textSize = size;
}

/**
 * Per-device text size preference (Normal / Besar / Sangat Besar), applied
 * as html[data-text-size] - see the matching rules at the end of
 * globals.css. Students default to "Besar" (SD readers); everyone else to
 * "Normal" until they choose otherwise.
 */
export function useTextSize(defaultSize: TextSize): [TextSize, (s: TextSize) => void] {
  const [size, setSize] = useState<TextSize>(defaultSize);

  useEffect(() => {
    let stored: TextSize | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY) as TextSize | null; } catch { /* storage blocked */ }
    const initial = stored && TEXT_SIZE_OPTIONS.some(o => o.value === stored) ? stored : defaultSize;
    setSize(initial);
    apply(initial);
  }, [defaultSize]);

  function update(next: TextSize) {
    setSize(next);
    apply(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked */ }
  }

  return [size, update];
}
