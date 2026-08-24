import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DisclosureManager } from "@/components/disclosure-manager";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  // Plantilla en vez de titulo fijo: las 40 paginas compartian el mismo rotulo, asi que
  // un gerente con seis pestanas abiertas no distinguia Kaizen de GENBA, y el historial y
  // los marcadores del navegador tampoco servian de nada.
  title: { default: "PROpEx Ideas de Mejora", template: "%s · PROpEx" },
  description: "Sistema de Ideas de Mejora PROpEx",
  icons: {
    icon: "/brand/mejora-continua-logo-rojo.png",
    apple: "/brand/mejora-continua-logo-rojo.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <DisclosureManager />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
