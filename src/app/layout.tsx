import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { QueryProvider } from "@/providers/query-provider";
import { SplashScreen } from "@/components/splash-screen";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tower Control - PT Sentral Logistik Bersama",
    template: "%s | Tower Control",
  },
  description:
    "Dashboard operasional Tower Control: monitoring armada, supply chain, dan manajemen tower fisik.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} font-sans antialiased`}>
        <NextTopLoader color="#0c1e3a" showSpinner={false} height={3} />
        <QueryProvider>
          <SplashScreen />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

