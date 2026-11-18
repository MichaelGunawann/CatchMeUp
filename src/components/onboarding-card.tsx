"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Lock, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Onboarding cards on the dashboards (state + step recording: /api/onboarding,
 * src/lib/onboarding.ts):
 *  - TeacherChecklist: "Siapkan kelas pertamamu", the five steps a teacher
 *    needs before students have anything to do, in working order.
 *  - StudentMissions: "Misi Pemula dari Kak AI", four small missions that
 *    teach the student app by doing (+XP each, badge at the end).
 * Ticks come from the server only (real data / real actions), never from a
 * click on the card. A card disappears once everything is done or hidden.
 */

async function onboardingPost<T>(body: Record<string, unknown> = {}): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

function lsGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode etc. */ }
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${done} dari ${total} selesai`}>
      <span className="text-[13px] font-bold text-ink">{done}/{total}</span>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  );
}

function HideButton({ onHide, label }: { onHide: () => void; label: string }) {
  return (
    <button type="button" onClick={onHide} title={label} aria-label={label}
      className="rounded-full p-1.5 text-ink-tertiary hover:bg-background hover:text-ink">
      <X className="h-4 w-4" />
    </button>
  );
}

// ── Teacher ──────────────────────────────────────────────────────────────

type TeacherStepKey = "teacher_upload" | "teacher_generate" | "teacher_approve" | "teacher_ai_style" | "teacher_publish";
type TeacherState = { available: true; hidden: boolean; hasAssignments: boolean; done: Record<TeacherStepKey, boolean> } | { available: false };

const TEACHER_STEPS: Array<{ key: TeacherStepKey; title: string; desc: string; href: string; cta: string }> = [
  { key: "teacher_upload", title: "Unggah materi",
    desc: "Unggah buku, modul, atau PPT (PDF, DOCX, PPTX). Kak AI akan membacanya untuk membuat soal dan menjawab pertanyaan siswa.",
    href: "/teacher/materials?unggah=1", cta: "Unggah" },
  { key: "teacher_generate", title: "Buat soal dari materi",
    desc: "Di Pustaka Materi, klik \"Proses AI\" pada materi untuk membuat soal otomatis. Kalau filenya lembar soal, pakai \"Impor soal\".",
    href: "/teacher/materials", cta: "Buka Pustaka" },
  { key: "teacher_approve", title: "Setujui soal",
    desc: "Periksa kunci jawaban soal buatan AI, lalu setujui yang sudah benar. Hanya soal yang disetujui yang masuk Bank Soal.",
    href: "/teacher/question-review", cta: "Tinjau" },
  { key: "teacher_ai_style", title: "Atur gaya Kak AI untuk kelasmu",
    desc: "Pilih cara Kak AI menjelaskan ke siswa: memandu dengan pertanyaan, langsung langkah demi langkah, atau dengan perumpamaan.",
    href: "/teacher/ai-config", cta: "Atur" },
  { key: "teacher_publish", title: "Terbitkan asesmen pertama",
    desc: "Susun soal dari Bank Soal menjadi kuis atau ujian, atur jadwal dan durasinya, lalu terbitkan agar siswa bisa mengerjakan.",
    href: "/teacher/assessment-builder", cta: "Buat" },
];

const TEACHER_COLLAPSED_KEY = "cmu:onboarding:teacher-collapsed";

export function TeacherChecklist() {
  const [state, setState] = useState<TeacherState | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCollapsed(lsGet(TEACHER_COLLAPSED_KEY) === "1");
    onboardingPost<TeacherState>().then(s => { if (!cancelled) setState(s); });
    return () => { cancelled = true; };
  }, []);

  if (!state || !state.available || state.hidden) return null;

  function hide() {
    setState(s => (s && s.available ? { ...s, hidden: true } : s));
    void onboardingPost({ hide: true });
  }

  if (!state.hasAssignments) {
    return (
      <div className="rounded-card border border-warning/40 bg-warning/5 p-5 shadow-sm">
        <p className="text-[15px] font-bold text-ink">🧑‍🏫 Akunmu belum ditugaskan ke kelas</p>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Kamu baru bisa mengunggah materi dan membuat asesmen setelah admin sekolah menugaskanmu ke kelas dan mata pelajaran. Hubungi admin sekolahmu, ya.
        </p>
      </div>
    );
  }

  const doneCount = TEACHER_STEPS.filter(s => state.done[s.key]).length;
  if (doneCount === TEACHER_STEPS.length) return null;
  const activeKey = TEACHER_STEPS.find(s => !state.done[s.key])?.key;

  function toggle() {
    setCollapsed(c => { lsSet(TEACHER_COLLAPSED_KEY, c ? "0" : "1"); return !c; });
  }

  return (
    <section aria-labelledby="teacher-onboarding-title" className="rounded-card border border-primary/30 bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="min-w-0 flex-1 text-left">
          <h2 id="teacher-onboarding-title" className="flex items-center gap-2 text-[16px] font-bold text-ink">
            🧑‍🏫 Siapkan kelas pertamamu
            <ChevronDown className={cn("h-4 w-4 text-ink-tertiary transition-transform", collapsed && "-rotate-90")} />
          </h2>
          {!collapsed && <p className="mt-0.5 text-[13px] text-ink-secondary">Ikuti langkah ini supaya siswa bisa mulai belajar. Centang terisi sendiri saat langkahnya selesai.</p>}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <ProgressBar done={doneCount} total={TEACHER_STEPS.length} />
          <HideButton onHide={hide} label="Jangan tampilkan lagi" />
        </div>
      </div>

      {!collapsed && (
        <ol className="mt-4 space-y-1">
          {TEACHER_STEPS.map((s, i) => {
            const done = state.done[s.key];
            const active = s.key === activeKey;
            return (
              <li key={s.key} className={cn("rounded-[10px] px-3 py-2.5", active && "border border-primary/30 bg-primary/5")}>
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                    done ? "bg-success text-white" : active ? "bg-primary text-white" : "border border-border text-ink-tertiary")}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("flex-1 text-[14px]", done ? "text-ink-secondary line-through" : "font-semibold text-ink")}>{s.title}</span>
                  {!done && !active && (
                    <Link href={s.href} className="text-[12px] font-semibold text-primary hover:underline">{s.cta}</Link>
                  )}
                </div>
                {active && (
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3 pl-9">
                    <p className="max-w-xl text-[13px] text-ink-secondary">{s.desc}</p>
                    <Link href={s.href}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-primary-dark">
                      {s.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ── Student ──────────────────────────────────────────────────────────────

type StudentStepKey = "student_material" | "student_practice" | "student_ask_ai" | "student_review";
type StudentState = {
  available: true; hidden: boolean; justCompleted: boolean; xpPerMission: number;
  done: Record<StudentStepKey, boolean>; locked: Record<StudentStepKey, boolean>;
} | { available: false };

const STUDENT_MISSIONS: Array<{ key: StudentStepKey; emoji: string; title: string; hint: string; lockedHint: string; href: string }> = [
  { key: "student_material", emoji: "📚", title: "Buka satu materi dari guru",
    hint: "Pilih materi lalu klik Unduh.", lockedHint: "Menunggu gurumu mengunggah materi",
    href: "/student/materials" },
  { key: "student_practice", emoji: "⚡", title: "Jawab 1 soal latihan",
    hint: "Latihan tidak dinilai, jadi santai saja!", lockedHint: "Menunggu gurumu menyiapkan soal latihan",
    href: "/student/adaptive" },
  { key: "student_ask_ai", emoji: "💬", title: "Tanya sesuatu ke Kak AI",
    hint: "Coba tanya: \"Jelaskan bab 1 dong!\"", lockedHint: "",
    href: `/student/tutor?q=${encodeURIComponent("Jelaskan bab 1 dong!")}` },
  { key: "student_review", emoji: "🏆", title: "Lihat hasil dan pembahasanmu",
    hint: "Buka Hasilku → Pembahasan, lalu pilih ujianmu.", lockedHint: "Terbuka setelah kamu menyelesaikan ujian pertama",
    href: "/student/review" },
];

export function StudentMissions() {
  const [state, setState] = useState<StudentState | null>(null);

  useEffect(() => {
    let cancelled = false;
    onboardingPost<StudentState>().then(s => { if (!cancelled) setState(s); });
    return () => { cancelled = true; };
  }, []);

  if (!state || !state.available || state.hidden) return null;

  function hide() {
    setState(s => (s && s.available ? { ...s, hidden: true } : s));
    void onboardingPost({ hide: true });
  }

  const doneCount = STUDENT_MISSIONS.filter(m => state.done[m.key]).length;
  const allDone = doneCount === STUDENT_MISSIONS.length;

  if (allDone) {
    if (!state.justCompleted) return null;
    return (
      <section className="rounded-card border border-success/40 bg-success/5 p-6 text-center shadow-sm">
        <div className="text-[44px] leading-none" aria-hidden="true">🧭🎉</div>
        <h2 className="mt-3 text-[20px] font-bold text-ink">Keren! Kamu sudah siap belajar bareng Kak AI</h2>
        <p className="mt-1 text-[14px] text-ink-secondary">Semua Misi Pemula selesai. Kamu dapat lencana <strong>Siap Belajar</strong>!</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/student/achievements" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[14px] font-bold text-white hover:bg-primary-dark">
            Lihat lencanaku <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => setState({ available: false })}
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-background">
            Tutup
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="student-missions-title" className="rounded-card border border-primary/30 bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="student-missions-title" className="text-[18px] font-bold text-ink">🎯 Misi Pemula dari Kak AI</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">Selesaikan misinya untuk kenalan dengan CatchMeUp. Tiap misi dapat +{state.xpPerMission} XP!</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ProgressBar done={doneCount} total={STUDENT_MISSIONS.length} />
          <HideButton onHide={hide} label="Sembunyikan misi" />
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STUDENT_MISSIONS.map(m => {
          const done = state.done[m.key];
          const locked = state.locked[m.key];
          const body = (
            <>
              <span className="text-[26px] leading-none" aria-hidden="true">{done ? "✅" : locked ? "🔒" : m.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[15px] font-bold", done ? "text-ink-secondary line-through" : "text-ink")}>{m.title}</span>
                <span className="mt-0.5 block text-[12px] text-ink-secondary">
                  {done ? "Selesai!" : locked ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />{m.lockedHint}</span> : m.hint}
                </span>
              </span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold", done ? "bg-success/15 text-success" : "bg-primary/10 text-primary")}>
                +{state.xpPerMission} XP
              </span>
            </>
          );
          const base = "flex items-center gap-3 rounded-[12px] border p-3";
          return (
            <li key={m.key}>
              {done || locked ? (
                <div className={cn(base, "border-border bg-background", locked && "opacity-70")}>{body}</div>
              ) : (
                <Link href={m.href} className={cn(base, "border-primary/30 bg-surface hover:border-primary hover:shadow-soft")}>{body}</Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[13px] text-ink-secondary">🏅 Selesaikan semua misi untuk mendapat lencana <strong>Siap Belajar</strong>.</p>
    </section>
  );
}
