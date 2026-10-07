"use client";
import { MapPin } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { ROLE_MENU } from "@/lib/constants";
import { LIVE_MAP_PATH, LIVE_MAP_RETURN_KEY, safeMapReturn } from "@/lib/live-map-navigation";
export function LiveMapsLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const allowed = role ? (ROLE_MENU[role as keyof typeof ROLE_MENU] ?? []).includes("armada-live-map") : false;
  useEffect(() => {
    if (pathname.replace(/\/$/, "") === LIVE_MAP_PATH) return;
    try { sessionStorage.setItem(LIVE_MAP_RETURN_KEY, safeMapReturn(window.location.pathname + window.location.search + window.location.hash)); } catch { /* Navigation also carries an explicit return path. */ }
  }, [pathname]);
  if (!allowed || pathname.replace(/\/$/, "") === LIVE_MAP_PATH) return null;
  return <button type="button" aria-label="Buka Live Maps layar penuh" onClick={() => {
    const from = safeMapReturn(window.location.pathname + window.location.search + window.location.hash);
    router.push(`${LIVE_MAP_PATH}?from=${encodeURIComponent(from)}`);
  }} className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#0c1e3a] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:right-6"><MapPin aria-hidden="true" className="h-5 w-5" />Live Maps</button>;
}