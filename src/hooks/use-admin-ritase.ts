"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, post, put } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { AdminRitaseItem } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/** Fetch list of admin ritases for a specific date (defaults to today). */
export function useAdminRitase(tanggal?: string) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["admin-ritases", tanggal],
    queryFn: () => get<AdminRitaseItem[]>("/admin/ritases", { token, query: { tanggal } }),
    enabled: true,
  });
}

export interface MasterOptions {
  drivers: Array<{ id_driver: number; nama_driver: string; jabatan: string }>;
  kendaraan: Array<{ id_kendaraan: number; plat_nomor: string; jenis_kendaraan: string }>;
  drop_points: Array<{ id_drop_point: number; nama_drop_point: string; kode_dp: string }>;
  sellers: Array<{ id_seller: number; nama_seller: string; kode_seller: string }>;
  gudangs: Array<{ id_gudang: number; nama_gudang: string; jenis: string }>;
}

/** Fetch master options (drivers, kendaraan, drop_points, sellers, gudangs). */
export function useAdminMasterOptions() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["admin-master-options"],
    queryFn: () => get<MasterOptions>("/admin/master-options", { token }),
  });
}

export interface PreviewRoute {
  id_driver: number;
  nama_driver: string;
  id_kendaraan: number;
  plat_nomor: string;
  ritase_ke: number;
  stops: PreviewStop[];
}

export interface PreviewStop {
  urutan: number;
  jenis_stop: string;
  nama_lokasi: string;
  keterangan: string;
}

export interface PreviewGenerateResponse {
  total_preview: number;
  routes: PreviewRoute[];
}

/** Fetch preview for 1-Click Auto-Generate Daily Ritases */
export function usePreviewDailyRitase() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["admin-ritase-preview"],
    queryFn: () => get<PreviewGenerateResponse>("/admin/ritase/generate/preview", { token }),
    enabled: false, // fetch on demand when modal opens
  });
}

/** 1-Click Auto-Generate Daily Ritases Mutation */
export function useGenerateDailyRitase() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => post<{ total_generated: number; message: string }>("/admin/ritase/generate", {}, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ritases"] });
    },
  });
}

/** Create Ritase Mutation */
export function useCreateRitase() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      tanggal?: string;
      id_driver: number;
      id_kendaraan: number;
      id_drop_point: number;
      ritase_ke: number;
      stops: any[];
    }) => post<{ id_ritase: number; message: string }>("/admin/ritase", data, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ritases"] });
    },
  });
}

/** Update Ritase Mutation */
export function useUpdateRitase() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idRitase, data }: { idRitase: number; data: Partial<AdminRitaseItem> }) =>
      put<{ message: string }>(`/admin/ritase/${idRitase}`, data, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ritases"] });
    },
  });
}

/** Delete Ritase Mutation */
export function useDeleteRitase() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idRitase: number) => del<{ message: string }>(`/admin/ritase/${idRitase}`, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ritases"] });
    },
  });
}
