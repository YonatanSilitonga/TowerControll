import type { UserRole } from "@/types/auth";
import type { DriverStatus, FleetStatus, TripStatus, VehicleStatus } from "@/types/armada";
import type { DeliveryStatus } from "@/types/dashboard";

/** Base URL API backend. Fallback ke local dev. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

/** Interval polling summary dashboard (ms). */
export const POLL_INTERVAL = Number(
  process.env.NEXT_PUBLIC_POLL_INTERVAL ?? 30000
);

/** Mode mock: preview frontend tanpa backend (data contoh). */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  driver: "Driver",
  vendor: "Vendor",
  finance: "Finance",
};

/** Mapping role -> modul yang boleh diakses (untuk menu & guard). */
export const ROLE_MENU: Record<UserRole, string[]> = {
  admin: ["dashboard", "armada", "gudang", "absensi", "laporan"],
  supervisor: ["dashboard", "armada", "gudang", "absensi", "laporan"],
  driver: ["dashboard", "armada"],
  vendor: ["dashboard", "gudang"],
  finance: ["dashboard", "laporan"],
};

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  in_transit: "IN TRANSIT",
  loading: "LOADING",
  weather_delay: "WEATHER DELAY",
  delivered: "DELIVERED",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Tersedia",
  in_transit: "Dalam Perjalanan",
  maintenance: "Maintenance",
  off: "Nonaktif",
};

export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
  on_duty: "Bertugas",
  off: "Libur",
};

export const FLEET_STATUS_LABEL: Record<FleetStatus, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  planned: "Direncanakan",
  in_progress: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const STATUS_LABELS: Record<string, string> = {
  ...DELIVERY_STATUS_LABEL,
  ...VEHICLE_STATUS_LABEL,
  ...DRIVER_STATUS_LABEL,
  ...FLEET_STATUS_LABEL,
  ...TRIP_STATUS_LABEL,
};

/** Ambil label untuk status apa pun. */
export function statusLabel(status: string | undefined | null): string {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Warna status pengiriman sesuai desain. */
export function deliveryStatusTone(status: DeliveryStatus | string): string {
  switch (status) {
    case "in_transit":
      return "bg-[#1e3a5f] text-white";
    case "loading":
      return "bg-amber-400 text-amber-950";
    case "weather_delay":
      return "bg-rose-500 text-white";
    case "delivered":
      return "bg-emerald-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}
