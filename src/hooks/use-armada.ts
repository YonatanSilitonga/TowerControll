"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, patch, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Driver, Fleet, Trip, Vehicle } from "@/types/armada";

const tokenSelector = (s: { token: string | null }) => s.token;

/* ---------- Fleet ---------- */

export function useFleets() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["fleets"],
    queryFn: () => get<Fleet[]>("/armada/fleets", { token }),
    enabled: !!token,
  });
}

export function useCreateFleet() {
  const qc = useQueryClient();
  const token = useAuthStore(tokenSelector);
  return useMutation({
    mutationFn: (payload: Partial<Fleet>) => post<Fleet>("/armada/fleets", payload, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleets"] }),
  });
}

/* ---------- Vehicle ---------- */

export function useVehicles() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: () => get<Vehicle[]>("/armada/vehicles", { token }),
    enabled: !!token,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  const token = useAuthStore(tokenSelector);
  return useMutation({
    mutationFn: (payload: Partial<Vehicle>) =>
      post<Vehicle>("/armada/vehicles", payload, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicleStatus() {
  const qc = useQueryClient();
  const token = useAuthStore(tokenSelector);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch<Vehicle>(`/armada/vehicles/${id}/status`, { status }, { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

/* ---------- Driver ---------- */

export function useDrivers() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["drivers"],
    queryFn: () => get<Driver[]>("/armada/drivers", { token }),
    enabled: !!token,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  const token = useAuthStore(tokenSelector);
  return useMutation({
    mutationFn: (payload: Partial<Driver>) =>
      post<Driver>("/armada/drivers", payload, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

/* ---------- Trip ---------- */

export function useTrips() {
  const token = useAuthStore(tokenSelector);
  return useQuery({
    queryKey: ["trips"],
    queryFn: () => get<Trip[]>("/armada/trips", { token }),
    enabled: !!token,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  const token = useAuthStore(tokenSelector);
  return useMutation({
    mutationFn: (payload: Partial<Trip>) => post<Trip>("/armada/trips", payload, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useUpdateTripStatus() {
  const qc = useQueryClient();
  const token = useAuthStore(tokenSelector);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch<Trip>(`/armada/trips/${id}/status`, { status }, { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}
