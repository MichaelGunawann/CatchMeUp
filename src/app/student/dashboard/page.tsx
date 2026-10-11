"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { SubjectBadge } from "@/components/subject-ui";
import { studentNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentStudent } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import { subjectStyle } from "@/lib/subject-style";
import { useScheduleClock, formatCountdown } from "@/lib/hooks/use-schedule-clock";
import { cn } from "@/lib/utils";

/**
 * Beranda (student home), designed for SD students after UAT feedback that
 * the old dashboard showed too much at once. It answers one question first
 * - "what should I do now?" - with a single big action, then three small
 * numbers, then one card per subject (a shortcut to that subject's exams).
 * The full exam list lives on the Ujian page.
 */

type Item = {
  id: string; title: string; subject: string; type: string | null;
  durationMinutes: number | null; openAt: string | null; closeAt: string | null;
  questionCount: number; state: "DRAFT" | "UPCOMING" | "OPEN" | "COMPLETED" | "MISSED" | "CLOSED";
  inProgress: boolean; score: number | null;
};
type Stats = { streak: number; rank: number; classSize: number; xp: number };

async function authedPost<T>(path: string): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: "{}",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<"PENDING" | "REJECTED" | null>(null);
  const [noClassAssigned, setNoClassAssigned] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [classSubjects, setClassSubjects] = useState<string[]>([]);
  // undefined = still loading
  const [stats, setStats] = useState<Stats | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const profile = await getCurrentProfile();
      if (cancelled) return;
      if (!profile) { router.push("/login"); return; }
      if (profile.role !== "STUDENT") { router.push("/dashboard"); return; }
      setFirstName(profile.full_name.split(" ")[0]);

      const student = await getCurrentStudent();
      if (cancelled) return;
      if (!student) {
        setError("Belum ada catatan siswa yang terhubung dengan akun ini.");
        setLoading(false);
        return;
      }
      if (student.status !== "ACTIVE") { setAccountStatus(student.status); setLoading(false); return; }
      if (!student.class_id) { setNoClassAssigned(true); setLoading(false); return; }

      authedPost<{ stats: Stats }>("/api/student/overview").then(r => { if (!cancelled) setStats(r?.stats ?? null); });

      const [list, { data: assignments }] = await Promise.all([
        authedPost<{ assessments: Item[]; error?: string }>("/api/student/assessments"),
        supabase.from("teacher_assignments").select("subjects(name)").eq("class_id", student.class_id),
      ]);
      if (cancelled) return;
      if (!list) setError("Gagal memuat ujian. Coba muat ulang halaman.");
      setItems(list?.assessments ?? []);
      const names = ((assignments ?? []) as unknown as Array<{ subjects: { name: string } | null }>)
        .map(a => a.subjects?.name).filter((n): n is string => !!n);
      setClassSubjects([...new Set(names)]);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [router]);

  const now = useScheduleClock(items.flatMap(a => [
    a.openAt ? new Date(a.openAt).getTime() : null,
    a.closeAt ? new Date(a.closeAt).getTime() : null,
  ]));

  // Live state against the clock (an exam opens/closes without a reload).
  const live = items.map(a => {
    const openMs = a.openAt ? new Date(a.openAt).getTime() : null;
    const closeMs = a.closeAt ? new Date(a.closeAt).getTime() : null;
    let state = a.state;
    if (state === "UPCOMING" && openMs !== null && now >= openMs) state = "OPEN";
    if ((state === "OPEN" || state === "UPCOMING") && !a.inProgress && closeMs !== null && now >= closeMs) state = "MISSED";
    return { ...a, state, openMs, closeMs };
  });
  const openNow = live.filter(a => a.state === "OPEN" && a.questionCount > 0)
    .sort((x, y) => (x.closeMs ?? Infinity) - (y.closeMs ?? Infinity)); // closing soonest first
  const upcoming = live.filter(a => a.state === "UPCOMING").sort((x, y) => (x.openMs ?? 0) - (y.openMs ?? 0));
  const subjects = [...new Set([...classSubjects, ...live.map(a => a.subject)])].sort((x, y) => x.localeCompare(y, "id"));

  return (
    <AppShell role="student" nav={studentNav}>
      <div className="space-y-6">
        <h1 className="text-[26px] font-bold text-ink">{firstName ? `Halo, ${firstName}! 👋` : "Halo! 👋"}</h1>

        {error && <AlertPanel tone="danger" title="Tidak dapat memuat data">{error}</AlertPanel>}

        {loading ? (
          <LoadingPanel message="Memuat beranda..." />
        ) : accountStatus === "PENDING" ? (
          <AlertPanel tone="warning" title="Menunggu persetujuan sekolah">
            Akunmu sudah terdaftar, tapi belum disetujui admin sekolah. Tunggu sebentar, ya.
          </AlertPanel>
        ) : accountStatus === "REJECTED" ? (
          <AlertPanel tone="danger" title="Pendaftaran ditolak">
            Pendaftaran akunmu ditolak admin sekolah. Hubungi admin sekolahmu.
          </AlertPanel>
        ) : noClassAssigned ? (
          <AlertPanel tone="primary" title="Kamu belum punya kelas">
            Akunmu sudah disetujui, tapi belum dimasukkan ke kelas. Minta admin sekolah menempatkanmu di kelas.
          </AlertPanel>
        ) : (
          <>
            {/* 1. The one thing to do now */}
            {openNow.length > 0 ? (
              <div className={cn("rounded-card border border-l-[8px] bg-surface p-6 shadow-sm", subjectStyle(openNow[0].subject).accent)}>
                <p className="text-[14px] font-bold text-primary">
                  {openNow.length === 1 ? "Ada 1 ujian yang bisa kamu kerjakan sekarang" : `Ada ${openNow.length} ujian yang bisa kamu kerjakan sekarang`}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SubjectBadge subject={openNow[0].subject} size="lg" />
                </div>
                <h2 className="mt-2 text-[22px] font-bold text-ink">{openNow[0].title}</h2>
                <p className="mt-1 text-[14px] text-ink-secondary">
                  {openNow[0].questionCount} soal · {openNow[0].durationMinutes ? `${openNow[0].durationMinutes} menit` : "tanpa batas waktu"}
                  {openNow[0].closeMs !== null && ` · ditutup ${formatCountdown(openNow[0].closeMs - now)} lagi`}
                </p>
                <Link href="/student/simulator"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[16px] font-bold text-white shadow-sm hover:bg-primary-dark">
                  {openNow[0].inProgress ? "Lanjutkan Ujian" : "Kerjakan Sekarang"} <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            ) : (
              <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
                <p className="text-[14px] font-bold text-success">Tidak ada ujian yang harus dikerjakan sekarang 🎉</p>
                {upcoming[0] && (
                  <p className="mt-2 text-[15px] text-ink">
                    Ujian berikutnya: <strong>{upcoming[0].title}</strong> ({upcoming[0].subject}), dibuka {formatCountdown(upcoming[0].openMs! - now)} lagi.
                  </p>
                )}
                <h2 className="mt-3 text-[22px] font-bold text-ink">Yuk latihan soal sebentar!</h2>
                <Link href="/student/adaptive"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[16px] font-bold text-white shadow-sm hover:bg-primary-dark">
                  <Zap className="h-5 w-5" /> Mulai Latihan
                </Link>
              </div>
            )}

            {/* 2. Three small numbers */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: "🔥", label: "Hari beruntun", value: stats === undefined ? "…" : stats ? `${stats.streak}` : "-" },
                { emoji: "⭐", label: "Poin XP", value: stats === undefined ? "…" : stats ? stats.xp.toLocaleString("id-ID") : "-" },
                { emoji: "🏆", label: stats ? `Peringkat dari ${stats.classSize}` : "Peringkat", value: stats === undefined ? "…" : stats ? `#${stats.rank}` : "-" },
              ].map(s => (
                <Link key={s.label} href="/student/progress" className="rounded-card border border-border bg-surface px-4 py-3 text-center hover:shadow-soft">
                  <div className="text-[24px] font-bold text-ink">{s.emoji} {s.value}</div>
                  <div className="text-[12px] text-ink-secondary">{s.label}</div>
                </Link>
              ))}
            </div>

            {/* 3. One card per subject = shortcut to that subject's exams */}
            {subjects.length > 0 && (
              <div>
                <h3 className="mb-3 text-[18px] font-bold text-ink">Mata pelajaranmu</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {subjects.map(sub => {
                    const st = subjectStyle(sub);
                    const waiting = live.filter(a => a.subject === sub && a.state === "OPEN").length;
                    const soon = live.filter(a => a.subject === sub && a.state === "UPCOMING").length;
                    return (
                      <Link key={sub} href={`/student/simulator?mapel=${encodeURIComponent(sub)}`}
                        className={cn("rounded-card border border-l-[6px] bg-surface p-4 transition hover:shadow-soft", st.accent)}>
                        <div className="text-[28px] leading-none" aria-hidden="true">{st.emoji}</div>
                        <div className="mt-2 text-[16px] font-bold text-ink">{sub}</div>
                        <div className={cn("mt-1 text-[13px] font-semibold", waiting > 0 ? "text-primary" : "text-ink-tertiary")}>
                          {waiting > 0 ? `${waiting} ujian menunggu` : soon > 0 ? `${soon} ujian akan datang` : "Tidak ada ujian"}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
