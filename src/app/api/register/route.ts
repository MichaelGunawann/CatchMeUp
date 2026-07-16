import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/register
 * Teacher/Student self-registration (transaction-safe, mirrors
 * /api/parent-register's pattern).
 *
 * New accounts start status='PENDING' on their teachers/students row and
 * cannot access any protected data until a School Admin for their school
 * approves them via /api/school-admin/approve-registration. This is
 * enforced by RLS (supabase/migrations/005_teacher_student_onboarding.sql),
 * not merely by hiding UI.
 *
 * Transaction Safety (same pattern as parent-register):
 * - Auth account creation fails: abort immediately
 * - user_profiles creation fails: cleanup (delete auth account)
 * - teachers/students row creation fails: cleanup (delete auth + profile)
 *
 * Idempotency: retrying with the same email detects the existing account
 * and returns its current state rather than erroring or duplicating it.
 *
 * Request body:
 * {
 *   "role": "TEACHER" | "STUDENT",
 *   "fullName": string,
 *   "email": string,
 *   "password": string (min 8 chars),
 *   "schoolId": string (must be a real schools.id - re-validated here,
 *               never trusted from the client combobox alone)
 * }
 */
export async function POST(req: Request) {
  try {
    const { role, fullName, email, password, schoolId } = await req.json();

    if (role !== "TEACHER" && role !== "STUDENT") {
      return Response.json(
        { error: "Role must be TEACHER or STUDENT" },
        { status: 400 }
      );
    }

    if (!fullName || !email || !password || !schoolId) {
      return Response.json(
        { error: "Missing required fields: fullName, email, password, schoolId" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Re-validate schoolId against the real schools table.
    // The combobox only ever submits an id it received from a live query,
    // but the server must never trust a client-supplied id blindly.
    // ═══════════════════════════════════════════════════════════════════

    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("id", schoolId)
      .single();

    if (schoolError || !school) {
      return Response.json(
        { error: "Selected school does not exist" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Check for existing account (idempotency)
    // ═══════════════════════════════════════════════════════════════════

    let authUserId: string | null = null;
    const { data: { users: existingUsers = [] } = {} } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingUsers.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuth?.id) {
      authUserId = existingAuth.id;

      const { data: existingProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, role")
        .eq("auth_user_id", authUserId)
        .single();

      if (existingProfile && existingProfile.role === role) {
        const table = role === "TEACHER" ? "teachers" : "students";
        const { data: existingRoleRow } = await supabaseAdmin
          .from(table)
          .select("id, status")
          .eq("user_profile_id", existingProfile.id)
          .single();

        if (existingRoleRow) {
          return Response.json({
            success: true,
            message: "Account already registered",
            status: existingRoleRow.status,
            idempotent: true,
          });
        }
      }

      // Auth exists but is a different role, or profile/role-row is
      // incomplete - this is an error state, not something to silently
      // paper over.
      return Response.json(
        { error: "Email already registered. Contact support if this is unexpected." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Create Supabase Auth account
    // ═══════════════════════════════════════════════════════════════════

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("Auth creation error:", authError);
      return Response.json(
        { error: "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    authUserId = authData.user.id;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Create user profile
    // ═══════════════════════════════════════════════════════════════════

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        auth_user_id: authUserId,
        full_name: fullName,
        role,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return Response.json(
        { error: "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Create the role-specific row, status='PENDING' by default
    // ═══════════════════════════════════════════════════════════════════

    const { error: roleRowError } =
      role === "TEACHER"
        ? await supabaseAdmin
            .from("teachers")
            .insert({ user_profile_id: profileData.id, school_id: schoolId })
        : await supabaseAdmin
            .from("students")
            .insert({ user_profile_id: profileData.id, school_id: schoolId, class_id: null });

    if (roleRowError) {
      console.error(`${role} row creation error:`, roleRowError);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return Response.json(
        { error: "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUCCESS
    // ═══════════════════════════════════════════════════════════════════

    return Response.json({
      success: true,
      message: "Registration submitted. Your account is pending school admin approval.",
      status: "PENDING",
      idempotent: false,
    });
  } catch (error) {
    console.error("Error registering teacher/student:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
