"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Mail, School as SchoolIcon, Users } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, StatCard, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { adminNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentSchoolAdminSchools } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import type { School } from "@/lib/supabase/types";

type SchoolBreakdown = School & {
  classCount: number;
  subjectCount: number;
  teacherCount: number;
  studentCount: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [schools, setSchools] = useState<SchoolBreakdown[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [usedInvites, setUsedInvites] = useState(0);

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
      if (profile.role !== "SCHOOL_ADMIN" && profile.role !== "PLATFORM_ADMIN") {
        router.push("/dashboard");
        return;
      }

      // PLATFORM_ADMIN is a real, schema-supported role (user_profiles.role
      // CHECK constraint), but the current schema has no platform-admin
      // data model (no `platform_admins` table, no RLS policy grants this
      // role special visibility through the anon-key client used here -
      // that access model is server-side/service-role only). Show it its
      // own explicit, clearly-labeled placeholder instead of running the
      // school_admins-specific queries below, which do not apply to it.
      if (profile.role === "PLATFORM_ADMIN") {
        setIsPlatformAdmin(true);
        setAdminName(profile.full_name);
        setLoading(false);
        return;
      }

      const adminSchools = await getCurrentSchoolAdminSchools();
      if (cancelled) return;
      if (adminSchools.length === 0) {
        setError("No school administrator record is linked to this account yet.");
        setLoading(false);
        return;
      }

      try {
        const schoolIds = adminSchools.map((sa) => sa.school_id);

        const [
          { data: schoolRows, error: schoolError },
          { data: classRows, error: classError },
          { data: subjectRows, error: subjectError },
          { data: teacherRows, error: teacherError },
          { data: studentRows, error: studentError },
          { data: inviteRows, error: inviteError },
        ] = await Promise.all([
          supabase.from("schools").select("*").in("id", schoolIds),
          supabase.from("classes").select("id, school_id").in("school_id", schoolIds),
          supabase.from("subjects").select("id, school_id").in("school_id", schoolIds),
          supabase.from("teachers").select("id, school_id").in("school_id", schoolIds),
          supabase.from("students").select("id, school_id").in("school_id", schoolIds),
          supabase.from("parent_registration_invites").select("used_at").eq("created_by", profile.id),
        ]);

        if (schoolError) throw schoolError;
        if (classError) throw classError;
        if (subjectError) throw subjectError;
        if (teacherError) throw teacherError;
        if (studentError) throw studentError;
        if (inviteError) throw inviteError;
        if (cancelled) return;

        const countBySchool = (rows: { school_id: string }[] | null, id: string) =>
          (rows ?? []).filter((r) => r.school_id === id).length;

        const breakdown: SchoolBreakdown[] = (schoolRows ?? []).map((school: School) => ({
          ...school,
          classCount: countBySchool(classRows, school.id),
          subjectCount: countBySchool(subjectRows, school.id),
          teacherCount: countBySchool(teacherRows, school.id),
          studentCount: countBySchool(studentRows, school.id),
        }));

        setAdminName(profile.full_name);
        setSchools(breakdown);
        setPendingInvites((inviteRows ?? []).filter((i: { used_at: string | null }) => !i.used_at).length);
        setUsedInvites((inviteRows ?? []).filter((i: { used_at: string | null }) => !!i.used_at).length);
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

  const totalClasses = schools.reduce((sum, s) => sum + s.classCount, 0);
  const totalTeachers = schools.reduce((sum, s) => sum + s.teacherCount, 0);
  const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);

  return (
    <AppShell role="admin" nav={adminNav}>
      <div className="space-y-6">
        <PageHeader
          title={adminName ? `Halo, ${adminName.split(" ")[0]}` : "Dasbor Admin"}
          description={
            isPlatformAdmin
              ? "Platform Administrator"
              : schools.length > 0
                ? `Mengelola ${schools.length} sekolah: ${schools.map((s) => s.name).join(", ")}`
                : undefined
          }
        />

        {error && !isPlatformAdmin && (
          <AlertPanel tone="danger" title="Tidak dapat memuat data">
            {error}
          </AlertPanel>
        )}

        {loading ? (
          <LoadingPanel message="Memuat dasbor..." />
        ) : isPlatformAdmin ? (
          <EmptyState
            icon={SchoolIcon}
            title="Dasbor Platform Admin belum tersedia"
            description="PLATFORM_ADMIN adalah peran yang didukung skema (user_profiles.role), tetapi belum memiliki model data atau kebijakan RLS khusus di aplikasi ini. Provisioning tingkat platform saat ini dilakukan langsung melalui server/service role, bukan melalui dasbor ini."
          />
        ) : !error ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Sekolah Dikelola"
                value={String(schools.length)}
                detail="Sekolah aktif"
                tone="primary"
                icon={SchoolIcon}
              />
              <StatCard
                label="Total Kelas"
                value={String(totalClasses)}
                detail="Di semua sekolah"
                tone="neutral"
                icon={BookOpen}
              />
              <StatCard
                label="Total Guru"
                value={String(totalTeachers)}
                detail="Di semua sekolah"
                tone="neutral"
                icon={GraduationCap}
              />
              <StatCard
                label="Total Siswa"
                value={String(totalStudents)}
                detail="Di semua sekolah"
                tone="neutral"
                icon={Users}
              />
            </div>

            <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-[13px] font-bold text-ink mb-4">Rincian per Sekolah</h2>
              {schools.length === 0 ? (
                <EmptyState
                  icon={SchoolIcon}
                  title="Belum mengelola sekolah"
                  description="Sekolah yang kamu kelola akan muncul di sini."
                />
              ) : (
                <div className="divide-y divide-border">
                  {schools.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">{s.name}</div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          {[s.city, s.province].filter(Boolean).join(", ") || "-"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-4 text-[11px] text-ink-secondary tabular-nums">
                        <span>{s.classCount} kelas</span>
                        <span>{s.teacherCount} guru</span>
                        <span>{s.studentCount} siswa</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-[13px] font-bold text-ink mb-4 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Undangan Orang Tua
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Menunggu"
                  value={String(pendingInvites)}
                  detail="Belum didaftarkan"
                  tone="warning"
                />
                <StatCard
                  label="Terdaftar"
                  value={String(usedInvites)}
                  detail="Sudah selesai daftar"
                  tone="success"
                />
              </div>
              {pendingInvites === 0 && usedInvites === 0 && (
                <div className="mt-2">
                  <Badge tone="neutral">Belum ada undangan orang tua yang dibuat</Badge>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
