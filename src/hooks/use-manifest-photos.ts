"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ManifestPhotoItem } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

interface ManifestPhotoFilter {
  tanggal?: string;
  driver_id?: number | null;
  search?: string;
}

export function useManifestPhotos(filter?: ManifestPhotoFilter) {
  const token = useAuthStore(tokenSelector);

  return useQuery({
    queryKey: ["manifest-photos", filter?.tanggal, filter?.driver_id, filter?.search],
    queryFn: () =>
      get<ManifestPhotoItem[]>("/admin/manifest-photos", {
        token,
        query: {
          tanggal: filter?.tanggal || undefined,
          driver_id: filter?.driver_id ?? undefined,
          search: filter?.search || undefined,
        },
      }),
    enabled: !!token,
    refetchInterval: 15000, // Refresh tiap 15 detik untuk memantau foto baru yang masuk
  });
}
