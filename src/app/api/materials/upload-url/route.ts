import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Only formats the AI extraction can actually read (legacy binary .ppt/.doc
// can't be parsed, so accepting them just produced unprocessable materials).
const ALLOWED_EXT = ["pdf", "docx", "pptx", "txt"];
const MAX_BYTES = 50 * 1024 * 1024;

/**
 * POST /api/materials/upload-url
 *
 * Hands a teacher a one-time signed upload URL for a new material file.
 *
 * Why not a direct client upload: the `materials` bucket's SELECT policy
 * (migration 008) only matches objects whose path is already stored in
 * materials.file_url - which can't be true yet while the object is being
 * uploaded - and the client also used `upsert: true`, which needs an
 * UPDATE policy the bucket never had. Every upload failed silently, the
 * material row was saved with file_url = NULL, and nothing could ever be
 * downloaded. A signed upload URL is authorised here instead, using the
 * same rule as the materials INSERT policy (teacher assigned to the class,
 * here also to the subject).
 *
 * Body: { classId, subjectId, fileName, fileSize }
 * Returns: { materialId, path, token }  - the client uploads with
 * storage.uploadToSignedUrl(path, token, file), then inserts the
 * materials row with id = materialId and file_url = path.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) {
      return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
    }
    const { data: profile } = await supabaseAdmin
      .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
    if (!profile || profile.role !== "TEACHER") {
      return Response.json({ error: "Hanya guru yang dapat mengunggah materi" }, { status: 403 });
    }
    const { data: teacher } = await supabaseAdmin
      .from("teachers").select("id, status").eq("user_profile_id", profile.id).single();
    if (!teacher || teacher.status !== "ACTIVE") {
      return Response.json({ error: "Akun guru belum aktif" }, { status: 403 });
    }

    const { classId, subjectId, fileName, fileSize } = (await req.json()) as {
      classId?: string; subjectId?: string; fileName?: string; fileSize?: number;
    };
    if (!classId || !subjectId || !fileName) {
      return Response.json({ error: "Kelas, mata pelajaran, dan file wajib diisi" }, { status: 400 });
    }
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return Response.json({ error: "Format tidak didukung. Gunakan PDF, DOCX, PPTX, atau TXT. File .doc/.ppt lama: simpan ulang sebagai DOCX/PPTX." }, { status: 400 });
    }
    if (typeof fileSize === "number" && fileSize > MAX_BYTES) {
      return Response.json({ error: "Ukuran file melebihi 50 MB." }, { status: 400 });
    }

    const { data: assignment } = await supabaseAdmin
      .from("teacher_assignments")
      .select("school_id")
      .eq("teacher_id", teacher.id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .limit(1)
      .maybeSingle();
    if (!assignment) {
      return Response.json({ error: "Kamu tidak mengajar mata pelajaran ini di kelas tersebut" }, { status: 403 });
    }

    const materialId = randomUUID();
    const path = `${assignment.school_id}/${materialId}.${ext}`;
    const { data, error } = await supabaseAdmin.storage.from("materials").createSignedUploadUrl(path);
    if (error || !data) {
      return Response.json({ error: `Gagal menyiapkan unggahan: ${error?.message ?? "unknown"}` }, { status: 500 });
    }

    return Response.json({ materialId, path: data.path, token: data.token, schoolId: assignment.school_id });
  } catch (error) {
    console.error("Error creating material upload URL:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
