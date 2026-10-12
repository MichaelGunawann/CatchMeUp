import { supabaseAdmin } from "@/lib/supabase/server";

export type ApiTeacher = { profileId: string; teacherId: string; assignments: Array<{ class_id: string; subject_id: string }> };

/** Resolves the bearer-token caller as an ACTIVE teacher, or returns an error Response. */
export async function requireTeacher(req: Request): Promise<ApiTeacher | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !authData.user) return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (!profile || profile.role !== "TEACHER") return Response.json({ error: "Hanya untuk guru" }, { status: 403 });
  const { data: teacher } = await supabaseAdmin
    .from("teachers").select("id, status").eq("user_profile_id", profile.id).single();
  if (!teacher || teacher.status !== "ACTIVE") return Response.json({ error: "Akun guru belum aktif" }, { status: 403 });
  const { data: assignments } = await supabaseAdmin
    .from("teacher_assignments").select("class_id, subject_id").eq("teacher_id", teacher.id);
  return { profileId: profile.id, teacherId: teacher.id, assignments: assignments ?? [] };
}
