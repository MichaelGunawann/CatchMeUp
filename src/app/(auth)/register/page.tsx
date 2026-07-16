"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, School as SchoolIcon, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchoolCombobox } from "@/components/school-combobox";
import { AuthShell, AuthFieldLabel } from "@/components/auth-shell";
import { AlertPanel } from "@/components/product-primitives";

type RegisterRole = "TEACHER" | "STUDENT" | "SCHOOL";

const roleOptions: { value: RegisterRole; label: string; icon: typeof GraduationCap }[] = [
  { value: "TEACHER", label: "Guru", icon: GraduationCap },
  { value: "STUDENT", label: "Siswa", icon: UsersRound },
  { value: "SCHOOL", label: "Sekolah", icon: SchoolIcon },
];

/**
 * Self-registration for Guru/Siswa (submits to /api/register) and Sekolah
 * (submits to /api/register-school) - the service-role key never touches
 * the client. All three start in a PENDING state and require approval
 * (School Admin for Guru/Siswa, Platform Admin for Sekolah) before they
 * can access any protected data - enforced by RLS, not just by this UI.
 *
 * School selection for Guru/Siswa must be a real schools.id from the live
 * combobox query; free text is never accepted (schoolId stays null until
 * a real option is picked, and the server re-validates it independently
 * anyway).
 *
 * Parents don't register here - they use an invitation link/code from
 * their school (see /register/parent).
 */
export default function RegisterPage() {
  const [role, setRole] = useState<RegisterRole>("TEACHER");

  // Guru / Siswa fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Sekolah fields
  const [schoolName, setSchoolName] = useState("");
  const [npsn, setNpsn] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function selectRole(next: RegisterRole) {
    setRole(next);
    setError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Kata sandi dan konfirmasi tidak cocok");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter");
      return;
    }

    if (role === "SCHOOL") {
      if (!schoolName.trim() || !adminFullName.trim() || !adminEmail.trim()) {
        setError("Nama sekolah, nama admin, dan email wajib diisi");
        return;
      }
    } else {
      if (!schoolId) {
        setError("Pilih sekolah kamu dari daftar");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(
        role === "SCHOOL" ? "/api/register-school" : "/api/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            role === "SCHOOL"
              ? {
                  schoolName,
                  npsn: npsn || null,
                  city: city || null,
                  province: province || null,
                  adminFullName,
                  adminEmail,
                  adminPassword: password,
                }
              : { role, fullName, email, password, schoolId }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Pendaftaran gagal");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthShell title="Pendaftaran Terkirim">
        <AlertPanel tone="success" title="Berhasil dikirim">
          {role === "SCHOOL"
            ? "Pendaftaran sekolah kamu sedang menunggu persetujuan Admin Platform. Kamu akan bisa masuk setelah disetujui."
            : "Akun kamu sedang menunggu persetujuan admin sekolah. Kamu akan bisa masuk setelah disetujui."}
        </AlertPanel>
        <Link
          href="/login"
          className="mt-5 block text-center text-[13px] font-semibold text-primary hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Buat Akun"
      subtitle="Bergabung dengan Catch Me Up"
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <p>
            Mendaftar sebagai orang tua?{" "}
            <span className="text-ink-secondary/80">
              Gunakan tautan undangan dari sekolah anak kamu.
            </span>
          </p>
          <p>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <AlertPanel tone="danger" title="Tidak dapat mendaftar">
            {error}
          </AlertPanel>
        </div>
      )}

      <div className="mb-5">
        <AuthFieldLabel htmlFor="role-group">Saya mendaftar sebagai</AuthFieldLabel>
        <div id="role-group" role="group" className="grid grid-cols-3 gap-2">
          {roleOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => selectRole(value)}
              disabled={loading}
              aria-pressed={role === value}
              className={`flex flex-col items-center gap-1.5 rounded-button border px-2 py-3 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                role === value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface text-ink-secondary hover:border-primary/30 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {role === "SCHOOL" ? (
          <>
            <div>
              <AuthFieldLabel htmlFor="schoolName" required>
                Nama Sekolah
              </AuthFieldLabel>
              <Input
                id="schoolName"
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMA Negeri 1 Bandung"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <AuthFieldLabel htmlFor="npsn">NPSN (opsional)</AuthFieldLabel>
                <Input
                  id="npsn"
                  type="text"
                  value={npsn}
                  onChange={(e) => setNpsn(e.target.value)}
                  placeholder="20xxxxxx"
                  disabled={loading}
                />
              </div>
              <div>
                <AuthFieldLabel htmlFor="city">Kota (opsional)</AuthFieldLabel>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bandung"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <AuthFieldLabel htmlFor="province">Provinsi (opsional)</AuthFieldLabel>
              <Input
                id="province"
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Jawa Barat"
                disabled={loading}
              />
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-secondary">
                Data Admin Sekolah
              </p>

              <div className="space-y-4">
                <div>
                  <AuthFieldLabel htmlFor="adminFullName" required>
                    Nama Lengkap
                  </AuthFieldLabel>
                  <Input
                    id="adminFullName"
                    type="text"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="Nama kamu"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <AuthFieldLabel htmlFor="adminEmail" required>
                    Email
                  </AuthFieldLabel>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@sekolah.sch.id"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
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
              />
            </div>

            <div>
              <AuthFieldLabel htmlFor="school-combobox" required>
                Sekolah
              </AuthFieldLabel>
              <SchoolCombobox value={schoolId} onChange={(id) => setSchoolId(id)} disabled={loading} />
              <p className="mt-1.5 text-[11px] text-ink-secondary">
                Pilih sekolah kamu dari daftar. Sekolah harus sudah terdaftar dan aktif.
              </p>
            </div>
          </>
        )}

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
          {loading ? "Memproses..." : "Daftar"}
        </Button>
      </form>
    </AuthShell>
  );
}
