import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/platform-admin/approve-school
 *
 * Approve or reject a pending school registration.
 *
 * There is deliberately NO RLS UPDATE policy on `schools` for anyone
 * (see supabase/migrations/006_school_registration.sql) - this route is
 * the only write path, and it enforces exactly what an RLS policy would
 * otherwise need to: the requester is a PLATFORM_ADMIN, and ONLY `status`
 * is ever written. The request body is never spread directly into the
 * update payload, so an attacker cannot smuggle in an unrelated column
 * (name, npsn, city, etc.) even if they include it in the JSON body.
 *
 * Request body:
 * {
 *   "schoolId": "uuid of the schools row",
 *   "decision": "ACTIVE" | "REJECTED"
 * }
 */
export async function POST(req: Request) {
  try {
    // Step 1: Authenticate requester
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
    }

    // Step 2: Verify requester is a PLATFORM_ADMIN
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (profileError || !profileData) {
      return Response.json({ error: "Profil pengguna tidak ditemukan" }, { status: 401 });
    }

    if (profileData.role !== "PLATFORM_ADMIN") {
      return Response.json(
        { error: "Hanya Admin Platform yang dapat menyetujui pendaftaran sekolah" },
        { status: 403 }
      );
    }

    const { schoolId, decision } = await req.json();

    if (!schoolId) {
      return Response.json({ error: "schoolId wajib diisi" }, { status: 400 });
    }
    if (decision !== "ACTIVE" && decision !== "REJECTED") {
      return Response.json({ error: "decision harus ACTIVE atau REJECTED" }, { status: 400 });
    }

    // Step 3: Verify the target row exists
    const { data: targetSchool, error: targetError } = await supabaseAdmin
      .from("schools")
      .select("id, status")
      .eq("id", schoolId)
      .single();

    if (targetError || !targetSchool) {
      return Response.json({ error: "Sekolah tidak ditemukan" }, { status: 404 });
    }

    // Step 4: Build the UPDATE payload explicitly - only `status`, never
    // by spreading the request body.
    const { data: updatedSchool, error: updateError } = await supabaseAdmin
      .from("schools")
      .update({ status: decision })
      .eq("id", schoolId)
      .select()
      .single();

    if (updateError) {
      console.error("School approval update error:", updateError);
      return Response.json({ error: "Gagal memperbarui status sekolah" }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: `Sekolah ${decision === "ACTIVE" ? "disetujui" : "ditolak"}`,
      record: updatedSchool,
    });
  } catch (error) {
    console.error("Error approving school:", error);
    return Response.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
