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
    queryFn: () => get<AdminRitaseItem[]>("/ritases", { token, query: { tanggal } }),
    enabled: true,
  });
}

export interface MasterOptions {
  drivers: Array<{ id_driver: number; nama_driver: string; jabatan: string; status_driver: string }>;
  kendaraan: Array<{ id_kendaraan: number; plat_nomor: string; jenis_kendaraan: string; status_kendaraan: string }>;
  drop_points: Array<{ id_drop_point: number; nama_drop_point: string; kode_dp: string }>;
  sellers: Array<{ id_seller: number; nama_seller: string; kode_seller: string }>;
  gudangs: Array<{ id_gudang: number; nama_gudang: string }>;
  driver_jenis: Array<{ id_driver: number; ritase_ke: number; jenis: string }>;
  jam_ritase: Array<{ jenis: string; ritase_ke: number; jam_mulai: string; jam_selesai: string }>;
}

/** Fetch master options (drivers, kendaraan, drop_points, sellers, gudangs). */
export function useAdminMasterOptions() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["admin-master-options"],
    queryFn: () => get<MasterOptions>("/master-options", { token }),
  });
}

export interface PreviewRoute {
  id_driver: number;
  nama_driver: string;
  id_kendaraan: number;
  plat_nomor: string;
  ritase_ke: number;
  jenis_ritase?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  tanggal?: string;
  tanggal_label?: string;
  stops: PreviewStop[];
}

export interface PreviewStop {
  urutan: number;
  jenis_stop: string;
  id_lokasi?: number;
  nama_lokasi: string;
  keterangan: string;
}

export interface PreviewGenerateResponse {
  total_preview: number;
  total_hari_ini: number;
  total_besok: number;
  routes: PreviewRoute[];
}

/** Fetch preview for 1-Click Auto-Generate Daily Ritases */
export function usePreviewDailyRitase() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["admin-ritase-preview"],
    queryFn: () => get<PreviewGenerateResponse>("/ritase/generate/preview", { token }),
    enabled: false, // fetch on demand when modal opens
  });
}

/** 1-Click Auto-Generate Daily Ritases Mutation */
export function useGenerateDailyRitase() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { tanggal?: string; routes: unknown[] }) =>
      post<{ total_generated: number; message: string }>("/ritase/generate", payload ?? {}, { token }),
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
      jam_mulai?: string;
      jam_selesai?: string;
      stops: any[];
    }) => post<{ id_ritase: number; message: string }>("/ritase", data, { token }),
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
    mutationFn: ({ idRitase, data }: { idRitase: number; data: Partial<AdminRitaseItem> & { jam_mulai?: string; jam_selesai?: string } }) =>
      put<{ message: string }>(`/ritase/${idRitase}`, data, { token }),
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
    mutationFn: (idRitase: number) => del<{ message: string }>(`/ritase/${idRitase}`, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ritases"] });
    },
  });
}
