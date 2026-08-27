"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ALLOWED_WEB_ROLES } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import { RealtimeSync } from "@/hooks/use-realtime";

/** Loader brand mini — dipakai saat boot validasi, biar gak ada teks polos. */
function BootLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/logo-icon.png"
          alt="Tower Control"
          width={40}
          height={40}
          priority
          className="h-10 w-10 animate-pulse object-contain"
        />
        <p className="text-sm text-muted-foreground">Memuat…</p>
      </div>
    </main>
  );
}

/**
 * Layout dashboard — guard yang benar:
 * - Tunggu store ke-hydrate (baca localStorage) dulu, biar refresh gak salah redirect.
 * - Kalau ada token → validasi via /auth/me (keep kalau valid, clear kalau expired).
 * - Web khusus direktur/kapten (driver pakai mobile).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const st = useAuthStore.getState();
      // Validasi token kalau ada (keep/clear otomatis di fetchMe)
      if (st.token) {
        try {
          await st.fetchMe();
        } catch {
          /* fetchMe sudah clear kalau gagal */
        }
      }
      if (!active) return;
      setReady(true);

      const after = useAuthStore.getState();
      if (!after.token) {
        router.replace("/login");
        return;
      }
      // Admin harus pakai /admin, bukan dashboard biasa
      if (after.user && after.user.role === "admin") {
        router.replace("/admin");
        return;
      }
      // Role tidak diizinkan untuk web → keluar
      if (after.user && !ALLOWED_WEB_ROLES.includes(after.user.role)) {
        after.clear();
        router.replace("/login");
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tunggu store selesai hydrate & validasi boot
  if (!hasHydrated || !ready) {
    return <BootLoader />;
  }

  if (!token) {
    return <BootLoader />;
  }

  return (
    <div className="flex min-h-screen">
      <RealtimeSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}