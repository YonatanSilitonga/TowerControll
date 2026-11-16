"use client";

import { useMemo } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { cn, formatNumber } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  CATEGORY_TONE,
  formatDayShort,
  formatPct,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/day-category";
import type { TripDetail } from "@/types/utilisasi";

const SOURCE_LABEL: Record<string, string> = {
  event: "Ritase event",
  konfirmasi: "Konfirmasi",
  ritase: "Total ritase",
  "": "Tidak ada",
};

interface Props {
  trips: TripDetail[];
  loading?: boolean;
  emptyText?: string;
}

export function TripTable({ trips, loading, emptyText }: Props) {
  const columns = useMemo<Column<TripDetail>[]>(
    () => [
      {
        header: "Tanggal",
        render: (t) => (
          <div className="whitespace-nowrap">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {formatDayShort(t.tanggal)}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
                CATEGORY_TONE[t.day_category]
              )}
            >
              {CATEGORY_LABEL[t.day_category]}
            </span>
          </div>
        ),
        sortKey: "tanggal",
        sortable: true,
      },
      {
        header: "Kendaraan",
        render: (t) => (
          <div>
            <p className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-white">{t.plat_nomor}</p>
            <p className="text-[10px] text-slate-400">{t.jenis_kendaraan || "-"}</p>
          </div>
        ),
        sortKey: "plat_nomor",
        sortable: true,
      },
      {
        header: "Driver",
        render: (t) => <span className="text-xs text-slate-600 dark:text-slate-300">{t.nama_driver || "—"}</span>,
      },
      {
        header: "Rit",
        className: "w-14 text-center",
        render: (t) => (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            R{t.ritase_ke}
          </span>
        ),
      },
      {
        header: "Muatan",
        className: "text-right tabular-nums",
        render: (t) =>
          t.has_data ? (
            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
              {formatNumber(t.load)} <span className="text-[10px] font-normal text-slate-400">{t.metric === "koli" ? "koli" : "AWB"}</span>
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          ),
        sortKey: "load",
        sortable: true,
      },
      {
        header: "Kapasitas",
        className: "text-right tabular-nums",
        render: (t) => (
          <span className="text-[11px] text-slate-500">
            {formatNumber(t.capacity_min)}–{formatNumber(t.capacity_max)}
          </span>
        ),
      },
      {
        header: "Utilisasi",
        className: "text-center",
        render: (t) => (
          <span
            title={t.status === "no_data" ? "Tidak ada data muatan" : `${STATUS_LABEL[t.status]} · ${formatPct(t.pct)}`}
            className={cn(
              "inline-flex min-w-[52px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset tabular-nums",
              STATUS_TONE[t.status]
            )}
          >
            {formatPct(t.pct)}
          </span>
        ),
        sortKey: "pct",
        sortable: true,
      },
      {
        header: "Sumber",
        render: (t) => (
          <span className="text-[10px] text-slate-400">{SOURCE_LABEL[t.source] ?? t.source}</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable<TripDetail>
      columns={columns}
      rows={trips}
      rowKey={(t) => String(t.id_ritase)}
      loading={loading}
      searchPlaceholder="Cari plat, driver, atau tanggal..."
      searchFilter={(t, q) =>
        [t.plat_nomor, t.nama_driver, t.jenis_kendaraan, t.tanggal, `r${t.ritase_ke}`]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      }
      defaultPageSize={20}
      pageSizes={[20, 50, 100]}
      emptyText={emptyText ?? "Tidak ada ritase pada rentang ini."}
    />
  );
}
