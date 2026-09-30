"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ManifestPhotoItem, ManifestPenjemputanResponse } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

interface ManifestPhotoFilter {
  tanggal?: string;
  driver_id?: number | null;
  search?: string;
  jenis_ritase?: string;
  ritase_ke?: number | null;
}

export function useManifestPhotos(filter?: ManifestPhotoFilter) {
  const token = useAuthStore(tokenSelector);

  return useQuery({
    queryKey: ["manifest-photos", filter?.tanggal, filter?.driver_id, filter?.search, filter?.jenis_ritase, filter?.ritase_ke],
    queryFn: () =>
      get<ManifestPhotoItem[]>("/manifest-photos", {
        token,
        query: {
          tanggal: filter?.tanggal || undefined,
          driver_id: filter?.driver_id ?? undefined,
          search: filter?.search || undefined,
          jenis_ritase: filter?.jenis_ritase || undefined,
          ritase_ke: filter?.ritase_ke ?? undefined,
        },
      }),
    enabled: !!token,
    refetchInterval: 15000,
  });
}

/** Serah terima kapten (diambil & sisa) — melengkapi manifest-photos. */
export function useManifestPenjemputan(filter?: ManifestPhotoFilter) {
  const token = useAuthStore(tokenSelector);

  return useQuery({
    queryKey: ["manifest-penjemputan", filter?.tanggal, filter?.search, filter?.jenis_ritase, filter?.ritase_ke],
    queryFn: () =>
      get<ManifestPenjemputanResponse>("/manifest-konfirmasi-penjemputan", {
        token,
        query: {
          tanggal: filter?.tanggal || undefined,
          search: filter?.search || undefined,
          jenis_ritase: filter?.jenis_ritase || undefined,
          ritase_ke: filter?.ritase_ke ?? undefined,
        },
      }),
    enabled: !!token,
    refetchInterval: 15000,
  });
}
