import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent-invite
 * School Admin endpoint to invite a parent for one or more students in their
 * school. A parent can have more than one child - passing multiple
 * studentIds in one call creates one invite per student, all tied to the
 * same parent email, so a single /register/parent completion (see
 * /api/parent-register) links all of them to the new parent account at
 * once. Any student whose parent already has a full account gets linked
 * immediately instead of going through an invite.
 *
 * Authorization:
 * - Only SCHOOL_ADMIN role
 * - Can only invite for students in schools this admin manages
 *
 * Request body:
 * {
 *   "studentIds": ["uuid", ...],
 *   "parentEmail": "email@example.com",
 *   "relationship": "Ibu|Ayah|Wali" (optional, defaults to "Wali")
 * }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();
    if (profileError || !profileData) {
      return Response.json({ error: "User profile not found" }, { status: 401 });
    }
    if (profileData.role !== "SCHOOL_ADMIN") {
      return Response.json({ error: "Only School Admins can invite parents" }, { status: 403 });
    }

    const body = await req.json() as { studentIds?: string[]; parentEmail?: string; relationship?: string };
    const studentIds = Array.isArray(body.studentIds) ? [...new Set(body.studentIds)] : [];
    const parentEmail = body.parentEmail;
    const relationship = body.relationship && typeof body.relationship === "string" ? body.relationship : "Wali";

    if (studentIds.length === 0 || !parentEmail) {
      return Response.json({ error: "Missing required fields: studentIds, parentEmail" }, { status: 400 });
    }

    // Verify every requested student exists and belongs to a school this admin manages
    const { data: studentsData, error: studentsError } = await supabaseAdmin
      .from("students")
      .select("id, school_id")
      .in("id", studentIds);
    if (studentsError || !studentsData || studentsData.length !== studentIds.length) {
      return Response.json({ error: "One or more students not found" }, { status: 404 });
    }

    const { data: adminSchools } = await supabaseAdmin
      .from("school_admins")
      .select("school_id")
      .eq("user_profile_id", profileData.id);
    const managedSchoolIds = new Set((adminSchools ?? []).map((s) => s.school_id));
    const outOfScope = studentsData.filter((s) => !managedSchoolIds.has(s.school_id));
    if (outOfScope.length > 0) {
      return Response.json({ error: "One or more students do not belong to your schools" }, { status: 403 });
    }

    // Does this parent email already have a fully registered account?
    const { data: { users: existingUsers = [] } = {} } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingUsers.find((u) => u.email?.toLowerCase() === parentEmail.toLowerCase());
    let existingParentId: string | null = null;
    if (existingAuth?.id) {
      const { data: existingProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("auth_user_id", existingAuth.id)
        .eq("role", "PARENT")
        .single();
      if (existingProfile) {
        const { data: existingParent } = await supabaseAdmin
          .from("parents")
          .select("id")
          .eq("user_profile_id", existingProfile.id)
          .single();
        if (existingParent) existingParentId = existingParent.id;
      }
    }

    const linkedStudentIds: string[] = [];
    const invitedStudentIds: string[] = [];

    if (existingParentId) {
      // Parent already exists - link every requested student immediately.
      const rows = studentIds.map((studentId) => ({
        parent_id: existingParentId!,
        student_id: studentId,
        relationship,
        verified: true,
        created_by: profileData.id,
      }));
      const { error: linkError } = await supabaseAdmin.from("parent_student_links").insert(rows);
      // 23505 = some links already existed - not a failure, they're already connected.
      if (linkError && linkError.code !== "23505") {
        return Response.json({ error: "Failed to create links" }, { status: 400 });
      }
      linkedStudentIds.push(...studentIds);
    } else {
      // No account yet - code is UNIQUE NOT NULL on this table, so each
      // student gets its own invite row/code (can't share one row's code
      // across several rows). The parent only ever needs to open ONE of
      // these links, though: /api/parent-register looks up every pending
      // invite for the same EMAIL (not the same code) once they complete
      // registration, and links all of them to the new parent account in
      // one shot. We only need to hand back the first code as "the" link.
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const rows = studentIds.map((studentId) => ({
        email: parentEmail,
        student_id: studentId,
        relationship,
        code: generateInviteCode(),
        created_by: profileData.id,
        expires_at: expiresAt.toISOString(),
      }));
      const { error: inviteError } = await supabaseAdmin.from("parent_registration_invites").insert(rows);
      if (inviteError) {
        console.error("Invitation creation error:", inviteError);
        return Response.json({ error: "Failed to create invitation" }, { status: 400 });
      }
      invitedStudentIds.push(...studentIds);
      const code = rows[0].code;

      return Response.json({
        success: true,
        linked: false,
        linkedStudentIds,
        invitedStudentIds,
        code,
        expiresAt: expiresAt.toISOString(),
        invitationUrl: `/register/parent?code=${code}`,
      });
    }

    return Response.json({
      success: true,
      linked: true,
      linkedStudentIds,
      invitedStudentIds,
    });
  } catch (error) {
    console.error("Error inviting parent:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateInviteCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
