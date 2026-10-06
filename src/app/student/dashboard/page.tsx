"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, FileQuestion, Flame, Star, Trophy } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { PageHeader, StatCard, EmptyState, AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { studentNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentStudent } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import { getAssessmentAvailability, parseDbTime, type AssessmentAvailability } from "@/lib/auth/assessment-availability";
import { useScheduleClock, formatCountdown } from "@/lib/hooks/use-schedule-clock";
import type { Assessment, AssessmentAttempt } from "@/lib/supabase/types";

type AssessmentRow = Assessment & { subjects: { name: string } | null };

const availabilityTone: Record<AssessmentAvailability, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  UPCOMING: "primary",
  OPEN: "success",
  COMPLETED: "primary",
  MISSED: "danger",
  CLOSED: "neutral",
};

const availabilityLabel: Record<AssessmentAvailability, string> = {
  DRAFT: "Draf",
  UPCOMING: "Akan Datang",
  OPEN: "Bisa Dikerjakan",
  COMPLETED: "Selesai",
  MISSED: "Terlewat",
  CLOSED: "Ditutup",
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<"PENDING" | "REJECTED" | null>(null);
  const [noClassAssigned, setNoClassAssigned] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [attemptsByAssessment, setAttemptsByAssessment] = useState<Record<string, AssessmentAttempt[]>>({});
  // Streak / rank / XP come from /api/student/overview (class ranking needs
  // classmates' scores, which RLS hides from the student's own session).
  // undefined = loading.
  const [overview, setOverview] = useState<{ streak: number; rank: number; classSize: number; xp: number } | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch("/api/student/overview", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: "{}",
        });
        const json = await res.json();
        if (!cancelled) setOverview(res.ok && json.stats ? json.stats : null);
      } catch {
        if (!cancelled) setOverview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (profile.role !== "STUDENT") {
        router.push("/dashboard");
        return;
      }

      const student = await getCurrentStudent();
      if (cancelled) return;
      if (!student) {
        setError("Belum ada catatan siswa yang terhubung dengan akun ini.");
        setLoading(false);
        return;
      }

      // Pending/rejected accounts must not reach dashboard content, even
      // though RLS would already return empty results for every query
      // below - this check makes that explicit and skips the queries
      // entirely rather than relying on them silently coming back empty.
      if (student.status !== "ACTIVE") {
        setStudentName(profile.full_name);
        setAccountStatus(student.status);
        setLoading(false);
        return;
      }

      // Approved but not yet placed in a class by the school admin -
      // nothing class-scoped to show yet, and class_id is null so the
      // queries below can't run meaningfully.
      if (!student.class_id) {
        setStudentName(profile.full_name);
        setNoClassAssigned(true);
        setLoading(false);
        return;
      }

      try {
        const [{ data: classData }, { data: schoolData }, { data: assessmentData, error: assessmentError }] =
          await Promise.all([
            supabase.from("classes").select("name").eq("id", student.class_id).single(),
            supabase.from("schools").select("name").eq("id", student.school_id).single(),
            supabase
              .from("assessments")
              .select("*, subjects(name)")
              .eq("class_id", student.class_id)
              .eq("status", "published"),
          ]);

        if (assessmentError) throw assessmentError;
        if (cancelled) return;

        setStudentName(profile.full_name);
        setClassName(classData?.name ?? "");
        setSchoolName(schoolData?.name ?? "");

        const list = (assessmentData ?? []) as unknown as AssessmentRow[];
        setAssessments(list);

        if (list.length > 0) {
          const { data: attemptData, error: attemptError } = await supabase
            .from("assessment_attempts")
            .select("*")
            .eq("student_id", student.id)
            .in(
              "assessment_id",
              list.map((a) => a.id)
            );

          if (attemptError) throw attemptError;
          if (cancelled) return;

          const grouped: Record<string, AssessmentAttempt[]> = {};
          for (const attempt of (attemptData ?? []) as AssessmentAttempt[]) {
            grouped[attempt.assessment_id] = [...(grouped[attempt.assessment_id] ?? []), attempt];
          }
          setAttemptsByAssessment(grouped);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data dasbor");
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

  // Re-evaluates availability exactly when an assessment opens/closes, so
  // "Akan Datang" flips to "Bisa Dikerjakan" at the scheduled minute.
  const now = useScheduleClock(
    assessments.flatMap((a) => [a.open_at ? parseDbTime(a.open_at) : null, a.close_at ? parseDbTime(a.close_at) : null])
  );

  const availability = assessments
    .map((a) => ({
      assessment: a,
      info: getAssessmentAvailability(a, attemptsByAssessment[a.id] ?? [], new Date(now)),
    }))
    .sort((x, y) => {
      // Open first, then upcoming (soonest first), then everything else.
      const rank = (s: AssessmentAvailability) => (s === "OPEN" ? 0 : s === "UPCOMING" ? 1 : 2);
      const r = rank(x.info.state) - rank(y.info.state);
      if (r !== 0) return r;
      return (x.assessment.open_at ? parseDbTime(x.assessment.open_at) : 0) - (y.assessment.open_at ? parseDbTime(y.assessment.open_at) : 0);
    });

  const openCount = availability.filter((a) => a.info.state === "OPEN").length;
  const upcomingCount = availability.filter((a) => a.info.state === "UPCOMING").length;
  const completedCount = availability.filter((a) => a.info.state === "COMPLETED").length;

  return (
    <AppShell role="student" nav={studentNav}>
      <div className="space-y-6">
        <PageHeader
          eyebrow={schoolName || undefined}
          title={studentName ? `Halo, ${studentName.split(" ")[0]}` : "Dasbor Siswa"}
          description={className ? `Kelas ${className}` : undefined}
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
            Pendaftaran akun siswa ini ditolak oleh admin sekolah. Hubungi admin sekolahmu jika menurutmu
            ini keliru.
          </AlertPanel>
        ) : noClassAssigned ? (
          <AlertPanel tone="primary" title="Belum ditempatkan di kelas">
            Akunmu sudah disetujui, tapi kamu belum ditempatkan di kelas mana pun. Hubungi admin sekolahmu
            untuk penempatan kelas.
          </AlertPanel>
        ) : !error ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Streak Belajar"
                value={overview === undefined ? "…" : overview ? `${overview.streak} hari` : "-"}
                detail="Kerjakan latihan/asesmen tiap hari"
                tone="warning"
                icon={Flame}
              />
              <StatCard
                label="Peringkat Kelas"
                value={overview === undefined ? "…" : overview ? `#${overview.rank}` : "-"}
                detail={overview ? `dari ${overview.classSize} siswa` : "Berdasarkan rata-rata nilai"}
                tone="primary"
                icon={Trophy}
              />
              <StatCard
                label="Total XP"
                value={overview === undefined ? "…" : overview ? overview.xp.toLocaleString("id-ID") : "-"}
                detail="Poin pengalaman belajar"
                tone="success"
                icon={Star}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Bisa Dikerjakan"
                value={String(openCount)}
                detail="Asesmen tersedia sekarang"
                tone="success"
                icon={FileQuestion}
              />
              <StatCard
                label="Akan Datang"
                value={String(upcomingCount)}
                detail="Belum dibuka"
                tone="primary"
                icon={Clock}
              />
              <StatCard
                label="Selesai"
                value={String(completedCount)}
                detail="Sudah dikerjakan"
                tone="neutral"
                icon={CheckCircle2}
              />
            </div>

            <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-[13px] font-bold text-ink mb-4">Asesmen Kelas</h2>
              {availability.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Belum ada asesmen"
                  description="Asesmen yang dipublikasikan guru untuk kelasmu akan muncul di sini."
                />
              ) : (
                <div className="divide-y divide-border">
                  {availability.map(({ assessment, info }) => (
                    <div key={assessment.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">{assessment.title}</div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          {assessment.subjects?.name ?? "Umum"} · {info.message}
                          {info.state === "UPCOMING" && assessment.open_at && (
                            <> · dibuka dalam {formatCountdown(parseDbTime(assessment.open_at) - now)}</>
                          )}
                          {info.state === "OPEN" && assessment.close_at && (
                            <> · ditutup dalam {formatCountdown(parseDbTime(assessment.close_at) - now)}</>
                          )}
                        </div>
                      </div>
                      <Badge tone={availabilityTone[info.state]}>{availabilityLabel[info.state]}</Badge>
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
