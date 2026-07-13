import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "PROpEx Ideas de Mejora",
  description: "Sistema de Ideas de Mejora PROpEx",
  icons: {
    icon: "/brand/mejora-continua-logo-rojo.png",
    apple: "/brand/mejora-continua-logo-rojo.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
