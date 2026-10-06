"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared form building blocks for every product form: a labelled field
// wrapper that shows a red "required" message, and a custom dropdown.
//
// The dropdown is deliberately not a native <select>: on some platforms
// (notably Chrome on Linux) the native popup opens under the pointer, so
// the same mouse-up that opened it immediately picks whichever option
// lands under the cursor - which is how "Gaya Asesmen" kept auto-selecting
// "TKA Matematika 2023" on a single click. Options here only select on a
// full click of the option itself.

export const REQUIRED_MESSAGE = "Wajib diisi";

export function fieldClass(invalid?: boolean, extra?: string) {
  return cn(
    "w-full rounded-[8px] border bg-background px-3 py-2 text-[13px] text-ink placeholder:text-ink-tertiary focus:outline-none transition-colors",
    invalid ? "border-danger bg-danger/5 focus:border-danger" : "border-border focus:border-primary",
    extra,
  );
}

export function FormField({
  label, required, error, hint, children, className,
}: {
  label: string;
  required?: boolean;
  error?: string | null | false;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-[11px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[10px] text-ink-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

export type SelectOption = { value: string; label: string; description?: string; disabled?: boolean };

export function SelectField({
  value, onChange, options, placeholder = "Pilih...", invalid, disabled, loading, emptyText = "Tidak ada pilihan", className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function reposition() { if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect()); }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open && buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    setOpen(o => !o);
  }

  // Rendered in a portal so it is never clipped by a scrolling dialog body.
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const openUp = rect ? spaceBelow < 260 && rect.top > spaceBelow : false;
  const panel = open && rect ? createPortal(
    <div
      ref={panelRef}
      role="listbox"
      style={{
        position: "fixed",
        left: rect.left,
        width: rect.width,
        ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      }}
      className="z-[100] max-h-64 overflow-y-auto rounded-[8px] border border-border bg-surface p-1 shadow-xl"
    >
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-ink-secondary">
          <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />Memuat...
        </div>
      ) : options.length === 0 ? (
        <div className="px-3 py-2 text-[12px] text-ink-tertiary">{emptyText}</div>
      ) : options.map(o => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          disabled={o.disabled}
          onClick={() => { onChange(o.value); setOpen(false); }}
          className={cn(
            "flex w-full items-start gap-2 rounded-[6px] px-3 py-2 text-left text-[13px] transition-colors",
            o.disabled ? "cursor-not-allowed opacity-40" : "hover:bg-background",
            o.value === value ? "bg-primary-soft text-primary font-semibold" : "text-ink",
          )}
        >
          <span className="flex-1 min-w-0">
            <span className="block truncate">{o.label}</span>
            {o.description && <span className="block text-[11px] font-normal text-ink-secondary mt-0.5">{o.description}</span>}
          </span>
          {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          fieldClass(invalid, "flex items-center justify-between gap-2 text-left"),
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-ink-tertiary")}>
          {loading && !selected ? "Memuat..." : selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-tertiary transition-transform", open && "rotate-180")} />
      </button>
      {panel}
    </>
  );
}

// Small helper for "show errors only after the user tried to submit" -
// errors stay hidden while the form is pristine, then every empty
// required field turns red at once on the first submit attempt.
export function useRequiredFields<T extends Record<string, string | number | null | undefined | boolean>>(
  values: T,
  required: (keyof T)[],
) {
  const [attempted, setAttempted] = React.useState(false);
  const missing = required.filter(k => {
    const v = values[k];
    return v === null || v === undefined || v === false || (typeof v === "string" && v.trim() === "");
  });
  const errorFor = (k: keyof T) => (attempted && missing.includes(k) ? REQUIRED_MESSAGE : null);
  return {
    isValid: missing.length === 0,
    attempted,
    errorFor,
    /** Marks the form as submitted; returns true when every required field is filled. */
    validate: () => { setAttempted(true); return missing.length === 0; },
    reset: () => setAttempted(false),
  };
}
