"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { AlertPanel, LoadingPanel } from "@/components/product-primitives";

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
            setError(`Peran tidak dikenali: ${profile.role}`);
            setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat profil");
        setLoading(false);
      }
    };

    checkProfile();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-lg">
          <div className="mb-4">
            <AlertPanel tone="danger" title="Terjadi kesalahan">
              {error}
            </AlertPanel>
          </div>
          <Button onClick={() => router.push("/login")} className="w-full">
            Kembali ke Halaman Masuk
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <LoadingPanel message="Memuat dasbor kamu..." />
      </div>
    );
  }

  return null;
}
