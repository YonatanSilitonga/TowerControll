"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
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
import type { DrillTarget } from "./daily-matrix";

interface Props {
  target: DrillTarget | null;
  trips: TripDetail[];
  onClose: () => void;
}

export function DrilldownModal({ target, trips, onClose }: Props) {
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const rows = useMemo(() => {
    if (!target) return [];
    return trips
      .filter((t) => {
        if (t.id_kendaraan !== target.idKendaraan) return false;
        if (target.tanggal) return t.tanggal === target.tanggal;
        if (target.weekStart) return t.week_start === target.weekStart;
        if (target.month) return t.tanggal.slice(0, 7) === target.month;
        return true;
      })
      .sort((a, b) => (a.tanggal === b.tanggal ? a.ritase_ke - b.ritase_ke : a.tanggal.localeCompare(b.tanggal)));
  }, [target, trips]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl border bg-card shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0c1e3a] dark:text-white">{target.title}</p>
            {target.subtitle && <p className="text-xs text-slate-400">{target.subtitle}</p>}
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

        <div className="max-h-[calc(85vh-64px)] overflow-auto">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              Tidak ada ritase untuk kendaraan ini pada periode tersebut.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                  <th className="px-2 py-2 text-center font-semibold">Rit</th>
                  <th className="px-2 py-2 text-left font-semibold">Driver</th>
                  <th className="px-2 py-2 text-right font-semibold">Muatan</th>
                  <th className="px-2 py-2 text-center font-semibold">Utilisasi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id_ritase} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
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
                    </td>
                    <td className="px-2 py-2 text-center text-xs font-bold text-slate-500">R{t.ritase_ke}</td>
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300">
                      {t.nama_driver || "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-xs tabular-nums">
                      {t.has_data ? (
                        <>
                          {formatNumber(t.load)}{" "}
                          <span className="text-[10px] text-slate-400">{t.metric === "koli" ? "koli" : "AWB"}</span>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span
                        title={STATUS_LABEL[t.status]}
                        className={cn(
                          "inline-flex min-w-[48px] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset tabular-nums",
                          STATUS_TONE[t.status]
                        )}
                      >
                        {formatPct(t.pct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
