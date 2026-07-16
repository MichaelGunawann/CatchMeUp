"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { LoadingPanel } from "@/components/product-primitives";
import { ProductApp } from "@/components/product-app";

/**
 * Thin real-route wrapper around the existing TeacherAssessmentStyles screen
 * in product-app.tsx - same auth guard pattern as
 * src/app/teacher/dashboard/page.tsx. Note: this screen's own data
 * (assessmentStyles, aiStyleOptions) is still mock - wrapping it only
 * removes the ENABLE_LEGACY_DEMO redirect, it does not migrate its data.
 */
export default function TeacherAssessmentStylesPage() {
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
        if (profile.role !== "TEACHER") {
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

  return <ProductApp path={["teacher", "assessment-styles"]} />;
}
