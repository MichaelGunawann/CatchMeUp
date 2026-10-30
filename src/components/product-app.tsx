"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/product-shell";
import {
  AIInsightPanel,
  AlertPanel,
  CatchMeUpCard,
  ChatBubble,
  EmptyState,
  GroundingNotice,
  IncorrectQuestionCard,
  LeaderboardEntry,
  MaterialCard,
  MisconceptionRow,
  PageHeader,
  QuestionBankRow,
  QuestionReviewCard,
  RecentAssessmentRow,
  RecommendationCard,
  ScoreCircle,
  SimpleChart,
  StatCard,
  StatusKPIRow,
  StudentPerformanceCard,
  StudentStatusRow,
  SuggestedPromptButton,
  TopicBar,
  TypingIndicator,
  UpcomingCard,
  NotificationItem,
  MasteryBadge,
} from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, SelectField, fieldClass, useRequiredFields, type SelectOption } from "@/components/ui/form-field";
import { SubjectBadge, SubjectFilter } from "@/components/subject-ui";
import { ChatMarkdown } from "@/components/chat-markdown";
import { subjectStyle } from "@/lib/subject-style";
import {
  aiStyleOptions,
  assessmentStyles,
  assessments,
  assistantGreeting,
  incorrectQuestions,
  leaderboard,
  pastPaperTopics,
  questionBank,
  school,
  scoreTrend,
  scoreTrendLabels,
  studentProfile,
  studentProgressStats,
  studentResults,
  students,
  suggestedPrompts,
  teacherAnalyticsStats,
  teachingRecommendations,
  weakTopics,
  simulatorQuestions,
  teacherNav,
  studentNav,
  parentNav,
  parentNotifications,
  adminNav,
  type ChatMessage,
  type Material,
  type MaterialType,
  type PendingQuestion,
  type AssessmentStyleCorpus,
  type SimulatorQuestion,
  type QuestionBankEntry,
  type Assessment,
  type Difficulty,
  type BloomLevel,
  type Student,
  type StudentStatus,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import { defaultQuestionLanguage, type QuestionLanguage } from "@/lib/ai-questions";
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentTeacher, getCurrentStudent, getCurrentParent } from "@/lib/auth/authorization";
import { parseDbTime } from "@/lib/auth/assessment-availability";
import { useScheduleClock, formatCountdown } from "@/lib/hooks/use-schedule-clock";
import { useExamLockdown, requestExamFullscreen, exitExamFullscreen, setExamOverlayCloser } from "@/lib/hooks/use-exam-lockdown";
import { useSubjectFilter } from "@/lib/hooks/use-subject-filter";
import {
  QUESTION_TYPES, QUESTION_TYPE_LABEL, QUESTION_TYPE_HINT, type QuestionType,
  questionTypeOf, decodeComplex, encodeComplex,
  describeAnswer, describeKey, isAnswered,
} from "@/lib/question-types";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Database,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Filter,
  HelpCircle,
  Lightbulb,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Loader2,
  Target,
  ThumbsUp,
  Trophy,
  Upload,
  Users,
  WifiOff,
  X,
  XCircle,
  Zap,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED LOCAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// Whole-number field that can be typed freely (the box may be empty or out
// of range while typing); the value is clamped to [min, max] on blur.
function NumberInput({ value, onChange, min, max, className, ariaLabel }: {
  value: number; onChange: (v: number) => void; min: number; max: number; className?: string; ariaLabel?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = React.useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  return (
    <input type="text" inputMode="numeric" aria-label={ariaLabel} value={text}
      onFocus={e => { focused.current = true; e.target.select(); }}
      onChange={e => {
        const t = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
        setText(t);
        const n = Number(t);
        if (t !== "" && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => {
        focused.current = false;
        const n = Math.min(max, Math.max(min, Number(text) || min));
        setText(String(n));
        onChange(n);
      }}
      className={className} />
  );
}

// Points for one question in the assessment builder (clicks don't toggle the row).
function PointsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary">
      Poin
      <NumberInput value={value} onChange={onChange} min={1} max={100} ariaLabel="Poin soal"
        className="w-10 bg-transparent text-right text-[12px] text-ink focus:outline-none" />
    </label>
  );
}

// Multi-select topic filter: a dropdown of checkboxes with "Pilih semua"
// and "Kosongkan". An empty selection means every topic.
function TopicMultiSelect({ topics, selected, onChange, counts, className, allLabel = "Semua topik", unit = "topik" }: {
  topics: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  counts?: Record<string, number>;
  className?: string;
  allLabel?: string;
  unit?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = query.trim() ? topics.filter(t => t.toLowerCase().includes(query.trim().toLowerCase())) : topics;
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const label = selected.size === 0 ? allLabel
    : selected.size === 1 ? [...selected][0]
    : `${selected.size} ${unit} dipilih`;
  const toggle = (t: string) => { const n = new Set(selected); if (n.has(t)) n.delete(t); else n.add(t); onChange(n); };
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-[8px] border border-border bg-surface px-3 py-1.5 text-left text-[13px] text-ink hover:border-primary/40">
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
      </button>
      {open && (
        <div className="absolute left-0 z-40 mt-1 w-72 max-w-[85vw] rounded-[10px] border border-border bg-surface p-2 shadow-lg">
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari..."
            className="mb-2 w-full rounded-[6px] border border-border bg-background px-2.5 py-1.5 text-[13px] text-ink focus:border-primary focus:outline-none" />
          <div className="flex items-center justify-between gap-2 border-b border-border px-1 pb-2">
            <button type="button" className="text-[12px] font-semibold text-primary hover:underline"
              onClick={() => onChange(new Set([...selected, ...shown]))}>{query.trim() ? "Pilih semua hasil" : "Pilih semua"}</button>
            <button type="button" className="text-[12px] font-semibold text-ink-secondary hover:underline" onClick={() => onChange(new Set())}>Kosongkan</button>
          </div>
          <div className="max-h-64 overflow-y-auto pt-1">
            {shown.length === 0 && <p className="px-2 py-3 text-[12px] text-ink-tertiary">{topics.length === 0 ? "Belum ada pilihan." : "Tidak ditemukan."}</p>}
            {shown.map(t => (
              <label key={t} className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-ink hover:bg-background">
                <input type="checkbox" checked={selected.has(t)} onChange={() => toggle(t)} className="h-4 w-4 accent-primary" />
                <span className="flex-1 truncate">{t}</span>
                {counts?.[t] !== undefined && <span className="text-[11px] text-ink-tertiary">{counts[t]}</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({
  open, title, message, confirmLabel, confirmVariant = "default", cancelLabel = "Batal", onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string;
  confirmLabel: string; confirmVariant?: "default" | "success" | "danger" | "amber";
  cancelLabel?: string; onConfirm: () => void | Promise<void>; onCancel: () => void;
}) {
  // Locks both buttons while the confirm action runs, so a double click
  // can never trigger it twice (e.g. publishing an assessment twice).
  const [busy, setBusy] = useState(false);
  const busyRef = React.useRef(false);
  useEffect(() => { if (!open) { busyRef.current = false; setBusy(false); } }, [open]);
  if (!open) return null;
  async function confirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { await onConfirm(); } finally { busyRef.current = false; setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-[16px] font-bold text-ink mb-2">{title}</h2>
        <p className="text-[13px] text-ink-secondary leading-relaxed mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} size="sm" disabled={busy} onClick={confirm}>
            {busy ? "Memproses..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppToast({
  message, tone = "success", onDismiss,
}: {
  message: string; tone?: "success" | "primary" | "danger"; onDismiss: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const style = {
    success: "bg-success text-white",
    primary: "bg-primary text-white",
    danger: "bg-danger text-white",
  }[tone];
  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      <div className={cn("flex items-center gap-3 rounded-card px-4 py-3 shadow-xl", style)}>
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="text-[13px] font-semibold">{message}</span>
        <button onClick={onDismiss} className="ml-1 opacity-80 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

export function ProductApp({ path }: { path: string[] }) {
  const [role = "teacher", page = "dashboard"] = path;
  if (role === "student") return <StudentApp page={page} />;
  if (role === "parent") return <ParentApp page={page} />;
  if (role === "admin") return <AdminApp page={page} />;
  return <TeacherApp page={page} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER
// ═══════════════════════════════════════════════════════════════════════════════

// ── Class Selector Banner ─────────────────────────────────────────────────────

function ClassSelectorBanner() {
  const [activeClass] = useActiveClass();
  const { teacher, loading } = useRealTeacherStatus();
  const assignments = [...(teacher?.assignments ?? [])].sort((x, y) =>
    x.className.localeCompare(y.className, "id") || x.subjectName.localeCompare(y.subjectName, "id"));
  const active = findActiveAssignment(teacher, activeClass);
  const activeClassYear = teacher?.classes.find(c => c.id === activeClass)?.year;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6 rounded-[10px] border border-border bg-surface px-4 py-2.5 shadow-sm min-h-[46px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary shrink-0 mr-1">Kelas · Mapel:</span>
      {loading ? (
        <>
          {[0, 1, 2].map(i => <span key={i} className="h-7 w-32 rounded-full bg-border/60 animate-pulse" />)}
        </>
      ) : assignments.length === 0 ? (
        <span className="text-[12px] text-ink-secondary">Kamu belum ditugaskan ke kelas mana pun. Hubungi admin sekolah.</span>
      ) : assignments.map(a => {
        const selected = active?.classId === a.classId && active?.subjectId === a.subjectId;
        const st = subjectStyle(a.subjectName);
        return (
          <button
            key={`${a.classId}:${a.subjectId}`}
            onClick={() => changeActiveAssignment(a.classId, a.subjectId)}
            aria-pressed={selected}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border transition-all",
              selected ? cn(st.active, "shadow-sm") : "bg-background text-ink-secondary border-border hover:border-border-strong hover:text-ink"
            )}
          >
            <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", selected ? "bg-white" : st.solid)} />
            {a.className} · {a.subjectName}
          </button>
        );
      })}
      {activeClassYear && <span className="ml-auto text-[11px] text-ink-tertiary hidden sm:block">Tahun Ajaran {activeClassYear}</span>}
    </div>
  );
}

// Shared inline loading block for lists/sections whose data is still being
// fetched - shown instead of an "empty" message so a page never claims
// "tidak ada data" before it actually knows.
function SectionLoading({ message = "Memuat data...", className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5 py-10 text-[13px] text-ink-secondary", className)}>
      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TeacherApp({ page }: { page: string }) {
  const screens: Record<string, React.ReactNode> = {
    dashboard: <TeacherDashboard />,
    materials: <TeacherMaterials />,
    "assessment-styles": <TeacherAssessmentStyles />,
    "ai-style": <TeacherAssessmentStyles />,
    "question-bank": <TeacherQuestionBank />,
    "question-review": <TeacherQuestionReview />,
    "assessment-builder": <TeacherAssessmentBuilder />,
    results: <TeacherResults />,
    analytics: <TeacherAnalytics />,
    recommendations: <TeacherRecommendations />,
    "ai-config": <TeacherAIConfig />,
  };
  return (
    <AppShell role="teacher" nav={teacherNav} >
      <ClassSelectorBanner />
      {screens[page] ?? <TeacherDashboard />}
    </AppShell>
  );
}

// ── Shared Upload Material Modal ──────────────────────────────────────────────

function UploadMaterialModal({ onClose }: { onClose: () => void }) {
  const teacher = useRealTeacher();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file || !teacher) return;
    setUploading(true);

    // The active class may have more than one subject assigned to this
    // teacher (unlike the old single-subject mock assumption) - resolved
    // to the subject actually taught in the active class, not just "the
    // first subject overall".
    const activeClassId = getActiveClassId();
    const activeAssignment = findActiveAssignment(teacher, activeClassId);
    const activeSubjectId = activeAssignment?.subjectId;
    const activeSubjectName = activeAssignment?.subjectName ?? "Umum";

    if (!activeClassId || !activeSubjectId) {
      setToast({ message: "Pilih kelas aktif terlebih dahulu.", tone: "primary" });
      setUploading(false);
      return;
    }

    const title = file.name.replace(/\.[^/.]+$/, "");
    const created = await uploadNewMaterial(file, {
      classId: activeClassId, subjectId: activeSubjectId,
      creatorId: teacher.profileId, title, type: "Modul Ajar",
    });
    if ("error" in created) {
      setToast({ message: `Gagal mengunggah materi: ${created.error}`, tone: "primary" });
      setUploading(false);
      return;
    }
    // No AI here: questions are made only when the teacher asks for them
    // (Proses AI in Pustaka Materi) - saves AI quota.
    setToast({ message: `Materi "${title}" tersimpan. Buat soal lewat tombol "Proses AI" di Pustaka Materi.`, tone: "success" });
    setTimeout(() => onClose(), 1800);
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !uploading && onClose()} />
      <div className="relative w-full max-w-lg rounded-card border border-border bg-surface shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
          <h2 className="text-[14px] font-bold text-ink">Unggah Materi</h2>
          {!uploading && (
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0] ?? null); }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center gap-3 rounded-[10px] border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background"
            )}
          >
            <input ref={fileInputRef} type="file" accept={MATERIAL_ACCEPT} className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink">Tarik & lepas file di sini</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">PDF, DOCX, PPTX, TXT · Maks. 50 MB</p>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-2 rounded-[8px] border border-success/30 bg-success/5 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-ink truncate">{file.name}</div>
                <div className="text-[10px] text-ink-secondary">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
              <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-ink-tertiary hover:text-danger shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {toast && (
            <div className={cn(
              "flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px]",
              toast.tone === "success" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
            )}>
              {uploading && <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />}
              {toast.message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
          <Button variant="outline" className="h-8 text-[12px]" onClick={onClose} disabled={uploading}>Batal</Button>
          <Button variant="default" className="h-8 text-[12px]" disabled={!file || uploading} onClick={handleUpload}>
            {uploading
              ? <><span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />Memproses...</>
              : <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Unggah & Proses AI</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Real class roster + stats (students, user_profiles, assessment_attempts) ──
// The mock model conflated "which students are in this class" with "how did
// they do in the one subject the mock product pretended to have." Real
// schema: a student belongs to exactly one class (students.class_id), but a
// class can have many subjects (teacher_assignments), so performance here is
// scoped to the active (class, subject) pair - same convention as
// assessments/questions/materials throughout this migration. xp/streak_days
// are real per-student columns (migration 007), not derived.

function computeStudentStatus(avgScore: number | null): StudentStatus {
  if (avgScore == null) return "On Track"; // no attempts yet - benefit of the doubt, not a new status bucket
  if (avgScore >= 63) return "On Track";
  if (avgScore >= 50) return "Need Review";
  return "At Risk";
}

// Teacher-scoped read: RLS ("Teachers can view students in assigned classes")
// already restricts to classes this teacher is assigned to - a roster is a
// property of the whole class, not a specific subject, so unlike
// materials/questions this is never further narrowed by subject_id.
async function fetchRealClassStudents(classId: string, subjectId: string | undefined, className: string): Promise<Student[]> {
  const { data: rosterData } = await supabase
    .from("students")
    .select("id, nis, xp, streak_days, user_profiles(full_name)")
    .eq("class_id", classId)
    .eq("status", "ACTIVE");
  type RosterRow = { id: string; nis: string | null; xp: number; streak_days: number; user_profiles: { full_name: string } | null };
  const roster = (rosterData ?? []) as unknown as RosterRow[];
  if (roster.length === 0) return [];

  const scoreByStudent = new Map<string, { sum: number; count: number }>();
  if (subjectId) {
    const { data: aRows } = await supabase.from("assessments").select("id").eq("class_id", classId).eq("subject_id", subjectId);
    const assessmentIds = (aRows ?? []).map(r => r.id as string);
    if (assessmentIds.length > 0) {
      const { data: attemptRows } = await supabase
        .from("assessment_attempts")
        .select("student_id, score")
        .in("assessment_id", assessmentIds)
        .in("status", ["submitted", "graded"]);
      for (const row of (attemptRows ?? []) as Array<{ student_id: string; score: number | null }>) {
        if (row.score == null) continue;
        const cur = scoreByStudent.get(row.student_id) ?? { sum: 0, count: 0 };
        cur.sum += row.score;
        cur.count += 1;
        scoreByStudent.set(row.student_id, cur);
      }
    }
  }

  const withScores = roster.map(r => {
    const stat = scoreByStudent.get(r.id);
    const avgScore = stat ? Math.round(stat.sum / stat.count) : null;
    return { r, avgScore, total: stat?.count ?? 0 };
  });
  // Rank by real avgScore descending; no-data students rank last (matches
  // the old buildStudents() rank derivation, just over real scores).
  const ranked = [...withScores].sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));
  const rankMap = new Map(ranked.map((s, i) => [s.r.id, i + 1]));

  return withScores.map(({ r, avgScore, total }) => {
    const name = r.user_profiles?.full_name ?? "-";
    return {
      id: r.id,
      name,
      initials: name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(),
      nis: r.nis ?? "-",
      classId,
      className,
      avgScore: avgScore ?? 0,
      status: computeStudentStatus(avgScore),
      xp: r.xp,
      streak: r.streak_days,
      rank: rankMap.get(r.id) ?? 0,
      totalAssessments: total,
    };
  });
}

function computeRealClassStats(classStudents: Student[]) {
  return {
    total: classStudents.length,
    onTrack: classStudents.filter(s => s.status === "On Track").length,
    needReview: classStudents.filter(s => s.status === "Need Review").length,
    atRisk: classStudents.filter(s => s.status === "At Risk").length,
    avgScore: classStudents.length ? Math.round(classStudents.reduce((sum, s) => sum + s.avgScore, 0) / classStudents.length) : 0,
  };
}

type OwnStudentStats = { avgScore: number; xp: number; streak: number; rank: number; classSize: number; className: string; totalAssessments: number };
type StudentAchievementRow = { id: string; code: string; title: string; description: string; category: string; xp: number; icon: string | null; earned: boolean; earnedAt: string | null };
type StudentWeakTopic = { topic: string; subject: string; attempted: number; accuracy: number };
type StudentOverview = { stats: OwnStudentStats; achievements: StudentAchievementRow[]; weakTopics: StudentWeakTopic[] };

// Stats, class rank, achievements and weak topics come from
// /api/student/overview: ranking needs every classmate's scores, which RLS
// (correctly) hides from a student's own session - computing it in the
// browser always produced "#1 dari 1". Cached per student for the tab so
// moving between student pages doesn't refetch or flash empty values;
// refreshStudentOverview() is called after anything that changes them.
const _overviewCache = new Map<string, Promise<StudentOverview | null>>();

function loadStudentOverview(studentId?: string): Promise<StudentOverview | null> {
  const key = studentId ?? "self";
  let p = _overviewCache.get(key);
  if (!p) {
    p = apiPost<StudentOverview>("/api/student/overview", studentId ? { studentId } : {})
      .then(res => (res.error || !res.stats ? null : res as StudentOverview));
    p.then(r => { if (!r) _overviewCache.delete(key); });
    _overviewCache.set(key, p);
  }
  return p;
}

function refreshStudentOverview(studentId?: string) {
  _overviewCache.delete(studentId ?? "self");
}

/** undefined = loading, null = failed/unavailable */
function useStudentOverview(studentId?: string | null): StudentOverview | null | undefined {
  const [data, setData] = useState<StudentOverview | null | undefined>(undefined);
  useEffect(() => {
    if (studentId === null) return; // parent view still resolving the child
    let cancelled = false;
    setData(undefined);
    loadStudentOverview(studentId ?? undefined).then(r => { if (!cancelled) setData(r); });
    return () => { cancelled = true; };
  }, [studentId]);
  return data;
}

function useOwnStudentStats(): OwnStudentStats | null {
  return useStudentOverview()?.stats ?? null;
}

function ownStudentStatCards(stats: OwnStudentStats | null) {
  return [
    { label: "Rata-rata nilai", value: stats ? (stats.totalAssessments > 0 ? String(stats.avgScore) : "—") : "…",
      detail: stats && stats.totalAssessments === 0 ? "Belum ada ujian yang dinilai" : `Dari ${stats?.totalAssessments ?? "…"} ujian yang dinilai`, tone: "success" as const },
    { label: "XP terkumpul", value: stats ? stats.xp.toLocaleString("id-ID") : "…", detail: "Poin pengalaman belajar", tone: "primary" as const },
    { label: "Streak belajar", value: stats ? `${stats.streak} hari` : "…", detail: "Konsistensi belajar harian", tone: "neutral" as const },
    { label: "Peringkat kelas", value: stats ? `#${stats.rank}` : "…", detail: stats ? `dari ${stats.classSize} siswa · ${stats.className}` : "…", tone: "warning" as const },
  ];
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────

function TeacherDashboard() {
  const router = useRouter();
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name;
  const activeAssignment = findActiveAssignment(teacher, activeClass);
  const activeSubjectName = activeAssignment?.subjectName;
  const [activeTab, setActiveTab] = useState<"semua" | "at-risk" | "need-review">("semua");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [upcomingDetailId, setUpcomingDetailId] = useState<string | null>(null);
  const { pending: reviewQs } = useQuestionBank(activeClass, activeAssignment?.subjectId);
  const reviewCount = reviewQs.length;
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const activeStats = computeRealClassStats(classStudents);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);

  const selectedStudent = classStudents.find(s => s.id === selectedStudentId);
  const upcomingAssessments = savedAssessments.filter(a => a.status === "Terjadwal");
  const upcomingDetail = savedAssessments.find(a => a.id === upcomingDetailId);

  useEffect(() => {
    if (!activeClass || !activeAssignment?.subjectId) { setSavedAssessments([]); return; }
    fetchClassAssessments(activeClass, activeAssignment.subjectId).then(setSavedAssessments);
  }, [activeClass, activeAssignment?.subjectId]);

  useEffect(() => {
    if (!activeClass) { setClassStudents([]); return; }
    fetchRealClassStudents(activeClass, activeAssignment?.subjectId, activeClassName ?? "-").then(setClassStudents);
  }, [activeClass, activeAssignment?.subjectId, activeClassName]);

  const allFiltered = classStudents.filter(s => {
    if (activeTab === "at-risk") return s.status === "At Risk";
    if (activeTab === "need-review") return s.status === "Need Review";
    return true;
  });
  const filteredStudents = showAllStudents ? allFiltered : allFiltered.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary mb-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-ink leading-tight">
            Selamat pagi, {(teacher?.name ?? "").split(" ").slice(0, 2).join(" ")}! 👋
          </h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {activeClassName ?? "…"} · {activeSubjectName ?? "-"} · {activeStats.total} siswa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/teacher/assessment-builder">
            <Button variant="outline" className="h-8 text-[12px]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Buat Asesmen
            </Button>
          </Link>
          <Button variant="default" className="h-8 text-[12px]" onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Materi
          </Button>
        </div>
      </div>

      {/* Status KPI hero */}
      <StatusKPIRow
        onTrack={activeStats.onTrack}
        needReview={activeStats.needReview}
        atRisk={activeStats.atRisk}
        total={activeStats.total}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {teacherAnalyticsStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail={s.detail} tone={s.tone} />
        ))}
      </div>

      {/* Main: students + AI sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Student list */}
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-[14px] font-bold text-ink">Daftar Siswa</h2>
            <div className="flex items-center gap-1" role="tablist" aria-label="Filter siswa">
              {(["semua", "at-risk", "need-review"] as const).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-[6px] px-3 py-1 text-[11px] font-semibold transition-colors",
                    activeTab === tab ? "bg-primary/10 text-primary" : "text-ink-secondary hover:text-ink"
                  )}
                >
                  {tab === "semua" ? `Semua (${activeStats.total})` :
                   tab === "at-risk" ? `Perhatian (${activeStats.atRisk})` :
                   `Review (${activeStats.needReview})`}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-2">
            {filteredStudents.map(s => (
              <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className="cursor-pointer">
                <StudentStatusRow student={s} />
              </div>
            ))}
            {allFiltered.length > 8 && !showAllStudents && (
              <div className="py-3 text-center">
                <button onClick={() => setShowAllStudents(true)} className="text-[12px] font-semibold text-primary hover:underline">
                  Lihat semua {allFiltered.length} siswa →
                </button>
              </div>
            )}
            {showAllStudents && (
              <div className="py-3 text-center">
                <button onClick={() => setShowAllStudents(false)} className="text-[12px] font-semibold text-ink-secondary hover:text-ink">
                  ↑ Sembunyikan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AIInsightPanel title="Wawasan AI">
            <p className="mb-3">
              <strong className="text-ink">{activeStats.atRisk} siswa</strong> membutuhkan perhatian segera berdasarkan data nilai saat ini.
            </p>
            <p>Buat asesmen, unggah materi, dan AI akan menghasilkan rekomendasi pengajaran yang lebih spesifik.</p>
            <div className="mt-3">
              <Link href="/teacher/recommendations" className="text-[12px] font-semibold text-primary hover:underline">
                Lihat rekomendasi AI →
              </Link>
            </div>
          </AIInsightPanel>

          <div className="rounded-card border border-border bg-surface shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-ink mb-3">Asesmen Mendatang</h3>
            {upcomingAssessments.length === 0 ? (
              <p className="text-[12px] text-ink-tertiary py-1">Belum ada asesmen terjadwal. Buat asesmen baru via menu Buat Asesmen.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingAssessments.slice(0, 2).map(a => (
                  <div key={a.id} onClick={() => setUpcomingDetailId(a.id)} className="cursor-pointer">
                    <UpcomingCard title={a.title} type={a.type} date={a.scheduledFor} duration={a.duration} questions={a.totalQuestions} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {reviewCount > 0 && (
        <AlertPanel tone="primary" title={`${reviewCount} soal AI menunggu tinjauan`}>
          AI mengekstrak soal baru dari materi yang diunggah. Tinjau dan setujui sebelum diterbitkan.{" "}
          <Link href="/teacher/question-review" className="font-semibold underline">Tinjau sekarang →</Link>
        </AlertPanel>
      )}

      {/* ── Student Detail Dialog ── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSelectedStudentId(null)} />
          <div className="relative w-full max-w-lg rounded-card border border-border bg-surface shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-[14px] font-bold text-primary">
                  {selectedStudent.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-ink">{selectedStudent.name}</h2>
                  <p className="text-[11px] text-ink-secondary">{selectedStudent.className} · Peringkat #{selectedStudent.rank ?? "—"}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudentId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Rata-rata", value: `${selectedStudent.avgScore ?? "—"}` },
                  { label: "Status", value: selectedStudent.status },
                  { label: "Asesmen", value: `${selectedStudent.totalAssessments}` },
                ].map(k => (
                  <div key={k.label} className="rounded-[10px] border border-border bg-background p-3 text-center">
                    <div className="text-[18px] font-bold text-ink">{k.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-[12px] font-bold text-ink mb-2">Riwayat Asesmen Terakhir</h3>
                {savedAssessments.length === 0 ? (
                  <p className="text-[12px] text-ink-tertiary py-2">Belum ada asesmen untuk kelas ini.</p>
                ) : (
                <div className="space-y-2">
                  {savedAssessments.slice(0, 4).map(r => (
                    <div key={r.id} className="flex items-center justify-between rounded-[8px] border border-border bg-background px-3 py-2">
                      <div>
                        <div className="text-[12px] font-medium text-ink">{r.title}</div>
                        <div className="text-[10px] text-ink-secondary">{r.scheduledFor}</div>
                      </div>
                      <div className={cn("text-[15px] font-bold tabular-nums",
                        (r.avgScore ?? 0) >= 80 ? "text-success" : (r.avgScore ?? 0) >= 65 ? "text-primary" : "text-warning"
                      )}>{r.avgScore ?? "—"}</div>
                    </div>
                  ))}
                </div>
                )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setSelectedStudentId(null)}>Tutup</Button>
              <Link href="/teacher/analytics"><Button variant="default" className="h-8 text-[12px]">Lihat Analitik Lengkap</Button></Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Upcoming Assessment Detail Dialog ── */}
      {upcomingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setUpcomingDetailId(null)} />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary mb-0.5">{upcomingDetail.type}</p>
                <h2 className="text-[15px] font-bold text-ink">{upcomingDetail.title}</h2>
              </div>
              <button onClick={() => setUpcomingDetailId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tanggal", value: upcomingDetail.scheduledFor },
                  { label: "Durasi", value: `${upcomingDetail.duration} menit` },
                  { label: "Jumlah Soal", value: `${upcomingDetail.totalQuestions} soal` },
                  { label: "Status", value: upcomingDetail.status },
                ].map(k => (
                  <div key={k.label} className="rounded-[8px] border border-border bg-background p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary mb-0.5">{k.label}</div>
                    <div className="text-[13px] font-semibold text-ink">{k.value}</div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary mb-2">Topik yang Diuji</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Fungsi Kuadrat", "Diskriminan", "Rumus Vieta", "Transformasi Grafik"].map(t => (
                    <Badge key={t} tone="neutral">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setUpcomingDetailId(null)}>Tutup</Button>
              <Link href="/teacher/assessment-builder"><Button variant="default" className="h-8 text-[12px]">Edit Asesmen</Button></Link>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && <UploadMaterialModal onClose={() => setShowUploadModal(false)} />}

    </div>
  );
}

// ── localStorage helpers (client-side only) ───────────────────────────────────
function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Real current-teacher context (replaces the mock `currentTeacher` const) ───
// Every `currentTeacher.X` reference in this file now reads from this real,
// Supabase-backed store instead of a hardcoded mock teacher - populated once
// per session (module-level cache, same pattern as the *Store objects below)
// and exposed to components via useRealTeacher().
type RealTeacherAssignment = { classId: string; className: string; subjectId: string; subjectName: string };
type RealTeacherContext = {
  id: string;
  profileId: string;
  name: string;
  schoolId: string;
  classes: { id: string; name: string; year: number | null }[];
  subjects: { id: string; name: string }[];
  assignments: RealTeacherAssignment[];
};

let _realTeacher: RealTeacherContext | null = null;
let _realTeacherPromise: Promise<RealTeacherContext | null> | null = null;
let _realTeacherLoaded = false;
const _teacherListeners = new Set<(t: RealTeacherContext | null) => void>();

// Drops every per-account module cache so switching accounts in the same
// tab never shows the previous teacher's classes/questions.
function resetTeacherCaches() {
  _realTeacher = null;
  _realTeacherPromise = null;
  _realTeacherLoaded = false;
  _activeClassId = "";
  _activeSubjectId = "";
  _bankKey = null;
  _bankLoading = null;
  _bankStore.questions = [];
  _reviewStore.questions = [];
  _bankLoadedKey = null;
  _aiSettingsCache = null;
}

// Module-level caches outlive client-side navigation, so switching accounts
// in the same tab must drop them. Only a real account change resets: Supabase
// also emits SIGNED_IN when a tab regains focus, and wiping the caches then
// would blank the class bar every time the teacher switched tabs.
let _authResetAttached = false;
let _cachedForUserId: string | null = null;
function attachAuthReset() {
  if (_authResetAttached || typeof window === "undefined") return;
  _authResetAttached = true;
  supabase.auth.onAuthStateChange((event, session) => {
    const userId = session?.user.id ?? null;
    if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && _cachedForUserId && userId !== _cachedForUserId)) {
      resetTeacherCaches();
      _overviewCache.clear();
      _bankListeners.forEach(fn => fn());
      if (userId && _teacherListeners.size > 0) loadRealTeacher();
    }
    _cachedForUserId = userId;
  });
  supabase.auth.getSession().then(({ data }) => { _cachedForUserId ??= data.session?.user.id ?? null; });
}

async function loadRealTeacher(): Promise<RealTeacherContext | null> {
  attachAuthReset();
  if (_realTeacher) return _realTeacher;
  if (_realTeacherPromise) return _realTeacherPromise;
  _realTeacherPromise = (async () => {
    const profile = await getCurrentProfile();
    const teacher = profile ? await getCurrentTeacher() : null;
    if (!profile || !teacher) {
      // Never cache a "no teacher" result: it usually just means the
      // session wasn't restored yet, and caching it is what left the
      // class bar empty until a full page refresh.
      _realTeacherPromise = null;
      _realTeacherLoaded = true;
      _teacherListeners.forEach(fn => fn(null));
      return null;
    }
    const { data } = await supabase
      .from("teacher_assignments")
      .select("class_id, subject_id, classes(name, year), subjects(name)")
      .eq("teacher_id", teacher.id);

    const classMap = new Map<string, { id: string; name: string; year: number | null }>();
    const subjectMap = new Map<string, { id: string; name: string }>();
    const assignments: RealTeacherAssignment[] = [];
    for (const row of (data ?? []) as unknown as Array<{
      class_id: string;
      subject_id: string;
      classes: { name: string; year: number | null } | null;
      subjects: { name: string } | null;
    }>) {
      if (row.classes) classMap.set(row.class_id, { id: row.class_id, name: row.classes.name, year: row.classes.year });
      if (row.subjects) subjectMap.set(row.subject_id, { id: row.subject_id, name: row.subjects.name });
      assignments.push({
        classId: row.class_id,
        className: row.classes?.name ?? "-",
        subjectId: row.subject_id,
        subjectName: row.subjects?.name ?? "-",
      });
    }

    const result: RealTeacherContext = {
      id: teacher.id,
      profileId: profile.id,
      name: profile.full_name,
      schoolId: teacher.school_id,
      classes: Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name, "id")),
      subjects: Array.from(subjectMap.values()),
      assignments,
    };
    _realTeacher = result;
    _realTeacherLoaded = true;
    _teacherListeners.forEach(fn => fn(result));
    _classListeners.forEach(fn => fn(getActiveClassId()));
    return result;
  })();
  return _realTeacherPromise;
}

function useRealTeacher(): RealTeacherContext | null {
  const [teacher, setTeacher] = useState<RealTeacherContext | null>(_realTeacher);
  useEffect(() => {
    _teacherListeners.add(setTeacher);
    // Sync with whatever resolved between this component's first render
    // and its effect running (otherwise that update would be missed).
    if (_realTeacher) setTeacher(_realTeacher);
    else loadRealTeacher().then(t => setTeacher(t));
    return () => { _teacherListeners.delete(setTeacher); };
  }, []);
  return teacher;
}

/** true once the teacher context has finished loading (successfully or not). */
function useRealTeacherStatus(): { teacher: RealTeacherContext | null; loading: boolean } {
  const teacher = useRealTeacher();
  return { teacher, loading: !teacher && !_realTeacherLoaded };
}

// ── Active class store (backed by the real teacher's real assigned classes) ──
let _activeClassId = "";
const _classListeners = new Set<(id: string) => void>();

function getActiveClassId(): string {
  const classes = _realTeacher?.classes ?? [];
  // A remembered id from another account / a class this teacher no longer
  // teaches would otherwise leave nothing selected and every page empty.
  if (_activeClassId && !classes.some(c => c.id === _activeClassId)) _activeClassId = "";
  if (!_activeClassId && classes.length > 0) {
    const stored = lsGet<string>("catchup_active_class");
    _activeClassId = stored && classes.some(c => c.id === stored) ? stored : classes[0].id;
  }
  return _activeClassId;
}

function changeActiveClass(id: string) {
  _activeClassId = id;
  lsSet("catchup_active_class", id);
  _classListeners.forEach(fn => fn(id));
}

// ── Active subject (a teacher can teach several subjects in one class) ──────
// Previously the subject was always "the first assignment in the active
// class", so a teacher with Matematika AND IPA in XII IPA 1 could never open
// the IPA bank, materials or results. The selected (class, subject) pair is
// now explicit and remembered.
let _activeSubjectId = "";
const _subjectListeners = new Set<() => void>();

function findActiveAssignment(teacher: RealTeacherContext | null | undefined, classId: string): RealTeacherAssignment | undefined {
  if (!teacher) return undefined;
  const inClass = teacher.assignments.filter(a => a.classId === classId);
  if (!_activeSubjectId) {
    try { _activeSubjectId = window.localStorage.getItem("catchup_active_subject") ?? ""; } catch { /* ignore */ }
  }
  return inClass.find(a => a.subjectId === _activeSubjectId) ?? inClass[0];
}

function changeActiveAssignment(classId: string, subjectId: string) {
  _activeSubjectId = subjectId;
  try { window.localStorage.setItem("catchup_active_subject", subjectId); } catch { /* ignore */ }
  if (classId !== _activeClassId) changeActiveClass(classId);
  _subjectListeners.forEach(fn => fn());
}

function useActiveClass(): [string, typeof changeActiveClass] {
  const teacher = useRealTeacher();
  const [cls, setCls] = useState<string>(() => getActiveClassId());
  const [, bumpSubject] = useState(0);
  useEffect(() => {
    _classListeners.add(setCls);
    const onSubject = () => bumpSubject(x => x + 1);
    _subjectListeners.add(onSubject);
    if (teacher) setCls(getActiveClassId());
    return () => { _classListeners.delete(setCls); _subjectListeners.delete(onSubject); };
  }, [teacher]);
  return [cls, changeActiveClass];
}

// ── Real question bank + review queue (questions table, class+subject-scoped) ─
// `questions.class_id` (migration 010) + `questions.subject_id` together
// match the legacy mock's per-class-per-subject bank exactly - both are
// required (AND), matching teacher_assignments' own (class_id, subject_id)
// grain.
type BankRow = {
  id: string; source: string;
  topic: string; subtopic: string | null; difficulty: Difficulty | null; bloom_level: BloomLevel | null;
  question: string; options: { A: string; B: string; C: string; D: string; E?: string };
  correct_answer: "A" | "B" | "C" | "D" | "E"; explanation: string | null;
  source_title: string | null; source_page: number | null;
  status: string; usage_count: number; success_rate: number | null;
  // migration 026 - absent before it runs
  question_type?: string | null; answer_key?: unknown; image_url?: string | null;
  default_points?: number | null;
};

function bankRowToEntry(row: BankRow): QuestionBankEntry {
  return {
    id: row.id,
    question: row.question,
    topic: row.topic,
    subtopic: row.subtopic ?? row.topic,
    bloom: row.bloom_level ?? "Menerapkan",
    difficulty: row.difficulty ?? "Sedang",
    styleType: "TKA",
    source: row.source_title ?? (row.source === "ai_generated" ? "AI Generated" : "Manual Guru"),
    usageCount: row.usage_count,
    successRate: row.success_rate == null ? 0 : Math.round(Number(row.success_rate)),
    status: row.status === "active" ? "Disetujui" : row.status === "rejected" ? "Ditolak" : "Perlu Ditinjau",
    isLocked: false,
    options: row.options,
    correctAnswer: row.correct_answer,
    explanation: row.explanation ?? "",
    sourceTitle: row.source_title ?? undefined,
    sourcePage: row.source_page ?? undefined,
    questionType: row.question_type ?? "pg",
    answerKey: row.answer_key ?? null,
    imageUrl: row.image_url ?? null,
    defaultPoints: Number(row.default_points) > 0 ? Number(row.default_points) : 1,
  };
}

function bankRowToPending(row: BankRow): PendingQuestion {
  return {
    id: row.id,
    question: row.question,
    optionA: row.options.A ?? "",
    optionB: row.options.B ?? "",
    optionC: row.options.C ?? "",
    optionD: row.options.D ?? "",
    correctAnswer: row.correct_answer as "A" | "B" | "C" | "D",
    explanation: row.explanation ?? "",
    topic: row.topic,
    difficulty: row.difficulty ?? "Sedang",
    sourceRef: row.source_title ?? "AI Generated",
    status: "Perlu Ditinjau",
    questionType: row.question_type ?? "pg",
    answerKey: row.answer_key ?? null,
    rawOptions: row.options as unknown as Record<string, unknown>,
  };
}

let _bankKey: string | null = null;
let _bankLoading: Promise<void> | null = null;
const _bankStore: { questions: QuestionBankEntry[] } = { questions: [] };
const _reviewStore: { questions: PendingQuestion[] } = { questions: [] };
const _bankListeners = new Set<() => void>();

let _bankLoadedKey: string | null = null;

async function loadBankAndReview(classId: string, subjectId: string): Promise<void> {
  const key = `${classId}:${subjectId}`;
  if (_bankKey === key) return _bankLoading ?? Promise.resolve();
  _bankKey = key;
  _bankLoading = (async () => {
    const { data } = await supabase
      .from("questions")
      .select("*") // includes question_type / answer_key / image_url once migration 026 ran
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });
    if (_bankKey !== key) return; // superseded by a newer class/subject
    const rows = (data ?? []) as unknown as BankRow[];
    _bankStore.questions = rows.filter(r => r.status === "active").map(bankRowToEntry);
    _reviewStore.questions = rows.filter(r => r.status === "pending").map(bankRowToPending);
    _bankLoadedKey = key;
    _bankListeners.forEach(fn => fn());
  })();
  return _bankLoading;
}

function refreshBankAndReview(classId: string, subjectId: string): Promise<void> {
  _bankKey = null;
  return loadBankAndReview(classId, subjectId);
}

function useQuestionBank(classId: string | undefined, subjectId: string | undefined): { bank: QuestionBankEntry[]; pending: PendingQuestion[]; loading: boolean } {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!classId || !subjectId) return;
    loadBankAndReview(classId, subjectId).then(() => bump(x => x + 1));
    const listener = () => bump(x => x + 1);
    _bankListeners.add(listener);
    return () => { _bankListeners.delete(listener); };
  }, [classId, subjectId]);
  const key = classId && subjectId ? `${classId}:${subjectId}` : null;
  // Only expose rows that belong to the requested class+subject; while a
  // different key is still loading, report loading instead of stale rows.
  const ready = key !== null && _bankLoadedKey === key;
  return {
    bank: ready ? _bankStore.questions : [],
    pending: ready ? _reviewStore.questions : [],
    loading: !ready,
  };
}

// ── Teacher AI settings (teacher_ai_settings, one row per teacher) ────────────
type TeacherAiSettings = {
  activeStyle: "socratic" | "explicit" | "analogy";
  grounding: boolean; autoReview: boolean; parentReports: boolean; bloomBalance: boolean; notifyWeak: boolean;
  personaName: string; languageStyle: "santai" | "baku"; helpLevel: "petunjuk" | "bertahap" | "lengkap";
};
const DEFAULT_AI_SETTINGS: TeacherAiSettings = {
  activeStyle: "socratic", grounding: true, autoReview: false, parentReports: true, bloomBalance: true, notifyWeak: true,
  personaName: "Kak AI", languageStyle: "santai", helpLevel: "bertahap",
};
let _aiSettingsCache: { teacherId: string; settings: TeacherAiSettings } | null = null;

async function fetchTeacherAiSettings(teacherId: string): Promise<TeacherAiSettings> {
  if (_aiSettingsCache?.teacherId === teacherId) return _aiSettingsCache.settings;
  const { data } = await supabase
    .from("teacher_ai_settings")
    .select("*") // persona columns (migration 023) may not exist yet
    .eq("teacher_id", teacherId)
    .maybeSingle();
  const settings: TeacherAiSettings = data ? {
    activeStyle: (data.active_style ?? "socratic") as TeacherAiSettings["activeStyle"],
    grounding: data.grounding_required,
    autoReview: data.auto_review,
    parentReports: data.parent_reports,
    bloomBalance: data.bloom_balance,
    notifyWeak: data.notify_weak,
    personaName: data.persona_name ?? DEFAULT_AI_SETTINGS.personaName,
    languageStyle: data.language_style === "baku" ? "baku" : "santai",
    helpLevel: (["petunjuk", "bertahap", "lengkap"].includes(data.help_level) ? data.help_level : "bertahap") as TeacherAiSettings["helpLevel"],
  } : DEFAULT_AI_SETTINGS;
  _aiSettingsCache = { teacherId, settings };
  return settings;
}

async function saveTeacherAiSettings(teacherId: string, settings: TeacherAiSettings): Promise<string | null> {
  const { error } = await supabase.from("teacher_ai_settings").upsert({
    teacher_id: teacherId,
    active_style: settings.activeStyle,
    grounding_required: settings.grounding,
    auto_review: settings.autoReview,
    parent_reports: settings.parentReports,
    bloom_balance: settings.bloomBalance,
    notify_weak: settings.notifyWeak,
    persona_name: settings.personaName.trim() || DEFAULT_AI_SETTINGS.personaName,
    language_style: settings.languageStyle,
    help_level: settings.helpLevel,
    updated_at: new Date().toISOString(),
  }, { onConflict: "teacher_id" });
  if (isMissingColumnError(error)) return "Kolom persona belum ada di database. Jalankan migrasi 023 terlebih dahulu.";
  if (error) return error.message;
  _aiSettingsCache = { teacherId, settings };
  return null;
}

// Authenticated POST to one of this app's own API routes (the server
// verifies the bearer token itself). Returns the parsed JSON body, or an
// { error } object for network/HTTP failures, so callers can always show
// the real reason instead of failing silently.
/** JSON headers with the signed-in user's token (AI routes require login). */
async function jsonAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) };
}

async function apiPost<T = Record<string, unknown>>(path: string, body: unknown): Promise<T & { error?: string }> {
  try {
    const send = (token?: string) => fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const { data: { session } } = await supabase.auth.getSession();
    let res = await send(session?.access_token);
    // A stored token can be stale (tab asleep, refresh missed): refresh once
    // and retry before telling the user to sign in again.
    if (res.status === 401) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) res = await send(refreshed.session.access_token);
    }
    const json = await res.json().catch(() => ({})) as T & { error?: string };
    if (res.status === 401) return { ...json, error: "Sesi login kamu sudah berakhir. Keluar lalu masuk lagi, ya." };
    if (!res.ok && !json.error) return { ...json, error: `Server error (${res.status})` };
    return json;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menghubungi server" } as T & { error?: string };
  }
}

// Insert freshly AI-generated questions straight into the review queue (status 'pending')
/** A question as the generation routes return it (any TKA type). */
type PendingRawQuestion = {
  question: string; options: Record<string, unknown>; correctAnswer: string | null; explanation?: string;
  topic?: string; difficulty?: string; questionType?: QuestionType; answerKey?: unknown;
};

async function insertPendingQuestions(
  raw: PendingRawQuestion[],
  schoolId: string, classId: string, subjectId: string, creatorId: string, sourceTitle: string,
  sourceMaterialId?: string,
): Promise<void> {
  if (!raw.length) return;
  // "Auto-approve soal AI" (Konfigurasi AI): skip the review queue and put
  // AI questions straight into the active bank.
  const autoApprove = _realTeacher ? (await fetchTeacherAiSettings(_realTeacher.id)).autoReview : false;
  const rows = raw.map(q => ({
    school_id: schoolId,
    class_id: classId,
    subject_id: subjectId,
    creator_id: creatorId,
    source: "ai_generated" as const,
    topic: q.topic || "Umum",
    subtopic: q.topic || "Umum",
    difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty ?? "") ? q.difficulty : "Sedang") as Difficulty,
    bloom_level: "Menerapkan" as const,
    question: q.question,
    ...((q.questionType ?? "pg") === "pg"
      ? {
          options: { A: String(q.options.A ?? ""), B: String(q.options.B ?? ""), C: String(q.options.C ?? ""), D: String(q.options.D ?? "") },
          correct_answer: (["A", "B", "C", "D", "E"].includes(q.correctAnswer ?? "") ? q.correctAnswer : "A") as "A" | "B" | "C" | "D" | "E" | null,
        }
      : { options: q.options, correct_answer: null }),
    question_type: q.questionType ?? "pg",
    answer_key: q.answerKey ?? null,
    explanation: q.explanation ?? "",
    status: (autoApprove ? "active" : "pending") as "active" | "pending",
    source_title: sourceTitle,
    source_material_id: sourceMaterialId ?? null,
  }));
  await supabase.from("questions").insert(rows);
  await refreshBankAndReview(classId, subjectId);
}

async function saveManualQToBank(
  q: typeof EMPTY_MANUAL_Q,
  schoolId: string, classId: string, subjectId: string, creatorId: string,
): Promise<string | null> {
  const structureError = manualStructureError(q);
  if (!q.text.trim() || !q.topic.trim() || structureError) {
    return structureError ?? "Lengkapi semua kolom bertanda *.";
  }
  const type = q.type as QuestionType;
  const row = {
    school_id: schoolId,
    class_id: classId,
    subject_id: subjectId,
    creator_id: creatorId,
    source: "bank",
    bloom_level: "Menerapkan",
    status: "active",
    source_title: "Manual Guru",
    ...draftToQuestionFields(q),
  };
  let { error } = await supabase.from("questions").insert(row as never);
  if (isMissingColumnError(error)) {
    // Before migration 028 (default_points): save without the score.
    const { default_points: _dp, ...withoutPoints } = row;
    ({ error } = await supabase.from("questions").insert(withoutPoints as never));
  }
  if (isMissingColumnError(error)) {
    // Before migration 026: plain PG without a picture still saves.
    if (type !== "pg" || row.image_url) return "Database belum mendukung tipe soal, gambar & skor. Jalankan migrasi 026 dan 028 terlebih dahulu.";
    const { question_type: _t, answer_key: _k, image_url: _i, default_points: _p, ...legacy } = row;
    ({ error } = await supabase.from("questions").insert(legacy as never));
  }
  if (error) return error.message;
  await refreshBankAndReview(classId, subjectId);
  return null;
}

/** Form draft -> the content columns of a questions row (any type). */
function draftToQuestionFields(q: typeof EMPTY_MANUAL_Q) {
  const type = q.type as QuestionType;
  const letters = (["A", "B", "C", "D", "E"] as const).filter(k => manualOpt(q, k).trim());
  const letterOptions = Object.fromEntries(letters.map(k => [k, manualOpt(q, k).trim()]));
  let options: Record<string, unknown> = {};
  let correct: string | null = null;
  let answerKey: unknown = null;
  if (type === "pg") { options = letterOptions; correct = q.correct; }
  else if (type === "pg_kompleks") { options = letterOptions; answerKey = decodeComplex(q.complex).filter(k => letters.includes(k as "A")); }
  else if (type === "benar_salah") {
    const st = parseDraft<TFDraftRow>(q.statements).filter(x => x.text.trim());
    options = { statements: st.map(x => x.text.trim()) };
    answerKey = st.map(x => x.answer);
  } else if (type === "menjodohkan") {
    const rows = parseDraft<PairDraftRow>(q.pairs);
    const pairs = rows.filter(p => !p.distractor && p.left.trim() && p.right.trim());
    const extras = rows.filter(p => p.distractor).map(p => p.right.trim()).filter(Boolean);
    options = { left: pairs.map(p => p.left.trim()), right: [...pairs.map(p => p.right.trim()), ...extras] };
    answerKey = pairs.map((_, i) => i);
  } else if (type === "isian") {
    answerKey = { accepted: q.accepted.split(/[;\n|]/).map(x => x.trim()).filter(Boolean) };
  } else if (type === "esai") {
    const keywords = q.keywords.split(/[,;\n]/).map(k => k.trim()).filter(Boolean);
    answerKey = q.rubric.trim() || keywords.length ? { ...(q.rubric.trim() ? { rubric: q.rubric.trim() } : {}), ...(keywords.length ? { keywords } : {}) } : null;
  }
  return {
    question_type: type,
    question: q.text.trim(),
    options,
    correct_answer: correct,
    answer_key: answerKey,
    topic: q.topic.trim(),
    subtopic: q.topic.trim(),
    difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty) ? q.difficulty : "Sedang") as Difficulty,
    explanation: q.explanation.trim(),
    image_url: q.imageUrl || null,
    default_points: Math.round(Number(q.points) || 1),
  };
}

/** A stored question (any type) -> form draft, for editing. */
function questionToDraft(q: {
  question: string; options: Record<string, unknown> | null; correct_answer?: string | null; answer_key?: unknown;
  question_type?: string | null; topic?: string | null; difficulty?: string | null; explanation?: string | null;
  image_url?: string | null; default_points?: number | null;
}): typeof EMPTY_MANUAL_Q {
  const type = questionTypeOf(q);
  const o = (q.options ?? {}) as Record<string, unknown>;
  const draft = {
    ...EMPTY_MANUAL_Q, type, text: q.question ?? "", topic: q.topic ?? "", difficulty: q.difficulty ?? "Sedang",
    explanation: q.explanation ?? "", imageUrl: q.image_url ?? "", points: String(q.default_points ?? 1),
  };
  if (type === "pg" || type === "pg_kompleks") {
    for (const k of ["A", "B", "C", "D", "E"] as const) draft[`opt${k}` as "optA"] = typeof o[k] === "string" ? (o[k] as string) : "";
    if (type === "pg") draft.correct = q.correct_answer ?? "";
    else draft.complex = encodeComplex(Array.isArray(q.answer_key) ? (q.answer_key as string[]) : []);
  } else if (type === "benar_salah") {
    const st = Array.isArray(o.statements) ? (o.statements as string[]) : [];
    const key = Array.isArray(q.answer_key) ? (q.answer_key as string[]) : [];
    draft.statements = JSON.stringify(st.map((text, i) => ({ text, answer: key[i] === "B" || key[i] === "S" ? key[i] : "" })));
  } else if (type === "menjodohkan") {
    const left = Array.isArray(o.left) ? (o.left as string[]) : [];
    const right = Array.isArray(o.right) ? (o.right as string[]) : [];
    const key = Array.isArray(q.answer_key) ? (q.answer_key as number[]).map(Number) : [];
    const used = new Set(key);
    draft.pairs = JSON.stringify([
      ...left.map((l, i) => ({ left: l, right: right[key[i]] ?? "" })),
      ...right.filter((_, i) => !used.has(i)).map(r => ({ left: "", right: r, distractor: true })),
    ]);
  } else if (type === "isian") {
    draft.accepted = ((q.answer_key as { accepted?: string[] } | null)?.accepted ?? []).join("; ");
  } else if (type === "esai") {
    draft.rubric = (q.answer_key as { rubric?: string } | null)?.rubric ?? "";
    draft.keywords = ((q.answer_key as { keywords?: string[] } | null)?.keywords ?? []).join(", ");
  }
  return draft;
}

/** Saves edits to an existing question (RLS: only its creator may update). */
async function updateQuestionFromDraft(id: string, q: typeof EMPTY_MANUAL_Q, classId?: string, subjectId?: string): Promise<string | null> {
  const structureError = manualStructureError(q);
  if (!q.text.trim() || !q.topic.trim() || structureError) return structureError ?? "Lengkapi semua kolom bertanda *.";
  const { data, error } = await supabase.from("questions")
    .update({ ...draftToQuestionFields(q), updated_at: new Date().toISOString() } as never)
    .eq("id", id).select("id");
  if (error) return error.message;
  if (!data?.length) return "Soal ini dibuat oleh guru lain, jadi hanya pembuatnya yang bisa mengubahnya.";
  if (classId && subjectId) await refreshBankAndReview(classId, subjectId);
  return null;
}

// Edit any question (all TKA types) in the same form used to create one.
function QuestionEditDialog({ initial, title = "Edit Soal", topicOptions, onSave, onClose }: {
  initial: typeof EMPTY_MANUAL_Q;
  title?: string;
  topicOptions?: string[];
  onSave: (draft: typeof EMPTY_MANUAL_Q) => Promise<string | null>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const validation = useRequiredFields(draft, manualRequired(draft));
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-card border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
          <h2 className="text-[14px] font-bold text-ink">{title}</h2>
          <button onClick={onClose} disabled={saving} aria-label="Tutup" className="flex h-7 w-7 items-center justify-center rounded-full text-ink-secondary hover:bg-background">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <ManualQuestionFields value={draft} onChange={setDraft} errorFor={validation.errorFor} attempted={validation.attempted} topicOptions={topicOptions} />
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
          <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>Batal</Button>
          <Button variant="default" size="sm" disabled={saving} onClick={async () => {
            if (!validation.validate() || manualStructureError(draft)) { setError(manualStructureError(draft) ?? "Tolong lengkapi kolom bertanda *."); return; }
            setSaving(true);
            const err = await onSave(draft);
            setSaving(false);
            if (err) setError(err); else onClose();
          }}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
        </div>
      </div>
    </div>
  );
}

type TFDraftRow = { text: string; answer: "B" | "S" | "" };
/** A matching row; distractor rows have only a right side (pengecoh). */
type PairDraftRow = { left: string; right: string; distractor?: boolean };
function parseDraft<T>(json: string): T[] {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function manualOpt(q: typeof EMPTY_MANUAL_Q, k: "A" | "B" | "C" | "D" | "E"): string {
  return q[`opt${k}` as "optA"];
}

/** Required simple fields for the chosen type (structure is checked by manualStructureError). */
function manualRequired(q: typeof EMPTY_MANUAL_Q): (keyof typeof EMPTY_MANUAL_Q)[] {
  if (q.type === "pg") return ["text", "optA", "optB", "optC", "optD", "correct", "topic"];
  if (q.type === "pg_kompleks") return ["text", "optA", "optB", "optC", "optD", "topic"];
  return ["text", "topic"];
}

/** What is still missing in a type's structure (key, statements, pairs), or null. */
function manualStructureError(q: typeof EMPTY_MANUAL_Q): string | null {
  const pts = Number(q.points);
  if (!Number.isFinite(pts) || pts < 1 || pts > 100) return "Skor soal harus antara 1 dan 100.";
  switch (q.type) {
    case "isian":
      return q.accepted.split(/[;\n|]/).some(x => x.trim()) ? null : "Isi jawaban yang benar.";
    case "pg":
      return ["A", "B", "C", "D", "E"].includes(q.correct) ? null : "Kunci jawaban wajib diisi.";
    case "pg_kompleks": {
      const keys = decodeComplex(q.complex).filter(k => manualOpt(q, k as "A").trim());
      return keys.length >= 1 ? null : "Centang minimal satu jawaban benar.";
    }
    case "benar_salah": {
      const st = parseDraft<TFDraftRow>(q.statements).filter(s => s.text.trim());
      if (st.length < 2) return "Isi minimal 2 pernyataan.";
      return st.every(s => s.answer === "B" || s.answer === "S") ? null : "Tentukan Benar/Salah untuk setiap pernyataan.";
    }
    case "menjodohkan": {
      const rows = parseDraft<PairDraftRow>(q.pairs);
      const pairs = rows.filter(p => !p.distractor);
      const filled = pairs.filter(p => p.left.trim() && p.right.trim());
      if (filled.length < 2) return "Isi minimal 2 pasangan.";
      if (pairs.some(p => !!p.left.trim() !== !!p.right.trim())) return "Setiap pasangan harus diisi kiri dan kanan.";
      const rights = rows.map(p => p.right.trim().toLowerCase()).filter(Boolean);
      return new Set(rights).size !== rights.length ? "Ada jawaban kanan yang sama persis - setiap jawaban kanan harus berbeda." : null;
    }
    default:
      return null;
  }
}

// Uploads a picture for a question; returns its public URL or an error.
async function uploadQuestionImage(file: File): Promise<{ url: string } | { error: string }> {
  const ticket = await apiPost<{ path: string; token: string; publicUrl: string }>("/api/teacher/question-image", { fileName: file.name, fileSize: file.size });
  if (ticket.error || !ticket.token) return { error: ticket.error ?? "Gagal menyiapkan unggahan" };
  const { error } = await supabase.storage.from("question-images").uploadToSignedUrl(ticket.path, ticket.token, file);
  if (error) return { error: `Gambar gagal diunggah: ${error.message}` };
  return { url: ticket.publicUrl };
}

// Phone photos are often 3-10 MB: shrink to max 1600px and re-encode as
// JPEG before uploading (keeps exams fast on school internet). Returns the
// original file when it can't be decoded (e.g. HEIC on Chrome).
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file; // keep animation
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1_000_000 && file.type !== "image/heic") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

// Picture for a question: click to choose, drag & drop a file, or paste
// (Ctrl+V) a screenshot.
function QuestionImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  async function pick(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr(`"${file.name}" bukan gambar. Gunakan PNG, JPG, WEBP, atau GIF.`); return; }
    setErr(null); setBusy(true);
    const ready = await compressImage(file);
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(ready.type)) {
      setBusy(false);
      setErr(`Format ${file.type.replace("image/", "").toUpperCase()} belum didukung browser ini. Simpan ulang gambarnya sebagai JPG atau PNG.`);
      return;
    }
    if (ready.size > 3 * 1024 * 1024) { setBusy(false); setErr("Gambar masih lebih dari 3 MB setelah dikecilkan. Coba gambar lain."); return; }
    const res = await uploadQuestionImage(ready);
    setBusy(false);
    if ("error" in res) setErr(res.error); else onChange(res.url);
  }
  return (
    <div
      tabIndex={0}
      onPaste={e => { const f = [...e.clipboardData.files].find(x => x.type.startsWith("image/")); if (f) { e.preventDefault(); pick(f); } }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
      className={cn("rounded-[10px] border-2 border-dashed p-3 outline-none transition-colors focus:border-primary/60",
        over ? "border-primary bg-primary-soft" : "border-border bg-background")}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {value ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Gambar soal" className="max-h-40 rounded-[8px] border border-border object-contain" />
          <div className="flex flex-col gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Mengunggah..." : "Ganti"}</Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onChange("")}>Hapus</Button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 py-3 text-center">
          {busy ? (
            <span className="flex items-center gap-2 text-[13px] font-semibold text-primary">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />Mengunggah gambar...
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary"><Plus className="h-4 w-4" />Tambah Gambar</span>
              <span className="text-[11px] text-ink-tertiary">Klik, tarik file ke sini, atau tempel (Ctrl+V) · PNG/JPG/WEBP/GIF · foto besar dikecilkan otomatis</span>
            </>
          )}
        </button>
      )}
      {err && <p role="alert" className="mt-2 rounded-[6px] bg-danger-light px-2.5 py-1.5 text-[12px] font-medium text-danger">{err}</p>}
    </div>
  );
}

const QUESTION_TYPE_OPTIONS: SelectOption[] = QUESTION_TYPES.map(t => ({ value: t, label: QUESTION_TYPE_LABEL[t], description: QUESTION_TYPE_HINT[t] }));

// Shared manual-question form used by Bank Soal and the assessment
// builder's "Tambah Soal Baru" dialog - every * field turns red with a
// message if submit is attempted while it's empty. The type selector
// switches the answer section (PG, PG kompleks, Benar/Salah, menjodohkan, esai).
function ManualQuestionFields({ value, onChange, errorFor, attempted, topicOptions = [], subject }: {
  value: typeof EMPTY_MANUAL_Q;
  onChange: (next: typeof EMPTY_MANUAL_Q) => void;
  errorFor: (k: keyof typeof EMPTY_MANUAL_Q) => string | null;
  attempted?: boolean;
  /** existing bab/topik names to pick from (a new one can still be typed) */
  topicOptions?: string[];
  /** mapel the question is saved to; omit onChange to show it read-only */
  subject?: { value: string; options: SelectOption[]; onChange?: (v: string) => void };
}) {
  const set = (k: keyof typeof EMPTY_MANUAL_Q, v: string) => onChange({ ...value, [k]: v });
  const type = value.type as QuestionType;
  const structureError = attempted ? manualStructureError(value) : null;
  const statements = parseDraft<TFDraftRow>(value.statements);
  const pairRows = parseDraft<PairDraftRow>(value.pairs);
  const pairs = pairRows.length ? pairRows : [{ left: "", right: "" }, { left: "", right: "" }];
  const setPairs = (rows: PairDraftRow[]) => set("pairs", JSON.stringify(rows));
  const complexKeys = decodeComplex(value.complex);

  const letterInputs = (letters: readonly ("A" | "B" | "C" | "D" | "E")[], complex: boolean) => letters.map(opt => {
    const k = `opt${opt}` as "optA";
    const optional = opt === "E";
    return (
      <FormField key={opt} label={`Pilihan ${opt}${optional ? " (opsional)" : ""}`} required={!optional} error={errorFor(k)}>
        <div className="flex items-center gap-2">
          {complex && (
            <label className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-ink-secondary">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={complexKeys.includes(opt)}
                onChange={() => set("complex", encodeComplex(complexKeys.includes(opt) ? complexKeys.filter(x => x !== opt) : [...complexKeys, opt]))} />
              Benar
            </label>
          )}
          <input type="text" placeholder={`Jawaban pilihan ${opt}`}
            value={value[k]} onChange={e => set(k, e.target.value)}
            className={fieldClass(!!errorFor(k))} />
        </div>
      </FormField>
    );
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {subject && (
          <FormField label="Mata Pelajaran" required>
            <SelectField value={subject.value} options={subject.options} disabled={!subject.onChange}
              onChange={v => subject.onChange?.(v)} placeholder="Pilih mapel..." />
          </FormField>
        )}
        <FormField label="Tipe Soal" required>
          <SelectField value={value.type} options={QUESTION_TYPE_OPTIONS} onChange={v => set("type", v)} />
        </FormField>
      </div>
      <FormField label="Pertanyaan" required error={errorFor("text")}>
        <textarea rows={3} placeholder="Tuliskan pertanyaan di sini..."
          value={value.text} onChange={e => set("text", e.target.value)}
          className={fieldClass(!!errorFor("text"), "resize-none")} />
      </FormField>
      <FormField label="Gambar (opsional)">
        <QuestionImagePicker value={value.imageUrl} onChange={url => set("imageUrl", url)} />
      </FormField>

      {(type === "pg" || type === "pg_kompleks") && letterInputs(["A", "B", "C", "D", "E"], type === "pg_kompleks")}

      {type === "benar_salah" && (
        <FormField label="Pernyataan" required>
          <div className="space-y-2">
            {(statements.length ? statements : [{ text: "", answer: "" as const }, { text: "", answer: "" as const }]).map((s, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-[12px] font-semibold text-ink-secondary">{i + 1}.</span>
                <input type="text" value={s.text} placeholder="Tulis pernyataan..."
                  onChange={e => set("statements", JSON.stringify(arr.map((x, j) => j === i ? { ...x, text: e.target.value } : x)))}
                  className={fieldClass(false)} />
                {(["B", "S"] as const).map(v => (
                  <button key={v} type="button" onClick={() => set("statements", JSON.stringify(arr.map((x, j) => j === i ? { ...x, answer: v } : x)))}
                    className={cn("shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold",
                      s.answer === v ? (v === "B" ? "border-success bg-success text-white" : "border-danger bg-danger text-white") : "border-border bg-surface text-ink-secondary")}>
                    {v === "B" ? "Benar" : "Salah"}
                  </button>
                ))}
                {arr.length > 2 && (
                  <button type="button" aria-label="Hapus pernyataan" onClick={() => set("statements", JSON.stringify(arr.filter((_, j) => j !== i)))}>
                    <X className="h-4 w-4 text-ink-tertiary" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => set("statements", JSON.stringify([...(statements.length ? statements : [{ text: "", answer: "" }, { text: "", answer: "" }]), { text: "", answer: "" }]))}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Pernyataan
            </Button>
          </div>
        </FormField>
      )}

      {type === "menjodohkan" && (
        <FormField label="Pasangan" required>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">
              <span>Item kiri (soal)</span><span /><span>Item kanan (jawaban)</span><span />
            </div>
            {pairs.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                {p.distractor ? (
                  <div className="rounded-[8px] border border-dashed border-border bg-background px-3 py-2 text-[12px] italic text-ink-tertiary">
                    (kosong - pengecoh)
                  </div>
                ) : (
                  <input type="text" value={p.left} placeholder={`Item kiri ${pairs.slice(0, i + 1).filter(x => !x.distractor).length}`}
                    onChange={e => setPairs(pairs.map((x, j) => j === i ? { ...x, left: e.target.value } : x))}
                    className={fieldClass(false)} />
                )}
                <span className="text-ink-tertiary">{p.distractor ? "" : "→"}</span>
                <input type="text" value={p.right} placeholder={p.distractor ? "Jawaban pengecoh" : "Pasangannya"}
                  onChange={e => setPairs(pairs.map((x, j) => j === i ? { ...x, right: e.target.value } : x))}
                  className={fieldClass(false, p.distractor ? "border-dashed" : "")} />
                {pairs.length > 2 ? (
                  <button type="button" aria-label="Hapus baris" onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4 text-ink-tertiary" />
                  </button>
                ) : <span className="w-4" />}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setPairs([...pairs.filter(x => !x.distractor), { left: "", right: "" }, ...pairs.filter(x => x.distractor)])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Pasangan
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPairs([...pairs, { left: "", right: "", distractor: true }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Pengecoh
              </Button>
            </div>
            <p className="text-[11px] text-ink-tertiary">Pengecoh = jawaban kanan tanpa pasangan di kiri. Urutan kolom kanan diacak otomatis untuk setiap siswa.</p>
          </div>
        </FormField>
      )}

      {type === "isian" && (
        <FormField label="Jawaban yang benar" required hint="Pisahkan beberapa jawaban yang sama-sama benar dengan titik koma, misal: 5040; 5.040. Angka dibandingkan nilainya (5.040 = 5040 = 5040 cara), huruf besar/kecil diabaikan.">
          <input type="text" placeholder="contoh: 5040" value={value.accepted}
            onChange={e => set("accepted", e.target.value)} className={fieldClass(!!(attempted && !value.accepted.trim()))} />
        </FormField>
      )}

      {type === "esai" && (
        <FormField label="Kata kunci (opsional)" hint="Pisahkan dengan koma, misal: fotosintesis, klorofil, cahaya matahari. AI memeriksa apakah kata kunci dipakai dengan makna dan konteks yang benar - bukan sekadar disebut.">
          <input type="text" placeholder="kata kunci 1, kata kunci 2, ..." value={value.keywords}
            onChange={e => set("keywords", e.target.value)} className={fieldClass(false)} />
        </FormField>
      )}

      {type === "esai" && (
        <FormField label="Pedoman penilaian (opsional)">
          <textarea rows={2} placeholder="Poin-poin yang harus ada di jawaban siswa..."
            value={value.rubric} onChange={e => set("rubric", e.target.value)}
            className={fieldClass(false, "resize-none")} />
        </FormField>
      )}

      {structureError && <p role="alert" className="text-[12px] font-medium text-danger">{structureError}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {type === "pg" && (
          <FormField label="Kunci Jawaban" required error={errorFor("correct") ? "Kunci jawaban wajib diisi" : null}>
            <SelectField value={value.correct} options={ANSWER_OPTIONS.concat(manualOpt(value, "E").trim() ? [{ value: "E", label: "E" }] : [])} placeholder="Pilih kunci..."
              invalid={!!errorFor("correct")} onChange={v => set("correct", v)} />
          </FormField>
        )}
        <FormField label="Kesulitan" required>
          <SelectField value={value.difficulty} options={DIFFICULTY_OPTIONS} onChange={v => set("difficulty", v)} />
        </FormField>
        <FormField label="Bab / Topik" required error={errorFor("topic")}>
          <SelectField value={value.topic} creatable invalid={!!errorFor("topic")}
            placeholder="Pilih atau ketik bab/topik..."
            options={[...new Set(topicOptions.filter(Boolean))].sort((x, y) => x.localeCompare(y, "id")).map(t => ({ value: t, label: t }))}
            onChange={v => set("topic", v)} />
        </FormField>
        <FormField label="Skor (poin)" required>
          <input type="number" min={1} max={100} step={1} value={value.points}
            onChange={e => set("points", e.target.value)}
            className={fieldClass(false)} />
        </FormField>
      </div>
      <FormField label={type === "esai" ? "Contoh jawaban benar (opsional, dipakai AI saat membantu menilai)" : "Pembahasan (opsional)"}>
        <textarea rows={type === "esai" ? 4 : 2} placeholder={type === "esai" ? "Tulis jawaban yang dianggap benar. Kalau dikosongkan, AI menilai berdasarkan materi kelas." : "Jelaskan jawaban benar..."}
          value={value.explanation} onChange={e => set("explanation", e.target.value)}
          className={fieldClass(false, "resize-none")} />
      </FormField>
    </>
  );
}


/** Imported worksheet question whose answer key wasn't printed on the sheet. */
function needsKeyCheck(q: PendingQuestion): boolean {
  return !!(q.answerKey as { keyCheck?: boolean } | null)?.keyCheck;
}

function pendingToApprovePayload(m: PendingQuestion) {
  // TKA types: options/key are kept as generated (the server ignores them).
  const isPg = (m.questionType ?? "pg") === "pg";
  return {
    id: m.id, question: m.question, topic: m.topic, difficulty: m.difficulty, explanation: m.explanation,
    ...(isPg ? { correctAnswer: m.correctAnswer, options: { A: m.optionA, B: m.optionB, C: m.optionC, D: m.optionD } } : {}),
  };
}

// Approve/reject go through /api/teacher/questions/review (see that route
// for why a direct client UPDATE was unreliable). Each returns an error
// message, or null on success.
async function approveBankQuestion(merged: PendingQuestion, classId: string, subjectId: string): Promise<string | null> {
  const res = await apiPost("/api/teacher/questions/review", { action: "approve", questions: [pendingToApprovePayload(merged)] });
  await refreshBankAndReview(classId, subjectId);
  return res.error ?? null;
}

async function rejectBankQuestion(id: string, classId: string, subjectId: string): Promise<string | null> {
  const res = await apiPost("/api/teacher/questions/review", { action: "reject", ids: [id] });
  await refreshBankAndReview(classId, subjectId);
  return res.error ?? null;
}

async function approveAllBankQuestions(merged: PendingQuestion[], classId: string, subjectId: string): Promise<string | null> {
  const res = await apiPost("/api/teacher/questions/review", { action: "approve", questions: merged.map(pendingToApprovePayload) });
  await refreshBankAndReview(classId, subjectId);
  return res.error ?? null;
}

// ── Real assessments (assessments + assessment_questions tables) ──────────────
// `SavedAssessment` is kept as the shared display shape every consumer in this
// file already renders against - only its data source changes (real Supabase
// rows mapped in, instead of a localStorage-backed mock list).
type SavedAssessment = Assessment & {
  questions: typeof questionBank;
  openAt?: string;
  closeAt?: string;
};

type AssessmentRow = {
  id: string; title: string; type: string | null; duration_minutes: number | null;
  open_at: string | null; close_at: string | null; status: string; created_at: string;
};

function assessmentRowToSaved(row: AssessmentRow, classId: string, questionCount = 0, avgScore?: number, participants?: number): SavedAssessment {
  return {
    id: row.id,
    title: row.title,
    // Legacy mock never distinguished draft vs. published in this display
    // field (both were always saved as "Terjadwal") - preserved exactly here.
    type: (row.type ?? "Kuis Guru") as Assessment["type"],
    subject: "",
    classId,
    totalQuestions: questionCount,
    duration: row.duration_minutes ?? 0,
    scheduledFor: row.open_at
      ? new Date(parseDbTime(row.open_at)).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date(parseDbTime(row.created_at)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    // Normalised to explicit-UTC ISO strings so every consumer can safely
    // use `new Date(openAt)` (see parseDbTime).
    openAt: row.open_at ? new Date(parseDbTime(row.open_at)).toISOString() : undefined,
    closeAt: row.close_at ? new Date(parseDbTime(row.close_at)).toISOString() : undefined,
    avgScore,
    participants,
    status: "Terjadwal",
    createdAt: new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    questions: [],
  };
}

// Teacher-scoped read: RLS already restricts to the caller's own assigned
// (class, subject) pairs, so this is a safe direct client read (no service
// route needed), same trust level as the teacher's own materials/bank reads.
async function fetchClassAssessments(classId: string, subjectId: string): Promise<SavedAssessment[]> {
  const { data } = await supabase
    .from("assessments")
    .select("id, title, type, duration_minutes, open_at, close_at, status, created_at, assessment_questions(count)")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  type Row = AssessmentRow & { assessment_questions: { count: number }[] };
  return ((data ?? []) as unknown as Row[]).map(r => assessmentRowToSaved(r, classId, r.assessment_questions?.[0]?.count ?? 0));
}

// Student-scoped read: RLS on `assessments` already restricts to the
// caller's own class + status='published' (drafts are never visible), and
// RLS on `assessment_attempts` already restricts to the caller's own
// attempts - both safe direct client reads. Per-student status is derived
// from real attempt state, replacing the mock's always-"Terjadwal" write.
async function fetchStudentAssessments(): Promise<SavedAssessment[]> {
  const { data } = await supabase
    .from("assessments")
    .select("id, title, type, duration_minutes, open_at, close_at, status, created_at, assessment_questions(count)")
    .eq("status", "published");
  type Row = AssessmentRow & { assessment_questions: { count: number }[] };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const { data: attemptData } = await supabase
    .from("assessment_attempts")
    .select("assessment_id, status")
    .in("assessment_id", rows.map(r => r.id));
  type AttemptRow = { assessment_id: string; status: string };
  const attempts = (attemptData ?? []) as AttemptRow[];

  const now = Date.now();
  return rows.map(r => {
    const saved = assessmentRowToSaved(r, "", r.assessment_questions?.[0]?.count ?? 0);
    const done = attempts.some(a => a.assessment_id === r.id && (a.status === "submitted" || a.status === "graded"));
    const closed = r.close_at ? now > parseDbTime(r.close_at) : false;
    saved.status = done ? "Selesai" : closed ? "Berlangsung" : "Terjadwal";
    return saved;
  });
}

type ReviewListItem = { attemptId: string; assessmentId: string; assessmentTitle: string; type: string; date: string; score: number | null; allowReview: boolean };
type ReviewQuestionDetail = {
  question: string; options: Record<string, string>; correctAnswer: string; explanation: string;
  yourAnswer: string | null; isCorrect: boolean; topic: string; sourceTitle: string | null; sourcePage: number | null;
  type: QuestionType; imageUrl: string | null; yourText: string; keyText: string;
  /** essay not graded yet */ pending: boolean; earned: number | null; points: number; feedback: string | null;
};

// Student-scoped read: RLS already restricts assessment_attempts to the
// caller's own attempts, so this is a safe direct client read.
async function fetchStudentCompletedAttempts(): Promise<ReviewListItem[]> {
  const { data } = await supabase
    .from("assessment_attempts")
    .select("id, assessment_id, score, submitted_at, assessments(title, type, allow_review)")
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false });
  type Row = { id: string; assessment_id: string; score: number | null; submitted_at: string | null; assessments: { title: string; type: string | null; allow_review: boolean } | null };
  return ((data ?? []) as unknown as Row[]).map(r => ({
    attemptId: r.id,
    assessmentId: r.assessment_id,
    assessmentTitle: r.assessments?.title ?? "Asesmen",
    type: r.assessments?.type ?? "Asesmen",
    date: r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-",
    score: r.score ?? null, // null while essays wait for the teacher
    allowReview: r.assessments?.allow_review ?? false,
  }));
}

// Parent-scoped equivalent of fetchStudentCompletedAttempts - relies on the
// "Parents can view linked children attempts" RLS policy
// (supabase/migrations/002_rls_policies.sql) which already restricts this to
// only verified linked children, same trust boundary as the student version.
async function fetchChildCompletedAttempts(studentId: string): Promise<ReviewListItem[]> {
  const { data } = await supabase
    .from("assessment_attempts")
    .select("id, assessment_id, score, submitted_at, assessments(title, type, allow_review)")
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false });
  type Row = { id: string; assessment_id: string; score: number | null; submitted_at: string | null; assessments: { title: string; type: string | null; allow_review: boolean } | null };
  return ((data ?? []) as unknown as Row[]).map(r => ({
    attemptId: r.id,
    assessmentId: r.assessment_id,
    assessmentTitle: r.assessments?.title ?? "Asesmen",
    type: r.assessments?.type ?? "Asesmen",
    date: r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-",
    score: r.score ?? null, // null while essays wait for the teacher
    allowReview: r.assessments?.allow_review ?? false,
  }));
}

type ScoreTrendData = { trend: number[]; labels: string[] };
type SubjectMasteryEntry = { label: string; value: number; tone: "success" | "primary" | "warning" | "neutral" };

// Real replacement for the scoreTrend/subjectMastery mock (both permanently
// empty arrays in src/lib/db). Deliberately reads only assessment_attempts +
// assessments + subjects - tables already proven safe for both a student's
// own session and a parent's linked-child session before this function
// existed. question_attempts/questions would give truer per-topic (rather
// than per-subject) granularity, but neither has a parent-facing RLS policy
// today, and adding cross-table policies is exactly what caused the
// teacher_assignments recursion incident (012/013) - so "Penguasaan Topik"
// here is real per-SUBJECT average score, not fine-grained sub-topic
// accuracy. Flagged rather than silently relabeled.
async function fetchScoreTrendAndSubjectMastery(studentId: string): Promise<{ scoreTrend: ScoreTrendData; subjectMastery: SubjectMasteryEntry[] }> {
  const { data } = await supabase
    .from("assessment_attempts")
    .select("score, submitted_at, assessments(subject_id, subjects(name))")
    .eq("student_id", studentId)
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: true });
  type Row = { score: number | null; submitted_at: string | null; assessments: { subject_id: string; subjects: { name: string } | null } | null };
  const rows = ((data ?? []) as unknown as Row[]).filter(r => r.score != null);

  const recent = rows.slice(-6);
  const scoreTrend: ScoreTrendData = {
    trend: recent.map(r => r.score as number),
    labels: recent.map(r => r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"),
  };

  const bySubject = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const name = r.assessments?.subjects?.name ?? "Umum";
    const cur = bySubject.get(name) ?? { sum: 0, count: 0 };
    cur.sum += r.score as number;
    cur.count += 1;
    bySubject.set(name, cur);
  }
  const subjectMastery: SubjectMasteryEntry[] = [...bySubject.entries()].map(([label, s]) => {
    const value = Math.round(s.sum / s.count);
    return { label, value, tone: value >= 80 ? "success" : value >= 60 ? "primary" : "warning" };
  });

  return { scoreTrend, subjectMastery };
}

// Per-question review detail - only ever returns rows when the assessment's
// allow_review is true, since that's exactly what the "Students can view
// questions for reviewable completed assessments" RLS policy
// (supabase/migrations/009_secure_grading.sql) gates on. When allow_review
// is false the questions SELECT returns nothing and this resolves empty -
// never a client-side correctness comparison.
/** Pembahasan of one attempt via the server (see /api/student/attempt-review); null = failed to load. */
async function fetchAttemptReviewDetail(attemptId: string): Promise<ReviewQuestionDetail[] | null> {
  let data: unknown[] | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/student/attempt-review?attemptId=${encodeURIComponent(attemptId)}`,
      { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
    if (!res.ok) return null;
    data = ((await res.json()) as { items?: unknown[] }).items ?? [];
  } catch {
    return null;
  }
  type QRow = { question: string; options: Record<string, string>; correct_answer: string | null; explanation: string | null; topic: string; source_title: string | null; source_page: number | null; question_type?: string | null; answer_key?: unknown; image_url?: string | null };
  type Row = {
    student_answer: string | null; is_correct: boolean | null; points_earned: number | null; teacher_feedback?: string | null;
    assessment_questions: { question_order: number; points: number; questions: QRow | null } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter(r => r.assessment_questions?.questions);
  rows.sort((a, b) => (a.assessment_questions?.question_order ?? 0) - (b.assessment_questions?.question_order ?? 0));
  return rows.map(r => {
    const q = r.assessment_questions!.questions!;
    const type = questionTypeOf(q);
    return {
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer ?? "",
      explanation: q.explanation ?? "",
      yourAnswer: r.student_answer,
      isCorrect: !!r.is_correct,
      topic: q.topic,
      sourceTitle: q.source_title,
      sourcePage: q.source_page,
      type,
      imageUrl: q.image_url ?? null,
      yourText: describeAnswer(q, r.student_answer),
      keyText: describeKey(q),
      pending: type === "esai" && r.is_correct === null && !!r.student_answer,
      earned: r.points_earned == null ? null : Number(r.points_earned),
      points: Number(r.assessment_questions!.points) || 1,
      feedback: r.teacher_feedback ?? null,
    };
  });
}

// ── Real materials (materials table + 'materials' Storage bucket) ─────────────
// Storage path convention (supabase/migrations/008): {school_id}/{material_id}.{ext}
// - the row is inserted first to get a real id, then the file is uploaded to
// that path, matching the RLS policies already in place (no schema change
// needed here - Phase 1 of the original mock-elimination plan already built
// this table/bucket/RLS, it just wasn't wired into product-app.tsx yet).
type MaterialRow = {
  id: string; title: string; type: string | null; file_url: string | null; file_size: number | null;
  ai_processed: boolean; status: string; class_id: string | null; subject_id: string | null; created_at: string;
  creator_id: string | null;
  // migration 020 - absent on databases that haven't applied it yet
  chapter?: string | null; academic_year?: string | null; publisher?: string | null; source_type?: string | null;
};

// Extends the shared mock Material shape with the real Storage path -
// structurally assignable anywhere a plain Material is expected (MaterialCard
// etc.), while still letting callers that need to download/re-extract the
// file get at file_url without a parallel lookup structure.
type MaterialWithFile = Material & { fileUrl: string | null; academicYear?: string; sourceType?: string; creatorId?: string | null };

function materialRowToMock(row: MaterialRow, className: string | undefined, subjectName: string, questionCount: number): MaterialWithFile {
  return {
    id: row.id,
    title: row.title,
    type: (row.type ?? "Modul Ajar") as MaterialType,
    subject: subjectName,
    classId: row.class_id ?? undefined,
    className,
    uploadedAt: new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    pages: 0,
    status: row.status === "archived" ? "Draf" : "Aktif",
    aiProcessed: row.ai_processed,
    questionsGenerated: questionCount,
    fileUrl: row.file_url,
    chapter: row.chapter ?? undefined,
    publisher: row.publisher ?? undefined,
    academicYear: row.academic_year ?? undefined,
    sourceType: row.source_type ?? undefined,
    creatorId: row.creator_id,
  };
}

// Every materials column except content_text (the cached full text of a
// book can be hundreds of KB - it is only ever read server-side).
const MATERIAL_COLUMNS = "id, title, type, file_url, file_size, ai_processed, status, class_id, subject_id, creator_id, created_at, chapter, academic_year, publisher, source_type";

// Teacher-scoped read: RLS already restricts to the teacher's assigned
// classes. When classId is given, further narrowed to that class + the
// active subject, matching the old mock's per-class-per-subject library
// (materials.subject_id is nullable in the schema, but every material this
// app creates always sets it, same as the old mock always tagged both).
// classId=null means "Semua Kelas" - every class this teacher is assigned
// to, relying on RLS alone (same as the old toggle's full-unfilter view).
async function fetchTeacherMaterials(classId: string | null, subjectId: string | undefined, classNamesById: Map<string, string>, subjectNamesById: Map<string, string>): Promise<MaterialWithFile[]> {
  let query = supabase
    .from("materials")
    .select(MATERIAL_COLUMNS)
    .order("created_at", { ascending: false });
  if (classId) {
    query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as MaterialRow[];
  if (rows.length === 0) return [];

  const { data: qData } = await supabase
    .from("questions")
    .select("source_material_id")
    .in("source_material_id", rows.map(r => r.id));
  const countMap = new Map<string, number>();
  for (const row of (qData ?? []) as Array<{ source_material_id: string | null }>) {
    if (!row.source_material_id) continue;
    countMap.set(row.source_material_id, (countMap.get(row.source_material_id) ?? 0) + 1);
  }
  return rows.map(r => materialRowToMock(
    r,
    r.class_id ? classNamesById.get(r.class_id) : undefined,
    (r.subject_id ? subjectNamesById.get(r.subject_id) : undefined) ?? "Umum",
    countMap.get(r.id) ?? 0,
  ));
}

// Student-scoped read: RLS ("Students can view materials for their class")
// already restricts to the student's own class + school - no classId param
// needed, unfiltered besides status='active' (archived materials disappear
// from the student library, same as the teacher-side archive action).
async function fetchStudentMaterialsReal(): Promise<MaterialWithFile[]> {
  const { data } = await supabase
    .from("materials")
    .select(`${MATERIAL_COLUMNS}, subjects(name)`)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  type Row = MaterialRow & { subjects: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map(r => materialRowToMock(r, undefined, r.subjects?.name ?? "Umum", 0));
}

// PostgREST/Postgres "unknown column" errors - lets inserts keep working
// (minus the new optional fields) on a database where migration 020 hasn't
// been applied yet, instead of failing the whole upload.
function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "PGRST204" || error.code === "42703" || /column .* does not exist|Could not find the '.*' column/i.test(error.message ?? ""));
}

async function insertMaterial(params: {
  schoolId: string; classId: string; subjectId: string; creatorId: string; title: string; type: string;
  chapter?: string; academicYear?: string; publisher?: string; sourceType?: string;
  id?: string; fileUrl?: string; fileSize?: number;
}): Promise<{ id: string } | { error: string }> {
  const base = {
    ...(params.id ? { id: params.id } : {}),
    ...(params.fileUrl ? { file_url: params.fileUrl, file_size: params.fileSize ?? null } : {}),
    school_id: params.schoolId,
    class_id: params.classId,
    subject_id: params.subjectId,
    creator_id: params.creatorId,
    title: params.title,
    type: params.type,
    status: "active",
  };
  const meta = {
    chapter: params.chapter || null,
    academic_year: params.academicYear || null,
    publisher: params.publisher || null,
    source_type: params.sourceType || null,
  };
  let { data, error } = await supabase.from("materials").insert({ ...base, ...meta }).select("id").single();
  if (isMissingColumnError(error)) {
    ({ data, error } = await supabase.from("materials").insert(base).select("id").single());
  }
  if (error || !data) return { error: error?.message ?? "Gagal menyimpan materi" };
  return { id: data.id as string };
}

// Upload first, then create the row: the server hands out a signed upload
// URL (see /api/materials/upload-url for why direct uploads always failed),
// and the materials row is only inserted once the file is really stored -
// so a material can never again exist without its file.
async function uploadNewMaterial(file: File, params: {
  classId: string; subjectId: string; creatorId: string; title: string; type: string;
  chapter?: string; academicYear?: string; publisher?: string; sourceType?: string;
}): Promise<{ id: string; path: string } | { error: string }> {
  const ticket = await apiPost<{ materialId: string; path: string; token: string; schoolId: string }>(
    "/api/materials/upload-url",
    { classId: params.classId, subjectId: params.subjectId, fileName: file.name, fileSize: file.size },
  );
  if (ticket.error || !ticket.token) return { error: ticket.error ?? "Gagal menyiapkan unggahan" };

  const { error: uploadError } = await supabase.storage.from("materials").uploadToSignedUrl(ticket.path, ticket.token, file);
  if (uploadError) return { error: `File gagal diunggah: ${uploadError.message}` };

  const inserted = await insertMaterial({
    ...params, schoolId: ticket.schoolId, id: ticket.materialId, fileUrl: ticket.path, fileSize: file.size,
  });
  if ("error" in inserted) return inserted;
  // Read & cache the material's full text in the background for Tanya AI
  // (a big textbook takes ~40s - better now than while a student waits).
  void apiPost("/api/materials/extract-text", { materialId: inserted.id });
  return { id: inserted.id, path: ticket.path };
}

async function updateMaterialMetadata(id: string, meta: { title: string; type: string; chapter: string; academicYear: string; publisher: string; sourceType: string }): Promise<string | null> {
  const { data, error } = await supabase.from("materials").update({
    title: meta.title,
    type: meta.type,
    chapter: meta.chapter || null,
    academic_year: meta.academicYear || null,
    publisher: meta.publisher || null,
    source_type: meta.sourceType || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id");
  if (isMissingColumnError(error)) return "Kolom metadata belum ada di database. Jalankan migrasi 020 terlebih dahulu.";
  if (error) return error.message;
  // RLS silently filters the UPDATE to zero rows for non-uploaders.
  if (!data || data.length === 0) return "Hanya guru yang mengunggah materi ini yang bisa mengubahnya.";
  return null;
}

async function markMaterialProcessed(materialId: string): Promise<void> {
  await supabase.from("materials").update({ ai_processed: true, ai_processed_at: new Date().toISOString() }).eq("id", materialId);
}

// Downloads go through /api/materials/download-url, which checks access
// and returns a short-lived URL served as an attachment, so the browser
// saves the file instead of navigating away from the app. Returns an error
// message to show, or null on success.
async function downloadMaterialFile(materialId: string): Promise<string | null> {
  const res = await apiPost<{ url: string; fileName: string }>("/api/materials/download-url", { materialId });
  if (res.error || !res.url) return res.error ?? "Gagal mengunduh materi";
  const a = document.createElement("a");
  a.href = res.url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return null;
}

// Publish/save-draft: creates the assessments row, then (for AI-sourced
// questions, which only exist as an ephemeral local array up to this point)
// inserts those questions into the real bank first to get real ids, then
// links the chosen question ids via assessment_questions. Bank-sourced
// selections already have real ids and skip straight to linking.
async function createAssessment(params: {
  schoolId: string; classId: string; subjectId: string; creatorId: string;
  title: string; type: string; durationMinutes: number;
  openAt: string; closeAt: string; status: "draft" | "published";
  distributionMode: "uniform" | "adaptive"; questionCount: number;
  randomizeQuestions?: boolean; randomizeOptions?: boolean; allowReview?: boolean;
  questionSource: "ai" | "bank";
  aiQuestions: typeof questionBank;
  bankQuestionIds: string[];
  /** Points per question, keyed by the id shown in the builder (default 1). */
  points?: Record<string, number>;
}): Promise<{ id: string } | { error: string }> {
  // An assessment without questions is useless to students ("tidak ada
  // soal") - refuse before creating anything.
  if (params.aiQuestions.length + params.bankQuestionIds.length === 0) {
    return { error: "Belum ada soal yang dipilih untuk asesmen ini." };
  }
  const base = {
    school_id: params.schoolId,
    class_id: params.classId,
    subject_id: params.subjectId,
    creator_id: params.creatorId,
    title: params.title,
    type: params.type,
    open_at: params.openAt ? new Date(params.openAt).toISOString() : null,
    close_at: params.closeAt ? new Date(params.closeAt).toISOString() : null,
    duration_minutes: params.durationMinutes,
    status: params.status,
    randomize_questions: params.randomizeQuestions ?? false,
    randomize_options: params.randomizeOptions ?? false,
    allow_review: params.allowReview ?? true,
  };
  let { data: assessmentRow, error } = await supabase.from("assessments").insert({
    ...base,
    distribution_mode: params.distributionMode,
    question_count: params.questionCount,
  }).select("id").single();
  if (isMissingColumnError(error)) {
    if (params.distributionMode === "adaptive") {
      return { error: "Mode adaptif butuh migrasi database 020. Jalankan supabase/migrations/020_form_metadata_and_adaptive_assessments.sql terlebih dahulu." };
    }
    ({ data: assessmentRow, error } = await supabase.from("assessments").insert(base).select("id").single());
  }
  if (error || !assessmentRow) return { error: error?.message ?? "Gagal menyimpan asesmen" };

  let questionIds: string[] = [];
  let pointsList: number[] = [];
  const pointsOf = (id: string) => {
    const v = params.points?.[id];
    return typeof v === "number" && v > 0 ? v : 1;
  };
  // Both sources count: questions picked from the bank AND chosen AI ones
  // (switching tabs in step 2 must not silently drop a selection).
  if (params.aiQuestions.length > 0) {
    pointsList = params.aiQuestions.map(q => pointsOf(q.id));
    const rows = params.aiQuestions.map(q => ({
      school_id: params.schoolId,
      class_id: params.classId,
      subject_id: params.subjectId,
      creator_id: params.creatorId,
      source: "ai_generated" as const,
      topic: q.topic || "Umum",
      subtopic: q.topic || "Umum",
      difficulty: q.difficulty,
      bloom_level: "Menerapkan" as const,
      question: q.question,
      options: q.options,
      correct_answer: (q.questionType ?? "pg") === "pg" ? q.correctAnswer : null,
      explanation: q.explanation,
      status: "active" as const,
      source_title: q.source,
      question_type: q.questionType ?? "pg",
      answer_key: q.answerKey ?? null,
      image_url: q.imageUrl ?? null,
    }));
    const { data: inserted, error: qError } = await supabase.from("questions").insert(rows).select("id");
    if (qError) {
      await supabase.from("assessments").delete().eq("id", assessmentRow.id);
      return { error: `Soal AI gagal disimpan: ${qError.message}` };
    }
    questionIds = (inserted ?? []).map(r => r.id);
    await refreshBankAndReview(params.classId, params.subjectId);
  }
  questionIds = [...questionIds, ...params.bankQuestionIds];
  pointsList = [...pointsList, ...params.bankQuestionIds.map(pointsOf)];

  if (questionIds.length > 0) {
    const aqRows = questionIds.map((qid, i) => ({
      assessment_id: assessmentRow!.id,
      question_id: qid,
      question_order: i + 1,
      points: pointsList[i] ?? 1,
      status: "approved" as const,
    }));
    const { error: linkError } = await supabase.from("assessment_questions").insert(aqRows);
    if (linkError) {
      // Don't leave a published assessment without questions behind.
      await supabase.from("assessments").delete().eq("id", assessmentRow.id);
      return { error: `Soal gagal ditautkan ke asesmen: ${linkError.message}` };
    }
  }

  return { id: assessmentRow.id as string };
}

// ── Completed results store (student answers + scores) ─────────────────────────
type CompletedResult = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  type: string;
  date: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  answers: Record<string, string>;
};
let _resultStoreInit = false;
const _resultStore: { list: CompletedResult[] } = { list: [] };
function initResultStore() {
  if (_resultStoreInit) return;
  _resultStoreInit = true;
  const saved = lsGet<CompletedResult[]>("catchup_results");
  if (saved?.length) _resultStore.list = saved;
}
function saveResult(r: CompletedResult) {
  initResultStore();
  const updated = [r, ..._resultStore.list.filter(x => x.id !== r.id)];
  _resultStore.list = updated;
  lsSet("catchup_results", updated);
}

// ── Incorrect questions store (tagged from completed results) ──────────────────
type StoredIncorrectQ = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  topic: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  date: string;
  options: Record<string, string>;
};
let _incorrectStoreInit = false;
const _incorrectStore: { questions: StoredIncorrectQ[] } = { questions: [] };
function initIncorrectStore() {
  if (_incorrectStoreInit) return;
  _incorrectStoreInit = true;
  const saved = lsGet<StoredIncorrectQ[]>("catchup_incorrect");
  if (saved?.length) _incorrectStore.questions = saved;
}
function saveIncorrectQuestions(qs: StoredIncorrectQ[]) {
  initIncorrectStore();
  const existingIds = new Set(_incorrectStore.questions.map(q => q.id));
  const fresh = qs.filter(q => !existingIds.has(q.id));
  const updated = [...fresh, ..._incorrectStore.questions];
  _incorrectStore.questions = updated;
  lsSet("catchup_incorrect", updated);
}
function deleteIncorrectQuestion(id: string) {
  initIncorrectStore();
  const updated = _incorrectStore.questions.filter(q => q.id !== id);
  _incorrectStore.questions = updated;
  lsSet("catchup_incorrect", updated);
}

// ── Teacher Materials ─────────────────────────────────────────────────────────

const MATERIAL_TYPE_OPTIONS: SelectOption[] = ["Modul Ajar", "Buku Teks", "PPT", "RPP", "LKS", "Ringkasan Materi", "Lainnya"].map(v => ({ value: v, label: v }));
const MATERIAL_SOURCE_OPTIONS: SelectOption[] = ["Buku wajib", "Materi guru", "Internal sekolah", "Lainnya"].map(v => ({ value: v, label: v }));
const MATERIAL_ACCEPT = ".pdf,.docx,.pptx,.txt";
const MATERIAL_MAX_BYTES = 50 * 1024 * 1024;

// Indonesian school years start in July: Oct 2026 -> "2026/2027".
function academicYearOptions(): SelectOption[] {
  const now = new Date();
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [start - 1, start, start + 1].map(y => ({ value: `${y}/${y + 1}`, label: `${y}/${y + 1}` }));
}

function TeacherMaterials() {
  const { teacher, loading: teacherLoading } = useRealTeacherStatus();
  const [activeClass] = useActiveClass();
  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name;
  // The active class may have more than one subject assigned to this
  // teacher (unlike the old single-subject mock assumption) - resolved to
  // the subject actually taught in the active class specifically.
  const activeAssignment = findActiveAssignment(teacher, activeClass);
  const activeSubjectName = activeAssignment?.subjectName ?? "Umum";
  const activeSubjectId = activeAssignment?.subjectId;
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [pageDragOver, setPageDragOver] = useState(false);
  const dragDepth = React.useRef(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // null = still loading (never render "Belum ada materi" before we know)
  const [uploadedMaterials, setUploadedMaterials] = useState<MaterialWithFile[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialWithFile | null>(null);
  const [confirmProcessId, setConfirmProcessId] = useState<string | null>(null);
  const [processCounts, setProcessCounts] = useState<Partial<Record<QuestionType, number>>>({ pg: 5 });
  // A worksheet was detected: offer "Impor soal" instead of AI generation.
  // "Impor soal" asks first what questions without options on the sheet
  // should become. detected = opened because AI generation found a worksheet.
  const [sheetPrompt, setSheetPrompt] = useState<{ id: string; detected: boolean } | null>(null);
  const [importAs, setImportAs] = useState<"pg" | "isian" | "esai">("pg");
  const [importingId, setImportingId] = useState<string | null>(null);
  async function importSheet(id: string, as: "pg" | "isian" | "esai") {
    setSheetPrompt(null);
    setImportingId(id);
    setToast({ message: "Menyalin soal dari lembar soal... (bisa sampai 1-2 menit)", tone: "primary" });
    const res = await apiPost<{ imported?: number; keyFromSheet?: number; keyToCheck?: number; essays?: number; pg?: number; isian?: number }>("/api/teacher/materials/import-questions", { materialId: id, as });
    setImportingId(null);
    if (res.error) { setToast({ message: `Gagal impor soal: ${res.error}`, tone: "primary" }); return; }
    if (activeClass && activeSubjectId) await refreshBankAndReview(activeClass, activeSubjectId);
    const kinds = [res.pg ? `${res.pg} PG` : "", res.isian ? `${res.isian} isian singkat` : "", res.essays ? `${res.essays} esai` : ""].filter(Boolean).join(", ");
    setToast({ message: `${res.imported} soal diimpor ke Tinjau Soal AI (${kinds}). ${res.keyToCheck ? `${res.keyToCheck} kunci dibuat AI - cek dulu sebelum disetujui.` : "Kunci diambil dari lembar."}`, tone: "success" });
  }
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const [editMeta, setEditMeta] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteMaterial, setConfirmDeleteMaterial] = useState<MaterialWithFile | null>(null);
  const [materialQuestions, setMaterialQuestions] = useState<Record<string, typeof questionBank>>({});
  const [generatingMore, setGeneratingMore] = useState<string | null>(null);
  const [metaForm, setMetaForm] = useState({ title: "", type: "Modul Ajar", chapter: "", academicYear: "", publisher: "", sourceType: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const metaValidation = useRequiredFields(metaForm, ["title", "chapter", "academicYear"]);

  // Upload form
  const emptyUploadForm = { classId: "", subjectId: "", chapter: "", academicYear: "", type: "Modul Ajar", publisher: "", sourceType: "" };
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const uploadValidation = useRequiredFields(
    { ...uploadForm, file: uploadedFile ? "ok" : "" },
    ["file", "classId", "subjectId", "chapter", "academicYear"],
  );
  const uploadClassOptions: SelectOption[] = (teacher?.classes ?? []).map(c => ({ value: c.id, label: c.name }));
  const uploadSubjectOptions: SelectOption[] = (teacher?.assignments ?? [])
    .filter(a => a.classId === uploadForm.classId)
    .map(a => ({ value: a.subjectId, label: a.subjectName }));

  function openUpload(file?: File | null) {
    setUploadForm(prev => {
      const classId = prev.classId || activeClass;
      const subjects = (teacher?.assignments ?? []).filter(a => a.classId === classId);
      const subjectId = prev.subjectId && subjects.some(x => x.subjectId === prev.subjectId)
        ? prev.subjectId
        : subjects.length === 1 ? subjects[0].subjectId : "";
      return { ...prev, classId, subjectId };
    });
    if (file !== undefined) pickFile(file);
    setShowUpload(true);
  }

  function closeUpload() {
    setShowUpload(false);
    setUploadedFile(null);
    setFileError(null);
    setUploadForm(emptyUploadForm);
    uploadValidation.reset();
  }

  function pickFile(file: File | null) {
    if (!file) { setUploadedFile(null); return; }
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!MATERIAL_ACCEPT.split(",").includes(ext)) {
      setUploadedFile(null);
      setFileError(ext === ".doc" || ext === ".ppt"
        ? `"${file.name}" memakai format lama ${ext} yang tidak bisa dibaca AI. Simpan ulang sebagai ${ext === ".ppt" ? "PPTX" : "DOCX"} atau PDF.`
        : `"${file.name}" tidak didukung. Gunakan file PDF, DOCX, PPTX, atau TXT.`);
      return;
    }
    if (file.size > MATERIAL_MAX_BYTES) {
      setUploadedFile(null);
      setFileError(`"${file.name}" berukuran ${(file.size / 1024 / 1024).toFixed(0)} MB - batasnya 50 MB. Kompres PDF-nya atau pecah per bab.`);
      return;
    }
    setFileError(null);
    setUploadedFile(file);
  }

  // The whole page is a drop target: dragging a file anywhere over Pustaka
  // Materi shows an overlay, and dropping it opens the upload form with the
  // file already attached.
  const pageDropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setPageDragOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setPageDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setPageDragOver(false);
      openUpload(e.dataTransfer.files[0] ?? null);
    },
  };

  // "Unggah Materi" from the teacher home links here with ?unggah=1 - open
  // the upload form straight away (once the class list is known, so the
  // class/subject defaults are filled in).
  const autoOpenedUpload = React.useRef(false);
  useEffect(() => {
    if (!teacher || autoOpenedUpload.current) return;
    autoOpenedUpload.current = true;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("unggah") === "1") {
        url.searchParams.delete("unggah");
        window.history.replaceState(null, "", url.pathname + url.search);
        openUpload();
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher]);

  const reloadMaterials = React.useCallback(() => {
    if (!teacher) { setUploadedMaterials(teacherLoading ? null : []); return; }
    if (teacher.classes.length === 0) { setUploadedMaterials([]); return; }
    if (!showAllClasses && !activeClass) { setUploadedMaterials(null); return; }
    setUploadedMaterials(null);
    let cancelled = false;
    const classNamesById = new Map(teacher.classes.map(c => [c.id, c.name]));
    const subjectNamesById = new Map(teacher.subjects.map(s => [s.id, s.name]));
    fetchTeacherMaterials(showAllClasses ? null : activeClass, activeSubjectId, classNamesById, subjectNamesById)
      .then(rows => { if (!cancelled) setUploadedMaterials(rows); });
    return () => { cancelled = true; };
  }, [teacher, teacherLoading, activeClass, activeSubjectId, showAllClasses]);

  useEffect(() => reloadMaterials(), [reloadMaterials]);

  // showAllClasses drives reloadMaterials directly (a real re-fetch across
  // every class this teacher is assigned to, RLS-scoped) rather than a
  // client-side filter over an already-fetched list.
  const materialsLoading = uploadedMaterials === null;
  const allMaterials = uploadedMaterials ?? [];

  // Uploader names: only the uploader may edit/delete a material, so
  // everyone else is shown whom to contact.
  const [uploaders, setUploaders] = useState<Record<string, { creatorId: string; name: string }>>({});
  useEffect(() => {
    const missing = (uploadedMaterials ?? []).map(x => x.id).filter(id => !uploaders[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    apiPost<{ uploaders: Record<string, { creatorId: string; name: string }> }>("/api/teacher/materials/uploaders", { materialIds: missing })
      .then(res => { if (!cancelled && res.uploaders) setUploaders(prev => ({ ...prev, ...res.uploaders })); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedMaterials]);
  const uploaderName = (mat: MaterialWithFile) =>
    mat.creatorId && mat.creatorId === teacher?.profileId ? `${teacher?.name ?? "Kamu"} (kamu)` : uploaders[mat.id]?.name ?? "…";
  const isOwnMaterial = (mat: MaterialWithFile) => !!teacher && mat.creatorId === teacher.profileId;

  function handleProcessAI(id: string) {
    setConfirmProcessId(id);
  }

  async function generateQuestionsFromMaterial(
    id: string,
    append = false,
    storagePathOverride?: string,
    matOverride?: { title: string; subject: string },
    target?: { classId: string; subjectId: string },
    types: Array<[QuestionType, number]> = [["pg", 5]],
  ): Promise<number> {
    const mat = matOverride ?? allMaterials.find(m => m.id === id);
    const listMat = allMaterials.find(m => m.id === id);
    // Questions belong to the material's own class+subject, not whatever
    // class happens to be active in the banner right now.
    const targetClassId = target?.classId ?? listMat?.classId ?? activeClass;
    const targetSubjectId = target?.subjectId
      ?? teacher?.assignments.find(x => x.classId === targetClassId && x.subjectName === listMat?.subject)?.subjectId
      ?? activeSubjectId;
    const storagePath = storagePathOverride ?? (mat && "fileUrl" in mat ? (mat as MaterialWithFile).fileUrl ?? undefined : undefined);

    let rawQuestions: PendingRawQuestion[] = [];
    let lastError = "";
    // One request per question type (the server makes one type per call).
    for (const [qType, count] of types) {
      if (count <= 0) continue;
      try {
        const res = await fetch(storagePath ? "/api/extract-and-generate" : "/api/generate-questions", {
          method: "POST",
          headers: await jsonAuthHeaders(),
          body: JSON.stringify(storagePath
            ? { storagePath, fileName: mat?.title ?? "Materi", count, materialTitle: mat?.title ?? "Materi", subject: mat?.subject ?? activeSubjectName, questionType: qType }
            : { materialTitle: mat?.title ?? "Materi", topic: mat?.subject ?? mat?.title ?? "Umum", subject: mat?.subject ?? activeSubjectName, count, difficulty: "Sedang", questionType: qType }),
        });
        const data = await res.json().catch(() => null) as { questions?: PendingRawQuestion[]; error?: string; code?: string } | null;
        if (data?.code === "question_sheet") { setSheetPrompt({ id, detected: true }); return 0; }
        if (data?.questions?.length) rawQuestions = [...rawQuestions, ...data.questions.map(q => ({ ...q, questionType: q.questionType ?? qType }))];
        else lastError = data?.error ?? `Server error (${res.status})`;
        if (res.status === 429) break; // quota gone - the other types would fail too
      } catch {
        lastError = "Gagal menghubungi AI. Periksa koneksi internet.";
      }
    }
    if (!rawQuestions.length && lastError) {
      setToast({ message: `Gagal membuat soal: ${lastError}`, tone: "primary" });
      return 0;
    }

    if (!rawQuestions.length) {
      setToast({ message: "AI tidak menghasilkan soal. Coba lagi.", tone: "primary" });
      return 0;
    }

    const existingCount = materialQuestions[id]?.length ?? 0;
    const generated: typeof questionBank = rawQuestions.map((q, i) => ({
      id: `ai-${id}-${existingCount + i}`,
      question: q.question,
      topic: q.topic ?? "Umum",
      subtopic: q.topic ?? "Umum",
      bloom: "Menerapkan" as const,
      difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty ?? "") ? q.difficulty : "Sedang") as "Mudah" | "Sedang" | "Sulit",
      styleType: "TKA" as const,
      source: mat?.title ?? "AI Generated",
      usageCount: 0,
      successRate: 0,
      status: "Disetujui" as const,
      isLocked: false,
      options: { A: String(q.options.A ?? ""), B: String(q.options.B ?? ""), C: String(q.options.C ?? ""), D: String(q.options.D ?? "") },
      correctAnswer: (["A","B","C","D"].includes(q.correctAnswer ?? "") ? q.correctAnswer : "A") as "A" | "B" | "C" | "D",
      explanation: q.explanation ?? "",
      questionType: q.questionType ?? "pg",
    }));

    setMaterialQuestions(prev => ({ ...prev, [id]: append ? [...(prev[id] ?? []), ...generated] : generated }));

    // Push to the real review queue (status 'pending') - teacher must approve
    // on Tinjau Soal AI before these enter the bank. Linked back to this real
    // material id now that materials are real rows too.
    if (teacher && targetClassId && targetSubjectId) {
      await insertPendingQuestions(rawQuestions, teacher.schoolId, targetClassId, targetSubjectId, teacher.profileId, mat?.title ?? "AI Generated", id);
    }

    const total = (append ? existingCount : 0) + generated.length;
    setToast({ message: `${generated.length} soal baru dari materi ini ditambahkan (total: ${total}).`, tone: "success" });
    return total;
  }

  async function startAIProcess(id: string) {
    setConfirmProcessId(null);
    setProcessingIds(prev => new Set([...prev, id]));
    const count = await generateQuestionsFromMaterial(id, false, undefined, undefined, undefined,
      QUESTION_TYPES.map(t => [t, processCounts[t] ?? 0] as [QuestionType, number]));
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    setProcessedIds(prev => new Set([...prev, id]));
    if (count > 0) {
      await markMaterialProcessed(id);
      setUploadedMaterials(prev => (prev ?? []).map(m => m.id === id ? { ...m, aiProcessed: true, questionsGenerated: count } : m));
    }
  }

  const m = selectedMaterial;
  const isDialogProcessed = m ? (m.aiProcessed || processedIds.has(m.id)) : false;
  const isDialogProcessing = m ? processingIds.has(m.id) : false;

  async function submitUpload() {
    if (!uploadValidation.validate() || !teacher || !uploadedFile) return;
    const { classId, subjectId } = uploadForm;
    const className = teacher.classes.find(c => c.id === classId)?.name;
    const subjectName = teacher.assignments.find(x => x.classId === classId && x.subjectId === subjectId)?.subjectName ?? "Umum";
    setUploading(true);
    const capturedFile = uploadedFile;
    const title = capturedFile.name.replace(/\.[^/.]+$/, "");

    // Upload first; the row is only created once the file is stored.
    const created = await uploadNewMaterial(capturedFile, {
      classId, subjectId, creatorId: teacher.profileId, title,
      type: uploadForm.type || "Modul Ajar",
      chapter: uploadForm.chapter.trim(), academicYear: uploadForm.academicYear,
      publisher: uploadForm.publisher.trim(), sourceType: uploadForm.sourceType,
    });
    if ("error" in created) {
      setToast({ message: `Gagal mengunggah materi: ${created.error}`, tone: "primary" });
      setUploading(false);
      return;
    }
    const matId = created.id;
    const uploadedPath = created.path;

    const newMat: MaterialWithFile = {
      id: matId,
      title,
      type: (uploadForm.type || "Modul Ajar") as MaterialType,
      subject: subjectName,
      classId,
      className,
      chapter: uploadForm.chapter.trim(),
      publisher: uploadForm.publisher.trim() || undefined,
      academicYear: uploadForm.academicYear,
      sourceType: uploadForm.sourceType || undefined,
      uploadedAt: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      pages: 0,
      status: "Diproses",
      aiProcessed: false,
      questionsGenerated: 0,
      fileUrl: uploadedPath,
    };
    // Only show it in the current list if it belongs to the list's scope.
    if (showAllClasses || (classId === activeClass && subjectId === activeSubjectId)) {
      setUploadedMaterials(prev => [newMat, ...(prev ?? [])]);
    }

    closeUpload();
    setUploadedMaterials(prev => (prev ?? []).map(mat => mat.id === matId ? { ...mat, status: "Aktif" as Material["status"] } : mat));
    // No AI on upload (saves quota): the teacher clicks "Proses AI" on the
    // material when they want questions from it.
    setToast({ message: `Materi "${title}" tersimpan. Klik "Proses AI" di kartunya kalau mau dibuatkan soal.`, tone: "success" });
    setUploading(false);
  }

  return (
    <div className="relative space-y-6 min-h-[calc(100dvh-12rem)]" {...pageDropHandlers}>
      {pageDragOver && (
        <div className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-primary/10 backdrop-blur-[1px]">
          <div className="rounded-card border-2 border-dashed border-primary bg-surface px-10 py-8 text-center shadow-xl">
            <Upload className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-[15px] font-bold text-ink">Lepaskan file untuk mengunggah</p>
            <p className="mt-1 text-[12px] text-ink-secondary">PDF, DOCX, PPTX, TXT · Maks. 50 MB</p>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Pustaka Materi"
        title="Manajemen Materi"
        description="Unggah buku teks, PPT, RPP, dan modul ajar. AI mengekstrak soal secara otomatis. Tarik file ke mana saja di halaman ini untuk mengunggah."
        actions={
          <Button variant="default" className="h-8 text-[12px]" disabled={!teacher} onClick={() => showUpload ? closeUpload() : openUpload()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Materi
          </Button>
        }
      />

      {showUpload && (
        <div className="rounded-card border border-primary/30 bg-primary-soft p-6 space-y-5">
          <input ref={fileInputRef} type="file" accept={MATERIAL_ACCEPT} className="hidden"
            onChange={e => { pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />

          <div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-[10px] border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors",
                uploadValidation.errorFor("file") || fileError ? "border-danger bg-danger/5" : "border-primary/30 bg-white hover:border-primary/60",
              )}
            >
              {!uploadedFile && fileError ? (
                // Rejected file: say so inside the drop zone (a small line
                // under it was easy to miss - it looked like nothing happened).
                <div className="flex w-full max-w-lg items-start gap-2 rounded-[8px] border border-danger/30 bg-danger-light px-3 py-2.5 text-left">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div>
                    <div className="text-[13px] font-semibold text-danger">File tidak bisa dipakai</div>
                    <div className="text-[12px] text-ink-secondary">{fileError}</div>
                    <div className="mt-1 text-[11px] font-semibold text-primary">Klik di sini untuk memilih file lain</div>
                  </div>
                </div>
              ) : uploadedFile ? (
                <div className="flex w-full max-w-md items-center gap-2 rounded-[8px] border border-success/30 bg-success-light px-3 py-2 text-left">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-ink truncate">{uploadedFile.name}</div>
                    <div className="text-[10px] text-ink-secondary">{(uploadedFile.size / 1024).toFixed(0)} KB · klik untuk ganti file</div>
                  </div>
                  <button type="button" aria-label="Hapus file" onClick={e => { e.stopPropagation(); setUploadedFile(null); }} className="text-ink-tertiary hover:text-danger shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-ink">Tarik & lepas file di mana saja di halaman ini <span className="text-danger">*</span></p>
                    <p className="text-[12px] text-ink-secondary mt-1">atau klik untuk memilih · PDF, DOCX, PPTX, TXT · Maks. 50 MB</p>
                  </div>
                </>
              )}
            </div>
            {!fileError && uploadValidation.errorFor("file") && (
              <p role="alert" className="mt-1 text-[11px] font-medium text-danger">Tolong pilih file materi terlebih dahulu</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-primary/10 pt-4">
            <FormField label="Kelas" required error={uploadValidation.errorFor("classId")}>
              <SelectField value={uploadForm.classId} options={uploadClassOptions} placeholder="Pilih kelas..."
                invalid={!!uploadValidation.errorFor("classId")}
                onChange={v => {
                  const subjects = (teacher?.assignments ?? []).filter(x => x.classId === v);
                  setUploadForm(p => ({ ...p, classId: v, subjectId: subjects.length === 1 ? subjects[0].subjectId : "" }));
                }} />
            </FormField>
            <FormField label="Mata Pelajaran" required error={uploadValidation.errorFor("subjectId")}>
              <SelectField value={uploadForm.subjectId} options={uploadSubjectOptions}
                placeholder={uploadForm.classId ? "Pilih mata pelajaran..." : "Pilih kelas dulu"}
                emptyText="Kamu belum mengajar mapel di kelas ini"
                disabled={!uploadForm.classId}
                invalid={!!uploadValidation.errorFor("subjectId")}
                onChange={v => setUploadForm(p => ({ ...p, subjectId: v }))} />
            </FormField>
            <FormField label="Bab / Topik" required error={uploadValidation.errorFor("chapter")}>
              <input type="text" placeholder="Contoh: Bab 3 - Perkalian"
                value={uploadForm.chapter} onChange={e => setUploadForm(p => ({ ...p, chapter: e.target.value }))}
                className={fieldClass(!!uploadValidation.errorFor("chapter"), "bg-white")} />
            </FormField>
            <FormField label="Tahun Ajaran" required error={uploadValidation.errorFor("academicYear")}>
              <SelectField value={uploadForm.academicYear} options={academicYearOptions()} placeholder="Pilih tahun ajaran..."
                invalid={!!uploadValidation.errorFor("academicYear")}
                onChange={v => setUploadForm(p => ({ ...p, academicYear: v }))} />
            </FormField>
            <FormField label="Tipe Materi">
              <SelectField value={uploadForm.type} options={MATERIAL_TYPE_OPTIONS}
                onChange={v => setUploadForm(p => ({ ...p, type: v }))} />
            </FormField>
            <FormField label="Sumber (opsional)">
              <SelectField value={uploadForm.sourceType} options={MATERIAL_SOURCE_OPTIONS} placeholder="Pilih sumber..."
                onChange={v => setUploadForm(p => ({ ...p, sourceType: v }))} />
            </FormField>
            <FormField label="Penerbit (opsional)" className="md:col-span-2">
              <input type="text" placeholder="Erlangga, Grafindo, dst."
                value={uploadForm.publisher} onChange={e => setUploadForm(p => ({ ...p, publisher: e.target.value }))}
                className={fieldClass(false, "bg-white")} />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3">
            {uploadValidation.attempted && !uploadValidation.isValid && (
              <span className="mr-auto text-[12px] font-medium text-danger">Tolong lengkapi kolom bertanda * sebelum mengunggah.</span>
            )}
            <Button variant="outline" className="h-8 text-[12px]" onClick={closeUpload} disabled={uploading}>Batal</Button>
            <Button variant="default" className="h-8 text-[12px]" disabled={uploading} onClick={submitUpload}>
              {uploading ? (
                <><span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />Mengunggah...</>
              ) : (
                <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Unggah & Proses AI</>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total materi", value: `${allMaterials.length}`, detail: "Aktif & draf", tone: "neutral" as const },
          { label: "Diproses AI", value: `${allMaterials.filter(mat => mat.aiProcessed || processedIds.has(mat.id)).length}`, detail: "Dari total materi", tone: "success" as const },
          { label: "Soal diekstrak", value: allMaterials.reduce((s, mat) => s + mat.questionsGenerated, 0).toString(), detail: "Siap digunakan", tone: "primary" as const },
          { label: "Menunggu proses", value: `${allMaterials.filter(mat => !mat.aiProcessed && !processedIds.has(mat.id) && mat.status !== "Draf").length}`, detail: "Dalam antrean", tone: "warning" as const },
        ].map(s => <StatCard key={s.label} {...s} value={materialsLoading ? "…" : s.value} />)}
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 gap-3 flex-wrap">
          <h2 className="text-[14px] font-bold text-ink">
            Daftar Materi — {showAllClasses ? "Semua Kelas" : activeClassName ?? "…"} {!materialsLoading && `(${allMaterials.length})`}
          </h2>
          <button
            onClick={() => setShowAllClasses(v => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-[11px] font-semibold transition-colors",
              showAllClasses
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-ink-secondary hover:text-ink"
            )}>
            <Filter className="h-3 w-3" />
            {showAllClasses ? "Semua Kelas" : "Filter Kelas Ini"}
          </button>
        </div>
        <div className="p-4 space-y-3">
          {materialsLoading && <SectionLoading message="Memuat materi..." />}
          {!materialsLoading && allMaterials.length === 0 && (
            <div className="py-8 text-center text-[13px] text-ink-secondary">
              Belum ada materi untuk kelas <span className="font-semibold text-ink">{activeClassName ?? "-"}</span>.
              Tarik file ke halaman ini atau klik Unggah Materi untuk memulai.
            </div>
          )}
          {allMaterials.map(mat => (
            <MaterialCard key={mat.id} title={mat.title} type={mat.type} subject={mat.subject ?? ""} pages={mat.pages}
              uploadedAt={mat.uploadedAt} status={mat.status}
              className={showAllClasses ? mat.className : undefined}
              chapter={mat.chapter}
              aiProcessed={mat.aiProcessed || processedIds.has(mat.id)}
              questionsGenerated={mat.questionsGenerated}
              isProcessing={processingIds.has(mat.id)}
              onClick={() => setSelectedMaterial(mat)}
              onProcessAI={() => handleProcessAI(mat.id)} />
          ))}
        </div>
      </div>

      {/* ── Material Detail Dialog ── */}
      {m && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => { setSelectedMaterial(null); setEditMeta(false); }} />
          <div className="relative w-full max-w-2xl rounded-card border border-border bg-surface shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-border shrink-0">
              <div className="pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary mb-1">{m.type}</p>
                <h2 className="text-[17px] font-bold text-ink leading-snug">{m.title}</h2>
              </div>
              <button onClick={() => { setSelectedMaterial(null); setEditMeta(false); }}
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full hover:bg-background text-ink-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Metadata view / edit */}
              {!editMeta ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: "Mata Pelajaran", value: m.subject },
                    { label: "Kelas", value: m.className ?? "-" },
                    { label: "Bab / Topik", value: m.chapter || "-" },
                    { label: "Tahun Ajaran", value: m.academicYear || "-" },
                    { label: "Tipe Dokumen", value: m.type },
                    { label: "Sumber", value: m.sourceType || "-" },
                    { label: "Penerbit", value: m.publisher || "-" },
                    { label: "Tanggal Unggah", value: m.uploadedAt },
                    { label: "Diunggah oleh", value: uploaderName(m) },
                    { label: "Status", value: m.status },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary mb-0.5">{item.label}</div>
                      <div className="text-[13px] text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Judul Materi" required error={metaValidation.errorFor("title")} className="md:col-span-2">
                    <input type="text" placeholder="Contoh: Buku Matematika Kelas 6" value={metaForm.title} maxLength={200}
                      onChange={e => setMetaForm(p => ({ ...p, title: e.target.value }))}
                      className={fieldClass(!!metaValidation.errorFor("title"))} />
                  </FormField>
                  <FormField label="Bab / Topik" required error={metaValidation.errorFor("chapter")}>
                    <input type="text" placeholder="Contoh: Bab 3 - Perkalian" value={metaForm.chapter}
                      onChange={e => setMetaForm(p => ({ ...p, chapter: e.target.value }))}
                      className={fieldClass(!!metaValidation.errorFor("chapter"))} />
                  </FormField>
                  <FormField label="Tahun Ajaran" required error={metaValidation.errorFor("academicYear")}>
                    <SelectField value={metaForm.academicYear} options={academicYearOptions()} placeholder="Pilih tahun ajaran..."
                      invalid={!!metaValidation.errorFor("academicYear")}
                      onChange={v => setMetaForm(p => ({ ...p, academicYear: v }))} />
                  </FormField>
                  <FormField label="Tipe Materi">
                    <SelectField value={metaForm.type} options={MATERIAL_TYPE_OPTIONS} onChange={v => setMetaForm(p => ({ ...p, type: v }))} />
                  </FormField>
                  <FormField label="Sumber (opsional)">
                    <SelectField value={metaForm.sourceType} options={MATERIAL_SOURCE_OPTIONS} placeholder="Pilih sumber..."
                      onChange={v => setMetaForm(p => ({ ...p, sourceType: v }))} />
                  </FormField>
                  <FormField label="Penerbit (opsional)" className="md:col-span-2">
                    <input type="text" placeholder="Erlangga, Grafindo, dst." value={metaForm.publisher}
                      onChange={e => setMetaForm(p => ({ ...p, publisher: e.target.value }))}
                      className={fieldClass(false)} />
                  </FormField>
                </div>
              )}

              {/* AI Status section */}
              <div className="rounded-[10px] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">Status Pemrosesan AI</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">
                      {isDialogProcessed
                        ? `${materialQuestions[m.id]?.length ?? m.questionsGenerated ?? 0} soal berhasil diekstrak dari materi ini`
                        : isDialogProcessing
                        ? "AI sedang membaca dan menganalisis isi materi..."
                        : "Materi belum dianalisis AI — klik tombol untuk memulai"}
                    </div>
                  </div>
                  {isDialogProcessed ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-[12px] font-semibold text-success">Selesai</span>
                    </div>
                  ) : isDialogProcessing ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                      <span className="text-[12px] font-semibold text-primary">Memproses...</span>
                    </div>
                  ) : (
                    <Button variant="default" className="h-8 text-[12px] shrink-0"
                      onClick={() => handleProcessAI(m.id)}>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />Proses dengan AI
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="text-[11px] text-ink-secondary">File ini lembar soal/kuis? Salin soal-soalnya ke bank soal (tanpa AI mengarang soal baru).</p>
                  <Button variant="outline" className="h-8 text-[12px]" disabled={importingId === m.id} onClick={() => setSheetPrompt({ id: m.id, detected: false })}>
                    {importingId === m.id ? "Mengimpor..." : "Impor soal dari file ini"}
                  </Button>
                </div>
              </div>

              {/* Soal Diekstrak section */}
              {isDialogProcessed && (() => {
                const aiQs = materialQuestions[m.id];
                const displayQs = aiQs ?? [];
                const totalCount = aiQs ? aiQs.length : (m.questionsGenerated || 0);
                const isAiGenerated = !!aiQs;
                const isGenerating = generatingMore === m.id;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] font-bold text-ink">Soal Diekstrak ({totalCount} soal)</div>
                      <span className="text-[10px] text-ink-tertiary">{isAiGenerated ? "Dibuat AI dari isi materi" : `Preview ${Math.min(8, displayQs.length)} soal`}</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {displayQs.map(q => (
                        <div key={q.id} className="flex items-start gap-2 rounded-[8px] border border-border bg-background px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-ink line-clamp-2">{q.question}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
                            <Badge tone="neutral">{q.topic}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="mt-2 h-7 w-full text-[11px]" disabled={isGenerating}
                      onClick={async () => {
                        setGeneratingMore(m.id);
                        await generateQuestionsFromMaterial(m.id, true);
                        setGeneratingMore(null);
                      }}>
                      {isGenerating
                        ? <><span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin mr-1.5" />Membuat soal...</>
                        : <><Sparkles className="mr-1.5 h-3 w-3" />Generate 5 Soal Lagi</>}
                    </Button>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4">
              {!isOwnMaterial(m) ? (
                <p className="mr-4 max-w-[60%] text-[11px] leading-snug text-ink-secondary">
                  Hanya <span className="font-semibold text-ink">{uploaders[m.id]?.name ?? "pengunggah"}</span> yang bisa mengubah atau menghapus materi ini. Hubungi beliau bila ada yang perlu diperbaiki.
                </p>
              ) : (
              <div className="flex items-center gap-4">
              <button onClick={() => setConfirmDeleteMaterial(m)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-danger hover:underline">
                <X className="h-3.5 w-3.5" />Hapus
              </button>
              <button onClick={() => {
                if (!editMeta) {
                  setMetaForm({ title: m.title, type: m.type, chapter: m.chapter ?? "", academicYear: m.academicYear ?? "", publisher: m.publisher ?? "", sourceType: m.sourceType ?? "" });
                  metaValidation.reset();
                }
                setEditMeta(!editMeta);
              }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
                <Pencil className="h-3.5 w-3.5" />
                {editMeta ? "Batalkan" : "Edit Materi"}
              </button>
              </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="h-8 text-[12px]" onClick={() => { setSelectedMaterial(null); setEditMeta(false); }}>Tutup</Button>
                {editMeta
                  ? <Button variant="default" className="h-8 text-[12px]" disabled={savingMeta} onClick={async () => {
                      if (!metaValidation.validate()) return;
                      setSavingMeta(true);
                      const err = await updateMaterialMetadata(m.id, { ...metaForm, title: metaForm.title.trim(), chapter: metaForm.chapter.trim(), publisher: metaForm.publisher.trim() });
                      setSavingMeta(false);
                      if (err) { setToast({ message: `Gagal menyimpan: ${err}`, tone: "primary" }); return; }
                      const patch = { title: metaForm.title.trim(), type: metaForm.type as MaterialType, chapter: metaForm.chapter.trim(), academicYear: metaForm.academicYear, publisher: metaForm.publisher.trim() || undefined, sourceType: metaForm.sourceType || undefined };
                      setUploadedMaterials(prev => (prev ?? []).map(x => x.id === m.id ? { ...x, ...patch } : x));
                      setSelectedMaterial({ ...m, ...patch });
                      setEditMeta(false);
                      setToast({ message: "Perubahan materi tersimpan", tone: "success" });
                    }}>{savingMeta ? "Menyimpan..." : "Simpan Perubahan"}</Button>
                  : <Button variant="outline" className="h-8 text-[12px]" disabled={downloadingId === m.id} onClick={async () => {
                      setDownloadingId(m.id);
                      const err = await downloadMaterialFile(m.id);
                      setDownloadingId(null);
                      if (err) setToast({ message: err, tone: "primary" });
                    }}><Download className="mr-1.5 h-3.5 w-3.5" />{downloadingId === m.id ? "Mengunduh..." : "Unduh"}</Button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteMaterial}
        title="Hapus materi ini?"
        message={`"${confirmDeleteMaterial?.title ?? ""}" dan file-nya akan dihapus permanen, dan siswa tidak bisa melihatnya lagi. Soal yang sudah dibuat dari materi ini tetap ada di bank soal.`}
        confirmLabel="Hapus Materi"
        confirmVariant="danger"
        onConfirm={async () => {
          const target = confirmDeleteMaterial;
          if (!target) return;
          const res = await apiPost("/api/teacher/materials/delete", { materialId: target.id });
          setConfirmDeleteMaterial(null);
          if (res.error) { setToast({ message: `Gagal menghapus: ${res.error}`, tone: "primary" }); return; }
          setUploadedMaterials(prev => (prev ?? []).filter(x => x.id !== target.id));
          setSelectedMaterial(null);
          setEditMeta(false);
          setToast({ message: `Materi "${target.title}" dihapus`, tone: "success" });
        }}
        onCancel={() => setConfirmDeleteMaterial(null)}
      />

      {/* ── AI Process Confirmation ── */}
      {confirmProcessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setConfirmProcessId(null)} />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-[16px] font-bold text-ink">Buat soal dari materi ini</h2>
            <p className="mt-1 text-[12px] text-ink-secondary">Pilih berapa soal tiap jenis. Soal masuk ke Tinjau Soal AI untuk dicek dulu sebelum dipakai.</p>
            <div className="mt-4 space-y-2">
              {QUESTION_TYPES.map(t => (
                <label key={t} className="flex items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3 py-2">
                  <span className="text-[13px] font-medium text-ink">{QUESTION_TYPE_LABEL[t]}</span>
                  <NumberInput value={processCounts[t] ?? 0} min={0} max={10} ariaLabel={`Jumlah soal ${QUESTION_TYPE_LABEL[t]}`}
                    onChange={v => setProcessCounts(p => ({ ...p, [t]: v }))}
                    className="w-16 rounded-[6px] border border-border bg-surface px-2 py-1 text-right text-[13px] text-ink focus:border-primary focus:outline-none" />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-tertiary">Total {Object.values(processCounts).reduce((a, b) => a + (b ?? 0), 0)} soal · maks. 10 per jenis.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmProcessId(null)}>Batal</Button>
              <Button variant="default" size="sm" disabled={Object.values(processCounts).every(v => !v)}
                onClick={() => startAIProcess(confirmProcessId)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />Buat Soal
              </Button>
            </div>
          </div>
        </div>
      )}

      {sheetPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSheetPrompt(null)} />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-[16px] font-bold text-ink">{sheetPrompt.detected ? "Ini lembar soal, bukan materi" : "Impor soal dari file ini"}</h2>
            {sheetPrompt.detected && (
              <p className="mt-2 text-[13px] text-ink-secondary">
                Lembar soal tidak berisi penjelasan, jadi AI tidak bisa memastikan kunci jawaban kalau diminta membuat soal baru dari sini. Lebih aman soal-soalnya disalin.
              </p>
            )}
            <p className="mt-2 text-[13px] text-ink-secondary">
              Soal di file disalin ke <b className="text-ink">Tinjau Soal AI</b>. Soal yang sudah punya pilihan A–E tetap jadi pilihan ganda. Kunci yang tertulis di file dipakai; kalau tidak ada, AI mengerjakan soalnya dan kuncinya ditandai untuk dicek.
            </p>
            <div className="mt-4 text-[12px] font-semibold text-ink">Soal yang tidak punya pilihan dijadikan:</div>
            <div className="mt-2 space-y-2">
              {([
                ["pg", "Pilihan Ganda", "AI membuatkan pilihan A–E (1 benar + 4 pengecoh) dan kuncinya."],
                ["isian", "Isian Singkat", "Jawaban pendek (angka/kata), dinilai otomatis."],
                ["esai", "Esai", "Dinilai guru, dengan contoh jawaban dari file atau dari AI."],
              ] as const).map(([value, label, hint]) => (
                <label key={value} className={cn("flex cursor-pointer gap-2.5 rounded-[8px] border p-3 transition-colors",
                  importAs === value ? "border-primary bg-primary/5" : "border-border hover:bg-background")}>
                  <input type="radio" name="importAs" className="mt-0.5 accent-primary" checked={importAs === value} onChange={() => setImportAs(value)} />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{label}</span>
                    <span className="block text-[11px] text-ink-secondary">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSheetPrompt(null)}>Batal</Button>
              <Button variant="default" size="sm" onClick={() => importSheet(sheetPrompt.id, importAs)}>Impor soal</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Assessment Styles ─────────────────────────────────────────────────

// ── Assessment style templates (assessment_style_templates) ──────────────────
// A teacher's saved configuration for one of the built-in "Gaya Asesmen"
// presets, stored per school (latest save wins). Used by Buat Asesmen to
// prefill jumlah soal/durasi and to set the assessment's randomisation and
// review flags - the only settings the exam engine actually honours.
type StyleConfig = { duration: number; questions: number; randomizeQuestions: boolean; randomizeOptions: boolean; allowReview: boolean };

const BUILTIN_STYLE_DEFAULTS: Record<string, { questions: number; duration: number }> = {
  as1: { questions: 45, duration: 90 },
  as2: { questions: 45, duration: 90 },
  as3: { questions: 40, duration: 75 },
  as4: { questions: 45, duration: 90 },
  as5: { questions: 50, duration: 120 },
  as6: { questions: 40, duration: 90 },
  as7: { questions: 10, duration: 20 },
};

function defaultStyleConfig(styleId: string): StyleConfig {
  const d = BUILTIN_STYLE_DEFAULTS[styleId] ?? { questions: 20, duration: 45 };
  return { duration: d.duration, questions: d.questions, randomizeQuestions: true, randomizeOptions: false, allowReview: true };
}

async function fetchStyleConfig(schoolId: string, styleId: string): Promise<StyleConfig> {
  const style = assessmentStyles.find(x => x.id === styleId);
  if (!style) return defaultStyleConfig(styleId);
  const { data } = await supabase
    .from("assessment_style_templates")
    .select("default_duration_minutes, default_question_count, randomize_questions, randomize_options, allow_review")
    .eq("school_id", schoolId)
    .eq("name", style.name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return defaultStyleConfig(styleId);
  const d = defaultStyleConfig(styleId);
  return {
    duration: data.default_duration_minutes ?? d.duration,
    questions: data.default_question_count ?? d.questions,
    randomizeQuestions: data.randomize_questions,
    randomizeOptions: data.randomize_options,
    allowReview: data.allow_review,
  };
}

async function saveStyleConfig(schoolId: string, creatorId: string, styleId: string, cfg: StyleConfig): Promise<string | null> {
  const style = assessmentStyles.find(x => x.id === styleId);
  if (!style) return "Gaya asesmen tidak ditemukan";
  const { error } = await supabase.from("assessment_style_templates").insert({
    school_id: schoolId,
    created_by: creatorId,
    name: style.name,
    style_type: style.styleType,
    default_duration_minutes: cfg.duration,
    default_question_count: cfg.questions,
    randomize_questions: cfg.randomizeQuestions,
    randomize_options: cfg.randomizeOptions,
    allow_review: cfg.allowReview,
  });
  return error?.message ?? null;
}

function TeacherAssessmentStyles() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUploadPaket, setShowUploadPaket] = useState(false);
  const [paketFile, setPaketFile] = useState<File | null>(null);
  const [paketDragOver, setPaketDragOver] = useState(false);
  const paketFileInputRef = React.useRef<HTMLInputElement>(null);
  const [paketTopic, setPaketTopic] = useState("");
  const [paketDifficulty, setPaketDifficulty] = useState("");
  const [paketNotice, setPaketNotice] = useState<string | null>(null);
  const paketValidation = useRequiredFields(
    { topic: paketTopic, difficulty: paketDifficulty, file: paketFile ? "ok" : "" },
    ["topic", "difficulty", "file"],
  );
  const selected = assessmentStyles.find(a => a.id === selectedId) as AssessmentStyleCorpus | undefined;
  const { teacher } = useRealTeacherStatus();
  const [config, setConfig] = useState<StyleConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configAttempted, setConfigAttempted] = useState(false);
  const [configToast, setConfigToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  // Load the saved configuration whenever a style is opened.
  useEffect(() => {
    setConfig(null);
    setConfigAttempted(false);
    if (!selectedId || !teacher) return;
    let cancelled = false;
    fetchStyleConfig(teacher.schoolId, selectedId).then(c => { if (!cancelled) setConfig(c); });
    return () => { cancelled = true; };
  }, [selectedId, teacher]);

  type ToggleKey = "randomizeQuestions" | "randomizeOptions" | "allowReview";
  function tog(key: ToggleKey) {
    setConfig(prev => prev ? { ...prev, [key]: !prev[key] } : prev);
  }

  const durationErr = config && (!Number.isInteger(config.duration) || config.duration < 1 || config.duration > 600) ? "Isi 1–600 menit" : null;
  const questionsErr = config && (!Number.isInteger(config.questions) || config.questions < 1 || config.questions > 100) ? "Isi 1–100 soal" : null;

  async function saveConfig() {
    setConfigAttempted(true);
    if (!config || !teacher || !selectedId || durationErr || questionsErr) return;
    setConfigSaving(true);
    const err = await saveStyleConfig(teacher.schoolId, teacher.profileId, selectedId, config);
    setConfigSaving(false);
    setConfigToast(err ? { message: `Gagal menyimpan: ${err}`, tone: "danger" } : { message: "Konfigurasi tersimpan dan dipakai di Buat Asesmen", tone: "success" });
  }

  function ConfigRow({ id, label, desc }: { id: ToggleKey; label: string; desc?: string }) {
    const val = !!config?.[id];
    return (
      <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
        <div className="flex-1">
          <div className="text-[12px] font-semibold text-ink">{label}</div>
          {desc && <div className="text-[11px] text-ink-secondary mt-0.5">{desc}</div>}
        </div>
        <button role="switch" aria-checked={val} aria-label={label} onClick={() => tog(id)}
          className={cn("flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
            val ? "border-primary bg-primary" : "border-border bg-border")}>
          <span className={cn("h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
            val ? "translate-x-4" : "translate-x-0.5")} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gaya Asesmen"
        title="Konfigurasi Gaya Asesmen"
        description="Pilih paket soal untuk mengonfigurasi aturan ujian, keamanan, penilaian, dan pengaturan AI."
        actions={
          <Button variant="default" className="h-8 text-[12px]" onClick={() => setShowUploadPaket(!showUploadPaket)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Paket Soal
          </Button>
        }
      />

      {showUploadPaket && (
        <div className="rounded-card border-2 border-dashed border-primary/30 bg-primary-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-ink">Unggah Paket Soal Baru</h3>
            <button onClick={() => setShowUploadPaket(false)} className="text-ink-secondary hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Topik" required error={paketValidation.errorFor("topic")}>
              <input type="text" placeholder="Contoh: Bab 3 - Perkalian"
                value={paketTopic} onChange={e => setPaketTopic(e.target.value)}
                className={fieldClass(!!paketValidation.errorFor("topic"), "bg-white")} />
            </FormField>
            <FormField label="Tingkat Kesulitan" required error={paketValidation.errorFor("difficulty")}>
              <SelectField value={paketDifficulty} placeholder="Pilih kesulitan..."
                options={["Mudah", "Sedang", "Sulit", "Campuran"].map(d => ({ value: d, label: d }))}
                invalid={!!paketValidation.errorFor("difficulty")} onChange={setPaketDifficulty} />
            </FormField>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">File Paket Soal <span className="text-danger">*</span></label>
              <input ref={paketFileInputRef} type="file" accept=".pdf,.docx,.xlsx" className="hidden"
                onChange={e => setPaketFile(e.target.files?.[0] ?? null)} />
              <div
                className={cn("flex items-center gap-3 rounded-[8px] border border-dashed px-4 py-4 text-center transition-colors",
                  paketDragOver ? "border-primary bg-primary/5" : paketValidation.errorFor("file") ? "border-danger bg-danger/5" : "border-primary/40 bg-white")}
                onDragOver={e => { e.preventDefault(); setPaketDragOver(true); }}
                onDragLeave={() => setPaketDragOver(false)}
                onDrop={e => { e.preventDefault(); setPaketDragOver(false); setPaketFile(e.dataTransfer.files[0] ?? null); }}>
                <Upload className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  {paketFile ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span className="text-[12px] font-semibold text-ink truncate">{paketFile.name}</span>
                      <span className="text-[10px] text-ink-secondary shrink-0">{(paketFile.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setPaketFile(null)} className="text-ink-tertiary hover:text-danger ml-auto shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] text-ink-secondary">Tarik file ke sini atau</p>
                      <button onClick={() => paketFileInputRef.current?.click()} className="text-[12px] font-semibold text-primary hover:underline">Pilih File</button>
                      <p className="text-[10px] text-ink-tertiary mt-0.5">PDF, DOCX, XLSX · Maks. 20 MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {paketValidation.errorFor("file") && <p className="text-[11px] font-medium text-danger -mt-2">Tolong pilih file paket soal</p>}
          {paketNotice && <AlertPanel tone="warning" title="Belum tersedia">{paketNotice}</AlertPanel>}
          <div className="flex items-center justify-end gap-2">
            {paketValidation.attempted && !paketValidation.isValid && (
              <span className="mr-auto text-[12px] font-medium text-danger">Tolong lengkapi kolom bertanda *.</span>
            )}
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => { setShowUploadPaket(false); paketValidation.reset(); setPaketNotice(null); }}>Batal</Button>
            <Button variant="default" className="h-8 text-[12px]" onClick={() => {
              if (!paketValidation.validate()) return;
              // No backend for past-paper packages exists yet - say so
              // instead of pretending the upload succeeded.
              setPaketNotice("Penyimpanan paket soal belum didukung server. Untuk sekarang, unggah file soal lewat Pustaka Materi agar AI bisa mengekstrak soalnya.");
            }}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Paket
            </Button>
          </div>
        </div>
      )}

      <AIInsightPanel title="Analisis Tren Topik">
        <p>
          Dari analisis {assessmentStyles.filter(a => a.status === "Aktif").length} paket soal aktif,{" "}
          <strong className="text-ink">Fungsi Kuadrat</strong> dan <strong className="text-ink">Diskriminan</strong>{" "}
          memiliki tren meningkat dalam 3 tahun terakhir. Kemungkinan keluar di TKA 2026 sangat tinggi.
        </p>
      </AIInsightPanel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: style cards (selectable) */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary px-1">
            Paket Soal ({assessmentStyles.length})
          </p>
          {assessmentStyles.map(a => (
            <div key={a.id}
              onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
              className={cn(
                "rounded-card border p-4 cursor-pointer transition-all",
                selectedId === a.id
                  ? "border-primary/40 bg-primary-soft shadow-sm"
                  : "border-border bg-surface hover:border-primary/20 hover:shadow-soft"
              )}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink leading-snug">{a.name}</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">{a.styleType} · {a.year}</div>
                </div>
                <Badge tone={a.status === "Aktif" ? "success" : "neutral"}>{a.status}</Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-ink-secondary">
                <span>{a.papersCount} paket</span>
                <span>·</span>
                <span>{a.questionsCount} soal</span>
              </div>
              {selectedId === a.id && (
                <div className="flex items-center gap-1.5 mt-2 text-primary">
                  <Settings className="h-3 w-3" />
                  <span className="text-[11px] font-semibold">Konfigurasi terbuka di kanan</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: config panel OR topic frequency */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-card border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Konfigurasi: {selected.name}</h3>
                  <p className="text-[11px] text-ink-secondary">{selected.styleType} · {selected.year}</p>
                </div>
                <button onClick={() => setSelectedId(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!config ? <SectionLoading message="Memuat konfigurasi..." /> : (
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-3">Pengaturan Dasar</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Durasi (menit)" required error={configAttempted ? durationErr : null}>
                      <input type="number" min={1} max={600} value={Number.isNaN(config.duration) ? "" : config.duration}
                        onChange={e => setConfig(prev => prev ? { ...prev, duration: e.target.value === "" ? NaN : Number(e.target.value) } : prev)}
                        className={fieldClass(configAttempted && !!durationErr)} />
                    </FormField>
                    <FormField label="Jumlah Soal" required error={configAttempted ? questionsErr : null}>
                      <input type="number" min={1} max={100} value={Number.isNaN(config.questions) ? "" : config.questions}
                        onChange={e => setConfig(prev => prev ? { ...prev, questions: e.target.value === "" ? NaN : Number(e.target.value) } : prev)}
                        className={fieldClass(configAttempted && !!questionsErr)} />
                    </FormField>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-1">Pengerjaan</p>
                  <ConfigRow id="randomizeQuestions" label="Acak urutan soal" desc="Setiap siswa mendapat urutan soal berbeda." />
                  <ConfigRow id="randomizeOptions" label="Acak pilihan jawaban" desc="Urutan opsi A–D diacak per siswa." />
                  <ConfigRow id="allowReview" label="Izinkan pembahasan setelah selesai" desc="Siswa bisa melihat jawaban benar dan pembahasan setelah mengumpulkan." />
                </div>

                <p className="text-[11px] text-ink-secondary">Konfigurasi ini dipakai otomatis saat guru di sekolahmu memilih gaya &quot;{selected.name}&quot; di Buat Asesmen.</p>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-8 text-[12px]" onClick={() => setSelectedId(null)}>Batal</Button>
                  <Button variant="default" className="h-8 text-[12px]" disabled={configSaving} onClick={saveConfig}>{configSaving ? "Menyimpan..." : "Simpan Konfigurasi"}</Button>
                </div>
              </div>
              )}
            </div>
          ) : (
            <div className="rounded-card border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="text-[14px] font-bold text-ink">Frekuensi Topik (3 Tahun Terakhir)</h2>
                <p className="text-[12px] text-ink-secondary mt-0.5">Klik kartu di kiri untuk membuka konfigurasi</p>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                {pastPaperTopics.map(t => (
                  <div key={t.topic} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-ink mb-1">{t.topic}</div>
                      <div className="flex items-end gap-0.5 h-8">
                        {[t.frequency2023, t.frequency2024, t.frequency2025].map((f, i) => (
                          <div key={i} className="flex-1 h-full flex items-end">
                            <div className="w-full rounded-t-sm bg-primary transition-all" style={{ height: `${Math.max(4, (f / 8) * 100)}%` }} />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-0 mt-0.5">
                        {["'23", "'24", "'25"].map(y => (
                          <div key={y} className="flex-1 text-center text-[9px] text-ink-tertiary">{y}</div>
                        ))}
                      </div>
                    </div>
                    <Badge tone={t.trend === "naik" ? "success" : "neutral"}>
                      {t.trend === "naik" ? "↑ Naik" : "→ Stabil"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {configToast && <AppToast message={configToast.message} tone={configToast.tone} onDismiss={() => setConfigToast(null)} />}
    </div>
  );
}

// ── Teacher Question Bank ─────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS: SelectOption[] = ["Mudah", "Sedang", "Sulit"].map(d => ({ value: d, label: d }));
const ANSWER_OPTIONS: SelectOption[] = ["A", "B", "C", "D"].map(o => ({ value: o, label: o }));

const EMPTY_MANUAL_Q = {
  type: "pg", text: "", optA: "", optB: "", optC: "", optD: "", optE: "", correct: "", complex: "",
  // JSON-encoded drafts for Benar/Salah and Menjodohkan (keeps the form flat for useRequiredFields)
  statements: "", pairs: "", rubric: "", keywords: "", accepted: "",
  difficulty: "Sedang", topic: "", explanation: "", imageUrl: "", points: "1",
};

function TeacherQuestionBank() {
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeAssignment = findActiveAssignment(teacher, activeClass);
  const activeSubjectId = activeAssignment?.subjectId;
  const [search, setSearch] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualQ, setManualQ] = useState({ ...EMPTY_MANUAL_Q });
  const [manualError, setManualError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const { bank: bankQs, pending: reviewQs, loading: bankLoading } = useQuestionBank(activeClass, activeSubjectId);
  const reviewCount = reviewQs.length;
  const manualValidation = useRequiredFields(manualQ, manualRequired(manualQ));
  const [savingManual, setSavingManual] = useState(false);
  // Mapel for a new question - defaults to the active one, can be changed in the form.
  const [manualSubjectId, setManualSubjectId] = useState("");
  const manualSubject = manualSubjectId || activeSubjectId || "";
  const manualSubjectOptions: SelectOption[] = (teacher?.assignments ?? [])
    .filter(a => a.classId === activeClass)
    .map(a => ({ value: a.subjectId, label: a.subjectName }));
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(new Set());
  const [detailQ, setDetailQ] = useState<QuestionBankEntry | null>(null);
  const [editQ, setEditQ] = useState<QuestionBankEntry | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  // Bank/review are scoped by subject (real schema has no per-class column on
  // `questions`), so this is now the current class's subject's full bank.
  const classFilteredQs = bankQs;

  const topicOptions = [...new Set(classFilteredQs.map(q => q.topic))].filter(Boolean).sort();
  const typeOptions = QUESTION_TYPES.filter(t => classFilteredQs.some(q => (q.questionType ?? "pg") === t));
  const hasActiveFilters = selectedTopics.size > 0 || selectedTypes.size > 0 || selectedDifficulty !== null;

  function clearFilters() {
    setSelectedTopics(new Set()); setSelectedTypes(new Set()); setSelectedDifficulty(null); setSearch("");
  }

  const filtered = classFilteredQs.filter(q => {
    if (search && !q.question.toLowerCase().includes(search.toLowerCase()) && !q.topic.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTopics.size > 0 && !selectedTopics.has(q.topic)) return false;
    if (selectedTypes.size > 0 && !selectedTypes.has((q.questionType ?? "pg") as QuestionType)) return false;
    if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bank Soal"
        title="Bank Soal Terkurasi"
        description="Soal yang telah disetujui. AI mengekstrak dari materi dan mempelajari gaya asesmen."
        actions={
          <Button variant="default" className="h-8 text-[12px]" onClick={() => setShowManualAdd(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Manual
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total soal", value: `${bankQs.length}`, detail: "Semua status", tone: "neutral" as const },
          { label: "Disetujui", value: `${bankQs.filter(q => q.status === "Disetujui").length}`, detail: "Siap digunakan", tone: "success" as const },
          { label: "Perlu tinjauan", value: `${reviewCount}`, detail: "Menunggu guru", tone: "warning" as const },
          { label: "Rata-rata SR", value: bankQs.length ? `${Math.round(bankQs.reduce((s, q) => s + q.successRate, 0) / bankQs.length)}%` : "—", detail: "Tingkat sukses", tone: "primary" as const },
        ].map(s => <StatCard key={s.label} {...s} value={bankLoading ? "…" : s.value} />)}
      </div>

      <div className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-ink-tertiary" />
        <input
          type="text"
          placeholder="Cari soal atau topik..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-tertiary focus:outline-none"
        />
        {search && <button aria-label="Hapus pencarian" onClick={() => setSearch("")}><X className="h-4 w-4 text-ink-tertiary hover:text-ink" /></button>}
      </div>

      {/* ── Filter chips (only shown when there are questions to filter) ── */}
      {bankQs.length > 0 && (
        <div className="rounded-[10px] border border-border bg-surface p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">Filter Soal</span>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-danger hover:underline">
                <X className="h-3 w-3" />Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-semibold text-ink-tertiary mb-1.5">BAB / TOPIK</div>
              <TopicMultiSelect topics={topicOptions} selected={selectedTopics} onChange={setSelectedTopics}
                counts={Object.fromEntries(topicOptions.map(t => [t, classFilteredQs.filter(q => q.topic === t).length]))} />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-tertiary mb-1.5">TIPE SOAL</div>
              <TopicMultiSelect topics={typeOptions.map(t => QUESTION_TYPE_LABEL[t])} allLabel="Semua tipe" unit="tipe"
                selected={new Set([...selectedTypes].map(t => QUESTION_TYPE_LABEL[t]))}
                onChange={next => setSelectedTypes(new Set(typeOptions.filter(t => next.has(QUESTION_TYPE_LABEL[t]))))}
                counts={Object.fromEntries(typeOptions.map(t => [QUESTION_TYPE_LABEL[t], classFilteredQs.filter(q => (q.questionType ?? "pg") === t).length]))} />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-tertiary mb-1.5">TINGKAT KESULITAN</div>
              <SelectField value={selectedDifficulty ?? ""} onChange={v => setSelectedDifficulty(v || null)}
                options={[{ value: "", label: "Semua tingkat" }, ...(["Mudah", "Sedang", "Sulit"] as const).map(d => ({ value: d, label: d, description: `${classFilteredQs.filter(q => q.difficulty === d).length} soal` }))]} />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="text-[11px] text-ink-secondary pt-1 border-t border-border">
              Menampilkan <span className="font-semibold text-ink">{filtered.length}</span> dari <span className="font-semibold text-ink">{classFilteredQs.length}</span> soal
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {bankLoading && <SectionLoading message="Memuat bank soal..." />}
        {!bankLoading && filtered.map(q => <QuestionBankRow key={q.id} entry={q} onOpen={() => setDetailQ(q)} />)}
        {!bankLoading && filtered.length === 0 && (
          <EmptyState
            icon={Database}
            title={bankQs.length === 0 ? "Bank soal masih kosong" : "Tidak ada soal ditemukan"}
            description={bankQs.length === 0
              ? "Unggah materi di halaman Manajemen Materi lalu proses dengan AI — soal akan otomatis masuk ke sini setelah disetujui."
              : "Tidak ada soal yang cocok dengan filter ini. Coba ubah atau reset filter."}
          />
        )}
      </div>

      {/* Manual Add Dialog */}
      {showManualAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowManualAdd(false)} />
          <div className="relative w-full max-w-2xl rounded-card border border-border bg-surface shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
              <h2 className="text-[14px] font-bold text-ink">Tambah Soal Manual</h2>
              <button onClick={() => { setShowManualAdd(false); setManualQ({ ...EMPTY_MANUAL_Q }); setManualError(""); manualValidation.reset(); }}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <ManualQuestionFields value={manualQ} onChange={setManualQ} errorFor={manualValidation.errorFor} attempted={manualValidation.attempted}
                topicOptions={manualSubject === activeSubjectId ? topicOptions : []}
                subject={{ value: manualSubject, options: manualSubjectOptions, onChange: setManualSubjectId }} />
              {manualError && <p className="text-[12px] text-danger">{manualError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
              <Button variant="outline" size="sm" onClick={() => { setShowManualAdd(false); setManualQ({ ...EMPTY_MANUAL_Q }); setManualError(""); manualValidation.reset(); }}>Batal</Button>
              <Button variant="default" size="sm" disabled={savingManual} onClick={async () => {
                if (!manualValidation.validate() || manualStructureError(manualQ)) { setManualError(manualStructureError(manualQ) ?? "Tolong lengkapi kolom bertanda *."); return; }
                if (!teacher || !activeClass || !manualSubject) { setManualError("Pilih kelas aktif dan mata pelajaran terlebih dahulu."); return; }
                setSavingManual(true);
                const err = await saveManualQToBank(manualQ, teacher.schoolId, activeClass, manualSubject, teacher.profileId);
                // Saved to another mapel: reload the list for the mapel on screen.
                if (!err && activeSubjectId && manualSubject !== activeSubjectId) await refreshBankAndReview(activeClass, activeSubjectId);
                setSavingManual(false);
                if (err) { setManualError(`Gagal menyimpan: ${err}`); return; }
                setShowManualAdd(false);
                setManualQ({ ...EMPTY_MANUAL_Q });
                setManualError("");
                manualValidation.reset();
                setToast({ message: "Soal berhasil ditambahkan ke bank soal", tone: "success" });
              }}>{savingManual ? "Menyimpan..." : "Simpan Soal"}</Button>
            </div>
          </div>
        </div>
      )}

      {detailQ && !editQ && <QuestionDetailDialog q={detailQ} onClose={() => setDetailQ(null)} onEdit={() => setEditQ(detailQ)} />}
      {editQ && (
        <QuestionEditDialog initial={questionToDraft({ question: editQ.question, options: editQ.options as unknown as Record<string, unknown>, correct_answer: editQ.correctAnswer, answer_key: editQ.answerKey, question_type: editQ.questionType, topic: editQ.topic, difficulty: editQ.difficulty, explanation: editQ.explanation, image_url: editQ.imageUrl ?? null, default_points: editQ.defaultPoints ?? 1 })}
          topicOptions={topicOptions}
          onClose={() => setEditQ(null)}
          onSave={async draft => {
            const err = await updateQuestionFromDraft(editQ.id, draft, activeClass, activeSubjectId);
            if (!err) { setDetailQ(null); setToast({ message: "Perubahan soal tersimpan", tone: "success" }); }
            return err;
          }} />
      )}

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// Full view of one bank question: text, picture, every option/statement/pair
// with the key marked, explanation and metadata.
function QuestionDetailDialog({ q, onClose, onEdit }: { q: QuestionBankEntry; onClose: () => void; onEdit?: () => void }) {
  const type = (q.questionType ?? "pg") as QuestionType;
  const raw = { question_type: type, options: q.options as unknown as Record<string, unknown>, correct_answer: q.correctAnswer, answer_key: q.answerKey };
  const letters = (["A", "B", "C", "D", "E"] as const).filter(k => (q.options as Record<string, string | undefined>)[k]);
  const complexKeys = Array.isArray(q.answerKey) ? (q.answerKey as string[]) : [];
  const statements = ((q.options as unknown as { statements?: string[] }).statements) ?? [];
  const tfKey = Array.isArray(q.answerKey) ? (q.answerKey as string[]) : [];
  const match = q.options as unknown as { left?: string[]; right?: string[] };
  const matchKey = Array.isArray(q.answerKey) ? (q.answerKey as number[]) : [];
  const usedRight = new Set(matchKey.map(Number));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-card border border-border bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="primary">{QUESTION_TYPE_LABEL[type]}</Badge>
            <Badge tone="neutral">{q.topic}</Badge>
            <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
            <Badge tone="neutral">{q.defaultPoints ?? 1} poin</Badge>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-secondary hover:bg-background">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="whitespace-pre-line text-[15px] font-medium leading-relaxed text-ink">{q.question}</p>
          {q.imageUrl && (
            <ZoomableImage src={q.imageUrl} alt="Gambar soal" className="max-h-80 rounded-[8px] border border-border object-contain" />
          )}

          {(type === "pg" || type === "pg_kompleks") && (
            <div className="space-y-1.5">
              {letters.map(k => {
                const right = type === "pg" ? q.correctAnswer === k : complexKeys.includes(k);
                return (
                  <div key={k} className={cn("flex items-center gap-2 rounded-[8px] border px-3 py-2", right ? "border-success/30 bg-success-light" : "border-border bg-background")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-bold", type === "pg" ? "rounded-full" : "rounded-[5px]",
                      right ? "bg-success text-white" : "bg-border text-ink-secondary")}>{k}</span>
                    <span className="flex-1 text-[13px] text-ink">{(q.options as Record<string, string>)[k]}</span>
                    {right && <span className="text-[11px] font-semibold text-success">Jawaban benar</span>}
                  </div>
                );
              })}
            </div>
          )}

          {type === "benar_salah" && (
            <div className="overflow-hidden rounded-[8px] border border-border">
              {statements.map((st, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0">
                  <span className="text-[12px] font-semibold text-ink-secondary">{i + 1}.</span>
                  <span className="flex-1 text-[13px] text-ink">{st}</span>
                  <Badge tone={tfKey[i] === "B" ? "success" : "danger"}>{tfKey[i] === "B" ? "Benar" : "Salah"}</Badge>
                </div>
              ))}
            </div>
          )}

          {type === "menjodohkan" && (
            <div className="space-y-1.5">
              {(match.left ?? []).map((l, i) => (
                <div key={i} className="flex items-center gap-2 rounded-[8px] border border-success/30 bg-success-light px-3 py-2 text-[13px] text-ink">
                  <span className="flex-1 font-medium">{l}</span><span className="text-ink-tertiary">→</span>
                  <span className="flex-1">{match.right?.[Number(matchKey[i])] ?? "-"}</span>
                </div>
              ))}
              {(match.right ?? []).map((r, i) => usedRight.has(i) ? null : (
                <div key={`x${i}`} className="flex items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3 py-2 text-[13px] text-ink-secondary">
                  <span className="flex-1 italic">Pengecoh</span><span />
                  <span className="flex-1">{r}</span>
                </div>
              ))}
            </div>
          )}

          {(type === "esai" || type === "isian") && (
            <div className="rounded-[8px] border border-border bg-background p-3 text-[13px] text-ink">
              {type === "isian" && <span className="font-semibold text-success">Jawaban benar: </span>}{describeKey(raw)}
            </div>
          )}

          {q.explanation && (
            <div className="rounded-[8px] border border-border bg-background p-3">
              <div className="mb-1 text-[11px] font-semibold text-ink-secondary">{type === "esai" ? "Contoh jawaban / pembahasan" : "Pembahasan"}</div>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{q.explanation}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-3">
            <div><div className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Sumber</div><div className="text-ink">{q.sourceTitle ? `${q.sourceTitle}${q.sourcePage ? `, hal. ${q.sourcePage}` : ""}` : q.source}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Dipakai</div><div className="text-ink">{q.usageCount}× di asesmen</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Tingkat sukses</div><div className="text-ink">{q.successRate}%</div></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3 shrink-0">
          {onEdit && <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit Soal</Button>}
          <Button variant="default" size="sm" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  );
}

// ── Teacher Question Review ───────────────────────────────────────────────────

function TeacherQuestionReview() {
  const router = useRouter();
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeAssignment = findActiveAssignment(teacher, activeClass);
  const activeSubjectId = activeAssignment?.subjectId;
  const { pending: pendingQs, loading: bankLoading } = useQuestionBank(activeClass, activeSubjectId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typedEdit, setTypedEdit] = useState<PendingQuestion | null>(null);
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" | "danger" } | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<PendingQuestion>>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);

  function setBusy(id: string, on: boolean) {
    setBusyIds(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
  }

  async function approveQuestion(q: PendingQuestion) {
    if (!activeClass || !activeSubjectId || busyIds.has(q.id)) return;
    setBusy(q.id, true);
    const err = await approveBankQuestion({ ...q, ...edits[q.id] }, activeClass, activeSubjectId);
    setBusy(q.id, false);
    setToast(err ? { message: `Gagal menyetujui soal: ${err}`, tone: "danger" } : { message: "Soal disetujui dan masuk ke bank soal", tone: "success" });
  }

  async function rejectQuestion(id: string) {
    if (!activeClass || !activeSubjectId || busyIds.has(id)) return;
    setBusy(id, true);
    const err = await rejectBankQuestion(id, activeClass, activeSubjectId);
    setBusy(id, false);
    setToast(err ? { message: `Gagal menolak soal: ${err}`, tone: "danger" } : { message: "Soal ditolak dan dihapus dari antrian", tone: "danger" });
  }

  const pending = pendingQs;
  const editingQ = pendingQs.find(q => q.id === editingId);
  const editData = editingId ? { ...editingQ, ...edits[editingId] } : null;

  function patchEdit(key: string, val: string) {
    if (!editingId) return;
    setEdits(prev => ({ ...prev, [editingId]: { ...prev[editingId], [key]: val } }));
  }

  const editMissing = editData ? [
    !(editData.question as string)?.trim() && "question",
    !(editData.optionA as string)?.trim() && "optionA",
    !(editData.optionB as string)?.trim() && "optionB",
    !(editData.optionC as string)?.trim() && "optionC",
    !(editData.optionD as string)?.trim() && "optionD",
    !(editData.topic as string)?.trim() && "topic",
  ].filter(Boolean) as string[] : [];
  const [editAttempted, setEditAttempted] = useState(false);
  const editErr = (k: string) => editAttempted && editMissing.includes(k) ? "Wajib diisi" : null;

  function saveEdit() {
    setEditAttempted(true);
    if (editMissing.length > 0) return;
    setEditingId(null);
    setEditAttempted(false);
    setToast({ message: "Perubahan disimpan. Klik Setujui untuk memasukkan ke bank soal.", tone: "success" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tinjau Soal AI"
        title="Tinjauan Soal Baru"
        description="Setujui atau tolak soal AI. Hanya soal yang disetujui masuk ke bank soal."
        actions={
          pending.length > 0 ? (
            <Button variant="success" className="h-8 text-[12px]" disabled={approvingAll}
              onClick={() => setConfirmApproveAll(true)}>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />{approvingAll ? "Menyetujui..." : `Setujui Semua (${pending.length})`}
            </Button>
          ) : undefined
        }
      />

      {bankLoading ? (
        <SectionLoading message="Memuat soal yang menunggu tinjauan..." />
      ) : pending.length > 0 ? (
        <>
          <AlertPanel tone="primary" title={`${pending.length} soal menunggu tinjauan`}>
            Periksa konten, jawaban, dan pembahasan sebelum menyetujui.
          </AlertPanel>
          <div className="grid gap-5 lg:grid-cols-2">
            {pending.map(q => (
              <div key={q.id} className={cn("relative transition-opacity", busyIds.has(q.id) && "pointer-events-none opacity-50")}>
                {needsKeyCheck(q) && (
                  <div className="mb-2 rounded-[8px] border border-warning/40 bg-warning-light px-3 py-2 text-[12px] font-semibold text-warning">
                    ⚠ Diimpor dari lembar soal - kunci jawaban {(q.answerKey as { keySource?: string } | null)?.keySource === "ai" ? "diusulkan AI" : "belum ada"}. Cek / ubah kuncinya lewat Edit sebelum menyetujui.
                  </div>
                )}
                {(q.questionType ?? "pg") === "pg" ? (
                <QuestionReviewCard question={{ ...q, ...edits[q.id] } as PendingQuestion}
                  onApprove={() => approveQuestion({ ...q, ...edits[q.id] } as PendingQuestion)}
                  onReject={() => rejectQuestion(q.id)}
                  onEdit={() => { setEditAttempted(false); setEditingId(q.id); }} />
                ) : (
                  <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <Badge tone="primary">{QUESTION_TYPE_LABEL[q.questionType as QuestionType]}</Badge>
                      <Badge tone="neutral">{q.topic}</Badge>
                      <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
                    </div>
                    <p className="whitespace-pre-line text-[13px] font-medium text-ink">{q.question}</p>
                    {(q.questionType === "pg_kompleks") && (
                      <div className="mt-2 space-y-1">
                        {(["A", "B", "C", "D", "E"] as const).filter(k => q.rawOptions?.[k]).map(k => {
                          const right = Array.isArray(q.answerKey) && (q.answerKey as string[]).includes(k);
                          return (
                            <div key={k} className={cn("rounded-[6px] border px-2.5 py-1.5 text-[12px]", right ? "border-success/30 bg-success-light text-ink" : "border-border bg-background text-ink-secondary")}>
                              <span className="font-bold">{k}.</span> {String(q.rawOptions?.[k])}{right && <span className="ml-1 font-semibold text-success">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.questionType !== "pg_kompleks" && (
                      <p className="mt-2 whitespace-pre-line rounded-[6px] border border-success/20 bg-success-light p-2.5 text-[12px] text-ink">
                        <span className="font-semibold text-success">Kunci: </span>
                        {describeKey({ question_type: q.questionType, options: q.rawOptions ?? {}, correct_answer: null, answer_key: q.answerKey })}
                      </p>
                    )}
                    {q.explanation && <p className="mt-2 text-[12px] text-ink-secondary">{q.explanation}</p>}
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => rejectQuestion(q.id)}>Tolak</Button>
                      <Button variant="outline" size="sm" onClick={() => setTypedEdit(q)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                      <Button variant="success" size="sm" onClick={() => approveQuestion(q)}>Setujui</Button>
                    </div>
                  </div>
                )}
                {busyIds.has(q.id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={CheckCircle2} title="Semua soal sudah ditinjau"
          description="Tidak ada soal menunggu persetujuan. Unggah materi baru untuk soal lebih banyak."
          action={
            <Button variant="default" className="text-[13px]" onClick={() => router.push("/teacher/materials?unggah=1")}>
              <Upload className="mr-2 h-4 w-4" />Unggah Materi
            </Button>
          } />
      )}

      {typedEdit && (
        <QuestionEditDialog title="Edit Soal AI"
          initial={questionToDraft({ question: typedEdit.question, options: typedEdit.rawOptions ?? {}, correct_answer: null, answer_key: typedEdit.answerKey, question_type: typedEdit.questionType, topic: typedEdit.topic, difficulty: typedEdit.difficulty, explanation: typedEdit.explanation })}
          onClose={() => setTypedEdit(null)}
          onSave={draft => updateQuestionFromDraft(typedEdit.id, draft, activeClass, activeSubjectId)} />
      )}

      {/* Edit question dialog */}
      {editingId && editData && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setEditingId(null)} />
          <div className="relative w-full max-w-2xl rounded-card border border-border bg-surface shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
              <h2 className="text-[14px] font-bold text-ink">Edit Soal</h2>
              <button onClick={() => setEditingId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pertanyaan <span className="text-danger">*</span></label>
                <textarea rows={3}
                  value={(editData.question as string) ?? ""}
                  onChange={e => patchEdit("question", e.target.value)}
                  className={fieldClass(!!editErr("question"), "resize-none")} />
                {editErr("question") && <p className="mt-1 text-[11px] font-medium text-danger">{editErr("question")}</p>}
              </div>
              {(["optionA", "optionB", "optionC", "optionD"] as const).map((k, i) => (
                <div key={k}>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">
                    Pilihan {String.fromCharCode(65 + i)} <span className="text-danger">*</span>
                    {(editData.correctAnswer as string) === String.fromCharCode(65 + i) && (
                      <span className="ml-2 text-success">(Kunci Jawaban)</span>
                    )}
                  </label>
                  <input type="text"
                    value={(editData[k] as string) ?? ""}
                    onChange={e => patchEdit(k, e.target.value)}
                    className={fieldClass(!!editErr(k))} />
                  {editErr(k) && <p className="mt-1 text-[11px] font-medium text-danger">{editErr(k)}</p>}
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Kunci Jawaban <span className="text-danger">*</span></label>
                <SelectField value={(editData.correctAnswer as string) ?? "A"}
                  options={["A", "B", "C", "D"].map(o => ({ value: o, label: o }))}
                  onChange={v => patchEdit("correctAnswer", v)} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pembahasan</label>
                <textarea rows={3}
                  value={(editData.explanation as string) ?? ""}
                  onChange={e => patchEdit("explanation", e.target.value)}
                  className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] resize-none focus:border-primary focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Topik <span className="text-danger">*</span></label>
                  <input type="text"
                    value={(editData.topic as string) ?? ""}
                    onChange={e => patchEdit("topic", e.target.value)}
                    className={fieldClass(!!editErr("topic"))} />
                  {editErr("topic") && <p className="mt-1 text-[11px] font-medium text-danger">{editErr("topic")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tingkat Kesulitan</label>
                  <SelectField value={(editData.difficulty as string) ?? "Sedang"}
                    options={DIFFICULTY_OPTIONS}
                    onChange={v => patchEdit("difficulty", v)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Batal</Button>
              <Button variant="default" size="sm" onClick={saveEdit}>Simpan Perubahan</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmApproveAll}
        title="Setujui Semua Soal?"
        message={`${pending.filter(q => !needsKeyCheck(q)).length} soal akan langsung masuk ke bank soal. Tindakan ini tidak dapat dibatalkan.${pending.some(needsKeyCheck) ? ` ${pending.filter(needsKeyCheck).length} soal impor dengan kunci yang belum dicek tidak ikut - setujui satu per satu setelah kuncinya dicek.` : ""}`}
        confirmLabel="Setujui Semua"
        confirmVariant="success"
        onConfirm={async () => {
          setConfirmApproveAll(false);
          if (!activeClass || !activeSubjectId) return;
          // Imported questions whose key wasn't on the sheet must be checked one by one.
          const merged = pending.filter(q => !needsKeyCheck(q)).map(q => ({ ...q, ...edits[q.id] } as PendingQuestion));
          if (!merged.length) { setToast({ message: "Semua soal yang tersisa perlu dicek kuncinya satu per satu.", tone: "danger" }); return; }
          setApprovingAll(true);
          const err = await approveAllBankQuestions(merged, activeClass, activeSubjectId);
          setApprovingAll(false);
          setToast(err
            ? { message: `Gagal menyetujui semua soal: ${err}`, tone: "danger" }
            : { message: `${merged.length} soal disetujui dan masuk ke bank soal`, tone: "success" });
        }}
        onCancel={() => setConfirmApproveAll(false)}
      />

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Assessment Builder ────────────────────────────────────────────────

const ASSESSMENT_TYPE_OPTIONS: SelectOption[] = ["Kuis Guru", "UTS", "UAS", "Tes Diagnostik", "Tryout", "PR"].map(t => ({ value: t, label: t }));
const CUSTOM_STYLE_ID = "custom";

// "YYYY-MM-DDTHH:mm" in local time, for datetime-local min/value attributes.
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TeacherAssessmentBuilder() {
  const { teacher, loading: teacherLoading } = useRealTeacherStatus();
  const [step, setStep] = useState(1);
  const steps = ["Info Dasar", "Materi & Soal", "Jadwal & Publikasi"];
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmSaveDraft, setConfirmSaveDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" | "danger" } | null>(null);
  // Step 1 form fields
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formQuestionCount, setFormQuestionCount] = useState(20);
  const [formDuration, setFormDuration] = useState(45);
  // Step 3 schedule
  const [formOpenAt, setFormOpenAt] = useState("");
  const [formCloseAt, setFormCloseAt] = useState("");
  const [step3Attempted, setStep3Attempted] = useState(false);
  // Step 2 validation error
  const [step2Error, setStep2Error] = useState("");

  // Autofill defaults per style (overridden by the school's saved
  // configuration from Gaya Asesmen, loaded when a style is chosen).
  const styleDefaults = BUILTIN_STYLE_DEFAULTS;
  const [styleFlags, setStyleFlags] = useState({ randomizeQuestions: false, randomizeOptions: false, allowReview: true });
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [aiGenerating, setAiGenerating] = useState(false);
  // How many of each TKA type the AI should make; the rest are plain PG.
  const [aiTypeCounts, setAiTypeCounts] = useState<Record<Exclude<QuestionType, "pg">, number>>({ pg_kompleks: 0, benar_salah: 0, menjodohkan: 0, isian: 0, esai: 0 });
  const aiOtherCount = Object.values(aiTypeCounts).reduce((a, b) => a + b, 0);
  const aiPgCount = Math.max(0, formQuestionCount - aiOtherCount);
  const [showAiTypes, setShowAiTypes] = useState(false);
  // Language of AI questions: null = by subject (Bahasa Inggris -> English).
  const [aiLanguageChoice, setAiLanguageChoice] = useState<QuestionLanguage | null>(null);
  // Editing an AI-made TKA question (not saved yet - edits the list in memory).
  const [aiTypedEdit, setAiTypedEdit] = useState<(typeof questionBank)[number] | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<typeof questionBank>([]);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<typeof questionBank[number] | null>(null);
  const [activeClass] = useActiveClass();
  // null = still loading
  const [materials, setMaterials] = useState<MaterialWithFile[] | null>(null);
  const { bank: bankQs, loading: bankLoading } = useQuestionBank(formClassId || undefined, formSubjectId || undefined);
  const router = useRouter();

  const classOptions: SelectOption[] = (teacher?.classes ?? []).map(c => ({ value: c.id, label: c.name }));
  const subjectOptions: SelectOption[] = (teacher?.assignments ?? [])
    .filter(a => a.classId === formClassId)
    .map(a => ({ value: a.subjectId, label: a.subjectName }));
  const aiLanguage: QuestionLanguage = aiLanguageChoice
    ?? defaultQuestionLanguage(subjectOptions.find(o => o.value === formSubjectId)?.label);

  function chooseClass(classId: string) {
    const subjects = (teacher?.assignments ?? []).filter(a => a.classId === classId);
    setFormClassId(classId);
    setFormSubjectId(prev => subjects.some(x => x.subjectId === prev) ? prev : subjects.length === 1 ? subjects[0].subjectId : "");
  }

  // Default kelas/mapel to the active class once the teacher context loads
  // (both remain freely changeable dropdowns).
  useEffect(() => {
    if (!teacher || formClassId) return;
    const active = findActiveAssignment(teacher, activeClass);
    if (active) { setFormClassId(active.classId); setFormSubjectId(active.subjectId); return; }
    const classId = teacher.classes[0]?.id;
    if (classId) chooseClass(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher, activeClass]);

  // Questions/materials belong to one class+subject: changing either
  // invalidates whatever was picked on step 2.
  useEffect(() => {
    setSelectedQuestions(new Set());
    setSelectedMaterials(new Set());
    setAiGenerated(false);
    setAiGeneratedQuestions([]);
    if (!teacher || !formClassId || !formSubjectId) { setMaterials(teacherLoading ? null : []); return; }
    setMaterials(null);
    let cancelled = false;
    const classNamesById = new Map(teacher.classes.map(c => [c.id, c.name]));
    const subjectNamesById = new Map(teacher.subjects.map(s => [s.id, s.name]));
    fetchTeacherMaterials(formClassId, formSubjectId, classNamesById, subjectNamesById).then(rows => { if (!cancelled) setMaterials(rows); });
    return () => { cancelled = true; };
  }, [teacher, teacherLoading, formClassId, formSubjectId]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  // Points per selected question (default 1) - the score is earned/total points.
  const [questionPoints, setQuestionPoints] = useState<Record<string, number>>({});
  const [bankSearch, setBankSearch] = useState("");
  const [bankTopics, setBankTopics] = useState<Set<string>>(new Set());
  const [bankTypes, setBankTypes] = useState<Set<QuestionType>>(new Set());
  const [bankDifficulty, setBankDifficulty] = useState<"" | "Mudah" | "Sedang" | "Sulit">("");
  const [assessmentType, setAssessmentType] = useState<"uniform" | "adaptive">("uniform");
  const [questionSource, setQuestionSource] = useState<"ai" | "bank">("ai");
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [confirmAddToBank, setConfirmAddToBank] = useState(false);
  // Default "Kustom": count/duration are editable straight away; choosing a
  // preset style is optional.
  const [selectedStyle, setSelectedStyle] = useState<string>(CUSTOM_STYLE_ID);
  const styleIsLocked = !!selectedStyle && !!styleDefaults[selectedStyle];
  const [newQ, setNewQ] = useState({ ...EMPTY_MANUAL_Q });
  const newQValidation = useRequiredFields(newQ, manualRequired(newQ));
  const selectedStyleData = assessmentStyles.find(s => s.id === selectedStyle);
  const styleOptions: SelectOption[] = [
    ...assessmentStyles.map(s => ({ value: s.id, label: s.name, description: `${styleDefaults[s.id]?.questions ?? "-"} soal · ${styleDefaults[s.id]?.duration ?? "-"} menit` })),
    { value: CUSTOM_STYLE_ID, label: "Kustom (atur sendiri)", description: "Jumlah soal & durasi bebas diatur" },
  ];

  // ── Step 1 validation ──
  const step1 = useRequiredFields(
    { title: formTitle, type: formType, classId: formClassId, subjectId: formSubjectId, style: selectedStyle },
    ["title", "type", "classId", "subjectId", "style"],
  );
  const countError = !Number.isInteger(formQuestionCount) || formQuestionCount < 1 ? "Minimal 1 soal" : formQuestionCount > 100 ? "Maksimal 100 soal" : null;
  const durationError = !Number.isInteger(formDuration) || formDuration < 1 ? "Minimal 1 menit" : formDuration > 600 ? "Maksimal 600 menit" : null;
  const step1Valid = step1.isValid && !countError && !durationError;

  // ── Step 2 validation ──
  // Uniform: every student gets exactly N questions. Adaptive: the chosen
  // questions are a pool the server picks N from per student, so the pool
  // must have at least N (more = better personalisation).
  const selectedCount = selectedQuestions.size;
  const step2Message =
    selectedCount === 0 ? "Pilih soal terlebih dahulu."
    : assessmentType === "uniform" && selectedCount !== formQuestionCount
      ? `Harus pilih tepat ${formQuestionCount} soal sesuai jumlah soal. Saat ini: ${selectedCount} soal dipilih.`
    : assessmentType === "adaptive" && selectedCount < formQuestionCount
      ? `Mode adaptif butuh minimal ${formQuestionCount} soal di pool (setiap siswa mendapat ${formQuestionCount}). Saat ini: ${selectedCount} soal dipilih.`
    : "";
  const step2Valid = step2Message === "";

  // ── Step 3 (schedule) validation ──
  const nowMs = Date.now();
  const openMs = formOpenAt ? new Date(formOpenAt).getTime() : NaN;
  const closeMs = formCloseAt ? new Date(formCloseAt).getTime() : NaN;
  const openError = !formOpenAt ? "Wajib diisi"
    : openMs < nowMs - 5 * 60_000 ? "Waktu dibuka tidak boleh di masa lalu"
    : null;
  const closeError = !formCloseAt ? "Wajib diisi"
    : !isNaN(openMs) && closeMs <= openMs ? "Waktu ditutup harus setelah waktu dibuka"
    : !isNaN(openMs) && closeMs - openMs < formDuration * 60_000 ? `Rentang waktu harus minimal ${formDuration} menit (durasi asesmen)`
    : null;
  const step3Valid = !openError && !closeError;

  function goToStep(target: number) {
    if (target <= step) { setStep(target); return; }
    if (!step1Valid) { step1.validate(); setStep(1); return; }
    if (target >= 3 && !step2Valid) { setStep2Error(step2Message); setStep(2); return; }
    setStep2Error("");
    setStep(target);
  }

  async function saveAssessment(status: "draft" | "published") {
    if (!teacher || saving) return;
    if (!step1Valid || !step2Valid || !step3Valid) return;
    setSaving(true);
    // Everything ticked counts, whichever tab is open now.
    const chosenAi = aiGeneratedQuestions.filter(q => selectedQuestions.has(q.id));
    const chosenBankIds = bankQs.filter(q => selectedQuestions.has(q.id)).map(q => q.id);
    if (chosenAi.length + chosenBankIds.length !== selectedQuestions.size) {
      setSaving(false);
      setToast({ message: "Sebagian soal yang dipilih tidak ditemukan lagi (mungkin mapel di langkah 1 diganti). Pilih ulang soalnya di langkah 2.", tone: "danger" });
      setStep(2);
      return;
    }
    const title = formTitle.trim();
    const result = await createAssessment({
      schoolId: teacher.schoolId, classId: formClassId, subjectId: formSubjectId, creatorId: teacher.profileId,
      title, type: formType, durationMinutes: formDuration,
      openAt: formOpenAt, closeAt: formCloseAt, status,
      distributionMode: assessmentType, questionCount: formQuestionCount,
      ...styleFlags,
      questionSource, aiQuestions: chosenAi, bankQuestionIds: chosenBankIds,
      // the question's own score unless changed here
      points: Object.fromEntries([
        ...chosenAi.map(q => [q.id, questionPoints[q.id] ?? 1]),
        ...chosenBankIds.map(id => [id, questionPoints[id] ?? bankQs.find(b => b.id === id)?.defaultPoints ?? 1]),
      ]),
    });
    setSaving(false);
    if ("error" in result) {
      setToast({ message: `${status === "published" ? "Gagal mempublikasikan" : "Gagal menyimpan draf"}: ${result.error}`, tone: "danger" });
      return;
    }
    setToast(status === "published"
      ? { message: `Asesmen "${title}" berhasil dipublikasikan`, tone: "success" }
      : { message: `Draf "${title}" tersimpan`, tone: "primary" });
    setStep(1);
    setFormTitle(""); setFormType(""); setSelectedStyle(CUSTOM_STYLE_ID); setFormOpenAt(""); setFormCloseAt("");
    setStep3Attempted(false); step1.reset();
    setSelectedQuestions(new Set()); setQuestionPoints({}); setAiGeneratedQuestions([]); setAiGenerated(false); setSelectedMaterials(new Set());
  }

  function toggleMaterial(id: string) {
    setSelectedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setAiGenerated(false);
    // The AI list is cleared, so drop its questions from the selection too.
    const oldAi = new Set(aiGeneratedQuestions.map(q => q.id));
    setSelectedQuestions(prev => new Set([...prev].filter(x => !oldAi.has(x))));
    setAiGeneratedQuestions([]);
  }

  // Generates questions in small batches (the server caps each call; one
  // 45-question request ran past the 60s function limit). Materials with a
  // stored file are generated from their actual contents, each batch from a
  // different part of the file, with already-made questions passed along to
  // avoid duplicates. `append` tops up to the target count after a partial run.
  async function generateAI(append = false) {
    if (selectedMaterials.size === 0) return;
    const matList = (materials ?? []).filter(m => selectedMaterials.has(m.id));
    const existing = append ? aiGeneratedQuestions : [];
    const target = Math.max(0, formQuestionCount - existing.length);
    if (target === 0) return;

    setAiGenerating(true);
    // Regenerating replaces the AI questions only - bank picks stay selected.
    if (!append) {
      const oldAi = new Set(aiGeneratedQuestions.map(q => q.id));
      setAiGeneratedQuestions([]);
      setSelectedQuestions(prev => new Set([...prev].filter(id => !oldAi.has(id))));
    }

    type Job = { mat: MaterialWithFile; count: number; segment: number; segments: number; type: QuestionType };
    const jobs: Job[] = [];
    // What is still missing per type (a top-up only makes the missing ones).
    const have = (t: QuestionType) => existing.filter(q => (q.questionType ?? "pg") === t).length;
    const wanted: Array<[QuestionType, number]> = [
      ["pg", Math.max(0, aiPgCount - have("pg"))],
      ...(Object.entries(aiTypeCounts) as Array<[QuestionType, number]>).map(([t, n]) => [t, Math.max(0, n - have(t))] as [QuestionType, number]),
    ];
    for (const [type, total] of wanted) {
      if (total <= 0) continue;
      const BATCH = type === "pg" ? 8 : 5;
      matList.forEach((mat, i) => {
        // Spread each type evenly across materials (first ones take the remainder).
        const share = Math.floor(total / matList.length) + (i < total % matList.length ? 1 : 0);
        const segments = Math.max(1, Math.ceil(share / BATCH));
        for (let k = 0; k < segments; k++) {
          const count = Math.min(BATCH, share - k * BATCH);
          if (count > 0) jobs.push({ mat, count, segment: k, segments, type });
        }
      });
    }

    const generated: typeof questionBank = [...existing];
    let lastError = "";
    let done = 0;
    setAiProgress({ done: 0, total: jobs.length });

    type ApiQ = { question: string; options: Record<string, string>; correctAnswer: string | null; explanation?: string; topic?: string; difficulty?: string; questionType?: QuestionType; answerKey?: unknown };
    async function runJob(job: Job): Promise<void> {
      for (let attempt = 0; attempt < 2; attempt++) {
        const avoid = generated.map(q => q.question);
        const useFile = !!job.mat.fileUrl;
        try {
          const res = await fetch(useFile ? "/api/extract-and-generate" : "/api/generate-questions", {
            method: "POST",
            headers: await jsonAuthHeaders(),
            body: JSON.stringify(useFile
              ? { storagePath: job.mat.fileUrl, fileName: job.mat.title, materialTitle: job.mat.title, subject: job.mat.subject ?? "Umum",
                  count: job.count, segment: job.segment, segments: job.segments, avoid, questionType: job.type, language: aiLanguage }
              : { materialTitle: job.mat.title, topic: job.mat.chapter || job.mat.subject || job.mat.title, subject: job.mat.subject ?? "Umum",
                  count: job.count, difficulty: "Sedang", avoid, questionType: job.type, language: aiLanguage }),
          });
          const data = await res.json().catch(() => null) as { questions?: ApiQ[]; error?: string } | null;
          if (!data) { lastError = res.status === 504 ? "Server AI terlalu lama merespons" : `Server error (${res.status})`; }
          else if (data.questions?.length) {
            for (const q of data.questions) {
              generated.push({
                id: `gen-${job.mat.id}-${Date.now().toString(36)}-${generated.length}`,
                question: q.question,
                topic: q.topic || job.mat.chapter || job.mat.subject || "Umum",
                subtopic: q.topic || "Umum",
                bloom: "Menerapkan" as const,
                difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty ?? "") ? q.difficulty : "Sedang") as "Mudah" | "Sedang" | "Sulit",
                styleType: "TKA" as const,
                source: job.mat.title,
                usageCount: 0,
                successRate: 0,
                status: "Disetujui" as const,
                isLocked: false,
                ...((q.questionType ?? "pg") === "pg"
                  ? {
                      options: { A: q.options.A ?? "", B: q.options.B ?? "", C: q.options.C ?? "", D: q.options.D ?? "" },
                      correctAnswer: (["A", "B", "C", "D"].includes(q.correctAnswer ?? "") ? q.correctAnswer : "A") as "A" | "B" | "C" | "D",
                    }
                  : {
                      // TKA type: options/answerKey in the stored shape; correctAnswer unused
                      options: q.options as unknown as { A: string; B: string; C: string; D: string },
                      correctAnswer: "A" as const,
                      questionType: q.questionType,
                      answerKey: q.answerKey,
                    }),
                explanation: q.explanation ?? "",
              });
            }
            return;
          } else {
            lastError = data.error ?? "AI tidak menghasilkan soal";
            if (res.status === 429 || res.status === 400) return; // quota / unreadable file: retrying won't help
          }
        } catch {
          lastError = "Gagal menghubungi server. Periksa koneksi internet.";
        }
      }
    }

    // Up to 3 batches in flight at once.
    const queue = [...jobs];
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length) {
        const job = queue.shift()!;
        await runJob(job);
        done += 1;
        setAiProgress({ done, total: jobs.length });
        setAiGeneratedQuestions([...generated]);
      }
    }));

    const finalList = generated.slice(0, formQuestionCount);
    setAiGeneratedQuestions(finalList);
    setSelectedQuestions(prev => new Set([...prev, ...finalList.map(q => q.id)]));
    setAiProgress(null);
    setAiGenerating(false);
    setAiGenerated(true);

    if (finalList.length === 0) {
      setToast({ message: `Gagal membuat soal: ${lastError || "AI tidak merespons"}`, tone: "danger" });
    } else if (finalList.length < formQuestionCount) {
      setToast({ message: `Baru ${finalList.length} dari ${formQuestionCount} soal yang berhasil dibuat${lastError ? ` (${lastError})` : ""}. Klik "Lengkapi Soal" untuk mencoba lagi.`, tone: "primary" });
    }
  }

  function toggleQuestion(id: string) {
    setStep2Error("");
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Buat Asesmen" title="Pembuat Asesmen" />

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <button
              onClick={() => goToStep(i + 1)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors",
                step === i + 1 ? "bg-primary text-white" : step > i + 1 ? "bg-success-light text-success" : "bg-background text-ink-secondary border border-border"
              )}
            >
              {step > i + 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              {s}
            </button>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="rounded-card border border-border bg-surface shadow-sm p-6 space-y-5 max-w-2xl">
          <FormField label="Judul Asesmen" required error={step1.errorFor("title")}>
            <input type="text" placeholder="Contoh: Kuis Bab 3 - Perkalian"
              value={formTitle} onChange={e => setFormTitle(e.target.value)}
              className={fieldClass(!!step1.errorFor("title"))} />
          </FormField>
          <FormField label="Tipe Asesmen" required error={step1.errorFor("type")}>
            <SelectField value={formType} options={ASSESSMENT_TYPE_OPTIONS} placeholder="Pilih tipe..."
              invalid={!!step1.errorFor("type")} onChange={setFormType} />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Kelas" required error={step1.errorFor("classId")}>
              <SelectField value={formClassId} options={classOptions} placeholder="Pilih kelas..."
                loading={teacherLoading} emptyText="Kamu belum ditugaskan ke kelas mana pun"
                invalid={!!step1.errorFor("classId")} onChange={chooseClass} />
            </FormField>
            <FormField label="Mata Pelajaran" required error={step1.errorFor("subjectId")}>
              <SelectField value={formSubjectId} options={subjectOptions}
                placeholder={formClassId ? "Pilih mata pelajaran..." : "Pilih kelas dulu"}
                disabled={!formClassId} emptyText="Kamu belum mengajar mapel di kelas ini"
                invalid={!!step1.errorFor("subjectId")} onChange={setFormSubjectId} />
            </FormField>
          </div>

          <FormField label="Gaya Asesmen" required error={step1.errorFor("style")}
            hint={selectedStyleData?.description ?? (selectedStyle === CUSTOM_STYLE_ID ? "Atur jumlah soal dan durasi sendiri di bawah." : undefined)}>
            <SelectField value={selectedStyle} options={styleOptions} placeholder="Pilih gaya asesmen..."
              invalid={!!step1.errorFor("style")}
              onChange={id => {
                setSelectedStyle(id);
                if (styleDefaults[id]) {
                  setFormQuestionCount(styleDefaults[id].questions);
                  setFormDuration(styleDefaults[id].duration);
                  if (teacher) {
                    fetchStyleConfig(teacher.schoolId, id).then(cfg => {
                      setFormQuestionCount(cfg.questions);
                      setFormDuration(cfg.duration);
                      setStyleFlags({ randomizeQuestions: cfg.randomizeQuestions, randomizeOptions: cfg.randomizeOptions, allowReview: cfg.allowReview });
                    });
                  }
                } else {
                  setStyleFlags({ randomizeQuestions: false, randomizeOptions: false, allowReview: true });
                }
              }} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Jumlah Soal" required error={step1.attempted ? countError : null}
              hint={styleIsLocked ? "Otomatis dari gaya asesmen" : undefined}>
              <input type="number" min={1} max={100}
                value={Number.isNaN(formQuestionCount) ? "" : formQuestionCount}
                readOnly={styleIsLocked}
                onChange={e => !styleIsLocked && setFormQuestionCount(e.target.value === "" ? NaN : Number(e.target.value))}
                className={fieldClass(step1.attempted && !!countError, styleIsLocked ? "text-ink-secondary bg-ink/[0.03] cursor-not-allowed" : "")} />
            </FormField>
            <FormField label="Durasi (menit)" required error={step1.attempted ? durationError : null}
              hint={styleIsLocked ? "Otomatis dari gaya asesmen" : undefined}>
              <input type="number" min={1} max={600}
                value={Number.isNaN(formDuration) ? "" : formDuration}
                readOnly={styleIsLocked}
                onChange={e => !styleIsLocked && setFormDuration(e.target.value === "" ? NaN : Number(e.target.value))}
                className={fieldClass(step1.attempted && !!durationError, styleIsLocked ? "text-ink-secondary bg-ink/[0.03] cursor-not-allowed" : "")} />
            </FormField>
          </div>

          {/* Assessment distribution type */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-2">Distribusi Soal ke Siswa *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {([
                { key: "uniform" as const, label: "Sama untuk Semua Siswa", desc: "Setiap siswa mendapat soal yang identik — cocok untuk ujian formal & perbandingan nilai.", icon: Users },
                { key: "adaptive" as const, label: "Adaptif per Siswa", desc: "Soal dipilih otomatis berdasarkan topik lemah tiap siswa — cocok untuk latihan diagnostik.", icon: Zap },
              ]).map(({ key, label, desc, icon: Icon }) => (
                <button key={key} onClick={() => setAssessmentType(key)}
                  className={cn(
                    "flex items-start gap-3 rounded-[10px] border p-3.5 text-left transition-all",
                    assessmentType === key ? "border-primary/40 bg-primary-soft" : "border-border bg-background hover:border-primary/20"
                  )}>
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                    assessmentType === key ? "border-primary bg-primary" : "border-border"
                  )}>
                    {assessmentType === key ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Icon className="h-3.5 w-3.5 text-ink-secondary" />}
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-ink">{label}</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {assessmentType === "adaptive" && (
              <div className="mt-3">
                <AlertPanel tone="primary" title="Mode Adaptif">
                  Di langkah berikutnya, pilih <strong>pool soal</strong> (minimal {Number.isNaN(formQuestionCount) ? "N" : formQuestionCount} soal, lebih banyak lebih baik). Saat siswa mulai mengerjakan, sistem memilih {Number.isNaN(formQuestionCount) ? "N" : formQuestionCount} soal untuk tiap siswa dengan memprioritaskan topik yang paling lemah bagi siswa tersebut — soal tiap siswa bisa berbeda.
                </AlertPanel>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            {step1.attempted && !step1Valid && (
              <span className="mr-auto text-[12px] font-medium text-danger">Tolong lengkapi kolom bertanda * sebelum lanjut.</span>
            )}
            <Button variant="default" className="h-8 text-[12px]" onClick={() => { step1.validate(); if (step1Valid) setStep(2); }}>Lanjut →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {/* What is selected - counts BOTH tabs, all of it is saved */}
          {selectedQuestions.size > 0 && (() => {
            const fromAi = aiGeneratedQuestions.filter(q => selectedQuestions.has(q.id)).length;
            const fromBank = bankQs.filter(q => selectedQuestions.has(q.id)).length;
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-primary/30 bg-primary-soft px-4 py-2.5 text-[12px] text-ink">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-semibold">{selectedQuestions.size} soal dipilih</span>
                <span className="text-ink-secondary">({[fromBank ? `${fromBank} dari Bank Soal` : "", fromAi ? `${fromAi} dari AI` : ""].filter(Boolean).join(" + ")}) · semua ikut tersimpan</span>
                <button type="button" className="ml-auto text-[12px] font-semibold text-danger hover:underline" onClick={() => setSelectedQuestions(new Set())}>Kosongkan pilihan</button>
              </div>
            );
          })()}
          {/* Source tabs */}
          <div className="flex gap-2">
            {([
              { key: "ai" as const, label: "Generate AI dari Materi", icon: Sparkles },
              { key: "bank" as const, label: "Pilih dari Bank Soal", icon: Database },
            ]).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setQuestionSource(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors border",
                  questionSource === key ? "bg-primary text-white border-primary" : "bg-background text-ink-secondary border-border hover:border-primary/30"
                )}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {questionSource === "ai" && <>
            {/* Material selection */}
            <div className="rounded-card border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Pilih Materi Sumber</h3>
                  <p className="text-[11px] text-ink-secondary mt-0.5">AI akan membuat soal gabungan dari materi yang kamu pilih</p>
                </div>
                {selectedMaterials.size > 0 && (
                  <Badge tone="primary">{selectedMaterials.size} dipilih</Badge>
                )}
              </div>
              <div className="p-4 space-y-2">
                {materials === null && <SectionLoading message="Memuat materi..." />}
                {materials !== null && materials.length === 0 && (
                  <div className="rounded-[8px] border border-dashed border-border bg-background p-6 text-center">
                    <p className="text-[12px] text-ink-secondary">Belum ada materi — unggah materi di <button onClick={() => router.push("/teacher/materials?unggah=1")} className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">Pustaka Materi</button> terlebih dahulu.</p>
                  </div>
                )}
                {(materials ?? []).map(mat => {
                  const checked = selectedMaterials.has(mat.id);
                  // Generation reads the file itself: a material doesn't need
                  // "Proses dengan AI" in Pustaka Materi first.
                  return (
                    <div key={mat.id}
                      onClick={() => toggleMaterial(mat.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-[8px] border p-3 transition-all",
                        checked ? "border-primary/40 bg-primary-soft cursor-pointer" :
                        "border-border bg-background hover:border-primary/20 cursor-pointer"
                      )}>
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        checked ? "border-primary bg-primary" : "border-border"
                      )}>
                        {checked && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <BookOpen className="h-4 w-4 shrink-0 text-ink-secondary" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-ink truncate">{mat.title}</div>
                        <div className="text-[10px] text-ink-secondary">{mat.type} · {mat.pages} hal.</div>
                      </div>
                      <div className="shrink-0">
                        {mat.aiProcessed && mat.questionsGenerated > 0 && <Badge tone="success">{mat.questionsGenerated} soal</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border px-5 py-3.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-secondary">
                  {selectedMaterials.size === 0
                    ? "Pilih minimal 1 materi untuk generate soal"
                    : `${selectedMaterials.size} materi dipilih · ${formQuestionCount} soal`}
                </span>
                <div className="flex items-center gap-2">
                  {aiGenerated && !aiGenerating && aiGeneratedQuestions.length > 0 && aiGeneratedQuestions.length < formQuestionCount && (
                    <Button variant="outline" className="h-8 text-[12px]" onClick={() => generateAI(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />Lengkapi Soal ({formQuestionCount - aiGeneratedQuestions.length} lagi)
                    </Button>
                  )}
                  <Button variant="default" className="h-8 text-[12px]"
                    disabled={selectedMaterials.size === 0 || aiGenerating}
                    onClick={() => setShowAiTypes(true)}>
                    {aiGenerating ? (
                      <><span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                        {aiProgress ? `Membuat soal… ${aiGeneratedQuestions.length}/${formQuestionCount}` : "Membuat Soal..."}</>
                    ) : (
                      <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{aiGenerated ? "Generate Ulang" : "Generate Soal AI"}</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Generated questions */}
            {aiGenerated && (
              <div className="rounded-card border border-success/30 bg-surface shadow-sm">
                <div className="flex items-center justify-between border-b border-success/20 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <h3 className="text-[13px] font-bold text-ink">{aiGeneratedQuestions.length} soal berhasil dibuat AI</h3>
                  </div>
                  <Badge tone="primary">{selectedQuestions.size} dipilih</Badge>
                </div>
                <div className="p-4 space-y-3">
                  {aiGeneratedQuestions.map((q, idx) => {
                    const isExpanded = expandedId === q.id;
                    const isEditing = editingId === q.id;
                    const draft = isEditing ? editDraft : null;

                    return (
                      <div key={q.id} className={cn(
                        "rounded-[10px] border transition-all",
                        selectedQuestions.has(q.id) ? "border-primary/40 bg-primary-soft" : "border-border bg-background"
                      )}>
                        {/* Header row */}
                        <div className="flex items-start gap-3 p-3">
                          {/* Checkbox */}
                          <button onClick={() => toggleQuestion(q.id)}
                            className={cn(
                              "flex h-5 w-5 mt-0.5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                              selectedQuestions.has(q.id) ? "border-primary bg-primary" : "border-border hover:border-primary/50"
                            )}>
                            {selectedQuestions.has(q.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </button>

                          {/* Question number + text */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-ink-tertiary mb-0.5">Soal {idx + 1}</div>
                            <div className="text-[13px] font-medium text-ink leading-snug">{q.question}</div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge tone="primary">{q.topic}</Badge>
                              <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
                              {q.questionType && q.questionType !== "pg" && <Badge tone="neutral">{QUESTION_TYPE_LABEL[q.questionType as QuestionType]}</Badge>}
                              {selectedQuestions.has(q.id) && (
                                <PointsInput value={questionPoints[q.id] ?? 1} onChange={v => setQuestionPoints(p => ({ ...p, [q.id]: v }))} />
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {<button
                              title="Edit soal"
                              onClick={() => {
                                if ((q.questionType ?? "pg") !== "pg") { setAiTypedEdit(q); return; }
                                if (isEditing) { setEditingId(null); setEditDraft(null); }
                                else { setEditingId(q.id); setEditDraft({ ...q }); setExpandedId(q.id); }
                              }}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-[6px] border transition-colors",
                                isEditing ? "border-primary bg-primary text-white" : "border-border bg-background text-ink-secondary hover:border-primary/40 hover:text-primary"
                              )}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>}
                            <button
                              title={isExpanded ? "Sembunyikan" : "Lihat pilihan jawaban"}
                              onClick={() => { setExpandedId(isExpanded ? null : q.id); if (isEditing) { setEditingId(null); setEditDraft(null); } }}
                              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border bg-background text-ink-secondary hover:border-primary/40 hover:text-primary transition-colors">
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded ? "rotate-180" : "")} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded: options + answer */}
                        {isExpanded && !isEditing && (q.questionType ?? "pg") !== "pg" && (
                          <div className="border-t border-border px-4 pb-4 pt-3">
                            <p className="whitespace-pre-line text-[12px] text-ink">
                              <span className="font-semibold text-success">Kunci: </span>
                              {describeKey({ question_type: q.questionType, options: q.options as unknown as Record<string, unknown>, correct_answer: null, answer_key: q.answerKey })}
                            </p>
                            {q.explanation && <p className="mt-1.5 text-[12px] text-ink-secondary">{q.explanation}</p>}
                          </div>
                        )}
                        {isExpanded && !isEditing && (q.questionType ?? "pg") === "pg" && (
                          <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                            {(["A","B","C","D"] as const).map(opt => (
                              <div key={opt} className={cn(
                                "flex items-start gap-2.5 rounded-[8px] border px-3 py-2",
                                q.correctAnswer === opt
                                  ? "border-success/40 bg-success/5"
                                  : "border-border bg-background"
                              )}>
                                <span className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5",
                                  q.correctAnswer === opt ? "bg-success text-white" : "bg-border/60 text-ink-secondary"
                                )}>{opt}</span>
                                <span className="text-[12px] text-ink leading-snug flex-1">{q.options[opt]}</span>
                                {q.correctAnswer === opt && (
                                  <span className="text-[10px] font-semibold text-success shrink-0 mt-0.5">✓ Benar</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Edit mode */}
                        {isEditing && draft && (
                          <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-1">Pertanyaan</label>
                              <textarea rows={2} value={draft.question}
                                onChange={e => setEditDraft(p => p ? { ...p, question: e.target.value } : p)}
                                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[12px] resize-none focus:border-primary focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {(["A","B","C","D"] as const).map(opt => (
                                <div key={opt}>
                                  <label className="block text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-1">Opsi {opt}</label>
                                  <input type="text" value={draft.options[opt]}
                                    onChange={e => setEditDraft(p => p ? { ...p, options: { ...p.options, [opt]: e.target.value } } : p)}
                                    className="w-full rounded-[8px] border border-border bg-background px-3 py-1.5 text-[12px] focus:border-primary focus:outline-none" />
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-1">Jawaban Benar</label>
                                <SelectField value={draft.correctAnswer} options={ANSWER_OPTIONS}
                                  onChange={v => setEditDraft(p => p ? { ...p, correctAnswer: v as "A"|"B"|"C"|"D" } : p)} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-1">Topik</label>
                                <input type="text" value={draft.topic}
                                  onChange={e => setEditDraft(p => p ? { ...p, topic: e.target.value } : p)}
                                  className="w-full rounded-[8px] border border-border bg-background px-3 py-1.5 text-[12px] focus:border-primary focus:outline-none" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button variant="outline" className="h-7 text-[11px]" onClick={() => { setEditingId(null); setEditDraft(null); }}>Batal</Button>
                              <Button variant="default" className="h-7 text-[11px]" onClick={() => {
                                if (!draft) return;
                                if (!draft.question.trim() || !draft.topic.trim() || (["A", "B", "C", "D"] as const).some(o => !draft.options[o]?.trim())) {
                                  setToast({ message: "Pertanyaan, topik, dan pilihan A–D wajib diisi.", tone: "danger" });
                                  return;
                                }
                                setAiGeneratedQuestions(prev => prev.map(pq => pq.id === draft.id ? draft : pq));
                                setEditingId(null);
                                setEditDraft(null);
                                setExpandedId(draft.id);
                              }}>Simpan</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>}

          {questionSource === "bank" && (() => {
            const topics = [...new Set(bankQs.map(q => q.topic).filter(Boolean))].sort((x, y) => x.localeCompare(y, "id"));
            const bankTypeOptions = QUESTION_TYPES.filter(t => bankQs.some(q => (q.questionType ?? "pg") === t));
            const q = bankSearch.trim().toLowerCase();
            const visible = bankQs.filter(item =>
              (bankTopics.size === 0 || bankTopics.has(item.topic)) &&
              (bankDifficulty === "" || item.difficulty === bankDifficulty) &&
              (bankTypes.size === 0 || bankTypes.has((item.questionType ?? "pg") as QuestionType)) &&
              (!q || item.question.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q)));
            const allVisibleSelected = visible.length > 0 && visible.every(item => selectedQuestions.has(item.id));
            const subjectName = subjectOptions.find(o => o.value === formSubjectId)?.label ?? "";
            const target = formQuestionCount;
            return (
            <div className="rounded-card border border-border bg-surface shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div>
                  <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                    Bank Soal {subjectName && <SubjectBadge subject={subjectName} size="sm" />}
                  </h3>
                  <p className="text-[12px] text-ink-secondary mt-0.5">
                    Soal yang sudah disetujui untuk kelas & mapel ini. Ganti mapel di langkah 1.
                  </p>
                </div>
                <Button variant="outline" className="h-8 text-[12px]" onClick={() => setShowAddQuestion(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Soal Baru
                </Button>
              </div>

              {bankQs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-5 py-3">
                  <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-1.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
                    <input value={bankSearch} onChange={e => setBankSearch(e.target.value)} placeholder="Cari isi soal atau topik..."
                      className="flex-1 bg-transparent text-[13px] placeholder:text-ink-tertiary focus:outline-none" />
                    {bankSearch && <button type="button" aria-label="Hapus pencarian" onClick={() => setBankSearch("")}><X className="h-3.5 w-3.5 text-ink-tertiary" /></button>}
                  </div>
                  <div className="w-52">
                    <TopicMultiSelect topics={topics} selected={bankTopics} onChange={setBankTopics}
                      counts={Object.fromEntries(topics.map(t => [t, bankQs.filter(x => x.topic === t).length]))} />
                  </div>
                  <div className="w-44">
                    <TopicMultiSelect topics={bankTypeOptions.map(t => QUESTION_TYPE_LABEL[t])} allLabel="Semua tipe" unit="tipe"
                      selected={new Set([...bankTypes].map(t => QUESTION_TYPE_LABEL[t]))}
                      onChange={next => setBankTypes(new Set(bankTypeOptions.filter(t => next.has(QUESTION_TYPE_LABEL[t]))))} />
                  </div>
                  <div className="w-40">
                    <SelectField value={bankDifficulty} onChange={v => setBankDifficulty(v as typeof bankDifficulty)}
                      options={[{ value: "", label: "Semua tingkat" }, { value: "Mudah", label: "Mudah" }, { value: "Sedang", label: "Sedang" }, { value: "Sulit", label: "Sulit" }]} />
                  </div>
                </div>
              )}

              <div className="max-h-[520px] overflow-y-auto p-4 space-y-2">
                {bankLoading && <SectionLoading message="Memuat bank soal..." />}
                {!bankLoading && bankQs.length === 0 && (
                  <EmptyState icon={Database} title="Bank soal kosong" description="Unggah materi lalu proses dengan AI, atau klik Tambah Soal Baru." />
                )}
                {!bankLoading && bankQs.length > 0 && visible.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-ink-secondary">Tidak ada soal yang cocok dengan filter ini.</p>
                )}
                {!bankLoading && visible.map(item => (
                  <div key={item.id} onClick={() => toggleQuestion(item.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-[8px] border p-3 cursor-pointer transition-all",
                      selectedQuestions.has(item.id) ? "border-primary/40 bg-primary-soft" : "border-border bg-background hover:border-primary/20"
                    )}>
                    <div className={cn(
                      "flex h-4 w-4 mt-0.5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      selectedQuestions.has(item.id) ? "border-primary bg-primary" : "border-border"
                    )}>
                      {selectedQuestions.has(item.id) && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink line-clamp-2">{item.question}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge tone="neutral">{item.topic}</Badge>
                        <Badge tone={item.difficulty === "Mudah" ? "success" : item.difficulty === "Sedang" ? "warning" : "danger"}>{item.difficulty}</Badge>
                        {item.questionType && item.questionType !== "pg" && <Badge tone="primary">{QUESTION_TYPE_LABEL[item.questionType as QuestionType] ?? item.questionType}</Badge>}
                        {item.imageUrl && <Badge tone="neutral">🖼 Gambar</Badge>}
                        {selectedQuestions.has(item.id) && (
                          <PointsInput value={questionPoints[item.id] ?? item.defaultPoints ?? 1} onChange={v => setQuestionPoints(p => ({ ...p, [item.id]: v }))} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                <button type="button" disabled={visible.length === 0} onClick={() => {
                  setStep2Error("");
                  setSelectedQuestions(prev => {
                    const next = new Set(prev);
                    for (const item of visible) { if (allVisibleSelected) next.delete(item.id); else next.add(item.id); }
                    return next;
                  });
                }} className="text-[12px] font-semibold text-primary hover:underline disabled:opacity-40">
                  {allVisibleSelected ? `Batalkan ${visible.length} yang tampil` : `Pilih semua yang tampil (${visible.length})`}
                </button>
                <span className={cn("text-[12px] font-semibold",
                  assessmentType === "uniform" ? (selectedCount === target ? "text-success" : selectedCount > target ? "text-danger" : "text-ink-secondary")
                    : selectedCount >= target ? "text-success" : "text-ink-secondary")}>
                  {selectedCount} dipilih · {assessmentType === "uniform" ? `butuh tepat ${target}` : `minimal ${target}`}
                  {selectedQuestions.size > 0 && (
                    <button type="button" onClick={() => setSelectedQuestions(new Set())} className="ml-2 font-normal text-ink-tertiary underline hover:text-danger">kosongkan</button>
                  )}
                </span>
              </div>
            </div>
            );
          })()}

          {/* Add question dialog */}
          {showAddQuestion && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowAddQuestion(false)} />
              <div className="relative w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-ink">Tambah Soal ke Bank Soal</h2>
                  <button onClick={() => setShowAddQuestion(false)} className="text-ink-secondary hover:text-ink"><X className="h-4 w-4" /></button>
                </div>
                <ManualQuestionFields value={newQ} onChange={setNewQ} errorFor={newQValidation.errorFor} attempted={newQValidation.attempted}
                  topicOptions={bankQs.map(q => q.topic)}
                  subject={{ value: formSubjectId, options: subjectOptions }} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-8 text-[12px]" onClick={() => { setShowAddQuestion(false); setNewQ({ ...EMPTY_MANUAL_Q }); newQValidation.reset(); }}>Batal</Button>
                  <Button variant="default" className="h-8 text-[12px]" onClick={() => { if (!newQValidation.validate() || manualStructureError(newQ)) return; setShowAddQuestion(false); setConfirmAddToBank(true); }}>
                    Simpan ke Bank Soal
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showAiTypes && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowAiTypes(false)} />
              <div className="relative w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl">
                <h2 className="text-[16px] font-bold text-ink">Jenis soal yang dibuat AI</h2>
                <p className="mt-1 text-[12px] text-ink-secondary">
                  {formQuestionCount} soal dari {selectedMaterials.size} materi. Isi jumlah untuk tiap jenis; sisanya dibuat sebagai Pilihan Ganda.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-[8px] border border-border bg-background px-3 py-2">
                    <span className="text-[13px] font-medium text-ink">Pilihan Ganda <span className="text-[11px] text-ink-tertiary">(otomatis)</span></span>
                    <span className="w-16 text-right text-[14px] font-bold text-ink">{aiPgCount}</span>
                  </div>
                  {(Object.keys(aiTypeCounts) as Array<keyof typeof aiTypeCounts>).map(t => {
                    const others = aiOtherCount - aiTypeCounts[t];
                    return (
                      <label key={t} className="flex items-center justify-between gap-3 rounded-[8px] border border-border bg-background px-3 py-2">
                        <span className="text-[13px] font-medium text-ink">{QUESTION_TYPE_LABEL[t]}</span>
                        <NumberInput value={aiTypeCounts[t]} min={0} max={Math.max(0, formQuestionCount - others)} ariaLabel={`Jumlah soal ${QUESTION_TYPE_LABEL[t]}`}
                          onChange={v => setAiTypeCounts(p => ({ ...p, [t]: v }))}
                          className="w-16 rounded-[6px] border border-border bg-surface px-2 py-1 text-right text-[13px] text-ink focus:border-primary focus:outline-none" />
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <div className="text-[12px] font-semibold text-ink">Bahasa soal</div>
                  <div className="mt-1.5 flex gap-2">
                    {([["id", "Bahasa Indonesia"], ["en", "English (Bahasa Inggris)"]] as const).map(([v, label]) => (
                      <button key={v} type="button" onClick={() => setAiLanguageChoice(v)}
                        className={cn("flex-1 rounded-[8px] border px-3 py-2 text-[12px] font-semibold transition-colors",
                          aiLanguage === v ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-ink-secondary hover:border-primary/30")}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {aiLanguage === "en" && <p className="mt-1 text-[11px] text-ink-tertiary">Pertanyaan, pilihan, pembahasan, dan topik semuanya ditulis dalam bahasa Inggris.</p>}
                </div>
                <p className="mt-2 text-[11px] text-ink-tertiary">Total {formQuestionCount} soal (ubah jumlahnya di langkah 1). Semua soal bisa dicek dan diedit setelah dibuat.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAiTypes(false)}>Batal</Button>
                  <Button variant="default" size="sm" onClick={() => { setShowAiTypes(false); generateAI(false); }}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />Buat {formQuestionCount} Soal
                  </Button>
                </div>
              </div>
            </div>
          )}

          {aiTypedEdit && (
            <QuestionEditDialog title="Edit Soal AI"
              initial={questionToDraft({ question: aiTypedEdit.question, options: aiTypedEdit.options as unknown as Record<string, unknown>, correct_answer: null, answer_key: aiTypedEdit.answerKey, question_type: aiTypedEdit.questionType, topic: aiTypedEdit.topic, difficulty: aiTypedEdit.difficulty, explanation: aiTypedEdit.explanation, image_url: aiTypedEdit.imageUrl ?? null })}
              topicOptions={bankQs.map(b => b.topic)}
              onClose={() => setAiTypedEdit(null)}
              onSave={async draft => {
                const f = draftToQuestionFields(draft);
                setAiGeneratedQuestions(prev => prev.map(x => x.id !== aiTypedEdit.id ? x : {
                  ...x, question: f.question, topic: f.topic, subtopic: f.topic, difficulty: f.difficulty, explanation: f.explanation,
                  questionType: f.question_type, answerKey: f.answer_key, imageUrl: f.image_url,
                  options: f.options as unknown as typeof x.options,
                  correctAnswer: ((f.correct_answer ?? "A") as typeof x.correctAnswer),
                }));
                return null;
              }} />
          )}

          <ConfirmDialog
            open={confirmAddToBank}
            title="Tambahkan ke Bank Soal?"
            message="Soal ini akan disimpan permanen ke bank soal dan dapat digunakan pada asesmen lainnya. Apakah kamu yakin?"
            confirmLabel="Ya, Tambahkan"
            confirmVariant="default"
            onConfirm={async () => {
              setConfirmAddToBank(false);
              if (!teacher || !formClassId || !formSubjectId) { setToast({ message: "Pilih kelas dan mapel di langkah 1.", tone: "danger" }); return; }
              const err = await saveManualQToBank(newQ, teacher.schoolId, formClassId, formSubjectId, teacher.profileId);
              if (err) { setToast({ message: `Gagal menyimpan soal: ${err}`, tone: "danger" }); setShowAddQuestion(true); return; }
              setNewQ({ ...EMPTY_MANUAL_Q });
              newQValidation.reset();
              setToast({ message: "Soal berhasil ditambahkan ke bank soal", tone: "success" });
            }}
            onCancel={() => setConfirmAddToBank(false)}
          />

          {step2Error && (
            <p className="text-[12px] text-danger bg-danger/5 border border-danger/20 rounded-[8px] px-3 py-2">{step2Error}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setStep(1)}>← Kembali</Button>
            <span className={cn("text-[11px]", step2Valid ? "text-success" : "text-ink-secondary")}>
              {assessmentType === "adaptive"
                ? `${selectedCount} soal di pool · tiap siswa mendapat ${formQuestionCount}`
                : `${selectedCount} / ${formQuestionCount} soal dipilih`}
            </span>
            <Button variant="default" className="h-8 text-[12px]"
              onClick={() => {
                if (!step2Valid) { setStep2Error(step2Message); return; }
                setStep2Error("");
                setStep(3);
              }}>
              Lanjut →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-card border border-border bg-surface shadow-sm p-6 space-y-5 max-w-2xl">
          <div>
            <h3 className="text-[14px] font-bold text-ink">Jadwal Pengerjaan</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">
              Siswa bisa mulai mengerjakan kapan saja di antara waktu dibuka dan ditutup. Setiap siswa punya waktu {formDuration} menit sejak mulai, dan pengerjaan otomatis berakhir saat asesmen ditutup.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Mulai Dibuka" required error={step3Attempted ? openError : null} hint="Kapan siswa bisa mulai mengerjakan">
              <input type="datetime-local" min={toLocalInputValue(new Date())}
                value={formOpenAt}
                onChange={e => {
                  const v = e.target.value;
                  setFormOpenAt(v);
                  // Keep the window valid: pushing "dibuka" past "ditutup"
                  // moves "ditutup" forward instead of leaving a clash.
                  if (v && formCloseAt && new Date(formCloseAt).getTime() <= new Date(v).getTime()) {
                    setFormCloseAt(toLocalInputValue(new Date(new Date(v).getTime() + Math.max(formDuration, 1) * 60_000)));
                  }
                }}
                className={fieldClass(step3Attempted && !!openError)} />
            </FormField>
            <FormField label="Ditutup Pada" required error={step3Attempted ? closeError : null} hint="Setelah waktu ini asesmen tidak bisa dikerjakan">
              <input type="datetime-local"
                min={formOpenAt || toLocalInputValue(new Date())}
                value={formCloseAt} onChange={e => setFormCloseAt(e.target.value)}
                className={fieldClass(step3Attempted && !!closeError)} />
            </FormField>
          </div>
          {step3Valid ? (
            <AlertPanel tone="primary" title="Siap dipublikasikan">
              Dibuka {new Date(formOpenAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}, ditutup {new Date(formCloseAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}.
              {assessmentType === "adaptive" ? ` Mode adaptif: tiap siswa mendapat ${formQuestionCount} soal dari pool ${selectedCount} soal.` : ""}
            </AlertPanel>
          ) : step3Attempted ? (
            <p className="text-[12px] font-medium text-danger">Tolong perbaiki jadwal di atas sebelum menyimpan.</p>
          ) : null}
          <div className="flex justify-between">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setStep(2)} disabled={saving}>← Kembali</Button>
            <div className="flex gap-2">
              <Button variant="outline" className="h-8 text-[12px]" disabled={saving} onClick={() => {
                setStep3Attempted(true);
                if (step1Valid && step2Valid && step3Valid) setConfirmSaveDraft(true);
              }}>Simpan Draf</Button>
              <Button variant="default" className="h-8 text-[12px]" disabled={saving} onClick={() => {
                setStep3Attempted(true);
                if (!step1Valid) { step1.validate(); setStep(1); return; }
                if (!step2Valid) { setStep2Error(step2Message); setStep(2); return; }
                if (step3Valid) setConfirmPublish(true);
              }}>
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />{saving ? "Menyimpan..." : "Publikasikan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        title="Publikasikan Asesmen?"
        message="Siswa akan menerima notifikasi dan dapat mengakses asesmen sesuai jadwal yang ditentukan. Asesmen yang sudah dipublikasikan tidak dapat diedit."
        confirmLabel="Publikasikan"
        confirmVariant="default"
        onConfirm={() => { setConfirmPublish(false); saveAssessment("published"); }}
        onCancel={() => setConfirmPublish(false)}
      />

      <ConfirmDialog
        open={confirmSaveDraft}
        title="Simpan sebagai Draf?"
        message="Asesmen disimpan sebagai draf dan belum dapat diakses siswa. Kamu dapat melanjutkan kapan saja."
        confirmLabel="Simpan Draf"
        confirmVariant="default"
        onConfirm={() => { setConfirmSaveDraft(false); saveAssessment("draft"); }}
        onCancel={() => setConfirmSaveDraft(false)}
      />

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Results ───────────────────────────────────────────────────────────

type ResultQuestionRow = {
  assessmentQuestionId: string;
  question: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  topic: string;
  difficulty: "Mudah" | "Sedang" | "Sulit";
  type: QuestionType;
  points: number;
  /** raw row for describeAnswer/describeKey */
  raw: { question_type?: string | null; options: Record<string, unknown>; correct_answer: string | null; answer_key?: unknown };
};
type ResultStudentRow = {
  studentId: string; name: string; score: number | null; answers: Record<string, string>;
  /** per assessment-question grading (essays: isCorrect null until graded) */
  results: Record<string, { qaId: string; isCorrect: boolean | null; earned: number; feedback: string | null; aiPoints: number | null; aiReason: string | null }>;
};
type AssessmentResultDetail = { questions: ResultQuestionRow[]; distributions: Record<string, Record<string, number>>; studentRows: ResultStudentRow[] };

// Attach real participant count / average score / completion status
// (derived from real assessment_attempts, never simulated) to an already
// class+subject-scoped assessment list.
async function attachAssessmentStats(rows: SavedAssessment[]): Promise<SavedAssessment[]> {
  if (rows.length === 0) return rows;
  const { data } = await supabase
    .from("assessment_attempts")
    .select("assessment_id, status, score")
    .in("assessment_id", rows.map(r => r.id))
    .in("status", ["submitted", "graded"]);
  const byAssessment = new Map<string, { count: number; sum: number; scored: number; pending: number }>();
  for (const row of (data ?? []) as Array<{ assessment_id: string; status: string; score: number | null }>) {
    const cur = byAssessment.get(row.assessment_id) ?? { count: 0, sum: 0, scored: 0, pending: 0 };
    cur.count += 1;
    if (row.status === "submitted") cur.pending += 1; // essays not graded yet
    if (row.score !== null) { cur.sum += row.score; cur.scored += 1; }
    byAssessment.set(row.assessment_id, cur);
  }
  return rows.map(r => {
    const stat = byAssessment.get(r.id);
    return {
      ...r,
      participants: stat?.count ?? 0,
      pendingGrading: stat?.pending ?? 0,
      avgScore: stat && stat.scored > 0 ? Math.round(stat.sum / stat.scored) : undefined,
      // From the schedule (an open assessment nobody has submitted yet used
      // to show "Terjadwal / belum dimulai").
      status: r.openAt && Date.now() < parseDbTime(r.openAt) ? "Terjadwal"
        : r.closeAt && Date.now() >= parseDbTime(r.closeAt) ? "Selesai"
        : "Berlangsung",
    } as SavedAssessment;
  });
}

// Real per-question answer distribution + real per-student answer grid for
// the detail dialog - replaces simulateDist/simulateStudentAnswer entirely.
// Throws when a read fails (e.g. a timeout on a busy database): an empty
// result used to be shown as "Asesmen ini tidak punya soal".
async function loadAssessmentResultDetail(assessmentId: string, classId: string): Promise<AssessmentResultDetail> {
  const { data: aqRows, error: aqErr } = await supabase
    .from("assessment_questions")
    .select("id, question_order, points, questions(*)")
    .eq("assessment_id", assessmentId)
    .order("question_order", { ascending: true });
  if (aqErr) throw new Error(aqErr.message);
  type AQRow = { id: string; question_order: number; points: number; questions: { question: string; options: { A: string; B: string; C: string; D: string; E?: string }; correct_answer: string; topic: string; difficulty: string; question_type?: string | null; answer_key?: unknown } | null };
  const questions: ResultQuestionRow[] = ((aqRows ?? []) as unknown as AQRow[])
    .filter((r): r is AQRow & { questions: NonNullable<AQRow["questions"]> } => !!r.questions)
    .map(r => ({
      assessmentQuestionId: r.id,
      question: r.questions.question,
      options: r.questions.options,
      correctAnswer: r.questions.correct_answer as "A" | "B" | "C" | "D" | "E",
      topic: r.questions.topic,
      difficulty: r.questions.difficulty as "Mudah" | "Sedang" | "Sulit",
      type: questionTypeOf(r.questions),
      points: Number(r.points) || 1,
      raw: r.questions as unknown as ResultQuestionRow["raw"],
    }));

  const { data: attemptData, error: attErr } = await supabase
    .from("assessment_attempts")
    .select("id, student_id, score")
    .eq("assessment_id", assessmentId)
    .in("status", ["submitted", "graded"]);
  if (attErr) throw new Error(attErr.message);
  type AttemptRow = { id: string; student_id: string; score: number | null };
  const attempts = (attemptData ?? []) as AttemptRow[];

  const answersByAttempt: Record<string, Record<string, string>> = {};
  const resultsByAttempt: Record<string, ResultStudentRow["results"]> = {};
  const distCounts: Record<string, Record<string, number>> = {};
  if (attempts.length > 0) {
    const { data: qaRows, error: qaErr } = await supabase
      .from("question_attempts")
      .select("*")
      .in("assessment_attempt_id", attempts.map(a => a.id));
    if (qaErr) throw new Error(qaErr.message);
    for (const row of (qaRows ?? []) as Array<{ id: string; assessment_attempt_id: string; assessment_question_id: string; student_answer: string | null; is_correct: boolean | null; points_earned: number | null; teacher_feedback?: string | null; ai_suggested_points?: number | null; ai_reason?: string | null }>) {
      (resultsByAttempt[row.assessment_attempt_id] ??= {})[row.assessment_question_id] = {
        qaId: row.id, isCorrect: row.is_correct, earned: Number(row.points_earned) || 0, feedback: row.teacher_feedback ?? null,
        aiPoints: row.ai_suggested_points == null ? null : Number(row.ai_suggested_points), aiReason: row.ai_reason ?? null,
      };
      if (!row.student_answer) continue;
      (answersByAttempt[row.assessment_attempt_id] ??= {})[row.assessment_question_id] = row.student_answer;
      const bucket = (distCounts[row.assessment_question_id] ??= {});
      bucket[row.student_answer] = (bucket[row.student_answer] ?? 0) + 1;
    }
  }

  const distributions: Record<string, Record<string, number>> = {};
  for (const q of questions) {
    const counts = distCounts[q.assessmentQuestionId] ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    if (total > 0) (["A", "B", "C", "D"] as const).forEach(o => { dist[o] = Math.round(((counts[o] ?? 0) / total) * 100); });
    distributions[q.assessmentQuestionId] = dist;
  }

  const { data: studentData } = await supabase
    .from("students")
    .select("id, user_profiles(full_name)")
    .eq("class_id", classId);
  type StudentRow = { id: string; user_profiles: { full_name: string } | null };
  const studentRows: ResultStudentRow[] = ((studentData ?? []) as unknown as StudentRow[]).map(s => {
    const attempt = attempts.find(a => a.student_id === s.id);
    return {
      studentId: s.id,
      name: s.user_profiles?.full_name ?? "-",
      score: attempt?.score ?? null,
      answers: attempt ? (answersByAttempt[attempt.id] ?? {}) : {},
      results: attempt ? (resultsByAttempt[attempt.id] ?? {}) : {},
    };
  });

  return { questions, distributions, studentRows };
}

// "Peserta & Waktu": who is doing the exam right now, extra time for
// everyone or one student, and reopening the exam for a student whose
// exam ended (e.g. left the exam screen by accident).
type SessionAttempt = { id: string; student_id: string; status: string; started_at: string; submitted_at: string | null; score: number | null; deadline_override?: string | null; end_reason?: string | null };
function ExamSessionPanel({ assessmentId, students, onChanged }: {
  assessmentId: string; students: { id: string; name: string }[]; onChanged: () => void;
}) {
  const [attempts, setAttempts] = useState<SessionAttempt[] | null>(null);
  const [assessment, setAssessment] = useState<{ duration_minutes: number | null; close_at: string | null } | null>(null);
  const [dialog, setDialog] = useState<null | { kind: "extend-all" } | { kind: "extend-one"; attempt: SessionAttempt; name: string } | { kind: "reopen"; attempt: SessionAttempt; name: string }>(null);
  const [minutes, setMinutes] = useState(10);
  const [keepAnswers, setKeepAnswers] = useState(true);
  const [extendClose, setExtendClose] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [, tick] = useState(0);

  const load = React.useCallback(async () => {
    const [{ data: at }, { data: a }] = await Promise.all([
      supabase.from("assessment_attempts").select("*").eq("assessment_id", assessmentId),
      supabase.from("assessments").select("duration_minutes, close_at").eq("id", assessmentId).single(),
    ]);
    setAttempts((at ?? []) as SessionAttempt[]);
    setAssessment(a as typeof assessment);
  }, [assessmentId]);
  useEffect(() => { load(); const t = setInterval(() => { load(); tick(n => n + 1); }, 20_000); return () => clearInterval(t); }, [load]);

  const deadlineOf = (at: SessionAttempt) => {
    if (at.deadline_override) return parseDbTime(at.deadline_override);
    const start = parseDbTime(at.started_at);
    const d = assessment?.duration_minutes ? start + assessment.duration_minutes * 60000 : null;
    const c = assessment?.close_at ? parseDbTime(assessment.close_at) : null;
    return [d, c].filter((x): x is number => x !== null).sort((x, y) => x - y)[0] ?? null;
  };
  const latest = (sid: string) => (attempts ?? []).filter(a => a.student_id === sid)
    .sort((x, y) => parseDbTime(y.started_at) - parseDbTime(x.started_at))[0];

  async function run() {
    if (!dialog) return;
    setBusy(true); setMsg(null);
    const res = dialog.kind === "reopen"
      ? await apiPost("/api/teacher/attempts/reopen", { attemptId: dialog.attempt.id, keepAnswers, minutes })
      : await apiPost("/api/teacher/assessments/extend", {
          assessmentId, minutes,
          ...(dialog.kind === "extend-one" ? { attemptIds: [dialog.attempt.id] } : { extendClose }),
        });
    setBusy(false);
    if (res.error) { setMsg({ text: res.error, tone: "danger" }); return; }
    setMsg({ text: dialog.kind === "reopen" ? `Ujian ${dialog.name} dibuka kembali selama ${minutes} menit. Minta siswa membuka ujiannya lagi.`
      : dialog.kind === "extend-one" ? `${dialog.name} mendapat tambahan ${minutes} menit.`
      : `Waktu ujian ditambah ${minutes} menit untuk semua siswa.`, tone: "success" });
    setDialog(null);
    await load(); onChanged();
  }

  const fmtTime = (ms: number) => new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const running = (attempts ?? []).filter(a => a.status === "in_progress").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] text-ink-secondary">
          Durasi {assessment?.duration_minutes ?? "-"} menit{assessment?.close_at ? ` · ditutup ${fmtTime(parseDbTime(assessment.close_at))}` : ""} · <b className="text-ink">{running}</b> siswa sedang mengerjakan
        </p>
        <Button variant="default" size="sm" className="ml-auto" onClick={() => { setMinutes(10); setExtendClose(true); setDialog({ kind: "extend-all" }); }}>
          <Clock className="mr-1.5 h-3.5 w-3.5" />Tambah waktu untuk semua
        </Button>
      </div>
      {msg && <p className={cn("text-[12px] font-medium", msg.tone === "success" ? "text-success" : "text-danger")}>{msg.text}</p>}
      {attempts === null ? <SectionLoading message="Memuat peserta..." /> : (
        <div className="overflow-hidden rounded-[10px] border border-border">
          {students.map(st => {
            const at = latest(st.id);
            const dl = at ? deadlineOf(at) : null;
            const left = dl ? Math.round((dl - Date.now()) / 60000) : null;
            return (
              <div key={st.id} className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2 last:border-0">
                <span className="min-w-[140px] flex-1 text-[12px] font-medium text-ink">{st.name}</span>
                {!at ? <Badge tone="neutral">Belum mulai</Badge>
                  : at.status === "in_progress" ? (
                    <>
                      <Badge tone="primary">Mengerjakan</Badge>
                      {left !== null && <span className="text-[11px] text-ink-secondary">{left > 0 ? `sisa ± ${left} menit` : "waktu habis"}</span>}
                      <Button variant="outline" size="sm" onClick={() => { setMinutes(5); setDialog({ kind: "extend-one", attempt: at, name: st.name }); }}>+ Waktu</Button>
                    </>
                  ) : (
                    <>
                      <Badge tone={at.status === "missed" ? "danger" : "success"}>
                        {at.status === "missed" ? "Tidak selesai" : at.score == null ? "Selesai · nilai –" : `Selesai · ${at.score}`}
                      </Badge>
                      {at.end_reason && <span className="text-[11px] text-warning" title="Alasan ujian berakhir">{at.end_reason}</span>}
                      <Button variant="outline" size="sm" onClick={() => { setMinutes(15); setKeepAnswers(true); setDialog({ kind: "reopen", attempt: at, name: st.name }); }}>Buka kembali</Button>
                    </>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !busy && setDialog(null)} />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-[16px] font-bold text-ink">
              {dialog.kind === "reopen" ? `Buka kembali ujian ${dialog.name}` : dialog.kind === "extend-one" ? `Tambah waktu untuk ${dialog.name}` : "Tambah waktu untuk semua siswa"}
            </h2>
            {dialog.kind === "reopen" && dialog.attempt.end_reason && (
              <p className="mt-1 text-[12px] text-ink-secondary">Ujian berakhir karena: <b>{dialog.attempt.end_reason}</b></p>
            )}
            <label className="mt-4 flex items-center justify-between gap-3 text-[13px] font-medium text-ink">
              {dialog.kind === "reopen" ? "Waktu yang diberikan (menit)" : "Tambahan waktu (menit)"}
              <NumberInput value={minutes} min={1} max={600} onChange={setMinutes} ariaLabel="Menit"
                className="w-20 rounded-[6px] border border-border bg-background px-2 py-1.5 text-right text-[13px] text-ink focus:border-primary focus:outline-none" />
            </label>
            {dialog.kind === "reopen" && (
              <div className="mt-3 space-y-2 text-[13px] text-ink">
                <label className="flex items-start gap-2"><input type="radio" className="mt-0.5 accent-primary" checked={keepAnswers} onChange={() => setKeepAnswers(true)} />
                  <span><b>Lanjutkan jawaban sebelumnya</b><br /><span className="text-[12px] text-ink-secondary">Jawaban yang sudah diisi tetap ada, siswa melanjutkan.</span></span></label>
                <label className="flex items-start gap-2"><input type="radio" className="mt-0.5 accent-primary" checked={!keepAnswers} onChange={() => setKeepAnswers(false)} />
                  <span><b>Kosongkan semua jawaban</b><br /><span className="text-[12px] text-ink-secondary">Siswa mengulang dari awal.</span></span></label>
                <p className="text-[11px] text-ink-tertiary">Nilai lama dihapus sampai siswa mengumpulkan lagi. Bisa dibuka walau jadwal asesmen sudah ditutup (khusus siswa ini).</p>
              </div>
            )}
            {dialog.kind === "extend-all" && (
              <label className="mt-3 flex items-start gap-2 text-[13px] text-ink">
                <input type="checkbox" className="mt-0.5 accent-primary" checked={extendClose} onChange={e => setExtendClose(e.target.checked)} />
                <span>Mundurkan juga waktu tutup asesmen<br /><span className="text-[12px] text-ink-secondary">Supaya tambahan waktu tidak terpotong jadwal tutup.</span></span>
              </label>
            )}
            <p className="mt-3 text-[11px] text-ink-tertiary">Layar ujian siswa menyesuaikan dalam ± 30 detik.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog(null)}>Batal</Button>
              <Button variant="default" size="sm" disabled={busy} onClick={run}>{busy ? "Menyimpan..." : dialog.kind === "reopen" ? "Buka kembali" : "Tambah waktu"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Teacher scores essay answers (0..points) with optional feedback. The AI
// can suggest a score for one answer or for a selection (it costs AI quota,
// so it only runs when asked); a suggestion only counts once the teacher
// accepts and saves it.
function EssayGradingPanel({ detail, onGraded }: { detail: AssessmentResultDetail; onGraded: () => void }) {
  const essays = detail.questions.filter(q => q.type === "esai");
  const [drafts, setDrafts] = useState<Record<string, { points: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState<Set<string>>(new Set());
  // Suggestions fetched in this session (stored ones come from detail.results).
  const [fresh, setFresh] = useState<Record<string, { points: number; reason: string }>>({});
  const [keyIssues, setKeyIssues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [view, setView] = useState<"soal" | "siswa">("soal");
  const [qFilter, setQFilter] = useState("all");
  const [stFilter, setStFilter] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false);
  const [keyDraft, setKeyDraft] = useState<Record<string, string>>({});
  const [convertToIsian, setConvertToIsian] = useState<Record<string, boolean>>({});

  const suggestionOf = (r: ResultStudentRow["results"][string]) =>
    fresh[r.qaId] ?? (r.aiPoints != null ? { points: r.aiPoints, reason: r.aiReason ?? "" } : null);

  async function aiCheck(ids: string[]) {
    if (ids.length === 0) return;
    setMsg(null);
    setChecking(prev => new Set([...prev, ...ids]));
    // Server takes up to 20 per request.
    let done = 0; let failed: string | null = null;
    for (let i = 0; i < ids.length; i += 20) {
      const res = await apiPost<{ suggestions?: Record<string, { points: number; reason: string }>; keyIssues?: Record<string, string> }>("/api/teacher/essay-suggest", { questionAttemptIds: ids.slice(i, i + 20) });
      if (res.error) { failed = res.error; break; }
      setFresh(prev => ({ ...prev, ...(res.suggestions ?? {}) }));
      setKeyIssues(prev => ({ ...prev, ...(res.keyIssues ?? {}) }));
      done += Object.keys(res.suggestions ?? {}).length;
    }
    setChecking(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    setMsg(failed ? { text: `AI gagal mengecek: ${failed}`, tone: "danger" } : { text: `AI selesai mengecek ${done} jawaban. Periksa usulannya, lalu simpan.`, tone: "success" });
  }

  async function saveOne(qaId: string, max: number, points: string, feedback: string): Promise<boolean> {
    const pts = Number(points);
    if (points === "" || !Number.isFinite(pts) || pts < 0 || pts > max) {
      setMsg({ text: `Isi nilai antara 0 dan ${max}.`, tone: "danger" }); return false;
    }
    const res = await apiPost<{ score?: number }>("/api/teacher/grade-essay", { questionAttemptId: qaId, points: pts, feedback });
    if (res.error) { setMsg({ text: `Gagal menyimpan: ${res.error}`, tone: "danger" }); return false; }
    return true;
  }

  async function save(qaId: string, max: number) {
    const d = drafts[qaId];
    setSaving(qaId); setMsg(null);
    const ok = await saveOne(qaId, max, d?.points ?? "", d?.feedback ?? "");
    setSaving(null);
    if (ok) { setMsg({ text: "Nilai tersimpan. Nilai akhir siswa sudah dihitung ulang.", tone: "success" }); onGraded(); }
  }

  // Accept the AI suggestion for every selected answer that has one.
  // Ticked answers, or - when nothing is ticked - every ungraded answer.
  async function acceptSelected(q: ResultQuestionRow, rows: Array<{ r: ResultStudentRow["results"][string] }>) {
    const anyTicked = rows.some(({ r }) => selected.has(r.qaId));
    const targets = rows.filter(({ r }) => (anyTicked ? selected.has(r.qaId) : r.isCorrect === null) && suggestionOf(r));
    if (targets.length === 0) { setMsg({ text: "Belum ada usulan AI untuk jawaban yang dipilih. Klik \"AI cek\" dulu.", tone: "danger" }); return; }
    setSaving("bulk"); setMsg(null);
    let ok = 0;
    for (const { r } of targets) {
      const sug = suggestionOf(r)!;
      if (await saveOne(r.qaId, q.points, String(sug.points), drafts[r.qaId]?.feedback ?? r.feedback ?? "")) ok++;
    }
    setSaving(null);
    setMsg({ text: `${ok} nilai dari usulan AI tersimpan.`, tone: "success" });
    onGraded();
  }

  // One student's answer to one essay question, with AI suggestion + grading.
  function renderAnswer(q: ResultQuestionRow, st: ResultStudentRow, r: ResultStudentRow["results"][string], title: string) {
                const d = drafts[r.qaId] ?? { points: r.isCorrect === null ? "" : String(r.earned), feedback: r.feedback ?? "" };
                const sug = suggestionOf(r);
                const isChecking = checking.has(r.qaId);
                return (
                  <div key={r.qaId} className={cn("rounded-[8px] border bg-surface p-3", selected.has(r.qaId) ? "border-primary/40" : "border-border")}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={selected.has(r.qaId)} aria-label={`Pilih jawaban ${st.name}`}
                        onChange={() => setSelected(prev => { const n = new Set(prev); if (n.has(r.qaId)) n.delete(r.qaId); else n.add(r.qaId); return n; })} />
                      <span className="text-[12px] font-semibold text-ink">{title}</span>
                      {r.isCorrect === null ? <Badge tone="warning">Belum dinilai</Badge> : <Badge tone="success">{r.earned}/{q.points} poin</Badge>}
                      <Button variant="outline" size="sm" className="ml-auto" disabled={isChecking} onClick={() => aiCheck([r.qaId])}>
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />{isChecking ? "AI mengecek..." : sug ? "AI cek ulang" : "AI cek"}
                      </Button>
                    </div>
                    <p className="whitespace-pre-line rounded-[6px] bg-background p-2.5 text-[12px] text-ink">{st.answers[q.assessmentQuestionId]}</p>
                    {sug && (
                      <div className="mt-2 flex flex-wrap items-start gap-2 rounded-[6px] border border-primary/20 bg-primary-soft p-2.5">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <p className="flex-1 text-[12px] text-ink"><span className="font-semibold">Usulan AI: {sug.points}/{q.points}</span>{sug.reason ? ` — ${sug.reason}` : ""}</p>
                        <button type="button" className="text-[11px] font-semibold text-primary hover:underline"
                          onClick={() => setDrafts(p => ({ ...p, [r.qaId]: { ...d, points: String(sug.points) } }))}>
                          Pakai nilai ini
                        </button>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-secondary">
                        Nilai
                        <input type="number" min={0} max={q.points} step={0.5} value={d.points}
                          onChange={e => setDrafts(p => ({ ...p, [r.qaId]: { ...d, points: e.target.value } }))}
                          className="w-20 rounded-[6px] border border-border bg-background px-2 py-1 text-[12px] text-ink focus:border-primary focus:outline-none" />
                        / {q.points}
                      </label>
                      <input type="text" placeholder="Catatan untuk siswa (opsional)" value={d.feedback}
                        onChange={e => setDrafts(p => ({ ...p, [r.qaId]: { ...d, feedback: e.target.value } }))}
                        className="min-w-[180px] flex-1 rounded-[6px] border border-border bg-background px-2 py-1 text-[12px] text-ink focus:border-primary focus:outline-none" />
                      <Button variant="default" size="sm" disabled={saving === r.qaId} onClick={() => save(r.qaId, q.points)}>
                        {saving === r.qaId ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </div>
    );
  }

  async function gradeByKey(q: ResultQuestionRow) {
    const accepted = (keyDraft[q.assessmentQuestionId] ?? "").split(/[;\n|]/).map(x => x.trim()).filter(Boolean);
    if (!accepted.length) { setMsg({ text: "Isi jawaban yang benar dulu, misal 5040.", tone: "danger" }); return; }
    setSaving(`key:${q.assessmentQuestionId}`); setMsg(null);
    const res = await apiPost<{ graded?: number; right?: number; converted?: boolean; convertError?: string | null }>("/api/teacher/grade-by-key",
      { assessmentQuestionId: q.assessmentQuestionId, accepted, convert: convertToIsian[q.assessmentQuestionId] ?? true });
    setSaving(null);
    if (res.error) { setMsg({ text: `Gagal: ${res.error}`, tone: "danger" }); return; }
    setMsg({ text: `${res.graded} jawaban dinilai otomatis (${res.right} benar).${res.converted ? " Soal ini sekarang Isian Singkat - berikutnya dinilai otomatis." : ""}${res.convertError ? ` (${res.convertError})` : ""}`, tone: "success" });
    onGraded();
  }

  const students = detail.studentRows.filter(st => essays.some(q => st.answers[q.assessmentQuestionId] && st.results[q.assessmentQuestionId]));
  const shownEssays = qFilter === "all" ? essays : essays.filter(q => q.assessmentQuestionId === qFilter);
  const keep = (st: ResultStudentRow, q: ResultQuestionRow) => {
    const r = st.results[q.assessmentQuestionId];
    return !!st.answers[q.assessmentQuestionId] && !!r && (stFilter === "all" || st.studentId === stFilter) && (!onlyPending || r.isCorrect === null);
  };

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-ink-secondary">
        <b className="text-ink">Cara menilai:</b> ketik nilai di kotak &quot;Nilai&quot; lalu <b className="text-ink">Simpan</b>, atau minta <b className="text-ink">usulan nilai AI</b> lalu pakai/ubah usulannya.
        AI hanya mengecek kalau diminta (hemat kuota). AI membandingkan jawaban dengan <span className="font-semibold text-ink">contoh jawaban / kata kunci / pedoman</span> di soal;
        kalau keduanya kosong, AI memakai materi kelas. Usulan AI baru berlaku setelah kamu menyimpannya.
      </p>
      {msg && <p className={cn("text-[12px] font-medium", msg.tone === "success" ? "text-success" : "text-danger")}>{msg.text}</p>}

      {/* Filters: by question number or by student */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-surface/95 p-3 backdrop-blur">
        <div className="flex rounded-full border border-border p-0.5">
          {(["soal", "siswa"] as const).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", view === v ? "bg-primary text-white" : "text-ink-secondary")}>
              {v === "soal" ? "Per soal" : "Per siswa"}
            </button>
          ))}
        </div>
        <div className="w-48">
          <SelectField value={qFilter} onChange={setQFilter} options={[{ value: "all", label: "Semua soal" }, ...essays.map(q => {
            const pending = detail.studentRows.filter(st => st.answers[q.assessmentQuestionId] && st.results[q.assessmentQuestionId]?.isCorrect === null).length;
            return { value: q.assessmentQuestionId, label: `Soal ${detail.questions.indexOf(q) + 1}`, description: pending ? `${pending} belum dinilai` : "Selesai dinilai" };
          })]} />
        </div>
        <div className="w-56">
          <SelectField value={stFilter} onChange={setStFilter} options={[{ value: "all", label: "Semua siswa" }, ...students.map(st => {
            const pending = essays.filter(q => st.answers[q.assessmentQuestionId] && st.results[q.assessmentQuestionId]?.isCorrect === null).length;
            return { value: st.studentId, label: st.name, description: pending ? `${pending} esai belum dinilai` : "Selesai dinilai" };
          })]} />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
          Hanya yang belum dinilai
        </label>
      </div>

      {view === "siswa" ? (
        <div className="space-y-4">
          {students.filter(st => shownEssays.some(q => keep(st, q))).map(st => (
            <div key={st.studentId} className="rounded-[10px] border border-border bg-background p-4">
              <p className="mb-3 text-[14px] font-bold text-ink">{st.name}</p>
              <div className="space-y-3">
                {shownEssays.filter(q => keep(st, q)).map(q => (
                  <div key={q.assessmentQuestionId}>
                    <p className="mb-1 text-[11px] text-ink-secondary"><b className="text-ink">Soal {detail.questions.indexOf(q) + 1}</b> · {q.question.slice(0, 160)}{q.question.length > 160 ? "…" : ""}</p>
                    {renderAnswer(q, st, st.results[q.assessmentQuestionId], `Soal ${detail.questions.indexOf(q) + 1} · maks. ${q.points}`)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {students.every(st => !shownEssays.some(q => keep(st, q))) && <p className="py-6 text-center text-[13px] text-ink-tertiary">Tidak ada jawaban yang cocok dengan filter.</p>}
        </div>
      ) : (
      <>
      {shownEssays.map((q) => {
        const idx = detail.questions.indexOf(q) + 1;
        const rows = detail.studentRows
          .filter(st => keep(st, q))
          .map(st => ({ st, r: st.results[q.assessmentQuestionId] }));
        const ids = rows.map(x => x.r.qaId);
        const selectedHere = ids.filter(id => selected.has(id));
        const allSelected = ids.length > 0 && selectedHere.length === ids.length;
        return (
          <div key={q.assessmentQuestionId} className="rounded-[10px] border border-border bg-background p-4">
            <p className="text-[12px] font-bold text-ink">Soal {idx} · maks. {q.points} poin</p>
            <p className="mt-1 whitespace-pre-line text-[12px] text-ink">{q.question}</p>
            {describeKey(q.raw) === "Dinilai guru" && !(q.raw as { explanation?: string }).explanation
              ? <p className="mt-1 text-[11px] text-warning">Soal ini belum punya contoh jawaban / kata kunci - usulan AI akan memakai materi kelas. Tambahkan lewat Bank Soal → Edit Soal supaya usulan lebih tepat.</p>
              : <p className="mt-1 text-[11px] text-ink-secondary">{describeKey(q.raw)}</p>}
            {(() => {
              const issue = keyIssues[q.assessmentQuestionId] ?? rows.map(({ r }) => suggestionOf(r)?.reason ?? "").find(x => x.startsWith("⚠ Kunci guru mungkin keliru"))?.split(" · ")[0].replace("⚠ Kunci guru mungkin keliru: ", "");
              return issue ? (
                <div className="mt-2 rounded-[8px] border border-warning/40 bg-warning-light px-3 py-2 text-[12px] text-ink">
                  <b className="text-warning">⚠ Contoh jawaban di soal ini mungkin keliru.</b> {issue} Usulan AI memakai jawaban yang benar - cek dulu, lalu perbaiki soalnya lewat Bank Soal → Edit Soal.
                </div>
              ) : null;
            })()}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[8px] border border-success/30 bg-success-light/50 px-3 py-2">
              <span className="text-[12px] font-semibold text-ink">Jawabannya pasti (angka/kata)? Nilai otomatis:</span>
              <input type="text" placeholder="jawaban benar, mis. 5040" value={keyDraft[q.assessmentQuestionId] ?? ""}
                onChange={e => setKeyDraft(p => ({ ...p, [q.assessmentQuestionId]: e.target.value }))}
                className="w-44 rounded-[6px] border border-border bg-surface px-2 py-1 text-[12px] text-ink focus:border-primary focus:outline-none" />
              <label className="flex items-center gap-1 text-[11px] text-ink-secondary">
                <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={convertToIsian[q.assessmentQuestionId] ?? true}
                  onChange={e => setConvertToIsian(p => ({ ...p, [q.assessmentQuestionId]: e.target.checked }))} />
                jadikan Isian Singkat (berikutnya otomatis)
              </label>
              <Button variant="success" size="sm" className="ml-auto" disabled={saving === `key:${q.assessmentQuestionId}`} onClick={() => gradeByKey(q)}>
                {saving === `key:${q.assessmentQuestionId}` ? "Menilai..." : "Nilai semua otomatis"}
              </Button>
            </div>
            {rows.length === 0 && <p className="mt-3 text-[12px] text-ink-tertiary">{onlyPending || stFilter !== "all" ? "Tidak ada jawaban yang cocok dengan filter." : "Belum ada jawaban."}</p>}
            {rows.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={allSelected}
                    onChange={() => setSelected(prev => { const n = new Set(prev); ids.forEach(id => allSelected ? n.delete(id) : n.add(id)); return n; })} />
                  Pilih semua ({ids.length})
                </label>
                <button type="button" className="text-[11px] font-semibold text-primary hover:underline"
                  onClick={() => setSelected(prev => { const n = new Set(prev); rows.forEach(({ r }) => { if (r.isCorrect === null) n.add(r.qaId); else n.delete(r.qaId); }); return n; })}>
                  Pilih yang belum dinilai
                </button>
                <div className="ml-auto flex flex-wrap gap-2">
                  {(() => {
                    const ungraded = rows.filter(({ r }) => r.isCorrect === null).map(({ r }) => r.qaId);
                    const targetIds = selectedHere.length ? selectedHere : ungraded;
                    const withSuggestion = rows.filter(({ r }) => (selectedHere.length ? selected.has(r.qaId) : r.isCorrect === null) && suggestionOf(r)).length;
                    return (
                      <>
                        <Button variant="default" size="sm" disabled={targetIds.length === 0 || targetIds.some(id => checking.has(id))}
                          onClick={() => aiCheck(targetIds)}>
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          {targetIds.some(id => checking.has(id)) ? "AI mengecek..." : selectedHere.length ? `Usulan AI untuk yang dipilih (${selectedHere.length})` : `Minta usulan nilai AI (${ungraded.length} belum dinilai)`}
                        </Button>
                        <Button variant="success" size="sm" disabled={withSuggestion === 0 || saving === "bulk"}
                          onClick={() => acceptSelected(q, rows)}>
                          {saving === "bulk" ? "Menyimpan..." : `Pakai ${withSuggestion} usulan AI`}
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            <div className="mt-3 space-y-3">
              {rows.map(({ st, r }) => renderAnswer(q, st, r, st.name))}
            </div>
          </div>
        );
      })}
      </>
      )}
    </div>
  );
}
function TeacherResults() {
  const { teacher, loading: teacherLoading } = useRealTeacherStatus();
  const [activeClass] = useActiveClass();
  const activeSubjectId = findActiveAssignment(teacher, activeClass)?.subjectId;
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"soal" | "siswa" | "esai" | "sesi">("soal");
  // null = still loading - never show "Belum ada asesmen" before the fetch returns
  const [assessmentRows, setAssessmentRows] = useState<SavedAssessment[] | null>(null);
  const allAssessments = assessmentRows ?? [];
  const listLoading = assessmentRows === null;
  const [classSize, setClassSize] = useState(0);
  const [resultDetail, setResultDetail] = useState<AssessmentResultDetail | null>(null);
  const [resultDetailError, setResultDetailError] = useState<string | null>(null);
  const [detailReload, setDetailReload] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; studentCount?: number } | null>(null);
  const [resultsToast, setResultsToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{ overallAnalysis: string; questionAnalyses: Array<{index:number;misconception:string;suggestion:string}> } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!activeClass || !activeSubjectId) { setAssessmentRows(teacherLoading || (teacher && teacher.classes.length > 0) ? null : []); return; }
    setAssessmentRows(null);
    let cancelled = false;
    fetchClassAssessments(activeClass, activeSubjectId).then(attachAssessmentStats).then(rows => { if (!cancelled) setAssessmentRows(rows); });
    return () => { cancelled = true; };
  }, [activeClass, activeSubjectId, teacher, teacherLoading]);

  useEffect(() => {
    if (!activeClass) { setClassSize(0); return; }
    supabase.from("students").select("id", { count: "exact", head: true }).eq("class_id", activeClass)
      .then(({ count }) => setClassSize(count ?? 0));
  }, [activeClass]);

  // Reset analysis, tab, and detail data when dialog closes or changes
  useEffect(() => {
    setAiAnalysis(null); setAiLoading(false); setDetailTab("soal"); setResultDetail(null); setResultDetailError(null);
    let cancelled = false;
    if (detailId && activeClass) loadAssessmentResultDetail(detailId, activeClass).then(d => {
      if (cancelled) return;
      setResultDetail(d);
      // Essays waiting for a score: open straight on "Nilai Esai".
      const waiting = d.studentRows.some(st => d.questions.some(q => q.type === "esai" && st.answers[q.assessmentQuestionId] && st.results[q.assessmentQuestionId]?.isCorrect === null));
      if (waiting) setDetailTab("esai");
    }, (err: unknown) => { if (!cancelled) setResultDetailError(err instanceof Error ? err.message : "Gagal memuat"); });
    return () => { cancelled = true; };
  }, [detailId, activeClass, detailReload]);

  const essayPendingCount = resultDetail
    ? resultDetail.studentRows.reduce((n, st) => n + resultDetail.questions.filter(q => q.type === "esai" && st.answers[q.assessmentQuestionId] && st.results[q.assessmentQuestionId]?.isCorrect === null).length, 0)
    : 0;

  function analysisPayload() {
    if (!resultDetail) return [];
    const payload = resultDetail.questions.map((q, i) => {
      const dist = resultDetail.distributions[q.assessmentQuestionId] ?? { A: 0, B: 0, C: 0, D: 0 };
      const wrongOpts = (["A","B","C","D"] as const).filter(o => o !== q.correctAnswer);
      const majority = wrongOpts.reduce((a,b) => dist[a] > dist[b] ? a : b);
      return {
        index: i + 1,
        question: q.question, topic: q.topic,
        correctAnswer: q.correctAnswer, correctOption: q.options[q.correctAnswer as "A"|"B"|"C"|"D"],
        majorityWrongAnswer: majority, majorityWrongOption: q.options[majority],
        majorityWrongPct: dist[majority],
        isPg: q.type === "pg",
      };
    }).filter(q => q.isPg && q.majorityWrongPct > 25).map(({ isPg: _pg, ...rest }) => rest);
    return payload;
  }

  // Saved analysis (if any) shows when the results open - no AI call.
  useEffect(() => {
    if (!detailId || !resultDetail?.questions.length) return;
    let cancelled = false;
    apiPost<NonNullable<typeof aiAnalysis>>("/api/analyze-assessment", {
      assessmentId: detailId, assessmentTitle: "", questions: analysisPayload(), cachedOnly: true,
    }).then(data => { if (!cancelled && data && "overallAnalysis" in data && data.overallAnalysis) setAiAnalysis(data); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, resultDetail]);

  async function loadAIAnalysis() {
    if (!resultDetail?.questions.length || !detailId) return;
    setAiLoading(true);
    const data = await apiPost<NonNullable<typeof aiAnalysis>>("/api/analyze-assessment", {
      assessmentId: detailId, assessmentTitle: detail?.title ?? "", questions: analysisPayload(),
    });
    if (!data.error) setAiAnalysis(data);
    else setResultsToast({ message: `Analisis AI gagal: ${data.error}`, tone: "danger" });
    setAiLoading(false);
  }

  const detail = allAssessments.find(a => a.id === detailId);
  const bestAvg = allAssessments.reduce((max, a) => a.avgScore != null && a.avgScore > max ? a.avgScore : max, 0);
  const participationRate = classSize > 0 && allAssessments.some(a => (a.participants ?? 0) > 0)
    ? Math.round(
        (allAssessments.filter(a => (a.participants ?? 0) > 0).reduce((sum, a) => sum + (a.participants ?? 0) / classSize, 0)
          / allAssessments.filter(a => (a.participants ?? 0) > 0).length) * 100
      )
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Asesmen" title="List Asesmen" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Asesmen selesai", value: `${allAssessments.filter(a => a.status === "Selesai").length}`, detail: "Semester ini", tone: "primary" as const },
          { label: "Rata-rata terbaik", value: bestAvg > 0 ? `${bestAvg}` : "—", detail: "Semua asesmen", tone: "success" as const },
          { label: "Partisipasi rata-rata", value: classSize > 0 ? `${participationRate}%` : "—", detail: "Dari total siswa", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} value={listLoading ? "…" : s.value} />)}
      </div>

      <div className="space-y-3">
        {listLoading && <SectionLoading message="Memuat daftar asesmen..." />}
        {!listLoading && allAssessments.length === 0 && (
          <EmptyState icon={ClipboardList} title="Belum ada asesmen" description="Buat asesmen baru di halaman Buat Asesmen untuk melihat hasilnya di sini." />
        )}
        {allAssessments.map(a => (
          <div key={a.id} onClick={() => setDetailId(a.id)}
            className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]",
              a.status === "Selesai" ? "bg-success" : a.status === "Berlangsung" ? "bg-primary" : "bg-background border border-border"
            )}>
              {a.status === "Selesai" ? <CheckCircle2 className="h-5 w-5 text-white" /> : a.status === "Berlangsung" ? <Zap className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-ink-secondary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink">{a.title}</div>
              <div className="text-[11px] text-ink-secondary">{a.type} · {a.totalQuestions} soal · {a.duration} mnt · {a.scheduledFor}</div>
            </div>
            <div className="text-right shrink-0">
              {a.avgScore ? (
                <>
                  <div className={cn("text-[20px] font-bold tabular-nums",
                    a.avgScore >= 80 ? "text-success" : a.avgScore >= 65 ? "text-primary" : "text-warning"
                  )}>{a.avgScore}</div>
                  <div className="text-[10px] text-ink-tertiary">{a.participants} peserta</div>
                </>
              ) : (
                <Badge tone={a.status === "Terjadwal" ? "neutral" : "primary"}>{a.status}</Badge>
              )}
              {((a as { pendingGrading?: number }).pendingGrading ?? 0) > 0 && (
                <div className="mt-1"><Badge tone="warning">✍️ {(a as { pendingGrading?: number }).pendingGrading} menunggu nilai esai</Badge></div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-ink-tertiary shrink-0" />
          </div>
        ))}
      </div>

      {/* Assessment detail dialog */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDetailId(null)} />
          <div className={cn("relative w-full rounded-card border border-border bg-surface shadow-xl flex flex-col",
            detailTab === "esai" || detailTab === "siswa" ? "max-w-6xl h-[94vh]" : "max-w-4xl max-h-[94vh]")}>
            <div className="flex items-start justify-between border-b border-border px-6 py-4 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary mb-0.5">{detail.type}</p>
                <h2 className="text-[16px] font-bold text-ink">{detail.title}</h2>
                <p className="text-[12px] text-ink-secondary mt-0.5">{detail.scheduledFor} · {detail.totalQuestions} soal · {detail.duration} menit</p>
              </div>
              <button onClick={() => setDetailId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Peserta", value: `${detail.participants ?? 0}`, icon: <Users className="h-4 w-4 text-primary" /> },
                  { label: "Rata-rata", value: detail.avgScore ? `${detail.avgScore}` : "—", icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
                  { label: "Status", value: detail.status, icon: <Eye className="h-4 w-4 text-ink-secondary" /> },
                ].map(k => (
                  <div key={k.label} className="rounded-[10px] border border-border bg-background p-3">
                    <div className="flex items-center gap-1.5 mb-1">{k.icon}<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">{k.label}</span></div>
                    <div className="text-[20px] font-bold text-ink tabular-nums">{k.value}</div>
                  </div>
                ))}
              </div>

              {!resultDetail && !resultDetailError && <SectionLoading message="Memuat detail hasil..." className="py-6" />}
              {resultDetailError && (
                <AlertPanel tone="danger" title="Detail hasil gagal dimuat">
                  Server database sedang lambat/sibuk, data soal dan jawaban tetap aman.{" "}
                  <button type="button" className="font-semibold underline" onClick={() => setDetailReload(n => n + 1)}>Coba lagi</button>
                </AlertPanel>
              )}

              {detail.status === "Terjadwal" && (
                <AlertPanel tone="primary" title="Asesmen belum dimulai">
                  Asesmen akan tersedia sesuai jadwal pada {detail.scheduledFor}.
                </AlertPanel>
              )}
              {essayPendingCount > 0 && detailTab !== "esai" && (
                <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-warning/40 bg-warning-light px-4 py-3">
                  <span className="text-[13px] font-semibold text-ink">✍️ {essayPendingCount} jawaban esai menunggu dinilai. Nilai siswa baru muncul setelah semuanya dinilai.</span>
                  <Button variant="default" size="sm" className="ml-auto" onClick={() => setDetailTab("esai")}>Nilai esai sekarang</Button>
                </div>
              )}
              {resultDetail && resultDetail.questions.length === 0 && (
                <AlertPanel tone="danger" title="Asesmen ini tidak punya soal">
                  Siswa akan melihat &quot;Tidak ada soal&quot;. Hapus asesmen ini lalu buat ulang dan pilih soalnya di langkah 2.
                </AlertPanel>
              )}

              {/* Tab switcher — only shown when there are questions */}
              {resultDetail && resultDetail.questions.length > 0 && (
                <div className="flex gap-1 p-1 bg-background rounded-[8px] border border-border">
                  {([
                    { key: "soal" as const, label: "Analisis Soal" },
                    { key: "siswa" as const, label: "Jawaban Siswa" },
                    { key: "sesi" as const, label: "Peserta & Waktu" },
                    ...(resultDetail.questions.some(q => q.type === "esai") ? [{ key: "esai" as const, label: `Nilai Esai${essayPendingCount ? ` (${essayPendingCount})` : ""}` }] : []),
                  ]).map(t => (
                    <button key={t.key} onClick={() => setDetailTab(t.key)}
                      className={cn(
                        "flex-1 rounded-[6px] py-1.5 text-[12px] font-semibold transition-all",
                        detailTab === t.key
                          ? "bg-surface shadow-sm text-ink"
                          : "text-ink-secondary hover:text-ink"
                      )}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* TAB: Analisis Soal */}
              {detailTab === "soal" && resultDetail && resultDetail.questions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-bold text-ink">Soal & Distribusi Jawaban ({resultDetail.questions.length})</h3>
                    {!aiLoading && (
                      <Button variant="outline" className="h-7 text-[11px]" onClick={() => loadAIAnalysis()}
                        title="Hasil disimpan; AI hanya dipanggil lagi kalau ada jawaban siswa baru">
                        <Sparkles className="mr-1 h-3 w-3" />{aiAnalysis ? "Perbarui Analisis AI" : "Analisis AI"}
                      </Button>
                    )}
                    {aiLoading && (
                      <div className="flex items-center gap-1.5 text-[11px] text-primary">
                        <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        AI menganalisis...
                      </div>
                    )}
                  </div>

                  {aiAnalysis?.overallAnalysis && (
                    <AIInsightPanel title="Analisis AI">
                      <p>{aiAnalysis.overallAnalysis}</p>
                    </AIInsightPanel>
                  )}

                  <div className="space-y-3 mt-3">
                    {resultDetail.questions.map((q, i) => {
                      const dist = resultDetail.distributions[q.assessmentQuestionId] ?? { A: 0, B: 0, C: 0, D: 0 };
                      const wrongOpts = (["A","B","C","D"] as const).filter(o => o !== q.correctAnswer);
                      const majorityWrong = wrongOpts.reduce((a,b) => dist[a] > dist[b] ? a : b);
                      const qAnalysis = aiAnalysis?.questionAnalyses?.find(a => a.index === i + 1);

                      return (
                        <div key={q.assessmentQuestionId} className="rounded-[10px] border border-border bg-background p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">{i+1}</span>
                            <p className="text-[12px] font-medium text-ink leading-snug">{q.question}</p>
                          </div>

                          {q.type !== "pg" ? (() => {
                            const rs = resultDetail.studentRows.map(st => st.results[q.assessmentQuestionId]).filter((r): r is NonNullable<typeof r> => !!r);
                            const right = rs.filter(r => r.isCorrect === true).length;
                            const pending = rs.filter(r => r.isCorrect === null).length;
                            const partial = rs.filter(r => r.isCorrect === false && r.earned > 0).length;
                            const pct = (n: number) => rs.length ? Math.round((n / rs.length) * 100) : 0;
                            return (
                              <div className="ml-7 space-y-1.5">
                                <p className="text-[11px] text-ink-secondary"><span className="font-semibold text-ink">{QUESTION_TYPE_LABEL[q.type]}</span> · {q.points} poin · Kunci: {describeKey(q.raw)}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge tone="success">Benar {pct(right)}%</Badge>
                                  {partial > 0 && <Badge tone="warning">Sebagian {pct(partial)}%</Badge>}
                                  <Badge tone="danger">Salah {pct(rs.length - right - pending - partial)}%</Badge>
                                  {pending > 0 && <Badge tone="warning">Belum dinilai {pending}</Badge>}
                                </div>
                              </div>
                            );
                          })() : (
                          <div className="space-y-1.5 ml-7">
                            {(["A","B","C","D"] as const).map(opt => {
                              const pct = dist[opt];
                              const isCorrect = opt === q.correctAnswer;
                              const isMajorityWrong = opt === majorityWrong && !isCorrect;
                              return (
                                <div key={opt}>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={cn(
                                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                                      isCorrect ? "bg-success text-white" : isMajorityWrong ? "bg-danger text-white" : "bg-border/50 text-ink-secondary"
                                    )}>{opt}</span>
                                    <span className={cn("text-[11px] flex-1 leading-snug",
                                      isCorrect ? "text-success font-semibold" : isMajorityWrong ? "text-danger" : "text-ink-secondary"
                                    )}>{q.options[opt]}</span>
                                    <span className={cn("text-[11px] font-bold tabular-nums shrink-0",
                                      isCorrect ? "text-success" : isMajorityWrong ? "text-danger" : "text-ink-tertiary"
                                    )}>{pct}%</span>
                                  </div>
                                  <div className="ml-6 h-1.5 rounded-full bg-border/40 overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all",
                                      isCorrect ? "bg-success" : isMajorityWrong ? "bg-danger" : "bg-border"
                                    )} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          )}

                          <div className="ml-7 flex flex-wrap gap-1.5">
                            <Badge tone="primary">{q.topic}</Badge>
                            <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
                            {q.type === "pg" && dist[majorityWrong] > 30 && <Badge tone="danger">Mayoritas pilih {majorityWrong} ({dist[majorityWrong]}%)</Badge>}
                          </div>

                          {qAnalysis && (
                            <div className="ml-7 rounded-[8px] border border-primary/20 bg-primary-soft p-3 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-primary shrink-0" />
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Analisis Miskonsepsi</span>
                              </div>
                              <p className="text-[11px] text-ink leading-relaxed">{qAnalysis.misconception}</p>
                              <p className="text-[11px] text-ink-secondary leading-relaxed"><strong className="text-ink">Saran:</strong> {qAnalysis.suggestion}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: Jawaban Siswa */}
              {detailTab === "siswa" && resultDetail && resultDetail.questions.length > 0 && (
                <div>
                  <p className="text-[11px] text-ink-secondary mb-3">
                    Jawaban setiap siswa per soal. <span className="text-success font-semibold">Hijau = benar</span>, <span className="text-danger font-semibold">merah = salah</span>.
                  </p>
                  {resultDetail.studentRows.length === 0 ? (
                    <p className="text-[12px] text-ink-tertiary">Tidak ada data siswa untuk kelas ini.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-[10px] border border-border">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-background border-b border-border">
                            <th className="text-left px-3 py-2 font-semibold text-ink sticky left-0 bg-background z-10 min-w-[120px]">Siswa</th>
                            {resultDetail.questions.map((q, i) => (
                              <th key={q.assessmentQuestionId} className="px-2 py-2 font-semibold text-ink-secondary text-center min-w-[36px]" title={q.question}>
                                Q{i+1}
                              </th>
                            ))}
                            <th className="px-3 py-2 font-semibold text-ink text-center min-w-[48px]">Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultDetail.studentRows.map(s => (
                            <tr key={s.studentId} className="border-b border-border/50 hover:bg-background/60">
                              <td className="px-3 py-1.5 font-medium text-ink sticky left-0 bg-surface">{s.name}</td>
                              {resultDetail.questions.map(q => {
                                const ans = s.answers[q.assessmentQuestionId];
                                const isCorrect = ans === q.correctAnswer;
                                if (q.type !== "pg") {
                                  const r = s.results[q.assessmentQuestionId];
                                  const mark = !ans ? null : r?.isCorrect === null ? "⏳" : r?.isCorrect ? "✓" : (r?.earned ?? 0) > 0 ? "½" : "✗";
                                  return (
                                    <td key={q.assessmentQuestionId} className="px-2 py-1.5 text-center" title={ans ? describeAnswer(q.raw, ans) : "Tidak dijawab"}>
                                      {mark ? (
                                        <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                                          mark === "✓" ? "bg-success/15 text-success" : mark === "✗" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning")}>{mark}</span>
                                      ) : <span className="text-ink-tertiary">—</span>}
                                    </td>
                                  );
                                }
                                return (
                                  <td key={q.assessmentQuestionId} className="px-2 py-1.5 text-center">
                                    {ans ? (
                                      <span className={cn(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                                        isCorrect ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                                      )}>{ans}</span>
                                    ) : (
                                      <span className="text-ink-tertiary">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-1.5 text-center font-bold tabular-nums">
                                <span className={cn(s.score == null ? "text-ink-tertiary" : s.score >= 80 ? "text-success" : s.score >= 65 ? "text-primary" : "text-warning")}>
                                  {s.score ?? "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Peserta & Waktu */}
              {detailTab === "sesi" && resultDetail && detailId && (
                <ExamSessionPanel assessmentId={detailId} students={resultDetail.studentRows.map(st => ({ id: st.studentId, name: st.name }))}
                  onChanged={() => { if (activeClass) loadAssessmentResultDetail(detailId, activeClass).then(setResultDetail, () => {}); }} />
              )}

              {/* TAB: Nilai Esai */}
              {detailTab === "esai" && resultDetail && (
                <EssayGradingPanel detail={resultDetail}
                  onGraded={() => { if (detailId && activeClass) loadAssessmentResultDetail(detailId, activeClass).then(setResultDetail, () => {}); }} />
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
              <Button variant="danger" className="mr-auto h-8 text-[12px]" onClick={() => setConfirmDelete({ id: detail.id, title: detail.title })}>
                <X className="mr-1 h-3.5 w-3.5" />Hapus Asesmen
              </Button>
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setDetailId(null)}>Tutup</Button>
              <Button variant="default" className="h-8 text-[12px]" disabled={!resultDetail} onClick={() => {
                if (!resultDetail) return;
                // Only the students who actually submitted THIS assessment.
                const takers = resultDetail.studentRows.filter(s => s.score != null || Object.keys(s.answers).length > 0);
                if (takers.length === 0) {
                  setResultsToast({ message: `Belum ada siswa yang mengumpulkan "${detail.title}", jadi belum ada nilai untuk diekspor.`, tone: "danger" });
                  return;
                }
                const qs = resultDetail.questions;
                const rows: (string | number)[][] = [
                  ["Asesmen", detail.title],
                  [],
                  ["Nama Siswa", "Nilai", "Jawaban Benar", ...qs.map((_, i) => `Soal ${i + 1}`)],
                  ...takers.map(st => {
                    const correct = qs.filter(q => q.type === "pg" ? st.answers[q.assessmentQuestionId] === q.correctAnswer : st.results[q.assessmentQuestionId]?.isCorrect === true).length;
                    return [st.name, st.score ?? "", correct,
                      ...qs.map(q => {
                        const ans = st.answers[q.assessmentQuestionId];
                        if (!ans) return "";
                        if (q.type === "pg") return ans;
                        const r = st.results[q.assessmentQuestionId];
                        return `${describeAnswer(q.raw, ans)}${r ? ` [${r.isCorrect === null ? "belum dinilai" : `${r.earned}/${q.points} poin`}]` : ""}`;
                      })];
                  }),
                ];
                downloadCsv(`Nilai - ${detail.title}.csv`, rows);
              }}>
                <Download className="mr-1.5 h-3.5 w-3.5" />Ekspor Nilai
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.studentCount ? "Siswa sudah mengerjakan asesmen ini" : "Hapus asesmen ini?"}
        message={confirmDelete?.studentCount
          ? `${confirmDelete.studentCount} siswa sudah mengerjakan "${confirmDelete.title}". Jika dihapus, NILAI dan jawaban mereka ikut terhapus permanen. Lanjutkan?`
          : `"${confirmDelete?.title ?? ""}" akan dihapus permanen dan hilang dari daftar siswa. Soal-soalnya tetap ada di bank soal.`}
        confirmLabel={confirmDelete?.studentCount ? "Ya, Hapus Beserta Nilai" : "Hapus Asesmen"}
        confirmVariant="danger"
        onConfirm={async () => {
          const target = confirmDelete;
          if (!target) return;
          const res = await apiPost<{ needsConfirmation?: boolean; studentCount?: number }>(
            "/api/teacher/assessments/delete", { assessmentId: target.id, force: !!target.studentCount });
          if (res.needsConfirmation) { setConfirmDelete({ ...target, studentCount: res.studentCount }); return; }
          setConfirmDelete(null);
          if (res.error) { setResultsToast({ message: `Gagal menghapus: ${res.error}`, tone: "danger" }); return; }
          setAssessmentRows(prev => (prev ?? []).filter(x => x.id !== target.id));
          setDetailId(null);
          setResultsToast({ message: `Asesmen "${target.title}" dihapus`, tone: "success" });
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      {resultsToast && <AppToast message={resultsToast.message} tone={resultsToast.tone} onDismiss={() => setResultsToast(null)} />}
    </div>
  );
}

// ── Teacher Analytics ─────────────────────────────────────────────────────────

type ClassAnalytics = {
  trend: number[]; trendLabels: string[];
  distribution: number[]; distributionLabels: string[];
  topics: { label: string; value: number; count?: number }[];
  completedAssessments: number; classAvg: number | null; weakestTopic: { label: string; value: number } | null;
  approvedAiQuestions: number;
};

// Real class+subject analytics from assessment_attempts / question_attempts
// (the same teacher-readable tables the results page already uses).
async function fetchClassAnalytics(classId: string, subjectId: string): Promise<ClassAnalytics> {
  const [{ data: aRows }, { count: aiCount }] = await Promise.all([
    supabase.from("assessments").select("id, title, open_at, created_at").eq("class_id", classId).eq("subject_id", subjectId),
    supabase.from("questions").select("id", { count: "exact", head: true })
      .eq("class_id", classId).eq("subject_id", subjectId).eq("source", "ai_generated").eq("status", "active"),
  ]);
  const assessmentsList = (aRows ?? []) as Array<{ id: string; title: string; open_at: string | null; created_at: string }>;
  const empty: ClassAnalytics = {
    trend: [], trendLabels: [], distribution: [], distributionLabels: [], topics: [],
    completedAssessments: 0, classAvg: null, weakestTopic: null, approvedAiQuestions: aiCount ?? 0,
  };
  if (assessmentsList.length === 0) return empty;

  const { data: attemptRows } = await supabase
    .from("assessment_attempts")
    .select("id, assessment_id, score")
    .in("assessment_id", assessmentsList.map(x => x.id))
    .in("status", ["submitted", "graded"]);
  const attempts = ((attemptRows ?? []) as Array<{ id: string; assessment_id: string; score: number | null }>).filter(r => r.score != null);
  if (attempts.length === 0) return empty;

  const when = (x: { open_at: string | null; created_at: string }) => parseDbTime(x.open_at ?? x.created_at);
  const ordered = [...assessmentsList].sort((x, y) => when(x) - when(y));
  const perAssessment = ordered
    .map(x => {
      const scores = attempts.filter(t => t.assessment_id === x.id).map(t => Number(t.score));
      return scores.length ? { label: new Date(when(x)).toLocaleDateString("id-ID", { day: "numeric", month: "short" }), avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) } : null;
    })
    .filter((x): x is { label: string; avg: number } => !!x)
    .slice(-8);

  const buckets = [0, 0, 0, 0, 0, 0];
  for (const t of attempts) {
    const v = Number(t.score);
    buckets[v < 50 ? 0 : v < 60 ? 1 : v < 70 ? 2 : v < 80 ? 3 : v < 90 ? 4 : 5] += 1;
  }

  const { data: qaRows } = await supabase
    .from("question_attempts")
    .select("is_correct, assessment_questions(questions(topic))")
    .in("assessment_attempt_id", attempts.map(t => t.id));
  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const r of (qaRows ?? []) as unknown as Array<{ is_correct: boolean | null; assessment_questions: { questions: { topic: string } | null } | null }>) {
    const topic = r.assessment_questions?.questions?.topic;
    if (!topic) continue;
    const cur = topicStats.get(topic) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (r.is_correct) cur.correct += 1;
    topicStats.set(topic, cur);
  }
  const topics = [...topicStats.entries()]
    .map(([label, st]) => ({ label, value: Math.round((st.correct / st.total) * 100), count: st.total }))
    .sort((x, y) => x.value - y.value);

  return {
    trend: perAssessment.map(x => x.avg),
    trendLabels: perAssessment.map(x => x.label),
    distribution: buckets,
    distributionLabels: ["< 50", "50–59", "60–69", "70–79", "80–89", "90–100"],
    topics,
    completedAssessments: new Set(attempts.map(t => t.assessment_id)).size,
    classAvg: Math.round(attempts.reduce((sum, t) => sum + Number(t.score), 0) / attempts.length),
    weakestTopic: topics[0] ?? null,
    approvedAiQuestions: aiCount ?? 0,
  };
}

function TeacherAnalytics() {
  const { teacher, loading: teacherLoading } = useRealTeacherStatus();
  const [activeClass] = useActiveClass();
  const activeAssignment = findActiveAssignment(teacher, activeClass);
  const [topicPopup, setTopicPopup] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);

  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name ?? "…";
  // null = still loading
  const [studentRows, setStudentRows] = useState<Student[] | null>(null);
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const classStudents = studentRows ?? [];
  const activeStats = computeRealClassStats(classStudents);
  const loading = studentRows === null || analytics === null;

  useEffect(() => {
    setStudentRows(null);
    setAnalytics(null);
    if (!activeClass) {
      if (!teacherLoading && teacher && teacher.classes.length === 0) {
        setStudentRows([]);
        setAnalytics({ trend: [], trendLabels: [], distribution: [], distributionLabels: [], topics: [], completedAssessments: 0, classAvg: null, weakestTopic: null, approvedAiQuestions: 0 });
      }
      return;
    }
    let cancelled = false;
    fetchRealClassStudents(activeClass, activeAssignment?.subjectId, activeClassName).then(rows => { if (!cancelled) setStudentRows(rows); });
    if (activeAssignment?.subjectId) {
      fetchClassAnalytics(activeClass, activeAssignment.subjectId).then(r => { if (!cancelled) setAnalytics(r); });
    } else {
      setAnalytics({ trend: [], trendLabels: [], distribution: [], distributionLabels: [], topics: [], completedAssessments: 0, classAvg: null, weakestTopic: null, approvedAiQuestions: 0 });
    }
    return () => { cancelled = true; };
  }, [activeClass, activeAssignment?.subjectId, activeClassName, teacher, teacherLoading]);

  const statCards = [
    { label: "Asesmen selesai", value: analytics ? String(analytics.completedAssessments) : "…", detail: "Punya hasil siswa", tone: "primary" as const },
    { label: "Rata-rata nilai kelas", value: analytics?.classAvg != null ? String(analytics.classAvg) : analytics ? "—" : "…", detail: "Semua asesmen dinilai", tone: "success" as const },
    { label: "Topik paling lemah", value: analytics?.weakestTopic?.label ?? (analytics ? "—" : "…"), detail: analytics?.weakestTopic ? `${analytics.weakestTopic.value}% akurasi rata-rata` : "Belum ada data", tone: "warning" as const },
    { label: "Soal AI disetujui", value: analytics ? String(analytics.approvedAiQuestions) : "…", detail: "Di bank soal kelas ini", tone: "neutral" as const },
  ];
  const topicList = analytics?.topics ?? [];

  const popupTopic = topicList.find(t => t.label === topicPopup);
  const popupRec = topicPopup
    ? teachingRecommendations.find(r => r.topic.toLowerCase() === topicPopup.toLowerCase())
    : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analitik Kelas" title={`Analitik ${activeClassName}`} description={loading ? "Memuat data kelas..." : `Performa ${activeStats.total} siswa berdasarkan data asesmen.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Tren Nilai Kelas</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Rata-rata per asesmen</p>
          {!analytics ? (
            <SectionLoading className="h-[120px] py-0" />
          ) : analytics.trend.length === 0 ? (
            <div className="flex items-center justify-center h-[120px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Data akan muncul setelah asesmen diselesaikan</p>
            </div>
          ) : (
            <SimpleChart data={analytics.trend} labels={analytics.trendLabels} height={120} />
          )}
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Distribusi Nilai</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Jumlah siswa per rentang nilai</p>
          {!analytics ? (
            <SectionLoading className="h-[100px] py-0" />
          ) : analytics.distribution.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Belum ada data asesmen</p>
            </div>
          ) : (
            <SimpleChart data={analytics.distribution} labels={analytics.distributionLabels} type="bar" height={100} />
          )}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-bold text-ink">Akurasi per Topik</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">Persentase jawaban benar siswa per topik · klik topik untuk detail</p>
          </div>
        </div>
        {!analytics ? (
          <SectionLoading />
        ) : topicList.length === 0 ? (
          <div className="flex items-center justify-center py-10 rounded-[8px] border border-dashed border-border">
            <p className="text-[12px] text-ink-tertiary">Data akurasi akan tersedia setelah siswa mengerjakan asesmen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {topicList.map(t => (
              <div key={t.label} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setTopicPopup(t.label)}>
                <TopicBar label={t.label} value={t.value} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-ink">Performa Siswa</h3>
          <span className="text-[11px] text-ink-secondary">{studentRows === null ? "…" : classStudents.length} siswa · {activeClassName}</span>
        </div>
        {studentRows === null ? (
          <SectionLoading message="Memuat data siswa..." />
        ) : classStudents.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12px] text-ink-tertiary">Belum ada siswa aktif di kelas ini.</p>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {(showAllStudents ? classStudents : classStudents.slice(0, 6)).map(s => <StudentPerformanceCard key={s.id} student={s} />)}
          </div>
        )}
        {classStudents.length > 6 && (
          <div className="border-t border-border px-5 py-3 text-center">
            <button onClick={() => setShowAllStudents(p => !p)}
              className="text-[12px] font-semibold text-primary hover:underline">
              {showAllStudents ? "Tampilkan lebih sedikit ↑" : `Lihat semua ${classStudents.length} siswa ↓`}
            </button>
          </div>
        )}
      </div>

      {/* Topic popup dialog */}
      {topicPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setTopicPopup(null)} />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface shadow-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-bold text-ink">{topicPopup}</h2>
                {popupTopic && (
                  <p className="text-[12px] text-ink-secondary mt-0.5">
                    Akurasi rata-rata kelas: <strong className={cn(popupTopic.value < 50 ? "text-danger" : popupTopic.value < 70 ? "text-warning" : "text-success")}>{popupTopic.value}%</strong>
                  </p>
                )}
              </div>
              <button onClick={() => setTopicPopup(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            {popupRec ? (
              <div className="space-y-3">
                <div className="rounded-[8px] bg-background border border-border p-3">
                  <p className="text-[12px] text-ink-secondary">{popupRec.issue}</p>
                </div>
                <div className="rounded-[8px] border border-primary/20 bg-primary-soft p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">Saran AI · {popupRec.estimatedTime}</span>
                  </div>
                  <p className="text-[12px] text-ink">{popupRec.suggestion}</p>
                </div>
              </div>
            ) : popupTopic && popupTopic.value < 50 ? (
              <p className="text-[13px] text-danger">Akurasi kelas untuk topik ini masih rendah ({popupTopic.value}%). Perlu perhatian khusus - pertimbangkan sesi remedial atau latihan tambahan sebelum lanjut ke topik berikutnya.</p>
            ) : popupTopic && popupTopic.value < 70 ? (
              <p className="text-[13px] text-warning">Akurasi kelas untuk topik ini masih di bawah target ({popupTopic.value}%). Latihan tambahan akan membantu memperkuat pemahaman siswa.</p>
            ) : (
              <p className="text-[13px] text-ink-secondary">Topik ini performanya sudah baik. Tidak ada intervensi khusus yang diperlukan.</p>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setTopicPopup(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher Recommendations ───────────────────────────────────────────────────

const REC_DONE_KEY = "catchup_rec_done";
const REC_DONE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function loadRecDone(): Map<string, number> {
  const raw = lsGet<Array<{ id: string; doneAt: number }>>(REC_DONE_KEY);
  if (!raw) return new Map();
  const now = Date.now();
  return new Map(raw.filter(e => now - e.doneAt < REC_DONE_TTL).map(e => [e.id, e.doneAt]));
}

function saveRecDone(map: Map<string, number>) {
  lsSet(REC_DONE_KEY, [...map.entries()].map(([id, doneAt]) => ({ id, doneAt })));
}

function TeacherRecommendations() {
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name ?? teacher?.classes[0]?.name ?? "-";
  const activeSubjectId = findActiveAssignment(teacher, activeClass)?.subjectId;
  const { bank: bankQs, loading: bankLoading } = useQuestionBank(activeClass, activeSubjectId);
  const [recs, setRecs] = useState<typeof teachingRecommendations>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Map of id → timestamp when marked done
  const [doneMap, setDoneMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setDoneMap(loadRecDone());
  }, []);

  // Reset recommendations when class changes so stale data isn't shown
  useEffect(() => {
    setRecs([]);
    setSummary("");
    setError("");
  }, [activeClass]);

  function toggleDone(id: string) {
    setDoneMap(prev => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, Date.now());
      }
      saveRecDone(next);
      return next;
    });
  }

  function clearDone() {
    setDoneMap(new Map());
    lsSet(REC_DONE_KEY, []);
  }

  // Recommendations come from REAL answers (assessment results per topic),
  // and are stored server-side: opening this page reuses the saved result
  // instead of asking the AI again. "Perbarui" regenerates on demand.
  const [recMeta, setRecMeta] = useState<{ updatedAt?: string; stale?: boolean } | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  async function loadRecs(refresh = false) {
    if (!activeClass || !activeSubjectId) return;
    setLoading(true);
    setError("");
    try {
      const analytics = await fetchClassAnalytics(activeClass, activeSubjectId);
      const topicStats = analytics.topics.map(t => ({ topic: t.label, avgSuccessRate: t.value, count: t.count ?? 0 }));
      setHasData(topicStats.length > 0);
      if (topicStats.length === 0) { setRecs([]); setSummary(""); setRecMeta(null); return; }
      const data = await apiPost<{ summary?: string; recommendations?: typeof teachingRecommendations; updatedAt?: string; stale?: boolean }>(
        "/api/recommendations", { topicStats, className: activeClassName, classId: activeClass, subjectId: activeSubjectId, refresh });
      if (data.error) { setError(data.error); return; }
      setSummary(data.summary ?? "");
      setRecs(data.recommendations ?? []);
      setRecMeta({ updatedAt: data.updatedAt, stale: data.stale });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat rekomendasi");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadRecs(); }, [activeClass, activeSubjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = recs.filter(r => !doneMap.has(r.id));
  // Sort done by most recently done first
  const done = recs
    .filter(r => doneMap.has(r.id))
    .sort((a, b) => (doneMap.get(b.id) ?? 0) - (doneMap.get(a.id) ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rekomendasi AI" title={`Rekomendasi — ${activeClassName}`}
        description="Berdasarkan hasil asesmen siswa per topik, AI merekomendasikan intervensi pengajaran berikut."
        actions={hasData ? (
          <Button variant="outline" className="h-8 text-[12px]" disabled={loading} onClick={() => loadRecs(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />Perbarui dengan AI
          </Button>
        ) : undefined} />

      {recMeta?.updatedAt && !loading && (
        <p className="text-[11px] text-ink-tertiary">
          Dibuat {new Date(recMeta.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {recMeta.stale && <span className="ml-1 font-semibold text-warning">· Ada hasil asesmen baru sejak itu - klik &quot;Perbarui dengan AI&quot; kalau mau rekomendasi terbaru.</span>}
        </p>
      )}

      {hasData === false && !loading && (
        <EmptyState icon={Sparkles} title="Belum ada hasil asesmen"
          description="Rekomendasi dibuat dari jawaban siswa. Setelah siswa mengerjakan asesmen di kelas & mapel ini, rekomendasi akan muncul di sini." />
      )}

      {loading && (
        <div className="rounded-card border border-border bg-surface p-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-[13px] text-ink-secondary">AI sedang menganalisis data soal dan menyusun rekomendasi...</p>
        </div>
      )}

      {error && !loading && (
        <AlertPanel tone="danger" title="Gagal memuat rekomendasi">{error}</AlertPanel>
      )}

      {!loading && !error && summary && (
        <AIInsightPanel title="Ringkasan AI">
          <p>{summary}</p>
        </AIInsightPanel>
      )}

      {/* Pending recommendations */}
      {!loading && pending.length > 0 && (
        <div className="space-y-4">
          {pending.map(r => (
            <RecommendationCard key={r.id} rec={r} done={false} onToggle={() => toggleDone(r.id)} />
          ))}
        </div>
      )}

      {!loading && recs.length > 0 && pending.length === 0 && (
        <div className="rounded-[10px] border border-success/20 bg-success/5 px-5 py-4 text-center">
          <p className="text-[13px] font-semibold text-success">Semua rekomendasi sudah diselesaikan!</p>
        </div>
      )}

      {/* Done recommendations section */}
      {!loading && done.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-ink">Rekomendasi yang Sudah Diselesaikan</h3>
              <p className="text-[11px] text-ink-tertiary mt-0.5">Disimpan selama 7 hari · {done.length} item</p>
            </div>
            <button onClick={clearDone}
              className="text-[11px] font-semibold text-ink-secondary hover:text-danger transition-colors underline">
              Hapus Semua
            </button>
          </div>
          <div className="space-y-3">
            {done.map(r => (
              <RecommendationCard key={r.id} rec={r} done={true} onToggle={() => toggleDone(r.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher AI Config ─────────────────────────────────────────────────────────

const AI_STYLE_IDS: Record<string, TeacherAiSettings["activeStyle"]> = { s1: "socratic", s2: "explicit", s3: "analogy" };
const LANGUAGE_STYLE_OPTIONS: SelectOption[] = [
  { value: "santai", label: "Santai", description: "Akrab seperti kakak kelas, boleh emoji" },
  { value: "baku", label: "Baku", description: "Bahasa Indonesia formal seperti guru di kelas" },
];
const HELP_LEVEL_OPTIONS: SelectOption[] = [
  { value: "petunjuk", label: "Petunjuk saja", description: "AI tidak pernah memberi jawaban akhir soal" },
  { value: "bertahap", label: "Bertahap", description: "Petunjuk dulu, jawaban setelah siswa mencoba" },
  { value: "lengkap", label: "Lengkap", description: "Pembahasan lengkap sampai jawaban akhir" },
];

function TeacherAIConfig() {
  const { teacher, loading: teacherLoading } = useRealTeacherStatus();
  const [settings, setSettings] = useState<TeacherAiSettings | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  useEffect(() => {
    if (!teacher) return;
    let cancelled = false;
    fetchTeacherAiSettings(teacher.id).then(s => { if (!cancelled) setSettings(s); });
    return () => { cancelled = true; };
  }, [teacher]);

  // Every change is saved immediately (no separate "Simpan" button to
  // forget) and rolled back with an error toast if the save fails.
  async function update(patch: Partial<TeacherAiSettings>, key: string) {
    if (!teacher || !settings) return;
    const prev = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingKey(key);
    const err = await saveTeacherAiSettings(teacher.id, next);
    setSavingKey(null);
    if (err) {
      setSettings(prev);
      setToast({ message: `Gagal menyimpan pengaturan: ${err}`, tone: "danger" });
    } else {
      setToast({ message: "Pengaturan tersimpan", tone: "success" });
    }
  }

  const [nameDraft, setNameDraft] = useState("");
  const [nameAttempted, setNameAttempted] = useState(false);
  useEffect(() => { if (settings) setNameDraft(settings.personaName); }, [settings?.personaName]); // eslint-disable-line react-hooks/exhaustive-deps
  const nameError = nameAttempted && !nameDraft.trim() ? "Nama AI wajib diisi" : null;
  function saveName() {
    setNameAttempted(true);
    if (!nameDraft.trim() || !settings || nameDraft.trim() === settings.personaName) return;
    update({ personaName: nameDraft.trim() }, "name");
  }

  type ToggleKey = "grounding" | "autoReview" | "parentReports" | "bloomBalance" | "notifyWeak";
  function ToggleRow({ id, label, desc }: { id: ToggleKey; label: string; desc: string }) {
    const on = !!settings?.[id];
    return (
      <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink">{label}</div>
          <div className="text-[12px] text-ink-secondary mt-0.5">{desc}</div>
        </div>
        <button role="switch" aria-checked={on} aria-label={label}
          disabled={!settings || savingKey !== null}
          onClick={() => update({ [id]: !on } as Partial<TeacherAiSettings>, id)}
          className={cn("flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60",
            on ? "border-primary bg-primary" : "border-border bg-border"
          )}>
          <span className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            on ? "translate-x-5" : "translate-x-0.5")} />
        </button>
      </div>
    );
  }

  if (teacherLoading || (teacher && !settings)) {
    return (
      <div className="space-y-6 max-w-3xl">
        <PageHeader eyebrow="Konfigurasi AI" title="Pengaturan AI Companion" />
        <SectionLoading message="Memuat pengaturan AI..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader eyebrow="Konfigurasi AI" title="Pengaturan AI Companion"
        description="Pengaturan ini langsung berlaku untuk AI Companion yang dipakai siswa di kelas yang kamu ajar." />
      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <h3 className="text-[14px] font-bold text-ink mb-1">Persona AI</h3>
        <p className="text-[12px] text-ink-secondary mb-4">Nama dan cara bicara AI saat menjawab siswa.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nama AI" required error={nameError} className="md:col-span-2">
            <div className="flex gap-2">
              <input type="text" value={nameDraft} maxLength={40} placeholder="Contoh: Kak AI, Bu Rina AI"
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); }}
                className={fieldClass(!!nameError)} />
              <Button variant="default" className="h-9 shrink-0 text-[12px]"
                disabled={!settings || savingKey !== null || nameDraft.trim() === settings.personaName}
                onClick={saveName}>{savingKey === "name" ? "Menyimpan..." : "Simpan Nama"}</Button>
            </div>
          </FormField>
          <FormField label="Gaya Bahasa">
            <SelectField value={settings?.languageStyle ?? "santai"} options={LANGUAGE_STYLE_OPTIONS}
              disabled={!settings || savingKey !== null}
              onChange={v => update({ languageStyle: v as TeacherAiSettings["languageStyle"] }, "language")} />
          </FormField>
          <FormField label="Tingkat Bantuan">
            <SelectField value={settings?.helpLevel ?? "bertahap"} options={HELP_LEVEL_OPTIONS}
              disabled={!settings || savingKey !== null}
              onChange={v => update({ helpLevel: v as TeacherAiSettings["helpLevel"] }, "help")} />
          </FormField>
        </div>
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <h3 className="text-[14px] font-bold text-ink mb-1">Gaya Mengajar AI</h3>
        <p className="text-[12px] text-ink-secondary mb-4">Pilih bagaimana AI membantu siswa menjawab pertanyaan.</p>
        <div className="space-y-3">
          {aiStyleOptions.map(opt => {
            const style = AI_STYLE_IDS[opt.id];
            const selected = settings?.activeStyle === style;
            return (
              <button key={opt.id} type="button" disabled={!settings || savingKey !== null}
                onClick={() => !selected && update({ activeStyle: style }, "style")}
                className={cn("w-full text-left rounded-[10px] border p-4 transition-all disabled:cursor-wait",
                  selected ? "border-primary/40 bg-primary-soft" : "border-border hover:border-primary/20"
                )}>
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? "border-primary" : "border-border")}>
                    {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-ink">{opt.label}</div>
                    <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">{opt.description}</p>
                    <div className="mt-2 rounded-[6px] bg-background border border-border px-3 py-2">
                      <p className="text-[11px] text-ink-secondary">Contoh: <em>{opt.example}</em></p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <h3 className="text-[14px] font-bold text-ink mb-4">Perilaku AI</h3>
        <ToggleRow id="grounding" label="Grounded Responses" desc="AI hanya menjawab berdasarkan materi yang diunggah guru. Jika dimatikan, AI boleh menjawab pertanyaan pelajaran di luar materi." />
        <ToggleRow id="autoReview" label="Auto-approve soal AI" desc="Soal AI dari materi langsung masuk bank soal tanpa tinjauan manual." />
        <ToggleRow id="parentReports" label="Laporan orang tua otomatis" desc="Kirim ringkasan performa ke orang tua setiap minggu." />
        <ToggleRow id="bloomBalance" label="Keseimbangan Bloom" desc="Pastikan distribusi level kognitif merata di setiap asesmen." />
        <ToggleRow id="notifyWeak" label="Notifikasi topik lemah" desc="Beri tahu saat akurasi topik turun di bawah 60%." />
      </div>
      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT
// ═══════════════════════════════════════════════════════════════════════════════

function StudentApp({ page }: { page: string }) {
  const [simulatorPage, setSimulatorPage] = useState("pick");

  const screens: Record<string, React.ReactNode> = {
    dashboard: <StudentDashboard />,
    materials: <StudentMaterials />,
    simulator: <StudentSimulator page={simulatorPage} onPageChange={setSimulatorPage} />,
    adaptive: <StudentAdaptive />,
    // Everything about results lives under one "Hasilku" menu with tabs;
    // the old addresses still work and open the matching tab.
    review: <StudentResults tab="review" />,
    "weak-topics": <StudentResults tab="weak-topics" />,
    incorrect: <StudentResults tab="incorrect" />,
    tutor: <StudentTutor />,
    progress: <StudentResults tab="progress" />,
    achievements: <StudentResults tab="achievements" />,
  };

  if (page === "simulator") {
    return screens["simulator"];
  }

  return (
    <AppShell role="student" nav={studentNav} >
      {screens[page] ?? <StudentDashboard />}
    </AppShell>
  );
}

// Small heading for a section inside a Hasilku tab (the page title "Hasilku"
// is already shown above the tabs, so sub-pages don't repeat a big header).
function TabIntro({ text }: { text: string }) {
  return <p className="text-[14px] text-ink-secondary">{text}</p>;
}

// ── Hasilku (student results hub) ─────────────────────────────────────────────

const RESULT_TABS = [
  { key: "progress", label: "Ringkasan", icon: BarChart3, href: "/student/progress" },
  { key: "review", label: "Pembahasan", icon: FileText, href: "/student/review" },
  { key: "weak-topics", label: "Perlu Dilatih", icon: Target, href: "/student/weak-topics" },
  { key: "incorrect", label: "Soal Salah", icon: XCircle, href: "/student/incorrect" },
  { key: "achievements", label: "Prestasi", icon: Trophy, href: "/student/achievements" },
] as const;

function StudentResults({ tab }: { tab: (typeof RESULT_TABS)[number]["key"] }) {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold text-ink leading-tight">Hasilku</h1>
        <p className="text-[14px] text-ink-secondary mt-1">Nilai, pembahasan soal, dan prestasimu.</p>
      </div>
      <div role="tablist" aria-label="Bagian hasil" className="flex gap-1 overflow-x-auto border-b border-border">
        {RESULT_TABS.map(t => {
          const Icon = t.icon;
          const selected = tab === t.key;
          return (
            <button key={t.key} role="tab" aria-selected={selected}
              onClick={() => router.push(t.href)}
              className={cn("-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[14px] transition-colors",
                selected ? "border-primary font-semibold text-primary" : "border-transparent font-medium text-ink-secondary hover:border-border hover:text-ink")}>
              <Icon className="h-4 w-4" aria-hidden="true" />{t.label}
            </button>
          );
        })}
      </div>
      {tab === "progress" && <StudentProgress />}
      {tab === "review" && <StudentReview />}
      {tab === "weak-topics" && <StudentWeakTopics />}
      {tab === "incorrect" && <StudentIncorrect />}
      {tab === "achievements" && <StudentAchievements />}
    </div>
  );
}

// ── Student Materials ─────────────────────────────────────────────────────────

function StudentMaterials() {
  const [matRows, setMats] = useState<MaterialWithFile[] | null>(null);
  const mats = matRows ?? [];
  const [search, setSearch] = useState("");
  // Shared with Ujian/Latihan and remembered across pages.
  const [rememberedSubject, setSubjectFilter] = useSubjectFilter();
  const subjectOptions = [...new Set(mats.map(m => m.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
  const subjectFilter = subjectOptions.includes(rememberedSubject) ? rememberedSubject : "Semua";

  useEffect(() => {
    let cancelled = false;
    fetchStudentMaterialsReal().then(rows => { if (!cancelled) setMats(rows); });
    return () => { cancelled = true; };
  }, []);

  // RLS already scopes the fetch to the student's own class - only text
  // search is applied client-side now.
  const filtered = mats.filter(m => {
    if (subjectFilter !== "Semua" && m.subject !== subjectFilter) return false;
    const q = search.toLowerCase();
    return !q ||
      m.title.toLowerCase().includes(q) ||
      (m.subject ?? "").toLowerCase().includes(q) ||
      (m.chapter ?? "").toLowerCase().includes(q);
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: string; message: string } | null>(null);

  async function downloadMaterial(mat: MaterialWithFile) {
    setDownloadError(null);
    setDownloadingId(mat.id);
    const err = await downloadMaterialFile(mat.id);
    setDownloadingId(null);
    if (err) setDownloadError({ id: mat.id, message: err });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Materi"
        title="Bahan Belajar dari Guru"
        description="Materi yang sudah diunggah gurumu untuk kelasmu."
      />

      {matRows !== null && (
        <SubjectFilter subjects={subjectOptions} value={subjectFilter} onChange={setSubjectFilter}
          counts={Object.fromEntries([["Semua", mats.length], ...subjectOptions.map(sub => [sub, mats.filter(m => m.subject === sub).length])])} />
      )}

      <div className="flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2 max-w-sm">
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
        <input
          type="text"
          placeholder="Cari judul, mapel, atau bab..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-[13px] placeholder:text-ink-tertiary focus:outline-none"
        />
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-[14px] font-bold text-ink">{matRows === null ? "Materi" : `${filtered.length} Materi Tersedia`}</h2>
        </div>
        <div className="p-4 space-y-3">
          {matRows === null ? (
            <SectionLoading message="Memuat materi..." />
          ) : filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                <BookOpen className="h-6 w-6 text-ink-tertiary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink">{search || subjectFilter !== "Semua" ? "Materi tidak ditemukan" : "Belum ada materi"}</p>
                <p className="text-[12px] text-ink-secondary mt-1">{search || subjectFilter !== "Semua" ? "Coba kata kunci atau mata pelajaran lain." : "Gurumu belum mengunggah materi untuk kelasmu. Pantau terus!"}</p>
              </div>
            </div>
          ) : (
            filtered.map(mat => (
              <div key={mat.id} className={cn("flex items-start gap-4 rounded-card border border-border border-l-[6px] bg-surface p-4 hover:shadow-soft transition-all", subjectStyle(mat.subject).accent)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <SubjectBadge subject={mat.subject || "Umum"} size="sm" />
                      <p className="mt-1.5 text-[15px] font-bold text-ink truncate">{mat.title}</p>
                      <p className="text-[12px] text-ink-secondary mt-0.5">
                        {[mat.chapter, mat.type, mat.uploadedAt].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadMaterial(mat)}
                      disabled={downloadingId === mat.id}
                      className="flex items-center gap-1.5 rounded-[6px] border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-ink-secondary hover:border-success/40 hover:text-success transition-colors shrink-0 disabled:opacity-60">
                      {downloadingId === mat.id
                        ? <><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Mengunduh...</>
                        : <><Download className="h-3 w-3" />Unduh</>}
                    </button>
                  </div>
                  {downloadError?.id === mat.id && (
                    <p role="alert" className="mt-1.5 text-[11px] font-medium text-danger">{downloadError.message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StudentAssessmentTabs() {
  const [tab, setTab] = useState<"mendatang" | "selesai" | "tertinggal">("mendatang");
  const [all, setAll] = useState<SavedAssessment[]>([]);
  useEffect(() => {
    fetchStudentAssessments().then(setAll);
  }, []);

  const mendatang = all.filter(a => a.status === "Terjadwal");
  const selesai = all.filter(a => a.status === "Selesai");
  const tertinggal = all.filter(a => a.status === "Berlangsung");

  const tabs = [
    { key: "mendatang" as const, label: "Mendatang", count: mendatang.length },
    { key: "selesai" as const, label: "Selesai", count: selesai.length },
    { key: "tertinggal" as const, label: "Tertinggal", count: tertinggal.length },
  ];

  const list = tab === "mendatang" ? mendatang : tab === "selesai" ? selesai : tertinggal;

  return (
    <div className="rounded-card border border-border bg-surface shadow-sm">
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 py-3 text-[12px] font-semibold transition-colors relative",
              tab === t.key ? "text-primary" : "text-ink-secondary hover:text-ink"
            )}>
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                tab === t.key ? "bg-primary text-white" : "bg-border/60 text-ink-secondary"
              )}>{t.count}</span>
            )}
            {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </div>
      <div className="p-4">
        {list.length === 0 ? (
          <p className="text-[12px] text-ink-tertiary text-center py-4">
            {tab === "mendatang" ? "Belum ada asesmen terjadwal dari gurumu."
              : tab === "selesai" ? "Belum ada asesmen yang diselesaikan."
              : "Tidak ada asesmen yang tertinggal."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {list.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-[10px] border border-border bg-background p-3">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px]",
                  tab === "selesai" ? "bg-success/10" : tab === "tertinggal" ? "bg-danger/10" : "bg-primary/10"
                )}>
                  {tab === "selesai" ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : tab === "tertinggal" ? <AlertCircle className="h-4 w-4 text-danger" />
                    : <Clock className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-ink truncate">{a.title}</p>
                  <p className="text-[10px] text-ink-secondary">{a.type} · {a.scheduledFor}</p>
                </div>
                {tab === "selesai" && a.avgScore && (
                  <span className={cn("text-[14px] font-bold tabular-nums",
                    a.avgScore >= 80 ? "text-success" : a.avgScore >= 65 ? "text-primary" : "text-warning"
                  )}>{a.avgScore}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <CatchMeUpCard
        studentName={studentProfile.name}
        weakTopics={weakTopics.slice(0, 2).map(t => t.topic)}
        nextAction={weakTopics.length > 0 ? `Kamu masih lemah di ${weakTopics[0].topic}. Latihan 15 menit hari ini bisa langsung meningkatkan pemahamanmu!` : "Kerjakan asesmen dari gurumu untuk mendapatkan analisis performa personal."}
        onStart={() => router.push("/student/adaptive")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 space-y-5">
          <div className="rounded-card border border-border bg-surface shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-ink">Tren Nilai</h3>
                <p className="text-[12px] text-ink-secondary">Semester ini · naik 4 poin dari bulan lalu</p>
              </div>
              <div className="text-right">
                <div className="text-[28px] font-bold text-success tabular-nums">{studentProfile.avgScore}</div>
                <div className="text-[11px] text-ink-secondary">Rata-rata</div>
              </div>
            </div>
            {scoreTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[90px] rounded-[8px] border border-dashed border-border">
                <p className="text-[12px] text-ink-tertiary">Data tren akan muncul setelah mengerjakan asesmen</p>
              </div>
            ) : (
              <SimpleChart data={scoreTrend} labels={scoreTrendLabels} height={90} />
            )}
          </div>

          <div className="rounded-card border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h3 className="text-[14px] font-bold text-ink">Hasil Asesmen Terbaru</h3>
              <Link href="/student/review" className="text-[12px] font-semibold text-primary hover:underline">Lihat semua</Link>
            </div>
            <div className="px-5 py-3">
              {studentResults.length === 0 ? (
                <p className="text-[12px] text-ink-tertiary text-center py-4">Belum ada hasil asesmen. Kerjakan asesmen dari gurumu!</p>
              ) : studentResults.map(r => (
                <RecentAssessmentRow key={r.id} title={r.assessmentTitle} type={r.type} date={r.date}
                  score={r.score} classAvg={r.classAvg} rank={r.rank} />
              ))}
            </div>
          </div>

          <StudentAssessmentTabs />
        </div>

        <div className="space-y-5">
          <div className="rounded-card border border-border bg-surface shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-ink mb-4">Statistik Kamu</h3>
            <div className="flex items-center gap-4 mb-4">
              <ScoreCircle score={studentProfile.avgScore} size={72} />
              <div>
                <div className="text-2xl font-bold text-ink">#{studentProfile.rank}</div>
                <div className="text-[12px] text-ink-secondary">dari {students.length} siswa</div>
                <div className="text-[13px] text-warning font-semibold mt-1">🔥 {studentProfile.streak} hari</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {studentProgressStats.map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-ink-secondary">{s.label}</span>
                  <span className={cn("text-[13px] font-bold tabular-nums",
                    s.tone === "success" ? "text-success" : s.tone === "warning" ? "text-warning" : s.tone === "primary" ? "text-primary" : "text-ink"
                  )}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" />
                <h3 className="text-[13px] font-bold text-ink">Papan Peringkat</h3>
              </div>
              <Badge tone="neutral">Top 5</Badge>
            </div>
            <div className="p-2">
              {leaderboard.map(l => <LeaderboardEntry key={l.rank} {...l} />)}
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-ink">Topik Lemah</h3>
              <Link href="/student/weak-topics" className="text-[11px] font-semibold text-primary hover:underline">Lihat semua</Link>
            </div>
            <div className="space-y-3">
              {weakTopics.slice(0, 3).map(t => <TopicBar key={t.id} label={t.topic} value={t.accuracyRate} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Simulator ─────────────────────────────────────────────────────────

type StudentAssessmentItem = {
  id: string; title: string; type: string | null; subject: string;
  durationMinutes: number | null; openAt: string | null; closeAt: string | null;
  questionCount: number; state: "DRAFT" | "UPCOMING" | "OPEN" | "COMPLETED" | "MISSED" | "CLOSED";
  inProgress: boolean; message: string; score: number | null;
};

// Question counts come from /api/student/assessments: students can't read
// assessment_questions directly (by design), so a client-side count was
// always 0 and every assessment showed "0 soal · Belum ada soal".
function SimulatorPickList({ onStart }: { onStart: (id: string, item: StudentAssessmentItem) => void }) {
  const [items, setItems] = useState<StudentAssessmentItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noClass, setNoClass] = useState(false);
  // Shared with Materi/Latihan and remembered across pages.
  const [subjectFilter, setSubjectFilter] = useSubjectFilter();

  // Loaded on open, then refreshed every minute and whenever the student
  // comes back to the tab - an exam a teacher publishes during class shows
  // up without a manual reload.
  useEffect(() => {
    let cancelled = false;
    const load = () => apiPost<{ assessments: StudentAssessmentItem[]; noClass?: boolean }>("/api/student/assessments", {}).then(res => {
      if (cancelled) return;
      if (res.error) { setLoadError(prev => prev ?? res.error ?? null); setItems(prev => prev ?? []); return; }
      setLoadError(null);
      setNoClass(!!res.noClass);
      setItems(res.assessments ?? []);
    });
    load();
    const timer = setInterval(load, 60_000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  // Re-render exactly when any assessment opens or closes.
  const now = useScheduleClock((items ?? []).flatMap(a => [
    a.openAt ? new Date(a.openAt).getTime() : null,
    a.closeAt ? new Date(a.closeAt).getTime() : null,
  ]));

  if (items === null) return <SectionLoading message="Memuat asesmen..." />;
  if (loadError) return <AlertPanel tone="danger" title="Gagal memuat asesmen">{loadError}</AlertPanel>;
  if (noClass) return <AlertPanel tone="primary" title="Belum ditempatkan di kelas">Hubungi admin sekolahmu agar kamu ditempatkan di kelas.</AlertPanel>;

  // State is recomputed against the live clock so cards move between
  // sections at the scheduled minute without a reload.
  const live = items.map(a => {
    const openMs = a.openAt ? new Date(a.openAt).getTime() : null;
    const closeMs = a.closeAt ? new Date(a.closeAt).getTime() : null;
    let state = a.state;
    if (state === "UPCOMING" && openMs !== null && now >= openMs) state = "OPEN";
    if ((state === "OPEN" || state === "UPCOMING") && !a.inProgress && closeMs !== null && now >= closeMs) state = "MISSED";
    return { ...a, state, openMs, closeMs };
  });

  const subjects = [...new Set(live.map(a => a.subject))].sort((x, y) => x.localeCompare(y, "id"));
  const activeFilter = subjects.includes(subjectFilter) ? subjectFilter : "Semua";
  const actionable = live.filter(a => a.state === "OPEN" || a.state === "UPCOMING");
  const counts: Record<string, number> = { Semua: actionable.length };
  for (const sub of subjects) counts[sub] = actionable.filter(a => a.subject === sub).length;
  const shown = activeFilter === "Semua" ? live : live.filter(a => a.subject === activeFilter);

  const openNow = shown.filter(x => x.state === "OPEN");
  const upcoming = shown.filter(x => x.state === "UPCOMING").sort((x, y) => (x.openMs ?? 0) - (y.openMs ?? 0));
  const past = shown.filter(x => x.state === "COMPLETED" || x.state === "MISSED" || x.state === "CLOSED");

  if (live.length === 0) return (
    <div className="flex items-center justify-center rounded-card border border-dashed border-border py-10">
      <p className="text-[13px] text-ink-tertiary">Belum ada asesmen dari gurumu untuk kelasmu.</p>
    </div>
  );

  const fmt = (ms: number) => new Date(ms).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const meta = (a: StudentAssessmentItem) =>
    [a.type, `${a.questionCount} soal`, a.durationMinutes ? `${a.durationMinutes} menit` : "tanpa batas waktu"].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <SubjectFilter subjects={subjects} value={activeFilter} onChange={setSubjectFilter} counts={counts} />
      {openNow.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-success">Bisa dikerjakan sekarang</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openNow.map(a => {
              const ready = a.questionCount > 0;
              return (
                <div key={a.id} role="button" tabIndex={ready ? 0 : -1} aria-disabled={!ready}
                  onClick={() => ready && onStart(a.id, a)}
                  onKeyDown={e => { if (ready && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onStart(a.id, a); } }}
                  className={cn("rounded-card border border-l-[6px] bg-surface p-5 transition-all", subjectStyle(a.subject).accent,
                    ready ? "cursor-pointer border-border hover:shadow-soft" : "cursor-not-allowed border-border opacity-60")}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <SubjectBadge subject={a.subject} />
                      <div className="mt-2 text-[16px] font-bold text-ink">{a.title}</div>
                      <div className="text-[11px] text-ink-secondary mt-0.5">{meta(a)}</div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {a.inProgress && <Badge tone="primary">Lanjutkan pengerjaan</Badge>}
                        {a.closeMs !== null && <Badge tone="warning">Ditutup {fmt(a.closeMs)} · {formatCountdown(a.closeMs - now)} lagi</Badge>}
                        {!ready && <Badge tone="warning">Guru belum menambahkan soal</Badge>}
                      </div>
                    </div>
                    {ready && (
                      <span className="shrink-0 self-center rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-white">
                        {a.inProgress ? "Lanjutkan" : "Mulai"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-primary">Akan datang</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map(a => (
              <div key={a.id} aria-disabled style={{ borderLeftStyle: "solid" }}
                className={cn("rounded-card border border-dashed border-l-[6px] bg-surface p-5", subjectStyle(a.subject).accent)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <SubjectBadge subject={a.subject} />
                    <div className="mt-2 text-[16px] font-bold text-ink">{a.title}</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">{meta(a)}</div>
                    <p className="mt-2 text-[12px] text-ink">
                      Dibuka <strong>{fmt(a.openMs!)}</strong>{a.closeMs !== null && <> · ditutup <strong>{fmt(a.closeMs)}</strong></>}
                    </p>
                    <Badge tone="primary" className="mt-2">Dibuka dalam {formatCountdown(a.openMs! - now)}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {openNow.length === 0 && upcoming.length === 0 && (
        <div className="flex items-center justify-center rounded-card border border-dashed border-border py-8">
          <p className="text-[14px] text-ink-tertiary">
            {activeFilter === "Semua" ? "Tidak ada ujian yang sedang dibuka atau terjadwal. 🎉" : `Tidak ada ujian ${activeFilter} yang sedang dibuka atau terjadwal.`}
          </p>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">Sudah selesai / ditutup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {past.map(a => (
              <div key={a.id} className={cn("flex items-center gap-3 rounded-card border border-border border-l-[6px] bg-background p-4", subjectStyle(a.subject).accent)}>
                <div className="flex-1 min-w-0">
                  <SubjectBadge subject={a.subject} size="sm" />
                  <div className="mt-1 text-[14px] font-semibold text-ink truncate">{a.title}</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">{meta(a)}</div>
                </div>
                {a.state === "COMPLETED"
                  ? <Badge tone="success">{a.score != null ? `Nilai ${a.score}` : "Selesai"}</Badge>
                  : <Badge tone="danger">{a.state === "MISSED" ? "Terlewat" : "Ditutup"}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── "Coba dulu": one example question before every real exam ───────────────
// Same layout as the real exam (header, timer, options, confidence, palette)
// so students learn the format with zero risk. Leaving the tab here only
// shows a warning explaining that in the real exam it would end the exam.
const TRIAL_QUESTION = {
  question: "Contoh soal: Berapakah hasil dari 7 + 5?",
  options: [{ key: "A", text: "10" }, { key: "B", text: "11" }, { key: "C", text: "12" }, { key: "D", text: "13" }],
  correct: "C",
};

function ExamTrial({ item, onCancel, onStart }: { item: StudentAssessmentItem; onCancel: () => void; onStart: () => void }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"yakin" | "cukup" | "ragu" | null>(null);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [seconds, setSeconds] = useState(5 * 60);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds(x => Math.max(0, x - 1)), 1000);
    const warn = () => setTabWarnings(n => n + 1);
    const onVisibility = () => { if (document.hidden) warn(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", warn);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", warn);
    };
  }, []);

  const Hint = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 rounded-[8px] bg-primary-soft px-3 py-2 text-[12px] text-primary">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{n}</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );

  // Portalled to <body>: a full-screen layer must not be positioned
  // relative to some ancestor of the exam list.
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Badge tone="warning">CONTOH</Badge>
            <div className="truncate text-[13px] font-bold text-ink">{item.title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-warning/30 bg-warning-light px-3 py-1 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-warning" />
            <span className="text-[12px] font-semibold text-warning">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
          <h1 className="text-[20px] font-bold text-ink">Coba dulu sebelum ujian 👋</h1>
          <p className="mt-1 text-[14px] text-ink-secondary">
            Ini contoh soal supaya kamu tahu cara mengerjakannya. Jawabanmu di sini <strong>tidak dinilai</strong>.
            Ujian aslinya: <strong>{item.questionCount} soal</strong>{item.durationMinutes ? <>, waktu <strong>{item.durationMinutes} menit</strong></> : ", tanpa batas waktu"}.
          </p>
        </div>

        {tabWarnings > 0 && (
          <AlertPanel tone="danger" title={`Kamu tadi pindah tab/aplikasi${tabWarnings > 1 ? ` (${tabWarnings}×)` : ""}`}>
            Di sini cuma peringatan. Tapi saat <strong>ujian asli</strong>, pindah tab, pindah aplikasi, atau keluar layar penuh akan <strong>langsung mengakhiri ujian</strong> dan jawabanmu dikumpulkan.
          </AlertPanel>
        )}

        <Hint n={1}>Jam di kanan atas menunjukkan sisa waktu. Kalau waktu habis, jawabanmu dikumpulkan otomatis.</Hint>

        <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="neutral">Soal 1</Badge>
            <span className="ml-auto text-[11px] tabular-nums text-ink-tertiary">{answer ? 1 : 0}/1 terjawab</span>
          </div>
          <p className="text-[16px] font-medium leading-relaxed text-ink">{TRIAL_QUESTION.question}</p>
        </div>

        <Hint n={2}>Klik salah satu pilihan untuk menjawab. Kamu boleh mengganti jawaban selama ujian belum selesai.</Hint>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {TRIAL_QUESTION.options.map(opt => {
            const sel = answer === opt.key;
            return (
              <button key={opt.key} type="button" onClick={() => setAnswer(opt.key)}
                className={cn("flex items-center gap-3 rounded-[10px] border p-4 text-left transition-all",
                  sel ? "border-primary/40 bg-primary-soft" : "border-border bg-surface hover:border-primary/20 hover:bg-background")}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                  sel ? "bg-primary text-white" : "border border-border bg-background text-ink-secondary")}>{opt.key}</span>
                <span className="text-[14px] font-medium text-ink">{opt.text}</span>
              </button>
            );
          })}
        </div>
        {answer && (
          <p className={cn("text-[13px] font-semibold", answer === TRIAL_QUESTION.correct ? "text-success" : "text-warning")}>
            {answer === TRIAL_QUESTION.correct
              ? "✅ Benar! Di ujian asli, kamu baru tahu benar/salahnya setelah ujian selesai."
              : "Belum tepat (jawabannya C. 12) - tidak apa-apa, ini cuma contoh. Di ujian asli, benar/salah baru terlihat setelah selesai."}
          </p>
        )}

        <Hint n={3}>Pilih seberapa yakin kamu. Ini membantu gurumu tahu bagian mana yang masih membingungkan (tidak memengaruhi nilai).</Hint>
        <div className="flex gap-2 rounded-card border border-border bg-surface p-4 shadow-sm">
          {([["yakin", "Yakin"], ["cukup", "Cukup Yakin"], ["ragu", "Tidak Yakin"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setConfidence(key)}
              className={cn("flex-1 rounded-[8px] border px-3 py-2.5 text-[12px] font-semibold transition-all",
                confidence === key ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-background text-ink-secondary")}>
              {label}
            </button>
          ))}
        </div>

        <Hint n={4}>Pakai tombol nomor atau Sebelumnya/Berikutnya untuk pindah soal. Nomor hijau = sudah dijawab. Kalau sudah selesai, tekan <strong>Selesaikan Asesmen</strong> di kanan atas.</Hint>
        <div className="flex justify-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white ring-2 ring-primary/30">1</span>
          {Array.from({ length: Math.min(4, Math.max(0, item.questionCount - 1)) }, (_, i) => (
            <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold text-ink-secondary">{i + 2}</span>
          ))}
          {item.questionCount > 5 && <span className="self-center text-[12px] text-ink-tertiary">… {item.questionCount}</span>}
        </div>

        <AlertPanel tone="warning" title="Aturan ujian asli">
          Ujian akan masuk layar penuh. Jangan pindah tab, jangan buka aplikasi lain, dan jangan keluar dari layar penuh sampai selesai.
        </AlertPanel>

        <div className="flex flex-wrap justify-between gap-3 pb-8">
          <Button variant="outline" className="h-10" onClick={onCancel} disabled={starting}>← Kembali</Button>
          <Button variant="success" className="h-10 px-6 text-[14px]" disabled={starting}
            onClick={() => { setStarting(true); onStart(); }}>
            {starting ? "Membuka ujian..." : "Saya Siap, Mulai Ujian →"}
          </Button>
        </div>
      </main>
    </div>,
    document.body,
  );
}

type ExamQuestion = {
  assessmentQuestionId: string; topic: string; difficulty: string; question: string; points: number;
  displayOptions: { key: string; text: string }[];
  // TKA types (migration 026); older servers send only displayOptions
  type?: QuestionType; imageUrl?: string | null;
  statements?: string[];
  matchLeft?: string[]; matchRight?: { index: number; text: string }[];
};

function examPartCount(q: ExamQuestion): number {
  return q.type === "benar_salah" ? (q.statements?.length ?? 0) : q.type === "menjodohkan" ? (q.matchLeft?.length ?? 0) : 0;
}
function examAnswered(q: ExamQuestion | undefined, ans: string | undefined): boolean {
  return !!q && isAnswered(q.type ?? "pg", ans, examPartCount(q));
}
function parseJsonArray(ans: string | undefined, n: number): (string | number | null)[] {
  let arr: unknown[] = [];
  try { const v = JSON.parse(ans ?? "[]"); if (Array.isArray(v)) arr = v; } catch { /* empty */ }
  return Array.from({ length: n }, (_, i) => (arr[i] ?? null) as string | number | null);
}

const MATCH_COLORS = ["#2563eb", "#16a34a", "#d97706", "#db2777", "#7c3aed", "#0891b2", "#dc2626", "#65a30d"];

/**
 * Matching answered by drawing lines: drag from an item on the left to its
 * pair on the right (or tap left, then tap right). Tapping a connected left
 * item again removes its line. Each right item belongs to one left item.
 * The value is the right item's ORIGINAL index per left item (or null).
 */
function MatchingLines({ left, right, value, onChange }: {
  left: string[];
  right: { index: number; text: string }[];
  value: (string | number | null)[];
  onChange: (v: (number | null)[]) => void;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const leftRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = React.useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const [active, setActive] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; x: number; y: number } | null>(null);
  const [, relayout] = useState(0);
  const conn = value.map(v => (v === null || v === undefined || v === "" ? null : Number(v)));

  useEffect(() => {
    const ro = new ResizeObserver(() => relayout(n => n + 1));
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, []);

  function connect(l: number, r: number) {
    const next = conn.map(v => (v === r ? null : v)); // a right item has one partner
    next[l] = r;
    onChange(next);
    setActive(null);
  }
  function anchor(el: HTMLElement | null | undefined, side: "right" | "left") {
    const box = boxRef.current?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    if (!box || !r) return null;
    return { x: (side === "right" ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top };
  }
  function rightAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest("[data-match-right]") as HTMLElement | null;
    return el ? Number(el.dataset.matchRight) : null;
  }

  const lines = conn.map((r, l) => {
    if (r === null) return null;
    const a = anchor(leftRefs.current[l], "right");
    const b = anchor(rightRefs.current.get(r), "left");
    return a && b ? { l, a, b } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const dragFrom = drag ? anchor(leftRefs.current[drag.from], "right") : null;
  const colorOf = (l: number) => MATCH_COLORS[l % MATCH_COLORS.length];
  const leftOfRight = (r: number) => conn.findIndex(v => v === r);

  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold text-primary">Tarik garis dari kotak kiri ke pasangannya di kanan (atau ketuk kiri, lalu ketuk kanan).</p>
      <div ref={boxRef} className="relative grid grid-cols-[1fr_minmax(2.5rem,6rem)_1fr] items-start select-none" style={{ touchAction: "none" }}
        onPointerMove={e => { if (drag) { const box = boxRef.current!.getBoundingClientRect(); setDrag({ ...drag, x: e.clientX - box.left, y: e.clientY - box.top }); } }}
        onPointerUp={e => {
          if (!drag) return;
          const r = rightAt(e.clientX, e.clientY);
          if (r !== null) connect(drag.from, r);
          setDrag(null);
        }}
        onPointerLeave={() => setDrag(null)}>
        <div className="space-y-2.5">
          {left.map((text, l) => (
            <button key={l} type="button" ref={el => { leftRefs.current[l] = el; }}
              onPointerDown={e => {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                const box = boxRef.current!.getBoundingClientRect();
                setDrag({ from: l, x: e.clientX - box.left, y: e.clientY - box.top });
              }}
              onClick={() => {
                if (conn[l] !== null && active !== l) { const next = [...conn]; next[l] = null; onChange(next); setActive(null); return; }
                setActive(active === l ? null : l);
              }}
              style={conn[l] !== null ? { borderColor: colorOf(l) } : undefined}
              className={cn("relative flex w-full items-center rounded-[10px] border-2 bg-surface px-3 py-2.5 pr-5 text-left text-[13px] font-medium text-ink transition-colors",
                active === l ? "border-primary bg-primary-soft" : conn[l] === null ? "border-border hover:border-primary/40" : "")}>
              {text}
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white"
                style={{ background: conn[l] !== null ? colorOf(l) : "#94a3b8" }} />
            </button>
          ))}
        </div>
        <div />
        <div className="space-y-2.5">
          {right.map(r => {
            const owner = leftOfRight(r.index);
            return (
              <button key={r.index} type="button" data-match-right={r.index} ref={el => { rightRefs.current.set(r.index, el); }}
                onClick={() => { if (active !== null) connect(active, r.index); }}
                style={owner >= 0 ? { borderColor: colorOf(owner) } : undefined}
                className={cn("relative flex w-full items-center rounded-[10px] border-2 bg-surface px-3 py-2.5 pl-5 text-left text-[13px] text-ink transition-colors",
                  owner < 0 && (active !== null ? "border-primary/40 hover:bg-primary-soft" : "border-border"))}>
                <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{ background: owner >= 0 ? colorOf(owner) : "#94a3b8" }} />
                {r.text}
              </button>
            );
          })}
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {lines.map(({ l, a, b }) => (
            <line key={l} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorOf(l)} strokeWidth={3} strokeLinecap="round" />
          ))}
          {drag && dragFrom && (
            <line x1={dragFrom.x} y1={dragFrom.y} x2={drag.x} y2={drag.y} stroke={colorOf(drag.from)} strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" />
          )}
        </svg>
      </div>
      <p className="mt-2 text-[11px] text-ink-tertiary">Ketuk kotak kiri yang sudah tersambung untuk menghapus garisnya.</p>
    </div>
  );
}

// Question picture that can be enlarged: tap to open a zoom view on top of
// the page (same tab, so exam lockdown is unaffected). Zoom with the
// buttons, mouse wheel or pinch; drag to move around when zoomed in.
// Close with the big button, by tapping the dark area, or with Back.
function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const pinchRef = React.useRef<{ d: number; s: number } | null>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const zoomTo = (v: number) => { const n = Math.min(5, Math.max(1, Math.round(v * 100) / 100)); setScale(n); if (n === 1) setPos({ x: 0, y: 0 }); };
  const close = React.useCallback(() => { setOpen(false); setScale(1); setPos({ x: 0, y: 0 }); }, []);
  // In an exam, Back closes the picture instead of trying to leave.
  useEffect(() => {
    if (!open) return;
    setExamOverlayCloser(close);
    return () => setExamOverlayCloser(null);
  }, [open, close]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group relative mt-4 block max-w-full" aria-label={`Perbesar ${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} draggable={false} className={className} />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Search className="h-3 w-3" />Perbesar
        </span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-ink/95" role="dialog" aria-label="Gambar diperbesar">
          <div className="flex items-center justify-center gap-2 border-b border-white/10 bg-ink px-3 py-2.5">
            <button type="button" onClick={() => zoomTo(scale - 0.5)} className="h-10 w-10 rounded-full bg-white/15 text-[20px] font-bold text-white hover:bg-white/25" aria-label="Perkecil">−</button>
            <span className="w-14 text-center text-[13px] font-semibold text-white">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => zoomTo(scale + 0.5)} className="h-10 w-10 rounded-full bg-white/15 text-[20px] font-bold text-white hover:bg-white/25" aria-label="Perbesar">+</button>
            <button type="button" onClick={() => zoomTo(1)} className="h-10 rounded-full bg-white/15 px-3 text-[12px] font-semibold text-white hover:bg-white/25">Ukuran awal</button>
          </div>
          <div className="relative flex-1 overflow-hidden" style={{ touchAction: "none" }}
            onClick={e => { if (e.target === e.currentTarget && !dragRef.current?.moved) close(); }}
            onWheel={e => zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
            onPointerDown={e => {
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                pinchRef.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale };
              } else dragRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false };
            }}
            onPointerMove={e => {
              if (!pointers.current.has(e.pointerId)) return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2 && pinchRef.current) {
                const [a, b] = [...pointers.current.values()];
                zoomTo(pinchRef.current.s * Math.hypot(a.x - b.x, a.y - b.y) / pinchRef.current.d);
              } else if (dragRef.current && scale > 1) {
                const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
                if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
                setPos({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
              }
            }}
            onPointerUp={e => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinchRef.current = null; setTimeout(() => { dragRef.current = null; }, 0); }}
            onPointerCancel={e => { pointers.current.delete(e.pointerId); pinchRef.current = null; dragRef.current = null; }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-h-[90%] max-w-[94%] select-none object-contain"
              style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`, transition: dragRef.current || pinchRef.current ? "none" : "transform 120ms" }} />
          </div>
          <div className="flex flex-col items-center gap-1.5 bg-ink px-4 pb-5 pt-3">
            <button type="button" onClick={close}
              className="flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white text-[15px] font-bold text-ink shadow-lg hover:bg-white/90">
              <X className="h-5 w-5" />Tutup gambar &amp; kembali ke soal
            </button>
            <p className="text-[11px] text-white/60">Atau ketuk area gelap / tombol kembali · cubit atau tombol +/− untuk zoom</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Answer area for one exam question, per question type. */
function ExamAnswerInput({ q, value, onChange }: { q: ExamQuestion; value: string | undefined; onChange: (v: string) => void }) {
  const type = q.type ?? "pg";
  if (type === "isian") {
    return (
      <div>
        <input type="text" value={value ?? ""} maxLength={200} placeholder="Tulis jawaban singkatmu (angka atau kata)..."
          onChange={e => onChange(e.target.value)}
          className="w-full select-text rounded-[10px] border border-border bg-surface p-3.5 text-[15px] text-ink focus:border-primary focus:outline-none" />
        <p className="mt-1 text-[11px] text-ink-tertiary">Jawaban singkat, misalnya angka hasil hitungan.</p>
      </div>
    );
  }
  if (type === "esai") {
    return (
      <div>
        <textarea rows={8} value={value ?? ""} maxLength={5000} placeholder="Tulis jawabanmu di sini..."
          onChange={e => onChange(e.target.value)}
          className="w-full select-text resize-y rounded-[10px] border border-border bg-surface p-3.5 text-[14px] leading-relaxed text-ink focus:border-primary focus:outline-none" />
        <p className="mt-1 text-right text-[11px] text-ink-tertiary">{(value ?? "").length}/5000 · dinilai oleh guru</p>
      </div>
    );
  }
  if (type === "benar_salah") {
    const st = q.statements ?? [];
    const vals = parseJsonArray(value, st.length);
    return (
      <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
        {st.map((text, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-border p-3.5 last:border-0 sm:flex-row sm:items-center">
            <p className="flex-1 text-[13px] text-ink"><span className="mr-1.5 font-semibold text-ink-secondary">{i + 1}.</span>{text}</p>
            <div className="flex shrink-0 gap-2">
              {(["B", "S"] as const).map(v => (
                <button key={v} type="button" onClick={() => onChange(JSON.stringify(vals.map((x, j) => j === i ? v : x)))}
                  className={cn("rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors",
                    vals[i] === v ? "border-primary bg-primary text-white" : "border-border bg-background text-ink-secondary hover:border-primary/30")}>
                  {v === "B" ? "Benar" : "Salah"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (type === "menjodohkan") {
    const left = q.matchLeft ?? [];
    return <MatchingLines left={left} right={q.matchRight ?? []} value={parseJsonArray(value, left.length)}
      onChange={vals => onChange(JSON.stringify(vals))} />;
  }
  const complex = type === "pg_kompleks";
  const picked = complex ? decodeComplex(value) : [];
  return (
    <div>
      {complex && <p className="mb-2 text-[12px] font-semibold text-primary">Pilih SEMUA jawaban yang benar (bisa lebih dari satu).</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {q.displayOptions.map((opt) => {
          const sel = complex ? picked.includes(opt.key) : value === opt.key;
          return (
            <button key={opt.key} type="button"
              onClick={() => onChange(complex ? encodeComplex(sel ? picked.filter(k => k !== opt.key) : [...picked, opt.key]) : opt.key)}
              className={cn("flex items-center gap-3 rounded-[10px] border p-3.5 sm:p-4 text-left transition-all",
                sel ? "border-primary/40 bg-primary-soft" : "border-border bg-surface hover:border-primary/20 hover:bg-background"
              )}>
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center text-[12px] font-bold transition-colors",
                complex ? "rounded-[6px]" : "rounded-full",
                sel ? "bg-primary text-white" : "bg-background border border-border text-ink-secondary"
              )}>{complex && sel ? "✓" : opt.key}</span>
              <span className="text-[13px] font-medium text-ink">{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
type ExamSession = { attemptId: string; assessmentId: string; title: string; deadlineAt: number | null; allowReview: boolean; questions: ExamQuestion[] };

// In-progress exam answers live on the device, keyed by ATTEMPT, so a
// refresh, a dropped connection or a failed submit never loses them; they
// are removed only after the server has accepted the submission.
type SavedExamProgress = { answers: Record<number, string>; confidence: Record<number, "yakin" | "cukup" | "ragu">; current: number };
const examProgressKey = (attemptId: string) => `catchup_exam_progress_${attemptId}`;
function loadExamProgress(attemptId: string): SavedExamProgress | null {
  try { const raw = localStorage.getItem(examProgressKey(attemptId)); return raw ? JSON.parse(raw) as SavedExamProgress : null; } catch { return null; }
}
function saveExamProgress(attemptId: string, p: SavedExamProgress) {
  try { localStorage.setItem(examProgressKey(attemptId), JSON.stringify(p)); } catch { /* storage full/blocked */ }
}
function clearExamProgress(attemptId: string) {
  try {
    localStorage.removeItem(examProgressKey(attemptId));
    localStorage.removeItem("catchup_exam_active_id");
    localStorage.removeItem("catchup_exam_session"); // legacy key
  } catch { /* ignore */ }
}

function StudentSimulator({ page, onPageChange }: { page: string; onPageChange: (p: string) => void }) {
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [noQuestionsAlert, setNoQuestionsAlert] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confidence, setConfidence] = useState<Record<number, "yakin" | "cukup" | "ragu">>({});
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(0);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [kioskWarning, setKioskWarning] = useState(false);
  const [trialFor, setTrialFor] = useState<StudentAssessmentItem | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const finishedRef = React.useRef(finished);
  finishedRef.current = finished;
  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const examSessionRef = React.useRef(examSession);
  examSessionRef.current = examSession;
  const warningShownRef = React.useRef(false);

  function triggerKioskWarning() {
    if (finishedRef.current || warningShownRef.current) return;
    warningShownRef.current = true;
    setKioskWarning(true);
  }

  const [kioskReason, setKioskReason] = useState("");
  const enterFullscreen = requestExamFullscreen;
  const exitFullscreen = exitExamFullscreen;

  // Grading is entirely server-side (correct_answer is never sent to the
  // client before this point, per supabase/migrations/009_secure_grading.sql)
  // - the client submits raw answers and the /submit route computes score.
  // Submission. Answers stay saved on the device until the server confirms
  // them; if the connection drops, the student sees a "waiting for
  // internet" screen and the submission is retried automatically.
  const submittingRef = React.useRef(false);
  const [waitingNetwork, setWaitingNetwork] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [pendingEssays, setPendingEssays] = useState(0);

  const endReasonRef = React.useRef<string | null>(null);
  async function autoSubmit(reason?: string) {
    if (finishedRef.current) return;
    if (reason && !endReasonRef.current) endReasonRef.current = reason;
    finishedRef.current = true; // stops the timer, lockdown and further edits
    exitFullscreen();
    await trySubmit();
  }

  async function trySubmit() {
    const session = examSessionRef.current;
    if (!session) { setFinished(true); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    const ans = answersRef.current;
    const answersByQid: Record<string, string> = {};
    session.questions.forEach((q, i) => { if (ans[i]) answersByQid[q.assessmentQuestionId] = ans[i]; });

    type SubmitResult = {
      score?: number; correctCount?: number; totalQuestions?: number; allowReview?: boolean; error?: string; alreadySubmitted?: boolean;
      pendingCount?: number;
      review?: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string; yourAnswer: string | null; isCorrect: boolean; type?: QuestionType }>;
    };
    let data: SubmitResult | null = null;
    try {
      data = await authedFetch(`/api/student/assessment/${session.assessmentId}/submit`, {
        attemptId: session.attemptId, answers: answersByQid, endReason: endReasonRef.current,
      }) as SubmitResult | null;
    } catch {
      data = null; // network failure
    }
    submittingRef.current = false;

    if (!data) {
      // No response (offline / server unreachable): keep answers, retry.
      setWaitingNetwork(true);
      return;
    }
    setWaitingNetwork(false);
    clearExamProgress(session.attemptId);
    refreshStudentOverview(); // score, rank, XP, streak changed

    if (data.error) {
      // A definitive answer from the server (already submitted on another
      // tap/device, or the exam window closed) - don't retry.
      setSubmitNotice(data.alreadySubmitted ? "Jawabanmu sudah terkumpul sebelumnya." : data.error);
      setFinished(true);
      return;
    }

    // null = essays still waiting for the teacher (no score yet)
    const score = data.score ?? null;
    const correctCount = data.correctCount ?? 0;
    setFinalScore(score);
    setFinalCorrect(correctCount);
    setPendingEssays(data.pendingCount ?? 0);
    const resultId = `result_${Date.now()}`;
    saveResult({
      id: resultId,
      assessmentId: session.assessmentId,
      assessmentTitle: session.title,
      type: "Asesmen",
      date: new Date().toLocaleDateString("id-ID"),
      score: score ?? 0,
      totalQuestions: data.totalQuestions ?? session.questions.length,
      correctCount,
      answers: Object.fromEntries(Object.entries(ans).map(([k, v]) => [k, v])),
    });
    // Only surfaced when the teacher enabled allow_review - matches the
    // same allow_review-gated reveal enforced server-side (migration 009).
    if (data.allowReview && data.review) {
      const review = data.review;
      const incorrectQs: StoredIncorrectQ[] = review
        .map((r, i) => ({ r, i }))
        .filter(item => item.r.isCorrect === false && !!item.r.yourAnswer && (item.r.type ?? "pg") === "pg")
        .map(({ r, i }) => ({
          id: `${resultId}_${i}`,
          assessmentId: session.assessmentId,
          assessmentTitle: session.title,
          topic: session.questions[i]?.topic ?? "",
          question: r.question,
          yourAnswer: r.yourAnswer!,
          correctAnswer: r.correctAnswer,
          explanation: r.explanation ?? "",
          date: new Date().toLocaleDateString("id-ID"),
          options: r.options,
        }));
      if (incorrectQs.length > 0) saveIncorrectQuestions(incorrectQs);
    }
    setFinished(true);
  }

  // While waiting for the network: retry when the browser reports it is
  // back online, and every 10s as a fallback.
  useEffect(() => {
    if (!waitingNetwork) return;
    const retry = () => { trySubmit(); };
    window.addEventListener("online", retry);
    const t = setInterval(retry, 10_000);
    return () => { window.removeEventListener("online", retry); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingNetwork]);

  async function startExam(assessmentId: string) {
    // Must run synchronously inside the click that started the exam -
    // browsers only allow fullscreen from a user gesture.
    enterFullscreen();
    const data = await authedFetch(`/api/student/assessment/${assessmentId}/start`, {}) as {
      attemptId?: string; title?: string; deadlineAt?: number | null; allowReview?: boolean; questions?: ExamQuestion[]; error?: string;
      savedAnswers?: Record<string, string>;
    } | null;
    if (!data || data.error || !data.attemptId || !data.questions?.length) {
      setStartError(data?.error ?? null);
      setNoQuestionsAlert(true);
      return;
    }
    try { localStorage.setItem("catchup_exam_active_id", assessmentId); } catch {}
    setExamSession({
      attemptId: data.attemptId, assessmentId, title: data.title ?? "Asesmen",
      deadlineAt: data.deadlineAt ?? null, allowReview: !!data.allowReview, questions: data.questions,
    });
    // Resuming (refresh / reconnect): restore this attempt's saved answers
    // instead of starting blank.
    const saved = loadExamProgress(data.attemptId);
    // Answers kept on the server (exam reopened by the teacher) when this
    // device has none stored.
    const fromServer: Record<number, string> = {};
    data.questions.forEach((q, i) => { const v = data.savedAnswers?.[q.assessmentQuestionId]; if (v) fromServer[i] = v; });
    setCurrent(saved?.current ?? 0);
    setAnswers(saved?.answers && Object.keys(saved.answers).length ? saved.answers : fromServer);
    setConfidence(saved?.confidence ?? {});
    onPageChange("exam");
  }

  // On exam start: fullscreen + restore session (resuming after a refresh
  // re-calls /start, which is idempotent for an already in-progress attempt)
  React.useEffect(() => {
    if (page !== "exam") return;
    enterFullscreen();
    if (!examSessionRef.current) {
      const savedId = (() => { try { return localStorage.getItem("catchup_exam_active_id"); } catch { return null; } })();
      if (savedId) startExam(savedId);
      else onPageChange("pick");
    }
    return () => { exitFullscreen(); };
  }, [page]);

  // Persist in-progress answers to localStorage (survives refresh; the
  // deadline itself is always re-derived from the server, never trusted
  // from this local cache)
  React.useEffect(() => {
    const attemptId = examSession?.attemptId;
    if (page !== "exam" || !attemptId || finished) return;
    saveExamProgress(attemptId, { answers, confidence, current });
  }, [answers, confidence, current, page, examSession?.attemptId, finished]);

  // Extra time given by the teacher mid-exam: re-check the deadline every
  // 30 seconds and tell the student when it moved.
  const [timeNotice, setTimeNotice] = useState<string | null>(null);
  React.useEffect(() => {
    const session = examSession;
    if (finished || page !== "exam" || !session) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data: { session: auth } } = await supabase.auth.getSession();
        if (!auth) return;
        const res = await fetch(`/api/student/assessment/${session.assessmentId}/deadline?attemptId=${session.attemptId}`, { headers: { Authorization: `Bearer ${auth.access_token}` } });
        const body = await res.json() as { deadlineAt?: number | null };
        if (cancelled || body.deadlineAt === undefined || body.deadlineAt === session.deadlineAt) return;
        const added = body.deadlineAt && session.deadlineAt ? Math.round((body.deadlineAt - session.deadlineAt) / 60000) : 0;
        setExamSession(prev => prev ? { ...prev, deadlineAt: body.deadlineAt ?? null } : prev);
        if (added > 0) setTimeNotice(`Guru menambah waktu ${added} menit ⏱`);
      } catch { /* offline - try again next round */ }
    };
    const t = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [finished, page, examSession]);
  React.useEffect(() => {
    if (!timeNotice) return;
    const t = setTimeout(() => setTimeNotice(null), 6000);
    return () => clearTimeout(t);
  }, [timeNotice]);

  // Countdown timer, driven by the server-computed deadline (duration_minutes
  // / close_at) rather than a hardcoded 45-minute constant
  React.useEffect(() => {
    if (finished || page !== "exam" || !examSession?.deadlineAt) return;
    const deadline = examSession.deadlineAt;
    function tick() {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) autoSubmit("Waktu habis");
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [finished, page, examSession?.deadlineAt]);

  // KIOSK: shared lockdown (same rules as practice) - leaving the page,
  // switching apps or exiting fullscreen ends the exam; copy/paste,
  // right-click, printing and shortcuts are blocked.
  useExamLockdown(page === "exam" && !finished && !!examSession, reason => {
    setKioskReason(reason);
    triggerKioskWarning();
    autoSubmit(reason); // submit right away - not when the dialog is dismissed
  }, () => setBackNotice(true));
  const [backNotice, setBackNotice] = useState(false);
  useEffect(() => {
    if (!backNotice) return;
    const t = setTimeout(() => setBackNotice(false), 4000);
    return () => clearTimeout(t);
  }, [backNotice]);

  // Online / offline detection
  React.useEffect(() => {
    if (typeof navigator !== "undefined") setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // ── Pick screen ──
  if (page === "pick") {
    return (
      <AppShell role="student" nav={studentNav}>
        <div className="space-y-6">
          <PageHeader eyebrow="Ujian" title="Ujian dari Guru"
            description="Pilih ujian yang sudah dibuka, lalu kerjakan sampai selesai." />
          <AlertPanel tone="danger" title="Selama ujian, jangan pindah ke tab atau aplikasi lain">
            Berpindah tab, meminimalkan jendela, atau keluar layar penuh akan otomatis menyelesaikan dan mengumpulkan jawaban kamu.
          </AlertPanel>
          <SimulatorPickList onStart={(id, item) => {
            // Resuming an exam already in progress goes straight back in;
            // a new one shows the "coba dulu" example first.
            if (item.inProgress) startExam(id);
            else setTrialFor(item);
          }} />
          {trialFor && (
            <ExamTrial item={trialFor} onCancel={() => setTrialFor(null)}
              onStart={() => { const id = trialFor.id; startExam(id).finally(() => setTrialFor(null)); }} />
          )}
          {noQuestionsAlert && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setNoQuestionsAlert(false)} />
              <div className="relative w-full max-w-sm rounded-card border border-border bg-surface shadow-xl p-6 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-warning mx-auto" />
                <div>
                  <p className="text-[15px] font-bold text-ink">Asesmen Belum Bisa Diakses</p>
                  <p className="text-[13px] text-ink-secondary mt-1">{startError ?? "Asesmen ini belum tersedia — mungkin belum waktunya, sudah berakhir, atau belum ada soal. Hubungi gurumu untuk info lebih lanjut."}</p>
                </div>
                <Button variant="default" className="w-full h-9" onClick={() => setNoQuestionsAlert(false)}>Tutup</Button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-3">Latihan Mandiri</p>
            <p className="text-[12px] text-ink-secondary mb-3">Latihan tanpa nilai dan bisa diulang sepuasnya. Tetap berjalan di layar penuh - jangan pindah tab sampai selesai.</p>
            <Link href="/student/adaptive"
              className="inline-flex items-center gap-3 rounded-card border border-dashed border-primary/30 bg-primary-soft p-4 cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-primary">Mulai Latihan Adaptif</div>
                <div className="text-[11px] text-primary/70 mt-0.5">AI menyesuaikan soal berdasarkan kemampuanmu · Tidak dinilai</div>
              </div>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Waiting for the network to submit ──
  if (waitingNetwork) {
    const n = Object.keys(answers).length;
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <div className="max-w-md rounded-card border border-warning/30 bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning-light">
            <WifiOff className="h-8 w-8 text-warning" />
          </div>
          <h2 className="mt-4 text-[20px] font-bold text-ink">Menunggu internet...</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
            Ujianmu sudah selesai. <strong>{n} jawaban aman tersimpan</strong> di perangkat ini dan akan dikirim otomatis begitu internet tersambung lagi.
          </p>
          <p className="mt-2 text-[13px] font-semibold text-warning">Jangan tutup halaman ini dulu.</p>
          <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-ink-tertiary">
            <span className="h-3 w-3 rounded-full border-2 border-warning border-t-transparent animate-spin" />Mencoba mengirim setiap 10 detik
          </div>
          <Button variant="outline" className="mt-5" onClick={() => trySubmit()}>Coba kirim sekarang</Button>
        </div>
      </div>
    );
  }

  // ── Finished screen ──
  if (finished) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-light">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">Asesmen Selesai!</h2>
            {submitNotice
              ? <p className="text-[14px] text-ink-secondary mt-1">{submitNotice}</p>
              : pendingEssays > 0 || finalScore === null
                ? <p className="mt-2 max-w-sm text-[14px] font-medium text-ink-secondary">Jawabanmu sudah terkumpul. Ada soal esai yang dinilai guru, jadi <b>nilaimu muncul setelah guru selesai menilai</b>.</p>
                : <p className="text-[14px] text-ink-secondary mt-1">{finalCorrect} dari {examSession?.questions.length ?? 0} soal benar</p>}
          </div>
          {!submitNotice && finalScore !== null && pendingEssays === 0 && <ScoreCircle score={finalScore} size={96} />}
          {!submitNotice && (finalScore === null || pendingEssays > 0) && (
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-border text-center">
              <span className="text-[26px] font-bold text-ink-tertiary">–</span>
              <span className="text-[10px] text-ink-tertiary">menunggu</span>
            </div>
          )}
          <Button variant="default" onClick={() => { onPageChange("pick"); setFinished(false); setSubmitNotice(null); setCurrent(0); setAnswers({}); setTimeLeft(0); setExamSession(null); }}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  const examQuestions = examSession?.questions ?? [];
  const examTitle = examSession?.title ?? "Asesmen";
  const total = examQuestions.length;

  // Guard: if page is exam but no questions loaded, go back to pick
  if (page === "exam" && total === 0) {
    return (
      <AppShell role="student" nav={studentNav}>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-warning" />
          <p className="text-[15px] font-bold text-ink">Tidak ada soal di asesmen ini</p>
          <Button variant="default" onClick={() => onPageChange("pick")}>Kembali ke Daftar Asesmen</Button>
        </div>
      </AppShell>
    );
  }

  const currentQ = examQuestions[current];
  const answeredCount = examQuestions.filter((q, i) => examAnswered(q, answers[i])).length;
  // No deadline (assessment without duration/close time) -> no countdown,
  // instead of a misleading frozen 00:00.
  const deadlineAt = examSession?.deadlineAt ?? null;
  const secsLeft = deadlineAt ? (timeLeft || Math.max(0, Math.round((deadlineAt - Date.now()) / 1000))) : 0;
  const timerMins = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const timerSecs = String(secsLeft % 60).padStart(2, "0");
  const timerCritical = !!deadlineAt && secsLeft < 300;

  return (
    <div className="min-h-dvh bg-background flex flex-col select-none">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-[12px] font-semibold text-white">
          <WifiOff className="h-3.5 w-3.5" />
          Koneksi internet terputus — jawaban tersimpan lokal, akan tersinkron saat online kembali
        </div>
      )}

      {timeNotice && (
        <div role="status" className="fixed left-1/2 top-16 z-[121] -translate-x-1/2 rounded-full bg-success px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
          {timeNotice}
        </div>
      )}
      {backNotice && (
        <div role="alert" className="fixed left-1/2 top-16 z-[120] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
          Tombol kembali tidak bisa dipakai saat ujian. Kumpulkan lewat &quot;Selesaikan Ujian&quot;.
        </div>
      )}

      {/* Exam header — NO exit button */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/98 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-[13px] font-bold text-ink truncate">{examTitle}</div>
            <Badge tone="primary">Soal {current + 1}/{total}</Badge>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 tabular-nums",
              timerCritical ? "border-danger/30 bg-danger/10" : "border-warning/30 bg-warning-light"
            )}>
              <Clock className={cn("h-3.5 w-3.5", timerCritical ? "text-danger" : "text-warning")} />
              <span className={cn("text-[12px] font-semibold", timerCritical ? "text-danger" : "text-warning")}>
                {deadlineAt ? `${timerMins}:${timerSecs}` : "Tanpa batas waktu"}
              </span>
            </div>
            {/* Only submit — no exit */}
            <Button variant="success" className="h-8 text-[12px]" onClick={() => setConfirmSubmit(true)}>
              Selesaikan Asesmen
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
      </header>

      {/* Question body */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-5">
          <div className="rounded-card border border-border bg-surface p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Badge tone="neutral">Soal {current + 1}</Badge>
              {currentQ.type && currentQ.type !== "pg" && <Badge tone="primary">{QUESTION_TYPE_LABEL[currentQ.type]}</Badge>}
              {currentQ.points > 1 && <Badge tone="neutral">{currentQ.points} poin</Badge>}
              <span className="ml-auto text-[11px] text-ink-tertiary tabular-nums">
                {answeredCount}/{total} terjawab
              </span>
            </div>
            <p className="whitespace-pre-line text-[15px] sm:text-[16px] font-medium text-ink leading-relaxed">{currentQ.question}</p>
            {currentQ.imageUrl && (
              <ZoomableImage src={currentQ.imageUrl} alt={`Gambar soal ${current + 1}`}
                className="max-h-80 w-auto max-w-full rounded-[8px] border border-border object-contain" />
            )}
          </div>

          <ExamAnswerInput q={currentQ} value={answers[current]}
            onChange={v => setAnswers(prev => ({ ...prev, [current]: v }))} />

          {/* Confidence selector */}
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <p className="text-[12px] font-semibold text-ink-secondary mb-3">
              Seberapa yakin kamu dengan jawaban ini?
            </p>
            <div className="flex gap-2">
              {([
                { key: "yakin" as const, label: "Yakin", icon: ThumbsUp, bg: confidence[current] === "yakin" ? "border-success/40 bg-success-light text-success" : "border-border bg-background text-ink-secondary hover:border-success/30" },
                { key: "cukup" as const, label: "Cukup Yakin", icon: HelpCircle, bg: confidence[current] === "cukup" ? "border-warning/40 bg-warning-light text-warning" : "border-border bg-background text-ink-secondary hover:border-warning/30" },
                { key: "ragu" as const, label: "Tidak Yakin", icon: AlertCircle, bg: confidence[current] === "ragu" ? "border-danger/40 bg-danger-light text-danger" : "border-border bg-background text-ink-secondary hover:border-danger/30" },
              ] as const).map(({ key, label, icon: Icon, bg }) => (
                <button key={key}
                  onClick={() => setConfidence(prev => ({ ...prev, [current]: key }))}
                  className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border px-3 py-2.5 text-[12px] font-semibold transition-all", bg)}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{key === "yakin" ? "Yakin" : key === "cukup" ? "Cukup" : "Ragu"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="outline" className="h-9"
              disabled={current === 0}
              onClick={() => setCurrent(c => Math.max(0, c - 1))}>
              ← Sebelumnya
            </Button>
            {current === total - 1 ? (
              // Last question: the forward button finishes the exam instead
              // of going grey (it opens the same confirmation as the header).
              <Button variant="success" className="h-9" onClick={() => setConfirmSubmit(true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />Selesaikan Ujian
              </Button>
            ) : (
              <Button variant="default" className="h-9"
                onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}>
                Berikutnya →
              </Button>
            )}
          </div>

          {/* Question palette */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {Array.from({ length: total }, (_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn("h-8 w-8 rounded-full text-[11px] font-semibold transition-colors",
                  current === i ? "bg-primary text-white ring-2 ring-primary/30" :
                  examAnswered(examQuestions[i], answers[i]) ? "bg-success-light text-success border border-success/30" :
                  "bg-background border border-border text-ink-secondary hover:border-primary/30"
                )}>{i + 1}</button>
            ))}
          </div>
        </div>
      </main>

      {/* Submit confirmation - lists unanswered questions so the student
          can jump back to them before submitting */}
      {confirmSubmit && (() => {
        const unanswered = Array.from({ length: total }, (_, i) => i).filter(i => !examAnswered(examQuestions[i], answers[i]));
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setConfirmSubmit(false)} />
            <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl">
              {unanswered.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
                    <h2 className="text-[17px] font-bold text-ink">Masih ada {unanswered.length} soal yang belum dijawab!</h2>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-secondary">Klik nomor soal untuk kembali dan menjawabnya:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {unanswered.map(i => (
                      <button key={i} type="button" onClick={() => { setCurrent(i); setConfirmSubmit(false); }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-warning bg-warning-light text-[14px] font-bold text-warning hover:bg-warning hover:text-white">
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[12px] text-ink-tertiary">Soal yang tidak dijawab dihitung salah. Setelah dikumpulkan, jawaban tidak bisa diubah.</p>
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmSubmit(false)}>Kembali Mengerjakan</Button>
                    <Button variant="danger" size="sm" onClick={() => { setConfirmSubmit(false); warningShownRef.current = true; autoSubmit(); }}>
                      Tetap Kumpulkan
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[17px] font-bold text-ink">Kumpulkan jawaban?</h2>
                  <p className="mt-2 text-[13px] text-ink-secondary">Semua {total} soal sudah dijawab. 👍 Setelah dikumpulkan, jawaban tidak bisa diubah.</p>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmSubmit(false)}>Periksa Lagi</Button>
                    <Button variant="success" size="sm" onClick={() => { setConfirmSubmit(false); warningShownRef.current = true; autoSubmit(); }}>
                      Kumpulkan
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Kiosk warning dialog */}
      <ConfirmDialog
        open={kioskWarning}
        title="Ujian Berakhir"
        message={`${kioskReason || "Kamu meninggalkan mode ujian."} Ujian otomatis berakhir dan jawabanmu sudah dikumpulkan.`}
        confirmLabel="Lihat Hasil"
        cancelLabel="Tutup"
        confirmVariant="default"
        onConfirm={() => { setKioskWarning(false); autoSubmit(); }}
        onCancel={() => { setKioskWarning(false); autoSubmit(); }}
      />
    </div>
  );
}

// ── Student Adaptive ──────────────────────────────────────────────────────────

type PracticeQuestion = {
  id: string; question: string; options: { A: string; B: string; C: string; D: string; E?: string }; topic: string; difficulty: string;
  // any auto-graded TKA format (server sends the display payload, never the key)
  type?: QuestionType; imageUrl?: string | null;
  displayOptions?: { key: string; text: string }[]; statements?: string[];
  matchLeft?: string[]; matchRight?: { index: number; text: string }[];
};

function practiceAsExamQuestion(q: PracticeQuestion): ExamQuestion {
  return {
    assessmentQuestionId: q.id, topic: q.topic, difficulty: q.difficulty, question: q.question, points: 1,
    type: q.type ?? "pg", imageUrl: q.imageUrl ?? null,
    displayOptions: q.displayOptions ?? (["A", "B", "C", "D", "E"] as const).filter(k => q.options?.[k]).map(k => ({ key: k, text: q.options[k] as string })),
    statements: q.statements, matchLeft: q.matchLeft, matchRight: q.matchRight,
  };
}

async function authedFetch(path: string, body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Truly adaptive practice: one question at a time, graded immediately.
// 2 correct in a row -> next question one level harder; 2 wrong in a row ->
// one level easier, plus the explanation as reinforcement before moving on.
const LEVELS = ["Mudah", "Sedang", "Sulit"] as const;
type Level = typeof LEVELS[number];
const ADAPTIVE_SESSION_LENGTH = 10;
const ADAPTIVE_STREAK = 2;

type AdaptiveResult = { q: PracticeQuestion; level: Level; answer: string; isCorrect: boolean; partial?: boolean; correctAnswer: string; keyText?: string; explanation: string };

function AdaptiveSession({ subjectId, startLevel, topic, onFinish }: { subjectId: string; startLevel: Level; topic?: string; onFinish: () => void }) {
  const [level, setLevel] = useState<Level>(startLevel);
  const [currentQ, setCurrentQ] = useState<PracticeQuestion | null>(null);
  const [loadingQ, setLoadingQ] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<AdaptiveResult | null>(null);
  const [levelChange, setLevelChange] = useState<"up" | "down" | null>(null);
  const [results, setResults] = useState<AdaptiveResult[]>([]);
  const [done, setDone] = useState(false);
  const [lockReason, setLockReason] = useState("");
  // Prefetched questions per level, and every id already shown.
  const pools = React.useRef<Record<Level, PracticeQuestion[]>>({ Mudah: [], Sedang: [], Sulit: [] });
  const seen = React.useRef(new Set<string>());
  const inflight = React.useRef<Partial<Record<Level, Promise<void>>>>({});

  function fill(lv: Level): Promise<void> {
    if (inflight.current[lv]) return inflight.current[lv]!;
    const p = (async () => {
      const data = await authedFetch("/api/student/practice/questions", {
        subjectId, topic: topic && topic !== "Semua" ? topic : undefined, difficulty: lv, count: 4,
        exclude: [...seen.current, ...LEVELS.flatMap(l => pools.current[l].map(q => q.id))],
      }) as { questions?: PracticeQuestion[]; error?: string } | null;
      if (data?.error) throw new Error(data.error);
      const fresh = (data?.questions ?? []).filter(q => !seen.current.has(q.id) && !pools.current[lv].some(x => x.id === q.id));
      pools.current[lv].push(...fresh);
    })().finally(() => { delete inflight.current[lv]; });
    inflight.current[lv] = p;
    return p;
  }

  // Next question at `lv`; falls back to the nearest level that has one.
  async function nextQuestion(lv: Level) {
    setLoadingQ(true);
    setLoadError(null);
    try {
      if (pools.current[lv].length === 0) await fill(lv);
      const order = [lv, ...LEVELS.filter(l => l !== lv).sort((a, b) => Math.abs(LEVELS.indexOf(a) - LEVELS.indexOf(lv)) - Math.abs(LEVELS.indexOf(b) - LEVELS.indexOf(lv)))];
      let picked: PracticeQuestion | undefined;
      for (const l of order) {
        if (pools.current[l].length === 0 && l !== lv) await fill(l).catch(() => {});
        picked = pools.current[l].shift();
        if (picked) break;
      }
      if (!picked) { setCurrentQ(null); setLoadError("Soal untuk topik ini sudah habis. Coba topik lain, ya!"); return; }
      seen.current.add(picked.id);
      setCurrentQ(picked);
      setSelected(null);
      setFeedback(null);
      // Warm up the neighbouring levels so a level change doesn't wait.
      const i = LEVELS.indexOf(lv);
      for (const l of [LEVELS[i - 1], LEVELS[i + 1]]) if (l && pools.current[l].length === 0) fill(l).catch(() => {});
      if (pools.current[lv].length < 2) fill(lv).catch(() => {});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat soal. Coba lagi.");
    } finally {
      setLoadingQ(false);
    }
  }

  useEffect(() => { nextQuestion(startLevel); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useExamLockdown(!done && !loadError, reason => {
    setLockReason(reason);
    finish(results);
  }, () => setBackNotice(true));
  const [backNotice, setBackNotice] = useState(false);
  useEffect(() => {
    if (!backNotice) return;
    const t = setTimeout(() => setBackNotice(false), 4000);
    return () => clearTimeout(t);
  }, [backNotice]);

  function finish(all: AdaptiveResult[]) {
    const wrong = all.filter(r => !r.isCorrect);
    if (wrong.length > 0) saveIncorrectQuestions(wrong.map(r => ({
      id: `adaptive_${Date.now()}_${r.q.id}`,
      assessmentId: "adaptive",
      assessmentTitle: `Latihan Adaptif${topic && topic !== "Semua" ? ` – ${topic}` : ""}`,
      topic: r.q.topic ?? "",
      question: r.q.question,
      yourAnswer: r.answer,
      correctAnswer: r.correctAnswer,
      explanation: r.explanation ?? "",
      date: new Date().toLocaleDateString("id-ID"),
      options: { A: r.q.options.A, B: r.q.options.B, C: r.q.options.C, D: r.q.options.D, ...(r.q.options.E ? { E: r.q.options.E } : {}) },
    })));
    setDone(true);
    exitExamFullscreen();
  }

  async function check() {
    if (!currentQ || !selected || checking) return;
    setChecking(true);
    const r = await authedFetch("/api/student/practice/submit", { questionId: currentQ.id, answer: selected }) as
      { isCorrect?: boolean; partial?: boolean; correctAnswer?: string | null; keyText?: string; explanation?: string; error?: string } | null;
    setChecking(false);
    if (!r || r.error || typeof r.isCorrect !== "boolean") { setLoadError(r?.error ?? "Jawaban gagal dikirim. Periksa internetmu lalu coba lagi."); return; }
    const result: AdaptiveResult = { q: currentQ, level, answer: selected, isCorrect: r.isCorrect, partial: !!r.partial, correctAnswer: r.correctAnswer ?? "", keyText: r.keyText, explanation: r.explanation ?? "" };
    const all = [...results, result];
    setResults(all);
    setFeedback(result);
    // Streak of the last answers at this level decides the next level.
    const tail = all.slice(-ADAPTIVE_STREAK);
    const i = LEVELS.indexOf(level);
    if (tail.length === ADAPTIVE_STREAK && tail.every(x => x.isCorrect && x.level === level) && i < LEVELS.length - 1) setLevelChange("up");
    else if (tail.length === ADAPTIVE_STREAK && tail.every(x => !x.isCorrect && x.level === level) && i > 0) setLevelChange("down");
    else setLevelChange(null);
  }

  function next() {
    if (results.length >= ADAPTIVE_SESSION_LENGTH) { finish(results); return; }
    const i = LEVELS.indexOf(level);
    const nextLevel = levelChange === "up" ? LEVELS[i + 1] : levelChange === "down" ? LEVELS[i - 1] : level;
    setLevel(nextLevel);
    setLevelChange(null);
    nextQuestion(nextLevel);
  }

  function exitPractice() {
    exitExamFullscreen();
    onFinish();
  }

  if (done) {
    const correct = results.filter(r => r.isCorrect).length;
    const score = results.length ? Math.round((correct / results.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        {lockReason && (
          <AlertPanel tone="warning" title="Latihan dihentikan">{lockReason} Jawaban yang sudah diisi tetap dinilai.</AlertPanel>
        )}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-light">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-ink">Latihan Selesai!</h2>
          <p className="text-[14px] text-ink-secondary mt-1">{correct} dari {results.length} soal benar · tingkat terakhir: <span className="font-semibold text-ink">{level}</span></p>
        </div>
        <ScoreCircle score={score} size={96} />
        <div className="flex flex-wrap justify-center gap-1.5">
          {results.map((r, i) => (
            <span key={i} title={`Soal ${i + 1}: ${r.level}`}
              className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.isCorrect ? "bg-success-light text-success" : "bg-danger-light text-danger")}>
              {i + 1}·{r.level}
            </span>
          ))}
        </div>
        {(() => {
          const byType = new Map<QuestionType, { ok: number; n: number }>();
          for (const r of results) { const t = r.q.type ?? "pg"; const c = byType.get(t) ?? { ok: 0, n: 0 }; c.n++; if (r.isCorrect) c.ok++; byType.set(t, c); }
          return byType.size > 1 ? (
            <div className="flex flex-wrap justify-center gap-2 text-[12px]">
              {[...byType.entries()].map(([t, c]) => (
                <span key={t} className="rounded-full border border-border bg-surface px-3 py-1 text-ink">{QUESTION_TYPE_LABEL[t]}: <b>{c.ok}/{c.n}</b></span>
              ))}
            </div>
          ) : null;
        })()}
        <Button variant="default" onClick={exitPractice}>Selesai</Button>
      </div>
    );
  }

  const opts = currentQ ? [currentQ.options.A, currentQ.options.B, currentQ.options.C, currentQ.options.D, currentQ.options.E ?? ""] : [];
  const number = results.length + (feedback ? 0 : 1);

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-background p-4 sm:p-8">
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">Latihan Adaptif · {topic ?? "Semua"}</p>
          <h2 className="text-[18px] font-bold text-ink">Soal {Math.min(number, ADAPTIVE_SESSION_LENGTH)} dari {ADAPTIVE_SESSION_LENGTH}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={level === "Mudah" ? "success" : level === "Sedang" ? "warning" : "danger"}>Tingkat: {level}</Badge>
          <Button variant="ghost" className="h-8 text-[12px]" onClick={() => results.length ? finish(results) : exitPractice()}>
            <X className="mr-1.5 h-3.5 w-3.5" />Keluar
          </Button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${(results.length / ADAPTIVE_SESSION_LENGTH) * 100}%` }} />
      </div>
      {backNotice && (
        <p role="alert" className="rounded-[8px] bg-ink px-3 py-2 text-[12px] font-semibold text-white">
          Tombol kembali tidak bisa dipakai saat latihan. Pakai tombol &quot;Keluar&quot; di atas.
        </p>
      )}
      <p className="text-[12px] text-ink-secondary">Jawab benar {ADAPTIVE_STREAK}× berturut-turut → soal jadi lebih sulit. Salah {ADAPTIVE_STREAK}× berturut-turut → soal jadi lebih mudah.</p>

      {loadingQ && <SectionLoading message={`Menyiapkan soal tingkat ${level}...`} />}
      {!loadingQ && loadError && (
        <AlertPanel tone="warning" title="Latihan tidak bisa dilanjutkan">
          {loadError}
          <div className="mt-3 flex gap-2">
            {results.length > 0 && <Button variant="default" size="sm" onClick={() => finish(results)}>Lihat Nilai</Button>}
            <Button variant="outline" size="sm" onClick={exitPractice}>Kembali</Button>
          </div>
        </AlertPanel>
      )}

      {!loadingQ && !loadError && currentQ && (
        <>
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Badge tone={currentQ.difficulty === "Mudah" ? "success" : currentQ.difficulty === "Sedang" ? "warning" : "danger"}>{currentQ.difficulty}</Badge>
              {currentQ.topic && <Badge tone="neutral">{currentQ.topic}</Badge>}
              {currentQ.type && currentQ.type !== "pg" && <Badge tone="primary">{QUESTION_TYPE_LABEL[currentQ.type]}</Badge>}
            </div>
            <p className="whitespace-pre-line text-[15px] font-medium text-ink leading-relaxed">{currentQ.question}</p>
            {currentQ.imageUrl && (
              <ZoomableImage src={currentQ.imageUrl} alt="Gambar soal" className="max-h-72 w-auto max-w-full rounded-[8px] border border-border object-contain" />
            )}
          </div>
          {(currentQ.type ?? "pg") !== "pg" ? (
            <div className={cn(feedback && "pointer-events-none opacity-80")}>
              <ExamAnswerInput q={practiceAsExamQuestion(currentQ)} value={selected ?? undefined} onChange={v => setSelected(v)} />
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {["A", "B", "C", "D", "E"].map((opt, i) => {
              if (!opts[i]) return null;
              const isSel = selected === opt;
              const isRight = feedback && feedback.correctAnswer === opt;
              const isWrongPick = feedback && isSel && !feedback.isCorrect;
              return (
                <button key={opt} disabled={!!feedback || checking} onClick={() => setSelected(opt)}
                  className={cn("flex items-center gap-3 rounded-[10px] border p-3.5 text-left transition-all disabled:cursor-default",
                    isRight ? "border-success bg-success-light" : isWrongPick ? "border-danger bg-danger-light"
                      : isSel ? "border-primary/40 bg-primary-soft" : "border-border bg-surface hover:border-primary/20 hover:bg-background"
                  )}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                    isRight ? "bg-success text-white" : isWrongPick ? "bg-danger text-white" : isSel ? "bg-primary text-white" : "bg-background border border-border text-ink-secondary"
                  )}>{opt}</span>
                  <span className="text-[13px] font-medium text-ink">{opts[i]}</span>
                </button>
              );
            })}
          </div>
          )}

          {feedback && (
            <div className={cn("rounded-card border p-4", feedback.isCorrect ? "border-success/30 bg-success-light" : feedback.partial ? "border-warning/30 bg-warning-light" : "border-danger/30 bg-danger-light")}>
              <p className={cn("text-[14px] font-bold", feedback.isCorrect ? "text-success" : feedback.partial ? "text-warning" : "text-danger")}>
                {feedback.isCorrect ? "Benar! 🎉"
                  : (feedback.q.type ?? "pg") === "pg" ? `Belum tepat. Jawaban yang benar: ${feedback.correctAnswer}`
                  : feedback.partial ? "Sebagian benar, hampir!" : "Belum tepat."}
              </p>
              {(feedback.q.type ?? "pg") !== "pg" && !feedback.isCorrect && feedback.keyText && (
                <p className="mt-1 whitespace-pre-line text-[13px] text-ink"><span className="font-semibold">Jawaban benar:</span> {feedback.keyText}</p>
              )}
              {feedback.explanation && <p className="mt-1 text-[13px] leading-relaxed text-ink">{feedback.explanation}</p>}
              {levelChange === "up" && <p className="mt-2 text-[13px] font-semibold text-primary">Hebat, {ADAPTIVE_STREAK} benar berturut-turut! Soal berikutnya lebih sulit 💪</p>}
              {levelChange === "down" && (
                <p className="mt-2 text-[13px] font-semibold text-warning">
                  Tidak apa-apa! Baca lagi penjelasan di atas ya. Soal berikutnya dibuat lebih mudah supaya kamu makin paham.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            {!feedback ? (
              <Button variant="default" className="h-10 px-6"
                disabled={!currentQ || !examAnswered(practiceAsExamQuestion(currentQ), selected ?? undefined) || checking} onClick={check}>
                {checking ? "Memeriksa..." : "Periksa Jawaban"}
              </Button>
            ) : (
              <Button variant={results.length >= ADAPTIVE_SESSION_LENGTH ? "success" : "default"} className="h-10 px-6" onClick={next}>
                {results.length >= ADAPTIVE_SESSION_LENGTH ? "Selesai & Lihat Nilai" : "Soal Berikutnya →"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
    </div>,
    document.body,
  );
}

// How well the student does per question FORMAT (PG, PG kompleks, ...).
// Practice already leans toward the weakest one; this shows it.
function TypeStatsCard({ subjectId }: { subjectId: string }) {
  const [stats, setStats] = useState<Array<{ type: QuestionType; label: string; correct: number; total: number; accuracy: number | null }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const res = await fetch(`/api/student/practice/type-stats${subjectId ? `?subjectId=${subjectId}` : ""}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const body = await res.json() as { stats?: typeof stats };
        if (!cancelled) setStats(body.stats ?? []);
      } catch { if (!cancelled) setStats([]); }
    });
    return () => { cancelled = true; };
  }, [subjectId]);
  const shown = (stats ?? []).filter(s => s.type !== "esai" && s.total > 0);
  if (!stats || shown.length === 0) return null;
  const weakest = [...shown].filter(s => s.total >= 2).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0];
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-[14px] font-bold text-ink">Kemampuanmu per jenis soal</h3>
      {weakest && (weakest.accuracy ?? 100) < 70 && (
        <p className="mt-1 text-[12px] text-ink-secondary">Paling perlu dilatih: <span className="font-semibold text-warning">{weakest.label}</span> - latihan akan lebih sering memberi soal jenis ini.</p>
      )}
      <div className="mt-3 space-y-2">
        {shown.map(s => (
          <div key={s.type} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-[12px] font-medium text-ink">{s.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/60">
              <div className={cn("h-full rounded-full", (s.accuracy ?? 0) >= 70 ? "bg-success" : (s.accuracy ?? 0) >= 50 ? "bg-warning" : "bg-danger")} style={{ width: `${s.accuracy ?? 0}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right text-[11px] text-ink-secondary">{s.accuracy}% · {s.correct}/{s.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentAdaptive() {
  const [difficulty, setDifficulty] = useState<Level>("Sedang");
  const [selectedTopic, setSelectedTopic] = useState<string>("Semua");
  const [session, setSession] = useState<{ subjectId: string; level: Level } | null>(null);
  const loading = false;
  const [subjects, setSubjects] = useState<{ id: string; name: string }[] | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [topics, setTopics] = useState<string[] | null>(["Semua"]);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [rememberedSubject, setRememberedSubject] = useSubjectFilter();
  // Remembered subject (from Beranda or another page) preselects practice.
  useEffect(() => {
    const match = (subjects ?? []).find(x => x.name === rememberedSubject);
    if (match) setSelectedSubjectId(match.id);
  }, [subjects, rememberedSubject]);
  // ?topik= deep link (Beranda "Yang perlu kamu latih") preselects a topic.
  const [wantedTopic] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("topik"); } catch { return null; }
  });
  const studentWeakTopics = useStudentOverview()?.weakTopics ?? [];
  const [sessionTopic, setSessionTopic] = useState("Semua");

  // Real schema note: `questions` is scoped by school+subject, not per-class,
  // and students have no direct RLS SELECT on it at all - subjects/topics are
  // resolved through the class's real teacher_assignments and a narrow
  // service route, never a raw client-side questions query.
  useEffect(() => {
    (async () => {
      const student = await getCurrentStudent();
      if (!student?.class_id) { setSubjects([]); return; }
      const { data } = await supabase
        .from("teacher_assignments")
        .select("subject_id, subjects(name)")
        .eq("class_id", student.class_id);
      const map = new Map<string, string>();
      for (const row of (data ?? []) as unknown as Array<{ subject_id: string; subjects: { name: string } | null }>) {
        if (row.subjects) map.set(row.subject_id, row.subjects.name);
      }
      const list = Array.from(map, ([id, name]) => ({ id, name }));
      setSubjects(list);
      if (list.length === 1) setSelectedSubjectId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setTopics(["Semua"]); return; }
    setTopics(null);
    setSelectedTopic("Semua");
    let cancelled = false;
    (async () => {
      const data = await authedFetch("/api/student/practice/topics", { subjectId: selectedSubjectId }) as { topics?: string[] } | null;
      if (cancelled) return;
      const list = ["Semua", ...(data?.topics ?? [])];
      setTopics(list);
      if (wantedTopic) {
        const hit = list.find(t => t.toLowerCase() === wantedTopic.toLowerCase());
        if (hit) setSelectedTopic(hit);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSubjectId]);

  function startSession(overrideTopic?: string, overrideSubjectId?: string) {
    const subjectId = overrideSubjectId ?? selectedSubjectId;
    if (!subjectId) { setPracticeError("Tolong pilih mata pelajaran terlebih dahulu."); return; }
    setPracticeError(null);
    requestExamFullscreen(); // must run inside the click that starts practice
    const topic = overrideTopic ?? selectedTopic;
    setSessionTopic(topic);
    setSession({ subjectId, level: difficulty });
  }

  if (session) {
    return <AdaptiveSession subjectId={session.subjectId} startLevel={session.level} topic={sessionTopic}
      onFinish={() => { exitExamFullscreen(); setSession(null); }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Latihan" title="Latihan Soal"
        description="Pilih mata pelajaran, lalu mulai latihan. Boleh diulang sepuasnya!" />
      <TypeStatsCard subjectId={selectedSubjectId} />

      {subjects === null && <SectionLoading message="Memuat mata pelajaran..." />}
      {subjects !== null && subjects.length === 0 && (
        <AlertPanel tone="primary" title="Belum ada mata pelajaran">
          Kelasmu belum memiliki guru mata pelajaran. Hubungi wali kelas atau admin sekolah.
        </AlertPanel>
      )}
      {subjects !== null && subjects.length > 1 && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-2">Mata Pelajaran <span className="text-danger">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {subjects.map(s => (
              <button key={s.id} onClick={() => { setSelectedSubjectId(s.id); setRememberedSubject(s.name); }} aria-pressed={selectedSubjectId === s.id}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold transition-colors border",
                  selectedSubjectId === s.id ? subjectStyle(s.name).active : subjectStyle(s.name).soft)}>
                <span aria-hidden="true">{subjectStyle(s.name).emoji}</span>{s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-2">Topik</label>
          <div className="flex gap-2 flex-wrap">
            {topics === null && <span className="text-[12px] text-ink-secondary">Memuat topik...</span>}
            {(topics ?? []).map(t => (
              <button key={t} onClick={() => setSelectedTopic(t)}
                className={cn("rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors border",
                  selectedTopic === t ? "bg-primary text-white border-primary" : "bg-background text-ink-secondary border-border hover:border-primary/30")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-2">Mulai dari tingkat</label>
          <div className="flex gap-2 flex-wrap">
            {(["Mudah", "Sedang", "Sulit"] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={cn("rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors border",
                  difficulty === d ? "bg-primary text-white border-primary" : "bg-background text-ink-secondary border-border hover:border-primary/30")}>
                {d}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-tertiary">Tingkat soal akan naik kalau kamu sering benar, dan turun kalau sering salah.</p>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <p className="text-[12px] text-ink-secondary mb-4">
          AI akan menyiapkan soal dari bank soal atau men-generate soal baru jika perlu.
        </p>
        {practiceError && <p role="alert" className="mb-3 text-[12px] font-medium text-danger">{practiceError}</p>}
        <Button variant="default" className="w-full h-10" onClick={() => startSession()} disabled={loading || subjects === null}>
          {loading ? "AI sedang menyiapkan soal..." : <><Zap className="mr-2 h-4 w-4" />Mulai Latihan Sekarang</>}
        </Button>
      </div>

      {studentWeakTopics.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-ink mb-3">Rekomendasi: topik terlemahmu</h3>
          <div id="adaptive-topics" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {studentWeakTopics.slice(0, 3).map(t => (
              <div key={`${t.subject}-${t.topic}`} className="rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{t.topic}</div>
                    <div className="text-[11px] text-ink-secondary">{t.subject} · {t.attempted} soal dicoba</div>
                  </div>
                  <MasteryBadge level={weakTopicMastery(t.accuracy)} />
                </div>
                <TopicBar label="Akurasi" value={t.accuracy} />
                <Button variant="default" className="w-full mt-3 h-7 text-[11px]" disabled={loading}
                  onClick={() => {
                    const subj = (subjects ?? []).find(x => x.name === t.subject);
                    if (subj) setSelectedSubjectId(subj.id);
                    setSelectedTopic(t.topic);
                    startSession(t.topic, subj?.id);
                  }}>
                  <Zap className="mr-1.5 h-3 w-3" />Latihan Sekarang
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Review ────────────────────────────────────────────────────────────

function StudentReview() {
  const router = useRouter();
  const [resultRows, setResults] = useState<ReviewListItem[] | null>(null);
  const results = resultRows ?? [];
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);
  const [reviewQs, setReviewQs] = useState<ReviewQuestionDetail[] | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const [reviewReload, setReviewReload] = useState(0);
  const [materials, setMaterials] = useState<MaterialWithFile[]>([]);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const ownStats = useOwnStudentStats();

  useEffect(() => {
    fetchStudentMaterialsReal().then(setMaterials);
    fetchStudentCompletedAttempts().then(setResults);
  }, []);

  const reviewResult = results.find(r => r.attemptId === reviewDetailId) ?? null;

  useEffect(() => {
    if (!reviewResult) return;
    if (!reviewResult.allowReview) { setReviewQs([]); return; }
    setReviewQs(null);
    let cancelled = false;
    setReviewError(false);
    fetchAttemptReviewDetail(reviewResult.attemptId).then(rows => {
      if (cancelled) return;
      if (rows === null) { setReviewError(true); setReviewQs([]); } else setReviewQs(rows);
    });
    return () => { cancelled = true; };
  }, [reviewResult?.attemptId, reviewResult?.allowReview, reviewReload]);

  return (
    <div className="space-y-6">
      <TabIntro text="Klik ujian untuk melihat jawaban benar dan pembahasannya." />
      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-[14px] font-bold text-ink">Semua Asesmen</h3>
        </div>
        <div className="px-5 py-3">
          {resultRows === null ? (
            <SectionLoading message="Memuat riwayat asesmen..." />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                <FileText className="h-6 w-6 text-ink-tertiary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink">Belum ada asesmen diselesaikan</p>
                <p className="text-[12px] text-ink-secondary mt-1">Hasil asesmen akan muncul di sini setelah kamu mengerjakannya</p>
              </div>
            </div>
          ) : results.map(r => (
            <RecentAssessmentRow key={r.attemptId} title={r.assessmentTitle} type={r.type} date={r.date}
              score={r.score} onClick={() => setReviewDetailId(r.attemptId)} />
          ))}
        </div>
      </div>

      {/* Review detail dialog */}
      {reviewDetailId && reviewResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setReviewDetailId(null)} />
          <div className="relative w-full max-w-2xl rounded-card border border-border bg-surface shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-border px-5 py-4 shrink-0">
              <div>
                <h2 className="text-[15px] font-bold text-ink">{reviewResult.assessmentTitle}</h2>
                <p className="text-[12px] text-ink-secondary">{reviewResult.type} · {reviewResult.date} · Nilai: <strong className="text-ink">{reviewResult.score ?? "– (menunggu penilaian esai)"}</strong></p>
              </div>
              <button onClick={() => setReviewDetailId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {sourceError && <AlertPanel tone="danger" title="Tidak dapat membuka sumber">{sourceError}</AlertPanel>}
              {reviewQs === null ? (
                <SectionLoading message="Memuat pembahasan..." />
              ) : reviewError ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-[13px] text-ink-secondary">Pembahasan gagal dimuat (koneksi atau server sedang sibuk).</p>
                  <Button variant="outline" size="sm" onClick={() => setReviewReload(n => n + 1)}>Coba lagi</Button>
                </div>
              ) : reviewQs.length === 0 ? (
                <p className="text-[13px] text-ink-secondary text-center py-8">
                  {reviewResult.allowReview ? "Belum ada jawaban yang tersimpan untuk ujian ini." : "Guru tidak mengizinkan pembahasan untuk asesmen ini."}
                </p>
              ) : reviewQs.map((q, idx) => {
                const studentAns = q.yourAnswer ?? undefined;
                const isWrong = studentAns !== undefined && !q.isCorrect && !q.pending;
                const partial = q.type !== "pg" && q.type !== "esai" && !q.isCorrect && (q.earned ?? 0) > 0;
                const opts = q.options;
                return (
                  <div key={idx} className={cn("rounded-card border p-4", isWrong ? "border-danger/20 bg-danger-light/30" : "border-border bg-surface")}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-ink-secondary">Soal {idx + 1}</span>
                      <Badge tone={studentAns === undefined ? "neutral" : q.pending ? "warning" : partial ? "warning" : isWrong ? "danger" : "success"}>
                        {studentAns === undefined ? "Tidak dijawab" : q.pending ? "Menunggu dinilai guru" : partial ? "Sebagian benar" : isWrong ? "Salah" : "Benar"}
                      </Badge>
                      {q.type !== "pg" && <Badge tone="primary">{QUESTION_TYPE_LABEL[q.type]}</Badge>}
                      <Badge tone="neutral">{q.topic}</Badge>
                      {!q.pending && q.earned != null && <span className="ml-auto text-[11px] font-semibold text-ink-secondary">{q.earned}/{q.points} poin</span>}
                    </div>
                    <p className="whitespace-pre-line text-[13px] font-medium text-ink mb-3">{q.question}</p>
                    {q.imageUrl && (
                      <div className="mb-3"><ZoomableImage src={q.imageUrl} alt={`Gambar soal ${idx + 1}`} className="max-h-60 rounded-[8px] border border-border object-contain" /></div>
                    )}
                    {q.type !== "pg" ? (
                      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className={cn("rounded-[6px] border p-2.5", isWrong ? "border-danger/20 bg-danger-light" : "border-border bg-background")}>
                          <div className="mb-1 text-[9px] font-bold uppercase text-ink-secondary">Jawaban kamu</div>
                          <p className="whitespace-pre-line text-[12px] text-ink">{q.yourText}</p>
                        </div>
                        <div className="rounded-[6px] border border-success/20 bg-success-light p-2.5">
                          <div className="mb-1 text-[9px] font-bold uppercase text-success">{q.type === "esai" ? "Pedoman / nilai guru" : "Jawaban benar"}</div>
                          <p className="whitespace-pre-line text-[12px] text-ink">{q.keyText}</p>
                          {q.feedback && <p className="mt-1.5 text-[12px] text-ink"><span className="font-semibold">Catatan guru:</span> {q.feedback}</p>}
                        </div>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 gap-1.5 mb-3">
                      {Object.entries(opts).map(([opt, text]) => {
                        const isCorrect = q.correctAnswer === opt;
                        const isStudentAns = studentAns === opt;
                        const isWrongAns = isStudentAns && !isCorrect;
                        return (
                          <div key={opt} className={cn("flex items-center gap-2 rounded-[6px] border px-3 py-2",
                            isCorrect ? "border-success/30 bg-success-light" :
                            isWrongAns ? "border-danger/30 bg-danger-light" :
                            "border-border bg-background"
                          )}>
                            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              isCorrect ? "bg-success text-white" :
                              isWrongAns ? "bg-danger text-white" :
                              "bg-border text-ink-secondary"
                            )}>{opt}</span>
                            <span className="text-[12px] text-ink flex-1">{text}</span>
                            {isWrongAns && <span className="text-[10px] font-semibold shrink-0 text-danger">Jawaban kamu (Salah)</span>}
                            {isCorrect && <span className="text-[10px] text-success font-semibold shrink-0">Jawaban benar</span>}
                          </div>
                        );
                      })}
                    </div>
                    )}
                    {q.explanation && (
                      <div className="rounded-[6px] bg-background border border-border p-2.5">
                        <p className="text-[11px] text-ink leading-relaxed">{q.explanation}</p>
                        {q.sourceTitle && (
                          <button onClick={async () => {
                            setSourceError(null);
                            const mat = materials.find(m => m.title.toLowerCase() === q.sourceTitle?.toLowerCase());
                            if (!mat) { setSourceError("Materi sumber ini sudah tidak tersedia di pustaka kelasmu."); return; }
                            const err = await downloadMaterialFile(mat.id);
                            if (err) setSourceError(err);
                          }}
                            className="inline-flex items-center gap-1 mt-2 rounded-[4px] border border-primary/30 bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            Sumber: {q.sourceTitle}{q.sourcePage ? `, hal. ${q.sourcePage}` : ""}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="pt-2">
                <Button variant="default" className="w-full h-9 text-[13px]" onClick={() => { setReviewDetailId(null); router.push("/student/adaptive"); }}>
                  <Zap className="mr-1.5 h-4 w-4" />Latihan Soal Serupa
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setReviewDetailId(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Weak Topics ───────────────────────────────────────────────────────

function weakTopicMastery(accuracy: number): "Perlu Bantuan" | "Berkembang" {
  return accuracy < 50 ? "Perlu Bantuan" : "Berkembang";
}

function StudentWeakTopics() {
  const router = useRouter();
  const overview = useStudentOverview();
  const topics = overview?.weakTopics ?? [];
  const critical = topics.filter(t => t.accuracy < 50);
  return (
    <div className="space-y-6">
      <TabIntro text="Topik yang jawabanmu masih banyak salah (benar di bawah 70%). Latih lagi, ya!" />
      {overview === undefined ? (
        <SectionLoading message="Menganalisis topik..." />
      ) : overview === null ? (
        <AlertPanel tone="danger" title="Gagal memuat topik lemah">Coba muat ulang halaman.</AlertPanel>
      ) : topics.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Belum ada topik lemah"
          description="Topik lemah muncul setelah kamu mengerjakan asesmen atau latihan. Kalau sudah, berarti semua topikmu di atas 70% — mantap!" />
      ) : (
        <>
          {critical.length > 0 && (
            <AlertPanel tone="warning" title={`${critical.length} topik perlu perhatian segera`}>
              Akurasi di bawah 50% menunjukkan kesenjangan pemahaman yang perlu diperbaiki sebelum asesmen berikutnya.
            </AlertPanel>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map(t => (
              <div key={`${t.subject}-${t.topic}`} className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{t.topic}</div>
                    <div className="text-[11px] text-ink-secondary">{t.subject} · {t.attempted} soal dicoba</div>
                  </div>
                  <MasteryBadge level={weakTopicMastery(t.accuracy)} />
                </div>
                <TopicBar label="Akurasi" value={t.accuracy} />
                <Button variant="default" className="w-full mt-3 h-7 text-[11px]" onClick={() => router.push("/student/adaptive")}>
                  <Zap className="mr-1.5 h-3 w-3" />Latihan Topik Ini
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Student Incorrect ─────────────────────────────────────────────────────────

type WrongAnswerItem = {
  id: string; source: string; topic: string; question: string; options: Record<string, string>;
  yourAnswer: string | null; correctAnswer: string; explanation: string; at: number;
  yourText?: string; keyText?: string;
  questionId?: string; aiExplanation?: boolean; needsAi?: boolean;
};

function StudentIncorrect() {
  const [items, setItems] = useState<WrongAnswerItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Hidden items are remembered per account on this device.
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) { if (!cancelled) setItems([]); return; }
      const key = `catchup_hidden_wrong_${session.user.id}`;
      setHiddenKey(key);
      setHidden(new Set(lsGet<string[]>(key) ?? []));
      try {
        const res = await fetch("/api/student/wrong-answers", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const body = await res.json() as { items?: WrongAnswerItem[] };
        if (!cancelled) setItems(body.items ?? []);
      } catch {
        if (!cancelled) { setLoadError(true); setItems([]); }
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Questions without a teacher pembahasan: ask the AI, one question at a
  // time (stored per question, so each is generated only once for everyone).
  const [aiState, setAiState] = useState<Record<string, "loading" | "error">>({});
  useEffect(() => {
    const ids = [...new Set((items ?? []).filter(q => q.needsAi && q.questionId).map(q => q.questionId as string))];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      for (const qid of ids) {
        if (cancelled) return;
        setAiState(s => ({ ...s, [qid]: "loading" }));
        const res = await apiPost<{ explanation?: string; modelAnswer?: string; keyText?: string }>("/api/student/explain", { questionId: qid });
        if (cancelled) return;
        if (res.error || !res.explanation) { setAiState(s => ({ ...s, [qid]: "error" })); continue; }
        setAiState(s => { const n = { ...s }; delete n[qid]; return n; });
        setItems(prev => (prev ?? []).map(q => q.questionId !== qid ? q : {
          ...q, explanation: res.explanation!, aiExplanation: true, needsAi: false,
          keyText: res.keyText ?? (q.keyText || res.modelAnswer || q.keyText),
        }));
      }
    })();
    return () => { cancelled = true; };
    // only when the list first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items === null]);

  function handleHide(id: string) {
    const next = new Set(hidden); next.add(id);
    setHidden(next);
    if (hiddenKey) lsSet(hiddenKey, [...next]);
  }

  const visible = (items ?? []).filter(q => !hidden.has(q.id));
  const answerText = (q: WrongAnswerItem, key: string | null) =>
    key ? `${key}. ${q.options[key] ?? ""}` : "Tidak dijawab";

  return (
    <div className="space-y-6">
      <TabIntro text="Soal yang kamu jawab salah saat latihan dan asesmen, lengkap dengan jawaban benarnya." />
      {items === null ? (
        <SectionLoading message="Memuat soal salah..." />
      ) : loadError ? (
        <AlertPanel tone="danger" title="Gagal memuat soal salah">Periksa internetmu lalu muat ulang halaman.</AlertPanel>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <p className="text-[14px] font-semibold text-ink">Belum ada soal salah</p>
          <p className="text-[12px] text-ink-secondary">Soal yang salah saat latihan atau asesmen akan muncul di sini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(q => (
            <div key={q.id} className="rounded-card border border-danger/20 bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {q.topic && <Badge tone="neutral">{q.topic}</Badge>}
                <span className="text-[10px] text-ink-tertiary">{q.source}{q.at ? ` · ${new Date(q.at).toLocaleDateString("id-ID")}` : ""}</span>
                <button onClick={() => handleHide(q.id)}
                  className="ml-auto flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-semibold text-ink-tertiary hover:text-danger hover:bg-danger-light transition-colors">
                  <X className="h-3 w-3" />Sembunyikan
                </button>
              </div>
              <p className="text-[13px] font-medium text-ink leading-snug">{q.question}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[6px] bg-danger-light border border-danger/20 p-2.5">
                  <div className="text-[9px] font-bold uppercase text-danger mb-1">Jawaban kamu</div>
                  <div className="whitespace-pre-line text-[11px] text-ink">{q.yourText ?? (q.yourAnswer ? answerText(q, q.yourAnswer) : "(tidak tercatat)")}</div>
                </div>
                <div className="rounded-[6px] bg-success-light border border-success/20 p-2.5">
                  <div className="text-[9px] font-bold uppercase text-success mb-1">Jawaban benar</div>
                  <div className="whitespace-pre-line text-[11px] text-ink">
                    {q.keyText || (q.keyText === "" ? (q.needsAi ? "Lihat pembahasan" : "-") : answerText(q, q.correctAnswer))}
                  </div>
                </div>
              </div>
              {q.explanation ? (
                <div className="rounded-[6px] bg-background border border-border p-2.5">
                  <div className="text-[10px] font-semibold text-ink-secondary mb-1 flex items-center gap-1">
                    Pembahasan{q.aiExplanation && <span className="inline-flex items-center gap-0.5 rounded-[4px] bg-primary/10 px-1.5 py-px text-[9px] font-bold text-primary"><Sparkles className="h-2.5 w-2.5" />AI</span>}
                  </div>
                  <p className="whitespace-pre-line text-[11px] text-ink leading-relaxed">{q.explanation}</p>
                </div>
              ) : q.needsAi && q.questionId && (
                <div className="rounded-[6px] bg-background border border-border p-2.5 text-[11px] text-ink-secondary">
                  {aiState[q.questionId] === "error" ? "Pembahasan AI belum bisa dibuat sekarang. Coba muat ulang nanti."
                    : <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Guru belum menulis pembahasan — AI sedang membuatnya…</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Student Tutor ─────────────────────────────────────────────────────────────

function StudentTutor() {
  const [messages, setMessages] = useState<ChatMessage[]>([assistantGreeting]);
  // Chat history survives moving between pages for the rest of the browser
  // session. Stored per account in sessionStorage (cleared when the browser
  // closes) - school computers are shared, so it never outlives the session
  // and another student logging in on the same computer can't see it.
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      const key = `catchup_chat_${uid}`;
      try {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
        }
      } catch { /* ignore corrupt/blocked storage */ }
      setHistoryKey(key);
    });
  }, []);
  useEffect(() => {
    if (!historyKey) return;
    // Don't persist a half-streamed (empty) assistant bubble.
    const complete = messages.filter(m => m.role === "user" || m.content);
    try { sessionStorage.setItem(historyKey, JSON.stringify(complete.slice(-60))); } catch { /* storage full/blocked */ }
  }, [messages, historyKey]);

  function newConversation() {
    setMessages([assistantGreeting]);
    if (historyKey) { try { sessionStorage.removeItem(historyKey); } catch { /* ignore */ } }
  }
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [localMats, setLocalMats] = useState<MaterialWithFile[]>([]);
  // The AI is grounded on this list, so sending before it loads would
  // wrongly answer "tidak ada materi".
  const [matsLoaded, setMatsLoaded] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => { fetchStudentMaterialsReal().then(rows => { setLocalMats(rows); setMatsLoaded(true); }); }, []);

  // Name the teacher gave the AI (Pengaturan AI Companion -> Persona).
  const [personaName, setPersonaName] = useState("Kak AI");
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const res = await fetch("/api/chat", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const body = await res.json() as { name?: string };
        if (!cancelled && body.name) setPersonaName(body.name);
      } catch { /* keep the default name */ }
    });
    return () => { cancelled = true; };
  }, []);

  // A question typed into Beranda's "Tanya AI" box arrives as ?q= and is
  // sent automatically once the class materials (the AI's grounding) load.
  const autoAskDone = React.useRef(false);
  useEffect(() => {
    if (!matsLoaded || autoAskDone.current) return;
    autoAskDone.current = true;
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("q");
      if (q?.trim()) {
        url.searchParams.delete("q");
        window.history.replaceState(null, "", url.pathname + url.search);
        send(q.trim());
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matsLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function downloadMat(mat: MaterialWithFile) {
    const err = await downloadMaterialFile(mat.id);
    if (err) setApiError(err);
  }

  // "[Sumber: Judul, hal. N]" -> clickable chip that downloads the material.
  function renderSource(part: string, key: string) {
    const match = part.match(/^\[Sumber:\s*([^,\]]+)/);
    const title = match?.[1].trim() ?? "";
    const mat = localMats.find(m => m.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(m.title.toLowerCase()));
    return (
      <button key={key}
        onClick={() => mat ? downloadMat(mat) : setApiError(`Materi "${title}" tidak ditemukan di pustaka kelasmu.`)}
        title={mat ? `Unduh: ${mat.title}` : title}
        className="mx-0.5 inline-flex items-center gap-1 rounded-[4px] border border-primary/30 bg-primary-soft px-1.5 py-0.5 align-middle text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors">
        <BookOpen className="h-3 w-3 shrink-0" />
        {part.replace(/^\[|\]$/g, "")}
      </button>
    );
  }

  function renderContent(content: string) {
    return <ChatMarkdown content={content} renderSource={renderSource} />;
  }

  async function send(text: string) {
    if (!text.trim() || isTyping || !matsLoaded) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: "Baru saja" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setApiError(null);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", grounded: true, timestamp: "Baru saja" }]);

    try {
      const history = messages
        .filter(m => m.id !== "greeting" && m.content)
        .slice(-20) // bounded context: saved chats can grow long
        .map(m => ({ role: m.role, content: m.content }));

      // The bearer token lets the server apply this class's teacher AI
      // settings (teaching style + grounding) to the reply.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: text }],
          materials: localMats.map(m => ({ title: m.title, topic: m.subject ?? "" })),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let streamError: string | null = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // SSE events can be split across network chunks - only parse
        // complete lines and keep the remainder for the next read.
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          let parsed: { text?: string; error?: string };
          try { parsed = JSON.parse(data); } catch { continue; /* skip malformed chunk */ }
          if (parsed.error) { streamError = parsed.error; continue; }
          {
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              ));
            }
          }
        }
      }
      if (streamError && !accumulated) throw new Error(streamError);
    } catch (err) {
      const msg = err instanceof Error ? `Gagal menghubungi AI Companion (${err.message}). Coba lagi sebentar lagi.` : "Gagal menghubungi AI Companion";
      setApiError(msg);
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-4">
      <PageHeader eyebrow="Tanya AI" title="Tanya AI"
        description="Bingung soal pelajaran? Ketik pertanyaanmu di bawah."
        actions={messages.length > 1 ? (
          <Button variant="outline" className="h-8 text-[12px]" onClick={newConversation} disabled={isTyping}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Percakapan baru
          </Button>
        ) : undefined} />
      <GroundingNotice />
      <div role="log" aria-label="Riwayat percakapan" aria-live="polite"
        className="flex-1 overflow-y-auto space-y-4 rounded-card border border-border bg-surface p-5 shadow-sm">
        {messages.map(m => {
          if (m.role === "user") return <ChatBubble key={m.id} message={m} grounded />;
          return (
            <div key={m.id} className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-1">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="max-w-[82%]">
                <p className="mb-1 text-[11px] font-semibold text-primary">{personaName}</p>
                <div className="rounded-[12px] rounded-tl-sm bg-surface border border-border px-4 py-3 text-[14px] leading-relaxed text-ink shadow-sm">
                  {renderContent(m.id === "greeting" ? m.content.replace(/AI Companion/g, personaName) : m.content)}
                </div>
                {m.timestamp && <p className="text-[10px] text-ink-tertiary mt-1">{m.timestamp}</p>}
              </div>
            </div>
          );
        })}
        {isTyping && messages[messages.length - 1]?.content === "" && <TypingIndicator />}
        <div ref={messagesEndRef} />
        {apiError && (
          <div className="flex items-center gap-2 rounded-[10px] border border-danger/20 bg-danger-light px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <span className="text-[12px] text-danger">{apiError}</span>
          </div>
        )}
      </div>
      {messages.length <= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {suggestedPrompts.slice(0, 6).map(p => (
            <SuggestedPromptButton key={p} label={p} onClick={() => send(p)} />
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-card border border-border bg-surface p-3 shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={matsLoaded ? "Tanyakan tentang materi pelajaran..." : "Memuat materi kelasmu..."}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] text-ink placeholder:text-ink-tertiary focus:outline-none leading-relaxed" />
        <Button variant="default" className="h-8 w-8 p-0 shrink-0" onClick={() => send(input)} disabled={!input.trim() || isTyping || !matsLoaded}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Student Progress ──────────────────────────────────────────────────────────

function StudentProgress() {
  const ownStats = useOwnStudentStats();
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [scoreTrendData, setScoreTrendData] = useState<ScoreTrendData>({ trend: [], labels: [] });
  const [subjectMasteryData, setSubjectMasteryData] = useState<SubjectMasteryEntry[]>([]);

  useEffect(() => {
    getCurrentStudent().then(async student => {
      if (student) {
        const { scoreTrend, subjectMastery } = await fetchScoreTrendAndSubjectMastery(student.id);
        setScoreTrendData(scoreTrend);
        setSubjectMasteryData(subjectMastery);
      }
      setProgressLoaded(true);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ownStudentStatCards(ownStats).map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Tren Nilai</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Berdasarkan riwayat asesmen</p>
          {!progressLoaded ? (
            <SectionLoading className="h-[100px] py-0" />
          ) : scoreTrendData.trend.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Data akan muncul setelah mengerjakan asesmen</p>
            </div>
          ) : (
            <SimpleChart data={scoreTrendData.trend} labels={scoreTrendData.labels} height={100} />
          )}
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Penguasaan Materi</h3>
          {!progressLoaded ? (
            <SectionLoading className="h-[100px] py-0" />
          ) : subjectMasteryData.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Belum ada data penguasaan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectMasteryData.map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Student Achievements ──────────────────────────────────────────────────────

const ACHIEVEMENT_EMOJI: Record<string, string> = {
  BookOpen: "📚", Gem: "💎", GraduationCap: "🎓", Zap: "⚡", Crown: "👑", Flame: "🔥",
};

function StudentAchievements() {
  const overview = useStudentOverview();
  const ownStats = overview?.stats ?? null;
  const list = overview?.achievements ?? [];
  const earned = list.filter(a => a.earned);
  const notEarned = list.filter(a => !a.earned);
  const loading = overview === undefined;

  const card = (a: StudentAchievementRow, got: boolean) => (
    <div key={a.id} className={cn("rounded-card border p-4 text-center", got ? "border-success/30 bg-success-light" : "border-border bg-background opacity-60")}>
      <div className="text-[28px] mb-1">{ACHIEVEMENT_EMOJI[a.icon ?? ""] ?? "🏅"}</div>
      <div className="text-[12px] font-bold text-ink">{a.title}</div>
      <div className="text-[10px] text-ink-secondary mt-0.5">{a.description}</div>
      <div className={cn("text-[11px] font-semibold mt-1.5", got ? "text-success" : "text-ink-tertiary")}>+{a.xp} XP</div>
      {got && a.earnedAt && (
        <div className="text-[10px] text-ink-tertiary mt-0.5">{new Date(parseDbTime(a.earnedAt)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-gradient-hero text-white p-6">
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { val: ownStats ? ownStats.xp.toLocaleString("id-ID") : "…", label: "Total XP" },
            { val: loading ? "…" : earned.length, label: "Pencapaian" },
            { val: ownStats ? `#${ownStats.rank}` : "…", label: ownStats ? `Peringkat dari ${ownStats.classSize}` : "Peringkat Kelas" },
            { val: ownStats ? `🔥 ${ownStats.streak}` : "🔥 …", label: "Hari Streak" },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div className="h-10 w-px bg-white/20" />}
              <div className="text-center">
                <div className="text-[32px] font-bold">{s.val}</div>
                <div className="text-[11px] text-blue-200 mt-0.5">{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {loading ? (
        <SectionLoading message="Memuat pencapaian..." />
      ) : overview === null ? (
        <AlertPanel tone="danger" title="Gagal memuat pencapaian">Coba muat ulang halaman.</AlertPanel>
      ) : (
        <>
          <div>
            <h3 className="text-[14px] font-bold text-ink mb-3">Sudah Diraih ({earned.length})</h3>
            {earned.length === 0 ? (
              <p className="text-[12px] text-ink-tertiary">Belum ada pencapaian. Kerjakan asesmen dan latihan untuk mulai mengumpulkan!</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{earned.map(a => card(a, true))}</div>
            )}
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-ink mb-3">Belum Diraih ({notEarned.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{notEarned.map(a => card(a, false))}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT
// ═══════════════════════════════════════════════════════════════════════════════

type ParentChild = { studentId: string; classId: string; fullName: string; className: string };

// The legacy UI (ParentProgress/ParentAssessments/ParentRecommendations) was
// built assuming a single child - there's no child-switcher anywhere in the
// existing design, so this preserves that assumption rather than inventing
// one. A parent with more than one verified link only ever sees the first;
// flagged here since it's a real, if narrow, gap for multi-child parents.
async function fetchParentPrimaryChild(): Promise<ParentChild | null> {
  const parent = await getCurrentParent();
  if (!parent) return null;
  const { data: linkRows } = await supabase
    .from("parent_student_links")
    .select("students(id, user_profile_id, class_id, classes(name))")
    .eq("parent_id", parent.id)
    .eq("verified", true);
  type Row = { students: { id: string; user_profile_id: string; class_id: string; classes: { name: string } | null } | null };
  const link = ((linkRows ?? []) as unknown as Row[]).find(l => l.students !== null);
  if (!link?.students) return null;
  const { data: profile } = await supabase.from("user_profiles").select("full_name").eq("id", link.students.user_profile_id).single();
  return {
    studentId: link.students.id,
    classId: link.students.class_id,
    fullName: profile?.full_name ?? "-",
    className: link.students.classes?.name ?? "-",
  };
}

function ParentApp({ page }: { page: string }) {
  const screens: Record<string, React.ReactNode> = {
    dashboard: <ParentDashboard />,
    progress: <ParentProgress />,
    assessments: <ParentAssessments />,
    recommendations: <ParentRecommendations />,
    notifications: <ParentNotificationsPage />,
  };
  return (
    <AppShell role="parent" nav={parentNav}>
      {screens[page] ?? <ParentDashboard />}
    </AppShell>
  );
}

function ParentDashboard() {
  const [waToast, setWaToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const missedAssessments = assessments.filter(a => a.status === "Terjadwal");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary mb-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="text-2xl font-bold text-ink">Portal Orang Tua</h1>
          <p className="text-[13px] text-ink-secondary mt-1">Pantau perkembangan belajar {studentProfile.name} · {studentProfile.className}</p>
        </div>
        <Button variant="default" className="h-8 text-[12px] shrink-0" onClick={() => {
          setWaToast({ message: `Ringkasan performa ${studentProfile.name.split(" ")[0]} telah dikirim ke WhatsApp kamu`, tone: "success" });
        }}>
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />Kirim ke WhatsApp
        </Button>
      </div>

      {missedAssessments.length > 0 && (
        <AlertPanel tone="danger" title={`${missedAssessments.length} asesmen belum dikerjakan ${studentProfile.name.split(" ")[0]}`}>
          {missedAssessments.map(a => a.title).join(", ")} — segera ingatkan {studentProfile.name.split(" ")[0]} untuk mempersiapkan diri.
          <Link href="/parent/assessments" className="ml-1 font-semibold underline">Lihat detail →</Link>
        </AlertPanel>
      )}

      <div className="rounded-card border border-border bg-gradient-hero text-white p-6">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-[18px] font-bold">AP</div>
          <div className="flex-1">
            <div className="text-[18px] font-bold">{studentProfile.name}</div>
            <div className="text-[12px] text-blue-200">{studentProfile.className} · {school.name} · Peringkat #{studentProfile.rank}</div>
            <div className="flex items-center gap-5 mt-3">
              {[
                { val: studentProfile.avgScore, label: "Rata-rata Nilai" },
                { val: `🔥${studentProfile.streak}`, label: "Streak" },
                { val: studentProfile.xp, label: "Total XP" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-[22px] font-bold">{s.val}</div>
                  <div className="text-[10px] text-blue-200">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <Badge tone="success" className="text-[12px]">On Track</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 space-y-5">
          <div className="rounded-card border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="text-[14px] font-bold text-ink">Hasil Asesmen Terbaru</h3>
            </div>
            <div className="px-5 py-1">
              {studentResults.map(r => (
                <RecentAssessmentRow key={r.id} title={r.assessmentTitle} type={r.type} date={r.date}
                  score={r.score} classAvg={r.classAvg} rank={r.rank} />
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border bg-surface shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-ink mb-4">Tren Nilai {studentProfile.name.split(" ")[0]}</h3>
            <SimpleChart data={scoreTrend} labels={scoreTrendLabels} height={90} />
          </div>
        </div>
        <div className="space-y-4">
          <AIInsightPanel title="Pesan dari Guru Kelas (AI)">
            <p className="mb-2">{studentProfile.name.split(" ")[0]} menunjukkan perkembangan positif di Fungsi Kuadrat. Namun, <strong className="text-ink">Diskriminan</strong> masih memerlukan latihan tambahan.</p>
            <p>Mohon dorong {studentProfile.name.split(" ")[0]} untuk latihan adaptif 15 menit setiap hari.</p>
          </AIInsightPanel>
          <div className="rounded-card border border-border bg-surface shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-ink mb-3">Topik Perlu Perhatian</h3>
            <div className="space-y-3">
              {weakTopics.slice(0, 3).map(t => <TopicBar key={t.id} label={t.topic} value={t.accuracyRate} />)}
            </div>
          </div>
          <div className="rounded-card border border-border bg-surface shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-ink mb-1">Notifikasi WhatsApp</h3>
            <p className="text-[11px] text-ink-secondary mb-3">Terima ringkasan performa {studentProfile.name.split(" ")[0]} langsung di WhatsApp setiap minggu.</p>
            <Button variant="default" className="w-full h-8 text-[12px]" onClick={() => {
              setWaToast({ message: `Notifikasi WhatsApp diaktifkan — laporan ${studentProfile.name.split(" ")[0]} terkirim setiap Senin pukul 07.00`, tone: "success" });
            }}>
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />Aktifkan Laporan Mingguan
            </Button>
          </div>
        </div>
      </div>

      {waToast && <AppToast message={waToast.message} tone={waToast.tone} onDismiss={() => setWaToast(null)} />}
    </div>
  );
}

function ParentProgress() {
  const [child, setChild] = useState<ParentChild | null | undefined>(undefined);
  const stats = useStudentOverview(child ? child.studentId : null)?.stats ?? null;
  const [scoreTrendData, setScoreTrendData] = useState<ScoreTrendData>({ trend: [], labels: [] });
  const [subjectMasteryData, setSubjectMasteryData] = useState<SubjectMasteryEntry[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    fetchParentPrimaryChild().then(c => {
      setChild(c);
      if (c) {
        // Score trend only needs assessment_attempts (safe for a parent's own
        // RLS access); topic mastery is real per-topic accuracy from the
        // server-side aggregation in /api/parent/topic-stats, since a parent
        // has no direct RLS access to question_attempts/questions.
        Promise.all([
          fetchScoreTrendAndSubjectMastery(c.studentId).then(({ scoreTrend }) => setScoreTrendData(scoreTrend)),
          authedFetch("/api/parent/topic-stats", { studentId: c.studentId }).then((data) => {
            const topicStats = (data as { topicStats?: Array<{ topic: string; avgSuccessRate: number }> } | null)?.topicStats ?? [];
            setSubjectMasteryData(topicStats.map(t => ({
              label: t.topic,
              value: t.avgSuccessRate,
              tone: t.avgSuccessRate >= 80 ? "success" : t.avgSuccessRate >= 60 ? "primary" : "warning",
            })));
          }),
        ]).finally(() => setProgressLoaded(true));
      }
    });
  }, []);

  const firstName = child?.fullName.split(" ")[0] ?? "Anak";

  if (child === undefined) return <SectionLoading message="Memuat data anak..." />;
  if (child === null) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Progres Belajar" title="Belum ada anak terhubung" />
        <AlertPanel tone="primary" title="Belum ada tautan ke akun siswa">
          Akun ini belum terhubung ke akun anak manapun. Hubungi admin sekolah untuk menautkan akun anak Anda.
        </AlertPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`Progres ${firstName}`} title={`Perkembangan Belajar ${firstName}`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ownStudentStatCards(stats).map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Tren Nilai</h3>
          {!progressLoaded ? (
            <SectionLoading className="h-[100px] py-0" />
          ) : scoreTrendData.trend.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Data akan muncul setelah anak mengerjakan asesmen</p>
            </div>
          ) : (
            <SimpleChart data={scoreTrendData.trend} labels={scoreTrendData.labels} height={100} />
          )}
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Penguasaan Topik</h3>
          {!progressLoaded ? (
            <SectionLoading className="h-[100px] py-0" />
          ) : subjectMasteryData.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Belum ada data penguasaan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectMasteryData.map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParentAssessments() {
  const [child, setChild] = useState<ParentChild | null | undefined>(undefined);
  const [results, setResults] = useState<ReviewListItem[] | null>(null);

  useEffect(() => {
    fetchParentPrimaryChild().then(c => {
      setChild(c);
      if (c) fetchChildCompletedAttempts(c.studentId).then(setResults);
    });
  }, []);

  const firstName = child?.fullName.split(" ")[0] ?? "Anak";

  if (child === undefined) return <SectionLoading message="Memuat data anak..." />;
  if (child === null) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Riwayat Asesmen" title="Belum ada anak terhubung" />
        <AlertPanel tone="primary" title="Belum ada tautan ke akun siswa">
          Akun ini belum terhubung ke akun anak manapun. Hubungi admin sekolah untuk menautkan akun anak Anda.
        </AlertPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Riwayat Asesmen" title={`Asesmen ${firstName}`} />
      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5"><h3 className="text-[14px] font-bold text-ink">Semua Asesmen</h3></div>
        <div className="px-5 py-1">
          {results === null ? (
            <SectionLoading message="Memuat riwayat asesmen..." />
          ) : results.length === 0 ? (
            <p className="text-[12px] text-ink-tertiary text-center py-6">Belum ada asesmen diselesaikan.</p>
          ) : results.map(r => (
            <RecentAssessmentRow key={r.attemptId} title={r.assessmentTitle} type={r.type} date={r.date} score={r.score} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ParentRecommendations() {
  const [child, setChild] = useState<ParentChild | null | undefined>(undefined);
  const [recs, setRecs] = useState<typeof teachingRecommendations>([]);
  const [summary, setSummary] = useState("");
  // true until the child AND their recommendations are known - never show
  // "Belum ada rekomendasi" before the data has actually been checked.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doneMap, setDoneMap] = useState<Map<string, number>>(new Map());

  useEffect(() => { setDoneMap(loadRecDone()); }, []);
  useEffect(() => { fetchParentPrimaryChild().then(setChild); }, []);

  useEffect(() => {
    if (child === undefined) return;
    if (child === null) { setLoading(false); return; }
    setLoading(true);
    setError("");
    authedFetch("/api/parent/topic-stats", { studentId: child.studentId })
      .then((data) => {
        const topicStats = (data as { topicStats?: Array<{ topic: string; avgSuccessRate: number; count: number }> } | null)?.topicStats ?? [];
        if (topicStats.length === 0) { setLoading(false); return; }
        // Stored server-side per child; reopening the page doesn't call the AI again.
        return apiPost<{ summary?: string; recommendations?: typeof teachingRecommendations }>(
          "/api/recommendations", { topicStats, className: child.className, studentId: child.studentId })
          .then((res: { summary?: string; recommendations?: typeof teachingRecommendations; error?: string }) => {
            if (res.error) { setError(res.error); return; }
            setSummary(res.summary ?? "");
            setRecs(res.recommendations ?? []);
          });
      })
      .catch(e => setError(e instanceof Error ? e.message : "Gagal memuat rekomendasi"))
      .finally(() => setLoading(false));
  }, [child]);

  function toggleDone(id: string) {
    setDoneMap(prev => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id); else next.set(id, Date.now());
      saveRecDone(next);
      return next;
    });
  }

  const childName = child?.fullName ?? "anak Anda";

  if (child === null) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Rekomendasi Pengajaran" title="Belum ada anak terhubung" />
        <AlertPanel tone="primary" title="Belum ada tautan ke akun siswa">
          Akun ini belum terhubung ke akun anak manapun. Hubungi admin sekolah untuk menautkan akun anak Anda.
        </AlertPanel>
      </div>
    );
  }
  const pending = recs.filter(r => !doneMap.has(r.id));
  const done = recs.filter(r => doneMap.has(r.id)).sort((a, b) => (doneMap.get(b.id) ?? 0) - (doneMap.get(a.id) ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rekomendasi Pengajaran" title="Saran Belajar dari Guru Kelas"
        description={`Rekomendasi pengajaran untuk ${childName} berdasarkan analisis AI atas hasil asesmen yang sudah dikerjakan.`} />

      {loading && (
        <div className="rounded-card border border-border bg-surface p-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-[13px] text-ink-secondary">AI sedang menganalisis hasil asesmen {childName.split(" ")[0]}...</p>
        </div>
      )}

      {error && !loading && (
        <AlertPanel tone="danger" title="Gagal memuat rekomendasi">{error}</AlertPanel>
      )}

      {!loading && !error && summary && (
        <AIInsightPanel title="Ringkasan AI untuk Orang Tua">
          <p>{summary}</p>
        </AIInsightPanel>
      )}

      {!loading && !error && recs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
            <Lightbulb className="h-6 w-6 text-ink-tertiary" />
          </div>
          <p className="text-[14px] font-semibold text-ink">Belum ada rekomendasi</p>
          <p className="text-[12px] text-ink-secondary">Rekomendasi akan muncul setelah ada hasil asesmen</p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="space-y-4">
          {pending.map(r => <RecommendationCard key={r.id} rec={r} done={false} onToggle={() => toggleDone(r.id)} />)}
        </div>
      )}

      {!loading && recs.length > 0 && pending.length === 0 && (
        <div className="rounded-[10px] border border-success/20 bg-success/5 px-5 py-4 text-center">
          <p className="text-[13px] font-semibold text-success">Semua rekomendasi sudah diselesaikan!</p>
        </div>
      )}

      {!loading && done.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-ink">Rekomendasi yang Sudah Diselesaikan</h3>
              <p className="text-[11px] text-ink-tertiary mt-0.5">Disimpan selama 7 hari · {done.length} item</p>
            </div>
          </div>
          <div className="space-y-3">
            {done.map(r => <RecommendationCard key={r.id} rec={r} done={true} onToggle={() => toggleDone(r.id)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ParentNotificationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Notifikasi" title="Notifikasi"
        description="Klik notifikasi untuk langsung menuju halaman terkait." />
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        {parentNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

// ── Shared admin table helpers ────────────────────────────────────────────────

function AdminTableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border bg-background">
        {cols.map(c => (
          <th key={c} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink-secondary">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function AdminApp({ page }: { page: string }) {
  // dashboard / teachers / classes are standalone pages (src/app/admin/*).
  const screens: Record<string, React.ReactNode> = {
    schools: <AdminSchools />,
    students: <AdminStudents />,
    assessments: <AdminAssessments />,
    analytics: <AdminAnalytics />,
    settings: <AdminSettings />,
  };
  return (
    <AppShell role="admin" nav={adminNav}>
      {screens[page] ?? <AdminSchools />}
    </AppShell>
  );
}

/** undefined = loading, { error } = failed */
function useAdminData<T>(section: "students" | "assessments" | "analytics"): T | { error: string } | undefined {
  const [data, setData] = useState<T | { error: string } | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    apiPost<T>("/api/admin/data", { section }).then(res => {
      if (cancelled) return;
      setData(res.error ? { error: res.error } : res);
    });
    return () => { cancelled = true; };
  }, [section]);
  return data;
}

type RealSchoolRow = { id: string; name: string; city: string | null; province: string | null; status: string; students: number; teachers: number };

async function fetchRealSchools(): Promise<RealSchoolRow[]> {
  // RLS already scopes this correctly: a SCHOOL_ADMIN's session only ever
  // returns their own managed school(s); PLATFORM_ADMIN sees every school.
  // No manual filtering needed here - the boundary is enforced by
  // supabase/migrations/006_school_registration.sql's SELECT policies.
  const { data: schools } = await supabase.from("schools").select("id, name, city, province, status").order("name");
  const rows = schools ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map(r => r.id as string);
  const [{ data: studentRows }, { data: teacherRows }] = await Promise.all([
    supabase.from("students").select("school_id").in("school_id", ids).eq("status", "ACTIVE"),
    supabase.from("teachers").select("school_id").in("school_id", ids),
  ]);
  const studentCount = new Map<string, number>();
  for (const r of (studentRows ?? []) as Array<{ school_id: string }>) studentCount.set(r.school_id, (studentCount.get(r.school_id) ?? 0) + 1);
  const teacherCount = new Map<string, number>();
  for (const r of (teacherRows ?? []) as Array<{ school_id: string }>) teacherCount.set(r.school_id, (teacherCount.get(r.school_id) ?? 0) + 1);

  return rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    city: r.city as string | null,
    province: r.province as string | null,
    status: r.status as string,
    students: studentCount.get(r.id as string) ?? 0,
    teachers: teacherCount.get(r.id as string) ?? 0,
  }));
}

function schoolStatusLabel(status: string): { label: string; tone: "success" | "warning" | "danger" } {
  if (status === "ACTIVE") return { label: "Aktif", tone: "success" };
  if (status === "REJECTED") return { label: "Ditolak", tone: "danger" };
  return { label: "Menunggu Persetujuan", tone: "warning" };
}

function AdminSchools() {
  const [schools, setSchools] = useState<RealSchoolRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRealSchools().then(rows => { if (!cancelled) setSchools(rows); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader eyebrow="Admin" title="Manajemen Sekolah" />
      </div>
      {schools === null ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : schools.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada sekolah" description="Belum ada sekolah yang terdaftar di platform ini." />
      ) : (
        <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
          <table className="w-full">
            <AdminTableHead cols={["Nama Sekolah", "Kota/Provinsi", "Siswa", "Guru", "Status"]} />
            <tbody>
              {schools.map(s => {
                const st = schoolStatusLabel(s.status);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                    <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{s.name}</span></td>
                    <td className="px-4 py-3 text-[12px] text-ink-secondary">{[s.city, s.province].filter(Boolean).join(", ") || "-"}</td>
                    <td className="px-4 py-3 text-[12px] text-ink">{s.students.toLocaleString("id")}</td>
                    <td className="px-4 py-3 text-[12px] text-ink">{s.teachers}</td>
                    <td className="px-4 py-3 text-[12px]"><Badge tone={st.tone}>{st.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AdminStudentRow = {
  id: string; name: string; nis: string | null; school: string; className: string | null; status: string;
  avgScore: number | null; assessments: number; xp: number; streak: number; lastActiveDate: string | null;
};

const STUDENT_STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  ACTIVE: { label: "Aktif", tone: "success" },
  PENDING: { label: "Menunggu", tone: "warning" },
  REJECTED: { label: "Ditolak", tone: "danger" },
};

function formatLastActive(date: string | null): string {
  if (!date) return "Belum pernah";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const days = Math.round((new Date(today).getTime() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function downloadCsv(fileName: string, rows: (string | number | null)[][]) {
  const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

function InviteParentModal({ students, preselectedId, onClose, onDone }: {
  students: AdminStudentRow[]; preselectedId: string; onClose: () => void; onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("Wali");
  const [selected, setSelected] = useState<Set<string>>(new Set([preselectedId]));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ linked: boolean; url: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const emailError = !email.trim() ? "Wajib diisi" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Format email tidak valid" : null;
  const studentError = selected.size === 0 ? "Pilih minimal satu siswa" : null;

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    setAttempted(true);
    if (emailError || studentError) return;
    setSending(true);
    setError("");
    const res = await authedFetch("/api/parent-invite", {
      studentIds: [...selected], parentEmail: email.trim(), relationship,
    }) as { success?: boolean; error?: string; linked?: boolean; invitationUrl?: string } | null;
    setSending(false);
    if (!res || res.error) { setError(res?.error ?? "Gagal mengirim undangan."); return; }
    setResult({
      linked: !!res.linked,
      url: res.invitationUrl ? `${window.location.origin}${res.invitationUrl}` : null,
    });
  }

  function copyLink() {
    if (!result?.url) return;
    navigator.clipboard.writeText(result.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={onDone} />
        <div className="relative w-full max-w-md rounded-card border border-border bg-surface shadow-xl p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-light">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <h2 className="text-[16px] font-bold text-ink">
              {result.linked ? "Langsung Terhubung" : "Undangan Dibuat"}
            </h2>
          </div>
          {result.linked ? (
            <p className="text-[13px] text-ink-secondary leading-relaxed mb-5">
              Akun orang tua dengan email ini sudah ada, jadi langsung terhubung ke {selected.size} siswa yang dipilih. Tidak perlu link registrasi.
            </p>
          ) : (
            <>
              <p className="text-[13px] text-ink-secondary leading-relaxed mb-3">
                Belum ada pengiriman email otomatis - kirimkan link ini sendiri ke orang tua (WhatsApp, email, dsb). Membuka link ini akan menghubungkan semua {selected.size} siswa yang dipilih ke akun yang mereka buat.
              </p>
              <div className="flex items-center gap-2 rounded-[8px] border border-border bg-background px-3 py-2 mb-5">
                <span className="flex-1 text-[12px] text-ink truncate">{result.url}</span>
                <Button variant="outline" className="h-7 px-2 text-[11px] shrink-0" onClick={copyLink}>
                  {copied ? "Tersalin!" : "Salin"}
                </Button>
              </div>
            </>
          )}
          <div className="flex justify-end">
            <Button variant="default" className="h-8 text-[12px]" onClick={onDone}>Selesai</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => !sending && onClose()} />
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface shadow-xl p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-ink">Undang Orang Tua</h2>
          <button onClick={() => !sending && onClose()} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto pr-1">
          <FormField label="Email Orang Tua" required error={attempted ? emailError : null}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="orangtua@email.com"
              className={fieldClass(attempted && !!emailError)} />
          </FormField>
          <FormField label="Hubungan" required>
            <SelectField value={relationship} onChange={setRelationship}
              options={["Ibu", "Ayah", "Wali"].map(r => ({ value: r, label: r }))} />
          </FormField>
          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">
              Siswa yang Terhubung <span className="text-danger">*</span> ({selected.size} dipilih)
            </label>
            <p className="text-[11px] text-ink-tertiary mb-2">Satu orang tua bisa memiliki lebih dari satu anak - centang semua anak yang terhubung ke email ini.</p>
            <div className="rounded-[8px] border border-border max-h-52 overflow-y-auto divide-y divide-border">
              {students.map(s => (
                <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 text-[12px] cursor-pointer hover:bg-background">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-3.5 w-3.5" />
                  <span className="flex-1 text-ink">{s.name}</span>
                  <span className="text-ink-tertiary">{s.className}</span>
                </label>
              ))}
            </div>
          </div>
          {attempted && studentError && <p className="text-[11px] font-medium text-danger">{studentError}</p>}
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border shrink-0">
          <Button variant="outline" className="h-8 text-[12px]" onClick={onClose} disabled={sending}>Batal</Button>
          <Button variant="default" className="h-8 text-[12px]" onClick={handleSend} disabled={sending}>
            {sending ? "Mengirim..." : "Kirim Undangan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminStudents() {
  const data = useAdminData<{ students: AdminStudentRow[] }>("students");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const students = data && "students" in data ? data.students : [];
  const filtered = students.filter(s =>
    (statusFilter === "ALL" || s.status === statusFilter) &&
    (!search || `${s.name} ${s.nis ?? ""} ${s.className ?? ""} ${s.school}`.toLowerCase().includes(search.toLowerCase())));
  const active = students.filter(s => s.status === "ACTIVE");
  const scored = active.filter(s => s.avgScore != null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Manajemen Siswa"
        description="Siswa mendaftar sendiri lewat halaman Daftar, lalu disetujui dan ditempatkan di kelas dari Dasbor."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/dashboard"><Button variant="outline" className="h-8 text-[12px]"><Users className="mr-1.5 h-3.5 w-3.5" />Persetujuan Siswa</Button></Link>
            <Button variant="default" className="h-8 text-[12px]" disabled={filtered.length === 0} onClick={() => downloadCsv("siswa.csv", [
              ["Nama", "NIS", "Sekolah", "Kelas", "Status", "Rata-rata", "Asesmen", "XP", "Streak", "Terakhir Aktif"],
              ...filtered.map(s => [s.name, s.nis, s.school, s.className, STUDENT_STATUS_LABEL[s.status]?.label ?? s.status, s.avgScore, s.assessments, s.xp, s.streak, formatLastActive(s.lastActiveDate)]),
            ])}><Download className="mr-1.5 h-3.5 w-3.5" />Ekspor CSV</Button>
          </div>
        } />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Siswa Aktif", value: data === undefined ? "…" : `${active.length}`, detail: `${students.length - active.length} menunggu/ditolak`, tone: "primary" as const },
          { label: "Aktif Hari Ini", value: data === undefined ? "…" : `${active.filter(s => s.lastActiveDate === today).length}`, detail: "Mengerjakan latihan/asesmen", tone: "success" as const },
          { label: "Rata-rata Nilai", value: data === undefined ? "…" : scored.length ? `${Math.round(scored.reduce((a, s) => a + (s.avgScore ?? 0), 0) / scored.length)}` : "—", detail: "Siswa yang sudah dinilai", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2 w-full max-w-sm">
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
          <input type="text" placeholder="Cari nama, NIS, kelas, sekolah..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[13px] placeholder:text-ink-tertiary focus:outline-none" />
        </div>
        <div className="w-44">
          <SelectField value={statusFilter} onChange={setStatusFilter} options={[
            { value: "ALL", label: "Semua status" }, { value: "ACTIVE", label: "Aktif" }, { value: "PENDING", label: "Menunggu" }, { value: "REJECTED", label: "Ditolak" },
          ]} />
        </div>
      </div>
      {data === undefined ? <SectionLoading message="Memuat data siswa..." /> : "error" in data ? (
        <AlertPanel tone="danger" title="Gagal memuat data siswa">{data.error}</AlertPanel>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={students.length === 0 ? "Belum ada siswa" : "Tidak ada siswa yang cocok"} description={students.length === 0 ? "Siswa akan muncul setelah mendaftar." : "Ubah pencarian atau filter status."} />
      ) : (
        <div className="rounded-card border border-border bg-surface shadow-sm overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <AdminTableHead cols={["Nama Siswa", "Sekolah", "Kelas", "Rata-rata", "XP · Streak", "Terakhir Aktif", "Status", "Aksi"]} />
            <tbody>
              {filtered.map(s => {
                const st = STUDENT_STATUS_LABEL[s.status] ?? { label: s.status, tone: "warning" as const };
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                    <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{s.name}</span>{s.nis && <span className="block text-[10px] text-ink-tertiary">NIS {s.nis}</span>}</td>
                    <td className="px-4 py-3 text-[12px] text-ink-secondary">{s.school}</td>
                    <td className="px-4 py-3 text-[12px] text-ink">{s.className ?? <span className="text-warning">Belum ditempatkan</span>}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {s.avgScore == null ? <span className="text-ink-tertiary">—</span> : <span className={cn("font-semibold", s.avgScore >= 80 ? "text-success" : s.avgScore >= 65 ? "text-warning" : "text-danger")}>{s.avgScore}</span>}
                      <span className="block text-[10px] text-ink-tertiary">{s.assessments} asesmen</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink">{s.xp.toLocaleString("id-ID")} XP · 🔥{s.streak}</td>
                    <td className="px-4 py-3 text-[12px] text-ink">{formatLastActive(s.lastActiveDate)}</td>
                    <td className="px-4 py-3 text-[12px]"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "ACTIVE" ? (
                        <Button variant="ghost" className="h-7 px-2 text-[11px] whitespace-nowrap" onClick={() => setInviteFor(s.id)}>
                          <Mail className="h-3.5 w-3.5 mr-1" />Undang Ortu
                        </Button>
                      ) : <span className="text-[11px] text-ink-tertiary">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {inviteFor && (
        <InviteParentModal
          students={active}
          preselectedId={inviteFor}
          onClose={() => setInviteFor(null)}
          onDone={() => setInviteFor(null)}
        />
      )}
    </div>
  );
}

type AdminAssessmentRow = {
  id: string; title: string; type: string | null; status: string; openAt: string | null; closeAt: string | null;
  school: string; className: string; subject: string; teacher: string; participants: number; avgScore: number | null;
};

function adminAssessmentStatus(a: AdminAssessmentRow, now: number): { label: string; tone: "success" | "warning" | "primary" | "neutral" } {
  if (a.status === "draft") return { label: "Draf", tone: "neutral" };
  if (a.status === "archived") return { label: "Diarsipkan", tone: "neutral" };
  if (a.openAt && now < parseDbTime(a.openAt)) return { label: "Terjadwal", tone: "warning" };
  if (a.closeAt && now >= parseDbTime(a.closeAt)) return { label: "Selesai", tone: "success" };
  return { label: "Berlangsung", tone: "primary" };
}

function AdminAssessments() {
  const data = useAdminData<{ assessments: AdminAssessmentRow[] }>("assessments");
  const list = data && "assessments" in data ? data.assessments : [];
  const now = Date.now();
  const published = list.filter(a => a.status === "published");
  const withScores = list.filter(a => a.avgScore != null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Asesmen"
        actions={
          <Button variant="outline" className="h-8 text-[12px]" disabled={list.length === 0} onClick={() => downloadCsv("laporan-asesmen.csv", [
            ["Judul", "Tipe", "Sekolah", "Kelas", "Mapel", "Guru", "Status", "Dibuka", "Ditutup", "Peserta", "Rata-rata"],
            ...list.map(a => [a.title, a.type, a.school, a.className, a.subject, a.teacher, adminAssessmentStatus(a, now).label,
              a.openAt ? new Date(parseDbTime(a.openAt)).toLocaleString("id-ID") : "", a.closeAt ? new Date(parseDbTime(a.closeAt)).toLocaleString("id-ID") : "",
              a.participants, a.avgScore]),
          ])}><Download className="mr-1.5 h-3.5 w-3.5" />Ekspor Laporan</Button>
        } />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Asesmen Dipublikasikan", value: data === undefined ? "…" : `${published.length}`, detail: `${list.length - published.length} draf/arsip`, tone: "primary" as const },
          { label: "Total Pengerjaan", value: data === undefined ? "…" : `${list.reduce((a, x) => a + x.participants, 0)}`, detail: "Asesmen yang sudah dikumpulkan", tone: "success" as const },
          { label: "Rata-rata Nilai", value: data === undefined ? "…" : withScores.length ? `${Math.round(withScores.reduce((a, x) => a + (x.avgScore ?? 0), 0) / withScores.length)}` : "—", detail: "Rata-rata per asesmen", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {data === undefined ? <SectionLoading message="Memuat asesmen..." /> : "error" in data ? (
        <AlertPanel tone="danger" title="Gagal memuat asesmen">{data.error}</AlertPanel>
      ) : list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Belum ada asesmen" description="Asesmen yang dibuat guru akan muncul di sini." />
      ) : (
        <div className="rounded-card border border-border bg-surface shadow-sm overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <AdminTableHead cols={["Judul Asesmen", "Sekolah · Kelas", "Guru", "Jadwal", "Peserta", "Rata-rata", "Status"]} />
            <tbody>
              {list.map(a => {
                const st = adminAssessmentStatus(a, now);
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                    <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{a.title}</span><span className="block text-[10px] text-ink-tertiary">{a.type ?? "-"} · {a.subject}</span></td>
                    <td className="px-4 py-3 text-[11px] text-ink-secondary">{a.school}<span className="block">{a.className}</span></td>
                    <td className="px-4 py-3 text-[12px] text-ink">{a.teacher}</td>
                    <td className="px-4 py-3 text-[11px] text-ink-secondary">
                      {a.openAt ? new Date(parseDbTime(a.openAt)).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                      {a.closeAt && <span className="block">s/d {new Date(parseDbTime(a.closeAt)).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink">{a.participants}</td>
                    <td className="px-4 py-3 text-[12px]">{a.avgScore == null ? <span className="text-ink-tertiary">—</span> : <span className="font-semibold text-ink">{a.avgScore}</span>}</td>
                    <td className="px-4 py-3 text-[12px]"><Badge tone={st.tone}>{st.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AdminAnalyticsData = {
  activeStudents: number; activeToday: number; activeTeachers: number; publishedAssessments: number;
  gradedAttempts: number; avgScore: number | null;
  activity: { label: string; value: number }[];
  schoolScores: { label: string; value: number }[];
};

function AdminAnalytics() {
  const data = useAdminData<{ analytics: AdminAnalyticsData }>("analytics");
  const a = data && "analytics" in data ? data.analytics : null;
  const v = (x: string) => (data === undefined ? "…" : x);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Analitik"
        description="Ringkasan keterlibatan dan performa dari data asesmen dan latihan siswa." />
      {data && "error" in data && <AlertPanel tone="danger" title="Gagal memuat analitik">{data.error}</AlertPanel>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Siswa Aktif Hari Ini", value: v(a ? `${a.activeToday}` : "—"), detail: a ? `dari ${a.activeStudents} siswa aktif` : "-", tone: "primary" as const },
          { label: "Guru Aktif", value: v(a ? `${a.activeTeachers}` : "—"), detail: "Akun guru disetujui", tone: "neutral" as const },
          { label: "Asesmen Dikerjakan", value: v(a ? `${a.gradedAttempts}` : "—"), detail: a ? `${a.publishedAssessments} asesmen dipublikasikan` : "-", tone: "success" as const },
          { label: "Rata-rata Nilai", value: v(a?.avgScore != null ? `${a.avgScore}` : "—"), detail: "Semua asesmen dinilai", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-card border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">Aktivitas Belajar — 14 Hari Terakhir</h3>
            <p className="text-[11px] text-ink-secondary">Jumlah soal latihan dijawab + asesmen dikumpulkan per hari</p>
          </div>
          <div className="p-5">
            {data === undefined ? <SectionLoading className="h-[130px] py-0" /> : !a || a.activity.every(d => d.value === 0) ? (
              <p className="py-10 text-center text-[12px] text-ink-tertiary">Belum ada aktivitas dalam 14 hari terakhir.</p>
            ) : (
              <SimpleChart data={a.activity.map(d => d.value)} labels={a.activity.map(d => d.label)} type="bar" height={130} />
            )}
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">Rata-rata Nilai per Sekolah</h3>
          </div>
          <div className="p-5 space-y-3">
            {data === undefined ? <SectionLoading /> : !a || a.schoolScores.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-ink-tertiary">Belum ada asesmen yang dinilai.</p>
            ) : a.schoolScores.map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  type SettingsRes = { kind: "platform" | "school"; values: Record<string, string>; status?: string | null };
  const [loaded, setLoaded] = useState<SettingsRes | { error: string } | undefined>(undefined);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  useEffect(() => {
    apiPost<SettingsRes>("/api/admin/settings", { action: "get" }).then(res => {
      if (res.error) { setLoaded({ error: res.error }); return; }
      setLoaded(res);
      setValues(res.values);
    });
  }, []);

  if (loaded === undefined) return <div className="space-y-6 max-w-2xl"><PageHeader eyebrow="Admin" title="Pengaturan" /><SectionLoading message="Memuat pengaturan..." /></div>;
  if ("error" in loaded) return <div className="space-y-6 max-w-2xl"><PageHeader eyebrow="Admin" title="Pengaturan" /><AlertPanel tone="danger" title="Gagal memuat pengaturan">{loaded.error}</AlertPanel></div>;

  const fields = loaded.kind === "platform"
    ? [
        { key: "platformName", label: "Nama Platform", required: true, type: "text", ph: "Catch Up" },
        { key: "adminContactEmail", label: "Email Kontak Admin", required: false, type: "email", ph: "admin@contoh.id" },
        { key: "reportNotificationEmail", label: "Email Notifikasi Laporan", required: false, type: "email", ph: "laporan@contoh.id" },
      ]
    : [
        { key: "name", label: "Nama Sekolah", required: true, type: "text", ph: "SMA Negeri 1 ..." },
        { key: "npsn", label: "NPSN", required: false, type: "text", ph: "8 digit angka" },
        { key: "city", label: "Kota/Kabupaten", required: false, type: "text", ph: "Bandung" },
        { key: "province", label: "Provinsi", required: false, type: "text", ph: "Jawa Barat" },
      ];
  const missing = fields.filter(f => f.required && !(values[f.key] ?? "").trim()).map(f => f.key);

  async function save() {
    setAttempted(true);
    if (missing.length > 0) return;
    setSaving(true);
    const res = await apiPost<SettingsRes>("/api/admin/settings", { action: "save", values });
    setSaving(false);
    if (res.error) { setToast({ message: res.error, tone: "danger" }); return; }
    setValues(res.values);
    setAttempted(false);
    setToast({ message: "Pengaturan berhasil disimpan", tone: "success" });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader eyebrow="Admin" title={loaded.kind === "platform" ? "Pengaturan Platform" : "Profil Sekolah"}
        description={loaded.kind === "platform" ? "Berlaku untuk seluruh platform." : "Data sekolah yang kamu kelola."} />
      <div className="rounded-card border border-border bg-surface shadow-sm p-6 space-y-4">
        {fields.map(f => (
          <FormField key={f.key} label={f.label} required={f.required} error={attempted && missing.includes(f.key) ? "Wajib diisi" : null}>
            <input type={f.type} value={values[f.key] ?? ""} placeholder={f.ph}
              onChange={e => setValues(p => ({ ...p, [f.key]: e.target.value }))}
              className={fieldClass(attempted && missing.includes(f.key))} />
          </FormField>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3">
        {attempted && missing.length > 0 && <span className="mr-auto text-[12px] font-medium text-danger">Tolong lengkapi kolom bertanda *.</span>}
        <Button variant="default" className="h-8 text-[12px]" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan Pengaturan"}</Button>
      </div>
      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}
