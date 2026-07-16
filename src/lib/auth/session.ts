import { supabase } from "@/lib/supabase/client";
import { UserProfile } from "@/lib/supabase/types";

export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * NOT currently wired to any UI. The "User profiles creation blocked" RLS
 * policy (supabase/migrations/002_rls_policies.sql) rejects every
 * client-side INSERT into user_profiles unconditionally, so the insert
 * below will always fail if this is called from the browser client.
 * Account provisioning happens server-side instead: School Admins
 * provision teachers/students directly, and parents register through the
 * transaction-safe /api/parent-invite + /api/parent-register flow. Kept
 * here only as a reference for a future server-side provisioning helper.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
  role: string
) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error("User registration failed");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      auth_user_id: authData.user.id,
      full_name: fullName,
      role,
    })
    .select()
    .single();

  if (profileError) {
    throw profileError;
  }

  return {
    user: authData.user,
    profile: profileData,
  };
}
