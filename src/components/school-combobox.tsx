"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type SchoolOption = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
};

/**
 * Searchable, typeable school combobox. Only ever reports a school_id
 * that came back from a real query against the schools table - free text
 * that doesn't match a selected option is never treated as a valid value,
 * so the parent form can require a real selection before submit.
 */
export function SchoolCombobox({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (schoolId: string | null, schoolName: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SchoolOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      const q = supabase.from("schools").select("id, name, city, province").order("name").limit(20);
      const { data } = query.trim()
        ? await q.ilike("name", `%${query.trim()}%`)
        : await q;
      if (!cancelled) {
        setOptions(data ?? []);
        setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function selectSchool(school: SchoolOption) {
    setQuery(school.name);
    setOpen(false);
    onChange(school.id, school.name);
  }

  function handleInputChange(text: string) {
    setQuery(text);
    setOpen(true);
    // Any manual edit invalidates the previous selection until the user
    // picks a real option again from the list.
    if (value !== null) onChange(null, text);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Ketik untuk mencari sekolah kamu..."
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="school-combobox-listbox"
        className="flex h-11 w-full rounded-button border border-border bg-surface px-3 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-secondary/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && (
        <div
          id="school-combobox-listbox"
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-button border border-border bg-surface shadow-lg"
        >
          {loading ? (
            <div className="px-3 py-2 text-[13px] text-ink-secondary">Mencari...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-ink-secondary">Sekolah tidak ditemukan</div>
          ) : (
            options.map((school) => (
              <button
                key={school.id}
                type="button"
                onClick={() => selectSchool(school)}
                className="block w-full text-left px-3 py-2 text-[13px] hover:bg-primary-soft focus:bg-primary-soft focus:outline-none"
              >
                <div className="font-medium text-ink">{school.name}</div>
                {(school.city || school.province) && (
                  <div className="text-[11px] text-ink-secondary">
                    {[school.city, school.province].filter(Boolean).join(", ")}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
