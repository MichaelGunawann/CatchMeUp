import { Assessment, AssessmentAttempt } from "@/lib/supabase/types";

export type AssessmentAvailability =
  | "DRAFT"
  | "UPCOMING"
  | "OPEN"
  | "COMPLETED"
  | "MISSED"
  | "CLOSED";

export interface AssessmentAvailabilityInfo {
  state: AssessmentAvailability;
  isOpen: boolean;
  message: string;
  canAttempt: boolean;
  retriesLeft: number;
}

/**
 * Derives the availability state of an assessment at runtime
 * based on status, open_at, close_at, current time, and student attempt state.
 */
export function getAssessmentAvailability(
  assessment: Assessment,
  studentAttempts: AssessmentAttempt[],
  now: Date = new Date()
): AssessmentAvailabilityInfo {
  const nowTime = now.getTime();
  const openTime = assessment.open_at
    ? new Date(assessment.open_at).getTime()
    : null;
  const closeTime = assessment.close_at
    ? new Date(assessment.close_at).getTime()
    : null;

  // If draft, always unavailable
  if (assessment.status === "draft") {
    return {
      state: "DRAFT",
      isOpen: false,
      message: "Asesmen masih dalam tahap persiapan",
      canAttempt: false,
      retriesLeft: 0,
    };
  }

  // If archived, always unavailable
  if (assessment.status === "archived") {
    return {
      state: "CLOSED",
      isOpen: false,
      message: "Asesmen telah diarsipkan",
      canAttempt: false,
      retriesLeft: 0,
    };
  }

  // Status is 'published' - check schedule
  const hasNotOpened = openTime && nowTime < openTime;
  const hasClosed = closeTime && nowTime >= closeTime;

  // Check student attempt history
  const activeAttempt = studentAttempts.find((a) => a.status === "in_progress");
  const completedAttempts = studentAttempts.filter(
    (a) => a.status === "submitted" || a.status === "graded"
  );
  const retriesLeft =
    assessment.max_attempts - (completedAttempts.length + (activeAttempt ? 1 : 0));

  if (activeAttempt) {
    return {
      state: "OPEN",
      isOpen: true,
      message: "Asesmen sedang berlangsung",
      canAttempt: true,
      retriesLeft,
    };
  }

  if (completedAttempts.length > 0 && retriesLeft <= 0) {
    return {
      state: "COMPLETED",
      isOpen: false,
      message: `Asesmen sudah diselesaikan (${completedAttempts.length} percobaan)`,
      canAttempt: false,
      retriesLeft,
    };
  }

  if (hasNotOpened) {
    return {
      state: "UPCOMING",
      isOpen: false,
      message: `Asesmen akan dibuka pada ${new Date(openTime!).toLocaleString("id-ID")}`,
      canAttempt: false,
      retriesLeft,
    };
  }

  if (hasClosed) {
    if (completedAttempts.length === 0) {
      return {
        state: "MISSED",
        isOpen: false,
        message: "Asesmen telah ditutup dan tidak diselesaikan",
        canAttempt: false,
        retriesLeft: 0,
      };
    }
    return {
      state: "CLOSED",
      isOpen: false,
      message: "Asesmen telah ditutup",
      canAttempt: false,
      retriesLeft: 0,
    };
  }

  // Published, open schedule, no completed attempts yet
  return {
    state: "OPEN",
    isOpen: true,
    message: "Asesmen siap dikerjakan",
    canAttempt: retriesLeft > 0,
    retriesLeft,
  };
}

/**
 * Check if student can create a new attempt
 */
export function canAttemptAssessment(
  assessment: Assessment,
  studentAttempts: AssessmentAttempt[]
): boolean {
  const info = getAssessmentAvailability(assessment, studentAttempts);
  return info.canAttempt && info.retriesLeft > 0;
}
