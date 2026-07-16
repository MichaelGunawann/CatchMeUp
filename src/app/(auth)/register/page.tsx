"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchoolCombobox } from "@/components/school-combobox";

/**
 * Teacher/Student self-registration.
 *
 * Submits to /api/register (server-side, service-role key never touches
 * the client). New accounts start status='PENDING' and require a School
 * Admin's approval before they can access any protected data - enforced
 * by RLS, not just by this UI.
 *
 * School selection must be a real schools.id from the live combobox
 * query; free text is never accepted (schoolId stays null until a real
 * option is picked, and the server re-validates it independently anyway).
 *
 * Parents don't register here - they use an invitation link/code from
 * their school (see /register/parent).
 */
export default function RegisterPage() {
  const [role, setRole] = useState<"TEACHER" | "STUDENT">("TEACHER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolId) {
      setError("Please select your school from the list");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, fullName, email, password, schoolId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Registration submitted</h1>
            <p className="text-gray-600 mb-6">
              Your account is pending approval from your school administrator. You&apos;ll be able to
              sign in once it&apos;s approved.
            </p>
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Catch Me Up</h1>
          <p className="text-center text-gray-600 mb-6">Create your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {(["TEACHER", "STUDENT"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    disabled={loading}
                    className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                      role === r
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {r === "TEACHER" ? "Teacher" : "Student"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <SchoolCombobox
                value={schoolId}
                onChange={(id) => setSchoolId(id)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Select your school from the list. You must choose a real, registered school.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Registering as a parent?{" "}
            <span className="text-gray-500">Use the invitation link from your child&apos;s school.</span>
          </p>
          <p className="text-center text-sm text-gray-600 mt-2">
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
