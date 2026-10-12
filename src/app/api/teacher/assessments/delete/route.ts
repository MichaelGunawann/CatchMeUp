import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/assessments/delete  { assessmentId, force? }
 *
 * Deletes an assessment (its question list, attempts and graded answers
 * cascade; the questions themselves stay in the bank). If students have
 * already worked on it, the first call returns 409 with the count and the
 * caller must confirm with force=true - their scores are deleted with it.
 */
export async function POST(req: Request) {
  try {
    const t = await requireTeacher(req);
    if (t instanceof Response) return t;
    const { assessmentId, force } = (await req.json()) as { assessmentId?: string; force?: boolean };
    if (!assessmentId) return Response.json({ error: "assessmentId wajib diisi" }, { status: 400 });

    const { data: a } = await supabaseAdmin
      .from("assessments").select("id, class_id, subject_id, creator_id").eq("id", assessmentId).single();
    if (!a) return Response.json({ error: "Asesmen tidak ditemukan" }, { status: 404 });
    const assigned = t.assignments.some(x => x.class_id === a.class_id && x.subject_id === a.subject_id);
    if (a.creator_id !== t.profileId && !assigned) {
      return Response.json({ error: "Kamu tidak mengajar kelas/mapel untuk asesmen ini" }, { status: 403 });
    }

    const { data: attempts } = await supabaseAdmin
      .from("assessment_attempts").select("student_id").eq("assessment_id", a.id);
    const studentCount = new Set((attempts ?? []).map(r => r.student_id as string)).size;
    if (studentCount > 0 && !force) {
      return Response.json({ needsConfirmation: true, studentCount }, { status: 409 });
    }

    const { error } = await supabaseAdmin.from("assessments").delete().eq("id", a.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, deletedAttemptsFor: studentCount });
  } catch (error) {
    console.error("Error deleting assessment:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
