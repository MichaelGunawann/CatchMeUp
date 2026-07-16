import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/student/practice/topics
 *
 * Service-role only, same reason /api/student/practice/questions is: students
 * have no RLS SELECT on `questions` at all, so even listing the distinct
 * topics available for a subject needs a narrow server route rather than a
 * direct client query.
 *
 * Request body: { subjectId: string }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role")
      .eq("auth_user_id", authData.user.id)
      .single();
    if (!profile || profile.role !== "STUDENT") {
      return Response.json({ error: "Hanya siswa yang dapat berlatih" }, { status: 403 });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("id, school_id, class_id, status")
      .eq("user_profile_id", profile.id)
      .single();
    if (!student || student.status !== "ACTIVE" || !student.class_id) {
      return Response.json({ error: "Akun siswa belum aktif atau belum ditempatkan di kelas" }, { status: 403 });
    }

    const { subjectId } = (await req.json()) as { subjectId?: string };
    if (!subjectId) {
      return Response.json({ error: "subjectId wajib diisi" }, { status: 400 });
    }

    const { data: assignment } = await supabaseAdmin
      .from("teacher_assignments")
      .select("id")
      .eq("class_id", student.class_id)
      .eq("subject_id", subjectId)
      .limit(1)
      .maybeSingle();
    if (!assignment) {
      return Response.json({ error: "Mata pelajaran ini tidak diajarkan di kelasmu" }, { status: 403 });
    }

    const { data } = await supabaseAdmin
      .from("questions")
      .select("topic")
      .eq("school_id", student.school_id)
      .eq("class_id", student.class_id)
      .eq("subject_id", subjectId)
      .eq("status", "active");

    const topics = [...new Set((data ?? []).map(r => r.topic).filter(Boolean))].sort();
    return Response.json({ topics });
  } catch (error) {
    console.error("Error fetching practice topics:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
