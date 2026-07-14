import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>404</h1>
      <p style={{ color: "#666" }}>Halaman tidak ditemukan.</p>
      <Link href="/" style={{ marginTop: "1rem", color: "#2563eb" }}>Kembali ke Beranda</Link>
    </div>
  );
}
