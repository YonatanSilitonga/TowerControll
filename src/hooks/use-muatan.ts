"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MuatanSummary } from "@/types/muatan";

export function useMuatanSummary(tanggal: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["muatan-summary", tanggal],
    queryFn: () =>
      get<MuatanSummary>("/muatan/summary", {
        token,
        query: { tanggal },
      }),
    enabled: !!token && !!tanggal,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}
