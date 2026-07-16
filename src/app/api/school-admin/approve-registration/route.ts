import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/school-admin/approve-registration
 *
 * Approve or reject a pending teacher/student registration.
 *
 * There is deliberately NO RLS UPDATE policy on teachers/students for
 * school admins - this route is the only write path, and it enforces
 * exactly what the RLS policy would otherwise need to: the requester is a
 * SCHOOL_ADMIN, the target row belongs to one of their managed schools,
 * and ONLY the intended fields are ever written (status, and class_id
 * only for students). The request body is never spread directly into the
 * update payload - the UPDATE object is built field-by-field here so an
 * attacker cannot smuggle in an unrelated column (school_id, nip,
 * user_profile_id, etc.) even if they include it in the JSON body.
 *
 * Request body:
 * {
 *   "role": "TEACHER" | "STUDENT",
 *   "recordId": "uuid of the teachers/students row",
 *   "decision": "ACTIVE" | "REJECTED",
 *   "classId": "uuid" (optional, STUDENT + ACTIVE only - must belong to
 *              the same school as the student)
 * }
 */
export async function POST(req: Request) {
  try {
    // Step 1: Authenticate requester
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Verify requester is a SCHOOL_ADMIN
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
        { error: "Only School Admins can approve registrations" },
        { status: 403 }
      );
    }

    const { role, recordId, decision, classId } = await req.json();

    if (role !== "TEACHER" && role !== "STUDENT") {
      return Response.json({ error: "role must be TEACHER or STUDENT" }, { status: 400 });
    }
    if (!recordId) {
      return Response.json({ error: "Missing recordId" }, { status: 400 });
    }
    if (decision !== "ACTIVE" && decision !== "REJECTED") {
      return Response.json({ error: "decision must be ACTIVE or REJECTED" }, { status: 400 });
    }
    if (classId && role !== "STUDENT") {
      return Response.json({ error: "classId only applies to STUDENT" }, { status: 400 });
    }

    const table = role === "TEACHER" ? "teachers" : "students";

    // Step 3: Fetch the target row (need its school_id to authorize)
    const { data: targetRow, error: targetError } = await supabaseAdmin
      .from(table)
      .select("id, school_id, status")
      .eq("id", recordId)
      .single();

    if (targetError || !targetRow) {
      return Response.json({ error: "Registration not found" }, { status: 404 });
    }

    // Step 4: Verify requester manages the target's school
    const { data: adminSchools, error: adminSchoolsError } = await supabaseAdmin
      .from("school_admins")
      .select("school_id")
      .eq("user_profile_id", profileData.id)
      .eq("school_id", targetRow.school_id);

    if (adminSchoolsError || !adminSchools || adminSchools.length === 0) {
      return Response.json(
        { error: "This registration does not belong to any of your managed schools" },
        { status: 403 }
      );
    }

    // Step 5: If a class was specified, verify it belongs to the SAME
    // school as the student (defense in depth - never trust the client's
    // classId blindly, same discipline as schoolId in /api/register).
    if (classId) {
      const { data: classRow, error: classError } = await supabaseAdmin
        .from("classes")
        .select("id, school_id")
        .eq("id", classId)
        .single();

      if (classError || !classRow || classRow.school_id !== targetRow.school_id) {
        return Response.json(
          { error: "Selected class does not belong to the student's school" },
          { status: 400 }
        );
      }
    }

    // Step 6: Build the UPDATE payload explicitly - field by field, never
    // by spreading the request body - so only status (and class_id for
    // students) can ever change, regardless of what the caller sends.
    const updatePayload: { status: string; class_id?: string } = { status: decision };
    if (role === "STUDENT" && decision === "ACTIVE" && classId) {
      updatePayload.class_id = classId;
    }

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from(table)
      .update(updatePayload)
      .eq("id", recordId)
      .select()
      .single();

    if (updateError) {
      console.error("Approval update error:", updateError);
      return Response.json({ error: "Failed to update registration" }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: `Registration ${decision === "ACTIVE" ? "approved" : "rejected"}`,
      record: updatedRow,
    });
  } catch (error) {
    console.error("Error approving registration:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
