"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, ClipboardList, Send, Sparkles, Zap } from "lucide-react";
import { AppShell } from "@/components/product-shell";
import { AlertPanel, LoadingPanel } from "@/components/product-primitives";
import { SubjectBadge } from "@/components/subject-ui";
import { studentNav } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentStudent } from "@/lib/auth/authorization";
import { supabase } from "@/lib/supabase/client";
import { subjectStyle } from "@/lib/subject-style";
import { useScheduleClock, formatCountdown } from "@/lib/hooks/use-schedule-clock";
import { setSubjectFilterGlobal } from "@/lib/hooks/use-subject-filter";
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
type WeakTopic = { topic: string; subject: string; attempted: number; accuracy: number };

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
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [materialCount, setMaterialCount] = useState<Record<string, number>>({});
  const [question, setQuestion] = useState("");
  const [questionError, setQuestionError] = useState(false);

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

      authedPost<{ stats: Stats; weakTopics: WeakTopic[] }>("/api/student/overview").then(r => {
        if (cancelled) return;
        setStats(r?.stats ?? null);
        setWeakTopics(r?.weakTopics ?? []);
      });
      supabase.from("materials").select("subjects(name)").eq("status", "active").then(({ data }) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const m of (data ?? []) as unknown as Array<{ subjects: { name: string } | null }>) {
          const n = m.subjects?.name ?? "Umum";
          counts[n] = (counts[n] ?? 0) + 1;
        }
        setMaterialCount(counts);
      });

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

  function askAI(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) { setQuestionError(true); return; }
    router.push(`/student/tutor?q=${encodeURIComponent(question.trim())}`);
  }

  // A subject card's buttons remember the subject for every page, then go.
  function openSubject(subject: string, href: string) {
    setSubjectFilterGlobal(subject);
    router.push(href);
  }

  return (
    <AppShell role="student" nav={studentNav}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] font-bold text-ink">{firstName ? `Halo, ${firstName}! 👋` : "Halo! 👋"}</h1>
          {/* Compact numbers - emoji + value, meaning on hover/long-press */}
          <Link href="/student/progress" className="flex items-center gap-2" aria-label="Lihat hasilku">
            {[
              { emoji: "🔥", value: stats ? `${stats.streak}` : "…", title: "Hari belajar beruntun" },
              { emoji: "⭐", value: stats ? stats.xp.toLocaleString("id-ID") : "…", title: "Poin XP" },
              { emoji: "🏆", value: stats ? `#${stats.rank}` : "…", title: stats ? `Peringkat ${stats.rank} dari ${stats.classSize} siswa` : "Peringkat kelas" },
            ].map(p => (
              <span key={p.title} title={p.title} aria-label={`${p.title}: ${p.value}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[15px] font-bold text-ink shadow-sm hover:shadow-soft">
                <span aria-hidden="true">{p.emoji}</span>{stats === null ? "-" : p.value}
              </span>
            ))}
          </Link>
        </div>

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
                <button type="button" onClick={() => openSubject(openNow[0].subject, "/student/simulator")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[16px] font-bold text-white shadow-sm hover:bg-primary-dark">
                  {openNow[0].inProgress ? "Lanjutkan Ujian" : "Kerjakan Sekarang"} <ArrowRight className="h-5 w-5" />
                </button>
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

            {/* 2. Ask the AI straight from Beranda */}
            <form onSubmit={askAI} className="rounded-card border border-border bg-surface p-4 shadow-sm">
              <label htmlFor="ask-ai" className="mb-2 flex items-center gap-2 text-[15px] font-bold text-ink">
                <Sparkles className="h-4 w-4 text-primary" />Ada yang bingung? Tanya AI
              </label>
              <div className="flex gap-2">
                <input id="ask-ai" value={question}
                  onChange={e => { setQuestion(e.target.value); setQuestionError(false); }}
                  placeholder="Contoh: Bagaimana cara menghitung luas lingkaran?"
                  className={cn("min-w-0 flex-1 rounded-full border bg-background px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-tertiary focus:outline-none",
                    questionError ? "border-danger bg-danger/5" : "border-border focus:border-primary")} />
                <button type="submit" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[15px] font-bold text-white hover:bg-primary-dark">
                  <Send className="h-4 w-4" /><span className="hidden sm:inline">Tanya</span>
                </button>
              </div>
              {questionError && <p role="alert" className="mt-1.5 pl-4 text-[12px] font-medium text-danger">Tulis pertanyaanmu dulu, ya.</p>}
            </form>

            {/* 3. Turn results into action: weakest topics, one tap to practise */}
            {weakTopics.length > 0 && (
              <div>
                <h3 className="mb-3 text-[18px] font-bold text-ink">Yang perlu kamu latih 🎯</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {weakTopics.slice(0, 3).map(t => (
                    <div key={`${t.subject}-${t.topic}`} className={cn("flex flex-col rounded-card border border-l-[6px] bg-surface p-4", subjectStyle(t.subject).accent)}>
                      <SubjectBadge subject={t.subject} size="sm" />
                      <div className="mt-2 text-[16px] font-bold text-ink">{t.topic}</div>
                      <div className="mt-1 text-[13px] text-ink-secondary">Benar {t.accuracy}% dari {t.attempted} soal</div>
                      <button type="button" onClick={() => openSubject(t.subject, `/student/adaptive?mapel=${encodeURIComponent(t.subject)}&topik=${encodeURIComponent(t.topic)}`)}
                        className="mt-3 inline-flex items-center justify-center gap-1.5 self-start rounded-full bg-primary/10 px-4 py-2 text-[14px] font-bold text-primary hover:bg-primary/15">
                        <Zap className="h-4 w-4" />Latih sekarang
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Subject hub: one card per subject with its exams/materials and
                three actions - choosing one remembers the subject on every page */}
            {subjects.length > 0 && (
              <div>
                <h3 className="mb-3 text-[18px] font-bold text-ink">Mata pelajaranmu</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {subjects.map(sub => {
                    const st = subjectStyle(sub);
                    const waiting = live.filter(a => a.subject === sub && a.state === "OPEN").length;
                    const soon = live.filter(a => a.subject === sub && a.state === "UPCOMING").length;
                    const mats = materialCount[sub] ?? 0;
                    return (
                      <div key={sub} className={cn("rounded-card border border-l-[6px] bg-surface p-4", st.accent)}>
                        <div className="flex items-center gap-3">
                          <span className="text-[30px] leading-none" aria-hidden="true">{st.emoji}</span>
                          <div className="min-w-0">
                            <div className="truncate text-[17px] font-bold text-ink">{sub}</div>
                            <div className="text-[13px] text-ink-secondary">
                              {waiting > 0 ? <strong className="text-primary">{waiting} ujian menunggu</strong> : soon > 0 ? `${soon} ujian akan datang` : "Tidak ada ujian"}
                              {" · "}{mats} materi
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {[
                            { label: "Ujian", icon: ClipboardList, href: "/student/simulator" },
                            { label: "Materi", icon: BookOpen, href: "/student/materials" },
                            { label: "Latihan", icon: Zap, href: "/student/adaptive" },
                          ].map(a => (
                            <button key={a.label} type="button" onClick={() => openSubject(sub, a.href)}
                              className="flex items-center justify-center gap-1.5 rounded-[10px] border border-border bg-background py-2 text-[13px] font-semibold text-ink hover:border-border-strong hover:bg-surface">
                              <a.icon className="h-4 w-4 text-ink-secondary" />{a.label}
                            </button>
                          ))}
                        </div>
                      </div>
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
