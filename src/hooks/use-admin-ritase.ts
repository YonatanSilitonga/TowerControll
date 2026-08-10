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
