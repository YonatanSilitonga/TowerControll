"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, put } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { DayCategory, DayCategoryResponse, UtilisasiResponse } from "@/types/utilisasi";

const tokenSelector = (s: { token: string | null }) => s.token;

export function useUtilisasi(start: string, end: string) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["utilisasi-muatan", start, end],
    queryFn: () =>
      get<UtilisasiResponse>("/utilisasi-muatan", {
        token,
        query: { start_date: start, end_date: end },
      }),
    enabled: !!token && !!start && !!end,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useDayCategories(start: string, end: string) {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["day-categories", start, end],
    queryFn: () =>
      get<DayCategoryResponse>("/day-categories", {
        token,
        query: { start_date: start, end_date: end },
      }),
    enabled: !!token && !!start && !!end,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export interface UpsertDayCategoryPayload {
  tanggal: string;
  kategori: DayCategory;
  keterangan?: string;
}

export function useUpsertDayCategory() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tanggal, kategori, keterangan }: UpsertDayCategoryPayload) =>
      put(`/day-categories/${tanggal}`, { kategori, keterangan }, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisasi-muatan"] });
      queryClient.invalidateQueries({ queryKey: ["day-categories"] });
    },
  });
}

export function useDeleteDayCategory() {
  const token = useAuthStore(tokenSelector);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tanggal: string) => del(`/day-categories/${tanggal}`, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisasi-muatan"] });
      queryClient.invalidateQueries({ queryKey: ["day-categories"] });
    },
  });
}
