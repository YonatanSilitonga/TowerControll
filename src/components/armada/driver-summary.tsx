"use client";

import { Clock, PackageCheck, Route as RouteIcon, Timer } from "lucide-react";
import { cn, formatDur } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";
import { PerjalananTable } from "@/components/armada/perjalanan-table";
import type { RitaseStop } from "@/types/armada";

interface Ev {
  id?: number;
  id_ritase?: number;
  kode_ritase?: string;
  status: string;
  created_at: string;
  durasi_detik?: number | null;
  catatan?: string | null;
}

function toSec(s?: number | null): number {
  return s && s > 0 ? s : 0;
}

function catOf(status: string): "loading" | "perjalanan" | "tiba" | "selesai" | "lain" {
  const s = status.toLowerCase();
  if (s.includes("loading") || s.includes("bongkar") || s.includes("muat")) return "loading";
  if (s.includes("keluar") || s.includes("menuju") || s.includes("berangkat") || s.includes("perjalanan"))
    return "perjalanan";
  if (s.includes("tiba") || s.includes("sampai")) return "tiba";
  if (s.includes("selesai") || s.includes("done") || s.includes("completed")) return "selesai";
  return "lain";
}

export interface DurationSummary {
  loading: number;
  perjalanan: number;
  tiba: number;
  selesai: number;
  total: number;
}

/** Hitung ringkasan durasi (detik) dari daftar event. Dipakai dashboard & detail. */
export function summarizeEvents(events: Ev[]): DurationSummary {
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const out: DurationSummary = { loading: 0, perjalanan: 0, tiba: 0, selesai: 0, total: 0 };
  sorted.forEach((ev, i) => {
    let dur = toSec(ev.durasi_detik);
    if (dur <= 0) {
      const next = sorted[i + 1];
      if (next) {
        dur = Math.max(0, (new Date(next.created_at).getTime() - new Date(ev.created_at).getTime()) / 1000);
      }
    }
    const c = catOf(ev.status);
    if (c !== "lain") out[c] += dur;
    out.total += dur;
  });
  return out;
}

/** Ringkasan durasi per driver/ritase: loading, perjalanan, tiba, selesai + rincian titik→titik. */
export function DriverSummary({
  events,
  title,
  stops,
}: {
  events: Ev[];
  title?: string;
  stops?: RitaseStop[];
}) {
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const sum = summarizeEvents(events);
  const catDur = { loading: sum.loading, perjalanan: sum.perjalanan, tiba: sum.tiba, selesai: sum.selesai };
  const total = sum.total;

  const tiles = [
    { label: "Loading", value: formatDur(catDur.loading), icon: PackageCheck },
    { label: "Perjalanan", value: formatDur(catDur.perjalanan), icon: RouteIcon },
    { label: "Tiba", value: formatDur(catDur.tiba), icon: Clock },
    { label: "Selesai", value: formatDur(catDur.selesai), icon: Timer },
  ];

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-semibold text-slate-800">{title}</p>}

      {/* Tiles durasi — 2x2 biar tetap rapi di panel sempit */}
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <t.icon className="h-3 w-3" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.label}</p>
            </div>
            <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">{t.value}</p>
          </div>
        ))}
      </div>

      {/* Total — full-width */}
      <div className="flex items-center justify-between rounded-lg border border-[#0c1e3a]/20 bg-[#0c1e3a]/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Durasi</p>
        <p className="text-sm font-bold tabular-nums text-[#0c1e3a]">{formatDur(total)}</p>
      </div>

      {/* Stacked bar proporsi + legend cuma yang non-zero */}
      {total > 0 && (
        <div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-amber-400" style={{ width: `${(sum.loading / total) * 100}%` }} />
            <div className="bg-sky-500" style={{ width: `${(sum.perjalanan / total) * 100}%` }} />
            <div className="bg-emerald-400" style={{ width: `${(sum.tiba / total) * 100}%` }} />
            <div className="bg-green-600" style={{ width: `${(sum.selesai / total) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
            {[
              { label: "Loading", v: sum.loading, color: "bg-amber-400" },
              { label: "Perjalanan", v: sum.perjalanan, color: "bg-sky-500" },
              { label: "Tiba", v: sum.tiba, color: "bg-emerald-400" },
              { label: "Selesai", v: sum.selesai, color: "bg-green-600" },
            ]
              .filter((p) => p.v > 0)
              .map((p) => (
                <span key={p.label} className="inline-flex items-center gap-1">
                  <i className={cn("h-2 w-2 rounded-full", p.color)} />
                  {p.label} {Math.round((p.v / total) * 100)}%
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="mt-1">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Perjalanan per Titik
        </p>
        <PerjalananTable stops={stops} events={events} />
      </div>
    </div>
  );
}