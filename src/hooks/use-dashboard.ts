"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import type { DashboardAnalisis, DashboardSummary } from "@/types/dashboard";

/**
 * Dashboard Keseluruhan — data utama datang via SSE (RealtimeSync).
 * REST polling 60s SELALU aktif sebagai jaring pengaman — pernah kejadian
 * status SSE "connected" palsu (proxy buffering) bikin polling mati → data
 * beku total. Sekarang: SSE sehat → update ~3 detik; SSE mati → ganti ≤60 detik.
 */
export const FALLBACK_POLL_MS = 60_000;

export function useDashboardSummary() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => get<DashboardSummary>("/dashboard/summary", { token }),
    enabled: !!token,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: FALLBACK_POLL_MS,
  });
}

/** Analisis dashboard (durasi proses + bottleneck + alert anomali). */
export function useDashboardAnalisis() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["dashboard-analisis"],
    queryFn: () => get<DashboardAnalisis>("/dashboard/analisis", { token }),
    enabled: !!token,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: FALLBACK_POLL_MS,
  });
}