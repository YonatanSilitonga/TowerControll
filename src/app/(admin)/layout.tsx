"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

function BootLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo-icon.png" alt="Tower Control" width={40} height={40} priority className="h-10 w-10 animate-pulse object-contain" />
        <p className="text-sm text-slate-400">Memuat panel admin…</p>
      </div>
    </main>
  );
}

/**
 * Admin layout — hanya role "admin" yang boleh akses.
 * Kalau bukan admin, redirect ke /login.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const st = useAuthStore.getState();
      if (st.token) {
        try { await st.fetchMe(); } catch { /* handled by store */ }
      }
      if (!active) return;
      setReady(true);

      const after = useAuthStore.getState();
      if (!after.token) {
        router.replace("/admin/login");
        return;
      }
      // Hanya admin yang boleh akses
      if (after.user && after.user.role !== "admin") {
        after.clear();
        router.replace("/admin/login");
      }
    })();

    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasHydrated || !ready) return <BootLoader />;
  if (!token) return <BootLoader />;

  return <>{children}</>;
}
