import { supabaseAdmin } from "@/lib/supabase/server";
import type { ApiTeacher } from "@/lib/auth/api-teacher";

/** The assessment, if this teacher teaches its class + subject. */
export async function teacherAssessment(t: ApiTeacher, assessmentId: string) {
  const { data: a } = await supabaseAdmin.from("assessments").select("*").eq("id", assessmentId).maybeSingle();
  if (!a || !t.assignments.some(x => x.class_id === a.class_id && x.subject_id === a.subject_id)) return null;
  return a as { id: string; class_id: string; subject_id: string; duration_minutes: number | null; close_at: string | null; title: string };
}
