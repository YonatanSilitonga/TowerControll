import type { UserRole } from "@/types/auth";
import type { DriverStatus, FleetStatus, TripStatus, VehicleStatus } from "@/types/armada";

/** Base URL API backend. Default: relative path (lewat Next.js rewrites proxy).
 *  Bisa dioverride via env NEXT_PUBLIC_API_URL (mis. di .env.local). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

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
  tower_control: "Tower Control",
  direktur: "Direktur",
  driver: "Driver",
};

/** Mapping role -> modul yang boleh diakses (untuk menu & guard). */
export const ROLE_MENU: Record<UserRole, string[]> = {
  admin: ["dashboard", "armada", "jadwal", "manifest-foto", "analitik", "gudang", "absensi"],
  tower_control: ["dashboard", "armada", "jadwal", "manifest-foto", "analitik"],
  direktur: ["dashboard", "armada", "jadwal", "manifest-foto", "analitik"],
  driver: ["dashboard", "armada"],
};

/** Role yang boleh masuk dashboard WEB (admin, direktur & tower_control). Driver = mobile. */
export const ALLOWED_WEB_ROLES: UserRole[] = ["admin", "direktur", "tower_control"];

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
  off: "Nonaktif",
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
  libur: "Nonaktif",
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

/**
 * Cek apakah ritase sudah expired berdasarkan tanggal + jam_selesai (WIB).
 *
 * Aturan:
 *  - Kalau tanggal < hari ini (WIB) → sudah expired, apapun jamnya
 *  - Kalau tanggal = hari ini (WIB) & jam_selesai sudah lewat → expired
 *  - Kalau tanggal > hari ini → belum expired
 *  - Kalau tanggal null/undefined → fallback ke cek jam saja (backward compat)
 *  - Kalau jam_selesai <= 06:00 → cross-midnight, belum expired di tanggal yang sama
 */
export function isRitaseExpired(
  jamSelesai?: string | null,
  tanggal?: string | null,
): boolean {
  // Tanggal WIB hari ini dalam format YYYY-MM-DD
  const todayWIB = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Kalau ada tanggal ritase, cek dulu apakah tanggal sudah lewat
  if (tanggal) {
    // Ambil hanya YYYY-MM-DD dari tanggal (bisa format ISO lengkap)
    const ritaseDateStr = tanggal.slice(0, 10);
    if (ritaseDateStr < todayWIB) return true;  // tanggal kemarin atau lebih lama
    if (ritaseDateStr > todayWIB) return false; // tanggal besok atau lebih jauh
    // ritaseDateStr === todayWIB → lanjut cek jam
  }

  // Cek jam selesai (WIB)
  if (!jamSelesai) return false;
  const parts = jamSelesai.split(":");
  if (parts.length < 2) return false;

  const selesaiJam = parseInt(parts[0], 10);
  const selesaiMenit = parseInt(parts[1], 10);

  // Cross-midnight: jam_selesai <= 06:00 artinya berakhir tengah malam (next day).
  // Pada tanggal yang sama, ritase belum expired.
  if (selesaiJam <= 6) return false;

  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const nowMin = wibNow.getUTCHours() * 60 + wibNow.getUTCMinutes();
  const selesaiMin = selesaiJam * 60 + selesaiMenit;

  return nowMin > selesaiMin;
}

/**
 * Label untuk status ritase di panel armada (GPS mati tapi ritase sudah ada).
 *
 * Parameter tanggal (YYYY-MM-DD) sekarang wajib untuk cek expired yang benar.
 * Tanpa tanggal, hanya bisa cek berdasarkan jam (backward compat).
 *
 * Return null berarti ritase sudah expired / tidak perlu ditampilkan.
 */
export function ritaseStatusLabel(
  status?: string | null,
  jamSelesai?: string | null,
  tanggal?: string | null,
): string | null {
  if (!status) return null;

  // Ritase sudah berjalan → selalu tampilkan, tidak ada expiry
  if (status === "berjalan") return "Sedang Berjalan";

  // Ritase selesai → tampilkan "Selesai Bertugas"
  if (status === "selesai") return "Selesai Bertugas";

  // Ritase direncanakan → cek expired dulu (tanggal + jam)
  if (status === "direncanakan") {
    if (isRitaseExpired(jamSelesai, tanggal)) return null; // expired → sembunyikan
    return "Siap Berangkat";
  }

  return null;
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

/**
 * Status tracking yang rapi: string mentah → label dikenal, kalau gak dikenal
 * tentukan dari freshness update + kecepatan. GAK ada fallback "Aktif" yang
 * menyesatkan — segar+berhenti = "Berhenti". Kalau basi: driver masih login
 * (app cuma tidur/layar mati) = "Tidak aktif"; sudah keluar app = "Offline".
 */
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
