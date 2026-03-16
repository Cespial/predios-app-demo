import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "tensor.lat — Inteligencia Territorial para Parqueaderos",
  description: "Plataforma de análisis espacial que identifica predios públicos óptimos para desarrollo de infraestructura de estacionamiento en capitales colombianas. Datos reales de datos.gov.co, Google Places y OpenStreetMap.",
  keywords: [
    "tensor.lat",
    "inteligencia territorial",
    "predios",
    "parqueaderos",
    "estacionamiento",
    "Colombia",
    "análisis espacial",
    "datos.gov.co",
    "catastro",
    "urbanismo",
  ],
  openGraph: {
    title: "tensor.lat — Inteligencia Territorial para Parqueaderos",
    description: "Plataforma de análisis espacial que identifica predios públicos óptimos para desarrollo de infraestructura de estacionamiento en capitales colombianas.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-100`}
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </body>
    </html>
  );
}
