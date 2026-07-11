"use client";

import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  Info,
  Lock,
  LucideIcon,
  Minus,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AppNotification,
  BloomLevel,
  ChatMessage,
  ConfidenceDiagnosis,
  Difficulty,
  IncorrectQuestion,
  MasteryLevel,
  masteryTone,
  WeakTopic,
  AssessmentStyleCorpus,
  QuestionBankEntry,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Page Header ───────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 pb-2">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-2 text-[13px] leading-6 text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  icon?: LucideIcon;
}) {
  const iconStyle = {
    primary: "bg-primary/8 text-primary",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
    danger: "bg-danger-light text-danger",
    neutral: "bg-background text-ink-secondary"
  }[tone];

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          {label}
        </p>
        {Icon && (
          <div className={cn("rounded-[6px] p-1.5", iconStyle)}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-2.5 text-[30px] font-bold leading-none tracking-tight text-ink">
        {value}
      </div>
      <p className="mt-2 text-[12px] leading-5 text-ink-secondary">{detail}</p>
    </div>
  );
}

// ─── Topic Bar (accuracy visualization) ───────────────────────────────────────

export function TopicBar({ label, value }: { label: string; value: number }) {
  const isWeak = value < 50;
  const isMedium = value >= 50 && value < 70;
  const barColor = isWeak ? "bg-danger" : isMedium ? "bg-warning" : "bg-success";
  const textColor = isWeak ? "text-danger" : isMedium ? "text-warning" : "text-success";

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-44 shrink-0 items-center gap-1.5">
        {isWeak && <AlertTriangle className="h-3 w-3 shrink-0 text-danger" aria-hidden="true" />}
        <span className={cn("truncate text-[13px]", isWeak ? "font-medium text-ink" : "text-ink-secondary")}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums", textColor)}>
        {value}%
      </span>
    </div>
  );
}

// ─── Concept Bar (generic topic progress bar) ──────────────────────────────────

export function ConceptBar({
  label,
  value,
  tone = "primary"
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-ink">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums text-ink-secondary">{value}%</span>
      </div>
      <Progress value={value} tone={tone} />
    </div>
  );
}

// ─── Mastery Badge ─────────────────────────────────────────────────────────────

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  return <Badge tone={masteryTone[level]}>{level}</Badge>;
}

// ─── Difficulty Badge ──────────────────────────────────────────────────────────

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone = difficulty === "Mudah" ? "success" : difficulty === "Sedang" ? "warning" : "danger";
  return <Badge tone={tone}>{difficulty}</Badge>;
}

// ─── Bloom Badge ───────────────────────────────────────────────────────────────

const bloomOrder: BloomLevel[] = ["Mengingat", "Memahami", "Menerapkan", "Menganalisis", "Mengevaluasi", "Mencipta"];

export function BloomBadge({ level }: { level: BloomLevel }) {
  const idx = bloomOrder.indexOf(level);
  const tone = idx <= 1 ? "success" : idx <= 3 ? "warning" : "danger";
  return <Badge tone={tone}>{level}</Badge>;
}

// ─── Confidence Diagnosis Badge ────────────────────────────────────────────────

const confidenceConfig: Record<ConfidenceDiagnosis, { label: string; tone: "danger" | "warning" | "primary" | "success" }> = {
  Misconception: { label: "Miskonsepsi", tone: "danger" },
  "Knowledge Gap": { label: "Belum Paham", tone: "warning" },
  "Needs Reinforcement": { label: "Perlu Latihan", tone: "primary" },
  Mastery: { label: "Mahir", tone: "success" },
};

export function ConfidenceBadge({ diagnosis }: { diagnosis: ConfidenceDiagnosis }) {
  const cfg = confidenceConfig[diagnosis];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

// ─── Simple Chart ──────────────────────────────────────────────────────────────

export function SimpleChart({
  title,
  values,
  labels,
  badge
}: {
  title: string;
  values: number[];
  labels?: string[];
  badge?: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta = last - prev;

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">{title}</p>
          <div className="mt-1.5 text-[30px] font-bold leading-none tracking-tight text-ink">{last}</div>
          {delta !== 0 && (
            <div className={cn("mt-1 flex items-center gap-1 text-[12px] font-semibold", delta > 0 ? "text-success" : "text-danger")}>
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? `+${delta}` : delta} dari sebelumnya
            </div>
          )}
        </div>
        {badge && (
          <Badge tone="neutral">{badge}</Badge>
        )}
      </div>
      <div className="mt-6 flex h-24 items-end gap-1 rounded-[8px] bg-background px-3 pb-3 pt-2">
        {values.map((value, index) => {
          const heightPct = ((value - min) / range) * 75 + 25;
          const isLast = index === values.length - 1;
          return (
            <div key={`bar-${index}`} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full rounded-sm transition-all",
                  isLast ? "bg-primary rounded-t-[3px]" : "bg-primary/15"
                )}
                style={{ height: `${heightPct}%` }}
              />
              {labels?.[index] && (
                <span className="text-[9px] font-medium text-ink-tertiary">{labels[index]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface p-8 text-center">
      <div className="mb-3 rounded-full bg-background p-3 text-ink-tertiary">
        <FileQuestion className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-ink-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Material Card ─────────────────────────────────────────────────────────────

export function MaterialCard({
  title,
  type,
  pages,
  uploadedAt,
  status
}: {
  title: string;
  type: string;
  pages: number;
  uploadedAt: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-4 py-3.5 transition hover:border-border/80 hover:shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-primary/8 text-primary">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-ink">{title}</span>
          <Badge tone={status === "Aktif" ? "success" : "neutral"}>{status}</Badge>
        </div>
        <div className="mt-0.5 text-[12px] text-ink-secondary">
          {type} · {pages} hal. · Diunggah {uploadedAt}
        </div>
      </div>
    </div>
  );
}

// ─── Assessment Style Card ─────────────────────────────────────────────────────

export function AssessmentStyleCard({ corpus }: { corpus: AssessmentStyleCorpus }) {
  const styleColor = {
    TKA: "bg-danger-light text-danger",
    "Ujian Sekolah": "bg-warning-light text-warning",
    UTS: "bg-primary-soft text-primary-dark",
    UAS: "bg-primary-soft text-primary-dark",
    Tryout: "bg-success-light text-success",
    Kuis: "bg-background text-ink-secondary",
  }[corpus.styleType];

  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-4 py-3.5">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold", styleColor)}>
        {corpus.styleType === "TKA" ? "TKA" : corpus.styleType === "Tryout" ? "TO" : corpus.styleType}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-ink">{corpus.name}</span>
          <Badge tone={corpus.status === "Aktif" ? "success" : "neutral"}>{corpus.status}</Badge>
        </div>
        <div className="mt-0.5 text-[12px] text-ink-secondary">
          {corpus.subject} · {corpus.papersCount} paket · {corpus.questionsCount} soal · {corpus.year}
        </div>
      </div>
    </div>
  );
}

// ─── Question Bank Row ─────────────────────────────────────────────────────────

export function QuestionBankRow({
  entry,
  onToggleLock
}: {
  entry: QuestionBankEntry;
  onToggleLock?: (id: string) => void;
}) {
  const successRateColor = entry.successRate >= 70 ? "text-success" : entry.successRate >= 50 ? "text-warning" : "text-danger";

  return (
    <tr className="group border-b border-border last:border-0 transition hover:bg-background">
      <td className="px-4 py-3">
        <div className="max-w-sm">
          <p className="line-clamp-2 text-[13px] text-ink">{entry.question}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink-tertiary">{entry.source}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-[12px] font-medium text-ink">{entry.topic}</div>
        <div className="text-[11px] text-ink-tertiary">{entry.subtopic}</div>
      </td>
      <td className="px-4 py-3">
        <BloomBadge level={entry.bloom} />
      </td>
      <td className="px-4 py-3">
        <DifficultyBadge difficulty={entry.difficulty} />
      </td>
      <td className="px-4 py-3">
        <Badge tone="neutral">{entry.styleType}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className={cn("text-[13px] font-semibold tabular-nums", successRateColor)}>
          {entry.successRate}%
        </div>
        <div className="text-[11px] text-ink-tertiary">{entry.usageCount}× dipakai</div>
      </td>
      <td className="px-4 py-3">
        <Badge tone={entry.status === "Disetujui" ? "success" : entry.status === "Ditolak" ? "danger" : "warning"}>
          {entry.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {entry.isLocked && <Lock className="h-3.5 w-3.5 text-ink-tertiary" />}
          {onToggleLock && (
            <button
              type="button"
              onClick={() => onToggleLock(entry.id)}
              className="text-[12px] font-semibold text-primary opacity-0 transition hover:underline group-hover:opacity-100"
            >
              {entry.isLocked ? "Buka" : "Kunci"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Question Review Card ──────────────────────────────────────────────────────

export function QuestionReviewCard({
  question,
  onApprove,
  onReject
}: {
  question: {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: "A" | "B" | "C" | "D";
    explanation: string;
    topic: string;
    difficulty: Difficulty;
    sourceRef: string;
    status: string;
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const options = [
    { key: "A" as const, text: question.optionA },
    { key: "B" as const, text: question.optionB },
    { key: "C" as const, text: question.optionC },
    { key: "D" as const, text: question.optionD }
  ];

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={question.difficulty} />
        <Badge tone="neutral">{question.topic}</Badge>
        <div className="flex items-center gap-1 text-[11px] text-ink-tertiary">
          <FileText className="h-3 w-3" />
          {question.sourceRef}
        </div>
      </div>
      <p className="text-[14px] font-medium text-ink">{question.question}</p>
      <div className="mt-4 space-y-2">
        {options.map(({ key, text }) => (
          <div
            key={key}
            className={cn(
              "flex items-center gap-3 rounded-[6px] border px-3 py-2.5 text-[13px]",
              key === question.correctAnswer
                ? "border-success-border bg-success-light text-ink font-medium"
                : "border-border bg-background text-ink-secondary"
            )}
          >
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold",
              key === question.correctAnswer ? "bg-success text-white" : "bg-border text-ink-secondary"
            )}>{key}</span>
            {text}
            {key === question.correctAnswer && (
              <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-[6px] bg-background px-3 py-2.5 text-[12px] leading-5 text-ink-secondary">
        <span className="font-semibold text-ink">Pembahasan: </span>
        {question.explanation}
      </div>
      {(onApprove || onReject) && (
        <div className="mt-4 flex gap-2">
          {onApprove && (
            <Button size="sm" onClick={() => onApprove(question.id)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Setujui
            </Button>
          )}
          {onReject && (
            <Button size="sm" variant="outline" onClick={() => onReject(question.id)}>
              Tolak
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Weak Topic Row ────────────────────────────────────────────────────────────

export function WeakTopicRow({ topic }: { topic: WeakTopic }) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{topic.topic}</span>
          <MasteryBadge level={topic.mastery} />
        </div>
        <div className="mt-0.5 text-[12px] text-ink-secondary">
          {topic.subject} · {topic.questionsAttempted} soal · Terakhir {topic.lastPracticed}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-[20px] font-bold tabular-nums",
          topic.accuracyRate < 50 ? "text-danger" : topic.accuracyRate < 70 ? "text-warning" : "text-success"
        )}>
          {topic.accuracyRate}%
        </div>
        <div className="text-[10px] text-ink-tertiary">akurasi</div>
      </div>
    </div>
  );
}

// ─── Incorrect Question Card ───────────────────────────────────────────────────

export function IncorrectQuestionCard({ item }: { item: IncorrectQuestion }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={item.difficulty} />
        <Badge tone="neutral">{item.topic}</Badge>
        {item.confidenceDiagnosis && <ConfidenceBadge diagnosis={item.confidenceDiagnosis} />}
        <span className="text-[11px] text-ink-tertiary">{item.assessmentTitle} · {item.date}</span>
      </div>
      <p className="text-[14px] font-medium text-ink">{item.question}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[6px] border border-danger-border bg-danger-light p-2.5">
          <div className="text-[11px] font-semibold text-danger">Jawabanmu</div>
          <div className="mt-0.5 text-[13px] text-ink">{item.yourAnswer}</div>
        </div>
        <div className="rounded-[6px] border border-success-border bg-success-light p-2.5">
          <div className="text-[11px] font-semibold text-success">Jawaban benar</div>
          <div className="mt-0.5 text-[13px] text-ink">{item.correctAnswer}</div>
        </div>
      </div>
      <div className="mt-3 rounded-[6px] bg-background px-3 py-2.5 text-[12px] leading-5 text-ink-secondary">
        <span className="font-semibold text-ink">Pembahasan: </span>
        {item.explanation}
      </div>
    </div>
  );
}

// ─── Student Performance Card ──────────────────────────────────────────────────

export function StudentPerformanceCard({
  subject,
  mastery,
  score,
  trend
}: {
  subject: string;
  mastery: MasteryLevel;
  score: number;
  trend: "naik" | "turun" | "stabil";
}) {
  const TrendIcon = trend === "naik" ? TrendingUp : trend === "turun" ? TrendingDown : Minus;
  const trendColor = trend === "naik" ? "text-success" : trend === "turun" ? "text-danger" : "text-ink-secondary";
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{subject}</span>
          <MasteryBadge level={mastery} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-[18px] font-bold tabular-nums text-ink">{score}</span>
        <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── Recommendation Card ───────────────────────────────────────────────────────

export function RecommendationCard({
  title,
  description,
  action = "Terapkan rekomendasi"
}: {
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <div className="rounded-card border border-primary/20 bg-primary-soft p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-primary/15">
          <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          Rekomendasi AI
        </span>
      </div>
      <h3 className="text-[15px] font-bold leading-snug text-ink">{title}</h3>
      <p className="mt-2 text-[13px] leading-6 text-ink-secondary">{description}</p>
      <Button className="mt-4" size="sm" variant="secondary">
        {action}
      </Button>
    </div>
  );
}

// ─── Alert Panel ───────────────────────────────────────────────────────────────

export function AlertPanel({
  title,
  description,
  tone = "warning"
}: {
  title: string;
  description: string;
  tone?: "warning" | "danger" | "primary";
}) {
  const styles = {
    warning: "border-warning-border bg-warning-light",
    danger: "border-danger-border bg-danger-light",
    primary: "border-primary/20 bg-primary-soft",
  }[tone];
  const Icon = tone === "danger" ? AlertCircle : tone === "primary" ? Info : AlertTriangle;
  const iconColor = tone === "danger" ? "text-danger" : tone === "primary" ? "text-primary" : "text-warning";

  return (
    <div className={cn("rounded-card border p-4", styles)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} aria-hidden="true" />
        <div>
          <div className="text-[13px] font-semibold text-ink">{title}</div>
          <p className="mt-0.5 text-[12px] leading-5 text-ink-secondary">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Grounding Notice ──────────────────────────────────────────────────────────

export function GroundingNotice() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-ink-secondary">
      <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      Hanya dari materi yang disetujui guru
    </div>
  );
}

// ─── Source Chips ──────────────────────────────────────────────────────────────

export function SourceChips({ sources }: { sources: string[] }) {
  return (
    <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Sumber referensi">
      {sources.map((source) => (
        <li
          key={source}
          className="flex items-center gap-1 rounded-[4px] border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-secondary"
        >
          <FileText className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
          {source}
        </li>
      ))}
    </ul>
  );
}

// ─── Chat Bubble ───────────────────────────────────────────────────────────────

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-card px-4 py-3 text-[13px] leading-6",
          isUser
            ? "bg-primary text-white"
            : message.grounded === false
            ? "border border-warning-border bg-warning-light text-ink"
            : "border border-border bg-surface text-ink shadow-sm"
        )}
      >
        <span className="sr-only">{isUser ? "Kamu: " : "AI: "}</span>
        {!isUser && message.grounded === false ? (
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
            <span>{message.content}</span>
          </div>
        ) : (
          message.content
        )}
        {message.sources?.length ? <SourceChips sources={message.sources} /> : null}
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ──────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5" role="status">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      </div>
      <span className="sr-only">AI sedang mengetik...</span>
      <div
        className="flex items-center gap-1.5 rounded-card border border-border bg-surface px-4 py-3 shadow-sm"
        aria-hidden="true"
      >
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-1.5 w-1.5 rounded-full bg-ink-secondary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Notification Item ─────────────────────────────────────────────────────────

const dotColor: Record<AppNotification["tone"], string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink-tertiary"
};

export function NotificationItem({ notification }: { notification: AppNotification }) {
  return (
    <div className={cn(
      "flex gap-3 border-b border-border px-4 py-3 last:border-0 transition hover:bg-background",
      !notification.read && "bg-primary/[0.02]"
    )}>
      <span
        className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          notification.read ? "bg-transparent" : dotColor[notification.tone]
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn("text-[13px] text-ink", !notification.read && "font-semibold")}>
            {notification.title}
          </span>
          <span className="shrink-0 text-[11px] text-ink-tertiary">{notification.time}</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-5 text-ink-secondary">{notification.description}</p>
      </div>
    </div>
  );
}

// ─── Suggested Prompt Button ───────────────────────────────────────────────────

export function SuggestedPromptButton({
  prompt,
  onSelect
}: {
  prompt: string;
  onSelect: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(prompt)}
      className="rounded-[6px] border border-border bg-surface px-3 py-2 text-left text-[12px] font-medium text-ink-secondary transition hover:border-primary/30 hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      {prompt}
    </button>
  );
}

// ─── Loading Panel ─────────────────────────────────────────────────────────────

export function LoadingPanel() {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-primary/8">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-ink">AI sedang memproses materi</div>
          <p className="text-[12px] text-ink-secondary">Soal dapat diedit sebelum disetujui.</p>
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full w-[68%] rounded-full bg-primary transition-all" />
        </div>
        <div className="text-[11px] font-medium text-ink-secondary">68% selesai</div>
      </div>
    </div>
  );
}

// ─── Score Circle ──────────────────────────────────────────────────────────────

export function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("text-[56px] font-bold leading-none tracking-tight", color)}>{score}</div>
      <div className="text-[12px] text-ink-secondary">dari 100</div>
    </div>
  );
}
