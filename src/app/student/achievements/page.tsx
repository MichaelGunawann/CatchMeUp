"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { LoadingPanel } from "@/components/product-primitives";
import { ProductApp } from "@/components/product-app";

/**
 * Thin real-route wrapper around the existing StudentAchievements screen in
 * product-app.tsx - same auth guard pattern as
 * src/app/student/dashboard/page.tsx. Note: this screen's catalog
 * (achievements) is still a static mock list always earned:false - real
 * tables (achievements/student_achievements) exist from migration 007 but
 * aren't wired up yet. Wrapping it only removes the ENABLE_LEGACY_DEMO
 * redirect.
 */
export default function StudentAchievementsPage() {
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
        if (profile.role !== "STUDENT") {
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

  return <ProductApp path={["student", "achievements"]} />;
}
