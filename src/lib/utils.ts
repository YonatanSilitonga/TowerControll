import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Session ambang — jam sejak login sebelum dianggap "tidak aktif". */
const SESSION_HOURS = 12;

/**
 * Hitung session aktif dari last_login (bukan field session_online backend).
 * Backend `session_online` computed field unreliable karena DISTINCT ON + LEFT JOIN bug.
 * Frontend hitung langsung dari last_login yang sudah pasti benar.
 */
export function hasActiveSession(lastLogin?: string | null): boolean {
  if (!lastLogin) return false;
  const ms = new Date(lastLogin).getTime();
  return ms > 0 && (Date.now() - ms) < SESSION_HOURS * 3600 * 1000;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format angka ke format ID (1.234). */
export function formatNumber(value: number, fractionDigits?: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Format mata uang IDR. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format tanggal ISO ke format ID (31 Jul 2026, 14:30). */
export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Format tanggal ISO ke format ID (31 Jul 2026). */
export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Format tanggal (YYYY-MM-DD atau ISO) ke DD/MM/YYYY. */
export function formatDateDMY(value?: string | null): string {
  if (!value) return "-";
  // Backend kirim "YYYY-MM-DD" — parse manual biar gak geser timezone.
  const m = value.slice(0, 10).split("-").map(Number);
  if (m.length !== 3 || m.some(Number.isNaN)) return value.slice(0, 10);
  const [y, mo, d] = m;
  return `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
}

/** Format durasi KOMPAK (detik) — "22s", "1m 10s", "1j 5m". Buat UI yang sempit. */
export function formatDur(sec?: number | null): string {
  if (!sec || sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m}m` : `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0) return `${h}j`;
  return `${h}j ${rm}m`;
}

/* ──────────── Jadwal vs Realisasi per Stop ──────────── */

export interface StopTiming {
  /** Urutan stop */
  urutan: number;
  /** Nama lokasi */
  nama_lokasi: string;
  /** Durasi aktual (detik) */
  durasi_detik: number;
  /** Jadwal estimasi: jam mulai (HH:MM) */
  jadwal_mulai?: string;
  /** Jadwal estimasi: jam selesai (HH:MM) */
  jadwal_selesai?: string;
  /** Realisasi: jam mulai aktual (HH:MM) */
  realisasi_mulai?: string;
  /** Realisasi: jam selesai aktual (HH:MM) */
  realisasi_selesai?: string;
  /** Selisih menit (negatif = cepat, positif = lambat) */
  selisih_menit?: number;
}

/**
 * Parse "HH:MM" atau "HH:MM:SS" ke total menit dari tengah malam.
 * Handle backend format "1970-01-01T07:00:00Z" juga.
 */
function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  // Handle full ISO datetime — extract time part
  const t = time.includes("T") ? time.split("T")[1]! : time;
  const parts = t.replace("Z", "").split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Format menit ke "HH:MM" */
function minutesToTime(min: number): string {
  const h = Math.floor(((min % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format selisih menit ke string — "-15m" (cepat) atau "+20m" (lambat) */
export function formatSelisih(menit?: number): string {
  if (menit == null || Number.isNaN(menit)) return "";
  if (menit === 0) return "Tepat";
  const sign = menit > 0 ? "+" : "";
  return `${sign}${menit}m`;
}

/**
 * Hitung jadwal & realisasi per stop.
 *
 * @param jamMulai  - jadwal mulai ritase ("HH:MM" atau ISO)
 * @param jamSelesai - jadwal selesai ritase ("HH:MM" atau ISO)
 * @param stops     - array stop dengan urutan & durasi_detik
 * @returns array StopTiming dengan jadwal/realisasi per stop
 */
export function computeStopTiming(
  jamMulai?: string | null,
  jamSelesai?: string | null,
  stops?: Array<{ urutan: number; nama_lokasi?: string | null; durasi_detik?: number | null }>,
): StopTiming[] {
  if (!stops || stops.length === 0) return [];

  const mulaiMin = parseTimeToMinutes(jamMulai);
  const selesaiMin = parseTimeToMinutes(jamSelesai);

  // Total durasi aktual semua stop
  const totalDurasi = stops.reduce((sum, s) => sum + (s.durasi_detik ?? 0), 0);

  // Kalau tidak ada jam_mulai atau jam_selesai, tetap tampilkan durasi
  const hasJadwal = mulaiMin != null && selesaiMin != null && totalDurasi > 0;
  const totalJadwal = hasJadwal ? selesaiMin - mulaiMin : 0;

  let cursorJadwal = mulaiMin ?? 0;
  let cursorRealisasi = mulaiMin ?? 0; // mulai dari jam_mulai sebagai baseline

  return stops.map((s) => {
    const dur = s.durasi_detik ?? 0;

    // ── Jadwal estimasi: proporsi berdasarkan durasi aktual ──
    let jMulai: string | undefined;
    let jSelesai: string | undefined;
    if (hasJadwal && dur > 0) {
      const jadwalDurasi = totalJadwal > 0
        ? Math.round((dur / totalDurasi) * totalJadwal)
        : 0;
      jMulai = minutesToTime(cursorJadwal);
      cursorJadwal += jadwalDurasi;
      jSelesai = minutesToTime(cursorJadwal);
    }

    // ── Realisasi: dari jam_mulai + kumulasi durasi ──
    let rMulai: string | undefined;
    let rSelesai: string | undefined;
    if (dur > 0) {
      rMulai = minutesToTime(cursorRealisasi);
      cursorRealisasi += dur;
      rSelesai = minutesToTime(cursorRealisasi);
    }

    // ── Selisih ──
    let selisih: number | undefined;
    if (hasJadwal && jMulai && rMulai) {
      const jMin = parseTimeToMinutes(jMulai) ?? 0;
      const rMin = parseTimeToMinutes(rMulai) ?? 0;
      selisih = rMin - jMin; // negatif = cepat, positif = lambat
    }

    return {
      urutan: s.urutan,
      nama_lokasi: s.nama_lokasi ?? "-",
      durasi_detik: dur,
      jadwal_mulai: jMulai,
      jadwal_selesai: jSelesai,
      realisasi_mulai: rMulai,
      realisasi_selesai: rSelesai,
      selisih_menit: selisih,
    };
  });
}
