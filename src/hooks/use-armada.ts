"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { DriverArmada, Kendaraan, Ritase, RitaseDetail, GpsPoint } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** List kendaraan. */
export function useKendaraan() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-kendaraan"],
    queryFn: () => get<Kendaraan[]>("/armada/kendaraan", { token }),
    enabled: !!token,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** List driver armada. */
export function useDriver() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-driver"],
    queryFn: () => get<DriverArmada[]>("/armada/driver", { token }),
    enabled: !!token,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** List ritase (tower_control/direktur lihat semua; driver ter-scope oleh backend). */
export function useRitase(startDate?: string, endDate?: string) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-ritase", startDate, endDate],
    queryFn: () => {
      let url = "/armada/ritase";
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (params.toString()) url += `?${params.toString()}`;
      return get<Ritase[]>(url, { token });
    },
    enabled: !!token,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Detail ritase (termasuk rute stops + timeline events). */
export function useRitaseDetail(id: number | string | undefined) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["armada-ritase", id],
    queryFn: () => get<RitaseDetail>(`/armada/ritase/${id}`, { token }),
    enabled: !!token && !!id,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

/** GPS history untuk satu ritase — titik-titik rute yang dilewati driver. */
export function useGpsHistory(idRitase: number | null) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["gps-history", idRitase],
    queryFn: () => get<GpsPoint[]>(`/armada/ritase/${idRitase}/gps-history`, { token }),
    enabled: !!token && !!idRitase,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}