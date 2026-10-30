"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

const tokenSelector = (s: { token: string | null }) => s.token;

/** Satu grup input pending (belum ter-link ke ritase). */
export interface GudangPendingGroup {
  jenis_ritase: string;
  ritase_ke: number;
  jumlah_input: number;
  total_awb: number;
  total_koli: number;
  total_ecer: number;
  total_hv: number;
}

/** Sisa per grup (input − diambil). */
export interface GudangSisaGroup {
  jenis_ritase: string;
  ritase_ke: number;
  input_awb: number;
  diambil_awb: number;
  sisa_awb: number;
  sisa_koli: number;
  sisa_ecer: number;
  sisa_hv: number;
  sisa_koli_jkt: number;
  sisa_koli_seg: number;
  sisa_koli_btn: number;
  sisa_ecer_jkt: number;
  sisa_ecer_seg: number;
  sisa_ecer_btn: number;
}

/** Satu baris riwayat serah terima. */
export interface GudangRiwayatItem {
  id: number;
  id_ritase: number;
  jenis_ritase: string;
  ritase_ke: number;
  jumlah_awb: number;
  koli_jkt: number;
  koli_seg: number;
  koli_btn: number;
  ecer_jkt: number;
  ecer_seg: number;
  ecer_btn: number;
  total_koli: number;
  total_ecer: number;
  created_at: string;
  kode_ritase: string;
  nama_driver: string;
}

/** Kandidat ritase pengambil (start di Outgoing hari ini + berdriver). */
export interface GudangRitaseCandidate {
  id_ritase: number;
  kode_ritase: string;
  ritase_ke: number;
  status: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  jenis_ritase: string | null;
  nama_driver: string;
  plat_nomor: string;
}

/** Payload input muatan (mirror kapten; HV via alias bila region 0). */
export interface GudangInputPayload {
  jenis_ritase: string;
  ritase_ke: number;
  catatan?: string;
  jumlah_awb: number;
  koli_jkt: number;
  koli_seg: number;
  koli_btn: number;
  ecer_jkt: number;
  ecer_seg: number;
  ecer_btn: number;
  koli_hv: number;
  ecer_hv: number;
  awb_hv: number;
}

/** Payload konfirmasi pengambilan ke ritase driver. */
export interface GudangConfirmPayload {
  jenis_ritase: string;
  ritase_ke: number;
  id_ritase: number;
  diambil_awb: number;
  diambil_koli_jkt: number;
  diambil_koli_seg: number;
  diambil_koli_btn: number;
  diambil_ecer_jkt: number;
  diambil_ecer_seg: number;
  diambil_ecer_btn: number;
  diambil_koli_hv_jkt: number;
  diambil_koli_hv_seg: number;
  diambil_koli_hv_btn: number;
  diambil_ecer_hv_jkt: number;
  diambil_ecer_hv_seg: number;
  diambil_ecer_hv_btn: number;
  diambil_awb_hv_jkt: number;
  diambil_awb_hv_seg: number;
  diambil_awb_hv_btn: number;
  catatan?: string;
}

/** Grup input pending milik gudang outgoing hari ini. */
export function useGudangPending() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["gudang-pending"],
    queryFn: () => get<GudangPendingGroup[]>("/gudang-muatan/pending", { token }),
    enabled: !!token,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

/** Riwayat serah terima + sisa per grup. */
export function useGudangKonfirmasi() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["gudang-konfirmasi"],
    queryFn: () =>
      get<{ riwayat: GudangRiwayatItem[]; sisa_grup: GudangSisaGroup[] }>(
        "/gudang-muatan/konfirmasi",
        { token }
      ),
    enabled: !!token,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

/** Kandidat ritase pengambil hari ini. */
export function useGudangRitase() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["gudang-ritase"],
    queryFn: () => get<GudangRitaseCandidate[]>("/gudang-muatan/ritase", { token }),
    enabled: !!token,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

/** Simpan input muatan gudang. */
export function useInputGudangMuatan() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GudangInputPayload) =>
      post("/gudang-muatan/input", payload, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gudang-pending"] });
      queryClient.invalidateQueries({ queryKey: ["gudang-konfirmasi"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
    },
  });
}

/** Konfirmasi pengambilan ke ritase driver. */
export function useConfirmGudangPickup() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GudangConfirmPayload) =>
      post<{ sisa: { jumlah_awb: number } }>("/gudang-muatan/confirm-pickup", payload, {
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gudang-pending"] });
      queryClient.invalidateQueries({ queryKey: ["gudang-konfirmasi"] });
      queryClient.invalidateQueries({ queryKey: ["gudang-ritase"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
    },
  });
}
