import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/school-admin/set-student-class  { studentId, classId }
 *
 * Places a student in a class, or moves them to another one, after the
 * registration was already decided ("Belum ditempatkan" students approved
 * without a class, or a student who changes class). Same discipline as
 * approve-registration: the requester must be a SCHOOL_ADMIN of the
 * student's school (or a PLATFORM_ADMIN), the class must belong to that
 * school, and only class_id is ever written.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !authData.user) return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (profile?.role !== "SCHOOL_ADMIN" && profile?.role !== "PLATFORM_ADMIN") {
    return Response.json({ error: "Hanya admin yang dapat mengatur kelas siswa" }, { status: 403 });
  }

  const { studentId, classId } = (await req.json()) as { studentId?: string; classId?: string };
  if (!studentId || !classId) return Response.json({ error: "Pilih kelas terlebih dahulu" }, { status: 400 });

  const { data: student } = await supabaseAdmin.from("students").select("id, school_id").eq("id", studentId).maybeSingle();
  if (!student) return Response.json({ error: "Siswa tidak ditemukan" }, { status: 404 });

  if (profile.role === "SCHOOL_ADMIN") {
    const { data: managed } = await supabaseAdmin.from("school_admins").select("school_id")
      .eq("user_profile_id", profile.id).eq("school_id", student.school_id);
    if (!managed?.length) return Response.json({ error: "Siswa ini bukan dari sekolah yang kamu kelola" }, { status: 403 });
  }

  const { data: cls } = await supabaseAdmin.from("classes").select("id, name, school_id").eq("id", classId).maybeSingle();
  if (!cls || cls.school_id !== student.school_id) {
    return Response.json({ error: "Kelas tersebut bukan dari sekolah siswa ini" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("students").update({ class_id: cls.id }).eq("id", student.id);
  if (error) return Response.json({ error: "Gagal menyimpan kelas siswa" }, { status: 500 });
  return Response.json({ success: true, classId: cls.id, className: cls.name });
}
