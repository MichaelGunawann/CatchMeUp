"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Users } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { parentNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentParent } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";

type LinkedChildRow = {
  relationship: string;
  students: {
    id: string;
    user_profile_id: string;
    classes: { name: string } | null;
    schools: { name: string } | null;
  } | null;
};

type LinkedChild = {
  studentId: string;
  fullName: string;
  className: string;
  schoolName: string;
  relationship: string;
  completedAttempts: number;
};

export default function ParentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [children, setChildren] = useState<LinkedChild[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Guard checks run before the try/finally below so that an
      // unauthenticated or wrong-role visit never flips `loading` to
      // false while navigating away (which would otherwise flash an
      // empty dashboard shell for a frame before the redirect lands).
      const profile = await getCurrentProfile();
      if (cancelled) return;
      if (!profile) {
        router.push("/login");
        return;
      }
      if (profile.role !== "PARENT") {
        router.push("/dashboard");
        return;
      }

      const parent = await getCurrentParent();
      if (cancelled) return;
      if (!parent) {
        setError("No parent record is linked to this account yet.");
        setLoading(false);
        return;
      }

      try {
        const { data: linkRows, error: linkError } = await supabase
          .from("parent_student_links")
          .select("relationship, students(id, user_profile_id, classes(name), schools(name))")
          .eq("parent_id", parent.id)
          .eq("verified", true);

        if (linkError) throw linkError;
        if (cancelled) return;

        const links = (linkRows ?? []) as unknown as LinkedChildRow[];
        const validLinks = links.filter((l) => l.students !== null);

        if (validLinks.length === 0) {
          setParentName(profile.full_name);
          setChildren([]);
          setLoading(false);
          return;
        }

        const profileIds = validLinks.map((l) => l.students!.user_profile_id);
        const studentIds = validLinks.map((l) => l.students!.id);

        const [{ data: profileRows, error: profileError }, { data: attemptRows, error: attemptError }] =
          await Promise.all([
            supabase.from("user_profiles").select("id, full_name").in("id", profileIds),
            supabase
              .from("assessment_attempts")
              .select("student_id, status")
              .in("student_id", studentIds)
              .in("status", ["submitted", "graded"]),
          ]);

        if (profileError) throw profileError;
        if (attemptError) throw attemptError;
        if (cancelled) return;

        const nameByProfileId = new Map(
          (profileRows ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
        );

        const childList: LinkedChild[] = validLinks.map((l) => ({
          studentId: l.students!.id,
          fullName: nameByProfileId.get(l.students!.user_profile_id) ?? "-",
          className: l.students!.classes?.name ?? "-",
          schoolName: l.students!.schools?.name ?? "-",
          relationship: l.relationship,
          completedAttempts: (attemptRows ?? []).filter(
            (a: { student_id: string }) => a.student_id === l.students!.id
          ).length,
        }));

        setParentName(profile.full_name);
        setChildren(childList);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AppShell role="parent" nav={parentNav}>
      <div className="space-y-6">
        <PageHeader
          title={parentName ? `Halo, ${parentName.split(" ")[0]}` : "Portal Orang Tua"}
          description={children.length > 0 ? `Memantau ${children.length} anak` : undefined}
        />

        {error && (
          <AlertPanel tone="danger" title="Tidak dapat memuat data">
            {error}
          </AlertPanel>
        )}

        {loading ? (
          <LoadingPanel message="Memuat dasbor..." />
        ) : !error ? (
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-[13px] font-bold text-ink mb-4">Anak Terhubung</h2>
            {children.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada anak terhubung"
                description="Hubungi admin sekolah untuk mengaitkan akunmu dengan data anak."
              />
            ) : (
              <div className="divide-y divide-border">
                {children.map((child) => (
                  <div key={child.studentId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink truncate">{child.fullName}</div>
                      <div className="text-[11px] text-ink-secondary mt-0.5">
                        {child.schoolName} · Kelas {child.className}
                      </div>
                    </div>
                    <Badge tone="neutral">{child.relationship}</Badge>
                    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-secondary">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {child.completedAttempts} asesmen selesai
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
