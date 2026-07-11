import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catch Up — Platform Asesmen AI untuk Sekolah Indonesia",
  description: "Platform asesmen berbasis AI untuk siswa, guru, orang tua, dan admin sekolah Indonesia. Didukung AI Grounded pada materi kurikulum."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
