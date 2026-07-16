"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, FileQuestion, Users } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, StatCard, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { teacherNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentTeacher } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import type { Assessment } from "@/lib/supabase/types";

type AssignmentRow = {
  id: string;
  class_id: string;
  subject_id: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
};

type AssessmentRow = Assessment & {
  classes: { name: string } | null;
  subjects: { name: string } | null;
};

const statusTone: Record<Assessment["status"], "neutral" | "success" | "primary"> = {
  draft: "neutral",
  published: "success",
  archived: "primary",
};

const statusLabel: Record<Assessment["status"], string> = {
  draft: "Draf",
  published: "Dipublikasikan",
  archived: "Diarsipkan",
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<"PENDING" | "REJECTED" | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);

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
      if (profile.role !== "TEACHER") {
        router.push("/dashboard");
        return;
      }

      const teacher = await getCurrentTeacher();
      if (cancelled) return;
      if (!teacher) {
        setError("No teacher record is linked to this account yet.");
        setLoading(false);
        return;
      }

      // Pending/rejected accounts must not reach dashboard content, even
      // though RLS would already return empty results for every query
      // below - this check makes that explicit and skips the queries
      // entirely rather than relying on them silently coming back empty.
      if (teacher.status !== "ACTIVE") {
        setTeacherName(profile.full_name);
        setAccountStatus(teacher.status);
        setLoading(false);
        return;
      }

      try {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("teacher_assignments")
          .select("id, class_id, subject_id, classes(name), subjects(name)")
          .eq("teacher_id", teacher.id);

        if (assignmentError) throw assignmentError;
        if (cancelled) return;

        const assignmentList = (assignmentData ?? []) as unknown as AssignmentRow[];
        setTeacherName(profile.full_name);
        setAssignments(assignmentList);

        const classIds = Array.from(new Set(assignmentList.map((a) => a.class_id)));

        const [{ data: studentRows, error: studentError }, { data: assessmentData, error: assessmentError2 }] =
          await Promise.all([
            classIds.length > 0
              ? supabase.from("students").select("id").in("class_id", classIds)
              : Promise.resolve({ data: [], error: null }),
            supabase
              .from("assessments")
              .select("*, classes(name), subjects(name)")
              .eq("creator_id", profile.id)
              .order("created_at", { ascending: false }),
          ]);

        if (studentError) throw studentError;
        if (assessmentError2) throw assessmentError2;
        if (cancelled) return;

        setStudentCount((studentRows ?? []).length);
        setAssessments((assessmentData ?? []) as unknown as AssessmentRow[]);
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

  const uniqueClasses = Array.from(new Set(assignments.map((a) => a.classes?.name).filter(Boolean)));
  const uniqueSubjects = Array.from(new Set(assignments.map((a) => a.subjects?.name).filter(Boolean)));
  const publishedCount = assessments.filter((a) => a.status === "published").length;

  return (
    <AppShell role="teacher" nav={teacherNav}>
      <div className="space-y-6">
        <PageHeader
          title={teacherName ? `Halo, ${teacherName.split(" ")[0]}` : "Dasbor Guru"}
          description={
            uniqueClasses.length > 0
              ? `Mengajar ${uniqueClasses.join(", ")}`
              : undefined
          }
        />

        {error && (
          <AlertPanel tone="danger" title="Tidak dapat memuat data">
            {error}
          </AlertPanel>
        )}

        {loading ? (
          <LoadingPanel message="Memuat dasbor..." />
        ) : accountStatus === "PENDING" ? (
          <AlertPanel tone="warning" title="Menunggu persetujuan admin sekolah">
            Akun kamu sudah terdaftar tapi belum disetujui oleh admin sekolah. Kamu belum bisa mengakses
            data atau fitur apa pun sampai akun ini disetujui.
          </AlertPanel>
        ) : accountStatus === "REJECTED" ? (
          <AlertPanel tone="danger" title="Pendaftaran ditolak">
            Pendaftaran akun guru ini ditolak oleh admin sekolah. Hubungi admin sekolahmu jika menurutmu
            ini keliru.
          </AlertPanel>
        ) : !error ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Kelas Diampu"
                value={String(uniqueClasses.length)}
                detail="Kelas yang ditugaskan"
                tone="primary"
                icon={BookOpen}
              />
              <StatCard
                label="Mata Pelajaran"
                value={String(uniqueSubjects.length)}
                detail="Mapel yang diampu"
                tone="primary"
                icon={FileQuestion}
              />
              <StatCard
                label="Total Siswa"
                value={String(studentCount)}
                detail="Di kelas yang ditugaskan"
                tone="neutral"
                icon={Users}
              />
              <StatCard
                label="Asesmen Dipublikasikan"
                value={String(publishedCount)}
                detail={`Dari ${assessments.length} total dibuat`}
                tone="success"
                icon={ClipboardList}
              />
            </div>

            <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-[13px] font-bold text-ink mb-4">Asesmen Terbaru</h2>
              {assessments.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Belum ada asesmen"
                  description="Asesmen yang kamu buat akan muncul di sini."
                />
              ) : (
                <div className="divide-y divide-border">
                  {assessments.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">{a.title}</div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          {a.classes?.name ?? "-"} · {a.subjects?.name ?? "-"}
                        </div>
                      </div>
                      <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
