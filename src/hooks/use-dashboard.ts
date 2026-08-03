"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { POLL_INTERVAL } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import type { DashboardSummary } from "@/types/dashboard";

/**
 * Dashboard Keseluruhan — polling otomatis tiap POLL_INTERVAL ms.
 * Siap di-upgrade ke WebSocket nanti.
 */
export function useDashboardSummary() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => get<DashboardSummary>("/dashboard/summary", { token }),
    enabled: !!token,
    refetchInterval: POLL_INTERVAL,
  });
}
