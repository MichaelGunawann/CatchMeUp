import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/materials/download-url
 *
 * Returns a short-lived signed URL that DOWNLOADS (Content-Disposition:
 * attachment) a material's file. Previously the browser created a signed
 * URL itself and clicked an <a download> to it - but browsers ignore the
 * `download` attribute for cross-origin URLs, so at best the file replaced
 * the app in the current tab.
 *
 * Visibility mirrors the `materials` table SELECT policies:
 *  - teacher assigned to the material's class, or its uploader
 *  - active student in the material's school + class (or class-less)
 *  - parent of a verified linked child who could see it
 *  - school admin of the material's school
 *
 * Body: { materialId }  ->  { url, fileName }
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
    if (!profile) return Response.json({ error: "Profil tidak ditemukan" }, { status: 403 });

    const { materialId } = (await req.json()) as { materialId?: string };
    if (!materialId) return Response.json({ error: "materialId wajib diisi" }, { status: 400 });

    const { data: material } = await supabaseAdmin
      .from("materials")
      .select("id, title, file_url, school_id, class_id, creator_id, status")
      .eq("id", materialId)
      .single();
    if (!material) return Response.json({ error: "Materi tidak ditemukan" }, { status: 404 });

    const studentCanSee = (s: { school_id: string; class_id: string | null; status: string } | null) =>
      !!s && s.status === "ACTIVE" && s.school_id === material.school_id &&
      (material.class_id === null || material.class_id === s.class_id) && material.status === "active";

    let allowed = material.creator_id === profile.id;
    if (!allowed && profile.role === "TEACHER") {
      const { data: teacher } = await supabaseAdmin.from("teachers").select("id").eq("user_profile_id", profile.id).single();
      if (teacher) {
        const { data: a } = await supabaseAdmin
          .from("teacher_assignments").select("id")
          .eq("teacher_id", teacher.id).eq("class_id", material.class_id).limit(1).maybeSingle();
        allowed = !!a;
      }
    } else if (!allowed && profile.role === "STUDENT") {
      const { data: s } = await supabaseAdmin
        .from("students").select("school_id, class_id, status").eq("user_profile_id", profile.id).single();
      allowed = studentCanSee(s);
    } else if (!allowed && profile.role === "PARENT") {
      const { data: parent } = await supabaseAdmin.from("parents").select("id").eq("user_profile_id", profile.id).single();
      if (parent) {
        const { data: links } = await supabaseAdmin
          .from("parent_student_links").select("students(school_id, class_id, status)")
          .eq("parent_id", parent.id).eq("verified", true);
        allowed = ((links ?? []) as unknown as Array<{ students: { school_id: string; class_id: string | null; status: string } | null }>)
          .some(l => studentCanSee(l.students));
      }
    } else if (!allowed && profile.role === "SCHOOL_ADMIN") {
      const { data: admin } = await supabaseAdmin
        .from("school_admins").select("id").eq("user_profile_id", profile.id).eq("school_id", material.school_id).limit(1).maybeSingle();
      allowed = !!admin;
    }
    if (!allowed) return Response.json({ error: "Kamu tidak punya akses ke materi ini" }, { status: 403 });

    if (!material.file_url) {
      return Response.json({ error: "File materi ini tidak tersimpan (unggahan sebelumnya gagal). Minta guru mengunggah ulang materi ini." }, { status: 404 });
    }

    const ext = material.file_url.split(".").pop() ?? "";
    const safeTitle = (material.title as string).replace(/[\\/:*?"<>|]+/g, " ").trim() || "materi";
    const fileName = ext ? `${safeTitle}.${ext}` : safeTitle;
    const { data, error } = await supabaseAdmin.storage
      .from("materials")
      .createSignedUrl(material.file_url, 120, { download: fileName });
    if (error || !data?.signedUrl) {
      return Response.json({ error: "File tidak ditemukan di penyimpanan. Minta guru mengunggah ulang materi ini." }, { status: 404 });
    }
    return Response.json({ url: data.signedUrl, fileName });
  } catch (error) {
    console.error("Error creating material download URL:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
