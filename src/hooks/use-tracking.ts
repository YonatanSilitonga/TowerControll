"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { TrackingCheckpoint, TrackingMap } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** Interval polling peta live (fallback). Data utama datang via SSE — polling
 *  cuma jaring pengaman kalau koneksi realtime putus. */
export const LIVE_MAP_POLL_INTERVAL = 60_000;

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
    // Polling 60s SELALU aktif — jaring pengaman (lihat use-dashboard.ts).
    refetchInterval: LIVE_MAP_POLL_INTERVAL,
  });
}

/** Riwayat status (checkpoint) untuk satu kendaraan, opsional filter tanggal (YYYY-MM-DD).
 *  Cache 30s — jarang berubah & di-invalidate via SSE untuk kendaraan terpilih. */
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
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}