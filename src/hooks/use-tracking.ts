"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { normalizeTripEvents } from "@/lib/normalize-trip-events";
import type { DriverPickupItem, DriverPickupLog, TrackingCheckpoint, TrackingMap } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** Interval polling peta live (fallback). Data utama datang via SSE — polling
 *  cuma jaring pengaman kalau koneksi realtime putus. 5 detik supaya gak stale. */
export const LIVE_MAP_POLL_INTERVAL = 5_000;

/** Data peta live: posisi terbaru setiap kendaraan + lokasi seller. */
export function useTrackingMap() {
  const token = useAuthStore(tokenSelector);

  return useQuery({
    queryKey: ["tracking-map"],
    queryFn: async () => {
      const data = await get<TrackingMap>("/armada/tracking/map", { token });
      if (data && Array.isArray(data.vehicles)) {
        const seen = new Set<number>();
        data.vehicles = data.vehicles.filter((v) => {
          if (!v || v.id_kendaraan == null) return false;
          if (seen.has(v.id_kendaraan)) return false;
          seen.add(v.id_kendaraan);
          return true;
        });
      }
      return data;
    },
    enabled: !!token,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Polling 5s SELALU aktif — jaring pengaman (lihat use-dashboard.ts).
    refetchInterval: LIVE_MAP_POLL_INTERVAL,
  });
}

/** List data driver pickup beserta status muatannya hari ini. */
export function useDriverPickups() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["driver-pickups"],
    queryFn: () => get<DriverPickupItem[]>("/armada/pickup/drivers", { token }),
    enabled: !!token,
    staleTime: 0,
    refetchInterval: LIVE_MAP_POLL_INTERVAL,
    refetchOnWindowFocus: false,
  });
}

/** Riwayat log muatan driver pickup. */
export function useDriverPickupHistory(idUser: number | null) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["driver-pickup-history", idUser],
    queryFn: () => get<DriverPickupLog[]>(`/armada/pickup/${idUser}/history`, { token }),
    enabled: !!token && !!idUser,
    staleTime: 15_000,
  });
}

/** Mutasi simpan muatan driver pickup (single). */
export function useSaveDriverPickup() {
  const token = useAuthStore(tokenSelector);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id_user: number;
      nama_driver: string;
      jumlah_barang: number;
      koli?: number;
      ecer?: number;
      high_value?: number;
      status: string;
      catatan?: string;
      asal_seller?: string;
    }) => post<{ message: string }>("/armada/pickup/barang", data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-pickups"] });
      qc.invalidateQueries({ queryKey: ["tracking-map"] });
      qc.invalidateQueries({ queryKey: ["driver-pickup-history"] });
    },
  });
}

/** Mutasi simpan banyak seller sekaligus untuk satu driver pickup (batch). */
export function useSaveDriverPickupBatch() {
  const token = useAuthStore(tokenSelector);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id_user: number;
      nama_driver: string;
      status: string;
      catatan?: string;
      items: Array<{
        asal_seller: string;
        jumlah_barang: number;
        koli?: number;
        ecer?: number;
        high_value?: number;
      }>;
    }) => post<{ message: string }>("/armada/pickup/batch", data, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-pickups"] });
      qc.invalidateQueries({ queryKey: ["tracking-map"] });
      qc.invalidateQueries({ queryKey: ["driver-pickup-history"] });
    },
  });
}

/** Riwayat seluruh log pickup driver dari tabel driver_pickup_log. */
export function useAllDriverPickupHistory(params?: {
  id_user?: number;
  start_date?: string;
  end_date?: string;
  tanggal?: string;
  status?: string;
  limit?: number;
}) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["driver-pickup-all-history", params],
    queryFn: () =>
      get<DriverPickupLog[]>("/armada/pickup/history", {
        token,
        query: {
          id_user: params?.id_user ? params.id_user : undefined,
          start_date: params?.start_date,
          end_date: params?.end_date,
          tanggal: params?.tanggal,
          status: params?.status && params.status !== "all" ? params.status : undefined,
          limit: params?.limit,
        },
      }),
    enabled: !!token,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/** Riwayat status (checkpoint) untuk satu kendaraan atau satu driver, opsional filter tanggal (YYYY-MM-DD).
 *  Cache 30s — jarang berubah & di-invalidate via SSE untuk kendaraan terpilih. */
export function useTrackingHistory(idKendaraan: number | null, tanggal?: string, idDriver?: number | null) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["tracking-history", idKendaraan, idDriver, tanggal],
    select: (events: TrackingCheckpoint[]) => normalizeTripEvents(events),
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
