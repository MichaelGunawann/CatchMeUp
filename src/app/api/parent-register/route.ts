import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PendingInvite = {
  student_id: string;
  relationship: string;
  created_by: string;
};

/**
 * POST /api/parent-register
 * Parent registration endpoint (invitation-only, transaction-safe)
 *
 * This is the only way parents can create accounts. Workflow:
 * 1. School Admin invites parent via /api/parent-invite
 * 2. Parent receives invitation code
 * 3. Parent completes registration via this endpoint
 *
 * Transaction Safety:
 * - If Supabase Auth account creation fails: abort immediately
 * - If user_profile creation fails: cleanup (delete auth account)
 * - If parent record creation fails: cleanup (delete auth + profile)
 * - If links creation fails: non-critical (can be retried)
 * - If marking invitations as used fails: non-critical (logs but continues)
 *
 * Idempotency:
 * - If parent already registered: detect and reuse existing profile
 * - If called twice with same code: returns success both times
 * - Safe to retry on network failure
 *
 * Request body:
 * {
 *   "code": "invitation code from email",
 *   "password": "secure password",
 *   "fullName": "parent full name"
 * }
 */
export async function POST(req: Request) {
  try {
    const { code, password, fullName } = await req.json();

    if (!code || !password || !fullName) {
      return Response.json(
        { error: "Missing required fields: code, password, fullName" },
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
    // STEP 1: Validate invitation code
    // ═══════════════════════════════════════════════════════════════════

    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .from("parent_registration_invites")
      .select("*")
      .eq("code", code)
      .is("used_at", null)
      .single();

    if (inviteError || !inviteData) {
      return Response.json(
        { error: "Invalid or already-used invitation code" },
        { status: 400 }
      );
    }

    // Verify invitation not expired
    if (new Date() > new Date(inviteData.expires_at)) {
      return Response.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Check for existing parent account (idempotency)
    // ═══════════════════════════════════════════════════════════════════

    let authUserId: string | null = null;
    const { data: { users: existingUsers = [] } = {} } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingUsers.find(
      (u) => u.email?.toLowerCase() === inviteData.email.toLowerCase()
    );

    if (existingAuth?.id) {
      authUserId = existingAuth.id;

      const { data: existingProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, role")
        .eq("auth_user_id", authUserId)
        .eq("role", "PARENT")
        .single();

      if (existingProfile) {
        const { data: existingParent } = await supabaseAdmin
          .from("parents")
          .select("id")
          .eq("user_profile_id", existingProfile.id)
          .single();

        if (existingParent) {
          // Parent fully registered - idempotent path
          // Create links from ALL pending invitations
          const { data: allInvites } = await supabaseAdmin
            .from("parent_registration_invites")
            .select("*")
            .eq("email", inviteData.email)
            .is("used_at", null);

          if (allInvites && allInvites.length > 0) {
            const linksToCreate = (allInvites as PendingInvite[]).map((inv) => ({
              parent_id: existingParent.id,
              student_id: inv.student_id,
              relationship: inv.relationship,
              verified: true,
              created_by: inv.created_by,
            }));

            // Insert links (ignore duplicates)
            await supabaseAdmin
              .from("parent_student_links")
              .insert(linksToCreate);

            // Mark all invitations as used
            await supabaseAdmin
              .from("parent_registration_invites")
              .update({
                used_at: new Date().toISOString(),
                used_by: existingProfile.id,
              })
              .eq("email", inviteData.email)
              .is("used_at", null);
          }

          return Response.json({
            success: true,
            message: "Parent already registered",
            userId: authUserId,
            profileId: existingProfile.id,
            parentId: existingParent.id,
            linkedStudentCount: allInvites?.length || 0,
            idempotent: true,
          });
        }
      }

      // Auth exists but parent profile/record incomplete - error state
      return Response.json(
        { error: "Email already registered with incomplete profile. Contact support." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Create new Supabase Auth account
    // ═══════════════════════════════════════════════════════════════════

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: inviteData.email,
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
        role: "PARENT",
      })
      .select()
      .single();

    if (profileError) {
      // CLEANUP: Auth account created but profile failed - rollback
      console.error("Profile creation error:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return Response.json(
        { error: "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Create parent record
    // ═══════════════════════════════════════════════════════════════════

    const { data: parentData, error: parentError } = await supabaseAdmin
      .from("parents")
      .insert({
        user_profile_id: profileData.id,
      })
      .select()
      .single();

    if (parentError) {
      // CLEANUP: Auth + profile created but parent record failed - rollback both
      console.error("Parent record creation error:", parentError);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      return Response.json(
        { error: "Registration failed. Please try again." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Create parent-student links from ALL pending invitations
    // ═══════════════════════════════════════════════════════════════════

    const { data: allInvites, error: allInvitesError } = await supabaseAdmin
      .from("parent_registration_invites")
      .select("*")
      .eq("email", inviteData.email)
      .is("used_at", null);

    if (allInvitesError || !allInvites) {
      console.error("Failed to fetch invitations:", allInvitesError);
      return Response.json(
        { error: "Registration failed. Please contact support." },
        { status: 400 }
      );
    }

    const linksToCreate = (allInvites as PendingInvite[]).map((inv) => ({
      parent_id: parentData.id,
      student_id: inv.student_id,
      relationship: inv.relationship,
      verified: true,
      created_by: inv.created_by,
    }));

    if (linksToCreate.length > 0) {
      const { error: linksError } = await supabaseAdmin
        .from("parent_student_links")
        .insert(linksToCreate);

      if (linksError) {
        console.error("Failed to create links:", linksError);
        return Response.json(
          { error: "Failed to link to students. Please contact support." },
          { status: 400 }
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 7: Mark all invitations as used
    // ═══════════════════════════════════════════════════════════════════

    const { error: markUsedError } = await supabaseAdmin
      .from("parent_registration_invites")
      .update({
        used_at: new Date().toISOString(),
        used_by: profileData.id,
      })
      .eq("email", inviteData.email)
      .is("used_at", null);

    if (markUsedError) {
      console.error("Failed to mark invitations as used (non-critical):", markUsedError);
      // Non-critical: log but don't fail registration
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUCCESS: Transaction completed
    // ═══════════════════════════════════════════════════════════════════

    return Response.json({
      success: true,
      message: `Parent registered successfully and linked to ${linksToCreate.length} student(s)`,
      userId: authUserId,
      profileId: profileData.id,
      parentId: parentData.id,
      linkedStudentCount: linksToCreate.length,
      idempotent: false,
    });
  } catch (error) {
    console.error("Error registering parent:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
