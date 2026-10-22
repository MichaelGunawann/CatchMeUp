import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";

export const dynamic = "force-dynamic";

const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "gif"];
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * POST /api/teacher/question-image  { fileName, fileSize }
 *
 * One-time signed upload URL for a picture attached to a question
 * (bucket "question-images", migration 026). The bucket is public-read so
 * exams, reviews and the question bank can show the picture by URL; the
 * random file name keeps it unguessable, and only teachers can upload.
 *
 * Returns { path, token, publicUrl } - the client uploads with
 * storage.uploadToSignedUrl(path, token, file) and saves publicUrl in
 * questions.image_url.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { fileName, fileSize } = (await req.json()) as { fileName?: string; fileSize?: number };
  const ext = (fileName?.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return Response.json({ error: "Gambar harus PNG, JPG, WEBP, atau GIF." }, { status: 400 });
  }
  if (typeof fileSize === "number" && fileSize > MAX_BYTES) {
    return Response.json({ error: "Ukuran gambar maksimal 3 MB." }, { status: 400 });
  }
  const { data: teacherRow } = await supabaseAdmin.from("teachers").select("school_id").eq("id", t.teacherId).maybeSingle();
  const folder = (teacherRow?.school_id as string | undefined) ?? "umum";
  const path = `${folder}/${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
  const { data, error } = await supabaseAdmin.storage.from("question-images").createSignedUploadUrl(path);
  if (error || !data) {
    const missing = /not found/i.test(error?.message ?? "");
    return Response.json({
      error: missing ? "Penyimpanan gambar belum disiapkan. Jalankan migrasi 026 terlebih dahulu." : `Gagal menyiapkan unggahan: ${error?.message ?? "unknown"}`,
    }, { status: 500 });
  }
  const { data: pub } = supabaseAdmin.storage.from("question-images").getPublicUrl(data.path);
  return Response.json({ path: data.path, token: data.token, publicUrl: pub.publicUrl });
}
