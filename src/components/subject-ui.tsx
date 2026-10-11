"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { subjectStyle } from "@/lib/subject-style";

/** Coloured subject label: emoji + name, same colour on every page. */
export function SubjectBadge({ subject, size = "md", className }: { subject: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const st = subjectStyle(subject);
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-bold whitespace-nowrap",
      size === "sm" && "px-2 py-0.5 text-[11px]",
      size === "md" && "px-2.5 py-1 text-[12px]",
      size === "lg" && "px-3 py-1 text-[14px]",
      st.soft, className,
    )}>
      <span aria-hidden="true">{st.emoji}</span>{subject}
    </span>
  );
}

/**
 * Filter chips for subjects. "Semua" is always first and is the default -
 * nothing is hidden until the student chooses to narrow it down.
 */
export function SubjectFilter({
  subjects, value, onChange, counts, className,
}: {
  subjects: string[];
  value: string;
  onChange: (subject: string) => void;
  /** optional number shown on each chip, keyed by subject ("Semua" for total) */
  counts?: Record<string, number>;
  className?: string;
}) {
  if (subjects.length < 2) return null;
  const chip = (label: string, selected: boolean, style?: ReturnType<typeof subjectStyle>) => (
    <button
      key={label}
      type="button"
      aria-pressed={selected}
      onClick={() => onChange(label)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
        // Unselected chips stay neutral (only a small colour dot) so a row
        // of subjects doesn't become a wall of colour; the selected one
        // takes the subject's colour.
        selected
          ? cn(style ? style.active : "bg-ink text-white border-ink", "font-semibold")
          : "bg-surface text-ink-secondary border-border hover:border-border-strong hover:text-ink",
      )}
    >
      {style && <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", selected ? "bg-white" : style.solid)} />}
      {label}
      {counts?.[label] !== undefined && (
        <span className={cn("text-[11px] tabular-nums", selected ? "text-white/80" : "text-ink-tertiary")}>{counts[label]}</span>
      )}
    </button>
  );
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Filter mata pelajaran">
      {chip("Semua", value === "Semua")}
      {subjects.map(s => chip(s, value === s, subjectStyle(s)))}
    </div>
  );
}
