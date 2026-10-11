"use client";

import { useEffect, useState } from "react";

const KEY = "catchup_subject_filter";
const EVENT = "catchup-subject-filter";

function read(): string {
  try { return window.localStorage.getItem(KEY) || "Semua"; } catch { return "Semua"; }
}

/** Sets the remembered subject from anywhere (e.g. a Beranda subject card). */
export function setSubjectFilterGlobal(subject: string) {
  try { window.localStorage.setItem(KEY, subject); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: subject }));
}

/**
 * The student's chosen subject ("Semua" = all), shared by Ujian, Materi and
 * Latihan and remembered across pages - picking Matematika once filters
 * every page to Matematika until the student switches back to "Semua".
 * A `?mapel=` query parameter overrides it (deep links from Beranda).
 */
export function useSubjectFilter(): [string, (s: string) => void] {
  const [value, setValue] = useState("Semua");

  useEffect(() => {
    let initial = read();
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("mapel");
      if (fromUrl) { initial = fromUrl; window.localStorage.setItem(KEY, fromUrl); }
    } catch { /* ignore */ }
    setValue(initial);

    const onChange = (e: Event) => setValue((e as CustomEvent<string>).detail);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setValue(e.newValue || "Semua"); };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return [value, setSubjectFilterGlobal];
}
