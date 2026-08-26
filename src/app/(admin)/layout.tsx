"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/stores/auth-store";

function BootLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo-icon.png" alt="Tower Control" width={40} height={40} priority className="h-10 w-10 animate-pulse object-contain" />
        <p className="text-sm text-muted-foreground">Memuat…</p>
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
    // Login page — no guard needed
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }

    let active = true;
    (async () => {
      const st = useAuthStore.getState();
      if (st.token) {
        try { await st.fetchMe(); } catch { /* handled */ }
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
  }, [pathname]);

  // Login page — plain, no sidebar/header
  if (isLoginPage) return <>{children}</>;

  // Boot guard
  if (!hasHydrated || !ready) return <BootLoader />;
  if (!token) return <BootLoader />;

  // Admin pages — same Sidebar + Header as dashboard
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
