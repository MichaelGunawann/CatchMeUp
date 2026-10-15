import { supabaseAdmin } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/api-teacher";

export const dynamic = "force-dynamic";

/**
 * POST /api/teacher/materials/uploaders  { materialIds: string[] }
 *
 * Names of the teachers who uploaded these materials, so the library can
 * show "Diunggah oleh ..." (only the uploader may edit or delete a
 * material, so other teachers need to know whom to contact). Teachers
 * can't read other teachers' profiles through RLS, hence this route.
 * Limited to materials in classes the caller teaches.
 */
export async function POST(req: Request) {
  const t = await requireTeacher(req);
  if (t instanceof Response) return t;
  const { materialIds } = (await req.json()) as { materialIds?: string[] };
  if (!Array.isArray(materialIds) || materialIds.length === 0) return Response.json({ uploaders: {} });

  const classIds = [...new Set(t.assignments.map(a => a.class_id))];
  const { data: mats } = await supabaseAdmin
    .from("materials").select("id, creator_id, class_id")
    .in("id", materialIds.slice(0, 500))
    .in("class_id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);
  const creatorIds = [...new Set((mats ?? []).map(m => m.creator_id as string).filter(Boolean))];
  const { data: profiles } = creatorIds.length
    ? await supabaseAdmin.from("user_profiles").select("id, full_name").in("id", creatorIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const nameById = new Map((profiles ?? []).map(p => [p.id as string, p.full_name as string]));

  const uploaders: Record<string, { creatorId: string; name: string }> = {};
  for (const m of mats ?? []) {
    if (m.creator_id) uploaders[m.id as string] = { creatorId: m.creator_id as string, name: nameById.get(m.creator_id as string) ?? "Guru lain" };
  }
  return Response.json({ uploaders });
}
