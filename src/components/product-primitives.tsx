"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  FileText,
  Info,
  Lock,
  LucideIcon,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  QuestionBankEntry,
  Student,
  StudentStatus,
  TeachingRecommendation,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Page Header ────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 pb-1">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-1.5 text-[13px] leading-6 text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  icon?: LucideIcon;
  trend?: "up" | "down" | "flat";
}) {
  const iconStyle = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
    danger: "bg-danger-light text-danger",
    neutral: "bg-background text-ink-secondary",
  }[tone];

  const valueColor = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-ink",
  }[tone];

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-secondary leading-tight">
          {label}
        </p>
        {Icon && (
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]", iconStyle)}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className={cn("text-[28px] font-bold leading-none tabular-nums mb-2", valueColor)}>{value}</div>
      <div className="flex items-center gap-1.5">
        {trend === "up" && <TrendingUp className="h-3 w-3 text-success" />}
        {trend === "down" && <TrendingDown className="h-3 w-3 text-danger" />}
        <p className="text-[11px] text-ink-secondary leading-tight">{detail}</p>
      </div>
    </div>
  );
}

// ─── Status KPI Row (Teacher Dashboard Hero) ─────────────────────────────────

export function StatusKPIRow({
  onTrack,
  needReview,
  atRisk,
  total,
  className,
}: {
  onTrack: number;
  needReview: number;
  atRisk: number;
  total: number;
  className?: string;
}) {
  const pctOnTrack = Math.round((onTrack / total) * 100);
  const pctNeedReview = Math.round((needReview / total) * 100);
  const pctAtRisk = Math.round((atRisk / total) * 100);

  return (
    <div className={cn("rounded-card border border-border bg-surface p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary">
            Kondisi Kelas
          </p>
          <p className="text-[13px] font-semibold text-ink mt-0.5">XI IPA 2 · {total} siswa</p>
        </div>
        <div className="text-[11px] font-medium text-ink-secondary">Diperbarui hari ini</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Menguasai", value: onTrack, pct: pctOnTrack, color: "text-success", bg: "bg-success-light", border: "border-success/20" },
          { label: "Perlu Review", value: needReview, pct: pctNeedReview, color: "text-warning", bg: "bg-warning-light", border: "border-warning/20" },
          { label: "Perlu Perhatian", value: atRisk, pct: pctAtRisk, color: "text-danger", bg: "bg-danger-light", border: "border-danger/20" },
        ].map(({ label, value, pct, color, bg, border }) => (
          <div key={label} className={cn("rounded-[10px] border p-4 text-center", bg, border)}>
            <div className={cn("text-[40px] font-bold leading-none tabular-nums", color)}>{value}</div>
            <div className="text-[12px] font-semibold text-ink mt-1.5">{label}</div>
            <div className={cn("text-[11px] font-medium mt-0.5", color)}>{pct}% dari kelas</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-[5px] rounded-full overflow-hidden flex gap-0.5">
        <div className="bg-success rounded-full transition-all" style={{ width: `${pctOnTrack}%` }} />
        <div className="bg-warning rounded-full transition-all" style={{ width: `${pctNeedReview}%` }} />
        <div className="bg-danger rounded-full transition-all" style={{ width: `${pctAtRisk}%` }} />
      </div>
    </div>
  );
}

// ─── Student Status Row ───────────────────────────────────────────────────────

const statusConfig: Record<StudentStatus, { label: string; avatarBg: string; badgeBg: string; badgeText: string }> = {
  "On Track": { label: "Menguasai", avatarBg: "bg-success", badgeBg: "bg-success-light", badgeText: "text-success" },
  "Need Review": { label: "Perlu Review", avatarBg: "bg-warning", badgeBg: "bg-warning-light", badgeText: "text-warning" },
  "At Risk": { label: "Perlu Perhatian", avatarBg: "bg-danger", badgeBg: "bg-danger-light", badgeText: "text-danger" },
};

export function StudentStatusRow({
  student,
  onClick,
}: {
  student: Student;
  onClick?: () => void;
}) {
  const cfg = statusConfig[student.status];
  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-background/60 -mx-2 px-2 rounded-[6px] cursor-pointer transition-colors"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
        cfg.avatarBg
      )}>
        {student.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{student.name}</div>
        <div className="text-[11px] text-ink-secondary tabular-nums">Rata-rata {student.avgScore} · #{student.rank}</div>
      </div>
      <span className={cn(
        "shrink-0 rounded-[4px] px-2 py-0.5 text-[10px] font-semibold",
        cfg.badgeBg, cfg.badgeText
      )}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── AI Insight Panel ─────────────────────────────────────────────────────────

export function AIInsightPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "rounded-card border border-primary/20 bg-gradient-card-primary p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-primary">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[12px] font-bold text-primary-dark">{title}</span>
      </div>
      <div className="text-[13px] text-ink-secondary leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Misconception Row ────────────────────────────────────────────────────────

export function MisconceptionRow({
  topic,
  issue,
  affectedStudents,
  priority,
}: {
  topic: string;
  issue: string;
  affectedStudents: number;
  priority: "Tinggi" | "Sedang" | "Rendah";
}) {
  const priorityStyle = {
    Tinggi: { dot: "bg-danger", bg: "bg-danger-light", text: "text-danger" },
    Sedang: { dot: "bg-warning", bg: "bg-warning-light", text: "text-warning" },
    Rendah: { dot: "bg-ink-tertiary", bg: "bg-background", text: "text-ink-secondary" },
  }[priority];

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priorityStyle.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-ink">{topic}</span>
          <span className={cn("rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold", priorityStyle.bg, priorityStyle.text)}>
            {priority}
          </span>
        </div>
        <p className="text-[12px] text-ink-secondary mt-0.5 leading-snug line-clamp-2">{issue}</p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[14px] font-bold text-ink">{affectedStudents}</div>
        <div className="text-[10px] text-ink-tertiary">siswa</div>
      </div>
    </div>
  );
}

// ─── Catch Me Up Card (Student Hero) ─────────────────────────────────────────

export function CatchMeUpCard({
  studentName,
  weakTopics,
  nextAction,
  onStart,
}: {
  studentName: string;
  weakTopics: string[];
  nextAction: string;
  onStart?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-hero p-6 text-white shadow-primary-md">
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-white/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-200">Catch Me Up</span>
          </div>
          <h2 className="text-[20px] font-bold leading-snug text-white mb-1">
            Yuk kejar ketertinggalan, {studentName.split(" ")[0]}!
          </h2>
          <p className="text-[13px] text-blue-100 leading-relaxed mb-4">
            {nextAction}
          </p>
          {weakTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {weakTopics.map(t => (
                <span key={t} className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {t}
                </span>
              ))}
            </div>
          )}
          <Button
            variant="default"
            className="bg-white text-primary font-semibold hover:bg-blue-50 border-0 shadow-lg"
            onClick={onStart}
          >
            Mulai Latihan
          </Button>
        </div>
        <div className="hidden md:flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <div className="text-[28px] font-bold text-white leading-none">38%</div>
          <div className="text-[9px] font-semibold text-blue-200 text-center mt-0.5">Akurasi<br />Diskriminan</div>
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard Entry ────────────────────────────────────────────────────────

export function LeaderboardEntry({
  rank,
  name,
  initials,
  avgScore,
  xp,
  streak,
  isCurrentUser,
}: {
  rank: number;
  name: string;
  initials: string;
  avgScore: number;
  xp: number;
  streak: number;
  isCurrentUser: boolean;
}) {
  const rankBg = rank === 1 ? "bg-yellow-400" : rank === 2 ? "bg-slate-300" : rank === 3 ? "bg-amber-600" : "bg-background border border-border";
  const rankText = rank <= 3 ? "text-white" : "text-ink-secondary";

  return (
    <div className={cn(
      "flex items-center gap-3 py-2.5 px-3 rounded-[8px] transition-colors",
      isCurrentUser ? "bg-primary-soft border border-primary/20" : "hover:bg-background"
    )}>
      <div className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        rankBg, rankText
      )}>
        {rank <= 3 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉") : rank}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[13px] font-semibold truncate", isCurrentUser ? "text-primary" : "text-ink")}>
          {name}{isCurrentUser && " (Kamu)"}
        </div>
        <div className="text-[11px] text-ink-secondary flex items-center gap-2">
          <span className="tabular-nums">{xp} XP</span>
          {streak > 0 && <span className="text-warning">🔥 {streak}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-bold text-ink tabular-nums">{avgScore}</div>
        <div className="text-[10px] text-ink-tertiary">avg</div>
      </div>
    </div>
  );
}

// ─── Upcoming Assessment Card ─────────────────────────────────────────────────

export function UpcomingCard({
  title,
  type,
  date,
  duration,
  questions,
  onClick,
}: {
  title: string;
  type: string;
  date: string;
  duration: number;
  questions: number;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-[10px] border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft group-hover:bg-primary transition-colors">
        <FileQuestion className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{title}</div>
        <div className="text-[11px] text-ink-secondary mt-0.5">
          {type} · {questions} soal · {duration} menit
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[11px] font-semibold text-ink">{date}</div>
        <div className="text-[10px] text-ink-tertiary">Terjadwal</div>
      </div>
    </div>
  );
}

// ─── Recent Assessment Row ────────────────────────────────────────────────────

export function RecentAssessmentRow({
  title,
  type,
  date,
  score,
  classAvg,
  rank,
  onClick,
}: {
  title: string;
  type: string;
  date: string;
  score: number;
  classAvg?: number;
  rank?: number;
  onClick?: () => void;
}) {
  const scoreTone = score >= 80 ? "text-success" : score >= 65 ? "text-primary" : score >= 50 ? "text-warning" : "text-danger";

  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-background/60 -mx-2 px-2 rounded-[6px] cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{title}</div>
        <div className="text-[11px] text-ink-secondary">{type} · {date}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn("text-[18px] font-bold tabular-nums", scoreTone)}>{score}</div>
        {classAvg && (
          <div className="text-[10px] text-ink-tertiary tabular-nums">
            Avg: {classAvg}{rank ? ` · #${rank}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Topic Bar ────────────────────────────────────────────────────────────────

export function TopicBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const isWeak = value < 50;
  const isMedium = value >= 50 && value < 70;
  const barColor = isWeak ? "bg-danger" : isMedium ? "bg-warning" : "bg-success";
  const textColor = isWeak ? "text-danger" : isMedium ? "text-warning" : "text-success";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink truncate pr-2">{label}</span>
        <span className={cn("text-[12px] font-bold tabular-nums shrink-0", textColor)}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}
          className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Simple Chart ─────────────────────────────────────────────────────────────

export function SimpleChart({
  data,
  labels,
  type = "line",
  height = 80,
}: {
  data: number[];
  labels?: string[];
  type?: "line" | "bar";
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  });

  if (type === "bar") {
    return (
      <div className="flex items-end gap-1 h-20">
        {data.map((v, i) => {
          const pct = (v / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-sm bg-primary/20 relative overflow-hidden h-[3.75rem]">
                <div
                  className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all"
                  style={{ height: `${pct}%` }}
                />
              </div>
              {labels && (
                <span className="text-[9px] text-ink-tertiary truncate w-full text-center">{labels[i]}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`0,100 ${points.join(" ")} 100,100`}
          fill="url(#lineGrad)"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#2563EB"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const [x, y] = p.split(",").map(Number);
          const isLast = i === data.length - 1;
          return isLast ? (
            <circle key={i} cx={x} cy={y} r="3" fill="#2563EB" vectorEffect="non-scaling-stroke" />
          ) : null;
        })}
      </svg>
      {labels && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-between">
          {[labels[0], labels[labels.length - 1]].map((l, i) => (
            <span key={i} className="text-[9px] text-ink-tertiary">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Score Circle ─────────────────────────────────────────────────────────────

export function ScoreCircle({ score, size = 80 }: { score: number; size?: number }) {
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#059669" : score >= 65 ? "#2563EB" : score >= 50 ? "#D97706" : "#EF4444";

  return (
    <div role="img" aria-label={`Nilai ${score} dari 100`} className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="5" />
        <circle
          cx="35" cy="35" r={radius} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 35 35)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-bold tabular-nums text-ink" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Badge variants ───────────────────────────────────────────────────────────

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  return <Badge tone={masteryTone[level]}>{level}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone = difficulty === "Mudah" ? "success" : difficulty === "Sedang" ? "warning" : "danger";
  return <Badge tone={tone}>{difficulty}</Badge>;
}

export function BloomBadge({ level }: { level: BloomLevel }) {
  const tones: Record<BloomLevel, "success" | "primary" | "warning" | "danger"> = {
    Mengingat: "success",
    Memahami: "success",
    Menerapkan: "primary",
    Menganalisis: "warning",
    Mengevaluasi: "danger",
    Mencipta: "danger",
  };
  return <Badge tone={tones[level]}>{level}</Badge>;
}

export function ConfidenceBadge({ diagnosis }: { diagnosis: ConfidenceDiagnosis }) {
  const tones: Record<ConfidenceDiagnosis, "danger" | "warning" | "primary" | "success"> = {
    Miskonsepsi: "danger",
    "Celah Pengetahuan": "warning",
    "Perlu Pengulangan": "primary",
    Mahir: "success",
  };
  return <Badge tone={tones[diagnosis]}>{diagnosis}</Badge>;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background border border-border mb-4">
        <Icon className="h-6 w-6 text-ink-tertiary" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1.5">{title}</h3>
      {description && <p className="text-[13px] text-ink-secondary max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Alert Panel ─────────────────────────────────────────────────────────────

export function AlertPanel({
  tone = "warning",
  title,
  children,
  icon: Icon,
}: {
  tone?: "primary" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  const styles = {
    primary: { bg: "bg-primary-soft border-primary/20", title: "text-primary-dark", body: "text-primary", IconComp: Info },
    success: { bg: "bg-success-light border-success/20", title: "text-success-dark", body: "text-success", IconComp: CheckCircle2 },
    warning: { bg: "bg-warning-light border-warning/20", title: "text-warning-dark", body: "text-warning", IconComp: AlertTriangle },
    danger: { bg: "bg-danger-light border-danger/20", title: "text-danger-dark", body: "text-danger", IconComp: AlertCircle },
  }[tone];
  const FinalIcon = Icon ?? styles.IconComp;

  return (
    <div className={cn("rounded-card border p-4", styles.bg)}>
      <div className="flex gap-3">
        <FinalIcon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.body)} />
        <div className="min-w-0">
          {title && <div className={cn("text-[13px] font-semibold mb-1", styles.title)}>{title}</div>}
          <div className={cn("text-[12px] leading-relaxed", styles.body)}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Grounding Notice ─────────────────────────────────────────────────────────

export function GroundingNotice() {
  return (
    <div className="flex items-start gap-2 rounded-[8px] border border-primary/20 bg-primary-soft px-3 py-2.5">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <p className="text-[11px] font-medium text-primary leading-relaxed">
        Jawaban berdasarkan materi yang diunggah guru.
      </p>
    </div>
  );
}

// ─── Source Chips ─────────────────────────────────────────────────────────────

export function SourceChips({ sources }: { sources: string[] }) {
  if (!sources?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-[4px] border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
          <BookOpen className="h-2.5 w-2.5" />
          {s}
        </span>
      ))}
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

export function NotificationItem({ notification: n }: { notification: AppNotification }) {
  const dotColor = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-ink-tertiary",
  }[n.tone];

  const inner = (
    <>
      <div className="mt-1.5 shrink-0">
        <div className={cn("h-2 w-2 rounded-full", dotColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold text-ink leading-snug">{n.title}</p>
          {!n.read && (
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug line-clamp-2">{n.description}</p>
        <p className="text-[10px] text-ink-tertiary mt-1">{n.time}</p>
      </div>
    </>
  );

  const className = cn(
    "flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-background transition-colors cursor-pointer",
    !n.read && "bg-primary-soft/40"
  );

  if (n.href) {
    return <Link href={n.href} className={className}>{inner}</Link>;
  }
  return <div className={className}>{inner}</div>;
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

export function ChatBubble({
  message,
  grounded = true,
}: {
  message: ChatMessage;
  grounded?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white mt-1">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={cn("max-w-[82%] space-y-1.5", isUser ? "items-end flex flex-col" : "")}>
        <div className={cn(
          "rounded-[12px] px-4 py-3 text-[13px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-white"
            : grounded
              ? "rounded-tl-sm bg-surface border border-border text-ink shadow-sm"
              : "rounded-tl-sm border border-warning/30 bg-warning-light text-ink"
        )}>
          {!grounded && !isUser && (
            <div className="flex items-center gap-1.5 mb-2 text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-semibold">Di luar cakupan materi</span>
            </div>
          )}
          {message.content}
        </div>
        {message.sources && grounded && !isUser && (
          <SourceChips sources={message.sources} />
        )}
        {message.timestamp && (
          <p className={cn("text-[10px] text-ink-tertiary", isUser ? "text-right" : "")}>{message.timestamp}</p>
        )}
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div role="status" aria-label="AI sedang mengetik" className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex gap-1 rounded-[12px] rounded-tl-sm bg-surface border border-border px-4 py-3 shadow-sm">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ink-tertiary"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, delay, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Suggested Prompt Button ──────────────────────────────────────────────────

export function SuggestedPromptButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-[8px] border border-border bg-surface px-3 py-2.5 text-[12px] font-medium text-ink-secondary hover:border-primary/30 hover:bg-primary-soft hover:text-primary transition-all"
    >
      {label}
    </button>
  );
}

// ─── Loading Panel ────────────────────────────────────────────────────────────

export function LoadingPanel({ message = "Memproses..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-[13px] text-ink-secondary">{message}</p>
    </div>
  );
}

// ─── Material Card ────────────────────────────────────────────────────────────

export function MaterialCard({
  title,
  type,
  subject,
  pages,
  uploadedAt,
  status,
  aiProcessed,
  questionsGenerated,
  isProcessing,
  onClick,
  onProcessAI,
}: {
  title: string;
  type: string;
  subject: string;
  pages: number;
  uploadedAt: string;
  status: string;
  aiProcessed: boolean;
  questionsGenerated: number;
  isProcessing?: boolean;
  onClick?: () => void;
  onProcessAI?: () => void;
}) {
  const statusStyle = {
    Aktif: { bg: "bg-success-light", text: "text-success", dot: "bg-success" },
    Draf: { bg: "bg-background", text: "text-ink-secondary", dot: "bg-ink-tertiary" },
    Diproses: { bg: "bg-warning-light", text: "text-warning", dot: "bg-warning animate-pulse" },
  }[status] ?? { bg: "bg-background", text: "text-ink-secondary", dot: "bg-ink-tertiary" };

  return (
    <div
      className="flex items-start gap-4 rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-background border border-border group-hover:bg-primary-soft transition-colors">
        <FileText className="h-5 w-5 text-ink-secondary group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink truncate">{title}</div>
            <div className="text-[11px] text-ink-secondary mt-0.5">{subject} · {type} · {pages} hal.</div>
          </div>
          <span className={cn("shrink-0 flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 text-[10px] font-semibold", statusStyle.bg, statusStyle.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
            {status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          <span className="text-[11px] text-ink-tertiary">Diunggah {uploadedAt}</span>
          {aiProcessed && questionsGenerated > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
              <Sparkles className="h-3 w-3" />
              {questionsGenerated} soal
            </span>
          )}
          {!aiProcessed && isProcessing && (
            <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
              <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin inline-block" />
              Memproses AI...
            </span>
          )}
          {!aiProcessed && !isProcessing && (
            onProcessAI ? (
              <button
                onClick={e => { e.stopPropagation(); onProcessAI(); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" />Proses dengan AI
              </button>
            ) : (
              <span className="text-[11px] text-ink-tertiary">Belum diproses AI</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Assessment Style Card ────────────────────────────────────────────────────

export function AssessmentStyleCard({
  name,
  styleType,
  year,
  papersCount,
  questionsCount,
  status,
}: {
  name: string;
  styleType: string;
  year: number;
  papersCount: number;
  questionsCount: number;
  status: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink">{name}</div>
          <div className="text-[11px] text-ink-secondary mt-0.5">{styleType} · {year}</div>
        </div>
        <Badge tone={status === "Aktif" ? "success" : "neutral"}>{status}</Badge>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-ink-secondary">
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{papersCount} paket</span>
        <span className="flex items-center gap-1"><FileQuestion className="h-3 w-3" />{questionsCount} soal</span>
      </div>
    </div>
  );
}

// ─── Question Bank Row ────────────────────────────────────────────────────────

export function QuestionBankRow({
  entry,
  onApprove,
  onReject,
  onEdit,
}: {
  entry: QuestionBankEntry;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}) {
  const successRate = entry.successRate;
  const successColor = successRate >= 70 ? "text-success" : successRate >= 50 ? "text-warning" : "text-danger";

  return (
    <div className="rounded-card border border-border bg-surface p-4 hover:border-primary/20 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {entry.isLocked && (
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink leading-snug line-clamp-2">{entry.question}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <BloomBadge level={entry.bloom} />
            <DifficultyBadge difficulty={entry.difficulty} />
            <Badge tone="neutral">{entry.styleType}</Badge>
            <Badge tone={entry.status === "Disetujui" ? "success" : entry.status === "Perlu Ditinjau" ? "warning" : "danger"}>
              {entry.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2.5 text-[11px] text-ink-secondary">
            <span className="truncate max-w-[180px]">{entry.source}</span>
            <span>Dipakai {entry.usageCount}×</span>
            <span className={cn("font-semibold", successColor)}>SR {entry.successRate}%</span>
          </div>
        </div>
        {(onApprove || onReject || onEdit) && (
          <div className="flex gap-1.5 shrink-0">
            {onApprove && (
              <button onClick={onApprove} className="rounded-[4px] bg-success-light px-2.5 py-1 text-[11px] font-semibold text-success hover:bg-success/20 transition-colors">
                Setujui
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="rounded-[4px] bg-background border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:bg-border transition-colors">
                Edit
              </button>
            )}
            {onReject && (
              <button onClick={onReject} className="rounded-[4px] bg-danger-light px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-danger/20 transition-colors">
                Tolak
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Review Card ─────────────────────────────────────────────────────

export function QuestionReviewCard({
  question,
  onApprove,
  onReject,
  onEdit,
}: {
  question: { id: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; explanation: string; topic: string; difficulty: Difficulty; sourceRef: string; status: string };
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge tone="neutral">{question.topic}</Badge>
            <DifficultyBadge difficulty={question.difficulty} />
            <Badge tone={question.status === "Disetujui" ? "success" : "warning"}>{question.status}</Badge>
          </div>
          <p className="text-[14px] font-medium text-ink leading-snug">{question.question}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["A", "B", "C", "D"].map(opt => {
          const key = `option${opt}` as keyof typeof question;
          const isCorrect = question.correctAnswer === opt;
          return (
            <div key={opt} className={cn(
              "flex items-start gap-2 rounded-[8px] border p-3",
              isCorrect ? "border-success/30 bg-success-light" : "border-border bg-background"
            )}>
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                isCorrect ? "bg-success text-white" : "bg-border text-ink-secondary"
              )}>{opt}</span>
              <span className="text-[12px] text-ink leading-snug">{question[key] as string}</span>
            </div>
          );
        })}
      </div>
      <div className="rounded-[8px] bg-background border border-border p-3">
        <div className="text-[11px] font-semibold text-ink-secondary mb-1">Pembahasan</div>
        <p className="text-[12px] text-ink leading-relaxed">{question.explanation}</p>
        <p className="text-[10px] text-ink-tertiary mt-1.5">{question.sourceRef}</p>
      </div>
      <div className="flex gap-2 pt-1">
        {onApprove && <Button variant="success" className="flex-1 h-8 text-[12px]" onClick={onApprove}>Setujui</Button>}
        {onEdit && <Button variant="outline" className="h-8 text-[12px]" onClick={onEdit}>Edit</Button>}
        {onReject && <Button variant="danger" className="h-8 text-[12px]" onClick={onReject}>Tolak</Button>}
      </div>
    </div>
  );
}

// ─── Weak Topic Row ───────────────────────────────────────────────────────────

export function WeakTopicRow({
  topic,
  onClick,
}: {
  topic: WeakTopic;
  onClick?: () => void;
}) {
  const isWeak = topic.accuracyRate < 50;
  const isMedium = topic.accuracyRate >= 50 && topic.accuracyRate < 70;
  const barColor = isWeak ? "bg-danger" : isMedium ? "bg-warning" : "bg-success";
  const textColor = isWeak ? "text-danger" : isMedium ? "text-warning" : "text-success";

  return (
    <div
      className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink">{topic.topic}</div>
          <div className="text-[11px] text-ink-secondary">{topic.subject} · {topic.questionsAttempted} soal dicoba</div>
        </div>
        <MasteryBadge level={topic.mastery} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[11px] text-ink-secondary">Akurasi</span>
          <span className={cn("text-[11px] font-bold tabular-nums", textColor)}>{topic.accuracyRate}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${topic.accuracyRate}%` }} />
        </div>
      </div>
      <p className="text-[11px] text-ink-secondary leading-snug">{topic.recommendedAction}</p>
    </div>
  );
}

// ─── Incorrect Question Card ──────────────────────────────────────────────────

export function IncorrectQuestionCard({
  q,
  onClick,
}: {
  q: IncorrectQuestion;
  onClick?: () => void;
}) {
  return (
    <div
      className="rounded-card border border-border bg-surface p-4 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer space-y-3"
      onClick={onClick}
    >
      <div className="flex items-start gap-2 flex-wrap">
        <Badge tone="neutral">{q.topic}</Badge>
        <DifficultyBadge difficulty={q.difficulty} />
        <ConfidenceBadge diagnosis={q.confidenceDiagnosis} />
      </div>
      <p className="text-[13px] font-medium text-ink leading-snug">{q.question}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[6px] bg-danger-light border border-danger/20 p-2.5">
          <div className="text-[9px] font-bold uppercase text-danger mb-1">Jawaban kamu</div>
          <div className="text-[11px] text-ink">{q.yourAnswer}</div>
        </div>
        <div className="rounded-[6px] bg-success-light border border-success/20 p-2.5">
          <div className="text-[9px] font-bold uppercase text-success mb-1">Jawaban benar</div>
          <div className="text-[11px] text-ink">{q.correctAnswer}</div>
        </div>
      </div>
      <div className="rounded-[6px] bg-background border border-border p-2.5">
        <div className="text-[10px] font-semibold text-ink-secondary mb-1">Pembahasan</div>
        <p className="text-[11px] text-ink leading-relaxed">{q.explanation}</p>
      </div>
      <div className="text-[11px] text-ink-tertiary">{q.assessmentTitle} · {q.date}</div>
    </div>
  );
}

// ─── Teaching Recommendation Card ────────────────────────────────────────────

export function RecommendationCard({
  rec,
}: {
  rec: TeachingRecommendation;
}) {
  const priorityStyle = {
    Tinggi: { bg: "bg-danger-light", text: "text-danger", border: "border-danger/20" },
    Sedang: { bg: "bg-warning-light", text: "text-warning", border: "border-warning/20" },
    Rendah: { bg: "bg-background", text: "text-ink-secondary", border: "border-border" },
  }[rec.priority];

  return (
    <div className={cn(
      "rounded-card border p-4 space-y-3",
      priorityStyle.bg, priorityStyle.border
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[13px] font-bold text-ink">{rec.topic}</span>
            <Badge tone={rec.priority === "Tinggi" ? "danger" : rec.priority === "Sedang" ? "warning" : "neutral"}>
              Prioritas {rec.priority}
            </Badge>
          </div>
          <p className="text-[12px] text-ink-secondary leading-snug">{rec.issue}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[18px] font-bold text-ink">{rec.affectedStudents}</div>
          <div className="text-[10px] text-ink-tertiary">siswa</div>
        </div>
      </div>
      <div className="rounded-[8px] bg-surface border border-border/60 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[11px] font-semibold text-primary">Saran AI</span>
          <span className="text-[11px] text-ink-tertiary ml-auto">{rec.estimatedTime}</span>
        </div>
        <p className="text-[12px] text-ink leading-relaxed">{rec.suggestion}</p>
      </div>
    </div>
  );
}

// ─── Student Performance Card ─────────────────────────────────────────────────

export function StudentPerformanceCard({ student }: { student: Student }) {
  const cfg = statusConfig[student.status];
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 hover:shadow-soft transition-shadow cursor-pointer">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white",
        cfg.avatarBg
      )}>
        {student.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink">{student.name}</div>
        <div className="text-[11px] text-ink-secondary">
          Rank #{student.rank} · {student.xp} XP · Streak {student.streak}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn(
          "text-[20px] font-bold tabular-nums",
          student.avgScore >= 80 ? "text-success" : student.avgScore >= 65 ? "text-primary" : student.avgScore >= 50 ? "text-warning" : "text-danger"
        )}>
          {student.avgScore}
        </div>
        <span className={cn("rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold", cfg.badgeBg, cfg.badgeText)}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
