"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const profile = await getCurrentProfile();

        if (!profile) {
          router.push("/login");
          return;
        }

        // Redirect based on role
        switch (profile.role) {
          case "TEACHER":
            router.push("/teacher/dashboard");
            break;
          case "STUDENT":
            router.push("/student/dashboard");
            break;
          case "PARENT":
            router.push("/parent/dashboard");
            break;
          case "SCHOOL_ADMIN":
          case "PLATFORM_ADMIN":
            router.push("/admin/dashboard");
            break;
          default:
            setError(`Unknown role: ${profile.role}`);
            setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setLoading(false);
      }
    };

    checkProfile();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}
