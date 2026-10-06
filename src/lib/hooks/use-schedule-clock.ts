"use client";

import { useEffect, useState } from "react";

/**
 * Current time that re-renders the caller exactly when the next schedule
 * boundary (an assessment's open/close instant) is reached, plus a coarse
 * per-minute tick so countdown labels stay fresh. This is what makes an
 * "Akan Datang" assessment flip to "Bisa Dikerjakan" at the scheduled
 * minute without the student reloading the page. The server routes still
 * enforce the same window independently - this only drives the UI.
 */
export function useScheduleClock(boundaries: Array<number | null | undefined>): number {
  const [now, setNow] = useState(() => Date.now());
  const key = boundaries.filter((b): b is number => typeof b === "number" && !Number.isNaN(b)).sort().join(",");

  useEffect(() => {
    const times = key ? key.split(",").map(Number) : [];
    const current = Date.now();
    const next = times.find(t => t > current);
    // setTimeout caps at ~24.8 days; far-future boundaries are handled by
    // the minute tick re-running this effect's math on each render.
    const boundaryTimer = next !== undefined && next - current < 2 ** 31 - 1
      ? setTimeout(() => setNow(Date.now()), next - current + 250)
      : null;
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      if (boundaryTimer) clearTimeout(boundaryTimer);
      clearInterval(tick);
    };
  }, [key, now]);

  return now;
}

/** "2 hari 3 jam", "45 menit", "kurang dari 1 menit" */
export function formatCountdown(ms: number): string {
  if (ms <= 60_000) return "kurang dari 1 menit";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  if (hours > 0) return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  return `${mins} menit`;
}
