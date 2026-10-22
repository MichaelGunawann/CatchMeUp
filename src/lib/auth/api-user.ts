import { supabaseAdmin } from "@/lib/supabase/server";

export type ApiUser = { authUserId: string; profileId: string; role: string };

/** Resolves the bearer-token caller (any role), or returns a 401 Response. */
export async function requireUser(req: Request): Promise<ApiUser | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Tidak diotorisasi" }, { status: 401 });
  const { data: authData, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !authData.user) return Response.json({ error: "Sesi tidak valid, silakan masuk ulang" }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("id, role").eq("auth_user_id", authData.user.id).single();
  if (!profile) return Response.json({ error: "Profil tidak ditemukan" }, { status: 403 });
  return { authUserId: authData.user.id, profileId: profile.id as string, role: profile.role as string };
}
