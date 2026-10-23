import { supabaseAdmin } from "@/lib/supabase/server";
import { loadTypeStats } from "@/lib/learning/type-stats";

export const dynamic = "force-dynamic";

/** GET /api/student/practice/type-stats?subjectId= - the student's accuracy per question format. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (!authData.user) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (!profile || profile.role !== "STUDENT") return Response.json({ error: "Hanya untuk siswa" }, { status: 403 });
  const { data: student } = await supabaseAdmin.from("students").select("id").eq("user_profile_id", profile.id).single();
  if (!student) return Response.json({ stats: [] });
  const subjectId = new URL(req.url).searchParams.get("subjectId") || undefined;
  return Response.json({ stats: await loadTypeStats(student.id, subjectId) });
}
