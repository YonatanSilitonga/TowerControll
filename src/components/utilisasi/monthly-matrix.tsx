"use client";

import { useMemo } from "react";
import { MonthPill } from "./utilisasi-cell";
import { CATEGORY_LABEL, CATEGORY_ORDER, formatMonthLabel } from "@/lib/day-category";
import { formatNumber } from "@/lib/utils";
import type { MonthlyGroup, MonthlyVehicle } from "@/types/utilisasi";
import type { DrillTarget } from "./daily-matrix";

interface Props {
  groups: MonthlyGroup[];
  onDrill: (target: DrillTarget) => void;
}

function unitOf(metric: MonthlyVehicle["metric"]) {
  return metric === "koli" ? "koli" : "AWB";
}

export function MonthlyMatrix({ groups, onDrill }: Props) {
  const vehicles = useMemo(() => {
    const map = new Map<number, MonthlyVehicle>();
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
        Belum ada data bulanan pada rentang ini.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50/80 dark:bg-slate-900/60">
            <th className="sticky left-0 z-20 min-w-[190px] bg-slate-50/95 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-slate-900/95">
              Kendaraan
            </th>
            {groups.map((g) => (
              <th key={g.month} className="min-w-[104px] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {formatMonthLabel(g.month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id_kendaraan} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
              <td className="sticky left-0 z-10 bg-card px-4 py-2">
                <p className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-white">{v.plat_nomor}</p>
                <p className="text-[10px] text-slate-400">
                  {v.jenis_kendaraan || "-"} · {formatNumber(v.capacity_min)}–{formatNumber(v.capacity_max)} {unitOf(v.metric)}
                </p>
              </td>
              {groups.map((g) => {
                const mv = g.vehicles.find((x) => x.id_kendaraan === v.id_kendaraan);
                const cats = CATEGORY_ORDER.map((cat) => ({
                  cat,
                  cell: mv?.categories[cat],
                }));
                return (
                  <td key={g.month} className="px-3 py-2">
                    {mv ? (
                      <div className="flex flex-col items-center gap-1">
                        {cats.map(({ cat, cell }) => (
                          <div key={cat} className="flex w-full items-center gap-1">
                            <span className="w-9 shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              {CATEGORY_LABEL[cat]}
                            </span>
                            {cell ? (
                              <MonthPill
                                avgPct={cell.avg_pct}
                                status={cell.status}
                                weeks={cell.weeks}
                                className="flex-1"
                                onClick={() =>
                                  onDrill({
                                    title: `${v.plat_nomor} · ${CATEGORY_LABEL[cat]} ${formatMonthLabel(g.month)}`,
                                    subtitle: "Rincian ritase bulan ini",
                                    month: g.month,
                                    idKendaraan: v.id_kendaraan,
                                    plat: v.plat_nomor,
                                  })
                                }
                              />
                            ) : (
                              <span className="text-xs text-slate-300">–</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="block text-center text-xs text-slate-300">–</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
