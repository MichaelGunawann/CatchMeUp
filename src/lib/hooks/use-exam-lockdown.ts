"use client";

import { useEffect, useRef } from "react";

/**
 * Shared "mode ujian aman" for EVERY assessment a student takes - teacher
 * exams and self-started practice alike.
 *
 * While `active`:
 *  - leaving the page (switching tab/app, minimising, losing window focus,
 *    exiting fullscreen) calls `onViolation` once
 *  - copy/cut/paste, right-click, text selection, printing and common
 *    shortcuts (Ctrl/Cmd + C, V, X, A, P, S, U, F, Esc, F11, F12) are blocked
 *  - closing/reloading the tab asks for confirmation
 *
 * A browser can never fully stop a determined student (another device is
 * always possible) - this removes the easy ways and makes every attempt to
 * leave end the attempt. Fullscreen can only be entered from a click, so
 * call `requestExamFullscreen()` directly inside the button handler that
 * starts the attempt.
 */
export function requestExamFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  } catch { /* unsupported (e.g. iPhone Safari) - focus/visibility rules still apply */ }
}

export function exitExamFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch { /* ignore */ }
}

const BLOCKED_COMBOS = new Set(["c", "v", "x", "a", "p", "s", "u", "f"]);

export function useExamLockdown(active: boolean, onViolation: (reason: string) => void) {
  const fired = useRef(false);
  const cb = useRef(onViolation);
  cb.current = onViolation;

  useEffect(() => {
    if (!active) { fired.current = false; return; }
    // Fullscreen is requested by the starting click; when it's granted
    // asynchronously a stray blur/fullscreenchange can fire - ignore events
    // in the first moment after starting.
    const startedAt = Date.now();
    const violate = (reason: string) => {
      if (fired.current || Date.now() - startedAt < 1200) return;
      fired.current = true;
      cb.current(reason);
    };

    const onVisibility = () => { if (document.hidden) violate("Kamu meninggalkan halaman ujian."); };
    const onBlur = () => violate("Kamu berpindah ke jendela atau aplikasi lain.");
    let wasFullscreen = !!document.fullscreenElement;
    const onFullscreen = () => {
      if (document.fullscreenElement) { wasFullscreen = true; return; }
      if (wasFullscreen) violate("Kamu keluar dari layar penuh.");
    };
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "f11" || k === "f12" || ((e.ctrlKey || e.metaKey) && BLOCKED_COMBOS.has(k)) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c"))) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onBeforePrint = () => violate("Mencetak halaman tidak diizinkan saat ujian.");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKey, true);
    for (const ev of ["copy", "cut", "paste", "contextmenu", "selectstart", "dragstart"]) document.addEventListener(ev, block, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("beforeprint", onBeforePrint);
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("keydown", onKey, true);
      for (const ev of ["copy", "cut", "paste", "contextmenu", "selectstart", "dragstart"]) document.removeEventListener(ev, block, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("beforeprint", onBeforePrint);
      document.body.style.userSelect = prevSelect;
    };
  }, [active]);
}
