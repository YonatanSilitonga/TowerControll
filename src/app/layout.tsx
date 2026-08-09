import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { QueryProvider } from "@/providers/query-provider";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tower Control - PT Sentral Logistik Bersama",
    template: "%s | Tower Control",
  },
  description:
    "Dashboard operasional Tower Control: monitoring armada, supply chain, dan manajemen tower fisik.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <NextTopLoader color="#034075" showSpinner={false} height={3} />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
