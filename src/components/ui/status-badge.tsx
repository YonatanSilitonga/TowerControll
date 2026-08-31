"use client";

import { statusLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Badge status dengan warna otomatis berdasarkan value status.
 * Gaya: dot indicator + label — konsisten dengan design reference.
 */
export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const value = status ?? "";
  const tone = getTone(value);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
        tone,
        className
      )}
    >
      <i className={cn("h-1.5 w-1.5 rounded-full", getDot(value))} />
      {statusLabel(value)}
    </span>
  );
}

function getDot(status: string): string {
  const s = status.toLowerCase();
  if (["delivered", "completed", "active", "available", "paid", "on_duty", "success", "selesai", "aktif", "tersedia", "bertugas"].some((k) => s.includes(k))) {
    return "bg-emerald-500";
  }
  if (["pending", "planned", "scheduled", "unpaid", "out_for_delivery", "direncanakan"].some((k) => s.includes(k))) {
    return "bg-amber-500";
  }
  if (["in_transit", "in_progress", "picked_up", "maintenance", "berjalan", "loading"].some((k) => s.includes(k))) {
    return "bg-sky-500";
  }
  if (["cancelled", "off", "inactive", "nonaktif", "expired", "destructive", "error", "batal"].some((k) => s.includes(k))) {
    return "bg-rose-500";
  }
  return "bg-slate-400";
}

function getTone(status: string): string {
  const s = status.toLowerCase();

  if (["delivered", "completed", "active", "available", "paid", "on_duty", "success", "selesai", "aktif", "tersedia", "bertugas"].some((k) => s.includes(k))) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  }
  if (["pending", "planned", "scheduled", "unpaid", "out_for_delivery", "direncanakan"].some((k) => s.includes(k))) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  }
  if (["in_transit", "in_progress", "picked_up", "maintenance", "berjalan", "loading"].some((k) => s.includes(k))) {
    return "bg-sky-50 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
  }
  if (["cancelled", "off", "inactive", "nonaktif", "expired", "destructive", "error", "batal"].some((k) => s.includes(k))) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}
