"use client";

import React, { useState } from "react";
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
  classStats,
  currentTeacher,
  getAssistantReply,
  incorrectQuestions,
  leaderboard,
  materials,
  pastPaperTopics,
  pendingQuestions,
  questionBank,
  scoreTrend,
  scoreTrendLabels,
  scoreDistribution,
  scoreDistributionLabels,
  studentProfile,
  studentProgressStats,
  studentResults,
  students,
  subjectMastery,
  suggestedPrompts,
  teacherAnalyticsStats,
  teachingRecommendations,
  topicAccuracy,
  weakTopics,
  simulatorQuestions,
  teacherNav,
  studentNav,
  parentNav,
  adminNav,
  type ChatMessage,
  type Material,
  type PendingQuestion,
  type AssessmentStyleCorpus,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Download,
  Eye,
  FilePlus2,
  FileQuestion,
  Filter,
  Maximize2,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
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
    <AppShell role="teacher" nav={teacherNav}>
      {screens[page] ?? <TeacherDashboard />}
    </AppShell>
  );
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<"semua" | "at-risk" | "need-review">("semua");

  const allFiltered = students.filter(s => {
    if (activeTab === "at-risk") return s.status === "At Risk";
    if (activeTab === "need-review") return s.status === "Need Review";
    return true;
  });
  const filteredStudents = allFiltered.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary mb-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-ink leading-tight">
            Selamat pagi, {currentTeacher.name.split(" ").slice(0, 2).join(" ")}! 👋
          </h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {currentTeacher.classes[0]} · {currentTeacher.subject} · {classStats.total} siswa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/teacher/assessment-builder">
            <Button variant="outline" className="h-8 text-[12px]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Buat Asesmen
            </Button>
          </Link>
          <Link href="/teacher/materials">
            <Button variant="default" className="h-8 text-[12px]">
              <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Materi
            </Button>
          </Link>
        </div>
      </div>

      {/* Status KPI hero */}
      <StatusKPIRow
        onTrack={classStats.onTrack}
        needReview={classStats.needReview}
        atRisk={classStats.atRisk}
        total={classStats.total}
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
                  {tab === "semua" ? `Semua (${classStats.total})` :
                   tab === "at-risk" ? `Perhatian (${classStats.atRisk})` :
                   `Review (${classStats.needReview})`}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-2">
            {filteredStudents.map(s => <StudentStatusRow key={s.id} student={s} />)}
            {allFiltered.length > 8 && (
              <div className="py-3 text-center">
                <button className="text-[12px] font-semibold text-primary hover:underline">
                  Lihat semua {allFiltered.length} siswa →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AIInsightPanel title="Wawasan AI">
            <p className="mb-3">
              <strong className="text-ink">{classStats.atRisk} siswa</strong> membutuhkan perhatian segera.
              Topik <strong className="text-ink">Diskriminan</strong> memiliki akurasi rata-rata hanya{" "}
              <strong className="text-danger">38%</strong> — terendah semester ini.
            </p>
            <p>Remedial 20 menit difokuskan pada tanda konstanta negatif direkomendasikan sebelum UAS.</p>
            <div className="mt-3">
              <Link href="/teacher/recommendations" className="text-[12px] font-semibold text-primary hover:underline">
                Lihat semua rekomendasi →
              </Link>
            </div>
          </AIInsightPanel>

          <div className="rounded-card border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-[13px] font-bold text-ink">Miskonsepsi Utama</h3>
            </div>
            <div className="px-4 py-1">
              {teachingRecommendations.slice(0, 3).map(r => (
                <MisconceptionRow
                  key={r.id}
                  topic={r.topic}
                  issue={r.issue}
                  affectedStudents={r.affectedStudents}
                  priority={r.priority}
                />
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-ink mb-3">Asesmen Mendatang</h3>
            <div className="space-y-2.5">
              {assessments.filter(a => a.status === "Terjadwal").slice(0, 2).map(a => (
                <UpcomingCard
                  key={a.id}
                  title={a.title}
                  type={a.type}
                  date={a.scheduledFor}
                  duration={a.duration}
                  questions={a.totalQuestions}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {pendingQuestions.filter(q => q.status === "Perlu Ditinjau").length > 0 && (
        <AlertPanel tone="primary" title={`${pendingQuestions.filter(q => q.status === "Perlu Ditinjau").length} soal AI menunggu tinjauan`}>
          AI mengekstrak soal baru dari materi yang diunggah. Tinjau dan setujui sebelum diterbitkan.{" "}
          <Link href="/teacher/question-review" className="font-semibold underline">Tinjau sekarang →</Link>
        </AlertPanel>
      )}
    </div>
  );
}

// ── Teacher Materials ─────────────────────────────────────────────────────────

function TeacherMaterials() {
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [confirmProcessId, setConfirmProcessId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" } | null>(null);
  const [editMeta, setEditMeta] = useState(false);

  function handleProcessAI(id: string) {
    setConfirmProcessId(id);
  }

  function startAIProcess(id: string) {
    setConfirmProcessId(null);
    setProcessingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      setProcessedIds(prev => new Set([...prev, id]));
      setToast({ message: "AI selesai memproses materi. Soal baru siap diekstrak.", tone: "success" });
    }, 2800);
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
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
                dragOver ? "border-primary bg-primary/10" : "border-primary/30 bg-white"
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); }}
            >
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-ink">Tarik & lepas file di sini</p>
              <p className="text-[12px] text-ink-secondary mt-1">PDF, PPT, DOCX · Maks. 50 MB per file</p>
            </div>
            <Button variant="outline" className="h-8 text-[12px]">Pilih File</Button>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-primary/10 pt-6">
            {[
              { label: "Tipe Materi *", ph: "Buku Teks, PPT, RPP, Modul Ajar..." },
              { label: "Mata Pelajaran *", ph: "Matematika XI" },
              { label: "Kelas/Tingkat *", ph: "XI" },
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
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Sumber *</label>
              <input type="text" placeholder="Buku wajib / materi guru / internal"
                className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setShowUpload(false)}>Batal</Button>
            <Button variant="default" className="h-8 text-[12px]">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />Unggah & Proses AI
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total materi", value: `${materials.length}`, detail: "Aktif & draf", tone: "neutral" as const },
          { label: "Diproses AI", value: `${materials.filter(mat => mat.aiProcessed).length + processedIds.size}`, detail: "Dari total materi", tone: "success" as const },
          { label: "Soal diekstrak", value: materials.reduce((s, mat) => s + mat.questionsGenerated, 0).toString(), detail: "Siap digunakan", tone: "primary" as const },
          { label: "Menunggu proses", value: `${Math.max(0, materials.filter(mat => !mat.aiProcessed && mat.status !== "Draf").length - processedIds.size)}`, detail: "Dalam antrean", tone: "warning" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[14px] font-bold text-ink">Daftar Materi ({materials.length})</h2>
          <button className="flex items-center gap-1.5 rounded-[6px] border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-ink-secondary hover:text-ink transition-colors">
            <Filter className="h-3 w-3" />Filter
          </button>
        </div>
        <div className="p-4 space-y-3">
          {materials.map(mat => (
            <MaterialCard key={mat.id} title={mat.title} type={mat.type} subject={mat.subject ?? ""} pages={mat.pages}
              uploadedAt={mat.uploadedAt} status={mat.status}
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
                    { label: "Tipe Dokumen", value: m.type },
                    { label: "Jumlah Halaman", value: `${m.pages} halaman` },
                    { label: "Tanggal Unggah", value: m.uploadedAt },
                    { label: "Diunggah oleh", value: currentTeacher.name },
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
                        ? `${m.questionsGenerated || "~48"} soal berhasil diekstrak dari materi ini`
                        : isDialogProcessing
                        ? "AI sedang menganalisis materi, harap tunggu..."
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
                  : <Button variant="outline" className="h-8 text-[12px]"><Download className="mr-1.5 h-3.5 w-3.5" />Unduh</Button>
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
          <Button variant="default" className="h-8 text-[12px]">
            <Upload className="mr-1.5 h-3.5 w-3.5" />Unggah Paket Soal
          </Button>
        }
      />

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
                          <div key={i} className="flex-1 flex items-end">
                            <div className="w-full rounded-t-sm bg-primary transition-all" style={{ height: `${(f / 8) * 100}%` }} />
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

function TeacherQuestionBank() {
  const [search, setSearch] = useState("");
  const filtered = questionBank.filter(q =>
    search === "" || q.question.toLowerCase().includes(search.toLowerCase()) || q.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bank Soal"
        title="Bank Soal Terkurasi"
        description="Soal yang telah disetujui. AI mengekstrak dari materi dan mempelajari gaya asesmen."
        actions={
          <Button variant="default" className="h-8 text-[12px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah Manual
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total soal", value: `${questionBank.length}`, detail: "Semua status", tone: "neutral" as const },
          { label: "Disetujui", value: `${questionBank.filter(q => q.status === "Disetujui").length}`, detail: "Siap digunakan", tone: "success" as const },
          { label: "Perlu tinjauan", value: `${pendingQuestions.filter(q => q.status === "Perlu Ditinjau").length}`, detail: "Menunggu guru", tone: "warning" as const },
          { label: "Rata-rata SR", value: `${Math.round(questionBank.reduce((s, q) => s + q.successRate, 0) / questionBank.length)}%`, detail: "Tingkat sukses", tone: "primary" as const },
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

      <div className="space-y-3">
        {filtered.map(q => <QuestionBankRow key={q.id} entry={q} />)}
        {filtered.length === 0 && <EmptyState icon={Database} title="Tidak ada soal ditemukan" description="Coba kata kunci lain." />}
      </div>
    </div>
  );
}

// ── Teacher Question Review ───────────────────────────────────────────────────

function TeacherQuestionReview() {
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" | "danger" } | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<PendingQuestion>>>({});

  const pending = pendingQuestions.filter(q => !reviewed.has(q.id));
  const editingQ = pendingQuestions.find(q => q.id === editingId);
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
                onApprove={() => { setReviewed(prev => new Set([...prev, q.id])); setToast({ message: "Soal disetujui", tone: "success" }); }}
                onReject={() => { setReviewed(prev => new Set([...prev, q.id])); setToast({ message: "Soal ditolak", tone: "danger" }); }}
                onEdit={() => setEditingId(q.id)} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={CheckCircle2} title="Semua soal sudah ditinjau"
          description="Tidak ada soal menunggu persetujuan. Unggah materi baru untuk soal lebih banyak."
          action={<Button variant="default" className="text-[13px]"><Upload className="mr-2 h-4 w-4" />Unggah Materi</Button>} />
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
        onConfirm={() => {
          setConfirmApproveAll(false);
          setReviewed(new Set(pendingQuestions.map(q => q.id)));
          setToast({ message: `${pending.length} soal disetujui dan masuk ke bank soal`, tone: "success" });
        }}
        onCancel={() => setConfirmApproveAll(false)}
      />

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Assessment Builder ────────────────────────────────────────────────

function TeacherAssessmentBuilder() {
  const [step, setStep] = useState(1);
  const steps = ["Info Dasar", "Materi & Soal", "Jadwal & Publikasi"];
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmSaveDraft, setConfirmSaveDraft] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "primary" | "danger" } | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  function toggleMaterial(id: string) {
    setSelectedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setAiGenerated(false);
  }

  function generateAI() {
    if (selectedMaterials.size === 0) return;
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      setAiGenerated(true);
    }, 2200);
  }

  function toggleQuestion(id: string) {
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
          {[
            { label: "Judul Asesmen *", ph: "Kuis Fungsi Kuadrat – Pertemuan 8" },
            { label: "Tipe Asesmen *", ph: "Kuis Guru, UTS, UAS, Tes Diagnostik..." },
            { label: "Mata Pelajaran *", ph: "Matematika XI" },
            { label: "Kelas *", ph: "XI IPA 2" },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">{f.label}</label>
              <input type="text" placeholder={f.ph}
                className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] placeholder:text-ink-tertiary focus:border-primary focus:outline-none" />
            </div>
          ))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Jumlah Soal</label>
              <input type="number" defaultValue={20} className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Durasi (menit)</label>
              <input type="number" defaultValue={45} className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="default" className="h-8 text-[12px]" onClick={() => setStep(2)}>Lanjut →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
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
                  : `${selectedMaterials.size} materi dipilih · estimasi ~${selectedMaterials.size * 15} soal`}
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
                  <h3 className="text-[13px] font-bold text-ink">
                    {questionBank.length} soal berhasil dibuat AI
                  </h3>
                </div>
                <Badge tone="primary">{selectedQuestions.size} dipilih</Badge>
              </div>
              <div className="p-4 space-y-2">
                {questionBank.slice(0, 6).map(q => (
                  <div key={q.id}
                    onClick={() => toggleQuestion(q.id)}
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
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" className="h-8 text-[12px]" onClick={() => setStep(1)}>← Kembali</Button>
            <Button variant="default" className="h-8 text-[12px]"
              disabled={!aiGenerated || selectedQuestions.size === 0}
              onClick={() => setStep(3)}>
              Lanjut dengan {selectedQuestions.size} soal →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-card border border-border bg-surface shadow-sm p-6 space-y-5 max-w-2xl">
          <div>
            <label className="block text-[11px] font-semibold text-ink-secondary mb-1.5">Tanggal & Waktu *</label>
            <input type="datetime-local" className="w-full rounded-[8px] border border-border bg-background px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
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
        onConfirm={() => {
          setConfirmPublish(false);
          setToast({ message: "Asesmen berhasil dipublikasikan", tone: "success" });
          setStep(1);
        }}
        onCancel={() => setConfirmPublish(false)}
      />

      <ConfirmDialog
        open={confirmSaveDraft}
        title="Simpan sebagai Draf?"
        message="Asesmen disimpan sebagai draf dan belum dapat diakses siswa. Kamu dapat melanjutkan kapan saja."
        confirmLabel="Simpan Draf"
        confirmVariant="default"
        onConfirm={() => {
          setConfirmSaveDraft(false);
          setToast({ message: "Draf tersimpan", tone: "primary" });
        }}
        onCancel={() => setConfirmSaveDraft(false)}
      />

      {toast && <AppToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Teacher Results ───────────────────────────────────────────────────────────

function TeacherResults() {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = assessments.find(a => a.id === detailId);

  const mockScoreDist = [2, 5, 8, 12, 9, 6, 3];
  const mockScoreLabels = ["40–49", "50–59", "60–69", "70–79", "80–89", "90–95", "96–100"];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Hasil Asesmen" title="Riwayat Asesmen" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Asesmen selesai", value: `${assessments.filter(a => a.status === "Selesai").length}`, detail: "Semester ini", tone: "primary" as const },
          { label: "Rata-rata terbaik", value: "82", detail: "Kuis Fungsi Kuadrat", tone: "success" as const },
          { label: "Partisipasi rata-rata", value: "97%", detail: "Dari total siswa", tone: "neutral" as const },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="space-y-3">
        {assessments.map(a => (
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
                  { label: "Peserta", value: `${detail.participants ?? "—"}`, icon: <Users className="h-4 w-4 text-primary" /> },
                  { label: "Rata-rata", value: detail.avgScore ? `${detail.avgScore}` : "—", icon: <CheckCircle2 className="h-4 w-4 text-success" /> },
                  { label: "Status", value: detail.status, icon: <Eye className="h-4 w-4 text-ink-secondary" /> },
                ].map(k => (
                  <div key={k.label} className="rounded-[10px] border border-border bg-background p-3">
                    <div className="flex items-center gap-1.5 mb-1">{k.icon}<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">{k.label}</span></div>
                    <div className="text-[20px] font-bold text-ink tabular-nums">{k.value}</div>
                  </div>
                ))}
              </div>

              {detail.avgScore && (
                <>
                  {/* Score distribution */}
                  <div className="rounded-[10px] border border-border bg-background p-4">
                    <h3 className="text-[12px] font-bold text-ink mb-3">Distribusi Nilai</h3>
                    <div className="flex items-end gap-1 h-16">
                      {mockScoreDist.map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full rounded-t-sm bg-primary/60 transition-all" style={{ height: `${(v / 12) * 100}%` }} />
                          <div className="text-[8px] text-ink-tertiary">{mockScoreLabels[i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top performers */}
                  <div>
                    <h3 className="text-[12px] font-bold text-ink mb-2">Performa Siswa Terbaik</h3>
                    <div className="space-y-2">
                      {students.slice(0, 4).map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-[8px] border border-border bg-background px-3 py-2">
                          <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                            i === 0 ? "bg-warning" : i === 1 ? "bg-ink-secondary" : "bg-background border border-border text-ink"
                          )}>{i + 1}</div>
                          <div className="flex-1 text-[12px] font-medium text-ink">{s.name}</div>
                          <div className="text-[13px] font-bold text-success tabular-nums">{85 + (4 - i) * 3}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {detail.status === "Terjadwal" && (
                <AlertPanel tone="primary" title="Asesmen belum dimulai">
                  Asesmen akan tersedia sesuai jadwal pada {detail.scheduledFor}.
                </AlertPanel>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
              <Button variant="outline" className="h-8 text-[12px]" onClick={() => setDetailId(null)}>Tutup</Button>
              {detail.avgScore && (
                <Button variant="default" className="h-8 text-[12px]">
                  <Download className="mr-1.5 h-3.5 w-3.5" />Ekspor Hasil
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher Analytics ─────────────────────────────────────────────────────────

function TeacherAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analitik Kelas" title="Analitik XI IPA 2" description="Performa kelas berdasarkan data asesmen semester ini." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {teacherAnalyticsStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Tren Nilai Kelas</h3>
          <p className="text-[12px] text-ink-secondary mb-4">Rata-rata per asesmen</p>
          <SimpleChart data={[72, 68, 74, 76, 80, 82, 76]} labels={["Sep", "Okt", "Okt", "Nov", "Nov", "Nov", "UTS"]} height={120} />
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Distribusi Nilai</h3>
          <p className="text-[12px] text-ink-secondary mb-4">UTS Matematika XI</p>
          <SimpleChart data={scoreDistribution} labels={scoreDistributionLabels} type="bar" height={100} />
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-bold text-ink">Akurasi per Topik</h3>
            <p className="text-[12px] text-ink-secondary mt-0.5">Rata-rata kelas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {topicAccuracy.map(t => <TopicBar key={t.label} label={t.label} value={t.value} />)}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-[14px] font-bold text-ink">Performa Siswa</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.slice(0, 6).map(s => <StudentPerformanceCard key={s.id} student={s} />)}
        </div>
      </div>
    </div>
  );
}

// ── Teacher Recommendations ───────────────────────────────────────────────────

function TeacherRecommendations() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rekomendasi AI" title="Rekomendasi Tindakan Guru"
        description="Berdasarkan analisis hasil asesmen kelas, AI merekomendasikan intervensi berikut." />
      <AIInsightPanel title="Ringkasan AI">
        <p>
          <strong className="text-ink">2 topik kritis</strong> perlu remedial minggu ini.{" "}
          <strong className="text-danger">Diskriminan</strong> dan{" "}
          <strong className="text-danger">Rumus Vieta</strong> memiliki akurasi di bawah 50%,
          memengaruhi ~{Math.round(classStats.total * 0.55)} siswa. Total waktu remedial: <strong className="text-ink">35 menit</strong>.
        </p>
      </AIInsightPanel>
      <div className="space-y-4">
        {teachingRecommendations.map(r => <RecommendationCard key={r.id} rec={r} />)}
      </div>
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
    <AppShell role="student" nav={studentNav}>
      {screens[page] ?? <StudentDashboard />}
    </AppShell>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────

function StudentDashboard() {
  return (
    <div className="space-y-6">
      <CatchMeUpCard
        studentName={studentProfile.name}
        weakTopics={weakTopics.slice(0, 2).map(t => t.topic)}
        nextAction="Kamu masih lemah di Diskriminan (38%) dan Rumus Vieta (42%). Latihan 15 menit hari ini bisa langsung meningkatkan pemahamanmu!"
        onStart={() => {}}
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
            <SimpleChart data={scoreTrend} labels={scoreTrendLabels} height={90} />
          </div>

          <div className="rounded-card border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h3 className="text-[14px] font-bold text-ink">Hasil Asesmen Terbaru</h3>
              <Link href="/student/review" className="text-[12px] font-semibold text-primary hover:underline">Lihat semua</Link>
            </div>
            <div className="px-5 py-1">
              {studentResults.map(r => (
                <RecentAssessmentRow key={r.id} title={r.assessmentTitle} type={r.type} date={r.date}
                  score={r.score} classAvg={r.classAvg} rank={r.rank} />
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-ink mb-3">Asesmen Mendatang</h3>
            <div className="space-y-2.5">
              {assessments.filter(a => a.status === "Terjadwal").slice(0, 2).map(a => (
                <UpcomingCard key={a.id} title={a.title} type={a.type} date={a.scheduledFor} duration={a.duration} questions={a.totalQuestions} />
              ))}
            </div>
          </div>
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

function StudentSimulator({ page, onPageChange }: { page: string; onPageChange: (p: string) => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [focusWarning, setFocusWarning] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const finishedRef = React.useRef(finished);
  finishedRef.current = finished;

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  // On exam start: fullscreen + restore session
  React.useEffect(() => {
    if (page !== "exam") return;
    enterFullscreen();
    try {
      const saved = localStorage.getItem("catchup_exam_session");
      if (saved) {
        const s = JSON.parse(saved) as { answers?: Record<number, string>; current?: number; timeLeft?: number };
        if (s.answers) setAnswers(s.answers);
        if (typeof s.current === "number") setCurrent(s.current);
        if (typeof s.timeLeft === "number") setTimeLeft(s.timeLeft);
      }
    } catch {}
    return () => { exitFullscreen(); };
  }, [page]);

  // Persist session to localStorage
  React.useEffect(() => {
    if (page !== "exam") return;
    try { localStorage.setItem("catchup_exam_session", JSON.stringify({ answers, current, timeLeft })); } catch {}
  }, [answers, current, timeLeft, page]);

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

  // KIOSK: Detect tab switching / window focus loss
  React.useEffect(() => {
    if (page !== "exam") return;
    function onVisibilityChange() {
      if (document.hidden && !finishedRef.current) setFocusWarning(true);
    }
    function onBlur() {
      if (!finishedRef.current) setFocusWarning(true);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [page]);

  // KIOSK: Detect fullscreen exit (browser UI exit)
  React.useEffect(() => {
    if (page !== "exam") return;
    function onFsChange() {
      if (!document.fullscreenElement && !finishedRef.current) setFullscreenWarning(true);
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

  // Countdown timer
  React.useEffect(() => {
    if (finished || page !== "exam") return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setFinished(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, page]);

  // ── Pick screen ──
  if (page === "pick") {
    return (
      <AppShell role="student" nav={studentNav}>
        <div className="space-y-6">
          <PageHeader eyebrow="Simulasi Ujian" title="Pilih Asesmen"
            description="Pilih asesmen yang ingin disimulasikan. Ujian akan berjalan dalam mode kiosk layar penuh." />
          <AlertPanel tone="primary" title="Mode Ujian Aman aktif">
            Selama ujian berlangsung, layar penuh wajib dipertahankan. Tab/jendela lain tidak dapat diakses.
          </AlertPanel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.filter(a => a.status === "Terjadwal").map(a => (
              <div key={a.id} role="button" tabIndex={0}
                onClick={() => onPageChange("exam")}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPageChange("exam"); } }}
                className="rounded-card border border-border bg-surface p-5 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft">
                    <FileQuestion className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-ink">{a.title}</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5">{a.type} · {a.totalQuestions} soal · {a.duration} mnt</div>
                    <div className="mt-2"><Badge tone="neutral">{a.scheduledFor}</Badge></div>
                  </div>
                </div>
              </div>
            ))}
            <div role="button" tabIndex={0}
              onClick={() => onPageChange("exam")}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPageChange("exam"); } }}
              className="rounded-card border border-dashed border-primary/30 bg-primary-soft p-5 cursor-pointer flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-primary">Latihan Topik Lemah</div>
                <div className="text-[11px] text-primary/70 mt-0.5">Dibuat AI · Disesuaikan untuk kamu</div>
              </div>
            </div>
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
            <p className="text-[14px] text-ink-secondary mt-1">Hasil sedang diproses AI...</p>
          </div>
          <ScoreCircle score={Math.round((Object.keys(answers).length / simulatorQuestions.length) * 100)} size={96} />
          <Button variant="default" onClick={() => { onPageChange("pick"); setFinished(false); setCurrent(0); setAnswers({}); setTimeLeft(45 * 60); }}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  const total = simulatorQuestions.length;
  const currentQ = simulatorQuestions[current];
  const currentOpts = [currentQ.optionA, currentQ.optionB, currentQ.optionC, currentQ.optionD, currentQ.optionE];
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
            <div className="text-[13px] font-bold text-ink truncate">Tes Diagnostik Fisika</div>
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
            {["A", "B", "C", "D", "E"].map((opt, i) => {
              const sel = answers[current] === opt;
              return (
                <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [current]: opt }))}
                  className={cn("flex items-center gap-3 rounded-[10px] border p-3.5 sm:p-4 text-left transition-all",
                    sel ? "border-primary/40 bg-primary-soft" : "border-border bg-surface hover:border-primary/20 hover:bg-background"
                  )}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                    sel ? "bg-primary text-white" : "bg-background border border-border text-ink-secondary"
                  )}>{opt}</span>
                  <span className="text-[13px] font-medium text-ink">{currentOpts[i]}</span>
                </button>
              );
            })}
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

      {/* KIOSK: Fullscreen exit warning */}
      {fullscreenWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/70 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-card border border-warning/40 bg-surface p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
                <Maximize2 className="h-5 w-5 text-warning" />
              </div>
              <h2 className="text-[15px] font-bold text-ink">Layar Penuh Dinonaktifkan</h2>
            </div>
            <p className="text-[13px] text-ink-secondary leading-relaxed mb-5">
              Ujian harus berjalan dalam mode layar penuh. Kembali ke layar penuh untuk melanjutkan.
            </p>
            <Button variant="default" className="w-full" onClick={() => { setFullscreenWarning(false); enterFullscreen(); }}>
              <Maximize2 className="mr-2 h-4 w-4" />Kembali ke Layar Penuh
            </Button>
          </div>
        </div>
      )}

      {/* KIOSK: Focus/tab-switch warning */}
      {focusWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/70 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-card border border-danger/40 bg-surface p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <AlertCircle className="h-5 w-5 text-danger" />
              </div>
              <h2 className="text-[15px] font-bold text-ink">Peringatan Keamanan</h2>
            </div>
            <p className="text-[13px] text-ink-secondary leading-relaxed mb-5">
              Kamu terdeteksi berpindah tab atau aplikasi lain. Tindakan ini tercatat. Kembali ke ujian sekarang.
            </p>
            <Button variant="danger" className="w-full" onClick={() => { setFocusWarning(false); window.focus(); }}>
              Kembali ke Ujian
            </Button>
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      <ConfirmDialog
        open={confirmSubmit}
        title="Selesaikan Asesmen?"
        message={`Kamu telah menjawab ${answeredCount} dari ${total} soal. ${total - answeredCount > 0 ? `${total - answeredCount} soal belum dijawab. ` : ""}Setelah disubmit, jawaban tidak dapat diubah.`}
        confirmLabel="Selesaikan & Submit"
        confirmVariant="success"
        onConfirm={() => {
          setConfirmSubmit(false);
          try { localStorage.removeItem("catchup_exam_session"); } catch {}
          exitFullscreen();
          setFinished(true);
        }}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}

// ── Student Adaptive ──────────────────────────────────────────────────────────

function StudentAdaptive() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Latihan Adaptif" title="Latihan Disesuaikan AI"
        description="AI memilih soal berdasarkan kelemahanmu dan menyesuaikan tingkat kesulitan secara real-time." />
      <CatchMeUpCard studentName={studentProfile.name}
        weakTopics={weakTopics.slice(0, 2).map(t => t.topic)}
        nextAction="Latihan hari ini fokus pada Diskriminan — 10 soal pilihan AI."
        onStart={() => {}} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {weakTopics.slice(0, 3).map(t => (
          <div key={t.id} className="rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="text-[13px] font-semibold text-ink">{t.topic}</div>
                <div className="text-[11px] text-ink-secondary">{t.questionsAttempted} soal dicoba</div>
              </div>
              <MasteryBadge level={t.mastery} />
            </div>
            <TopicBar label="Akurasi" value={t.accuracyRate} />
            <Button variant="default" className="w-full mt-3 h-7 text-[11px]">
              <Zap className="mr-1.5 h-3 w-3" />Latihan Sekarang
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Student Review ────────────────────────────────────────────────────────────

function StudentReview() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Review" title="Riwayat Asesmen" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {studentProgressStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-[14px] font-bold text-ink">Semua Asesmen</h3>
        </div>
        <div className="px-5 py-1">
          {studentResults.map(r => (
            <RecentAssessmentRow key={r.id} title={r.assessmentTitle} type={r.type} date={r.date}
              score={r.score} classAvg={r.classAvg} rank={r.rank} />
          ))}
        </div>
      </div>
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
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Soal Salah" title="Soal yang Perlu Dipelajari Ulang"
        description="Pelajari kembali soal yang salah dan pahami pembahasan." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incorrectQuestions.map(q => <IncorrectQuestionCard key={q.id} q={q} />)}
      </div>
    </div>
  );
}

// ── Student Tutor ─────────────────────────────────────────────────────────────

function StudentTutor() {
  const [messages, setMessages] = useState<ChatMessage[]>([assistantGreeting]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: "Baru saja" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const reply = getAssistantReply(text);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: reply.content, sources: reply.sources, grounded: reply.grounded, timestamp: "Baru saja",
      }]);
      setIsTyping(false);
    }, 900);
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-4">
      <PageHeader eyebrow="AI Companion" title="Tanya AI Companion"
        description="Bertanya tentang materi pelajaran. AI hanya menjawab berdasarkan materi yang diunggah guru." />
      <GroundingNotice />
      <div role="log" aria-label="Riwayat percakapan" aria-live="polite"
        className="flex-1 overflow-y-auto space-y-4 rounded-card border border-border bg-surface p-5 shadow-sm">
        {messages.map(m => <ChatBubble key={m.id} message={m} grounded={m.grounded !== false} />)}
        {isTyping && <TypingIndicator />}
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
          placeholder="Tanyakan tentang materi matematika..."
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
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progres Belajar" title="Perjalanan Belajarmu" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {studentProgressStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 lg:col-span-2 rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-1">Tren Nilai</h3>
          <p className="text-[12px] text-ink-secondary mb-4">September hingga sekarang</p>
          <SimpleChart data={scoreTrend} labels={scoreTrendLabels} height={100} />
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Penguasaan Materi</h3>
          <div className="space-y-3">
            {subjectMastery.map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Achievements ──────────────────────────────────────────────────────

function StudentAchievements() {
  const earned = achievements.filter(a => a.earned);
  const notEarned = achievements.filter(a => !a.earned);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Pencapaian" title="Koleksi Pencapaian" />

      <div className="rounded-card border border-border bg-gradient-hero text-white p-6">
        <div className="flex items-center gap-6">
          {[
            { val: studentProfile.xp, label: "Total XP" },
            { val: earned.length, label: "Pencapaian" },
            { val: `#${studentProfile.rank}`, label: "Peringkat Kelas" },
            { val: `🔥 ${studentProfile.streak}`, label: "Hari Streak" },
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
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary mb-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="text-2xl font-bold text-ink">Portal Orang Tua</h1>
        <p className="text-[13px] text-ink-secondary mt-1">Pantau perkembangan belajar Andi Pratama · XI IPA 2</p>
      </div>

      <div className="rounded-card border border-border bg-gradient-hero text-white p-6">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-[18px] font-bold">AP</div>
          <div className="flex-1">
            <div className="text-[18px] font-bold">Andi Pratama</div>
            <div className="text-[12px] text-blue-200">XI IPA 2 · SMA Negeri 1 Bandung · Peringkat #{studentProfile.rank}</div>
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
            <h3 className="text-[14px] font-bold text-ink mb-4">Tren Nilai Andi</h3>
            <SimpleChart data={scoreTrend} labels={scoreTrendLabels} height={90} />
          </div>
        </div>
        <div className="space-y-4">
          <AIInsightPanel title="Pesan dari Bu Ratna (AI)">
            <p className="mb-2">Andi menunjukkan perkembangan positif di Fungsi Kuadrat. Namun, <strong className="text-ink">Diskriminan</strong> masih memerlukan latihan tambahan.</p>
            <p>Mohon dorong Andi untuk latihan adaptif 15 menit setiap hari.</p>
          </AIInsightPanel>
          <div className="rounded-card border border-border bg-surface shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-ink mb-3">Topik Perlu Perhatian</h3>
            <div className="space-y-3">
              {weakTopics.slice(0, 3).map(t => <TopicBar key={t.id} label={t.topic} value={t.accuracyRate} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentProgress() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Progres Andi" title="Perkembangan Belajar Andi" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {studentProgressStats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Tren Nilai</h3>
          <SimpleChart data={scoreTrend} labels={scoreTrendLabels} height={100} />
        </div>
        <div className="rounded-card border border-border bg-surface shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-ink mb-4">Penguasaan Topik</h3>
          <div className="space-y-3">
            {subjectMastery.map(s => <TopicBar key={s.label} label={s.label} value={s.value} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentAssessments() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Riwayat Asesmen" title="Asesmen Andi" />
      <div className="rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5"><h3 className="text-[14px] font-bold text-ink">Semua Asesmen</h3></div>
        <div className="px-5 py-1">
          {studentResults.map(r => (
            <RecentAssessmentRow key={r.id} title={r.assessmentTitle} type={r.type} date={r.date}
              score={r.score} classAvg={r.classAvg} rank={r.rank} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ParentRecommendations() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rekomendasi Guru" title="Saran dari Bu Ratna"
        description="Rekomendasi belajar untuk Andi berdasarkan analisis AI dan penilaian guru." />
      <AIInsightPanel title="Ringkasan AI untuk Orang Tua">
        <p>Andi berkembang baik (peringkat #{studentProfile.rank} dari {students.length} siswa). Fokus minggu ini adalah <strong className="text-ink">Diskriminan</strong> dan <strong className="text-ink">Rumus Vieta</strong>.</p>
      </AIInsightPanel>
      <div className="space-y-4">
        {teachingRecommendations.slice(0, 2).map(r => <RecommendationCard key={r.id} rec={r} />)}
      </div>
    </div>
  );
}

function ParentNotificationsPage() {
  const items = [
    { id: "pn1", title: "Hasil Kuis Fungsi Kuadrat", description: "Andi mendapat nilai 87 — di atas rata-rata kelas (82). Peringkat ke-4.", time: "1 jam lalu", read: false, tone: "success" as const },
    { id: "pn2", title: "Topik yang perlu perhatian", description: "Andi masih kesulitan di Diskriminan (38%). Bu Ratna menyarankan latihan tambahan.", time: "3 jam lalu", read: false, tone: "warning" as const },
    { id: "pn3", title: "Asesmen baru dijadwalkan", description: "Tes Diagnostik Fisika pada 28 November 2025 pukul 13.00 WIB.", time: "Kemarin", read: true, tone: "neutral" as const },
    { id: "pn4", title: "Streak belajar 7 hari", description: "Andi telah belajar konsisten 7 hari berturut-turut!", time: "3 hari lalu", read: true, tone: "success" as const },
  ];
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Notifikasi" title="Notifikasi" />
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        {items.map(n => <NotificationItem key={n.id} notification={n} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

function AdminApp({ page }: { page: string }) {
  const screens: Record<string, React.ReactNode> = {
    dashboard: <AdminDashboard />,
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
        <h1 className="text-2xl font-bold text-ink">Dasbor SMA Negeri 1 Bandung</h1>
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
