"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { DashboardAnalisis, DashboardSummary } from "@/types/dashboard";

/**
 * Dashboard Keseluruhan — fallback polling tiap FALLBACK_POLL_MS.
 * Data utama datang via SSE (RealtimeSync) — polling cuma jaring pengaman
 * kalau koneksi realtime putus. Initial fetch tetap via useQuery.
 */
export const FALLBACK_POLL_MS = 60_000;

export function useDashboardSummary() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => get<DashboardSummary>("/dashboard/summary", { token }),
    enabled: !!token,
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
    refetchInterval: FALLBACK_POLL_MS,
  });
}
