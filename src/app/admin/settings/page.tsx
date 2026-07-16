"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { LoadingPanel } from "@/components/product-primitives";
import { ProductApp } from "@/components/product-app";

/**
 * Thin real-route wrapper around the existing AdminSettings screen in
 * product-app.tsx - same auth guard pattern as
 * src/app/admin/dashboard/page.tsx. Note: this screen's save button is still
 * cosmetic (does not persist to platform_settings) - wrapping it only
 * removes the ENABLE_LEGACY_DEMO redirect.
 */
export default function AdminSettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentProfile()
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          router.push("/login");
          return;
        }
        if (profile.role !== "SCHOOL_ADMIN" && profile.role !== "PLATFORM_ADMIN") {
          router.push("/dashboard");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.push("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <LoadingPanel message="Memuat..." />
      </div>
    );
  }

  return <ProductApp path={["admin", "settings"]} />;
}
