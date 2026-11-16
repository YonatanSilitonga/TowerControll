"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { CellPill } from "./utilisasi-cell";
import {
  CATEGORY_LABEL,
  CATEGORY_TONE,
  formatDayLabel,
  formatDayShort,
  formatPct,
  STATUS_LABEL,
  STATUS_TONE,
  statusFromPct,
} from "@/lib/day-category";
import { cn, formatNumber } from "@/lib/utils";
import type { DailyGroup, DailyVehicle, Metric } from "@/types/utilisasi";

export interface VehicleTarget {
  idKendaraan: number;
  plat: string;
  jenis: string;
  metric: Metric;
  capacityMin: number;
  capacityMax: number;
}

export interface DrillTarget {
  title: string;
  subtitle?: string;
  tanggal?: string;
  weekStart?: string;
  month?: string;
  idKendaraan: number;
  plat: string;
}

interface Props {
  groups: DailyGroup[];
  onDrill: (target: DrillTarget) => void;
  onVehicleClick: (target: VehicleTarget) => void;
}

function unitOf(metric: DailyVehicle["metric"]) {
  return metric === "koli" ? "koli" : "AWB";
}

export function DailyMatrix({ groups, onDrill, onVehicleClick }: Props) {
  const vehicles = useMemo(() => {
    const map = new Map<number, DailyVehicle>();
    for (const g of groups) {
      for (const v of g.vehicles) {
        if (!map.has(v.id_kendaraan)) map.set(v.id_kendaraan, v);
      }
    }
    return [...map.values()].sort((a, b) => a.plat_nomor.localeCompare(b.plat_nomor));
  }, [groups]);

  if (groups.length === 0 || vehicles.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-slate-400">
        Belum ada data harian pada rentang ini.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50/80 dark:bg-slate-900/60">
            <th className="sticky left-0 z-20 min-w-[190px] bg-slate-50/95 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-slate-900/95">
              Kendaraan
            </th>
            {groups.map((g) => (
              <th key={g.tanggal} className="min-w-[84px] px-1.5 py-2 text-center">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {formatDayShort(g.tanggal)}
                </div>
                <span
                  className={cn(
                    "mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
                    CATEGORY_TONE[g.day_category]
                  )}
                >
                  {CATEGORY_LABEL[g.day_category]}
                </span>
              </th>
            ))}
            <th className="min-w-[76px] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Rata-rata
            </th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const cells = groups.map((g) =>
              g.vehicles.find((x) => x.id_kendaraan === v.id_kendaraan)
            );
            const pcts = cells
              .map((c) => c?.avg.pct)
              .filter((p): p is number => p !== null && p !== undefined);
            const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
            const status = statusFromPct(avg, v.capacity_min, v.capacity_max);

            return (
              <tr
                key={v.id_kendaraan}
                className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
              >
                <td className="sticky left-0 z-10 bg-card px-1 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      onVehicleClick({
                        idKendaraan: v.id_kendaraan,
                        plat: v.plat_nomor,
                        jenis: v.jenis_kendaraan,
                        metric: v.metric,
                        capacityMin: v.capacity_min,
                        capacityMax: v.capacity_max,
                      })
                    }
                    title="Klik untuk melihat card muatan harian kendaraan ini"
                    className="group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-bold text-[#0c1e3a] group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
                        {v.plat_nomor}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">
                        {v.jenis_kendaraan || "-"} · {formatNumber(v.capacity_min)}–{formatNumber(v.capacity_max)} {unitOf(v.metric)}
                      </span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500" />
                  </button>
                </td>
                {groups.map((g, i) => {
                  const cell = cells[i];
                  return (
                    <td key={g.tanggal} className="px-1 py-1.5 text-center">
                      {cell ? (
                        <CellPill
                          cell={cell.avg}
                          metric={v.metric}
                          compact
                          onClick={() =>
                            onDrill({
                              title: `${v.plat_nomor} · ${formatDayLabel(g.tanggal)}`,
                              subtitle: "Rincian per ritase",
                              tanggal: g.tanggal,
                              idKendaraan: v.id_kendaraan,
                              plat: v.plat_nomor,
                            })
                          }
                        />
                      ) : (
                        <span className="text-xs text-slate-300">–</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center">
                  <span
                    title={avg === null ? "Belum ada hari berdata" : `${STATUS_LABEL[status]} · rata-rata ${formatPct(avg)} dari ${pcts.length} hari berdata`}
                    className={cn(
                      "inline-flex min-w-[52px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset tabular-nums",
                      STATUS_TONE[status]
                    )}
                  >
                    {formatPct(avg)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
