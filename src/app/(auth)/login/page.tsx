"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentSession, signInWithPassword, signOut } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthShell, AuthFieldLabel } from "@/components/auth-shell";
import { AlertPanel } from "@/components/product-primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The form renders immediately - no blocking "Memeriksa sesi..." screen.
  // Someone still signed in on this device is NOT redirected silently any
  // more (on shared school computers that made it impossible to switch from
  // a student to a teacher account): they choose to continue or switch.
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCurrentSession()
      .then((session) => {
        if (!cancelled && session) setSignedInAs(session.user?.email ?? "akun lain");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Switching account: end the previous session first.
      if (signedInAs) { await signOut().catch(() => {}); setSignedInAs(null); }
      const session = await signInWithPassword(email.trim().toLowerCase(), password);
      if (session) {
        router.replace("/dashboard");
      } else {
        setError("Email atau kata sandi salah");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(/invalid login credentials/i.test(msg) ? "Email atau kata sandi salah"
        : /email not confirmed/i.test(msg) ? "Email belum dikonfirmasi. Hubungi admin sekolah."
        : /fetch|network/i.test(msg) ? "Tidak bisa terhubung ke server. Periksa koneksi internet."
        : msg || "Gagal masuk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

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
      {signedInAs && (
        <div className="mb-4 rounded-[10px] border border-primary/30 bg-primary-soft p-3 text-[13px] text-ink">
          Kamu masih masuk sebagai <span className="font-semibold">{signedInAs}</span>.
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => router.replace("/dashboard")}>Lanjut ke dasbor</Button>
            <Button type="button" size="sm" variant="outline"
              onClick={async () => { await signOut().catch(() => {}); setSignedInAs(null); }}>
              Keluar & masuk akun lain
            </Button>
          </div>
        </div>
      )}
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
          <PasswordInput
            id="password"
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
