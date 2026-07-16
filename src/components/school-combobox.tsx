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
        placeholder="Type to search for your school..."
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="school-combobox-listbox"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div
          id="school-combobox-listbox"
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No schools found</div>
          ) : (
            options.map((school) => (
              <button
                key={school.id}
                type="button"
                onClick={() => selectSchool(school)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                <div className="font-medium text-gray-900">{school.name}</div>
                {(school.city || school.province) && (
                  <div className="text-xs text-gray-500">
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
