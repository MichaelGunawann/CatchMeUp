"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, AuthFieldLabel } from "@/components/auth-shell";
import { AlertPanel, LoadingPanel } from "@/components/product-primitives";

export default function ParentRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <LoadingPanel message="Memuat..." />
        </div>
      }
    >
      <ParentRegisterForm />
    </Suspense>
  );
}

function ParentRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(true);

  useEffect(() => {
    // Validate that code exists and is properly formed
    if (!code) {
      setError("Kode undangan tidak ditemukan di URL");
      setValidatingCode(false);
      return;
    }

    // Code validation happens server-side during registration
    setValidatingCode(false);
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError("Kode undangan tidak ditemukan");
      return;
    }

    if (password !== confirmPassword) {
      setError("Kata sandi dan konfirmasi tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/parent-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          password,
          fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Pendaftaran gagal");
        return;
      }

      // Success - redirect to login
      router.push("/login?registered=true&role=parent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  };

  if (validatingCode) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <LoadingPanel message="Memvalidasi undangan..." />
      </div>
    );
  }

  return (
    <AuthShell title="Pendaftaran Orang Tua" subtitle="Selesaikan pendaftaran untuk mengakses informasi anak kamu">
      {error && (
        <div className="mb-4">
          <AlertPanel tone="danger" title="Tidak dapat mendaftar">
            {error}
          </AlertPanel>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <AuthFieldLabel htmlFor="fullName" required>
            Nama Lengkap
          </AuthFieldLabel>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama kamu"
            required
            disabled={loading}
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="password" required>
            Kata Sandi
          </AuthFieldLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="confirmPassword" required>
            Konfirmasi Kata Sandi
          </AuthFieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Mendaftar..." : "Selesaikan Pendaftaran"}
        </Button>
      </form>
    </AuthShell>
  );
}
