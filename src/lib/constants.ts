import type { UserRole } from "@/types/auth";
import type { DriverStatus, FleetStatus, TripStatus, VehicleStatus } from "@/types/armada";

/** Base URL API backend. Default: backend lokal (localhost:8080).
 *  Bisa dioverride via env NEXT_PUBLIC_API_URL (mis. di .env.local). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

/** Interval polling summary dashboard (ms). */
export const POLL_INTERVAL = Number(
  process.env.NEXT_PUBLIC_POLL_INTERVAL ?? 30000
);

/** Ambang offline (menit tanpa GPS terbaru) — disamakan di semua modul:
 *  backend (.env TRACKING_OFFLINE_MIN) & frontend. Default 3 menit biar
 *  kendaraan yang app-nya di-swipe-kill cepat kebaca OFFLINE. */
export const OFFLINE_MINUTES = 3;

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
  admin: ["dashboard", "armada", "jadwal", "manifest-foto", "analitik", "gudang", "absensi"],
  kapten: ["dashboard", "armada", "jadwal", "manifest-foto", "analitik"],
  direktur: ["dashboard", "armada", "jadwal", "manifest-foto", "analitik"],
  driver: ["dashboard", "armada"],
};

/** Role yang boleh masuk dashboard WEB (admin, direktur & kapten). Driver = mobile. */
export const ALLOWED_WEB_ROLES: UserRole[] = ["admin", "direktur", "kapten"];

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
  tiba: "Tiba",
};

/** Ambil label untuk status apa pun. */
export function statusLabel(status: string | undefined | null): string {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Ambil label untuk jenis stop. */
export function stopTypeLabel(jenis?: string): string {
  if (jenis === "drop_point" || jenis === "gateway") return "Gateway";
  if (!jenis) return "-";
  return jenis.charAt(0).toUpperCase() + jenis.slice(1);
}


/** GPS basi? (lebih dari OFFLINE_MINUTES tanpa update terakhir). */
export function isStale(lastUpdate?: string | null): boolean {
  if (!lastUpdate) return true;
  const t = new Date(lastUpdate).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > OFFLINE_MINUTES * 60 * 1000;
}

/** Status tracking yang rapi: string mentah → label dikenal, kalau gak dikenal
 *  tentukan dari freshness update + kecepatan. GAK ada fallback "Aktif" yang
 *  menyesatkan — segar+berhenti = "Berhenti". Kalau basi: driver masih login
 *  (app cuma tidur/layar mati) = "Tidak aktif"; sudah keluar app = "Offline". */
export function displayTrackingStatus(
  status?: string | null,
  speed?: number | null,
  lastUpdate?: string | null,
  sessionOnline?: boolean
): string {
  const s = (status ?? "").toLowerCase();
  const known = [
    "bongkar", "muat", "keluar", "menuju", "tiba", "sampai",
    "selesai", "berjalan", "berhenti", "istirahat", "loading", "unloading",
  ].some((k) => s.includes(k));
  if (known) return statusLabel(status);

  // status mentah → tentukan dari freshness update + kecepatan
  if (isStale(lastUpdate)) {
    if (sessionOnline) return "Tidak aktif";
    return "Offline";
  }
  return (speed ?? 0) > 0 ? "Bergerak" : "Berhenti";
}

/** "aktif X menit lalu" — umur data terakhir, biar basi-nya keliatan. */
export function lastActiveLabel(lastUpdate?: string | null): string {
  if (!lastUpdate) return "belum ada laporan";
  const t = new Date(lastUpdate).getTime();
  if (Number.isNaN(t)) return "belum ada laporan";
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 1) return "aktif baru saja";
  if (mins < 60) return `aktif ${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `aktif ${hours} jam lalu`;
  return `aktif ${Math.floor(hours / 24)} hari lalu`;
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
