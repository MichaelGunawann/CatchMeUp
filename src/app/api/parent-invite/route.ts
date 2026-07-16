import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent-invite
 * School Admin endpoint to invite parent for student in their school
 *
 * Authorization:
 * - Only SCHOOL_ADMIN role
 * - Can only invite for students in their own school
 * - Creates invitation code for parent to register
 *
 * Request body:
 * {
 *   "studentId": "uuid",
 *   "parentEmail": "email@example.com",
 *   "relationship": "mother|father|guardian|..." (optional, defaults to "guardian")
 * }
 */
export async function POST(req: Request) {
  try {
    // Step 1: Authenticate user from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Get user profile and verify SCHOOL_ADMIN role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (profileError || !profileData) {
      return Response.json({ error: "User profile not found" }, { status: 401 });
    }

    if (profileData.role !== "SCHOOL_ADMIN") {
      return Response.json(
        { error: "Only School Admins can invite parents" },
        { status: 403 }
      );
    }

    const { studentId, parentEmail, relationship = "guardian" } = await req.json();

    if (!studentId || !parentEmail) {
      return Response.json(
        { error: "Missing required fields: studentId, parentEmail" },
        { status: 400 }
      );
    }

    if (!relationship || typeof relationship !== "string") {
      return Response.json(
        { error: "Relationship must be a non-empty string" },
        { status: 400 }
      );
    }

    // Step 3: Verify student exists and admin can access that student's school
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, school_id")
      .eq("id", studentId)
      .single();

    if (studentError || !studentData) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Step 4: Verify admin manages the student's school
    const { data: adminSchools, error: adminSchoolsError } = await supabaseAdmin
      .from("school_admins")
      .select("school_id")
      .eq("user_profile_id", profileData.id)
      .eq("school_id", studentData.school_id);

    if (adminSchoolsError || !adminSchools || adminSchools.length === 0) {
      return Response.json(
        { error: "Student does not belong to any of your schools" },
        { status: 403 }
      );
    }

    // Step 5: Check if parent already has a fully registered account
    const { data: { users: existingUsers = [] } = {} } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingUsers.find(
      (u) => u.email?.toLowerCase() === parentEmail.toLowerCase()
    );

    if (existingAuth?.id) {
      // Auth account exists - check if they have a complete parent profile
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

        if (existingParent) {
          // Parent is fully registered - create link immediately
          const { error: linkError } = await supabaseAdmin
            .from("parent_student_links")
            .insert({
              parent_id: existingParent.id,
              student_id: studentId,
              relationship,
              verified: true,
              created_by: profileData.id,
            });

          if (linkError) {
            if (linkError.code === "23505") {
              // Link already exists
              return Response.json({
                success: true,
                message: "Parent already linked to this student",
                linked: true,
              });
            }

            return Response.json(
              { error: "Failed to create link" },
              { status: 400 }
            );
          }

          return Response.json({
            success: true,
            message: "Parent linked to student immediately",
            linked: true,
            parentEmail: parentEmail,
          });
        }
      }
    }

    // Step 6: Create invitation for parent to register (via server-controlled flow)
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .from("parent_registration_invites")
      .insert({
        email: parentEmail,
        student_id: studentId,
        relationship,
        code,
        created_by: profileData.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Invitation creation error:", inviteError);
      return Response.json(
        { error: "Failed to create invitation" },
        { status: 400 }
      );
    }

    // TODO: Send invitation email with link to /register/parent?code={code}

    return Response.json({
      success: true,
      message: "Invitation created successfully",
      code: inviteData.code,
      expiresAt: inviteData.expires_at,
      linked: false,
      parentEmail: parentEmail,
      invitationUrl: `/register/parent?code=${inviteData.code}`,
    });
  } catch (error) {
    console.error("Error inviting parent:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateInviteCode(): string {
  // Generate cryptographically random code (16 characters)
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
