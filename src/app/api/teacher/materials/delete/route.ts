import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/materials/delete  { materialId }
 *
 * Deletes a material and its stored file. Only the teacher who uploaded
 * it may delete it (same rule as editing - see the materials UPDATE RLS
 * policy); other teachers are told whom to contact. Questions that were
 * generated from it stay in the bank (only their source link is cleared -
 * questions.source_material_id has no ON DELETE action, so it must be
 * nulled first or the delete would fail).
 */
export async function POST(req: Request) {
  try {
    const t = await requireTeacher(req);
    if (t instanceof Response) return t;
    const { materialId } = (await req.json()) as { materialId?: string };
    if (!materialId) return Response.json({ error: "materialId wajib diisi" }, { status: 400 });

    const { data: m } = await supabaseAdmin
      .from("materials").select("id, title, file_url, class_id, subject_id, creator_id").eq("id", materialId).single();
    if (!m) return Response.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    if (m.creator_id !== t.profileId) {
      const { data: uploader } = m.creator_id
        ? await supabaseAdmin.from("user_profiles").select("full_name").eq("id", m.creator_id).maybeSingle()
        : { data: null };
      return Response.json({
        error: `Hanya pengunggah materi ini${uploader?.full_name ? ` (${uploader.full_name})` : ""} yang bisa menghapusnya. Hubungi beliau bila materi perlu dihapus.`,
      }, { status: 403 });
    }

    const { error: unlinkError } = await supabaseAdmin.from("questions").update({ source_material_id: null }).eq("source_material_id", m.id);
    if (unlinkError) return Response.json({ error: unlinkError.message }, { status: 500 });
    const { error: delError } = await supabaseAdmin.from("materials").delete().eq("id", m.id);
    if (delError) return Response.json({ error: delError.message }, { status: 500 });
    // File removal last: if it fails the material is already gone from
    // every list, and an orphaned file is harmless.
    if (m.file_url) await supabaseAdmin.storage.from("materials").remove([m.file_url]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting material:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
