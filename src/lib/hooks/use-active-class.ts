"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "catchup_active_class_id";

export type ActiveClassOption = { id: string; name: string };

/**
 * Real equivalent of product-app.tsx's useActiveClass()/ClassSelectorBanner
 * - the legacy "active class" concept teachers use to scope which class's
 * data they're currently looking at, shared across screens. Backed by a
 * real class id (not just a display name, since real queries need the
 * FK), persisted in localStorage as a UI preference only - not a business
 * data source, so this isn't the kind of "mock data" the migration is
 * eliminating.
 */
export function useActiveClass(classes: ActiveClassOption[]) {
  const [activeClassId, setActiveClassIdState] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      setActiveClassIdState(null);
      return;
    }
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored && classes.some((c) => c.id === stored);
    setActiveClassIdState(valid ? stored! : classes[0].id);
  }, [classes]);

  function setActiveClassId(id: string) {
    setActiveClassIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }

  const activeClass = classes.find((c) => c.id === activeClassId) ?? null;

  return { activeClassId, activeClass, setActiveClassId };
}
