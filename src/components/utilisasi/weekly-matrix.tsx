"use client";

import { useMemo } from "react";
import { CellPill } from "./utilisasi-cell";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_TONE,
  formatDayLabel,
} from "@/lib/day-category";
import { cn, formatNumber } from "@/lib/utils";
import type { WeeklyGroup, WeeklyVehicle } from "@/types/utilisasi";
import type { DrillTarget } from "./daily-matrix";

interface Props {
  groups: WeeklyGroup[];
  onDrill: (target: DrillTarget) => void;
}

function unitOf(metric: WeeklyVehicle["metric"]) {
  return metric === "koli" ? "koli" : "AWB";
}

export function WeeklyMatrix({ groups, onDrill }: Props) {
  const vehicles = useMemo(() => {
    const map = new Map<number, WeeklyVehicle>();
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
        Belum ada data mingguan pada rentang ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.week_start} className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50/80 px-4 py-2.5 dark:bg-slate-900/60">
            <div>
              <p className="text-sm font-semibold text-[#0c1e3a] dark:text-white">
                Minggu {formatDayLabel(g.week_start)} – {formatDayLabel(g.week_end)}
              </p>
              <p className="text-[11px] text-slate-400">
                Rata-rata per kategori hari (hanya ritase berdata yang dihitung).
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {CATEGORY_ORDER.map((cat) => (
                <span
                  key={cat}
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                    CATEGORY_TONE[cat]
                  )}
                >
                  {CATEGORY_LABEL[cat]}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="min-w-[190px] px-4 py-2 font-semibold">Kendaraan</th>
                  {CATEGORY_ORDER.map((cat) => (
                    <th key={cat} className="min-w-[88px] px-2 py-2 text-center font-semibold">
                      {CATEGORY_LABEL[cat]}
                    </th>
                  ))}
                  <th className="min-w-[88px] px-2 py-2 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const wv = g.vehicles.find((x) => x.id_kendaraan === v.id_kendaraan);
                  return (
                    <tr key={v.id_kendaraan} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                      <td className="px-4 py-2">
                        <p className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-white">
                          {v.plat_nomor}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {v.jenis_kendaraan || "-"} · {formatNumber(v.capacity_min)}–{formatNumber(v.capacity_max)} {unitOf(v.metric)}
                        </p>
                      </td>
                      {CATEGORY_ORDER.map((cat) => (
                        <td key={cat} className="px-2 py-1.5 text-center">
                          {wv ? (
                            <CellPill
                              cell={wv.categories[cat]}
                              metric={v.metric}
                              compact
                              onClick={() =>
                                onDrill({
                                  title: `${v.plat_nomor} · ${CATEGORY_LABEL[cat]} (${g.week_start} – ${g.week_end})`,
                                  subtitle: "Rincian ritase minggu ini",
                                  weekStart: g.week_start,
                                  idKendaraan: v.id_kendaraan,
                                  plat: v.plat_nomor,
                                })
                              }
                            />
                          ) : (
                            <span className="text-xs text-slate-300">–</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        {wv ? (
                          <CellPill
                            cell={wv.total}
                            metric={v.metric}
                            compact
                            onClick={() =>
                              onDrill({
                                title: `${v.plat_nomor} · Minggu ${g.week_start} – ${g.week_end}`,
                                subtitle: "Rincian seluruh ritase minggu ini",
                                weekStart: g.week_start,
                                idKendaraan: v.id_kendaraan,
                                plat: v.plat_nomor,
                              })
                            }
                          />
                        ) : (
                          <span className="text-xs text-slate-300">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
