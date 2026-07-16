import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/register-school
 *
 * Self-registration for a new school + its first School Admin, created
 * together (transaction-safe, mirrors /api/register's pattern). The
 * school starts status='PENDING' and is invisible to the rest of the
 * product (supabase/migrations/006_school_registration.sql restricts
 * get_my_school_admin_school_ids() to ACTIVE schools and the public
 * schools SELECT policy to status='ACTIVE') until a PLATFORM_ADMIN
 * approves it via /api/platform-admin/approve-school.
 *
 * Transaction Safety:
 * - schools row creation fails: abort immediately
 * - Auth account creation fails: cleanup (delete school)
 * - user_profiles creation fails: cleanup (delete auth account + school)
 * - school_admins row creation fails: cleanup (delete auth + profile + school)
 *
 * Idempotency: retrying with the same admin email detects the existing
 * account and returns its current state rather than erroring or
 * duplicating it.
 *
 * Request body:
 * {
 *   "schoolName": string,
 *   "npsn": string | null (optional, must be globally unique if provided),
 *   "city": string | null,
 *   "province": string | null,
 *   "adminFullName": string,
 *   "adminEmail": string,
 *   "adminPassword": string (min 8 chars)
 * }
 */
export async function POST(req: Request) {
  let createdSchoolId: string | null = null;
  let createdAuthUserId: string | null = null;

  try {
    const { schoolName, npsn, city, province, adminFullName, adminEmail, adminPassword } =
      await req.json();

    if (!schoolName || !adminFullName || !adminEmail || !adminPassword) {
      return Response.json(
        { error: "Data belum lengkap: nama sekolah, nama admin, email, dan kata sandi wajib diisi" },
        { status: 400 }
      );
    }

    if (adminPassword.length < 8) {
      return Response.json(
        { error: "Kata sandi minimal 8 karakter" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Check for existing account (idempotency)
    // ═══════════════════════════════════════════════════════════════════

    const { data: { users: existingUsers = [] } = {} } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingUsers.find(
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    );

    if (existingAuth?.id) {
      const { data: existingProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, role")
        .eq("auth_user_id", existingAuth.id)
        .single();

      if (existingProfile && existingProfile.role === "SCHOOL_ADMIN") {
        const { data: existingLink } = await supabaseAdmin
          .from("school_admins")
          .select("school_id")
          .eq("user_profile_id", existingProfile.id)
          .single();

        if (existingLink) {
          const { data: existingSchool } = await supabaseAdmin
            .from("schools")
            .select("status")
            .eq("id", existingLink.school_id)
            .single();

          return Response.json({
            success: true,
            message: "Sekolah sudah pernah didaftarkan",
            status: existingSchool?.status ?? "PENDING",
            idempotent: true,
          });
        }
      }

      return Response.json(
        { error: "Email sudah terdaftar. Hubungi dukungan jika ini tidak seharusnya terjadi." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Create the school row, status='PENDING'
    // ═══════════════════════════════════════════════════════════════════

    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({
        name: schoolName,
        npsn: npsn || null,
        city: city || null,
        province: province || null,
        status: "PENDING",
      })
      .select()
      .single();

    if (schoolError || !schoolData) {
      console.error("School creation error:", schoolError);
      const message = schoolError?.code === "23505"
        ? "NPSN ini sudah terdaftar untuk sekolah lain"
        : "Pendaftaran sekolah gagal. Silakan coba lagi.";
      return Response.json({ error: message }, { status: 400 });
    }

    createdSchoolId = schoolData.id;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Create Supabase Auth account for the first School Admin
    // ═══════════════════════════════════════════════════════════════════

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("Auth creation error:", authError);
      await supabaseAdmin.from("schools").delete().eq("id", createdSchoolId);
      return Response.json(
        { error: "Pendaftaran gagal. Silakan coba lagi." },
        { status: 400 }
      );
    }

    createdAuthUserId = authData.user.id;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Create user profile (role SCHOOL_ADMIN)
    // ═══════════════════════════════════════════════════════════════════

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        auth_user_id: createdAuthUserId,
        full_name: adminFullName,
        role: "SCHOOL_ADMIN",
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      await supabaseAdmin.from("schools").delete().eq("id", createdSchoolId);
      return Response.json(
        { error: "Pendaftaran gagal. Silakan coba lagi." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Link the admin to the school
    // ═══════════════════════════════════════════════════════════════════

    const { error: linkError } = await supabaseAdmin
      .from("school_admins")
      .insert({ user_profile_id: profileData.id, school_id: createdSchoolId });

    if (linkError) {
      console.error("School admin link creation error:", linkError);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      await supabaseAdmin.from("schools").delete().eq("id", createdSchoolId);
      return Response.json(
        { error: "Pendaftaran gagal. Silakan coba lagi." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUCCESS
    // ═══════════════════════════════════════════════════════════════════

    return Response.json({
      success: true,
      message: "Pendaftaran sekolah terkirim. Menunggu persetujuan admin platform.",
      status: "PENDING",
      idempotent: false,
    });
  } catch (error) {
    console.error("Error registering school:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
