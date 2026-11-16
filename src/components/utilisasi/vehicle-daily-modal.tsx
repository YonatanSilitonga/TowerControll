"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  CATEGORY_TONE,
  formatDayLabel,
  formatPct,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/day-category";
import type { DailyGroup, DailyVehicle, Metric } from "@/types/utilisasi";
import type { VehicleTarget } from "./daily-matrix";

interface Props {
  vehicle: VehicleTarget | null;
  groups: DailyGroup[];
  onClose: () => void;
}

interface DayItem {
  tanggal: string;
  dayCategory: DailyGroup["day_category"];
  vehicle?: DailyVehicle;
}

function unitOf(metric: Metric) {
  return metric === "koli" ? "koli" : "AWB";
}

function DayCard({
  item,
  metric,
}: {
  item: DayItem;
  metric: Metric;
}) {
  const unit = unitOf(metric);
  const avg = item.vehicle?.avg;
  const hasData = !!avg && avg.trips_with_data > 0 && avg.pct !== null;
  const status = avg?.status ?? "no_data";
  const rits = item.vehicle?.rits ?? [
    { ritase_ke: 1, cell: { trips: 0, trips_with_data: 0, load: 0, pct: null, status: "no_data" as const } },
    { ritase_ke: 2, cell: { trips: 0, trips_with_data: 0, load: 0, pct: null, status: "no_data" as const } },
    { ritase_ke: 3, cell: { trips: 0, trips_with_data: 0, load: 0, pct: null, status: "no_data" as const } },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        hasData ? "bg-card" : "bg-slate-50/60 dark:bg-slate-900/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatDayLabel(item.tanggal)}
          </p>
          <span
            className={cn(
              "mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
              CATEGORY_TONE[item.dayCategory]
            )}
          >
            {CATEGORY_LABEL[item.dayCategory]}
          </span>
        </div>
        <span
          title={STATUS_LABEL[status]}
          className={cn(
            "inline-flex min-w-[48px] items-center justify-center rounded-md px-1.5 py-1 text-[11px] font-semibold ring-1 ring-inset tabular-nums",
            STATUS_TONE[status]
          )}
        >
          {formatPct(avg?.pct ?? null)}
        </span>
      </div>

      <div className="mt-2 border-t border-dashed border-slate-200 pt-2 dark:border-slate-700">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Total muatan
        </p>
        <p className="text-lg font-bold leading-tight tabular-nums text-[#0c1e3a] dark:text-white">
          {hasData ? formatNumber(avg!.load) : "–"}{" "}
          <span className="text-xs font-normal text-slate-400">{unit}</span>
        </p>
      </div>

      <div className="mt-2 space-y-1">
        {rits.map((r) => (
          <div key={r.ritase_ke} className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Rit {r.ritase_ke}</span>
            <span className="font-mono font-semibold tabular-nums text-slate-600 dark:text-slate-300">
              {r.cell.trips_with_data > 0 ? `${formatNumber(r.cell.load)} ${unit}` : "–"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VehicleDailyModal({ vehicle, groups, onClose }: Props) {
  useEffect(() => {
    if (!vehicle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vehicle, onClose]);

  const items = useMemo<DayItem[]>(() => {
    if (!vehicle) return [];
    return groups.map((g) => ({
      tanggal: g.tanggal,
      dayCategory: g.day_category,
      vehicle: g.vehicles.find((x) => x.id_kendaraan === vehicle.idKendaraan),
    }));
  }, [vehicle, groups]);

  if (!vehicle) return null;

  const unit = unitOf(vehicle.metric);
  const daysWithData = items.filter(
    (d) => d.vehicle && d.vehicle.avg.trips_with_data > 0
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border bg-card shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-[#0c1e3a] dark:text-white">
              {vehicle.plat}
            </p>
            <p className="text-xs text-slate-400">
              {vehicle.jenis || "-"} · kapasitas {formatNumber(vehicle.capacityMin)}–
              {formatNumber(vehicle.capacityMax)} {unit} · {daysWithData}/{items.length} hari berdata
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto p-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Tidak ada tanggal pada rentang ini.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <DayCard key={item.tanggal} item={item} metric={vehicle.metric} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
