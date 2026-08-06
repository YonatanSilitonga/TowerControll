"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Seller } from "@/types/seller";

export function useSeller() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["sellers"],
    queryFn: () => get<Seller[]>("/sellers", { token }),
    enabled: !!token,
  });
}