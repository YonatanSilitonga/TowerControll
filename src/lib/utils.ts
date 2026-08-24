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
