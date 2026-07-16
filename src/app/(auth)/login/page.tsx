"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, signInWithPassword } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell, AuthFieldLabel } from "@/components/auth-shell";
import { AlertPanel, LoadingPanel } from "@/components/product-primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile) {
          router.push("/dashboard");
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await signInWithPassword(email, password);
      if (session) {
        router.push("/dashboard");
      } else {
        setError("Email atau kata sandi salah");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <LoadingPanel message="Memeriksa sesi..." />
      </div>
    );
  }

  return (
    <AuthShell
      title="Catch Me Up"
      subtitle="Masuk ke akun kamu"
      footer={
        <p>
          Belum punya akun?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Daftar di sini
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4">
          <AlertPanel tone="danger" title="Tidak dapat masuk">
            {error}
          </AlertPanel>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <AuthFieldLabel htmlFor="email" required>
            Email
          </AuthFieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@contoh.com"
            required
            disabled={loading}
            autoComplete="email"
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
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sedang masuk..." : "Masuk"}
        </Button>
      </form>
    </AuthShell>
  );
}
