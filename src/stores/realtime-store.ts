"use client";

import { create } from "zustand";

export type RealtimeStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

interface RealtimeState {
  status: RealtimeStatus;
  setStatus: (status: RealtimeStatus) => void;
}

/** Status koneksi SSE global — dipakai indikator di header dashboard. */
export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: "disconnected",
  setStatus: (status) => set({ status }),
}));
