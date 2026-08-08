"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TrackingCheckpoint, TrackingMap } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** Interval polling peta live (ms). Lebih rapat daripada dashboard karena posisi truk. */
export const LIVE_MAP_POLL_INTERVAL = 10_000;

/** Data peta live: posisi terbaru setiap kendaraan + lokasi seller. */
export function useTrackingMap() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["tracking-map"],
    queryFn: () => get<TrackingMap>("/armada/tracking/map", { token }),
    enabled: !!token,
    refetchInterval: LIVE_MAP_POLL_INTERVAL,
  });
}

/** Riwayat status (checkpoint) untuk satu kendaraan, opsional filter tanggal (YYYY-MM-DD).
 *  Auto-refresh tiap 15s biar timeline ikut update saat ada event baru. */
export function useTrackingHistory(idKendaraan: number | null, tanggal?: string) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["tracking-history", idKendaraan, tanggal],
    queryFn: () =>
      get<TrackingCheckpoint[]>("/armada/tracking/history", {
        token,
        query: { kendaraan_id: idKendaraan ?? undefined, tanggal },
      }),
    enabled: !!token && idKendaraan != null,
    refetchInterval: 15_000,
  });
}
