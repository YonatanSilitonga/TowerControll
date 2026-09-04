"use client";

import { statusLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Badge status dengan warna otomatis berdasarkan value status.
 * Gaya: dot indicator + label — konsisten dengan design reference.
 * Mobile: warna lebih bold + border + dot lebih besar supaya keliatan tanpa scroll.
 */
export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const value = status ?? "";
  const tone = getTone(value);
  const dot = getDot(value);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border",
        tone,
        className
      )}
    >
      <i className={cn("h-2 w-2 rounded-full md:h-1.5 md:w-1.5", dot)} />
      {statusLabel(value)}
    </span>
  );
}

function getDot(status: string): string {
  const s = status.toLowerCase();
  if (["cancelled", "off", "inactive", "nonaktif", "expired", "tidak terlaksana", "destructive", "error", "batal"].some((k) => s.includes(k))) {
    return "bg-rose-600 md:bg-rose-500";
  }
  if (["pending", "planned", "scheduled", "unpaid", "out_for_delivery", "direncanakan"].some((k) => s.includes(k))) {
    return "bg-amber-600 md:bg-amber-500";
  }
  if (["in_transit", "in_progress", "picked_up", "maintenance", "berjalan", "loading"].some((k) => s.includes(k))) {
    return "bg-sky-600 md:bg-sky-500";
  }
  if (["delivered", "completed", "active", "available", "paid", "on_duty", "success", "selesai", "aktif", "tersedia", "bertugas"].some((k) => s.includes(k))) {
    return "bg-emerald-600 md:bg-emerald-500";
  }
  return "bg-slate-500 md:bg-slate-400";
}

function getTone(status: string): string {
  const s = status.toLowerCase();

  if (["cancelled", "off", "inactive", "nonaktif", "expired", "tidak terlaksana", "destructive", "error", "batal"].some((k) => s.includes(k))) {
    return "bg-rose-100 text-rose-800 border-rose-300 md:bg-rose-50 md:text-rose-700 md:border-rose-200";
  }
  if (["pending", "planned", "scheduled", "unpaid", "out_for_delivery", "direncanakan"].some((k) => s.includes(k))) {
    return "bg-amber-100 text-amber-800 border-amber-300 md:bg-amber-50 md:text-amber-700 md:border-amber-200";
  }
  if (["in_transit", "in_progress", "picked_up", "maintenance", "berjalan", "loading"].some((k) => s.includes(k))) {
    return "bg-sky-100 text-sky-800 border-sky-300 md:bg-sky-50 md:text-sky-700 md:border-sky-200";
  }
  if (["delivered", "completed", "active", "available", "paid", "on_duty", "success", "selesai", "aktif", "tersedia", "bertugas"].some((k) => s.includes(k))) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 md:bg-emerald-50 md:text-emerald-700 md:border-emerald-200";
  }
  return "bg-slate-200 text-slate-700 border-slate-300 md:bg-slate-100 md:text-slate-600 md:border-slate-200";
}
