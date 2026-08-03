"use client";

import { statusLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Badge status dengan warna otomatis berdasarkan value status.
 * Warna dipetakan lewat keyword yang terkandung dalam status.
 */
export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const value = status ?? "";
  const tone = getTone(value);

  return (
    <Badge variant="outline" className={cn(tone, "border-transparent", className)}>
      {statusLabel(value)}
    </Badge>
  );
}

function getTone(status: string): string {
  const s = status.toLowerCase();

  if (["delivered", "completed", "active", "available", "paid", "on_duty", "success"].some((k) => s.includes(k))) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  }
  if (["pending", "planned", "scheduled", "unpaid", "out_for_delivery"].some((k) => s.includes(k))) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  }
  if (["in_transit", "in_progress", "picked_up", "maintenance"].some((k) => s.includes(k))) {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
  }
  if (["cancelled", "off", "inactive", "expired", "destructive", "error"].some((k) => s.includes(k))) {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
  }
  return "bg-muted text-muted-foreground";
}
