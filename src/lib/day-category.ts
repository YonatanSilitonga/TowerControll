import type { DayCategory, UtilisasiStatus } from "@/types/utilisasi";
import { underThreshold } from "@/lib/vehicle-capacity";

/** Kategori default (harus sama dengan backend):
 *  tanggal kembar (dd == mm) → Peak, Senin → Peak, Minggu → Low, sisanya Normal. */
export function defaultCategory(dateStr: string): DayCategory {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "normal";
  const [y, m, d] = parts;
  if (d === m) return "peak";
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (weekday === 1) return "peak";
  if (weekday === 0) return "low";
  return "normal";
}

export const CATEGORY_LABEL: Record<DayCategory, string> = {
  peak: "Peak",
  normal: "Normal",
  low: "Low",
};

export const CATEGORY_ORDER: DayCategory[] = ["peak", "normal", "low"];

/** Warna chip kategori hari. */
export const CATEGORY_TONE: Record<DayCategory, string> = {
  peak: "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800",
  normal: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800",
  low: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export const STATUS_LABEL: Record<UtilisasiStatus, string> = {
  under: "Under",
  optimal: "Optimal",
  over: "Over",
  no_data: "—",
};

/** Warna sel matriks utilisasi. */
export const STATUS_TONE: Record<UtilisasiStatus, string> = {
  under: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900",
  optimal: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900",
  over: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900",
  no_data: "bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-500 dark:ring-slate-800",
};

export function statusFromPct(
  pct: number | null | undefined,
  min: number,
  max: number
): UtilisasiStatus {
  if (pct === null || pct === undefined || Number.isNaN(pct) || max <= 0) return "no_data";
  const under = underThreshold(min, max);
  if (pct < under) return "under";
  if (pct > 100) return "over";
  return "optimal";
}

export function formatPct(pct?: number | null): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  return `${pct.toFixed(0)}%`;
}

/** "2026-01-05" → "Sen, 5 Jan 2026". */
export function formatDayLabel(dateStr: string): string {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "2026-01-05" → "Sen 5 Jan" (header kolom). */
export function formatDayShort(dateStr: string): string {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/** "2026-01" → "Januari 2026". */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function todayWIB(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
