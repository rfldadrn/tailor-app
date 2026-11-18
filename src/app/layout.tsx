import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dunia Busana - Sistem Kas",
  description: "Sistem kas untuk Dunia Busana.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
