import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";
import { getMaterialText, ocrErrors } from "@/lib/material-text";

export const dynamic = "force-dynamic";
// Reading a full textbook PDF takes ~40s; this route does only that, right
// after upload, so Tanya AI never has to read the file while a student waits.
export const maxDuration = 300;

/** POST /api/materials/extract-text  { materialId } - teacher only. */
export async function POST(req: Request) {
  try {
    const t = await requireTeacher(req);
    if (t instanceof Response) return t;
    const { materialId } = (await req.json()) as { materialId?: string };
    if (!materialId) return Response.json({ error: "materialId wajib diisi" }, { status: 400 });

    const { data: m } = await supabaseAdmin.from("materials").select("*").eq("id", materialId).single();
    if (!m) return Response.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    if (m.creator_id !== t.profileId && !t.assignments.some(a => a.class_id === m.class_id)) {
      return Response.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    const text = await getMaterialText(m as { id: string; file_url: string | null; content_text?: string | null });
    const ocrError = text ? undefined : ocrErrors.get(m.file_url ?? "");
    return Response.json({ success: true, chars: text.length, ...(ocrError ? { ocrError } : {}) });
  } catch (error) {
    console.error("Error extracting material text:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
