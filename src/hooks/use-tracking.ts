"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { normalizeTripEvents } from "@/lib/normalize-trip-events";
import { hasActiveSession } from "@/lib/utils";
import type { DriverPickupItem, DriverPickupLog, TrackingCheckpoint, TrackingMap, TrackingVehicle } from "@/types/armada";

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
        // Gabungkan driver pickup dari data.driver_pickups jika belum tercakup di vehicles
        const existingDriverNames = new Set(
          data.vehicles.map((v) => (v.nama_driver || "").toLowerCase()).filter(Boolean)
        );
        const existingVehicleIds = new Set(
          data.vehicles.map((v) => v.id_kendaraan).filter(Boolean)
        );

        if (Array.isArray(data.driver_pickups)) {
          data.driver_pickups.forEach((dp, idx) => {
            const nameLower = (dp.nama_driver || dp.username || "").toLowerCase();
            const matchedVehicle = data.vehicles.find(
              (v) => (v.nama_driver || "").toLowerCase() === nameLower
            );

            // Cek apakah driver sedang aktif menuju seller tertentu atau baru input di seller
            const sellerName = (dp.asal_seller || "").toLowerCase().trim();
            const matchedSeller =
              sellerName && sellerName !== "gudang" && Array.isArray(data.sellers)
                ? data.sellers.find(
                    (s) => s.nama_seller && sellerName.includes(s.nama_seller.toLowerCase())
                  )
                : null;

            const isAtSeller =
              matchedSeller &&
              matchedSeller.latitude &&
              matchedSeller.longitude &&
              (dp.status === "menuju_seller" || dp.status === "sedang menuju");

            // Koordinat pusat: di seller jika aktif, atau di gudang outgoing jika selesai/standby
            const baseLat = isAtSeller ? matchedSeller.latitude : -6.1741458;
            const baseLng = isAtSeller ? matchedSeller.longitude : 106.6576157;

            // Sebarkan posisi marker secara melingkar rapi agar tidak saling bertumpuk (overlap)
            const count = Math.max(1, (data.driver_pickups ?? []).length);
            const angle = (idx * 2 * Math.PI) / count;
            const spreadRadius = isAtSeller ? 0.0004 : 0.0016; // ~40m di seller, ~170m di gudang
            const offsetLat = Math.sin(angle) * spreadRadius;
            const offsetLng = Math.cos(angle) * spreadRadius;

            if (matchedVehicle) {
              matchedVehicle.role_driver = "driver_pickup";
              matchedVehicle.total_awb = dp.jumlah_barang ?? matchedVehicle.total_awb;
              matchedVehicle.total_koli = dp.koli ?? matchedVehicle.total_koli;
              matchedVehicle.total_eceran = dp.ecer ?? matchedVehicle.total_eceran;
              matchedVehicle.total_high_value = dp.high_value ?? matchedVehicle.total_high_value;
              if (dp.session_online !== undefined) matchedVehicle.session_online = dp.session_online;
              if (dp.last_login !== undefined) matchedVehicle.last_login = dp.last_login;
              if (isAtSeller) {
                matchedVehicle.latitude = baseLat + offsetLat;
                matchedVehicle.longitude = baseLng + offsetLng;
              }
            } else if (!existingDriverNames.has(nameLower)) {
              // HANYA buat marker jika driver pickup BENAR-BENAR SEDANG LOGIN (bukan logout)
              const isDpOnline = dp.session_online || hasActiveSession(dp.last_login);
              if (isDpOnline) {
                const syntheticId = 9000 + (dp.id_user || (idx + 1));
                if (!existingVehicleIds.has(syntheticId)) {
                  existingVehicleIds.add(syntheticId);
                  existingDriverNames.add(nameLower);

                  data.vehicles.push({
                    id_kendaraan: syntheticId,
                    plat_nomor: dp.nama_driver?.toLowerCase() === "pickup" ? "B 9278 PDD" : `B 9${String(dp.id_user || idx + 1).padStart(3, "0")} PDD`,
                    tipe: "pickup",
                    id_driver: dp.id_user,
                    nama_driver: dp.nama_driver || dp.username,
                    role_driver: "driver_pickup",
                    status: dp.status || "standby",
                    latitude: baseLat + offsetLat,
                    longitude: baseLng + offsetLng,
                    kecepatan: 0,
                    offline: false,
                    last_update: dp.updated_at || new Date().toISOString(),
                    last_login: dp.last_login ?? new Date().toISOString(),
                    session_online: true,
                    total_awb: dp.jumlah_barang || 0,
                    total_koli: dp.koli || 0,
                    total_eceran: dp.ecer || 0,
                    total_high_value: dp.high_value || 0,
                  } as any);
                }
              }
            }
          });
        }

        // Deduplikasi pintar: prioritaskan kendaraan dengan role 'driver_pickup' jika id_kendaraan bentrok
        const vehicleMap = new Map<number, TrackingVehicle>();
        for (const v of data.vehicles) {
          if (!v || v.id_kendaraan == null) continue;
          const current = vehicleMap.get(v.id_kendaraan);
          if (!current || v.role_driver === "driver_pickup") {
            vehicleMap.set(v.id_kendaraan, v);
          }
        }
        data.vehicles = Array.from(vehicleMap.values());
      }
      return data;
    },
    enabled: !!token,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
