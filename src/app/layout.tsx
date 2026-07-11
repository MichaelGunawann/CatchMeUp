import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduAssess — Platform Asesmen AI untuk Sekolah",
  description: "Platform asesmen berbasis AI untuk siswa, guru, orang tua, dan admin sekolah Indonesia."
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
