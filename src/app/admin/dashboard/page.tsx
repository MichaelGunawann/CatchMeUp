"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Mail, School as SchoolIcon, UserCheck, Users } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, StatCard, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type PendingTeacherRow = {
  id: string;
  school_id: string;
  user_profiles: { full_name: string } | null;
};

type PendingStudentRow = {
  id: string;
  school_id: string;
  user_profiles: { full_name: string } | null;
};

type ClassOption = { id: string; name: string; school_id: string };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [schools, setSchools] = useState<SchoolBreakdown[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [usedInvites, setUsedInvites] = useState(0);
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacherRow[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudentRow[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassByStudent, setSelectedClassByStudent] = useState<Record<string, string>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
          { data: pendingTeacherRows, error: pendingTeacherError },
          { data: pendingStudentRows, error: pendingStudentError },
        ] = await Promise.all([
          supabase.from("schools").select("*").in("id", schoolIds),
          supabase.from("classes").select("id, name, school_id").in("school_id", schoolIds),
          supabase.from("subjects").select("id, school_id").in("school_id", schoolIds),
          supabase.from("teachers").select("id, school_id").in("school_id", schoolIds),
          supabase.from("students").select("id, school_id").in("school_id", schoolIds),
          supabase.from("parent_registration_invites").select("used_at").eq("created_by", profile.id),
          supabase
            .from("teachers")
            .select("id, school_id, user_profiles(full_name)")
            .in("school_id", schoolIds)
            .eq("status", "PENDING"),
          supabase
            .from("students")
            .select("id, school_id, user_profiles(full_name)")
            .in("school_id", schoolIds)
            .eq("status", "PENDING"),
        ]);

        if (schoolError) throw schoolError;
        if (classError) throw classError;
        if (subjectError) throw subjectError;
        if (teacherError) throw teacherError;
        if (studentError) throw studentError;
        if (inviteError) throw inviteError;
        if (pendingTeacherError) throw pendingTeacherError;
        if (pendingStudentError) throw pendingStudentError;
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
        setClassOptions((classRows ?? []) as unknown as ClassOption[]);
        setPendingTeachers((pendingTeacherRows ?? []) as unknown as PendingTeacherRow[]);
        setPendingStudents((pendingStudentRows ?? []) as unknown as PendingStudentRow[]);
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

  async function handleDecision(
    role: "TEACHER" | "STUDENT",
    recordId: string,
    decision: "ACTIVE" | "REJECTED"
  ) {
    setActionError(null);
    setActionLoadingId(recordId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired, please sign in again");

      const classId = role === "STUDENT" ? selectedClassByStudent[recordId] : undefined;

      const response = await fetch("/api/school-admin/approve-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role, recordId, decision, classId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update registration");
      }

      if (role === "TEACHER") {
        setPendingTeachers((prev) => prev.filter((t) => t.id !== recordId));
      } else {
        setPendingStudents((prev) => prev.filter((s) => s.id !== recordId));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update registration");
    } finally {
      setActionLoadingId(null);
    }
  }

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
                <UserCheck className="h-3.5 w-3.5" />
                Pendaftaran Menunggu Persetujuan
              </h2>

              {actionError && (
                <div className="mb-3">
                  <AlertPanel tone="danger" title="Gagal memproses">
                    {actionError}
                  </AlertPanel>
                </div>
              )}

              {pendingTeachers.length === 0 && pendingStudents.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="Tidak ada pendaftaran yang menunggu"
                  description="Pendaftaran guru dan siswa baru akan muncul di sini untuk disetujui atau ditolak."
                />
              ) : (
                <div className="divide-y divide-border">
                  {pendingTeachers.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">
                          {t.user_profiles?.full_name ?? "-"}
                        </div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          Guru · {schools.find((s) => s.id === t.school_id)?.name ?? "-"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="success"
                          className="h-7 text-[11px] px-2.5"
                          disabled={actionLoadingId === t.id}
                          onClick={() => handleDecision("TEACHER", t.id, "ACTIVE")}
                        >
                          Setujui
                        </Button>
                        <Button
                          variant="danger"
                          className="h-7 text-[11px] px-2.5"
                          disabled={actionLoadingId === t.id}
                          onClick={() => handleDecision("TEACHER", t.id, "REJECTED")}
                        >
                          Tolak
                        </Button>
                      </div>
                    </div>
                  ))}

                  {pendingStudents.map((s) => {
                    const schoolClasses = classOptions.filter((c) => c.school_id === s.school_id);
                    return (
                      <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-ink truncate">
                            {s.user_profiles?.full_name ?? "-"}
                          </div>
                          <div className="text-[11px] text-ink-secondary mt-0.5">
                            Siswa · {schools.find((sc) => sc.id === s.school_id)?.name ?? "-"}
                          </div>
                        </div>
                        {schoolClasses.length > 0 && (
                          <select
                            className="h-7 rounded-[4px] border border-border bg-background px-2 text-[11px] text-ink-secondary"
                            value={selectedClassByStudent[s.id] ?? ""}
                            onChange={(e) =>
                              setSelectedClassByStudent((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                          >
                            <option value="">Belum pilih kelas</option>
                            {schoolClasses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="success"
                            className="h-7 text-[11px] px-2.5"
                            disabled={actionLoadingId === s.id}
                            onClick={() => handleDecision("STUDENT", s.id, "ACTIVE")}
                          >
                            Setujui
                          </Button>
                          <Button
                            variant="danger"
                            className="h-7 text-[11px] px-2.5"
                            disabled={actionLoadingId === s.id}
                            onClick={() => handleDecision("STUDENT", s.id, "REJECTED")}
                          >
                            Tolak
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
