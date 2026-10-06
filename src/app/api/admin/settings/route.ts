import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings
 *
 * The admin "Pengaturan" page used to show hardcoded values and a save
 * button that only displayed a success toast. Now:
 *  - PLATFORM_ADMIN reads/updates the platform_settings singleton (which
 *    has no client UPDATE policy by design - migration 007).
 *  - SCHOOL_ADMIN reads/updates their own school's profile (name, NPSN,
 *    city, province).
 *
 * Body: { action: "get" } | { action: "save", values: {...} }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
    const { data: profile } = await supabaseAdmin
      .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
    if (!profile || (profile.role !== "PLATFORM_ADMIN" && profile.role !== "SCHOOL_ADMIN")) {
      return Response.json({ error: "Hanya admin yang dapat mengakses pengaturan" }, { status: 403 });
    }

    const body = (await req.json()) as { action?: "get" | "save"; values?: Record<string, string> };
    const v = body.values ?? {};
    const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

    if (profile.role === "PLATFORM_ADMIN") {
      const { data: row } = await supabaseAdmin.from("platform_settings").select("*").limit(1).maybeSingle();
      if (body.action === "save") {
        const platformName = (v.platformName ?? "").trim();
        const adminEmail = (v.adminContactEmail ?? "").trim();
        const reportEmail = (v.reportNotificationEmail ?? "").trim();
        if (!platformName) return Response.json({ error: "Nama platform wajib diisi" }, { status: 400 });
        if (adminEmail && !isEmail(adminEmail)) return Response.json({ error: "Format email kontak admin tidak valid" }, { status: 400 });
        if (reportEmail && !isEmail(reportEmail)) return Response.json({ error: "Format email laporan tidak valid" }, { status: 400 });
        const values = {
          platform_name: platformName,
          admin_contact_email: adminEmail || null,
          report_notification_email: reportEmail || null,
          updated_at: new Date().toISOString(),
          updated_by: profile.id,
        };
        const { error } = row
          ? await supabaseAdmin.from("platform_settings").update(values).eq("id", row.id)
          : await supabaseAdmin.from("platform_settings").insert(values);
        if (error) return Response.json({ error: error.message }, { status: 500 });
      }
      const { data: fresh } = await supabaseAdmin.from("platform_settings").select("*").limit(1).maybeSingle();
      return Response.json({
        kind: "platform",
        values: {
          platformName: fresh?.platform_name ?? "",
          adminContactEmail: fresh?.admin_contact_email ?? "",
          reportNotificationEmail: fresh?.report_notification_email ?? "",
        },
      });
    }

    // SCHOOL_ADMIN: their (first) managed school.
    const { data: link } = await supabaseAdmin
      .from("school_admins").select("school_id").eq("user_profile_id", profile.id).limit(1).maybeSingle();
    if (!link) return Response.json({ error: "Akun ini belum terhubung ke sekolah" }, { status: 403 });

    if (body.action === "save") {
      const name = (v.name ?? "").trim();
      if (!name) return Response.json({ error: "Nama sekolah wajib diisi" }, { status: 400 });
      const npsn = (v.npsn ?? "").trim();
      if (npsn && !/^\d{8}$/.test(npsn)) return Response.json({ error: "NPSN harus 8 digit angka" }, { status: 400 });
      const { error } = await supabaseAdmin.from("schools").update({
        name,
        npsn: npsn || null,
        city: (v.city ?? "").trim() || null,
        province: (v.province ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", link.school_id);
      if (error) {
        return Response.json({ error: error.code === "23505" ? "NPSN ini sudah dipakai sekolah lain" : error.message }, { status: 400 });
      }
    }
    const { data: school } = await supabaseAdmin
      .from("schools").select("name, npsn, city, province, status").eq("id", link.school_id).single();
    return Response.json({
      kind: "school",
      values: { name: school?.name ?? "", npsn: school?.npsn ?? "", city: school?.city ?? "", province: school?.province ?? "" },
      status: school?.status ?? null,
    });
  } catch (error) {
    console.error("Error handling admin settings:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
