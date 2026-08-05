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

/** Riwayat status (checkpoint) untuk satu kendaraan. */
export function useTrackingHistory(idKendaraan: number | null) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["tracking-history", idKendaraan],
    queryFn: () =>
      get<TrackingCheckpoint[]>("/armada/tracking/history", {
        token,
        query: { kendaraan_id: idKendaraan ?? undefined },
      }),
    enabled: !!token && idKendaraan != null,
  });
}
