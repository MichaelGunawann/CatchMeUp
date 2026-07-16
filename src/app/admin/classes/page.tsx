"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Plus } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentSchoolAdminSchools } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import type { Class, School, Subject } from "@/lib/supabase/types";

/**
 * Real Kelas & Mata Pelajaran management for School Admins. Inserts go
 * straight through the anon-key client - RLS already grants school admins
 * full manage access on classes/subjects scoped to their own ACTIVE
 * schools (supabase/migrations/002_rls_policies.sql, "School admins can
 * manage classes/subjects in their school"), so no server route is
 * needed here (unlike the teacher/student approval mutation, which is
 * deliberately server-only).
 *
 * No delete action: classes.id is referenced by students.class_id with
 * ON DELETE CASCADE (supabase/migrations/001_initial_schema.sql), so
 * deleting a class would silently delete every student row placed in it.
 * Renaming/removal is intentionally out of scope for this first pass.
 */
export default function AdminClassesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [className, setClassName] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [classYear, setClassYear] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [classFormError, setClassFormError] = useState<string | null>(null);
  const [subjectFormError, setSubjectFormError] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);

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
      setClasses([]);
      setSubjects([]);
      return;
    }

    let cancelled = false;

    async function loadSchoolData() {
      const [{ data: classRows, error: classError }, { data: subjectRows, error: subjectError }] =
        await Promise.all([
          supabase.from("classes").select("*").eq("school_id", selectedSchoolId).order("name"),
          supabase.from("subjects").select("*").eq("school_id", selectedSchoolId).order("name"),
        ]);

      if (cancelled) return;
      if (!classError) setClasses((classRows ?? []) as Class[]);
      if (!subjectError) setSubjects((subjectRows ?? []) as Subject[]);
    }

    loadSchoolData();
    return () => {
      cancelled = true;
    };
  }, [selectedSchoolId]);

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    setClassFormError(null);
    if (!selectedSchoolId || !className.trim()) {
      setClassFormError("Nama kelas wajib diisi");
      return;
    }

    setSavingClass(true);
    try {
      const { data, error: insertError } = await supabase
        .from("classes")
        .insert({
          school_id: selectedSchoolId,
          name: className.trim(),
          grade: classGrade.trim() || null,
          year: classYear.trim() ? Number(classYear.trim()) : null,
        })
        .select()
        .single();

      if (insertError) {
        setClassFormError(
          insertError.code === "23505" ? "Kelas dengan nama ini sudah ada di sekolah ini" : insertError.message
        );
        return;
      }

      setClasses((prev) => [...prev, data as Class].sort((a, b) => a.name.localeCompare(b.name)));
      setClassName("");
      setClassGrade("");
      setClassYear("");
    } finally {
      setSavingClass(false);
    }
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    setSubjectFormError(null);
    if (!selectedSchoolId || !subjectName.trim()) {
      setSubjectFormError("Nama mata pelajaran wajib diisi");
      return;
    }

    setSavingSubject(true);
    try {
      const { data, error: insertError } = await supabase
        .from("subjects")
        .insert({ school_id: selectedSchoolId, name: subjectName.trim() })
        .select()
        .single();

      if (insertError) {
        setSubjectFormError(
          insertError.code === "23505"
            ? "Mata pelajaran dengan nama ini sudah ada di sekolah ini"
            : insertError.message
        );
        return;
      }

      setSubjects((prev) => [...prev, data as Subject].sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectName("");
    } finally {
      setSavingSubject(false);
    }
  }

  return (
    <AppShell role="admin" nav={adminNav}>
      <div className="space-y-6">
        <PageHeader
          title="Kelas & Mata Pelajaran"
          description="Kelola kelas dan mata pelajaran untuk sekolah yang kamu kelola."
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
            description="Kelola kelas dan mata pelajaran akan tersedia setelah sekolahmu disetujui admin platform."
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
                <h2 className="text-[13px] font-bold text-ink mb-4 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  Kelas
                </h2>

                <form onSubmit={handleAddClass} className="mb-4 space-y-2.5">
                  {classFormError && (
                    <AlertPanel tone="danger">{classFormError}</AlertPanel>
                  )}
                  <Input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Nama kelas, contoh: XI IPA 2"
                    disabled={savingClass}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      value={classGrade}
                      onChange={(e) => setClassGrade(e.target.value)}
                      placeholder="Tingkat (opsional)"
                      disabled={savingClass}
                    />
                    <Input
                      value={classYear}
                      onChange={(e) => setClassYear(e.target.value)}
                      placeholder="Tahun (opsional)"
                      inputMode="numeric"
                      disabled={savingClass}
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={savingClass} className="w-full">
                    <Plus className="h-3.5 w-3.5" />
                    {savingClass ? "Menyimpan..." : "Tambah Kelas"}
                  </Button>
                </form>

                {classes.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="Belum ada kelas"
                    description="Tambahkan kelas pertama menggunakan form di atas."
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {classes.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2.5 text-[13px]">
                        <span className="font-medium text-ink">{c.name}</span>
                        <span className="text-[11px] text-ink-secondary">
                          {[c.grade, c.year ? String(c.year) : null].filter(Boolean).join(" · ") || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
                <h2 className="text-[13px] font-bold text-ink mb-4 flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Mata Pelajaran
                </h2>

                <form onSubmit={handleAddSubject} className="mb-4 space-y-2.5">
                  {subjectFormError && (
                    <AlertPanel tone="danger">{subjectFormError}</AlertPanel>
                  )}
                  <Input
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Nama mata pelajaran, contoh: Matematika"
                    disabled={savingSubject}
                  />
                  <Button type="submit" size="sm" disabled={savingSubject} className="w-full">
                    <Plus className="h-3.5 w-3.5" />
                    {savingSubject ? "Menyimpan..." : "Tambah Mata Pelajaran"}
                  </Button>
                </form>

                {subjects.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="Belum ada mata pelajaran"
                    description="Tambahkan mata pelajaran pertama menggunakan form di atas."
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {subjects.map((s) => (
                      <div key={s.id} className="py-2.5 text-[13px] font-medium text-ink">
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
