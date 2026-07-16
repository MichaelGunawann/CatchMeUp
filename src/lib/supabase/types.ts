export type UserProfile = {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: "PLATFORM_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  created_at: string;
  updated_at: string;
};

export type School = {
  id: string;
  name: string;
  npsn: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
  updated_at: string;
};

export type SchoolAdmin = {
  id: string;
  user_profile_id: string;
  school_id: string;
  created_at: string;
};

export type Class = {
  id: string;
  school_id: string;
  name: string;
  grade: string | null;
  year: number | null;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  school_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Teacher = {
  id: string;
  user_profile_id: string;
  school_id: string;
  nip: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  created_at: string;
  updated_at: string;
};

export type TeacherAssignment = {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  school_id: string;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  user_profile_id: string;
  school_id: string;
  class_id: string | null;
  nis: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  created_at: string;
  updated_at: string;
};

export type Parent = {
  id: string;
  user_profile_id: string;
  created_at: string;
  updated_at: string;
};

export type ParentStudentLink = {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  verified: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ParentRegistrationInvite = {
  id: string;
  email: string;
  student_id: string;
  relationship: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
};

export type Question = {
  id: string;
  school_id: string;
  subject_id: string;
  creator_id: string;
  source: "bank" | "ai_generated" | "uploaded";
  topic: string;
  subtopic: string | null;
  difficulty: "Mudah" | "Sedang" | "Sulit";
  bloom_level:
    | "Mengingat"
    | "Memahami"
    | "Menerapkan"
    | "Menganalisis"
    | "Mengevaluasi"
    | "Mencipta";
  question: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correct_answer: "A" | "B" | "C" | "D" | "E";
  explanation: string | null;
  source_material_id: string | null;
  source_title: string | null;
  source_page: number | null;
  status: "pending" | "approved" | "rejected" | "active" | "archived" | "retired";
  usage_count: number;
  success_rate: number | null;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  school_id: string;
  class_id: string | null;
  subject_id: string | null;
  creator_id: string;
  title: string;
  type: string;
  file_url: string | null;
  file_size: number | null;
  ai_processed: boolean;
  ai_processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Assessment = {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  creator_id: string;
  title: string;
  type: string | null;
  description: string | null;
  open_at: string | null;
  close_at: string | null;
  status: "draft" | "published" | "archived";
  duration_minutes: number | null;
  passing_score: number | null;
  allow_review: boolean;
  allow_retake: boolean;
  max_attempts: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  created_at: string;
  updated_at: string;
};

export type AssessmentQuestion = {
  id: string;
  assessment_id: string;
  question_id: string;
  question_order: number;
  points: number;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type AssessmentAttempt = {
  id: string;
  assessment_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_points: number | null;
  status: "in_progress" | "submitted" | "graded" | "missed";
  created_at: string;
};

export type QuestionAttempt = {
  id: string;
  assessment_attempt_id: string;
  assessment_question_id: string;
  student_answer: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  submitted_at: string;
  created_at: string;
};

export type StudentWrongAnswer = {
  id: string;
  student_id: string;
  assessment_attempt_id: string;
  question_id: string;
  student_answer: string | null;
  attempted_at: string;
  created_at: string;
};
