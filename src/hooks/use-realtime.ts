"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectRealtime, disconnectRealtime, type LivePayload } from "@/lib/sse";
import { useAuthStore } from "@/stores/auth-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import type { DashboardAnalisis, DashboardSummary } from "@/types/dashboard";
import type { TrackingMap } from "@/types/armada";

/**
 * Komponen bridge realtime — dipasang di (dashboard)/layout.
 * Satu koneksi SSE global; update React Query cache tiap snapshot datang,
 * jadi semua komponen yang pakai queryKey dashboard-summary / dashboard-analisis
 * / tracking-map otomatis dapat data baru tanpa polling rapat.
 */
export function RealtimeSync() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const setStatus = useRealtimeStore((s) => s.setStatus);

  useEffect(() => {
    if (!token) {
      disconnectRealtime();
      setStatus("disconnected");
      return;
    }

    connectRealtime({
      token,
      onMessage: (payload: LivePayload) => {
        const data = payload?.data;
        if (!data) return;
        if (data.summary) {
          queryClient.setQueryData<DashboardSummary>(["dashboard-summary"], data.summary as DashboardSummary);
        }
        if (data.analisis) {
          queryClient.setQueryData<DashboardAnalisis>(["dashboard-analisis"], data.analisis as DashboardAnalisis);
        }
        if (data.map) {
          queryClient.setQueryData<TrackingMap>(["tracking-map"], data.map as TrackingMap);
        }

        // Trigger refetch untuk history kendaraan yang sedang dipilih.
        // Ini memastikan panel detail di dashboard ikut sinkron dengan update live.
        queryClient.invalidateQueries({ queryKey: ["tracking-history"] });
      },
      onStatus: setStatus,
    });

    // Cleanup hanya saat unmount layout (bukan tiap re-render).
    return () => {
      disconnectRealtime();
      setStatus("disconnected");
    };
  }, [token, queryClient, setStatus]);

  return null;
}
