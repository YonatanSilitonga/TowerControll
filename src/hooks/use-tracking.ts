"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TrackingCheckpoint, TrackingMap } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** Interval polling peta live (fallback). Data utama datang via SSE — polling
 *  cuma jaring pengaman kalau koneksi realtime putus. 5 detik supaya gak stale. */
export const LIVE_MAP_POLL_INTERVAL = 5_000;

/** Data peta live: posisi terbaru setiap kendaraan + lokasi seller. */
export function useTrackingMap() {
  const token = useAuthStore(tokenSelector);

  return useQuery({
    queryKey: ["tracking-map"],
    queryFn: () => get<TrackingMap>("/armada/tracking/map", { token }),
    enabled: !!token,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Polling 5s SELALU aktif — jaring pengaman (lihat use-dashboard.ts).
    refetchInterval: LIVE_MAP_POLL_INTERVAL,
  });
}

/** Riwayat status (checkpoint) untuk satu kendaraan atau satu driver, opsional filter tanggal (YYYY-MM-DD).
 *  Cache 30s — jarang berubah & di-invalidate via SSE untuk kendaraan terpilih. */
export function useTrackingHistory(idKendaraan: number | null, tanggal?: string, idDriver?: number | null) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["tracking-history", idKendaraan, idDriver, tanggal],
    queryFn: () =>
      get<TrackingCheckpoint[]>("/armada/tracking/history", {
        token,
        query: {
          kendaraan_id: idDriver ? undefined : (idKendaraan ?? undefined),
          driver_id: idDriver ?? undefined,
          tanggal,
        },
      }),
    enabled: !!token && (idKendaraan != null || idDriver != null),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}