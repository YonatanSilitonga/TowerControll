import type { UserRole } from "@/types/auth";
import type { DriverStatus, FleetStatus, TripStatus, VehicleStatus } from "@/types/armada";

/** Base URL API backend. Default: backend ngrok kawan (office).
 *  Bisa dioverride via env NEXT_PUBLIC_API_URL (mis. di .env.local). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://violator-krypton-image.ngrok-free.dev/api/v1";

/** Interval polling summary dashboard (ms). */
export const POLL_INTERVAL = Number(
  process.env.NEXT_PUBLIC_POLL_INTERVAL ?? 30000
);

/** Mode mock: preview frontend tanpa backend (data contoh). */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  kapten: "Kapten",
  direktur: "Direktur",
  driver: "Driver",
};

/** Mapping role -> modul yang boleh diakses (untuk menu & guard). */
export const ROLE_MENU: Record<UserRole, string[]> = {
  admin: ["dashboard", "armada", "gudang", "absensi", "laporan"],
  kapten: ["dashboard", "armada"],
  direktur: ["dashboard", "armada", "laporan"],
  driver: ["dashboard", "armada"],
};

/** Role yang boleh masuk dashboard WEB (direktur & kapten). Driver = mobile. */
export const ALLOWED_WEB_ROLES: UserRole[] = ["direktur", "kapten"];

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
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
  // status Indonesia (skema DB logistik)
  berjalan: "Berjalan",
  selesai: "Selesai",
  direncanakan: "Direncanakan",
  batal: "Batal",
  tersedia: "Tersedia",
  bertugas: "Bertugas",
  libur: "Libur",
  maintenance: "Maintenance",
  istirahat: "Istirahat",
  aktif: "Aktif",
  loading: "Loading",
  unloading: "Unloading",
};

/** Ambil label untuk status apa pun. */
export function statusLabel(status: string | undefined | null): string {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Status tracking yang rapi: kalau string mentah (bukan status dikenal) → "Idle"/"Bergerak"/"Aktif". */
export function displayTrackingStatus(
  status?: string | null,
  speed?: number | null,
  lastUpdate?: string | null
): string {
  const s = (status ?? "").toLowerCase();
  const known = [
    "bongkar", "muat", "keluar", "menuju", "tiba", "sampai",
    "selesai", "berjalan", "berhenti", "istirahat", "loading", "unloading",
  ].some((k) => s.includes(k));
  if (known) return statusLabel(status);

  // status mentah → tentukan dari freshness update + kecepatan
  let stale = false;
  if (lastUpdate) {
    const t = new Date(lastUpdate).getTime();
    if (!Number.isNaN(t)) stale = Date.now() - t > 5 * 60 * 1000; // > 5 menit
  }
  if (stale) return "Idle";
  return (speed ?? 0) > 0 ? "Bergerak" : "Aktif";
}

/** Warna status pengiriman sesuai desain. */
export function deliveryStatusTone(status: string): string {
  switch (status) {
    case "in_transit":
    case "berjalan":
      return "bg-[#1e3a5f] text-white";
    case "loading":
      return "bg-amber-400 text-amber-950";
    case "weather_delay":
      return "bg-rose-500 text-white";
    case "delivered":
    case "selesai":
      return "bg-emerald-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}
