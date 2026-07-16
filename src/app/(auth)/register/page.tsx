"use client";

import Link from "next/link";
import { GraduationCap, School, Users } from "lucide-react";

/**
 * Self-service registration is intentionally NOT offered here.
 *
 * The database RLS policy "User profiles creation blocked" rejects every
 * client-side INSERT into user_profiles unconditionally
 * (supabase/migrations/002_rls_policies.sql). Per the finalized
 * architecture, account provisioning always happens server-side:
 *  - Teachers and students are provisioned by their School Admin
 *    (no client-safe path exists to create teachers/students rows).
 *  - Parents register via an invitation code created by a School Admin,
 *    through the transaction-safe /api/parent-invite + /api/parent-register
 *    flow (see /register/parent).
 *
 * An earlier version of this page offered a self-service TEACHER/STUDENT
 * signup form that called signUpWithPassword(). That call would always
 * fail against the current RLS policies, so it has been removed rather
 * than left in place presenting a form that can never succeed.
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Catch Me Up</h1>
          <p className="text-center text-gray-600 mb-6">How to get access</p>

          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border border-gray-200 p-4">
              <GraduationCap className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Teachers</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Your account is created by your School Administrator. Ask them for your login credentials.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg border border-gray-200 p-4">
              <School className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Students</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Your account is created by your School Administrator. Ask them for your login credentials.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg border border-gray-200 p-4">
              <Users className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Parents</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  You need an invitation link from your child&apos;s school to register. If you already have an
                  invitation code, use the link you received by email, or{" "}
                  <Link href="/register/parent" className="text-blue-600 hover:text-blue-700 underline">
                    enter it here
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
