"use client";

import React, { useState, useEffect } from "react";
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
  WeakTopicRow,
  NotificationItem,
  MasteryBadge,
} from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  achievements,
  adminStats,
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
import { supabase } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCurrentTeacher, getCurrentStudent, getCurrentParent } from "@/lib/auth/authorization";
import Link from "next/link";
import {
  AlertCircle,
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
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trophy,
  Upload,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED LOCAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function ConfirmDialog({
  open, title, message, confirmLabel, confirmVariant = "default", cancelLabel = "Batal", onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string;
  confirmLabel: string; confirmVariant?: "default" | "success" | "danger" | "amber";
  cancelLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-[16px] font-bold text-ink mb-2">{title}</h2>
        <p className="text-[13px] text-ink-secondary leading-relaxed mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
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
  const teacher = useRealTeacher();
  const classes = teacher?.classes ?? [];
  const activeClassYear = classes.find(c => c.id === activeClass)?.year;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6 rounded-[10px] border border-border bg-surface px-4 py-2.5 shadow-sm">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary shrink-0 mr-1">Kelas:</span>
      {classes.map(cls => (
        <button
          key={cls.id}
          onClick={() => changeActiveClass(cls.id)}
          className={cn(
            "px-3 py-1 rounded-full text-[12px] font-semibold border transition-all",
            activeClass === cls.id
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-background text-ink-secondary border-border hover:border-primary/40 hover:text-ink"
          )}
        >
          {cls.name}
        </button>
      ))}
      {activeClassYear && <span className="ml-auto text-[11px] text-ink-tertiary hidden sm:block">Tahun Ajaran {activeClassYear}</span>}
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
    const activeAssignment = teacher.assignments.find(a => a.classId === activeClassId);
    const activeSubjectId = activeAssignment?.subjectId;
    const activeSubjectName = activeAssignment?.subjectName ?? "Umum";

    if (!activeClassId || !activeSubjectId) {
      setToast({ message: "Pilih kelas aktif terlebih dahulu.", tone: "primary" });
      setUploading(false);
      return;
    }

    const title = file.name.replace(/\.[^/.]+$/, "");
    const matId = await insertMaterial({
      schoolId: teacher.schoolId, classId: activeClassId, subjectId: activeSubjectId,
      creatorId: teacher.profileId, title, type: "Modul Ajar",
    });
    if (!matId) {
      setToast({ message: "Gagal menyimpan materi. Coba lagi.", tone: "primary" });
      setUploading(false);
      return;
    }
    const uploadedPath = await uploadMaterialFile(file, teacher.schoolId, matId);

    setToast({ message: "Mengunggah materi dan memulai analisis AI...", tone: "primary" });

    // Extract questions from the file already sitting in Storage - the
    // server fetches it directly, so this isn't subject to Vercel's
    // serverless request body size cap the way resending the raw file
    // through this function would be.
    let rawQuestions: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string; topic: string; difficulty: string }> = [];
    if (uploadedPath) {
      try {
        const res = await fetch("/api/extract-and-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storagePath: uploadedPath, fileName: title, count: 5, materialTitle: title, subject: activeSubjectName }),
        });
        const data = await res.json() as { questions?: typeof rawQuestions; error?: string };
        rawQuestions = data.questions ?? [];
      } catch { /* will fall back to empty */ }
    }

    if (!rawQuestions.length) {
      // Fallback: generate from metadata
      try {
        const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialTitle: title, topic: title, subject: activeSubjectName, count: 5, difficulty: "Sedang" }),
        });
        const data = await res.json() as { questions?: typeof rawQuestions };
        rawQuestions = data.questions ?? [];
      } catch { /* ignore */ }
    }

    if (rawQuestions.length > 0) {
      // Push to the real review queue (status 'pending') so it shows up on
      // Tinjau Soal AI, linked back to this real material.
      await insertPendingQuestions(rawQuestions, teacher.schoolId, activeClassId, activeSubjectId, teacher.profileId, title, matId);
      await markMaterialProcessed(matId);

      setToast({ message: `${rawQuestions.length} soal berhasil diekstrak dari "${title}"`, tone: "success" });
      setTimeout(() => onClose(), 1500);
    } else {
      setToast({ message: "Materi disimpan. Tidak ada soal yang diekstrak.", tone: "primary" });
      setTimeout(() => onClose(), 1500);
    }

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
            <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink">Tarik & lepas file di sini</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">PDF, PPT, DOCX · Maks. 50 MB</p>
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

type ClassAnalytics = {
  scoreTrend: number[]; scoreTrendLabels: string[];
  scoreDistribution: number[]; scoreDistributionLabels: string[];
  topicAccuracy: { label: string; value: number }[];
};

// Real replacement for the teacherAnalyticsStats/scoreTrend/scoreDistribution/
// topicAccuracy mock (all permanently empty for this screen). Same
// class+subject dual scoping already established for this teacher dashboard
// (fetchRealClassStudents above) - a teacher's RLS access to
// question_attempts/questions is already scoped to their own assigned
// classes, so unlike the parent-side equivalent this can run as a direct
// client query with no new server route needed.
async function fetchClassAnalytics(classId: string, subjectId: string): Promise<ClassAnalytics> {
  const { data: aRows } = await supabase
    .from("assessments")
    .select("id, title, created_at")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: true });
  const assessments = aRows ?? [];
  const assessmentIds = assessments.map(a => a.id as string);
  const empty: ClassAnalytics = { scoreTrend: [], scoreTrendLabels: [], scoreDistribution: [], scoreDistributionLabels: ["0-40", "41-60", "61-80", "81-100"], topicAccuracy: [] };
  if (assessmentIds.length === 0) return empty;

  const { data: attemptRows } = await supabase
    .from("assessment_attempts")
    .select("id, assessment_id, score")
    .in("assessment_id", assessmentIds)
    .in("status", ["submitted", "graded"]);
  const attempts = (attemptRows ?? []) as Array<{ id: string; assessment_id: string; score: number | null }>;

  const byAssessment = new Map<string, { sum: number; count: number }>();
  for (const a of attempts) {
    if (a.score == null) continue;
    const cur = byAssessment.get(a.assessment_id) ?? { sum: 0, count: 0 };
    cur.sum += a.score;
    cur.count += 1;
    byAssessment.set(a.assessment_id, cur);
  }
  const trendPoints = assessments
    .map(a => ({ title: a.title as string, stat: byAssessment.get(a.id as string) }))
    .filter((p): p is { title: string; stat: { sum: number; count: number } } => !!p.stat);
  const scoreTrend = trendPoints.map(p => Math.round(p.stat.sum / p.stat.count));
  const scoreTrendLabels = trendPoints.map(p => p.title);

  const latestWithData = [...assessments].reverse().find(a => byAssessment.has(a.id as string));
  let scoreDistribution: number[] = [];
  if (latestWithData) {
    const scores = attempts.filter(a => a.assessment_id === latestWithData.id && a.score != null).map(a => a.score as number);
    const buckets = [0, 0, 0, 0];
    for (const s of scores) {
      if (s <= 40) buckets[0]++;
      else if (s <= 60) buckets[1]++;
      else if (s <= 80) buckets[2]++;
      else buckets[3]++;
    }
    scoreDistribution = buckets;
  }

  const attemptIds = attempts.map(a => a.id);
  const topicAccuracy: { label: string; value: number }[] = [];
  if (attemptIds.length > 0) {
    const { data: qaRows } = await supabase
      .from("question_attempts")
      .select("is_correct, assessment_questions(questions(topic))")
      .in("assessment_attempt_id", attemptIds);
    type QARow = { is_correct: boolean | null; assessment_questions: { questions: { topic: string } | null } | null };
    const byTopic = new Map<string, { total: number; correct: number }>();
    for (const r of (qaRows ?? []) as unknown as QARow[]) {
      const topic = r.assessment_questions?.questions?.topic;
      if (!topic) continue;
      const cur = byTopic.get(topic) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (r.is_correct) cur.correct += 1;
      byTopic.set(topic, cur);
    }
    for (const [label, v] of byTopic.entries()) {
      topicAccuracy.push({ label, value: Math.round((v.correct / v.total) * 100) });
    }
  }

  return { scoreTrend, scoreTrendLabels, scoreDistribution, scoreDistributionLabels: empty.scoreDistributionLabels, topicAccuracy };
}

type OwnStudentStats = { avgScore: number; xp: number; streak: number; rank: number; classSize: number; className: string; totalAssessments: number };

// Real replacement for the studentProfile/studentProgressStats mock: computes
// the signed-in student's own average (across every subject, unlike the
// teacher-side dashboard's class+subject dual scoping - a student's overall
// progress view isn't tied to one subject), real xp/streak (already real
// columns on `students`), and a real class rank derived the same way as
// computeRealClassStats/fetchRealClassStudents (rank by avgScore desc,
// no-data students last).
async function fetchOwnStudentStats(): Promise<OwnStudentStats | null> {
  const student = await getCurrentStudent();
  if (!student || !student.class_id) return null;
  return fetchClassRankedStats(student.id, student.class_id);
}

// Shared by a student viewing their own stats and a parent viewing a linked
// child's stats - same ranking computation, just parameterized by whose
// student row to resolve. `xp`/`streak_days` are real columns on `students`
// (added by migration 007) but not yet reflected in the generated
// supabase/types.ts, so this reads them with an explicit select + cast, the
// same workaround fetchRealClassStudents already uses above.
async function fetchClassRankedStats(studentId: string, classId: string): Promise<OwnStudentStats | null> {
  const [{ data: classData }, { data: classmates }] = await Promise.all([
    supabase.from("classes").select("name").eq("id", classId).single(),
    supabase.from("students").select("id, xp, streak_days").eq("class_id", classId).eq("status", "ACTIVE"),
  ]);
  const roster = (classmates ?? []) as Array<{ id: string; xp: number; streak_days: number }>;
  const self = roster.find(r => r.id === studentId);
  if (!self) return null;

  const { data: aRows } = await supabase.from("assessments").select("id").eq("class_id", classId);
  const assessmentIds = (aRows ?? []).map(r => r.id as string);

  const scoreByStudent = new Map<string, { sum: number; count: number }>();
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

  const withScores = roster.map(r => {
    const stat = scoreByStudent.get(r.id);
    return { id: r.id, avgScore: stat ? stat.sum / stat.count : null };
  });
  const ranked = [...withScores].sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));
  const rankMap = new Map(ranked.map((s, i) => [s.id, i + 1]));

  const own = scoreByStudent.get(studentId);
  return {
    avgScore: own ? Math.round(own.sum / own.count) : 0,
    xp: self.xp,
    streak: self.streak_days,
    rank: rankMap.get(studentId) ?? roster.length,
    classSize: roster.length,
    className: classData?.name ?? "-",
    totalAssessments: own?.count ?? 0,
  };
}

function useOwnStudentStats(): OwnStudentStats | null {
  const [stats, setStats] = useState<OwnStudentStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchOwnStudentStats().then(s => { if (!cancelled) setStats(s); });
    return () => { cancelled = true; };
  }, []);
  return stats;
}

function ownStudentStatCards(stats: OwnStudentStats | null) {
  return [
    { label: "Rata-rata nilai", value: stats ? String(stats.avgScore) : "-", detail: "Dari asesmen yang sudah dinilai", tone: "success" as const },
    { label: "XP terkumpul", value: stats ? stats.xp.toLocaleString("id-ID") : "-", detail: "Poin pengalaman belajar", tone: "primary" as const },
    { label: "Streak belajar", value: stats ? `${stats.streak} hari` : "-", detail: "Konsistensi belajar harian", tone: "neutral" as const },
    { label: "Peringkat kelas", value: stats ? `#${stats.rank}` : "-", detail: stats?.className ?? "-", tone: "warning" as const },
  ];
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────

function TeacherDashboard() {
  const router = useRouter();
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name;
  const activeAssignment = teacher?.assignments.find(a => a.classId === activeClass);
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
const _teacherListeners = new Set<(t: RealTeacherContext | null) => void>();

async function loadRealTeacher(): Promise<RealTeacherContext | null> {
  if (_realTeacher) return _realTeacher;
  if (_realTeacherPromise) return _realTeacherPromise;
  _realTeacherPromise = (async () => {
    const profile = await getCurrentProfile();
    if (!profile) return null;
    const teacher = await getCurrentTeacher();
    if (!teacher) return null;
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
      classes: Array.from(classMap.values()),
      subjects: Array.from(subjectMap.values()),
      assignments,
    };
    _realTeacher = result;
    _teacherListeners.forEach(fn => fn(result));
    return result;
  })();
  return _realTeacherPromise;
}

function useRealTeacher(): RealTeacherContext | null {
  const [teacher, setTeacher] = useState<RealTeacherContext | null>(_realTeacher);
  useEffect(() => {
    if (!_realTeacher) loadRealTeacher();
    _teacherListeners.add(setTeacher);
    return () => { _teacherListeners.delete(setTeacher); };
  }, []);
  return teacher;
}

// ── Active class store (backed by the real teacher's real assigned classes) ──
let _activeClassId = "";
const _classListeners = new Set<(id: string) => void>();

function getActiveClassId(): string {
  if (!_activeClassId && _realTeacher && _realTeacher.classes.length > 0) {
    _activeClassId = lsGet<string>("catchup_active_class") ?? _realTeacher.classes[0].id;
  }
  return _activeClassId;
}

function changeActiveClass(id: string) {
  _activeClassId = id;
  lsSet("catchup_active_class", id);
  _classListeners.forEach(fn => fn(id));
}

function useActiveClass(): [string, typeof changeActiveClass] {
  const teacher = useRealTeacher();
  const [cls, setCls] = useState<string>("");
  useEffect(() => {
    if (teacher && teacher.classes.length > 0) {
      setCls(getActiveClassId());
    }
    _classListeners.add(setCls);
    return () => { _classListeners.delete(setCls); };
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
  };
}

function bankRowToPending(row: BankRow): PendingQuestion {
  return {
    id: row.id,
    question: row.question,
    optionA: row.options.A,
    optionB: row.options.B,
    optionC: row.options.C,
    optionD: row.options.D,
    correctAnswer: row.correct_answer as "A" | "B" | "C" | "D",
    explanation: row.explanation ?? "",
    topic: row.topic,
    difficulty: row.difficulty ?? "Sedang",
    sourceRef: row.source_title ?? "AI Generated",
    status: "Perlu Ditinjau",
  };
}

let _bankKey: string | null = null;
let _bankLoading: Promise<void> | null = null;
const _bankStore: { questions: QuestionBankEntry[] } = { questions: [] };
const _reviewStore: { questions: PendingQuestion[] } = { questions: [] };
const _bankListeners = new Set<() => void>();

// All of the caches above (_realTeacher, _activeClassId, _bankStore/_bankKey/
// _reviewStore) are plain module-level variables, not scoped to any
// particular signed-in session - switching accounts in the same browser tab
// is a client-side navigation, not a full page reload, so nothing was ever
// clearing them. A teacher who logged out and back in (or who briefly
// switched to another account to test something) kept seeing whatever the
// previous session had already cached - stale class list, stale bank/review
// queues, or an empty bank if the last cache write happened to be for a
// different class+subject combination than the one now being viewed. This
// resets every one of them on any real sign-in/sign-out transition so a
// fresh session always starts from a real, freshly-fetched state.
supabase.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
  _realTeacher = null;
  _realTeacherPromise = null;
  _teacherListeners.forEach(fn => fn(null));
  _activeClassId = "";
  _bankKey = null;
  _bankLoading = null;
  _bankStore.questions = [];
  _reviewStore.questions = [];
  _bankListeners.forEach(fn => fn());
});

async function loadBankAndReview(classId: string, subjectId: string): Promise<void> {
  const key = `${classId}:${subjectId}`;
  if (_bankKey === key) return _bankLoading ?? Promise.resolve();
  _bankKey = key;
  _bankLoading = (async () => {
    const { data } = await supabase
      .from("questions")
      .select("id, source, topic, subtopic, difficulty, bloom_level, question, options, correct_answer, explanation, source_title, source_page, status, usage_count, success_rate")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as BankRow[];
    _bankStore.questions = rows.filter(r => r.status === "active").map(bankRowToEntry);
    _reviewStore.questions = rows.filter(r => r.status === "pending").map(bankRowToPending);
    _bankListeners.forEach(fn => fn());
  })();
  return _bankLoading;
}

function refreshBankAndReview(classId: string, subjectId: string): Promise<void> {
  _bankKey = null;
  return loadBankAndReview(classId, subjectId);
}

function useQuestionBank(classId: string | undefined, subjectId: string | undefined): { bank: QuestionBankEntry[]; pending: PendingQuestion[] } {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!classId || !subjectId) return;
    loadBankAndReview(classId, subjectId).then(() => bump(x => x + 1));
    const listener = () => bump(x => x + 1);
    _bankListeners.add(listener);
    return () => { _bankListeners.delete(listener); };
  }, [classId, subjectId]);
  return { bank: _bankStore.questions, pending: _reviewStore.questions };
}

// Insert freshly AI-generated questions straight into the review queue (status 'pending')
async function insertPendingQuestions(
  raw: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string; topic: string; difficulty: string }>,
  schoolId: string, classId: string, subjectId: string, creatorId: string, sourceTitle: string,
  sourceMaterialId?: string,
): Promise<void> {
  if (!raw.length) return;
  const rows = raw.map(q => ({
    school_id: schoolId,
    class_id: classId,
    subject_id: subjectId,
    creator_id: creatorId,
    source: "ai_generated" as const,
    topic: q.topic || "Umum",
    subtopic: q.topic || "Umum",
    difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty) ? q.difficulty : "Sedang") as Difficulty,
    bloom_level: "Menerapkan" as const,
    question: q.question,
    options: { A: q.options.A ?? "", B: q.options.B ?? "", C: q.options.C ?? "", D: q.options.D ?? "" },
    correct_answer: (["A", "B", "C", "D", "E"].includes(q.correctAnswer) ? q.correctAnswer : "A") as "A" | "B" | "C" | "D" | "E",
    explanation: q.explanation,
    status: "pending" as const,
    source_title: sourceTitle,
    source_material_id: sourceMaterialId ?? null,
  }));
  await supabase.from("questions").insert(rows);
  await refreshBankAndReview(classId, subjectId);
}

async function saveManualQToBank(
  q: typeof EMPTY_MANUAL_Q,
  schoolId: string, classId: string, subjectId: string, creatorId: string,
): Promise<boolean> {
  if (!q.text.trim() || !q.optA.trim() || !q.optB.trim() || !q.optC.trim() || !q.optD.trim() || !q.topic.trim()) return false;
  await supabase.from("questions").insert({
    school_id: schoolId,
    class_id: classId,
    subject_id: subjectId,
    creator_id: creatorId,
    source: "bank",
    topic: q.topic.trim(),
    subtopic: q.topic.trim(),
    difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty) ? q.difficulty : "Sedang") as Difficulty,
    bloom_level: "Menerapkan",
    question: q.text.trim(),
    options: { A: q.optA.trim(), B: q.optB.trim(), C: q.optC.trim(), D: q.optD.trim() },
    correct_answer: (["A", "B", "C", "D"].includes(q.correct) ? q.correct : "A") as "A" | "B" | "C" | "D",
    explanation: q.explanation.trim(),
    status: "active",
    source_title: "Manual Guru",
  });
  await refreshBankAndReview(classId, subjectId);
  return true;
}

async function approveBankQuestion(merged: PendingQuestion, classId: string, subjectId: string): Promise<void> {
  await supabase.from("questions").update({
    status: "active",
    question: merged.question,
    topic: merged.topic,
    subtopic: merged.topic,
    difficulty: merged.difficulty,
    explanation: merged.explanation,
    correct_answer: merged.correctAnswer,
    options: { A: merged.optionA, B: merged.optionB, C: merged.optionC, D: merged.optionD },
  }).eq("id", merged.id);
  await refreshBankAndReview(classId, subjectId);
}

// "Tolak" hard-deletes the row (never a soft status flip) - safe only
// because this only ever targets 'pending' rows, which by construction
// have never been approved into an assessment/practice session, so there
// is nothing for the ON DELETE CASCADE chain to destroy. The RLS DELETE
// policy (migration 010) enforces status='pending' server-side too.
async function rejectBankQuestion(id: string, classId: string, subjectId: string): Promise<void> {
  await supabase.from("questions").delete().eq("id", id).eq("status", "pending");
  await refreshBankAndReview(classId, subjectId);
}

async function approveAllBankQuestions(merged: PendingQuestion[], classId: string, subjectId: string): Promise<void> {
  await Promise.all(merged.map(m => supabase.from("questions").update({
    status: "active",
    question: m.question,
    topic: m.topic,
    subtopic: m.topic,
    difficulty: m.difficulty,
    explanation: m.explanation,
    correct_answer: m.correctAnswer,
    options: { A: m.optionA, B: m.optionB, C: m.optionC, D: m.optionD },
  }).eq("id", m.id)));
  await refreshBankAndReview(classId, subjectId);
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
      ? new Date(row.open_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    openAt: row.open_at ?? undefined,
    closeAt: row.close_at ?? undefined,
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
    const closed = r.close_at ? now > new Date(r.close_at).getTime() : false;
    saved.status = done ? "Selesai" : closed ? "Berlangsung" : "Terjadwal";
    return saved;
  });
}

type ReviewListItem = { attemptId: string; assessmentId: string; assessmentTitle: string; type: string; date: string; score: number; allowReview: boolean };
type ReviewQuestionDetail = {
  question: string; options: Record<string, string>; correctAnswer: string; explanation: string;
  yourAnswer: string | null; isCorrect: boolean; topic: string; sourceTitle: string | null; sourcePage: number | null;
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
    score: r.score ?? 0,
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
    score: r.score ?? 0,
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
async function fetchAttemptReviewDetail(attemptId: string): Promise<ReviewQuestionDetail[]> {
  const { data } = await supabase
    .from("question_attempts")
    .select("student_answer, is_correct, assessment_questions(question_order, questions(question, options, correct_answer, explanation, topic, source_title, source_page))")
    .eq("assessment_attempt_id", attemptId);
  type Row = {
    student_answer: string | null; is_correct: boolean | null;
    assessment_questions: {
      question_order: number;
      questions: { question: string; options: Record<string, string>; correct_answer: string; explanation: string | null; topic: string; source_title: string | null; source_page: number | null } | null;
    } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter(r => r.assessment_questions?.questions);
  rows.sort((a, b) => (a.assessment_questions?.question_order ?? 0) - (b.assessment_questions?.question_order ?? 0));
  return rows.map(r => ({
    question: r.assessment_questions!.questions!.question,
    options: r.assessment_questions!.questions!.options,
    correctAnswer: r.assessment_questions!.questions!.correct_answer,
    explanation: r.assessment_questions!.questions!.explanation ?? "",
    yourAnswer: r.student_answer,
    isCorrect: !!r.is_correct,
    topic: r.assessment_questions!.questions!.topic,
    sourceTitle: r.assessment_questions!.questions!.source_title,
    sourcePage: r.assessment_questions!.questions!.source_page,
  }));
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
};

// Extends the shared mock Material shape with the real Storage path -
// structurally assignable anywhere a plain Material is expected (MaterialCard
// etc.), while still letting callers that need to download/re-extract the
// file get at file_url without a parallel lookup structure.
type MaterialWithFile = Material & { fileUrl: string | null };

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
  };
}

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
    .select("id, title, type, file_url, file_size, ai_processed, status, class_id, subject_id, created_at")
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
    .select("id, title, type, file_url, file_size, ai_processed, status, class_id, subject_id, created_at, subjects(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  type Row = MaterialRow & { subjects: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map(r => materialRowToMock(r, undefined, r.subjects?.name ?? "Umum", 0));
}

async function insertMaterial(params: { schoolId: string; classId: string; subjectId: string; creatorId: string; title: string; type: string }): Promise<string | null> {
  const { data, error } = await supabase.from("materials").insert({
    school_id: params.schoolId,
    class_id: params.classId,
    subject_id: params.subjectId,
    creator_id: params.creatorId,
    title: params.title,
    type: params.type,
    status: "active",
  }).select("id").single();
  if (error || !data) return null;
  return data.id;
}

async function uploadMaterialFile(file: File, schoolId: string, materialId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${schoolId}/${materialId}.${ext}`;
  const { error } = await supabase.storage.from("materials").upload(path, file, { upsert: true });
  if (error) return null;
  await supabase.from("materials").update({ file_url: path, file_size: file.size }).eq("id", materialId);
  return path;
}

async function markMaterialProcessed(materialId: string): Promise<void> {
  await supabase.from("materials").update({ ai_processed: true, ai_processed_at: new Date().toISOString() }).eq("id", materialId);
}

// Download always goes through a fresh short-lived signed URL - `materials`
// is a private bucket (supabase/migrations/008), never a public one.
async function downloadMaterialFile(fileUrl: string, fallbackName: string): Promise<void> {
  const { data } = await supabase.storage.from("materials").createSignedUrl(fileUrl, 60);
  if (!data?.signedUrl) return;
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  questionSource: "ai" | "bank";
  aiQuestions: typeof questionBank;
  bankQuestionIds: string[];
}): Promise<{ id: string } | null> {
  const { data: assessmentRow, error } = await supabase.from("assessments").insert({
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
  }).select("id").single();
  if (error || !assessmentRow) return null;

  let questionIds: string[] = [];
  if (params.questionSource === "ai" && params.aiQuestions.length > 0) {
    const rows = params.aiQuestions.map(q => ({
      school_id: params.schoolId,
      class_id: params.classId,
      subject_id: params.subjectId,
      creator_id: params.creatorId,
      source: "ai_generated" as const,
      topic: q.topic,
      subtopic: q.topic,
      difficulty: q.difficulty,
      bloom_level: "Menerapkan" as const,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      status: "active" as const,
      source_title: q.source,
    }));
    const { data: inserted } = await supabase.from("questions").insert(rows).select("id");
    questionIds = (inserted ?? []).map(r => r.id);
    await refreshBankAndReview(params.classId, params.subjectId);
  } else {
    questionIds = params.bankQuestionIds;
  }

  if (questionIds.length > 0) {
    const aqRows = questionIds.map((qid, i) => ({
      assessment_id: assessmentRow.id,
      question_id: qid,
      question_order: i + 1,
      status: "approved" as const,
    }));
    await supabase.from("assessment_questions").insert(aqRows);
  }

  return { id: assessmentRow.id };
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

function TeacherMaterials() {
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name;
  // The active class may have more than one subject assigned to this
  // teacher (unlike the old single-subject mock assumption) - resolved to
  // the subject actually taught in the active class specifically.
  const activeAssignment = teacher?.assignments.find(a => a.classId === activeClass);
  const activeSubjectName = activeAssignment?.subjectName ?? "Umum";
  const activeSubjectId = activeAssignment?.subjectId;
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedMaterials, setUploadedMaterials] = useState<MaterialWithFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialWithFile | null>(null);
  const [confirmProcessId, setConfirmProcessId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const [editMeta, setEditMeta] = useState(false);
  const [materialFiles, setMaterialFiles] = useState<Record<string, File>>({});
  const [materialQuestions, setMaterialQuestions] = useState<Record<string, typeof questionBank>>({});
  const [generatingMore, setGeneratingMore] = useState<string | null>(null);

  const reloadMaterials = React.useCallback(() => {
    if (!teacher) { setUploadedMaterials([]); return; }
    const classNamesById = new Map(teacher.classes.map(c => [c.id, c.name]));
    const subjectNamesById = new Map(teacher.subjects.map(s => [s.id, s.name]));
    fetchTeacherMaterials(showAllClasses ? null : activeClass, activeSubjectId, classNamesById, subjectNamesById).then(setUploadedMaterials);
  }, [teacher, activeClass, activeSubjectId, showAllClasses]);

  useEffect(() => { reloadMaterials(); }, [reloadMaterials]);

  // Cancel pending upload form when teacher switches class
  const prevClassRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (prevClassRef.current !== null && prevClassRef.current !== activeClass && activeClass) {
      if (showUpload) {
        setShowUpload(false);
        setUploadedFile(null);
        setToast({ message: "Form upload dibatalkan karena kamu berpindah kelas.", tone: "primary" });
      }
    }
    prevClassRef.current = activeClass;
  }, [activeClass, showUpload]);

  // showAllClasses drives reloadMaterials directly (a real re-fetch across
  // every class this teacher is assigned to, RLS-scoped) rather than a
  // client-side filter over an already-fetched list.
  const allMaterials = uploadedMaterials;

  function handleProcessAI(id: string) {
    setConfirmProcessId(id);
  }

  async function generateQuestionsFromMaterial(
    id: string,
    append = false,
    storagePathOverride?: string,
    matOverride?: { title: string; subject: string },
  ): Promise<number> {
    const mat = matOverride ?? allMaterials.find(m => m.id === id);
    const storagePath = storagePathOverride ?? (mat && "fileUrl" in mat ? (mat as MaterialWithFile).fileUrl ?? undefined : undefined);

    let rawQuestions: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string; topic: string; difficulty: string }> = [];

    if (storagePath) {
      // Real extraction: the server fetches the file directly from Storage
      // (not through this request), so this isn't subject to Vercel's
      // serverless request body size cap the way sending the raw file would be.
      try {
        const res = await fetch("/api/extract-and-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storagePath, fileName: mat?.title ?? "Materi", count: 5, materialTitle: mat?.title ?? "Materi", subject: mat?.subject ?? activeSubjectName }),
        });
        const data = await res.json() as { questions?: typeof rawQuestions; error?: string };
        if (data.error && !data.questions?.length) {
          setToast({ message: data.error, tone: "primary" });
          return 0;
        }
        rawQuestions = data.questions ?? [];
      } catch {
        setToast({ message: "Gagal menghubungi AI. Periksa koneksi dan API key.", tone: "primary" });
        return 0;
      }
    } else {
      // Fallback for demo materials: generate from metadata
      try {
        const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialTitle: mat?.title ?? "Materi",
            topic: mat?.subject ?? mat?.title ?? "Umum",
            subject: mat?.subject ?? activeSubjectName,
            count: 5,
            difficulty: "Sedang",
          }),
        });
        const data = await res.json() as { questions?: typeof rawQuestions; error?: string };
        rawQuestions = data.questions ?? [];
      } catch {
        setToast({ message: "Gagal menghubungi AI. Periksa koneksi dan API key.", tone: "primary" });
        return 0;
      }
    }

    if (!rawQuestions.length) {
      setToast({ message: "AI tidak menghasilkan soal. Coba lagi.", tone: "primary" });
      return 0;
    }

    const existingCount = materialQuestions[id]?.length ?? 0;
    const generated: typeof questionBank = rawQuestions.map((q, i) => ({
      id: `ai-${id}-${existingCount + i}`,
      question: q.question,
      topic: q.topic,
      subtopic: q.topic,
      bloom: "Menerapkan" as const,
      difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty) ? q.difficulty : "Sedang") as "Mudah" | "Sedang" | "Sulit",
      styleType: "TKA" as const,
      source: mat?.title ?? "AI Generated",
      usageCount: 0,
      successRate: 0,
      status: "Disetujui" as const,
      isLocked: false,
      options: { A: q.options.A ?? "", B: q.options.B ?? "", C: q.options.C ?? "", D: q.options.D ?? "" },
      correctAnswer: (["A","B","C","D"].includes(q.correctAnswer) ? q.correctAnswer : "A") as "A" | "B" | "C" | "D",
      explanation: q.explanation,
    }));

    setMaterialQuestions(prev => ({ ...prev, [id]: append ? [...(prev[id] ?? []), ...generated] : generated }));

    // Push to the real review queue (status 'pending') - teacher must approve
    // on Tinjau Soal AI before these enter the bank. Linked back to this real
    // material id now that materials are real rows too.
    if (teacher && activeClass && activeSubjectId) {
      await insertPendingQuestions(rawQuestions, teacher.schoolId, activeClass, activeSubjectId, teacher.profileId, mat?.title ?? "AI Generated", id);
    }

    const total = (append ? existingCount : 0) + generated.length;
    setToast({ message: `${generated.length} soal baru dari materi ini ditambahkan (total: ${total}).`, tone: "success" });
    return total;
  }

  async function startAIProcess(id: string) {
    setConfirmProcessId(null);
    setProcessingIds(prev => new Set([...prev, id]));
    const count = await generateQuestionsFromMaterial(id, false);
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    setProcessedIds(prev => new Set([...prev, id]));
    if (count > 0) {
      await markMaterialProcessed(id);
      setUploadedMaterials(prev => prev.map(m => m.id === id ? { ...m, aiProcessed: true, questionsGenerated: count } : m));
    }
  }

  const m = selectedMaterial;
  const isDialogProcessed = m ? (m.aiProcessed || processedIds.has(m.id)) : false;
  const isDialogProcessing = m ? processingIds.has(m.id) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pustaka Materi"
        title="Manajemen Materi"
        description="Unggah buku teks, PPT, RPP, dan modul ajar. AI mengekstrak soal secara otomatis."
        actions={
          <Button variant="default" className="h-8 text-[12px]" onClick={() => setShowUpload(!showUpload)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Materi
          </Button>
        }
      />

      {showUpload && (
        <div className="rounded-card border-2 border-dashed border-primary/30 bg-primary-soft p-8">
          <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" className="hidden"
            onChange={e => setUploadedFile(e.target.files?.[0] ?? null)} />
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
                dragOver ? "border-primary bg-primary/10" : "border-primary/30 bg-white"
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); setUploadedFile(e.dataTransfer.files[0] ?? null); }}
            >
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-ink">Tarik & lepas file di sini</p>
              <p className="text-[12px] text-ink-secondary mt-1">PDF, PPT, DOCX · Maks. 50 MB per file</p>
            </div>
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => fileInputRef.current?.click()}>Pilih File</Button>
          </div>
          {uploadedFile && (
            <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-success/30 bg-success-light px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-ink truncate">{uploadedFile.name}</div>
                <div className="text-[10px] text-ink-secondary">{(uploadedFile.size / 1024).toFixed(0)} KB</div>
              </div>
              <button onClick={() => setUploadedFile(null)} className="text-ink-tertiary hover:text-danger shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-primary/20 bg-primary-soft px-3 py-2">
            <span className="text-[11px] font-semibold text-primary">Materi untuk kelas:</span>
            <span className="text-[12px] font-bold text-primary">{activeClassName ?? "-"}</span>
            <span className="text-[10px] text-primary/60 ml-1">(sesuai kelas aktif di atas)</span>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-primary/10 pt-4">
            {[
              { label: "Tipe Materi *", ph: "Buku Teks, PPT, RPP, Modul Ajar..." },
              { label: "Mata Pelajaran *", ph: activeSubjectName },
              { label: "Bab/Topik *", ph: "Fungsi Kuadrat" },
              { label: "Tahun Ajaran *", ph: "2025/2026" },
              { label: "Penerbit (opsional)", ph: "Erlangga, Grafindo, dst." },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">{f.label}</label>
                <input type="text" placeholder={f.ph}
                  className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Sumber *</label>
              <input type="text" placeholder="Buku wajib / materi guru / internal"
                className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => { setShowUpload(false); setUploadedFile(null); }}>Batal</Button>
            <Button variant="default" className="h-8 text-[12px]" disabled={uploading}
              onClick={async () => {
                if (!teacher || !activeClass || !activeSubjectId) {
                  setToast({ message: "Pilih kelas aktif terlebih dahulu.", tone: "primary" });
                  return;
                }
                setUploading(true);
                const capturedFile = uploadedFile;
                const fileName = capturedFile?.name ?? "Materi Baru";
                const title = fileName.replace(/\.[^/.]+$/, "");

                const matId = await insertMaterial({
                  schoolId: teacher.schoolId, classId: activeClass, subjectId: activeSubjectId,
                  creatorId: teacher.profileId, title, type: "Modul Ajar",
                });
                if (!matId) {
                  setToast({ message: "Gagal menyimpan materi. Coba lagi.", tone: "primary" });
                  setUploading(false);
                  return;
                }

                const newMat: MaterialWithFile = {
                  id: matId,
                  title,
                  type: "Modul Ajar",
                  subject: activeSubjectName,
                  classId: activeClass,
                  className: activeClassName,
                  uploadedAt: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
                  pages: 0,
                  status: "Diproses",
                  aiProcessed: false,
                  questionsGenerated: 0,
                  fileUrl: null,
                };
                setUploadedMaterials(prev => [newMat, ...prev]);

                // Keep the file in-memory for this session's own download
                // button, and upload it to real Storage - the extraction
                // call below fetches it back from there server-side rather
                // than resending the raw bytes through Vercel.
                let uploadedPath: string | null = null;
                if (capturedFile) {
                  setMaterialFiles(prev => ({ ...prev, [matId]: capturedFile }));
                  uploadedPath = await uploadMaterialFile(capturedFile, teacher.schoolId, matId);
                }

                // Close upload panel immediately so user sees the list
                setShowUpload(false);
                setUploadedFile(null);
                setToast({ message: "Mengunggah materi dan memulai analisis AI...", tone: "primary" });

                // Step 1: Quick summarize for metadata
                try {
                  await fetch("/api/summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ materialTitle: title, topic: title, subject: activeSubjectName }),
                  });
                } catch { /* metadata summary is best-effort, doesn't block the flow */ }
                setUploadedMaterials(prev => prev.map(m => m.id === matId ? { ...m, status: "Aktif" as Material["status"] } : m));

                // Step 2: Generate real questions from file content
                setProcessingIds(prev => new Set([...prev, matId]));
                setToast({ message: "AI sedang membaca isi materi dan membuat soal...", tone: "primary" });
                const count = await generateQuestionsFromMaterial(
                  matId, false,
                  uploadedPath ?? undefined,
                  { title, subject: activeSubjectName },
                );
                setProcessingIds(prev => { const next = new Set(prev); next.delete(matId); return next; });
                setProcessedIds(prev => new Set([...prev, matId]));
                if (count > 0) {
                  await markMaterialProcessed(matId);
                  setUploadedMaterials(prev => prev.map(m => m.id === matId ? { ...m, aiProcessed: true, questionsGenerated: count } : m));
                  setToast({ message: `${count} soal berhasil diekstrak dari materi "${title}"`, tone: "success" });
                }

                setUploading(false);
              }}>
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
          { label: "Diproses AI", value: `${allMaterials.filter(mat => mat.aiProcessed).length + processedIds.size}`, detail: "Dari total materi", tone: "success" as const },
          { label: "Soal diekstrak", value: allMaterials.reduce((s, mat) => s + mat.questionsGenerated, 0).toString(), detail: "Siap digunakan", tone: "primary" as const },
          { label: "Menunggu proses", value: `${Math.max(0, allMaterials.filter(mat => !mat.aiProcessed && mat.status !== "Draf").length - processedIds.size)}`, detail: "Dalam antrean", tone: "warning" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 gap-3 flex-wrap">
          <h2 className="text-[14px] font-bold text-ink">
            Daftar Materi — {activeClassName ?? "…"} ({allMaterials.length})
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
          {allMaterials.length === 0 && (
            <div className="py-8 text-center text-[13px] text-ink-secondary">
              Belum ada materi untuk kelas <span className="font-semibold text-ink">{activeClassName ?? "-"}</span>.
              Unggah materi di atas untuk memulai.
            </div>
          )}
          {allMaterials.map(mat => (
            <div key={mat.id} className="relative">
              <MaterialCard title={mat.title} type={mat.type} subject={mat.subject ?? ""} pages={mat.pages}
                uploadedAt={mat.uploadedAt} status={mat.status}
                aiProcessed={mat.aiProcessed || processedIds.has(mat.id)}
                questionsGenerated={mat.questionsGenerated}
                isProcessing={processingIds.has(mat.id)}
                onClick={() => setSelectedMaterial(mat)}
                onProcessAI={() => handleProcessAI(mat.id)} />
              {mat.className && (
                <span className="absolute top-3 right-12 rounded-full bg-ink/5 border border-border px-2 py-0.5 text-[10px] font-semibold text-ink-secondary">
                  {mat.className}
                </span>
              )}
            </div>
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
                    { label: "Tipe Dokumen", value: m.type },
                    { label: "Jumlah Halaman", value: `${m.pages} halaman` },
                    { label: "Tanggal Unggah", value: m.uploadedAt },
                    { label: "Diunggah oleh", value: teacher?.name ?? "-" },
                    { label: "Status", value: m.status },
                    ...(m.publisher ? [{ label: "Penerbit", value: m.publisher }] : []),
                    ...(m.year ? [{ label: "Tahun Terbit", value: `${m.year}` }] : []),
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary mb-0.5">{item.label}</div>
                      <div className="text-[13px] text-ink">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Mata Pelajaran *", ph: m.subject },
                    { label: "Tipe Materi *", ph: m.type },
                    { label: "Bab/Topik", ph: m.chapter ?? "Fungsi Kuadrat" },
                    { label: "Penerbit", ph: m.publisher ?? "Erlangga, Grafindo..." },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">{f.label}</label>
                      <input type="text" defaultValue={f.ph}
                        className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                    </div>
                  ))}
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
              <button onClick={() => setEditMeta(!editMeta)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
                <Pencil className="h-3.5 w-3.5" />
                {editMeta ? "Batalkan" : "Edit Metadata"}
              </button>
              <div className="flex gap-2">
                <Button variant="outline" className="h-8 text-[12px]" onClick={() => { setSelectedMaterial(null); setEditMeta(false); }}>Tutup</Button>
                {editMeta
                  ? <Button variant="default" className="h-8 text-[12px]">Simpan Perubahan</Button>
                  : <Button variant="outline" className="h-8 text-[12px]" onClick={async () => {
                      const file = materialFiles[m.id];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        const a = document.createElement("a");
                        a.href = url; a.download = file.name; a.click();
                        URL.revokeObjectURL(url);
                        return;
                      }
                      if (m.fileUrl) {
                        await downloadMaterialFile(m.fileUrl, m.title);
                        return;
                      }
                      setToast({ message: "File tidak tersedia. Unggah ulang materi ini agar bisa diunduh.", tone: "primary" });
                    }}><Download className="mr-1.5 h-3.5 w-3.5" />Unduh</Button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Process Confirmation ── */}
      <ConfirmDialog
        open={!!confirmProcessId}
        title="Proses Materi dengan AI?"
        message="AI akan menganalisis materi ini dan mengekstrak soal secara otomatis. Proses membutuhkan beberapa detik dan tidak dapat dibatalkan."
        confirmLabel="Proses Sekarang"
        confirmVariant="default"
        onConfirm={() => confirmProcessId && startAIProcess(confirmProcessId)}
        onCancel={() => setConfirmProcessId(null)}
      />

      {/* ── Toast Notification ── */}
      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Assessment Styles ─────────────────────────────────────────────────

function TeacherAssessmentStyles() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUploadPaket, setShowUploadPaket] = useState(false);
  const [paketFile, setPaketFile] = useState<File | null>(null);
  const [paketDragOver, setPaketDragOver] = useState(false);
  const paketFileInputRef = React.useRef<HTMLInputElement>(null);
  const selected = assessmentStyles.find(a => a.id === selectedId) as AssessmentStyleCorpus | undefined;
  const [config, setConfig] = useState({
    duration: 90, questions: 50,
    allowBack: true, showTimer: true, showPalette: true,
    fullscreenRequired: true, randomizeQuestions: true, randomizeOptions: false,
    negativeMark: false, partialScoring: false,
    adaptiveDifficulty: true, groundingRequired: true,
  });
  function tog(key: keyof typeof config) {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function ConfigRow({ id, label, desc }: { id: keyof typeof config; label: string; desc?: string }) {
    const val = config[id] as boolean;
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
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Topik *</label>
              <input type="text" placeholder="e.g. Fungsi Kuadrat, Barisan..."
                className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tingkat Kesulitan *</label>
              <select className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                <option value="">Pilih kesulitan...</option>
                {["Mudah", "Sedang", "Sulit", "Campuran"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">File Paket Soal *</label>
              <input ref={paketFileInputRef} type="file" accept=".pdf,.docx,.xlsx" className="hidden"
                onChange={e => setPaketFile(e.target.files?.[0] ?? null)} />
              <div
                className={cn("flex items-center gap-3 rounded-[8px] border border-dashed px-4 py-4 text-center transition-colors",
                  paketDragOver ? "border-primary bg-primary/5" : "border-primary/40 bg-white")}
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setShowUploadPaket(false)}>Batal</Button>
            <Button variant="default" className="h-8 text-[12px]">
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

              <div className="p-5 space-y-5">
                {/* Basic */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-3">Pengaturan Dasar</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Durasi (menit)</label>
                      <input type="number" value={config.duration}
                        onChange={e => setConfig(prev => ({ ...prev, duration: +e.target.value }))}
                        className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Jumlah Soal</label>
                      <input type="number" value={config.questions}
                        onChange={e => setConfig(prev => ({ ...prev, questions: +e.target.value }))}
                        className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-1">Navigasi & Tampilan</p>
                  <ConfigRow id="allowBack" label="Siswa bisa kembali ke soal sebelumnya" />
                  <ConfigRow id="showTimer" label="Tampilkan timer hitung mundur" />
                  <ConfigRow id="showPalette" label="Tampilkan palet nomor soal" />
                </div>

                {/* Security */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-1">Keamanan Ujian</p>
                  <ConfigRow id="fullscreenRequired" label="Mode layar penuh wajib" desc="Ujian otomatis masuk fullscreen dan memperingatkan jika keluar." />
                  <ConfigRow id="randomizeQuestions" label="Acak urutan soal" />
                  <ConfigRow id="randomizeOptions" label="Acak pilihan jawaban" />
                </div>

                {/* Scoring */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-1">Penilaian</p>
                  <ConfigRow id="negativeMark" label="Pengurangan nilai untuk jawaban salah" desc="Salah = −1/4 poin (gaya TKA resmi)." />
                  <ConfigRow id="partialScoring" label="Penilaian sebagian (partial credit)" />
                </div>

                {/* AI */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary mb-1">Pengaturan AI</p>
                  <ConfigRow id="adaptiveDifficulty" label="Tingkat kesulitan adaptif" desc="AI menyesuaikan level soal berdasarkan performa real-time." />
                  <ConfigRow id="groundingRequired" label="Soal hanya dari materi yang diunggah" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-8 text-[12px]" onClick={() => setSelectedId(null)}>Batal</Button>
                  <Button variant="default" className="h-8 text-[12px]">Simpan Konfigurasi</Button>
                </div>
              </div>
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
    </div>
  );
}

// ── Teacher Question Bank ─────────────────────────────────────────────────────

const EMPTY_MANUAL_Q = { text: "", optA: "", optB: "", optC: "", optD: "", correct: "A", difficulty: "Sedang", topic: "", explanation: "" };

function TeacherQuestionBank() {
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeAssignment = teacher?.assignments.find(a => a.classId === activeClass);
  const activeSubjectId = activeAssignment?.subjectId;
  const [search, setSearch] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualQ, setManualQ] = useState({ ...EMPTY_MANUAL_Q });
  const [manualError, setManualError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const { bank: bankQs, pending: reviewQs } = useQuestionBank(activeClass, activeSubjectId);
  const reviewCount = reviewQs.length;
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  // Bank/review are scoped by subject (real schema has no per-class column on
  // `questions`), so this is now the current class's subject's full bank.
  const classFilteredQs = bankQs;

  const topicOptions = [...new Set(classFilteredQs.map(q => q.topic))].filter(Boolean).sort();
  const styleOptions = [...new Set(classFilteredQs.map(q => q.styleType))].filter(Boolean).sort();
  const hasActiveFilters = selectedTopics.size > 0 || selectedStyles.size > 0 || selectedDifficulty !== null;

  function toggleTopic(t: string) {
    setSelectedTopics(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  }
  function toggleStyle(s: string) {
    setSelectedStyles(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  }
  function clearFilters() {
    setSelectedTopics(new Set()); setSelectedStyles(new Set()); setSelectedDifficulty(null); setSearch("");
  }

  const filtered = classFilteredQs.filter(q => {
    if (search && !q.question.toLowerCase().includes(search.toLowerCase()) && !q.topic.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTopics.size > 0 && !selectedTopics.has(q.topic)) return false;
    if (selectedStyles.size > 0 && !selectedStyles.has(q.styleType)) return false;
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
        ].map(s => <StatCard key={s.label} {...s} />)}
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

          {/* Topic filter */}
          {topicOptions.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-ink-tertiary mb-1.5">BAB / TOPIK</div>
              <div className="flex flex-wrap gap-1.5">
                {topicOptions.map(t => (
                  <button key={t} onClick={() => toggleTopic(t)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                      selectedTopics.has(t)
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-background text-ink-secondary border-border hover:border-primary/40 hover:text-ink"
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Style filter */}
          {styleOptions.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-ink-tertiary mb-1.5">GAYA SOAL</div>
              <div className="flex flex-wrap gap-1.5">
                {styleOptions.map(s => (
                  <button key={s} onClick={() => toggleStyle(s)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                      selectedStyles.has(s)
                        ? "bg-ink text-white border-ink shadow-sm"
                        : "bg-background text-ink-secondary border-border hover:border-ink/30 hover:text-ink"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty filter */}
          <div>
            <div className="text-[10px] font-semibold text-ink-tertiary mb-1.5">TINGKAT KESULITAN</div>
            <div className="flex gap-1.5">
              {(["Mudah", "Sedang", "Sulit"] as const).map(d => (
                <button key={d} onClick={() => setSelectedDifficulty(prev => prev === d ? null : d)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                    selectedDifficulty === d
                      ? d === "Mudah" ? "bg-success text-white border-success shadow-sm"
                        : d === "Sedang" ? "bg-warning text-white border-warning shadow-sm"
                        : "bg-danger text-white border-danger shadow-sm"
                      : "bg-background text-ink-secondary border-border hover:border-ink/30 hover:text-ink"
                  )}>
                  {d}
                </button>
              ))}
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
        {filtered.map(q => <QuestionBankRow key={q.id} entry={q} />)}
        {filtered.length === 0 && (
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
              <button onClick={() => { setShowManualAdd(false); setManualQ({ ...EMPTY_MANUAL_Q }); setManualError(""); }}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pertanyaan *</label>
                <textarea rows={3} placeholder="Tuliskan pertanyaan di sini..."
                  value={manualQ.text} onChange={e => setManualQ(p => ({ ...p, text: e.target.value }))}
                  className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] resize-none focus:border-primary focus:outline-none" />
              </div>
              {(["A", "B", "C", "D"] as const).map(opt => (
                <div key={opt}>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pilihan {opt} *</label>
                  <input type="text" placeholder={`Jawaban pilihan ${opt}`}
                    value={manualQ[`opt${opt}` as "optA"|"optB"|"optC"|"optD"]}
                    onChange={e => setManualQ(p => ({ ...p, [`opt${opt}`]: e.target.value }))}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Kunci Jawaban *</label>
                  <select value={manualQ.correct} onChange={e => setManualQ(p => ({ ...p, correct: e.target.value }))}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                    {["A", "B", "C", "D"].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Kesulitan *</label>
                  <select value={manualQ.difficulty} onChange={e => setManualQ(p => ({ ...p, difficulty: e.target.value }))}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                    {["Mudah", "Sedang", "Sulit"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Topik *</label>
                  <input type="text" placeholder="Fungsi Kuadrat"
                    value={manualQ.topic} onChange={e => setManualQ(p => ({ ...p, topic: e.target.value }))}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pembahasan (opsional)</label>
                <textarea rows={2} placeholder="Jelaskan jawaban benar..."
                  value={manualQ.explanation} onChange={e => setManualQ(p => ({ ...p, explanation: e.target.value }))}
                  className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] resize-none focus:border-primary focus:outline-none" />
              </div>
              {manualError && <p className="text-[12px] text-danger">{manualError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">
              <Button variant="outline" size="sm" onClick={() => { setShowManualAdd(false); setManualQ({ ...EMPTY_MANUAL_Q }); setManualError(""); }}>Batal</Button>
              <Button variant="default" size="sm" onClick={async () => {
                if (!teacher || !activeClass || !activeSubjectId) { setManualError("Pilih kelas aktif terlebih dahulu."); return; }
                const ok = await saveManualQToBank(manualQ, teacher.schoolId, activeClass, activeSubjectId, teacher.profileId);
                if (!ok) { setManualError("Lengkapi semua field bertanda * sebelum menyimpan."); return; }
                setShowManualAdd(false);
                setManualQ({ ...EMPTY_MANUAL_Q });
                setManualError("");
                setToast({ message: "Soal berhasil ditambahkan ke bank soal", tone: "success" });
              }}>Simpan Soal</Button>
            </div>
          </div>
        </div>
      )}

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Question Review ───────────────────────────────────────────────────

function TeacherQuestionReview() {
  const router = useRouter();
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeAssignment = teacher?.assignments.find(a => a.classId === activeClass);
  const activeSubjectId = activeAssignment?.subjectId;
  const { pending: pendingQs } = useQuestionBank(activeClass, activeSubjectId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" | "danger" } | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<PendingQuestion>>>({});

  async function approveQuestion(q: PendingQuestion) {
    if (!activeClass || !activeSubjectId) return;
    const merged: PendingQuestion = { ...q, ...edits[q.id] };
    await approveBankQuestion(merged, activeClass, activeSubjectId);
    setToast({ message: "Soal disetujui dan masuk ke bank soal", tone: "success" });
  }

  async function rejectQuestion(id: string) {
    if (!activeClass || !activeSubjectId) return;
    await rejectBankQuestion(id, activeClass, activeSubjectId);
    setToast({ message: "Soal ditolak dan dihapus dari antrian", tone: "danger" });
  }

  const pending = pendingQs;
  const editingQ = pendingQs.find(q => q.id === editingId);
  const editData = editingId ? { ...editingQ, ...edits[editingId] } : null;

  function patchEdit(key: string, val: string) {
    if (!editingId) return;
    setEdits(prev => ({ ...prev, [editingId]: { ...prev[editingId], [key]: val } }));
  }

  function saveEdit() {
    setEditingId(null);
    setToast({ message: "Soal berhasil diperbarui", tone: "success" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tinjau Soal AI"
        title="Tinjauan Soal Baru"
        description="Setujui atau tolak soal AI. Hanya soal yang disetujui masuk ke bank soal."
        actions={
          pending.length > 0 ? (
            <Button variant="success" className="h-8 text-[12px]"
              onClick={() => setConfirmApproveAll(true)}>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Setujui Semua ({pending.length})
            </Button>
          ) : undefined
        }
      />

      {pending.length > 0 ? (
        <>
          <AlertPanel tone="primary" title={`${pending.length} soal menunggu tinjauan`}>
            Periksa konten, jawaban, dan pembahasan sebelum menyetujui.
          </AlertPanel>
          <div className="grid gap-5 lg:grid-cols-2">
            {pending.map(q => (
              <QuestionReviewCard key={q.id} question={{ ...q, ...edits[q.id] } as PendingQuestion}
                onApprove={() => approveQuestion({ ...q, ...edits[q.id] } as PendingQuestion)}
                onReject={() => rejectQuestion(q.id)}
                onEdit={() => setEditingId(q.id)} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={CheckCircle2} title="Semua soal sudah ditinjau"
          description="Tidak ada soal menunggu persetujuan. Unggah materi baru untuk soal lebih banyak."
          action={
            <Button variant="default" className="text-[13px]" onClick={() => router.push("/teacher/materials")}>
              <Upload className="mr-2 h-4 w-4" />Unggah Materi
            </Button>
          } />
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
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pertanyaan</label>
                <textarea rows={3}
                  value={(editData.question as string) ?? ""}
                  onChange={e => patchEdit("question", e.target.value)}
                  className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] resize-none focus:border-primary focus:outline-none" />
              </div>
              {(["optionA", "optionB", "optionC", "optionD"] as const).map((k, i) => (
                <div key={k}>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">
                    Pilihan {String.fromCharCode(65 + i)}
                    {(editData.correctAnswer as string) === String.fromCharCode(65 + i) && (
                      <span className="ml-2 text-success">(Kunci Jawaban)</span>
                    )}
                  </label>
                  <input type="text"
                    value={(editData[k] as string) ?? ""}
                    onChange={e => patchEdit(k, e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Kunci Jawaban</label>
                <select
                  value={(editData.correctAnswer as string) ?? "A"}
                  onChange={e => patchEdit("correctAnswer", e.target.value)}
                  className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                  {["A", "B", "C", "D", "E"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
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
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Topik</label>
                  <input type="text"
                    value={(editData.topic as string) ?? ""}
                    onChange={e => patchEdit("topic", e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tingkat Kesulitan</label>
                  <select
                    value={(editData.difficulty as string) ?? "Sedang"}
                    onChange={e => patchEdit("difficulty", e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                    {["Mudah", "Sedang", "Sulit"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
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
        message={`${pending.length} soal AI akan langsung masuk ke bank soal. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Setujui Semua"
        confirmVariant="success"
        onConfirm={async () => {
          setConfirmApproveAll(false);
          if (!activeClass || !activeSubjectId) return;
          const merged = pending.map(q => ({ ...q, ...edits[q.id] } as PendingQuestion));
          await approveAllBankQuestions(merged, activeClass, activeSubjectId);
          setToast({ message: `${merged.length} soal disetujui dan masuk ke bank soal`, tone: "success" });
        }}
        onCancel={() => setConfirmApproveAll(false)}
      />

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Assessment Builder ────────────────────────────────────────────────

function TeacherAssessmentBuilder() {
  const teacher = useRealTeacher();
  const [step, setStep] = useState(1);
  const steps = ["Info Dasar", "Materi & Soal", "Jadwal & Publikasi"];
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmSaveDraft, setConfirmSaveDraft] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" | "danger" } | null>(null);
  // Step 1 form fields
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formQuestionCount, setFormQuestionCount] = useState(20);
  const [formDuration, setFormDuration] = useState(45);
  // Step 3 schedule
  const [formScheduledFor, setFormScheduledFor] = useState("");
  const [formOpenAt, setFormOpenAt] = useState("");
  const [formCloseAt, setFormCloseAt] = useState("");
  // Step 2 validation error
  const [step2Error, setStep2Error] = useState("");

  // Autofill defaults per style
  const styleDefaults: Record<string, { questions: number; duration: number }> = {
    as1: { questions: 45, duration: 90 },
    as2: { questions: 45, duration: 90 },
    as3: { questions: 40, duration: 75 },
    as4: { questions: 45, duration: 90 },
    as5: { questions: 50, duration: 120 },
    as6: { questions: 40, duration: 90 },
    as7: { questions: 10, duration: 20 },
  };
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<typeof questionBank>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<typeof questionBank[number] | null>(null);
  const [activeClass] = useActiveClass();
  const activeAssignment = teacher?.assignments.find(a => a.classId === activeClass);
  const activeSubjectId = activeAssignment?.subjectId;
  const [materials, setMaterials] = useState<MaterialWithFile[]>([]);
  const { bank: bankQs } = useQuestionBank(activeClass, activeSubjectId);
  const router = useRouter();

  // Prefill subject/class defaults once the real teacher context loads (still freely editable text fields)
  useEffect(() => {
    if (!teacher) return;
    setFormSubject(prev => prev || (activeAssignment?.subjectName ?? teacher.subjects[0]?.name ?? ""));
    setFormClass(prev => prev || (teacher.classes.find(c => c.id === activeClass)?.name ?? teacher.classes[0]?.name ?? ""));
  }, [teacher, activeClass]);

  // Re-fetch materials when the active class (or its resolved subject) changes
  useEffect(() => {
    if (!teacher || !activeClass) { setMaterials([]); return; }
    const classNamesById = new Map(teacher.classes.map(c => [c.id, c.name]));
    const subjectNamesById = new Map(teacher.subjects.map(s => [s.id, s.name]));
    fetchTeacherMaterials(activeClass, activeSubjectId, classNamesById, subjectNamesById).then(setMaterials);
  }, [teacher, activeClass, activeSubjectId]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [assessmentType, setAssessmentType] = useState<"uniform" | "adaptive">("uniform");
  const [questionSource, setQuestionSource] = useState<"ai" | "bank">("ai");
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [confirmAddToBank, setConfirmAddToBank] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const styleIsLocked = !!selectedStyle && !!styleDefaults[selectedStyle];
  const [newQ, setNewQ] = useState({ text: "", optA: "", optB: "", optC: "", optD: "", correct: "A", difficulty: "Sedang", topic: "", explanation: "" });
  const selectedStyleData = assessmentStyles.find(s => s.id === selectedStyle);

  function toggleMaterial(id: string) {
    setSelectedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setAiGenerated(false);
    setAiGeneratedQuestions([]);
  }

  async function generateAI() {
    if (selectedMaterials.size === 0) return;
    setAiGenerating(true);
    setAiGeneratedQuestions([]);

    const matList = materials.filter(m => selectedMaterials.has(m.id));
    const allGenerated: typeof questionBank = [];
    const totalCount = formQuestionCount;
    const perMat = Math.max(1, Math.ceil(totalCount / matList.length));

    for (let matIdx = 0; matIdx < matList.length; matIdx++) {
      const mat = matList[matIdx];
      // Last material gets remainder to hit exact total
      const remaining = totalCount - allGenerated.length;
      const count = matIdx === matList.length - 1 ? remaining : Math.min(perMat, remaining);
      if (count <= 0) break;
      try {
        const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialTitle: mat.title,
            topic: mat.subject ?? mat.title,
            subject: mat.subject ?? "Umum",
            count,
            difficulty: "Sedang",
          }),
        });
        const data = await res.json() as { questions?: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string; topic: string; difficulty: string }>; error?: string };
        if (data.questions?.length) {
          allGenerated.push(...data.questions.map((q, i) => ({
            id: `gen-${mat.id}-${i}`,
            question: q.question,
            topic: q.topic,
            subtopic: q.topic,
            bloom: "Menerapkan" as const,
            difficulty: (["Mudah", "Sedang", "Sulit"].includes(q.difficulty) ? q.difficulty : "Sedang") as "Mudah" | "Sedang" | "Sulit",
            styleType: "TKA" as const,
            source: mat.title,
            usageCount: 0,
            successRate: 0,
            status: "Disetujui" as const,
            isLocked: false,
            options: { A: q.options.A ?? "", B: q.options.B ?? "", C: q.options.C ?? "", D: q.options.D ?? "" },
            correctAnswer: (["A","B","C","D"].includes(q.correctAnswer) ? q.correctAnswer : "A") as "A" | "B" | "C" | "D",
            explanation: q.explanation,
          })));
        }
      } catch { /* fallback to db bank below */ }
    }

    if (allGenerated.length === 0) {
      setToast({ message: "Gagal generate soal. Periksa koneksi dan API key di .env.local.", tone: "primary" });
    }

    setAiGeneratedQuestions(allGenerated);
    setSelectedQuestions(new Set(allGenerated.map(q => q.id)));
    setAiGenerating(false);
    setAiGenerated(true);
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
              onClick={() => setStep(i + 1)}
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
          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Judul Asesmen *</label>
            <input type="text" placeholder="Kuis Fungsi Kuadrat – Pertemuan 8"
              value={formTitle} onChange={e => setFormTitle(e.target.value)}
              className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tipe Asesmen *</label>
            <select value={formType} onChange={e => setFormType(e.target.value)}
              className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
              <option value="">Pilih tipe...</option>
              {["Kuis Guru","UTS","UAS","Tes Diagnostik","Tryout","PR"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Mata Pelajaran *</label>
              <input type="text" placeholder="Matematika XI"
                value={formSubject} onChange={e => setFormSubject(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Kelas *</label>
              <input type="text" placeholder="XI IPA 2"
                value={formClass} onChange={e => setFormClass(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">
                Jumlah Soal {styleIsLocked && <span className="text-ink-tertiary font-normal">(otomatis dari gaya asesmen)</span>}
              </label>
              <input type="number" min={1}
                value={formQuestionCount}
                readOnly={styleIsLocked}
                onChange={e => !styleIsLocked && setFormQuestionCount(Number(e.target.value))}
                className={cn(
                  "w-full rounded-[8px] border bg-background px-3 py-2 text-[13px] focus:outline-none",
                  styleIsLocked
                    ? "border-border text-ink-secondary bg-ink/[0.03] cursor-not-allowed"
                    : "border-border focus:border-primary"
                )} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">
                Durasi (menit) {styleIsLocked && <span className="text-ink-tertiary font-normal">(otomatis dari gaya asesmen)</span>}
              </label>
              <input type="number" min={1}
                value={formDuration}
                readOnly={styleIsLocked}
                onChange={e => !styleIsLocked && setFormDuration(Number(e.target.value))}
                className={cn(
                  "w-full rounded-[8px] border bg-background px-3 py-2 text-[13px] focus:outline-none",
                  styleIsLocked
                    ? "border-border text-ink-secondary bg-ink/[0.03] cursor-not-allowed"
                    : "border-border focus:border-primary"
                )} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-2">Gaya Asesmen *</label>
            <select value={selectedStyle} onChange={e => {
              const id = e.target.value;
              setSelectedStyle(id);
              if (id && styleDefaults[id]) {
                setFormQuestionCount(styleDefaults[id].questions);
                setFormDuration(styleDefaults[id].duration);
              }
            }}
              className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
              <option value="">Pilih gaya asesmen...</option>
              {assessmentStyles.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedStyleData?.description && (
              <p className="mt-1.5 text-[11px] text-ink-secondary leading-relaxed">{selectedStyleData.description}</p>
            )}
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
              <AlertPanel tone="primary" title="Mode Adaptif">
                Sistem akan memilih soal dari bank soal berdasarkan topik di mana setiap siswa menunjukkan pemahaman rendah. Soal yang diterima setiap siswa bisa berbeda.
              </AlertPanel>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="default" className="h-8 text-[12px]" onClick={() => setStep(2)}>Lanjut →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
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
                {materials.length === 0 && (
                  <div className="rounded-[8px] border border-dashed border-border bg-background p-6 text-center">
                    <p className="text-[12px] text-ink-secondary">Belum ada materi — unggah materi di <button onClick={() => router.push("/teacher/materials")} className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">Pustaka Materi</button> terlebih dahulu.</p>
                  </div>
                )}
                {materials.map(mat => {
                  const checked = selectedMaterials.has(mat.id);
                  const canProcess = mat.aiProcessed;
                  return (
                    <div key={mat.id}
                      onClick={() => canProcess && toggleMaterial(mat.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-[8px] border p-3 transition-all",
                        !canProcess ? "opacity-50 cursor-not-allowed border-border bg-background" :
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
                        {canProcess ? (
                          <Badge tone="success">{mat.questionsGenerated} soal</Badge>
                        ) : (
                          <Badge tone="neutral">Belum diproses AI</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border px-5 py-3.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-secondary">
                  {selectedMaterials.size === 0
                    ? "Pilih minimal 1 materi untuk generate soal"
                    : `${selectedMaterials.size} materi dipilih · akan generate ${formQuestionCount} soal`}
                </span>
                <Button variant="default" className="h-8 text-[12px]"
                  disabled={selectedMaterials.size === 0 || aiGenerating}
                  onClick={generateAI}>
                  {aiGenerating ? (
                    <><span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />Membuat Soal...</>
                  ) : (
                    <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Generate Soal AI</>
                  )}
                </Button>
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
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              title="Edit soal"
                              onClick={() => {
                                if (isEditing) { setEditingId(null); setEditDraft(null); }
                                else { setEditingId(q.id); setEditDraft({ ...q }); setExpandedId(q.id); }
                              }}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-[6px] border transition-colors",
                                isEditing ? "border-primary bg-primary text-white" : "border-border bg-background text-ink-secondary hover:border-primary/40 hover:text-primary"
                              )}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title={isExpanded ? "Sembunyikan" : "Lihat pilihan jawaban"}
                              onClick={() => { setExpandedId(isExpanded ? null : q.id); if (isEditing) { setEditingId(null); setEditDraft(null); } }}
                              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border bg-background text-ink-secondary hover:border-primary/40 hover:text-primary transition-colors">
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded ? "rotate-180" : "")} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded: options + answer */}
                        {isExpanded && !isEditing && (
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
                                <select value={draft.correctAnswer}
                                  onChange={e => setEditDraft(p => p ? { ...p, correctAnswer: e.target.value as "A"|"B"|"C"|"D" } : p)}
                                  className="w-full rounded-[8px] border border-border bg-background px-3 py-1.5 text-[12px] focus:border-primary focus:outline-none">
                                  {["A","B","C","D"].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
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

          {questionSource === "bank" && (
            <div className="rounded-card border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div>
                  <h3 className="text-[14px] font-bold text-ink">Bank Soal</h3>
                  <p className="text-[11px] text-ink-secondary mt-0.5">{selectedQuestions.size} soal dipilih dari {bankQs.length} tersedia</p>
                </div>
                <Button variant="outline" className="h-8 text-[12px]" onClick={() => setShowAddQuestion(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Soal Baru
                </Button>
              </div>
              <div className="p-4 space-y-2">
                {bankQs.length === 0 && (
                  <EmptyState icon={Database} title="Bank soal kosong" description="Upload materi dulu dan proses dengan AI — soal akan otomatis masuk ke bank." />
                )}
                {bankQs.map(q => (
                  <div key={q.id} onClick={() => toggleQuestion(q.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-[8px] border p-3 cursor-pointer transition-all",
                      selectedQuestions.has(q.id) ? "border-primary/40 bg-primary-soft" : "border-border bg-background hover:border-primary/20"
                    )}>
                    <div className={cn(
                      "flex h-4 w-4 mt-0.5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      selectedQuestions.has(q.id) ? "border-primary bg-primary" : "border-border"
                    )}>
                      {selectedQuestions.has(q.id) && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-ink line-clamp-2">{q.question}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="neutral">{q.topic}</Badge>
                        <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                <button onClick={() => {
                  const allIds = new Set(bankQs.map(q => q.id));
                  setSelectedQuestions(prev => prev.size === bankQs.length ? new Set() : allIds);
                }} className="text-[11px] text-primary font-semibold hover:underline">
                  {selectedQuestions.size === bankQs.length ? "Batal semua" : "Pilih semua"}
                </button>
                <span className="text-[11px] text-ink-secondary">{selectedQuestions.size} / {bankQs.length} dipilih</span>
              </div>
            </div>
          )}

          {/* Add question dialog */}
          {showAddQuestion && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowAddQuestion(false)} />
              <div className="relative w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-ink">Tambah Soal ke Bank Soal</h2>
                  <button onClick={() => setShowAddQuestion(false)} className="text-ink-secondary hover:text-ink"><X className="h-4 w-4" /></button>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Pertanyaan *</label>
                  <textarea rows={3} value={newQ.text} onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
                    placeholder="Tulis pertanyaan di sini..."
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none resize-none" />
                </div>
                {(["A", "B", "C", "D"] as const).map(opt => (
                  <div key={opt}>
                    <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Opsi {opt}</label>
                    <input type="text" placeholder={`Pilihan ${opt}`}
                      value={newQ[`opt${opt}` as "optA"|"optB"|"optC"|"optD"]}
                      onChange={e => setNewQ(p => ({ ...p, [`opt${opt}`]: e.target.value }))}
                      className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Jawaban Benar</label>
                    <select value={newQ.correct} onChange={e => setNewQ(p => ({ ...p, correct: e.target.value }))}
                      className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                      {["A", "B", "C", "D"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tingkat Kesulitan</label>
                    <select value={newQ.difficulty} onChange={e => setNewQ(p => ({ ...p, difficulty: e.target.value }))}
                      className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                      {["Mudah", "Sedang", "Sulit"].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Topik</label>
                  <input type="text" placeholder="e.g. Gerak Lurus Beraturan"
                    value={newQ.topic} onChange={e => setNewQ(p => ({ ...p, topic: e.target.value }))}
                    className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-8 text-[12px]" onClick={() => { setShowAddQuestion(false); setNewQ({ ...EMPTY_MANUAL_Q }); }}>Batal</Button>
                  <Button variant="default" className="h-8 text-[12px]" onClick={() => { setShowAddQuestion(false); setConfirmAddToBank(true); }}>
                    Simpan ke Bank Soal
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={confirmAddToBank}
            title="Tambahkan ke Bank Soal?"
            message="Soal ini akan disimpan permanen ke bank soal dan dapat digunakan pada asesmen lainnya. Apakah kamu yakin?"
            confirmLabel="Ya, Tambahkan"
            confirmVariant="default"
            onConfirm={async () => {
              if (teacher && activeClass && activeSubjectId) {
                await saveManualQToBank(newQ, teacher.schoolId, activeClass, activeSubjectId, teacher.profileId);
              }
              setConfirmAddToBank(false);
              setNewQ({ ...EMPTY_MANUAL_Q });
              setToast({ message: "Soal berhasil ditambahkan ke bank soal", tone: "success" });
            }}
            onCancel={() => setConfirmAddToBank(false)}
          />

          {step2Error && (
            <p className="text-[12px] text-danger bg-danger/5 border border-danger/20 rounded-[8px] px-3 py-2">{step2Error}</p>
          )}
          <div className="flex justify-between">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setStep(1)}>← Kembali</Button>
            <Button variant="default" className="h-8 text-[12px]"
              disabled={questionSource === "ai" ? (!aiGenerated || selectedQuestions.size === 0) : selectedQuestions.size === 0}
              onClick={() => {
                if (selectedQuestions.size !== formQuestionCount) {
                  setStep2Error(
                    `Harus pilih tepat ${formQuestionCount} soal sesuai gaya asesmen. Saat ini: ${selectedQuestions.size} soal dipilih.`
                  );
                  return;
                }
                setStep2Error("");
                setStep(3);
              }}>
              Lanjut dengan {selectedQuestions.size} soal →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-card border border-border bg-surface shadow-sm p-6 space-y-5 max-w-2xl">
          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tanggal Asesmen *</label>
            <input type="datetime-local"
              value={formScheduledFor} onChange={e => setFormScheduledFor(e.target.value)}
              className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Mulai Dibuka</label>
              <input type="datetime-local"
                value={formOpenAt} onChange={e => setFormOpenAt(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
              <p className="text-[10px] text-ink-tertiary mt-1">Kapan siswa bisa mulai mengerjakan</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Ditutup Pada</label>
              <input type="datetime-local"
                value={formCloseAt} onChange={e => setFormCloseAt(e.target.value)}
                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
              <p className="text-[10px] text-ink-tertiary mt-1">Setelah waktu ini asesmen tidak bisa dikerjakan</p>
            </div>
          </div>
          <AlertPanel tone="primary" title="Siap dipublikasikan">
            Setelah dipublikasikan, siswa menerima notifikasi dan dapat mengakses asesmen sesuai jadwal.
          </AlertPanel>
          <div className="flex justify-between">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setStep(2)}>← Kembali</Button>
            <div className="flex gap-2">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setConfirmSaveDraft(true)}>Simpan Draf</Button>
              <Button variant="default" className="h-8 text-[12px]" onClick={() => setConfirmPublish(true)}>
                <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />Publikasikan
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
        onConfirm={async () => {
          if (!teacher || !activeClass || !activeSubjectId) { setConfirmPublish(false); return; }
          const chosenAi = questionSource === "ai" ? aiGeneratedQuestions.filter(q => selectedQuestions.has(q.id)) : [];
          const chosenBankIds = questionSource === "bank" ? bankQs.filter(q => selectedQuestions.has(q.id)).map(q => q.id) : [];
          const created = await createAssessment({
            schoolId: teacher.schoolId, classId: activeClass, subjectId: activeSubjectId, creatorId: teacher.profileId,
            title: formTitle || "Asesmen Tanpa Judul", type: formType || "Kuis Guru", durationMinutes: formDuration,
            openAt: formOpenAt, closeAt: formCloseAt, status: "published",
            questionSource, aiQuestions: chosenAi, bankQuestionIds: chosenBankIds,
          });
          setConfirmPublish(false);
          if (!created) { setToast({ message: "Gagal mempublikasikan asesmen. Coba lagi.", tone: "danger" }); return; }
          setToast({ message: `Asesmen "${formTitle || "Asesmen Tanpa Judul"}" berhasil dipublikasikan`, tone: "success" });
          setStep(1);
          setFormTitle(""); setFormType(""); setFormScheduledFor(""); setFormOpenAt(""); setFormCloseAt("");
          setSelectedQuestions(new Set()); setAiGeneratedQuestions([]); setAiGenerated(false);
        }}
        onCancel={() => setConfirmPublish(false)}
      />

      <ConfirmDialog
        open={confirmSaveDraft}
        title="Simpan sebagai Draf?"
        message="Asesmen disimpan sebagai draf dan belum dapat diakses siswa. Kamu dapat melanjutkan kapan saja."
        confirmLabel="Simpan Draf"
        confirmVariant="default"
        onConfirm={async () => {
          if (!teacher || !activeClass || !activeSubjectId) { setConfirmSaveDraft(false); return; }
          const chosenAi = questionSource === "ai" ? aiGeneratedQuestions.filter(q => selectedQuestions.has(q.id)) : [];
          const chosenBankIds = questionSource === "bank" ? bankQs.filter(q => selectedQuestions.has(q.id)).map(q => q.id) : [];
          const created = await createAssessment({
            schoolId: teacher.schoolId, classId: activeClass, subjectId: activeSubjectId, creatorId: teacher.profileId,
            title: formTitle || "Draf Asesmen", type: formType || "Kuis Guru", durationMinutes: formDuration,
            openAt: formOpenAt, closeAt: formCloseAt, status: "draft",
            questionSource, aiQuestions: chosenAi, bankQuestionIds: chosenBankIds,
          });
          setConfirmSaveDraft(false);
          if (!created) { setToast({ message: "Gagal menyimpan draf. Coba lagi.", tone: "danger" }); return; }
          setToast({ message: `Draf "${formTitle || "Draf Asesmen"}" tersimpan`, tone: "primary" });
        }}
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
};
type ResultStudentRow = { studentId: string; name: string; score: number | null; answers: Record<string, string> };
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
  const byAssessment = new Map<string, { count: number; sum: number; scored: number }>();
  for (const row of (data ?? []) as Array<{ assessment_id: string; status: string; score: number | null }>) {
    const cur = byAssessment.get(row.assessment_id) ?? { count: 0, sum: 0, scored: 0 };
    cur.count += 1;
    if (row.score !== null) { cur.sum += row.score; cur.scored += 1; }
    byAssessment.set(row.assessment_id, cur);
  }
  return rows.map(r => {
    const stat = byAssessment.get(r.id);
    return {
      ...r,
      participants: stat?.count ?? 0,
      avgScore: stat && stat.scored > 0 ? Math.round(stat.sum / stat.scored) : undefined,
      status: (stat?.count ?? 0) > 0 ? "Selesai" : "Terjadwal",
    } as SavedAssessment;
  });
}

// Real per-question answer distribution + real per-student answer grid for
// the detail dialog - replaces simulateDist/simulateStudentAnswer entirely.
async function loadAssessmentResultDetail(assessmentId: string, classId: string): Promise<AssessmentResultDetail> {
  const { data: aqRows } = await supabase
    .from("assessment_questions")
    .select("id, question_order, questions(question, options, correct_answer, topic, difficulty)")
    .eq("assessment_id", assessmentId)
    .order("question_order", { ascending: true });
  type AQRow = { id: string; question_order: number; questions: { question: string; options: { A: string; B: string; C: string; D: string; E?: string }; correct_answer: string; topic: string; difficulty: string } | null };
  const questions: ResultQuestionRow[] = ((aqRows ?? []) as unknown as AQRow[])
    .filter((r): r is AQRow & { questions: NonNullable<AQRow["questions"]> } => !!r.questions)
    .map(r => ({
      assessmentQuestionId: r.id,
      question: r.questions.question,
      options: r.questions.options,
      correctAnswer: r.questions.correct_answer as "A" | "B" | "C" | "D" | "E",
      topic: r.questions.topic,
      difficulty: r.questions.difficulty as "Mudah" | "Sedang" | "Sulit",
    }));

  const { data: attemptData } = await supabase
    .from("assessment_attempts")
    .select("id, student_id, score")
    .eq("assessment_id", assessmentId)
    .in("status", ["submitted", "graded"]);
  type AttemptRow = { id: string; student_id: string; score: number | null };
  const attempts = (attemptData ?? []) as AttemptRow[];

  const answersByAttempt: Record<string, Record<string, string>> = {};
  const distCounts: Record<string, Record<string, number>> = {};
  if (attempts.length > 0) {
    const { data: qaRows } = await supabase
      .from("question_attempts")
      .select("assessment_attempt_id, assessment_question_id, student_answer")
      .in("assessment_attempt_id", attempts.map(a => a.id));
    for (const row of (qaRows ?? []) as Array<{ assessment_attempt_id: string; assessment_question_id: string; student_answer: string | null }>) {
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
    };
  });

  return { questions, distributions, studentRows };
}

function TeacherResults() {
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeSubjectId = teacher?.assignments.find(a => a.classId === activeClass)?.subjectId;
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"soal" | "siswa">("soal");
  const [allAssessments, setAllAssessments] = useState<SavedAssessment[]>([]);
  const [classSize, setClassSize] = useState(0);
  const [resultDetail, setResultDetail] = useState<AssessmentResultDetail | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{ overallAnalysis: string; questionAnalyses: Array<{index:number;misconception:string;suggestion:string}> } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!activeClass || !activeSubjectId) { setAllAssessments([]); return; }
    fetchClassAssessments(activeClass, activeSubjectId).then(attachAssessmentStats).then(setAllAssessments);
  }, [activeClass, activeSubjectId]);

  useEffect(() => {
    if (!activeClass) { setClassSize(0); return; }
    supabase.from("students").select("id", { count: "exact", head: true }).eq("class_id", activeClass)
      .then(({ count }) => setClassSize(count ?? 0));
  }, [activeClass]);

  // Reset analysis, tab, and detail data when dialog closes or changes
  useEffect(() => {
    setAiAnalysis(null); setAiLoading(false); setDetailTab("soal"); setResultDetail(null);
    if (detailId && activeClass) loadAssessmentResultDetail(detailId, activeClass).then(setResultDetail);
  }, [detailId, activeClass]);

  async function loadAIAnalysis() {
    if (!resultDetail?.questions.length) return;
    setAiLoading(true);
    const payload = resultDetail.questions.map(q => {
      const dist = resultDetail.distributions[q.assessmentQuestionId] ?? { A: 0, B: 0, C: 0, D: 0 };
      const wrongOpts = (["A","B","C","D"] as const).filter(o => o !== q.correctAnswer);
      const majority = wrongOpts.reduce((a,b) => dist[a] > dist[b] ? a : b);
      return {
        question: q.question, topic: q.topic,
        correctAnswer: q.correctAnswer, correctOption: q.options[q.correctAnswer as "A"|"B"|"C"|"D"],
        majorityWrongAnswer: majority, majorityWrongOption: q.options[majority],
        majorityWrongPct: dist[majority],
      };
    }).filter(q => q.majorityWrongPct > 25);

    try {
      const res = await fetch("/api/analyze-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentTitle: detail?.title ?? "", questions: payload }),
      });
      const data = await res.json() as typeof aiAnalysis & { error?: string };
      if (!data?.error) setAiAnalysis(data);
    } catch { /* ignore */ }
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
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="space-y-3">
        {allAssessments.length === 0 && (
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
            </div>
            <ChevronRight className="h-4 w-4 text-ink-tertiary shrink-0" />
          </div>
        ))}
      </div>

      {/* Assessment detail dialog */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setDetailId(null)} />
          <div className="relative w-full max-w-2xl rounded-card border border-border bg-surface shadow-xl max-h-[90vh] flex flex-col">
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

              {detail.status === "Terjadwal" && (
                <AlertPanel tone="primary" title="Asesmen belum dimulai">
                  Asesmen akan tersedia sesuai jadwal pada {detail.scheduledFor}.
                </AlertPanel>
              )}

              {/* Tab switcher — only shown when there are questions */}
              {resultDetail && resultDetail.questions.length > 0 && (
                <div className="flex gap-1 p-1 bg-background rounded-[8px] border border-border">
                  {([
                    { key: "soal" as const, label: "Analisis Soal" },
                    { key: "siswa" as const, label: "Jawaban Siswa" },
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
                    {!aiAnalysis && !aiLoading && (
                      <Button variant="outline" className="h-7 text-[11px]" onClick={() => loadAIAnalysis()}>
                        <Sparkles className="mr-1 h-3 w-3" />Analisis AI
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

                          <div className="ml-7 flex flex-wrap gap-1.5">
                            <Badge tone="primary">{q.topic}</Badge>
                            <Badge tone={q.difficulty === "Mudah" ? "success" : q.difficulty === "Sedang" ? "warning" : "danger"}>{q.difficulty}</Badge>
                            {dist[majorityWrong] > 30 && <Badge tone="danger">Mayoritas pilih {majorityWrong} ({dist[majorityWrong]}%)</Badge>}
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
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setDetailId(null)}>Tutup</Button>
              <Button variant="default" className="h-8 text-[12px]" disabled={!resultDetail} onClick={() => {
                if (!resultDetail) return;
                const bom = "﻿";
                const scoreList = resultDetail.studentRows.map(s => [s.name, s.score != null ? s.score.toString() : "—"]);
                const rows = [["Nama Siswa", "Nilai"], ...scoreList];
                const csv = bom + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${detail.title}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="mr-1.5 h-3.5 w-3.5" />Ekspor Nilai
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher Analytics ─────────────────────────────────────────────────────────

function TeacherAnalytics() {
  const teacher = useRealTeacher();
  const [activeClass] = useActiveClass();
  const activeAssignment = teacher?.assignments.find(a => a.classId === activeClass);
  const [topicPopup, setTopicPopup] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(false);

  const activeClassName = teacher?.classes.find(c => c.id === activeClass)?.name ?? teacher?.classes[0]?.name ?? "-";
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const activeStats = computeRealClassStats(classStudents);
  const [analytics, setAnalytics] = useState<ClassAnalytics>({ scoreTrend: [], scoreTrendLabels: [], scoreDistribution: [], scoreDistributionLabels: [], topicAccuracy: [] });

  useEffect(() => {
    if (!activeClass) { setClassStudents([]); return; }
    fetchRealClassStudents(activeClass, activeAssignment?.subjectId, activeClassName).then(setClassStudents);
  }, [activeClass, activeAssignment?.subjectId, activeClassName]);

  useEffect(() => {
    if (!activeClass || !activeAssignment?.subjectId) { setAnalytics({ scoreTrend: [], scoreTrendLabels: [], scoreDistribution: [], scoreDistributionLabels: [], topicAccuracy: [] }); return; }
    fetchClassAnalytics(activeClass, activeAssignment.subjectId).then(setAnalytics);
  }, [activeClass, activeAssignment?.subjectId]);

  const teacherAnalyticsStats = [
    { label: "Rata-rata Kelas", value: String(activeStats.avgScore), detail: `${activeStats.total} siswa`, tone: "primary" as const },
    { label: "Sesuai Target", value: String(activeStats.onTrack), detail: "On Track", tone: "success" as const },
    { label: "Perlu Ditinjau", value: String(activeStats.needReview), detail: "Need Review", tone: "warning" as const },
    { label: "Butuh Perhatian", value: String(activeStats.atRisk), detail: "At Risk", tone: "neutral" as const },
  ];

  const popupTopic = analytics.topicAccuracy.find(t => t.label === topicPopup);
  const popupRec = topicPopup
    ? teachingRecommendations.find(r => r.topic.toLowerCase() === topicPopup.toLowerCase())
    : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analitik Kelas" title={`Analitik ${activeClassName}`} description={`Performa ${activeStats.total} siswa berdasarkan data asesmen semester ini.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {teacherAnalyticsStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Tren Nilai Kelas</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Rata-rata per asesmen</p>
          {analytics.scoreTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[120px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Data akan muncul setelah asesmen diselesaikan</p>
            </div>
          ) : (
            <SimpleChart data={analytics.scoreTrend} labels={analytics.scoreTrendLabels} height={120} />
          )}
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Distribusi Nilai</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Berdasarkan asesmen terakhir</p>
          {analytics.scoreDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Belum ada data asesmen</p>
            </div>
          ) : (
            <SimpleChart data={analytics.scoreDistribution} labels={analytics.scoreDistributionLabels} type="bar" height={100} />
          )}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-bold text-ink">Akurasi per Topik</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">Rata-rata kelas berdasarkan bank soal · klik topik untuk rekomendasi</p>
          </div>
        </div>
        {analytics.topicAccuracy.length === 0 ? (
          <div className="flex items-center justify-center py-10 rounded-[8px] border border-dashed border-border">
            <p className="text-[12px] text-ink-tertiary">Data akurasi akan tersedia setelah siswa mengerjakan asesmen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {analytics.topicAccuracy.map(t => (
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
          <span className="text-[11px] text-ink-secondary">{classStudents.length} siswa · {activeClassName}</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {(showAllStudents ? classStudents : classStudents.slice(0, 6)).map(s => <StudentPerformanceCard key={s.id} student={s} />)}
        </div>
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
  const activeSubjectId = teacher?.assignments.find(a => a.classId === activeClass)?.subjectId;
  const { bank: bankQs } = useQuestionBank(activeClass, activeSubjectId);
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

  useEffect(() => {
    if (bankQs.length === 0) return;

    // bankQs is already subject-scoped (the active class's subject) via useQuestionBank
    const topicMap = new Map<string, { total: number; sumRate: number }>();
    for (const q of bankQs) {
      const t = q.topic || "Umum";
      const cur = topicMap.get(t) ?? { total: 0, sumRate: 0 };
      topicMap.set(t, { total: cur.total + 1, sumRate: cur.sumRate + q.successRate });
    }
    const topicStats = [...topicMap.entries()].map(([topic, v]) => ({
      topic, count: v.total, avgSuccessRate: Math.round(v.sumRate / v.total),
    }));

    setLoading(true);
    setError("");
    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicStats, className: activeClassName }),
    })
      .then(r => r.json())
      .then((data: { summary?: string; recommendations?: typeof teachingRecommendations; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setSummary(data.summary ?? "");
        setRecs(data.recommendations ?? []);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Gagal memuat rekomendasi"))
      .finally(() => setLoading(false));
  }, [bankQs]);

  const pending = recs.filter(r => !doneMap.has(r.id));
  // Sort done by most recently done first
  const done = recs
    .filter(r => doneMap.has(r.id))
    .sort((a, b) => (doneMap.get(b.id) ?? 0) - (doneMap.get(a.id) ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rekomendasi AI" title={`Rekomendasi — ${activeClassName}`}
        description="Berdasarkan analisis soal di bank soal, AI merekomendasikan intervensi pengajaran berikut." />

      {bankQs.length === 0 && !loading && (
        <EmptyState icon={Sparkles} title="Belum ada data soal"
          description="Tambahkan soal ke bank soal terlebih dahulu agar AI dapat menganalisis dan memberi rekomendasi pengajaran." />
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

function TeacherAIConfig() {
  const [active, setActive] = useState<string>(aiStyleOptions.find(o => o.active)?.id ?? "s1");
  const [settings, setSettings] = useState({
    grounding: true, autoReview: false, parentReports: true, bloomBalance: true, notifyWeak: true,
  });

  function ToggleRow({ id, label, desc }: { id: keyof typeof settings; label: string; desc: string }) {
    return (
      <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-ink">{label}</div>
          <div className="text-[12px] text-ink-secondary mt-0.5">{desc}</div>
        </div>
        <button role="switch" aria-checked={settings[id]} aria-label={label}
          onClick={() => setSettings(prev => ({ ...prev, [id]: !prev[id] }))}
          className={cn("flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors",
            settings[id] ? "border-primary bg-primary" : "border-border bg-border"
          )}>
          <span className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            settings[id] ? "translate-x-5" : "translate-x-0.5")} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader eyebrow="Konfigurasi AI" title="Pengaturan AI Companion" />
      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <h3 className="text-[14px] font-bold text-ink mb-1">Gaya Mengajar AI</h3>
        <p className="text-[12px] text-ink-secondary mb-4">Pilih bagaimana AI membantu siswa menjawab pertanyaan.</p>
        <div className="space-y-3">
          {aiStyleOptions.map(opt => (
            <div key={opt.id} onClick={() => setActive(opt.id)}
              className={cn("rounded-[10px] border p-4 cursor-pointer transition-all",
                active === opt.id ? "border-primary/40 bg-primary-soft" : "border-border hover:border-primary/20"
              )}>
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  active === opt.id ? "border-primary" : "border-border")}>
                  {active === opt.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink">{opt.label}</div>
                  <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">{opt.description}</p>
                  <div className="mt-2 rounded-[6px] bg-background border border-border px-3 py-2">
                    <p className="text-[11px] text-ink-secondary">Contoh: <em>{opt.example}</em></p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <h3 className="text-[14px] font-bold text-ink mb-4">Perilaku AI</h3>
        <ToggleRow id="grounding" label="Grounded Responses" desc="AI hanya menjawab berdasarkan materi yang diunggah guru." />
        <ToggleRow id="autoReview" label="Auto-approve soal AI" desc="Soal AI langsung masuk bank soal tanpa tinjauan manual." />
        <ToggleRow id="parentReports" label="Laporan orang tua otomatis" desc="Kirim ringkasan performa ke orang tua setiap minggu." />
        <ToggleRow id="bloomBalance" label="Keseimbangan Bloom" desc="Pastikan distribusi level kognitif merata di setiap asesmen." />
        <ToggleRow id="notifyWeak" label="Notifikasi topik lemah" desc="Beri tahu saat akurasi topik turun di bawah 60%." />
      </div>
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
    review: <StudentReview />,
    "weak-topics": <StudentWeakTopics />,
    incorrect: <StudentIncorrect />,
    tutor: <StudentTutor />,
    progress: <StudentProgress />,
    achievements: <StudentAchievements />,
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

// ── Student Materials ─────────────────────────────────────────────────────────

function StudentMaterials() {
  const [mats, setMats] = useState<MaterialWithFile[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStudentMaterialsReal().then(setMats);
  }, []);

  // RLS already scopes the fetch to the student's own class - only text
  // search is applied client-side now.
  const filtered = mats.filter(m => {
    return !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.subject ?? "").toLowerCase().includes(search.toLowerCase());
  });

  async function downloadMaterial(mat: MaterialWithFile) {
    if (mat.fileUrl) {
      await downloadMaterialFile(mat.fileUrl, mat.title);
      return;
    }
    alert("File tidak tersedia untuk diunduh. Hubungi gurumu untuk informasi lebih lanjut.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ruang Belajar"
        title="Materi dari Guru"
        description="Materi yang sudah diunggah gurumu untuk kelasmu."
      />

      <div className="flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2 max-w-sm">
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
        <input
          type="text"
          placeholder="Cari materi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-[13px] placeholder:text-ink-tertiary focus:outline-none"
        />
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-[14px] font-bold text-ink">{filtered.length} Materi Tersedia</h2>
        </div>
        <div className="p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                <BookOpen className="h-6 w-6 text-ink-tertiary" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink">Belum ada materi</p>
                <p className="text-[12px] text-ink-secondary mt-1">Gurumu belum mengunggah materi. Pantau terus!</p>
              </div>
            </div>
          ) : (
            filtered.map(mat => (
              <div key={mat.id} className="flex items-start gap-4 rounded-card border border-border bg-background p-4 hover:border-success/30 hover:shadow-soft transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-success/10 border border-success/20">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink truncate">{mat.title}</p>
                      <p className="text-[11px] text-ink-secondary mt-0.5">{mat.subject} · {mat.type} · {mat.uploadedAt}</p>
                    </div>
                    <button
                      onClick={() => downloadMaterial(mat)}
                      className="flex items-center gap-1.5 rounded-[6px] border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-ink-secondary hover:border-success/40 hover:text-success transition-colors shrink-0">
                      <Download className="h-3 w-3" />Unduh
                    </button>
                  </div>
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

function SimulatorPickList({ onStart }: { onStart: (id: string) => void }) {
  const [items, setItems] = useState<SavedAssessment[]>([]);
  useEffect(() => {
    fetchStudentAssessments().then(rows => setItems(rows.filter(a => a.status === "Terjadwal")));
  }, []);
  if (items.length === 0) return (
    <div className="flex items-center justify-center rounded-card border border-dashed border-border py-10">
      <p className="text-[13px] text-ink-tertiary">Belum ada asesmen terjadwal dari gurumu.</p>
    </div>
  );
  const now = Date.now();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(a => {
        const hasQuestions = a.totalQuestions > 0;
        const notYetOpen = a.openAt ? now < new Date(a.openAt).getTime() : false;
        const alreadyClosed = a.closeAt ? now > new Date(a.closeAt).getTime() : false;
        const accessible = hasQuestions && !notYetOpen && !alreadyClosed;
        return (
          <div key={a.id} role="button" tabIndex={0}
            onClick={() => onStart(a.id)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(a.id); } }}
            className={cn("rounded-card border bg-surface p-5 transition-all cursor-pointer group",
              accessible ? "border-border hover:border-primary/30 hover:shadow-soft" : "border-border opacity-60")}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]",
                accessible ? "bg-primary-soft" : "bg-background")}>
                <ShieldCheck className={cn("h-5 w-5", accessible ? "text-primary" : "text-ink-tertiary")} />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-ink">{a.title}</div>
                <div className="text-[11px] text-ink-secondary mt-0.5">{a.type} · {a.totalQuestions} soal · {a.duration} mnt</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {a.openAt && <Badge tone="neutral">Buka: {new Date(a.openAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</Badge>}
                  {a.closeAt && <Badge tone="neutral">Tutup: {new Date(a.closeAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</Badge>}
                  {!hasQuestions && <Badge tone="warning">Belum ada soal</Badge>}
                  {notYetOpen && <Badge tone="warning">Belum dibuka</Badge>}
                  {alreadyClosed && <Badge tone="danger">Sudah ditutup</Badge>}
                  {accessible && <Badge tone="danger">Mode Kiosk</Badge>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type ExamQuestion = {
  assessmentQuestionId: string; topic: string; difficulty: string; question: string; points: number;
  displayOptions: { key: string; text: string }[];
};
type ExamSession = { attemptId: string; assessmentId: string; title: string; deadlineAt: number | null; allowReview: boolean; questions: ExamQuestion[] };

function StudentSimulator({ page, onPageChange }: { page: string; onPageChange: (p: string) => void }) {
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [noQuestionsAlert, setNoQuestionsAlert] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confidence, setConfidence] = useState<Record<number, "yakin" | "cukup" | "ragu">>({});
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalCorrect, setFinalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [kioskWarning, setKioskWarning] = useState(false);
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

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  // Grading is entirely server-side (correct_answer is never sent to the
  // client before this point, per supabase/migrations/009_secure_grading.sql)
  // - the client submits raw answers and the /submit route computes score.
  async function autoSubmit() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try { localStorage.removeItem("catchup_exam_session"); localStorage.removeItem("catchup_exam_active_id"); } catch {}
    exitFullscreen();
    const session = examSessionRef.current;
    const ans = answersRef.current;
    if (session) {
      const answersByQid: Record<string, string> = {};
      session.questions.forEach((q, i) => { if (ans[i]) answersByQid[q.assessmentQuestionId] = ans[i]; });
      const data = await authedFetch(`/api/student/assessment/${session.assessmentId}/submit`, {
        attemptId: session.attemptId, answers: answersByQid,
      }) as {
        score?: number; correctCount?: number; totalQuestions?: number; allowReview?: boolean;
        review?: Array<{ question: string; options: Record<string, string>; correctAnswer: string; explanation: string; yourAnswer: string | null; isCorrect: boolean }>;
      } | null;
      const score = data?.score ?? 0;
      const correctCount = data?.correctCount ?? 0;
      setFinalScore(score);
      setFinalCorrect(correctCount);
      const resultId = `result_${Date.now()}`;
      saveResult({
        id: resultId,
        assessmentId: session.assessmentId,
        assessmentTitle: session.title,
        type: "Asesmen",
        date: new Date().toLocaleDateString("id-ID"),
        score,
        totalQuestions: data?.totalQuestions ?? session.questions.length,
        correctCount,
        answers: Object.fromEntries(Object.entries(ans).map(([k, v]) => [k, v])),
      });
      // Only surfaced when the teacher enabled allow_review - matches the
      // same allow_review-gated reveal enforced server-side (migration 009),
      // never a client-side correctness comparison.
      if (data?.allowReview && data.review) {
        const incorrectQs: StoredIncorrectQ[] = data.review
          .map((r, i) => ({ r, i }))
          .filter((item): item is { r: NonNullable<typeof data.review>[number]; i: number } => !item.r.isCorrect && !!item.r.yourAnswer)
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
    }
    setFinished(true);
  }

  async function startExam(assessmentId: string) {
    const data = await authedFetch(`/api/student/assessment/${assessmentId}/start`, {}) as {
      attemptId?: string; title?: string; deadlineAt?: number | null; allowReview?: boolean; questions?: ExamQuestion[]; error?: string;
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
    setCurrent(0);
    setAnswers({});
    setConfidence({});
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
    try {
      const saved = localStorage.getItem("catchup_exam_session");
      if (saved) {
        const s = JSON.parse(saved) as { answers?: Record<number, string>; confidence?: Record<number, "yakin" | "cukup" | "ragu">; current?: number };
        if (s.answers) setAnswers(s.answers);
        if (s.confidence) setConfidence(s.confidence);
        if (typeof s.current === "number") setCurrent(s.current);
      }
    } catch {}
    return () => { exitFullscreen(); };
  }, [page]);

  // Persist in-progress answers to localStorage (survives refresh; the
  // deadline itself is always re-derived from the server, never trusted
  // from this local cache)
  React.useEffect(() => {
    if (page !== "exam") return;
    try { localStorage.setItem("catchup_exam_session", JSON.stringify({ answers, confidence, current })); } catch {}
  }, [answers, confidence, current, page]);

  // Countdown timer, driven by the server-computed deadline (duration_minutes
  // / close_at) rather than a hardcoded 45-minute constant
  React.useEffect(() => {
    if (finished || page !== "exam" || !examSession?.deadlineAt) return;
    const deadline = examSession.deadlineAt;
    function tick() {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) autoSubmit();
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [finished, page, examSession?.deadlineAt]);

  // KIOSK: Block ESC and F11 keys (capture phase)
  React.useEffect(() => {
    if (page !== "exam") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "F11") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [page]);

  // KIOSK: Tab switch or focus loss → warn before submit
  React.useEffect(() => {
    if (page !== "exam") return;
    function onVisibilityChange() {
      if (document.hidden) triggerKioskWarning();
    }
    function onBlur() { triggerKioskWarning(); }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [page]);

  // KIOSK: Fullscreen exit → warn before submit
  React.useEffect(() => {
    if (page !== "exam") return;
    function onFsChange() {
      if (!document.fullscreenElement) triggerKioskWarning();
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [page]);

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
          <PageHeader eyebrow="Simulasi Ujian" title="Pilih Asesmen Resmi"
            description="Pilih ujian yang akan diikuti. Ujian resmi berjalan dalam mode kiosk — berpindah tab atau keluar layar penuh otomatis mengakhiri ujian." />
          <AlertPanel tone="danger" title="Perhatian: Mode Ujian Ketat">
            Berpindah tab, meminimalkan jendela, atau keluar layar penuh akan otomatis menyelesaikan dan mengumpulkan jawaban kamu.
          </AlertPanel>
          <SimulatorPickList onStart={(id) => { startExam(id); }} />
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
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-3">Latihan Mandiri (Tanpa Kiosk)</p>
            <p className="text-[12px] text-ink-secondary mb-3">Latihan santai tanpa timer ketat dan mode layar penuh. Cocok untuk belajar sehari-hari.</p>
            <Link href="/student/adaptive"
              className="inline-flex items-center gap-3 rounded-card border border-dashed border-primary/30 bg-primary-soft p-4 cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-primary">Mulai Latihan Adaptif</div>
                <div className="text-[11px] text-primary/70 mt-0.5">AI menyesuaikan soal berdasarkan kemampuanmu · Bebas kapan saja</div>
              </div>
            </Link>
          </div>
        </div>
      </AppShell>
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
            <p className="text-[14px] text-ink-secondary mt-1">{finalCorrect} dari {examSession?.questions.length ?? 0} soal benar</p>
          </div>
          <ScoreCircle score={finalScore} size={96} />
          <Button variant="default" onClick={() => { onPageChange("pick"); setFinished(false); setCurrent(0); setAnswers({}); setTimeLeft(0); setExamSession(null); }}>
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
  const answeredCount = Object.keys(answers).length;
  const timerMins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const timerSecs = String(timeLeft % 60).padStart(2, "0");
  const timerCritical = timeLeft < 300;

  return (
    <div className="min-h-dvh bg-background flex flex-col select-none">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-[12px] font-semibold text-white">
          <WifiOff className="h-3.5 w-3.5" />
          Koneksi internet terputus — jawaban tersimpan lokal, akan tersinkron saat online kembali
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
                {timerMins}:{timerSecs}
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
              <Badge tone="warning">Sedang</Badge>
              <span className="ml-auto text-[11px] text-ink-tertiary tabular-nums">
                {answeredCount}/{total} terjawab
              </span>
            </div>
            <p className="text-[15px] sm:text-[16px] font-medium text-ink leading-relaxed">{currentQ.question}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {currentQ.displayOptions.map((opt) => {
              const sel = answers[current] === opt.key;
              return (
                <button key={opt.key} onClick={() => setAnswers(prev => ({ ...prev, [current]: opt.key }))}
                  className={cn("flex items-center gap-3 rounded-[10px] border p-3.5 sm:p-4 text-left transition-all",
                    sel ? "border-primary/40 bg-primary-soft" : "border-border bg-surface hover:border-primary/20 hover:bg-background"
                  )}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                    sel ? "bg-primary text-white" : "bg-background border border-border text-ink-secondary"
                  )}>{opt.key}</span>
                  <span className="text-[13px] font-medium text-ink">{opt.text}</span>
                </button>
              );
            })}
          </div>

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
            <Button variant="default" className="h-9"
              disabled={current === total - 1}
              onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}>
              Berikutnya →
            </Button>
          </div>

          {/* Question palette */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {Array.from({ length: total }, (_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn("h-8 w-8 rounded-full text-[11px] font-semibold transition-colors",
                  current === i ? "bg-primary text-white ring-2 ring-primary/30" :
                  answers[i] ? "bg-success-light text-success border border-success/30" :
                  "bg-background border border-border text-ink-secondary hover:border-primary/30"
                )}>{i + 1}</button>
            ))}
          </div>
        </div>
      </main>

      {/* Submit confirmation */}
      <ConfirmDialog
        open={confirmSubmit}
        title="Selesaikan Asesmen?"
        message={`Kamu telah menjawab ${answeredCount} dari ${total} soal. ${total - answeredCount > 0 ? `${total - answeredCount} soal belum dijawab. ` : ""}Setelah disubmit, jawaban tidak dapat diubah.`}
        confirmLabel="Selesaikan & Submit"
        confirmVariant="success"
        onConfirm={() => {
          setConfirmSubmit(false);
          warningShownRef.current = true;
          autoSubmit();
        }}
        onCancel={() => setConfirmSubmit(false)}
      />

      {/* Kiosk warning dialog */}
      <ConfirmDialog
        open={kioskWarning}
        title="Asesmen Berakhir"
        message="Kamu telah meninggalkan mode ujian. Asesmen secara otomatis berakhir dan jawaban kamu telah disubmit."
        confirmLabel="Selesai"
        confirmVariant="default"
        onConfirm={() => { setKioskWarning(false); autoSubmit(); }}
        onCancel={() => { setKioskWarning(false); autoSubmit(); }}
      />
    </div>
  );
}

// ── Student Adaptive ──────────────────────────────────────────────────────────

type PracticeQuestion = { id: string; question: string; options: { A: string; B: string; C: string; D: string; E?: string }; topic: string; difficulty: string };

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

function AdaptiveSession({ questions, difficulty, topic, onFinish }: { questions: PracticeQuestion[]; difficulty: string; topic?: string; onFinish: () => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const [grading, setGrading] = useState(false);
  const [graded, setGraded] = useState<{ correct: number; results: Array<{ isCorrect: boolean; correctAnswer: string; explanation: string }> } | null>(null);

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState title="Tidak ada soal tersedia"
          description={`Tidak ada soal dengan filter "${topic ?? "Semua"}" / "${difficulty}" saat ini.`}
          action={<Button variant="default" onClick={onFinish}>Kembali</Button>} />
      </div>
    );
  }

  const currentQ = questions[current];
  const isLast = current === questions.length - 1;

  async function finishSession() {
    setGrading(true);
    // Grading is server-side (correct_answer is never sent to the client
    // before this point) - each answer is submitted and graded independently,
    // then tallied here once every question has been graded.
    const results = await Promise.all(
      questions.map((q, i) => authedFetch("/api/student/practice/submit", { questionId: q.id, answer: answers[i] ?? "" }))
    );
    const typed = results as Array<{ isCorrect: boolean; correctAnswer: string; explanation: string } | null>;
    const correct = typed.filter(r => r?.isCorrect).length;

    const incorrectQs: StoredIncorrectQ[] = questions
      .map((q, i) => ({ q, i, r: typed[i] }))
      .filter((item): item is { q: PracticeQuestion; i: number; r: { isCorrect: boolean; correctAnswer: string; explanation: string } } =>
        !!item.r && !item.r.isCorrect)
      .map(({ q, i, r }) => ({
        id: `adaptive_${Date.now()}_${q.id}`,
        assessmentId: "adaptive",
        assessmentTitle: `Latihan Adaptif${topic && topic !== "Semua" ? ` – ${topic}` : ""}`,
        topic: q.topic ?? "",
        question: q.question,
        yourAnswer: answers[i] ?? "",
        correctAnswer: r.correctAnswer,
        explanation: r.explanation ?? "",
        date: new Date().toLocaleDateString("id-ID"),
        options: { A: q.options.A, B: q.options.B, C: q.options.C, D: q.options.D, ...(q.options.E ? { E: q.options.E } : {}) },
      }));
    if (incorrectQs.length > 0) saveIncorrectQuestions(incorrectQs);

    setGraded({ correct, results: typed.map(r => r ?? { isCorrect: false, correctAnswer: "A", explanation: "" }) });
    setGrading(false);
    setDone(true);
  }

  if (done) {
    const correct = graded?.correct ?? 0;
    const score = Math.round((correct / questions.length) * 100);

    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-light">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-ink">Latihan Selesai!</h2>
          <p className="text-[14px] text-ink-secondary mt-1">{correct} dari {questions.length} soal benar</p>
        </div>
        <ScoreCircle score={score} size={96} />
        <Button variant="default" onClick={onFinish}>Selesai</Button>
      </div>
    );
  }

  const opts = [currentQ.options.A, currentQ.options.B, currentQ.options.C, currentQ.options.D, currentQ.options.E ?? ""];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">Latihan Adaptif · {topic ?? "Semua"} · {difficulty}</p>
          <h2 className="text-[18px] font-bold text-ink">Soal {current + 1} dari {questions.length}</h2>
        </div>
        <Button variant="ghost" className="h-8 text-[12px]" onClick={onFinish}>
          <X className="mr-1.5 h-3.5 w-3.5" />Keluar
        </Button>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Badge tone="neutral">Soal {current + 1}</Badge>
          <Badge tone={currentQ.difficulty === "Mudah" ? "success" : currentQ.difficulty === "Sedang" ? "warning" : "danger"}>{currentQ.difficulty}</Badge>
          {currentQ.topic && <Badge tone="neutral">{currentQ.topic}</Badge>}
        </div>
        <p className="text-[15px] font-medium text-ink leading-relaxed">{currentQ.question}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {["A", "B", "C", "D", "E"].map((opt, i) => {
          if (!opts[i]) return null;
          const sel = answers[current] === opt;
          return (
            <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [current]: opt }))}
              className={cn("flex items-center gap-3 rounded-[10px] border p-3.5 text-left transition-all",
                sel ? "border-primary/40 bg-primary-soft" : "border-border bg-surface hover:border-primary/20 hover:bg-background"
              )}>
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                sel ? "bg-primary text-white" : "bg-background border border-border text-ink-secondary"
              )}>{opt}</span>
              <span className="text-[13px] font-medium text-ink">{opts[i]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between items-center">
        <Button variant="outline" className="h-9" disabled={current === 0} onClick={() => setCurrent(c => Math.max(0, c - 1))}>
          ← Sebelumnya
        </Button>
        {isLast ? (
          <Button variant="success" className="h-9" disabled={grading} onClick={finishSession}>
            {grading ? "Menilai..." : "Selesai & Lihat Nilai"}
          </Button>
        ) : (
          <Button variant="default" className="h-9" onClick={() => setCurrent(c => c + 1)}>
            Berikutnya →
          </Button>
        )}
      </div>
    </div>
  );
}

function StudentAdaptive() {
  const [difficulty, setDifficulty] = useState<"Mudah" | "Sedang" | "Sulit" | "Campur">("Campur");
  const [selectedTopic, setSelectedTopic] = useState<string>("Semua");
  const [sessionQs, setSessionQs] = useState<PracticeQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [topics, setTopics] = useState<string[]>(["Semua"]);

  // Real schema note: `questions` is scoped by school+subject, not per-class,
  // and students have no direct RLS SELECT on it at all - subjects/topics are
  // resolved through the class's real teacher_assignments and a narrow
  // service route, never a raw client-side questions query.
  useEffect(() => {
    (async () => {
      const student = await getCurrentStudent();
      if (!student?.class_id) return;
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
    (async () => {
      const data = await authedFetch("/api/student/practice/topics", { subjectId: selectedSubjectId }) as { topics?: string[] } | null;
      setTopics(["Semua", ...(data?.topics ?? [])]);
    })();
  }, [selectedSubjectId]);

  async function startSession(overrideTopic?: string) {
    if (!selectedSubjectId) return;
    const topic = overrideTopic ?? selectedTopic;
    setLoading(true);
    try {
      const data = await authedFetch("/api/student/practice/questions", {
        subjectId: selectedSubjectId,
        topic: topic === "Semua" ? undefined : topic,
        difficulty: difficulty === "Campur" ? undefined : difficulty,
        count: 10,
      }) as { questions?: PracticeQuestion[] } | null;
      setSessionQs(data?.questions ?? []);
    } finally {
      setLoading(false);
    }
  }

  if (sessionQs !== null) {
    return <AdaptiveSession questions={sessionQs} difficulty={difficulty} topic={selectedTopic} onFinish={() => setSessionQs(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Latihan Adaptif" title="Latihan Disesuaikan AI"
        description="Pilih topik dan tingkat kesulitan. AI akan menyiapkan soal dari bank soal atau men-generate soal baru jika perlu." />

      {subjects.length > 1 && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-2">Mata Pelajaran</label>
          <div className="flex gap-2 flex-wrap">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSubjectId(s.id)}
                className={cn("rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors border",
                  selectedSubjectId === s.id ? "bg-primary text-white border-primary" : "bg-background text-ink-secondary border-border hover:border-primary/30")}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-2">Topik</label>
          <div className="flex gap-2 flex-wrap">
            {topics.map(t => (
              <button key={t} onClick={() => setSelectedTopic(t)}
                className={cn("rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors border",
                  selectedTopic === t ? "bg-primary text-white border-primary" : "bg-background text-ink-secondary border-border hover:border-primary/30")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary mb-2">Tingkat Kesulitan</label>
          <div className="flex gap-2 flex-wrap">
            {(["Mudah", "Sedang", "Sulit", "Campur"] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={cn("rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors border",
                  difficulty === d ? "bg-primary text-white border-primary" : "bg-background text-ink-secondary border-border hover:border-primary/30")}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <p className="text-[12px] text-ink-secondary mb-4">
          AI akan menyiapkan soal dari bank soal atau men-generate soal baru jika perlu.
        </p>
        <Button variant="default" className="w-full h-10" onClick={() => startSession()} disabled={loading || !selectedSubjectId}>
          {loading ? "AI sedang menyiapkan soal..." : <><Zap className="mr-2 h-4 w-4" />Mulai Latihan Sekarang</>}
        </Button>
      </div>

      {weakTopics.length > 0 && (
        <div id="adaptive-topics" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weakTopics.slice(0, 3).map(t => (
            <div key={t.id} className="rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{t.topic}</div>
                  <div className="text-[11px] text-ink-secondary">{t.questionsAttempted} soal dicoba</div>
                </div>
                <MasteryBadge level={t.mastery} />
              </div>
              <TopicBar label="Akurasi" value={t.accuracyRate} />
              <Button variant="default" className="w-full mt-3 h-7 text-[11px]"
                onClick={() => { setSelectedTopic(t.topic); startSession(t.topic); }}>
                <Zap className="mr-1.5 h-3 w-3" />Latihan Sekarang
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Student Review ────────────────────────────────────────────────────────────

function StudentReview() {
  const router = useRouter();
  const [results, setResults] = useState<ReviewListItem[]>([]);
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);
  const [reviewQs, setReviewQs] = useState<ReviewQuestionDetail[]>([]);
  const [materials, setMaterials] = useState<MaterialWithFile[]>([]);
  const ownStats = useOwnStudentStats();

  useEffect(() => {
    fetchStudentMaterialsReal().then(setMaterials);
    fetchStudentCompletedAttempts().then(setResults);
  }, []);

  const reviewResult = results.find(r => r.attemptId === reviewDetailId) ?? null;

  useEffect(() => {
    setReviewQs([]);
    if (reviewResult?.allowReview) fetchAttemptReviewDetail(reviewResult.attemptId).then(setReviewQs);
  }, [reviewResult?.attemptId, reviewResult?.allowReview]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Review" title="Riwayat Asesmen" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ownStudentStatCards(ownStats).map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-[14px] font-bold text-ink">Semua Asesmen</h3>
        </div>
        <div className="px-5 py-3">
          {results.length === 0 ? (
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
                <p className="text-[12px] text-ink-secondary">{reviewResult.type} · {reviewResult.date} · Nilai: <strong className="text-ink">{reviewResult.score}</strong></p>
              </div>
              <button onClick={() => setReviewDetailId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background text-ink-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {reviewQs.length === 0 ? (
                <p className="text-[13px] text-ink-secondary text-center py-8">Detail soal tidak tersedia</p>
              ) : reviewQs.map((q, idx) => {
                const studentAns = q.yourAnswer ?? undefined;
                const isWrong = studentAns !== undefined && !q.isCorrect;
                const opts = q.options;
                return (
                  <div key={idx} className={cn("rounded-card border p-4", isWrong ? "border-danger/20 bg-danger-light/30" : "border-border bg-surface")}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-ink-secondary">Soal {idx + 1}</span>
                      <Badge tone={studentAns === undefined ? "neutral" : isWrong ? "danger" : "success"}>
                        {studentAns === undefined ? "Tidak dijawab" : isWrong ? "Salah" : "Benar"}
                      </Badge>
                      <Badge tone="neutral">{q.topic}</Badge>
                    </div>
                    <p className="text-[13px] font-medium text-ink mb-3">{q.question}</p>
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
                    {q.explanation && (
                      <div className="rounded-[6px] bg-background border border-border p-2.5">
                        <p className="text-[11px] text-ink leading-relaxed">{q.explanation}</p>
                        {q.sourceTitle && (
                          <button onClick={async () => {
                            const mat = materials.find(m => m.title.toLowerCase() === q.sourceTitle?.toLowerCase());
                            if (mat?.fileUrl) await downloadMaterialFile(mat.fileUrl, mat.title);
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

function StudentWeakTopics() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Topik Lemah" title="Area yang Perlu Diperkuat"
        description="Topik ini masih memerlukan latihan lebih lanjut." />
      {weakTopics.filter(t => t.accuracyRate < 50).length > 0 && (
        <AlertPanel tone="warning" title={`${weakTopics.filter(t => t.accuracyRate < 50).length} topik perlu perhatian segera`}>
          Akurasi di bawah 50% menunjukkan kesenjangan pemahaman yang perlu diperbaiki sebelum asesmen berikutnya.
        </AlertPanel>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weakTopics.map(t => <WeakTopicRow key={t.id} topic={t} />)}
      </div>
    </div>
  );
}

// ── Student Incorrect ─────────────────────────────────────────────────────────

function StudentIncorrect() {
  const [questions, setQuestions] = useState<StoredIncorrectQ[]>([]);
  useEffect(() => { initIncorrectStore(); setQuestions([..._incorrectStore.questions]); }, []);

  function handleDelete(id: string) {
    deleteIncorrectQuestion(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Soal Salah" title="Soal yang Perlu Dipelajari Ulang"
        description="Pelajari kembali soal yang salah dan pahami pembahasan." />
      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <p className="text-[14px] font-semibold text-ink">Belum ada soal salah</p>
          <p className="text-[12px] text-ink-secondary">Soal yang salah saat asesmen akan muncul di sini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questions.map(q => (
            <div key={q.id} className="rounded-card border border-danger/20 bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="neutral">{q.topic}</Badge>
                <span className="text-[10px] text-ink-tertiary">{q.assessmentTitle} · {q.date}</span>
                <button onClick={() => handleDelete(q.id)}
                  className="ml-auto flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-semibold text-ink-tertiary hover:text-danger hover:bg-danger-light transition-colors">
                  <X className="h-3 w-3" />Hapus
                </button>
              </div>
              <p className="text-[13px] font-medium text-ink leading-snug">{q.question}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[6px] bg-danger-light border border-danger/20 p-2.5">
                  <div className="text-[9px] font-bold uppercase text-danger mb-1">Jawaban kamu</div>
                  <div className="text-[11px] text-ink">{q.yourAnswer}: {q.options[q.yourAnswer] ?? ""}</div>
                </div>
                <div className="rounded-[6px] bg-success-light border border-success/20 p-2.5">
                  <div className="text-[9px] font-bold uppercase text-success mb-1">Jawaban benar</div>
                  <div className="text-[11px] text-ink">{q.correctAnswer}: {q.options[q.correctAnswer] ?? ""}</div>
                </div>
              </div>
              {q.explanation && (
                <div className="rounded-[6px] bg-background border border-border p-2.5">
                  <div className="text-[10px] font-semibold text-ink-secondary mb-1">Pembahasan</div>
                  <p className="text-[11px] text-ink leading-relaxed">{q.explanation}</p>
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
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [localMats, setLocalMats] = useState<MaterialWithFile[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => { fetchStudentMaterialsReal().then(setLocalMats); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function downloadMat(mat: MaterialWithFile) {
    if (mat.fileUrl) await downloadMaterialFile(mat.fileUrl, mat.title);
  }

  function renderContent(content: string) {
    const parts = content.split(/(\[Sumber:[^\]]*\])/g);
    if (parts.length <= 1) return <>{content}</>;
    return (
      <>
        {parts.map((part, i) => {
          const match = part.match(/^\[Sumber:\s*([^,\]]+)/);
          if (match) {
            const title = match[1].trim();
            const mat = localMats.find(m => m.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(m.title.toLowerCase()));
            return (
              <button key={i}
                onClick={() => mat && downloadMat(mat)}
                title={mat ? `Unduh: ${mat.title}` : title}
                className="inline-flex items-center gap-1 rounded-[4px] border border-primary/30 bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer mx-0.5 align-middle">
                <BookOpen className="h-3 w-3 shrink-0" />
                {part}
              </button>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </>
    );
  }

  async function send(text: string) {
    if (!text.trim() || isTyping) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: "Baru saja" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setApiError(null);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", grounded: true, timestamp: "Baru saja" }]);

    try {
      const history = messages
        .filter(m => m.id !== "greeting")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: text }],
          materials: localMats.map(m => ({ title: m.title, topic: m.subject ?? "" })),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated } : m
              ));
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi AI";
      setApiError(msg);
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-4">
      <PageHeader eyebrow="AI Companion" title="Tanya AI Companion"
        description="Bertanya tentang materi pelajaran. AI hanya menjawab berdasarkan materi yang diunggah guru." />
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
                <div className="rounded-[12px] rounded-tl-sm bg-surface border border-border px-4 py-3 text-[13px] leading-relaxed text-ink shadow-sm whitespace-pre-wrap">
                  {renderContent(m.content)}
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
            <span className="text-[12px] text-danger">{apiError} — pastikan API key sudah diisi di .env.local</span>
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
          placeholder="Tanyakan tentang materi pelajaran..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] text-ink placeholder:text-ink-tertiary focus:outline-none leading-relaxed" />
        <Button variant="default" className="h-8 w-8 p-0 shrink-0" onClick={() => send(input)} disabled={!input.trim() || isTyping}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Student Progress ──────────────────────────────────────────────────────────

function StudentProgress() {
  const ownStats = useOwnStudentStats();
  const [scoreTrendData, setScoreTrendData] = useState<ScoreTrendData>({ trend: [], labels: [] });
  const [subjectMasteryData, setSubjectMasteryData] = useState<SubjectMasteryEntry[]>([]);

  useEffect(() => {
    getCurrentStudent().then(student => {
      if (!student) return;
      fetchScoreTrendAndSubjectMastery(student.id).then(({ scoreTrend, subjectMastery }) => {
        setScoreTrendData(scoreTrend);
        setSubjectMasteryData(subjectMastery);
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progres Belajar" title="Perjalanan Belajarmu" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ownStudentStatCards(ownStats).map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Tren Nilai</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Berdasarkan riwayat asesmen</p>
          {scoreTrendData.trend.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Data akan muncul setelah mengerjakan asesmen</p>
            </div>
          ) : (
            <SimpleChart data={scoreTrendData.trend} labels={scoreTrendData.labels} height={100} />
          )}
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Penguasaan Materi</h3>
          {subjectMasteryData.length === 0 ? (
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

function StudentAchievements() {
  const ownStats = useOwnStudentStats();
  const earned = achievements.filter(a => a.earned);
  const notEarned = achievements.filter(a => !a.earned);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pencapaian" title="Koleksi Pencapaian" />

      <div className="rounded-card border border-border bg-gradient-hero text-white p-6">
        <div className="flex items-center gap-6">
          {[
            { val: ownStats ? ownStats.xp.toLocaleString("id-ID") : "-", label: "Total XP" },
            { val: earned.length, label: "Pencapaian" },
            { val: ownStats ? `#${ownStats.rank}` : "-", label: "Peringkat Kelas" },
            { val: ownStats ? `🔥 ${ownStats.streak}` : "🔥 -", label: "Hari Streak" },
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

      <div>
        <h3 className="text-[14px] font-bold text-ink mb-3">Sudah Diraih ({earned.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {earned.map(a => (
            <div key={a.id} className="rounded-card border border-success/30 bg-success-light p-4 text-center">
              <div className="text-[28px] mb-1">{a.icon}</div>
              <div className="text-[12px] font-bold text-ink">{a.title}</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{a.description}</div>
              <div className="text-[11px] font-semibold text-success mt-1.5">+{a.xp} XP</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-ink mb-3">Belum Diraih ({notEarned.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {notEarned.map(a => (
            <div key={a.id} className="rounded-card border border-border bg-background p-4 text-center opacity-60">
              <div className="text-[28px] mb-1">{a.icon}</div>
              <div className="text-[12px] font-bold text-ink">{a.title}</div>
              <div className="text-[10px] text-ink-secondary mt-0.5">{a.description}</div>
              <div className="text-[11px] font-semibold text-ink-tertiary mt-1.5">+{a.xp} XP</div>
            </div>
          ))}
        </div>
      </div>
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
  const [stats, setStats] = useState<OwnStudentStats | null>(null);
  const [scoreTrendData, setScoreTrendData] = useState<ScoreTrendData>({ trend: [], labels: [] });
  const [subjectMasteryData, setSubjectMasteryData] = useState<SubjectMasteryEntry[]>([]);

  useEffect(() => {
    fetchParentPrimaryChild().then(c => {
      setChild(c);
      if (c) {
        fetchClassRankedStats(c.studentId, c.classId).then(setStats);
        // Score trend only needs assessment_attempts (already safe for a
        // parent's own direct RLS access); topic mastery is real per-topic
        // accuracy, not per-subject - reuses the same server-side aggregation
        // as Rekomendasi Pengajaran, since a parent has no direct RLS access
        // to question_attempts/questions (see /api/parent/topic-stats).
        fetchScoreTrendAndSubjectMastery(c.studentId).then(({ scoreTrend }) => {
          setScoreTrendData(scoreTrend);
        });
        authedFetch("/api/parent/topic-stats", { studentId: c.studentId }).then((data) => {
          const topicStats = (data as { topicStats?: Array<{ topic: string; avgSuccessRate: number }> } | null)?.topicStats ?? [];
          setSubjectMasteryData(topicStats.map(t => ({
            label: t.topic,
            value: t.avgSuccessRate,
            tone: t.avgSuccessRate >= 80 ? "success" : t.avgSuccessRate >= 60 ? "primary" : "warning",
          })));
        });
      }
    });
  }, []);

  const firstName = child?.fullName.split(" ")[0] ?? "Anak";

  if (child === undefined) return null;
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
          {scoreTrendData.trend.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] rounded-[8px] border border-dashed border-border">
              <p className="text-[12px] text-ink-tertiary">Data akan muncul setelah anak mengerjakan asesmen</p>
            </div>
          ) : (
            <SimpleChart data={scoreTrendData.trend} labels={scoreTrendData.labels} height={100} />
          )}
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Penguasaan Topik</h3>
          {subjectMasteryData.length === 0 ? (
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
  const [results, setResults] = useState<ReviewListItem[]>([]);

  useEffect(() => {
    fetchParentPrimaryChild().then(c => {
      setChild(c);
      if (c) fetchChildCompletedAttempts(c.studentId).then(setResults);
    });
  }, []);

  const firstName = child?.fullName.split(" ")[0] ?? "Anak";

  if (child === undefined) return null;
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
          {results.length === 0 ? (
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneMap, setDoneMap] = useState<Map<string, number>>(new Map());

  useEffect(() => { setDoneMap(loadRecDone()); }, []);
  useEffect(() => { fetchParentPrimaryChild().then(setChild); }, []);

  useEffect(() => {
    if (!child) return;
    setLoading(true);
    setError("");
    authedFetch("/api/parent/topic-stats", { studentId: child.studentId })
      .then((data) => {
        const topicStats = (data as { topicStats?: Array<{ topic: string; avgSuccessRate: number; count: number }> } | null)?.topicStats ?? [];
        if (topicStats.length === 0) { setLoading(false); return; }
        return fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicStats, className: child.className }),
        })
          .then(r => r.json())
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
  const screens: Record<string, React.ReactNode> = {
    dashboard: <AdminDashboard />,
    schools: <AdminSchools />,
    teachers: <AdminTeachers />,
    students: <AdminStudents />,
    classes: <AdminClasses />,
    assessments: <AdminAssessments />,
    analytics: <AdminAnalytics />,
    settings: <AdminSettings />,
  };
  return (
    <AppShell role="admin" nav={adminNav}>
      {screens[page] ?? <AdminDashboard />}
    </AppShell>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary mb-1">Admin Platform</p>
        <h1 className="text-2xl font-bold text-ink">Dasbor {school.name}</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Semester Ganjil 2025/2026 · 48 Guru · 1.312 Siswa</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">Aktivitas Platform — 7 Hari Terakhir</h3>
          </div>
          <div className="p-5">
            <SimpleChart data={[142, 188, 165, 201, 178, 215, 198]} labels={["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]} height={120} />
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Guru Aktif per Mapel</h3>
          <div className="space-y-3">
            {[
              { label: "Matematika", value: 80 },
              { label: "Fisika", value: 60 },
              { label: "Biologi", value: 50 },
              { label: "Kimia", value: 70 },
              { label: "Bahasa Indonesia", value: 90 },
            ].map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AlertPanel tone="danger" title="Kapasitas penyimpanan 78%">
          Ruang penyimpanan hampir penuh. Pertimbangkan upgrade kapasitas atau arsipkan materi lama.
        </AlertPanel>
        <AlertPanel tone="warning" title="3 guru belum aktif minggu ini">
          Pak Doni, Bu Wulan, dan 1 guru lain belum login sejak Senin. Hubungi untuk memastikan tidak ada kendala.
        </AlertPanel>
      </div>
    </div>
  );
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

function AdminTeachers() {
  const mockTeachers = [
    { id: "t1", name: "Bu Ratna Dewi", school: "SMA Negeri 1 Bandung", subject: "Fisika", classes: 3, assessments: 12, status: "Aktif" },
    { id: "t2", name: "Pak Budi Santoso", school: "SMA Negeri 1 Bandung", subject: "Matematika", classes: 4, assessments: 18, status: "Aktif" },
    { id: "t3", name: "Bu Sari Utami", school: "SMA Negeri 2 Bandung", subject: "Kimia", classes: 3, assessments: 9, status: "Aktif" },
    { id: "t4", name: "Pak Doni", school: "SMA Negeri 1 Bandung", subject: "Biologi", classes: 2, assessments: 4, status: "Tidak Aktif" },
    { id: "t5", name: "Bu Wulan", school: "SMA Negeri 1 Bandung", subject: "Bahasa Indonesia", classes: 3, assessments: 7, status: "Tidak Aktif" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader eyebrow="Admin" title="Manajemen Guru" />
        <Button variant="default" className="h-8 text-[12px]"><Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Guru</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Guru", value: "48", detail: "Platform", tone: "primary" as const },
          { label: "Aktif Minggu Ini", value: "45", detail: "93.8% aktif", tone: "success" as const },
          { label: "Perlu Perhatian", value: "3", detail: "Tidak login >7 hari", tone: "danger" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full">
          <AdminTableHead cols={["Nama Guru", "Sekolah", "Mapel", "Kelas", "Asesmen", "Status", "Aksi"]} />
          <tbody>
            {mockTeachers.map(t => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{t.name}</span></td>
                <td className="px-4 py-3 text-[12px]"><span className="text-ink-secondary">{t.school}</span></td>
                <td className="px-4 py-3 text-[12px] text-ink">{t.subject}</td>
                <td className="px-4 py-3 text-[12px] text-ink">{t.classes}</td>
                <td className="px-4 py-3 text-[12px] text-ink">{t.assessments}</td>
                <td className="px-4 py-3 text-[12px]"><Badge tone={t.status === "Aktif" ? "success" : "danger"}>{t.status}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" className="h-7 px-2 text-[11px]"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" className="h-7 px-2 text-[11px]"><MessageCircle className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminStudents() {
  const mockStudentList = [
    { id: "s1", name: "Adi Pratama", school: "SMA N 1 Bandung", class: "XI IPA 2", avgScore: 88, lastActive: "Hari ini" },
    { id: "s2", name: "Budi Rahmat", school: "SMA N 1 Bandung", class: "XI IPA 2", avgScore: 76, lastActive: "Kemarin" },
    { id: "s3", name: "Citra Lestari", school: "SMA N 2 Bandung", class: "X IPS 1", avgScore: 91, lastActive: "Hari ini" },
    { id: "s4", name: "Dewi Amalia", school: "SMA N 1 Bandung", class: "XII IPA 1", avgScore: 82, lastActive: "3 hari lalu" },
    { id: "s5", name: "Eko Susanto", school: "SMP N 5 Bandung", class: "IX A", avgScore: 68, lastActive: "1 minggu lalu" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader eyebrow="Admin" title="Manajemen Siswa" />
        <div className="flex gap-2">
          <Button variant="outline" className="h-8 text-[12px]"><Upload className="mr-1.5 h-3.5 w-3.5" />Import CSV</Button>
          <Button variant="default" className="h-8 text-[12px]"><Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Siswa</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Siswa", value: "1.312", detail: "Seluruh sekolah", tone: "primary" as const },
          { label: "Aktif Bulan Ini", value: "1.189", detail: "90.6% aktif", tone: "success" as const },
          { label: "Rata-rata Nilai", value: "79.4", detail: "Semua asesmen", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full">
          <AdminTableHead cols={["Nama Siswa", "Sekolah", "Kelas", "Rata-rata Nilai", "Terakhir Aktif", "Aksi"]} />
          <tbody>
            {mockStudentList.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{s.name}</span></td>
                <td className="px-4 py-3 text-[12px]"><span className="text-ink-secondary">{s.school}</span></td>
                <td className="px-4 py-3 text-[12px] text-ink">{s.class}</td>
                <td className="px-4 py-3 text-[12px]">
                  <span className={cn("font-semibold", s.avgScore >= 80 ? "text-success" : s.avgScore >= 70 ? "text-warning" : "text-danger")}>{s.avgScore}</span>
                </td>
                <td className="px-4 py-3 text-[12px] text-ink">{s.lastActive}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" className="h-7 px-2 text-[11px]"><Eye className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminClasses() {
  const mockClasses = [
    { id: "c1", name: "XI IPA 2", school: "SMA N 1 Bandung", teacher: "Bu Ratna Dewi", students: 32, avgScore: 82 },
    { id: "c2", name: "XI IPA 1", school: "SMA N 1 Bandung", teacher: "Pak Budi Santoso", students: 34, avgScore: 78 },
    { id: "c3", name: "XII IPA 1", school: "SMA N 1 Bandung", teacher: "Bu Ratna Dewi", students: 30, avgScore: 86 },
    { id: "c4", name: "X IPS 1", school: "SMA N 2 Bandung", teacher: "Bu Sari Utami", students: 28, avgScore: 74 },
    { id: "c5", name: "IX A", school: "SMP N 5 Bandung", teacher: "Pak Hendra", students: 35, avgScore: 71 },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader eyebrow="Admin" title="Manajemen Kelas" />
        <Button variant="default" className="h-8 text-[12px]"><Plus className="mr-1.5 h-3.5 w-3.5" />Buat Kelas</Button>
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full">
          <AdminTableHead cols={["Kelas", "Sekolah", "Wali Kelas", "Jumlah Siswa", "Rata-rata Nilai", "Aksi"]} />
          <tbody>
            {mockClasses.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{c.name}</span></td>
                <td className="px-4 py-3 text-[12px]"><span className="text-ink-secondary">{c.school}</span></td>
                <td className="px-4 py-3 text-[12px] text-ink">{c.teacher}</td>
                <td className="px-4 py-3 text-[12px] text-ink">{c.students}</td>
                <td className="px-4 py-3 text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${c.avgScore}%` }} />
                    </div>
                    <span className="font-semibold text-ink">{c.avgScore}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" className="h-7 px-2 text-[11px]"><Eye className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAssessments() {
  const platformAssessments = [
    { id: "a1", title: "Tes Diagnostik Fisika XI", school: "SMA N 1 Bandung", teacher: "Bu Ratna", participants: 32, avgScore: 78, status: "Selesai" },
    { id: "a2", title: "Kuis Fungsi Kuadrat", school: "SMA N 1 Bandung", teacher: "Pak Budi", participants: 34, avgScore: 82, status: "Selesai" },
    { id: "a3", title: "UTS Kimia X", school: "SMA N 2 Bandung", teacher: "Bu Sari", participants: 28, avgScore: 0, status: "Terjadwal" },
    { id: "a4", title: "Latihan Adaptif Biologi", school: "SMA N 1 Bandung", teacher: "Pak Doni", participants: 30, avgScore: 71, status: "Selesai" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader eyebrow="Admin" title="Asesmen Platform" />
        <Button variant="outline" className="h-8 text-[12px]"><Download className="mr-1.5 h-3.5 w-3.5" />Ekspor Laporan</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Asesmen", value: "247", detail: "Semester ini", tone: "primary" as const },
          { label: "Partisipasi Rata-rata", value: "96%", detail: "Seluruh kelas", tone: "success" as const },
          { label: "Rata-rata Platform", value: "78.4", detail: "Semua sekolah", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full">
          <AdminTableHead cols={["Judul Asesmen", "Sekolah", "Guru", "Peserta", "Rata-rata", "Status"]} />
          <tbody>
            {platformAssessments.map(a => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                <td className="px-4 py-3 text-[12px]"><span className="font-semibold text-ink">{a.title}</span></td>
                <td className="px-4 py-3 text-[12px]"><span className="text-ink-secondary text-[11px]">{a.school}</span></td>
                <td className="px-4 py-3 text-[12px] text-ink">{a.teacher}</td>
                <td className="px-4 py-3 text-[12px] text-ink">{a.participants}</td>
                <td className="px-4 py-3 text-[12px]">
                  {a.status === "Terjadwal" ? <span className="text-ink-tertiary">—</span> : <span className="font-semibold text-ink">{a.avgScore}</span>}
                </td>
                <td className="px-4 py-3 text-[12px]"><Badge tone={a.status === "Selesai" ? "success" : "warning"}>{a.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Analitik Platform"
        description="Ringkasan performa dan keterlibatan seluruh sekolah yang terdaftar." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pengguna Aktif Hari Ini", value: "842", detail: "+12% vs kemarin", tone: "primary" as const },
          { label: "Soal Dijawab Hari Ini", value: "14.320", detail: "Seluruh platform", tone: "success" as const },
          { label: "Rata-rata Sesi", value: "18 mnt", detail: "Per siswa aktif", tone: "neutral" as const },
          { label: "Tingkat Penyelesaian", value: "94%", detail: "Asesmen selesai", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-card border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">Pengguna Aktif — 30 Hari Terakhir</h3>
          </div>
          <div className="p-5">
            <SimpleChart data={[620, 680, 710, 695, 730, 780, 810, 842, 798, 820, 860, 842, 790, 830]} labels={[]} height={130} />
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-ink">Performa per Sekolah</h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "SMA N 1 Bandung", value: 84 },
              { label: "SMA N 2 Bandung", value: 78 },
              { label: "SMP N 5 Bandung", value: 72 },
              { label: "SMK N 3 Bandung", value: 69 },
              { label: "SMA Swasta Al-Ikhlas", value: 75 },
            ].map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  const [saved, setSaved] = useState(false);
  const settings = [
    { section: "Umum", fields: [
      { label: "Nama Platform", value: "Catch Up — Platform Diagnostik Sekolah" },
      { label: "Email Kontak Admin", value: "admin@catchup.id" },
    ]},
    { section: "Keamanan", fields: [
      { label: "Batas Percobaan Login", value: "5" },
      { label: "Masa Berlaku Sesi (jam)", value: "8" },
    ]},
    { section: "Notifikasi", fields: [
      { label: "Email Notifikasi Laporan", value: "laporan@catchup.id" },
    ]},
  ];
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader eyebrow="Admin" title="Pengaturan Platform" />
      {settings.map(sec => (
        <div key={sec.section} className="rounded-card border border-border bg-surface shadow-sm p-6 space-y-4">
          <h3 className="text-[13px] font-bold text-ink border-b border-border pb-3">{sec.section}</h3>
          {sec.fields.map(f => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">{f.label}</label>
              <input defaultValue={f.value}
                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="default" className="h-8 text-[12px]" onClick={() => setSaved(true)}>Simpan Pengaturan</Button>
      </div>
      {saved && <AppToast message="Pengaturan berhasil disimpan" tone="success" onDismiss={() => setSaved(false)} />}
    </div>
  );
}
