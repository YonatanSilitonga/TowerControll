"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

function BootLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo-icon.png" alt="Tower Control" width={40} height={40} priority className="h-10 w-10 animate-pulse object-contain" />
        <p className="text-sm text-slate-400">Memuat panel admin…</p>
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) { setReady(true); return; }

    let active = true;
    (async () => {
      const st = useAuthStore.getState();
      if (st.token) {
        try { await st.fetchMe(); } catch { /* handled by store */ }
      }
      if (!active) return;
      setReady(true);

      const after = useAuthStore.getState();
      if (!after.token) { router.replace("/admin/login"); return; }
      if (after.user && after.user.role !== "admin") {
        after.clear();
        router.replace("/admin/login");
      }
    })();
    return () => { active = false; };
  }, [isLoginPage]);

  if (isLoginPage) return <>{children}</>;
  if (!hasHydrated || !ready) return <BootLoader />;
  if (!token) return <BootLoader />;

  return <>{children}</>;
}
