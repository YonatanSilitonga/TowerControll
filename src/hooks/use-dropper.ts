"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { DropperEntry, DropperInputPayload } from "@/types/dropper";

export function useDropperEntries(tanggal: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["dropper-entries", tanggal],
    queryFn: () =>
      get<DropperEntry[]>("/dropper/entries", {
        token,
        query: { tanggal },
      }),
    enabled: !!token,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useInputDropper() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DropperInputPayload) =>
      post<{ count: number; ids: number[] }>("/dropper/input", payload, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropper-entries"] });
    },
  });
}
