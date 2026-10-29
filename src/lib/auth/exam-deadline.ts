import { parseDbTime } from "@/lib/auth/assessment-availability";

type AttemptLike = { started_at: string; deadline_override?: string | null };
type AssessmentLike = { duration_minutes: number | null; close_at: string | null };

/**
 * When this attempt must be submitted (ms), or null for no limit.
 * A teacher-set personal deadline (reopened exam / extra time for one
 * student) wins over started_at + duration and the assessment's close_at.
 */
export function attemptDeadline(attempt: AttemptLike, a: AssessmentLike): number | null {
  if (attempt.deadline_override) return parseDbTime(attempt.deadline_override);
  const startedAtMs = parseDbTime(attempt.started_at);
  const durationDeadline = a.duration_minutes ? startedAtMs + a.duration_minutes * 60000 : null;
  const closeDeadline = a.close_at ? parseDbTime(a.close_at) : null;
  return [durationDeadline, closeDeadline].filter((d): d is number => d !== null).sort((x, y) => x - y)[0] ?? null;
}
