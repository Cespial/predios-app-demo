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
  title: "tensor.lat — Plataforma de Inversión en Parqueaderos",
  description: "Identifique los mejores lotes públicos para construir parqueaderos rentables en las principales ciudades de Colombia. Datos reales de IGAC, datos.gov.co, Google Places y OpenStreetMap.",
  keywords: [
    "tensor.lat",
    "inversión parqueaderos",
    "lotes públicos",
    "parqueaderos",
    "estacionamiento",
    "Colombia",
    "análisis espacial",
    "datos.gov.co",
    "catastro",
    "ROI parqueaderos",
  ],
  openGraph: {
    title: "tensor.lat — Plataforma de Inversión en Parqueaderos",
    description: "Identifique los mejores lotes públicos para construir parqueaderos rentables en las principales ciudades de Colombia.",
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
