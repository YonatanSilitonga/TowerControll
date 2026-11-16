"use client";

import { cn, formatNumber } from "@/lib/utils";
import { formatPct, STATUS_LABEL, STATUS_TONE } from "@/lib/day-category";
import type { Metric, UtilisasiCell } from "@/types/utilisasi";

interface CellPillProps {
  cell: UtilisasiCell;
  metric: Metric;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

/** Satu sel matriks: persentase + warna status. "–" bila tidak ada data. */
export function CellPill({ cell, metric, onClick, className, compact }: CellPillProps) {
  const unit = metric === "koli" ? "koli" : "AWB";

  if (cell.status === "no_data" || cell.pct === null) {
    return (
      <span
        title="Tidak ada data muatan pada periode ini"
        className={cn(
          "inline-flex min-w-[52px] items-center justify-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
          STATUS_TONE.no_data,
          className
        )}
      >
        –
      </span>
    );
  }

  const title = `${STATUS_LABEL[cell.status]} · ${formatPct(cell.pct)} · ${formatNumber(
    cell.load
  )} ${unit} dari ${cell.trips_with_data} rit berdata (total ${cell.trips} rit)`;

  return (
    <span
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[52px] items-center justify-center rounded-md font-semibold ring-1 ring-inset tabular-nums",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        STATUS_TONE[cell.status],
        onClick && "cursor-pointer transition-transform hover:scale-105 hover:shadow-sm",
        className
      )}
    >
      {formatPct(cell.pct)}
    </span>
  );
}

interface MonthPillProps {
  avgPct: number | null;
  status: UtilisasiCell["status"];
  weeks: number;
  onClick?: () => void;
  className?: string;
}

/** Sel bulanan: rata-rata % mingguan + jumlah minggu berdata. */
export function MonthPill({ avgPct, status, weeks, onClick, className }: MonthPillProps) {
  if (status === "no_data" || avgPct === null) {
    return (
      <span
        title="Tidak ada minggu berdata pada bulan ini"
        className={cn(
          "inline-flex min-w-[64px] flex-col items-center justify-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
          STATUS_TONE.no_data,
          className
        )}
      >
        –
      </span>
    );
  }

  return (
    <span
      title={`${STATUS_LABEL[status]} · rata-rata ${formatPct(avgPct)} dari ${weeks} minggu berdata`}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[64px] flex-col items-center justify-center rounded-md px-2 py-1 ring-1 ring-inset tabular-nums",
        STATUS_TONE[status],
        onClick && "cursor-pointer transition-transform hover:scale-105 hover:shadow-sm",
        className
      )}
    >
      <span className="text-xs font-semibold">{formatPct(avgPct)}</span>
      <span className="text-[10px] font-normal opacity-70">{weeks} mgg</span>
    </span>
  );
}
