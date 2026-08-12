"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  DriverPerformance,
  SellerAnalytics,
  TrendPoint,
} from "@/types/analytics";

const tokenSelector = (s: { token: string | null }) => s.token;

function useAnalytics<T>(
  key: string,
  path: string,
  from: string,
  to: string
) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: [key, from, to],
    queryFn: () => get<T>(path, { token, query: { from, to } }),
    enabled: !!token && !!from && !!to,
  });
}

/** Trend harian (tanggal jadwal ritase): ritase/AWB/koli + arah outgoing/incoming. */
export function useAnalyticsTrend(from: string, to: string) {
  return useAnalytics<TrendPoint[]>(
    "analytics-trend",
    "/dashboard/analytics/trend",
    from,
    to
  );
}

/** Performa per driver dalam periode. */
export function useAnalyticsDrivers(from: string, to: string) {
  return useAnalytics<DriverPerformance[]>(
    "analytics-drivers",
    "/dashboard/analytics/drivers",
    from,
    to
  );
}

/** Analitik per seller: kunjungan, durasi bongkar, muatan. */
export function useAnalyticsSellers(from: string, to: string) {
  return useAnalytics<SellerAnalytics[]>(
    "analytics-sellers",
    "/dashboard/analytics/sellers",
    from,
    to
  );
}
