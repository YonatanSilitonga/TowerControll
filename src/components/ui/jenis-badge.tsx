"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface JenisBadgeProps {
  /** "outgoing" | "incoming" | undefined */
  jenis?: string;
  /** Ukuran badge: sm (default) atau md */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Badge untuk menampilkan Jenis Ritase:
 * - Outgoing → biru ↑ (keluar gudang)
 * - Incoming → oranye ↓ (masuk gudang)
 */
export function JenisBadge({ jenis, size = "sm", className }: JenisBadgeProps) {
  if (!jenis) return null;

  const isOutgoing = jenis === "outgoing";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-bold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        isOutgoing
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        className
      )}
    >
      {isOutgoing ? (
        <ArrowUp className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : (
        <ArrowDown className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      {isOutgoing ? "Outgoing" : "Incoming"}
    </span>
  );
}
