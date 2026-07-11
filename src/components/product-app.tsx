"use client";

import { useState } from "react";
import {
  ChevronRight,
  GraduationCap,
  Lock,
  Plus,
  School,
  Search,
  Settings2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/product-shell";
import {
  AlertPanel,
  AssessmentStyleCard,
  ChatBubble,
  ConfidenceBadge,
  ConceptBar,
  EmptyState,
  GroundingNotice,
  IncorrectQuestionCard,
  LoadingPanel,
  MasteryBadge,
  MaterialCard,
  PageHeader,
  QuestionBankRow,
  QuestionReviewCard,
  RecommendationCard,
  ScoreCircle,
  SimpleChart,
  StatCard,
  SuggestedPromptButton,
  TopicBar,
  TypingIndicator,
  WeakTopicRow,
} from "@/components/product-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  achievements,
  adminStats,
  aiStyleOptions,
  assessmentStyles,
  assessments,
  assistantGreeting,
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
  subjectMastery,
  suggestedPrompts,
  teacherAnalyticsStats,
  teacherNav,
  teachingRecommendations,
  topicAccuracy,
  weakTopics,
  studentNav,
  parentNav,
  adminNav,
  ChatMessage,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Top-level Route Dispatcher ───────────────────────────────────────────────

export function ProductApp({ path }: { path: string[] }) {
  const [role = "teacher", page = "dashboard"] = path;

  if (role === "student") return <StudentApp page={page} />;
  if (role === "parent")  return <ParentApp page={page} />;
  if (role === "admin")   return <AdminApp page={page} />;
  return <TeacherApp page={page} />;
}

// ─── Role App Dispatchers ──────────────────────────────────────────────────────

export function TeacherApp({ page }: { page: string }) {
  const inner = (() => {
    switch (page) {
      case "dashboard":         return <TeacherDashboard />;
      case "materials":         return <TeacherMaterials />;
      case "assessment-styles": return <TeacherAssessmentStyles />;
      case "question-bank":     return <TeacherQuestionBank />;
      case "question-review":   return <TeacherQuestionReview />;
      case "assessment-builder":return <TeacherAssessmentBuilder />;
      case "results":           return <TeacherResults />;
      case "analytics":         return <TeacherAnalytics />;
      case "recommendations":   return <TeacherRecommendations />;
      case "ai-config":
      case "ai-style":          return <TeacherAIConfig />;
      default:                  return <TeacherDashboard />;
    }
  })();
  return <AppShell role="teacher" nav={teacherNav}>{inner}</AppShell>;
}

export function StudentApp({ page }: { page: string }) {
  const inner = (() => {
    switch (page) {
      case "dashboard":    return <StudentDashboard />;
      case "simulator":    return <StudentSimulator />;
      case "adaptive":     return <StudentAdaptive />;
      case "review":       return <StudentReview />;
      case "weak-topics":  return <StudentWeakTopics />;
      case "incorrect":    return <StudentIncorrect />;
      case "tutor":        return <StudentTutor />;
      case "progress":     return <StudentProgress />;
      case "achievements": return <StudentAchievements />;
      default:             return <StudentDashboard />;
    }
  })();
  return <AppShell role="student" nav={studentNav}>{inner}</AppShell>;
}

export function ParentApp({ page }: { page: string }) {
  const inner = (() => {
    switch (page) {
      case "dashboard":       return <ParentDashboard />;
      case "progress":        return <ParentProgress />;
      case "assessments":     return <ParentAssessments />;
      case "recommendations": return <ParentRecommendations />;
      default:                return <ParentDashboard />;
    }
  })();
  return <AppShell role="parent" nav={parentNav}>{inner}</AppShell>;
}

export function AdminApp({ page }: { page: string }) {
  return <AppShell role="admin" nav={adminNav}><AdminDashboard /></AppShell>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEACHER SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

function TeacherDashboard() {
  const pendingCount = pendingQuestions.filter(q => q.status === "Perlu Ditinjau").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dasbor Guru"
        title="Selamat pagi, Bu Ratna"
        description="Ringkasan kelas dan tindakan yang menunggu. Terakhir diperbarui hari ini."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Buat Asesmen
          </Button>
        }
      />

      {pendingCount > 0 && (
        <AlertPanel
          tone="warning"
          title={`${pendingCount} soal AI menunggu tinjauan Anda`}
          description="AI menghasilkan soal baru dari Modul Fungsi Kuadrat. Tinjau sebelum diterbitkan ke siswa."
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {teacherAnalyticsStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail={s.detail} tone={s.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <SectionHeader title="Akurasi per Topik" subtitle="Kelas XI IPA 2 · UTS Matematika" />
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-3.5">
            {topicAccuracy.map(t => <TopicBar key={t.label} label={t.label} value={t.value} />)}
          </div>
          <RecommendationCard
            title="Fokuskan review pada Diskriminan dan Rumus Vieta"
            description="58% siswa gagal di topik Diskriminan, dan 14 siswa masih membalik tanda pada Rumus Vieta. Disarankan mengadakan sesi ulang 20 menit sebelum UAS."
          />
        </div>

        <div className="space-y-4">
          <SectionHeader title="Asesmen Mendatang" />
          <div className="space-y-2">
            {assessments.filter(a => a.status !== "Selesai").map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink truncate">{a.title}</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">{a.scheduledFor} · {a.totalQuestions} soal · {a.duration} mnt</div>
                </div>
                <Badge tone={a.status === "Berlangsung" ? "danger" : "primary"}>{a.status}</Badge>
              </div>
            ))}
          </div>

          <SectionHeader title="Distribusi Nilai (UTS)" />
          <SimpleChart
            title="Distribusi Nilai"
            values={scoreDistribution}
            labels={scoreDistributionLabels}
            badge="32 siswa"
          />
        </div>
      </div>
    </div>
  );
}

function TeacherMaterials() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Konten"
        title="Pustaka Materi"
        description="Dokumen yang diunggah menjadi basis pengetahuan AI untuk menghasilkan soal dan menjawab pertanyaan siswa."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Unggah Materi
          </Button>
        }
      />
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-tertiary" />
            <Input placeholder="Cari materi..." className="pl-9 h-8 text-[13px]" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {materials.map(m => (
            <div key={m.id} className="px-5 py-1">
              <MaterialCard
                title={m.title}
                type={m.type}
                pages={m.pages}
                uploadedAt={m.uploadedAt}
                status={m.status}
              />
            </div>
          ))}
        </div>
      </div>
      <LoadingPanel />
    </div>
  );
}

function TeacherAssessmentStyles() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Konten"
        title="Gaya Asesmen"
        description="Unggah soal-soal TKA, UTS, UAS, dan tryout masa lalu. AI mempelajari pola soal untuk menghasilkan soal bergaya serupa."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Tambah Korpus
          </Button>
        }
      />
      <AlertPanel
        tone="primary"
        title="Dua korpus terpisah, satu output berkualitas"
        description="Pengetahuan diambil dari Pustaka Materi. Gaya soal diambil dari korpus ini. AI menggabungkan keduanya saat membuat soal."
      />
      <div className="space-y-3">
        {assessmentStyles.map(s => <AssessmentStyleCard key={s.id} corpus={s} />)}
      </div>
      <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-semibold text-ink mb-4">Frekuensi Topik di Soal Masa Lalu</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                {["Topik", "2022–23", "2023–24", "2024–25", "Tren"].map(h => (
                  <th key={h} className="pb-2 text-left font-semibold text-ink-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pastPaperTopics.map(t => (
                <tr key={t.topic} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-medium text-ink">{t.topic}</td>
                  <td className="py-2.5 text-ink-secondary tabular-nums">{t.frequency2023}×</td>
                  <td className="py-2.5 text-ink-secondary tabular-nums">{t.frequency2024}×</td>
                  <td className="py-2.5 font-semibold text-ink tabular-nums">{t.frequency2025}×</td>
                  <td className="py-2.5">
                    <Badge tone={t.trend === "naik" ? "danger" : "neutral"}>
                      {t.trend === "naik" ? "↑ Naik" : "→ Stabil"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherQuestionBank() {
  const [search, setSearch] = useState("");
  const filtered = questionBank.filter(q =>
    q.question.toLowerCase().includes(search.toLowerCase()) ||
    q.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Soal"
        title="Bank Soal"
        description="Semua soal yang disetujui, beserta statistik penggunaan dan akurasi. Soal terkunci tidak dapat diubah AI."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">Ekspor</Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Tambah Manual
            </Button>
          </div>
        }
      />
      <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-tertiary" />
            <Input
              placeholder="Cari soal atau topik..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-[13px]"
            />
          </div>
          <span className="text-[12px] text-ink-secondary">{filtered.length} soal</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-background">
              <tr>
                {["Soal", "Topik", "Bloom", "Kesulitan", "Gaya", "Statistik", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => <QuestionBankRow key={entry.id} entry={entry} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeacherQuestionReview() {
  const [questions, setQuestions] = useState(pendingQuestions);
  const pending = questions.filter(q => q.status === "Perlu Ditinjau");

  const handleApprove = (id: string) =>
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, status: "Disetujui" as const } : q));
  const handleReject = (id: string) =>
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, status: "Ditolak" as const } : q));

  const approved = questions.filter(q => q.status === "Disetujui").length;
  const rejected = questions.filter(q => q.status === "Ditolak").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Soal"
        title="Tinjau Soal AI"
        description="Semua soal yang dihasilkan AI wajib ditinjau sebelum masuk Bank Soal. Anda dapat mengedit sebelum menyetujui."
      />
      <div className="flex items-center gap-3">
        <Badge tone="warning">{pending.length} perlu ditinjau</Badge>
        <Badge tone="success">{approved} disetujui</Badge>
        <Badge tone="danger">{rejected} ditolak</Badge>
      </div>
      {pending.length === 0 ? (
        <EmptyState
          title="Semua soal sudah ditinjau"
          description="Tidak ada soal baru dari AI. Unggah materi baru atau minta AI membuat soal dari topik tertentu untuk mengisi antrian."
        />
      ) : (
        <div className="space-y-4">
          {pending.map(q => (
            <QuestionReviewCard key={q.id} question={q} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeacherAssessmentBuilder() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asesmen"
        title="Buat Asesmen"
        description="Pilih soal dari Bank Soal atau minta AI membuat paket soal berdasarkan topik, kesulitan, dan gaya asesmen."
        actions={<Button size="sm" disabled>Terbitkan Asesmen</Button>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <div className="text-[13px] font-semibold text-ink mb-4">Detail Asesmen</div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Judul Asesmen</label>
                <Input placeholder="e.g. UTS Matematika XI – Semester 2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Tipe</label>
                  <select className="w-full h-9 rounded-[6px] border border-border bg-surface px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {["UTS", "UAS", "Kuis Guru", "Tes Diagnostik", "Tryout"].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Durasi (menit)</label>
                  <Input type="number" placeholder="90" defaultValue={90} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13px] font-semibold text-ink">Generate Soal dengan AI</div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                AI aktif
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Topik</label>
                <select className="w-full h-9 rounded-[6px] border border-border bg-surface px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {["Fungsi Kuadrat", "Persamaan Kuadrat", "Diskriminan", "Rumus Vieta", "Transformasi Grafik"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Kesulitan</label>
                <select className="w-full h-9 rounded-[6px] border border-border bg-surface px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {["Campuran", "Mudah", "Sedang", "Sulit"].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">Jumlah Soal</label>
                <Input type="number" placeholder="10" defaultValue={10} />
              </div>
            </div>
            <Button size="sm">
              <Sparkles className="h-3.5 w-3.5" />
              Generate Soal
            </Button>
          </div>

          <EmptyState
            title="Belum ada soal dipilih"
            description="Generate soal dengan AI atau pilih manual dari Bank Soal."
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="text-[13px] font-semibold text-ink mb-3">Distribusi Soal</div>
            <div className="space-y-2 text-[12px] text-ink-secondary">
              {[["Total soal", "0"], ["Mudah", "0"], ["Sedang", "0"], ["Sulit", "0"]].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-semibold text-ink tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="text-[13px] font-semibold text-ink mb-3">Jadwal Terbit</div>
            <Input type="date" className="text-[13px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherResults() {
  const finished = assessments.filter(a => a.status === "Selesai");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asesmen"
        title="Hasil Asesmen"
        description="Lihat skor, distribusi nilai, dan performa per siswa untuk setiap asesmen yang telah selesai."
      />
      <div className="space-y-3">
        {finished.map(a => (
          <div key={a.id} className="flex items-center gap-5 rounded-card border border-border bg-surface px-5 py-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] font-bold text-ink">{a.title}</span>
                <Badge tone="success">Selesai</Badge>
              </div>
              <div className="text-[12px] text-ink-secondary">
                {a.type} · {a.subject} · {a.scheduledFor} · {a.totalQuestions} soal
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[28px] font-bold text-ink tabular-nums">{a.avgScore}</div>
              <div className="text-[10px] text-ink-tertiary">rata-rata</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[20px] font-bold text-ink tabular-nums">{a.participants}</div>
              <div className="text-[10px] text-ink-tertiary">siswa</div>
            </div>
            <Button size="sm" variant="outline">
              Detail
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {finished.length > 0 && (
        <SimpleChart
          title="Distribusi Nilai"
          values={scoreDistribution}
          labels={scoreDistributionLabels}
          badge={`${finished[0].participants} siswa`}
        />
      )}
    </div>
  );
}

function TeacherAnalytics() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analitik"
        title="Analitik Kelas"
        description="Data performa kelas XI IPA 2 berdasarkan semua asesmen semester ini."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {teacherAnalyticsStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail={s.detail} tone={s.tone} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-3.5">
          <div className="text-[13px] font-semibold text-ink">Akurasi per Topik</div>
          {topicAccuracy.map(t => <TopicBar key={t.label} label={t.label} value={t.value} />)}
        </div>
        <SimpleChart
          title="Distribusi Nilai"
          values={scoreDistribution}
          labels={scoreDistributionLabels}
          badge="32 siswa"
        />
      </div>
    </div>
  );
}

function TeacherRecommendations() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analitik"
        title="Rekomendasi Pengajaran"
        description="Disusun oleh AI berdasarkan pola kesalahan siswa di seluruh asesmen. Diperbarui setelah setiap asesmen selesai."
      />
      <div className="space-y-4">
        {teachingRecommendations.map(rec => (
          <div key={rec.id} className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[15px] font-bold text-ink">{rec.topic}</span>
                  <Badge tone={rec.priority === "Tinggi" ? "danger" : rec.priority === "Sedang" ? "warning" : "neutral"}>
                    Prioritas {rec.priority}
                  </Badge>
                </div>
                <p className="text-[13px] text-ink-secondary">{rec.issue}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[22px] font-bold text-ink tabular-nums">{rec.affectedStudents}</div>
                <div className="text-[10px] text-ink-tertiary">siswa terdampak</div>
              </div>
            </div>
            <div className="rounded-[6px] bg-primary-soft border border-primary/15 p-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">Saran AI</span>
              </div>
              <p className="text-[13px] text-ink">{rec.suggestion}</p>
              <div className="mt-2 text-[11px] text-ink-secondary">Estimasi waktu: {rec.estimatedTime}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherAIConfig() {
  const [styles, setStyles] = useState(aiStyleOptions);
  const activate = (id: string) => setStyles(prev => prev.map(s => ({ ...s, active: s.id === id })));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistem"
        title="Konfigurasi AI"
        description="Sesuaikan bagaimana AI Companion berinteraksi dengan siswa. Perubahan berlaku untuk semua sesi berikutnya."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Gaya Interaksi AI</div>
          {styles.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => activate(s.id)}
              className={cn(
                "w-full rounded-card border p-5 text-left transition",
                s.active
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-surface hover:bg-background"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-[14px] font-bold", s.active ? "text-primary-dark" : "text-ink")}>{s.label}</span>
                {s.active && <Badge tone="primary">Aktif</Badge>}
              </div>
              <p className={cn("text-[13px] leading-5 mb-3", s.active ? "text-primary-dark/80" : "text-ink-secondary")}>
                {s.description}
              </p>
              <div className="rounded-[6px] bg-background border border-border px-3 py-2.5 text-[12px] italic text-ink-secondary">
                {s.example}
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Batasan Konten</div>
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-4">
            <ToggleRow label="Hanya jawab berdasarkan materi yang diunggah" description="AI tidak akan menjawab topik di luar Pustaka Materi" defaultChecked />
            <div className="h-px bg-border" />
            <ToggleRow label="Tampilkan referensi halaman" description="Setiap jawaban menyertakan sumber bab dan halaman" defaultChecked />
            <div className="h-px bg-border" />
            <ToggleRow label="Blokir jawaban langsung (mode Socratic)" description="AI memandu dengan pertanyaan, tidak memberi jawaban final" defaultChecked={false} />
          </div>

          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Pembuatan Soal</div>
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-4">
            <ToggleRow label="Deteksi duplikat otomatis" description="Soal yang mirip dengan Bank Soal akan ditandai" defaultChecked />
            <div className="h-px bg-border" />
            <ToggleRow label="Wajib tinjauan guru sebelum publikasi" description="Tidak ada soal AI yang langsung terbit tanpa persetujuan" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

function StudentDashboard() {
  const sp = studentProfile;
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-8">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">Ruang Belajar</p>
          <h1 className="text-[22px] font-bold leading-tight text-ink">Halo, {sp.name}!</h1>
          <p className="mt-2 text-[13px] text-ink-secondary">{sp.class} · {sp.school}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-card border border-border bg-surface px-4 py-3 text-center shadow-sm">
            <div className="text-[22px] font-bold text-ink tabular-nums">#{sp.rank}</div>
            <div className="text-[10px] text-ink-tertiary">Peringkat kelas</div>
          </div>
          <div className="rounded-card border border-border bg-surface px-4 py-3 text-center shadow-sm">
            <div className="text-[22px] font-bold text-primary tabular-nums">{sp.xp}</div>
            <div className="text-[10px] text-ink-tertiary">XP total</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {studentProgressStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail={s.detail} tone={s.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <SectionHeader title="Penguasaan Materi" subtitle="Berdasarkan semua asesmen" />
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm space-y-3.5">
            {subjectMastery.map(s => <ConceptBar key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
          </div>

          <SectionHeader title="Topik yang Perlu Dilatih" />
          <div className="space-y-2">
            {weakTopics.slice(0, 2).map(t => <WeakTopicRow key={t.id} topic={t} />)}
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Leaderboard Kelas" />
          <div className="rounded-card border border-border bg-surface shadow-sm overflow-hidden">
            {leaderboard.map(entry => (
              <div key={entry.rank} className={cn(
                "flex items-center gap-3 border-b border-border px-4 py-3 last:border-0",
                entry.isCurrentUser && "bg-primary-soft"
              )}>
                <span className={cn("w-5 text-[13px] font-bold tabular-nums text-center",
                  entry.rank <= 3 ? "text-warning" : "text-ink-tertiary"
                )}>{entry.rank}</span>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {entry.initials}
                </div>
                <span className={cn("flex-1 text-[13px] font-medium",
                  entry.isCurrentUser ? "text-primary-dark font-semibold" : "text-ink"
                )}>
                  {entry.name} {entry.isCurrentUser && "(Kamu)"}
                </span>
                <span className="text-[13px] font-bold tabular-nums text-ink">{entry.score}</span>
              </div>
            ))}
          </div>

          <SectionHeader title="Hasil Asesmen Terbaru" />
          <div className="space-y-2">
            {studentResults.slice(0, 2).map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-ink truncate">{r.assessmentTitle}</div>
                  <div className="text-[11px] text-ink-secondary mt-0.5">{r.date}</div>
                </div>
                <div className={cn("text-[20px] font-bold tabular-nums",
                  r.score >= 80 ? "text-success" : r.score >= 60 ? "text-warning" : "text-danger"
                )}>{r.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentSimulator() {
  const sessions = [
    { label: "Simulasi TKA Matematika", questions: 40, duration: 90, type: "TKA" },
    { label: "Latihan UTS", questions: 20, duration: 45, type: "UTS" },
    { label: "Kuis Cepat Diskriminan", questions: 10, duration: 15, type: "Kuis Guru" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Latihan"
        title="Simulasi Ujian"
        description="Latihan ujian penuh dengan kondisi menyerupai ujian sesungguhnya."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sessions.map(s => (
          <div key={s.label} className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <Badge tone="neutral" className="mb-3">{s.type}</Badge>
            <div className="text-[15px] font-bold text-ink mb-1">{s.label}</div>
            <div className="text-[12px] text-ink-secondary mb-4">{s.questions} soal · {s.duration} menit</div>
            <Button size="sm" variant="outline" className="w-full">Mulai</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentAdaptive() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Latihan"
        title="Latihan Adaptif"
        description="AI menyesuaikan topik dan kesulitan soal berdasarkan performa terbaru kamu."
      />
      <AlertPanel
        tone="primary"
        title="Rekomendasi sesi hari ini"
        description="Berdasarkan hasil asesmen terbaru, latih Diskriminan (38% akurasi) dan Rumus Vieta (42% akurasi)."
      />
      <div className="space-y-3">
        {weakTopics.map(t => (
          <div key={t.id} className="flex items-center gap-4 rounded-card border border-border bg-surface px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] font-bold text-ink">{t.topic}</span>
                <MasteryBadge level={t.mastery} />
              </div>
              <p className="text-[12px] text-ink-secondary">{t.recommendedAction}</p>
            </div>
            <div className={cn("shrink-0 text-[22px] font-bold tabular-nums mr-4",
              t.accuracyRate < 50 ? "text-danger" : t.accuracyRate < 70 ? "text-warning" : "text-success"
            )}>{t.accuracyRate}%</div>
            <Button size="sm">Mulai</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentReview() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Review Asesmen"
        description="Tinjau hasil dan pembahasan semua asesmen yang sudah dikerjakan."
      />
      <div className="space-y-3">
        {studentResults.map(r => (
          <div key={r.id} className="flex items-center gap-5 rounded-card border border-border bg-surface px-5 py-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[14px] font-bold text-ink">{r.assessmentTitle}</span>
                <Badge tone="neutral">{r.type}</Badge>
              </div>
              <div className="text-[12px] text-ink-secondary">{r.date} · {r.correct} benar · {r.wrong} salah · {r.duration} mnt</div>
            </div>
            {r.rank && (
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-semibold text-ink">#{r.rank}</div>
                <div className="text-[10px] text-ink-tertiary">peringkat</div>
              </div>
            )}
            <ScoreCircle score={r.score} />
            <Button size="sm" variant="outline">
              Review
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentWeakTopics() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Topik Lemah"
        description="Topik-topik yang akurasi kamu masih di bawah target. Latih secara rutin untuk meningkatkan penguasaan."
      />
      <div className="space-y-3">
        {weakTopics.map(t => <WeakTopicRow key={t.id} topic={t} />)}
      </div>
    </div>
  );
}

function StudentIncorrect() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Soal yang Salah"
        description="Semua soal yang pernah kamu jawab salah, lengkap dengan diagnosis dan pembahasan."
      />
      <div className="flex flex-wrap items-center gap-2">
        {(["Misconception", "Knowledge Gap", "Needs Reinforcement"] as const).map(d => (
          <ConfidenceBadge key={d} diagnosis={d} />
        ))}
        <span className="text-[11px] text-ink-secondary">· {incorrectQuestions.length} soal</span>
      </div>
      <div className="space-y-4">
        {incorrectQuestions.map(q => <IncorrectQuestionCard key={q.id} item={q} />)}
      </div>
    </div>
  );
}

function StudentTutor() {
  const [messages, setMessages] = useState<ChatMessage[]>([assistantGreeting]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const send = (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply = getAssistantReply(text);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "assistant", ...reply }]);
      setTyping(false);
    }, 900);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center justify-between pb-4">
        <PageHeader eyebrow="Belajar" title="AI Companion" />
        <GroundingNotice />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        {typing && <TypingIndicator />}
      </div>
      <div className="shrink-0 pt-4 border-t border-border space-y-3">
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.slice(0, 3).map(p => (
            <SuggestedPromptButton key={p} prompt={p} onSelect={send} />
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tanya tentang materi..."
            className="flex-1 h-10"
          />
          <Button type="submit" size="sm" disabled={!input.trim() || typing}>Kirim</Button>
        </form>
      </div>
    </div>
  );
}

function StudentProgress() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Belajar" title="Progres Belajar" description="Rekap perjalanan belajarmu dari waktu ke waktu." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {studentProgressStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail={s.detail} tone={s.tone} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SimpleChart title="Tren Nilai" values={scoreTrend} labels={scoreTrendLabels} badge="7 minggu terakhir" />
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-3.5">
          <div className="text-[13px] font-semibold text-ink">Penguasaan per Topik</div>
          {subjectMastery.map(s => <ConceptBar key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
        </div>
      </div>
    </div>
  );
}

function StudentAchievements() {
  const earned = achievements.filter(a => a.earned);
  const pending = achievements.filter(a => !a.earned);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Belajar"
        title="Pencapaian"
        description="Raih badge dan XP dengan belajar konsisten, meningkatkan nilai, dan menguasai topik baru."
      />
      <div className="flex items-center gap-4">
        {[
          { label: "Total XP", value: studentProfile.xp, color: "text-primary" },
          { label: "Badge diraih", value: earned.length, color: "text-success" },
          { label: "Hari streak", value: studentProfile.streak, color: "text-warning" },
        ].map(s => (
          <div key={s.label} className="rounded-card border border-border bg-surface px-5 py-4 shadow-sm text-center">
            <div className={cn("text-[28px] font-bold tabular-nums", s.color)}>{s.value}</div>
            <div className="text-[11px] text-ink-tertiary mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-secondary mb-3">Diraih</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {earned.map(a => (
            <div key={a.id} className="rounded-card border border-success-border bg-success-light p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-success text-white">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">{a.title}</div>
                  <div className="text-[11px] text-ink-secondary">{a.earnedAt}</div>
                </div>
              </div>
              <p className="text-[12px] text-ink-secondary mb-2">{a.description}</p>
              <Badge tone="success">+{a.xp} XP</Badge>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-secondary mb-3">Belum Diraih</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map(a => (
            <div key={a.id} className="rounded-card border border-border bg-surface p-4 opacity-60">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-background border border-border">
                  <Lock className="h-4 w-4 text-ink-tertiary" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">{a.title}</div>
                  <div className="text-[11px] text-ink-tertiary">Belum diraih</div>
                </div>
              </div>
              <p className="text-[12px] text-ink-secondary mb-2">{a.description}</p>
              <Badge tone="neutral">+{a.xp} XP</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

function ParentDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portal Orang Tua"
        title="Progres Andi Pratama"
        description="XI IPA 2 · SMA Negeri 1 Bandung"
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {studentProgressStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail={s.detail} tone={s.tone} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-3.5">
          <div className="text-[13px] font-semibold text-ink">Penguasaan per Topik</div>
          {subjectMastery.map(s => <ConceptBar key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
        </div>
        <SimpleChart title="Tren Nilai" values={scoreTrend} labels={scoreTrendLabels} badge="7 minggu terakhir" />
      </div>
      <AlertPanel
        tone="warning"
        title="2 topik perlu perhatian"
        description="Andi masih kesulitan di Diskriminan (38%) dan Rumus Vieta (42%). Guru menyarankan latihan tambahan."
      />
    </div>
  );
}

function ParentProgress() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portal Orang Tua" title="Riwayat Progres" />
      <SimpleChart title="Tren Nilai" values={scoreTrend} labels={scoreTrendLabels} badge="7 minggu" />
      <div className="rounded-card border border-border bg-surface p-6 shadow-sm space-y-3.5">
        {subjectMastery.map(s => <ConceptBar key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
      </div>
    </div>
  );
}

function ParentAssessments() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portal Orang Tua" title="Riwayat Asesmen" />
      <div className="space-y-3">
        {studentResults.map(r => (
          <div key={r.id} className="flex items-center gap-4 rounded-card border border-border bg-surface px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink truncate">{r.assessmentTitle}</div>
              <div className="text-[12px] text-ink-secondary mt-0.5">{r.date} · {r.correct}/{r.totalQuestions} benar</div>
            </div>
            <ScoreCircle score={r.score} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ParentRecommendations() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portal Orang Tua" title="Rekomendasi Guru" />
      <div className="space-y-4">
        {teachingRecommendations.map(rec => (
          <div key={rec.id} className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-bold text-ink">{rec.topic}</span>
              <Badge tone={rec.priority === "Tinggi" ? "danger" : "warning"}>Prioritas {rec.priority}</Badge>
            </div>
            <p className="text-[13px] text-ink-secondary mb-3">{rec.issue}</p>
            <div className="rounded-[6px] bg-primary-soft border border-primary/15 px-3 py-2.5 text-[13px] text-ink">
              {rec.suggestion}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

function AdminDashboard() {
  const cards = [
    { label: "Sekolah", description: "Kelola data sekolah, kelas, dan kurikulum.", icon: School, tone: "primary" as const, action: "Kelola Sekolah" },
    { label: "Guru & Siswa", description: "Undang guru baru dan atur akun siswa.", icon: GraduationCap, tone: "success" as const, action: "Kelola Pengguna" },
    { label: "Pengaturan", description: "Konfigurasi platform dan integrasi.", icon: Settings2, tone: "warning" as const, action: "Buka Pengaturan" },
  ];
  const toneStyle = {
    primary: "bg-primary/8 text-primary",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Sekolah"
        title="Dasbor Administrasi"
        description="Ringkasan penggunaan platform di SMA Negeri 1 Bandung."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {adminStats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} detail="" tone={s.tone as "primary" | "success" | "warning" | "neutral"} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-card border border-border bg-surface p-5 shadow-sm">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-[8px] mb-3", toneStyle[c.tone])}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-[16px] font-bold text-ink mb-1">{c.label}</div>
              <div className="text-[13px] text-ink-secondary mb-4">{c.description}</div>
              <Button size="sm" variant="outline">{c.action}</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED MICRO-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[14px] font-bold text-ink">{title}</span>
      {subtitle && <span className="text-[12px] text-ink-secondary">{subtitle}</span>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  defaultChecked
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        <div className="text-[11px] text-ink-secondary mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}
