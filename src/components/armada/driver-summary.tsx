"use client";

import { Clock, PackageCheck, Route as RouteIcon, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
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

function fmt(sec: number): string {
  if (sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m} menit` : `${m} menit ${r} detik`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0) return `${h} jam`;
  return `${h} jam ${rm} menit`;
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
    { label: "Loading", value: fmt(catDur.loading), icon: PackageCheck, tone: "bg-amber-100 text-amber-700" },
    { label: "Perjalanan", value: fmt(catDur.perjalanan), icon: RouteIcon, tone: "bg-sky-100 text-sky-700" },
    { label: "Tiba", value: fmt(catDur.tiba), icon: Clock, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Selesai", value: fmt(catDur.selesai), icon: Timer, tone: "bg-green-100 text-green-700" },
  ];

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-semibold text-slate-800">{title}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-100 px-3 py-2">
            <div className={cn("mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md", t.tone)}>
              <t.icon className="h-3.5 w-3.5" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.label}</p>
            <p className="text-base font-bold tabular-nums text-slate-800">{t.value}</p>
          </div>
        ))}
        <div className="rounded-lg border border-[#034075]/20 bg-[#034075]/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
          <p className="text-base font-bold tabular-nums text-[#034075]">{fmt(total)}</p>
        </div>
      </div>

      {/* Stacked bar proporsi durasi */}
      {total > 0 && (
        <div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-amber-400" style={{ width: `${(sum.loading / total) * 100}%` }} />
            <div className="bg-sky-500" style={{ width: `${(sum.perjalanan / total) * 100}%` }} />
            <div className="bg-emerald-400" style={{ width: `${(sum.tiba / total) * 100}%` }} />
            <div className="bg-green-600" style={{ width: `${(sum.selesai / total) * 100}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" />Loading {Math.round((sum.loading / total) * 100)}%</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-sky-500" />Perjalanan {Math.round((sum.perjalanan / total) * 100)}%</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" />Tiba {Math.round((sum.tiba / total) * 100)}%</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-green-600" />Selesai {Math.round((sum.selesai / total) * 100)}%</span>
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