"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { DriverArmada, Kendaraan, Ritase, RitaseDetail } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** List kendaraan. */
export function useKendaraan() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-kendaraan"],
    queryFn: () => get<Kendaraan[]>("/armada/kendaraan", { token }),
    enabled: !!token,
  });
}

/** List driver armada. */
export function useDriver() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-driver"],
    queryFn: () => get<DriverArmada[]>("/armada/driver", { token }),
    enabled: !!token,
  });
}

/** List ritase (kapten/direktur lihat semua; driver ter-scope oleh backend). */
export function useRitase() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-ritase"],
    queryFn: () => get<Ritase[]>("/armada/ritase", { token }),
    enabled: !!token,
  });
}

/** Detail ritase (termasuk rute stops + timeline events). */
export function useRitaseDetail(id: number | string | undefined) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-ritase", id],
    queryFn: () => get<RitaseDetail>(`/armada/ritase/${id}`, { token }),
    enabled: !!token && !!id,
  });
}