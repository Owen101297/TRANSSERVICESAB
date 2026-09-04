import type { Metadata } from "next";
import "./globals.css";

// Nota: las fuentes se cargan vía @import en globals.css en lugar de next/font/google.
// Si prefieres next/font/google (recomendado en producción: self-hosting automático,
// sin request externo del navegador), cambia esto cuando tengas el proyecto corriendo
// con acceso normal a internet — es un cambio de una línea.

export const metadata: Metadata = {
  title: "TRANS SERVICES A&B",
  description: "Sistema de Gestión Empresarial & Portal del Conductor — TRANS SERVICES A&B",
  icons: {
    icon: [
      { url: "/brand/logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/brand/logo.png" },
    ],
    shortcut: [
      { url: "/brand/logo.png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-asphalt-950 text-paper-50">{children}</body>
    </html>
  );
}
