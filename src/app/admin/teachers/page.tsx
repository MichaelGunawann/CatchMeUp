"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus, X } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Button } from "@/components/ui/button";
import { adminNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentSchoolAdminSchools } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import type { School } from "@/lib/supabase/types";

type TeacherRow = {
  id: string;
  user_profiles: { full_name: string } | null;
};

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };

type AssignmentRow = {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
};

/**
 * Real teacher -> class + subject assignment management for School
 * Admins. Reads/writes go straight through the anon-key client - RLS
 * already grants school admins full manage access on teacher_assignments
 * scoped to their own ACTIVE schools (supabase/migrations/002_rls_policies.sql,
 * "School admins can manage assignments in their school"), same as
 * classes/subjects, so no server route is needed here.
 */
export default function AdminTeachersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [pickedClassByTeacher, setPickedClassByTeacher] = useState<Record<string, string>>({});
  const [pickedSubjectByTeacher, setPickedSubjectByTeacher] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const profile = await getCurrentProfile();
      if (cancelled) return;
      if (!profile) {
        router.push("/login");
        return;
      }
      if (profile.role !== "SCHOOL_ADMIN") {
        router.push("/admin/dashboard");
        return;
      }

      const adminSchools = await getCurrentSchoolAdminSchools();
      if (cancelled) return;
      if (adminSchools.length === 0) {
        setError("Belum ada catatan admin sekolah yang terhubung dengan akun ini.");
        setLoading(false);
        return;
      }

      try {
        const schoolIds = adminSchools.map((sa) => sa.school_id);
        const { data: schoolRows, error: schoolError } = await supabase
          .from("schools")
          .select("*")
          .in("id", schoolIds)
          .eq("status", "ACTIVE")
          .order("name");

        if (schoolError) throw schoolError;
        if (cancelled) return;

        const activeSchools = (schoolRows ?? []) as School[];
        setSchools(activeSchools);
        if (activeSchools.length > 0) {
          setSelectedSchoolId(activeSchools[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data sekolah");
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

  useEffect(() => {
    if (!selectedSchoolId) {
      setTeachers([]);
      setClasses([]);
      setSubjects([]);
      setAssignments([]);
      return;
    }

    let cancelled = false;

    async function loadSchoolData() {
      const [
        { data: teacherRows, error: teacherError },
        { data: classRows, error: classError },
        { data: subjectRows, error: subjectError },
        { data: assignmentRows, error: assignmentError },
      ] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, user_profiles(full_name)")
          .eq("school_id", selectedSchoolId)
          .eq("status", "ACTIVE"),
        supabase.from("classes").select("id, name").eq("school_id", selectedSchoolId).order("name"),
        supabase.from("subjects").select("id, name").eq("school_id", selectedSchoolId).order("name"),
        supabase
          .from("teacher_assignments")
          .select("id, teacher_id, class_id, subject_id")
          .eq("school_id", selectedSchoolId),
      ]);

      if (cancelled) return;
      if (!teacherError) setTeachers((teacherRows ?? []) as unknown as TeacherRow[]);
      if (!classError) setClasses((classRows ?? []) as ClassOption[]);
      if (!subjectError) setSubjects((subjectRows ?? []) as SubjectOption[]);
      if (!assignmentError) setAssignments((assignmentRows ?? []) as AssignmentRow[]);
    }

    loadSchoolData();
    return () => {
      cancelled = true;
    };
  }, [selectedSchoolId]);

  async function handleAddAssignment(teacherId: string) {
    setRowError(null);
    const classId = pickedClassByTeacher[teacherId];
    const subjectId = pickedSubjectByTeacher[teacherId];

    if (!classId || !subjectId) {
      setRowError("Pilih kelas dan mata pelajaran terlebih dahulu");
      return;
    }

    setBusyId(teacherId);
    try {
      const { data, error: insertError } = await supabase
        .from("teacher_assignments")
        .insert({
          teacher_id: teacherId,
          class_id: classId,
          subject_id: subjectId,
          school_id: selectedSchoolId,
        })
        .select()
        .single();

      if (insertError) {
        setRowError(
          insertError.code === "23505" ? "Guru ini sudah ditugaskan ke kelas dan mapel tersebut" : insertError.message
        );
        return;
      }

      setAssignments((prev) => [...prev, data as AssignmentRow]);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setRowError(null);
    setBusyId(assignmentId);
    try {
      const { error: deleteError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("id", assignmentId);

      if (deleteError) {
        setRowError(deleteError.message);
        return;
      }

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell role="admin" nav={adminNav}>
      <div className="space-y-6">
        <PageHeader
          title="Penugasan Guru"
          description="Tugaskan guru ke kelas dan mata pelajaran di sekolah yang kamu kelola."
        />

        {error && (
          <AlertPanel tone="danger" title="Tidak dapat memuat data">
            {error}
          </AlertPanel>
        )}

        {loading ? (
          <LoadingPanel message="Memuat data..." />
        ) : !error && schools.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Belum ada sekolah aktif"
            description="Penugasan guru akan tersedia setelah sekolahmu disetujui admin platform."
          />
        ) : !error ? (
          <>
            {schools.length > 1 && (
              <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
                <label htmlFor="school-select" className="mb-1.5 block text-[12px] font-semibold text-ink">
                  Sekolah
                </label>
                <select
                  id="school-select"
                  className="h-9 w-full max-w-sm rounded-button border border-border bg-background px-3 text-[13px] text-ink"
                  value={selectedSchoolId ?? ""}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rowError && (
              <AlertPanel tone="danger" title="Gagal memproses">
                {rowError}
              </AlertPanel>
            )}

            <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-[13px] font-bold text-ink mb-4">Guru Aktif</h2>

              {teachers.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Belum ada guru aktif"
                  description="Guru yang sudah disetujui akan muncul di sini."
                />
              ) : classes.length === 0 || subjects.length === 0 ? (
                <AlertPanel tone="warning" title="Belum ada kelas/mata pelajaran">
                  Tambahkan kelas dan mata pelajaran dulu di halaman{" "}
                  <span className="font-semibold">Kelas & Mata Pelajaran</span> sebelum menugaskan guru.
                </AlertPanel>
              ) : (
                <div className="divide-y divide-border">
                  {teachers.map((t) => {
                    const teacherAssignments = assignments.filter((a) => a.teacher_id === t.id);
                    return (
                      <div key={t.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="text-[13px] font-semibold text-ink mb-2">
                          {t.user_profiles?.full_name ?? "-"}
                        </div>

                        {teacherAssignments.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {teacherAssignments.map((a) => {
                              const cls = classes.find((c) => c.id === a.class_id);
                              const subj = subjects.find((s) => s.id === a.subject_id);
                              return (
                                <span
                                  key={a.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary-dark"
                                >
                                  {cls?.name ?? "-"} · {subj?.name ?? "-"}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAssignment(a.id)}
                                    disabled={busyId === a.id}
                                    aria-label={`Hapus penugasan ${cls?.name ?? ""} ${subj?.name ?? ""}`}
                                    className="rounded-full p-0.5 hover:bg-primary/20 disabled:opacity-50"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="h-8 rounded-[6px] border border-border bg-background px-2 text-[12px] text-ink"
                            value={pickedClassByTeacher[t.id] ?? ""}
                            onChange={(e) =>
                              setPickedClassByTeacher((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                          >
                            <option value="">Pilih kelas</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-8 rounded-[6px] border border-border bg-background px-2 text-[12px] text-ink"
                            value={pickedSubjectByTeacher[t.id] ?? ""}
                            onChange={(e) =>
                              setPickedSubjectByTeacher((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                          >
                            <option value="">Pilih mata pelajaran</option>
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === t.id}
                            onClick={() => handleAddAssignment(t.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Tugaskan
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
