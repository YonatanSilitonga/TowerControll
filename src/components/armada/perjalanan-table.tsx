"use client";

import { formatDur } from "@/lib/utils";
import type { RitaseStop } from "@/types/armada";

interface Ev {
  id?: number;
  status: string;
  created_at: string;
  durasi_detik?: number | null;
}

function toSec(s?: number | null): number {
  return s && s > 0 ? s : 0;
}

function stopName(s: RitaseStop): string {
  if (s.nama_gudang) return `${s.nama_gudang}${s.tipe_gudang ? ` (${s.tipe_gudang})` : ""}`;
  if (s.nama_seller) return s.nama_seller;
  if (s.nama_drop_point) return s.nama_drop_point;
  if (s.keterangan) return s.keterangan;
  return s.jenis_stop;
}

function catOf(status: string): "tiba" | "lain" {
  const s = status.toLowerCase();
  if (s.includes("tiba") || s.includes("sampai")) return "tiba";
  return "lain";
}

/** Tabel perjalanan per titik (leg): Dari → Ke · Durasi. Pakai rute (stops) + timeline event. */
export function PerjalananTable({ stops, events }: { stops?: RitaseStop[]; events: Ev[] }) {
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const withDur = sorted.map((ev, i) => {
    let dur = toSec(ev.durasi_detik);
    if (dur <= 0) {
      const next = sorted[i + 1];
      if (next) {
        dur = Math.max(0, (new Date(next.created_at).getTime() - new Date(ev.created_at).getTime()) / 1000);
      }
    }
    return { ...ev, dur };
  });

  // Nama leg: dari rute (stops) atau generik dari event "tiba"
  let legNames: string[] = [];
  if (stops && stops.length > 1) {
    for (let i = 0; i < stops.length - 1; i++) {
      legNames.push(`${stopName(stops[i])} → ${stopName(stops[i + 1])}`);
    }
  } else {
    const arrivals = withDur.filter((e) => catOf(e.status) === "tiba").length;
    for (let i = 0; i < arrivals; i++) {
      legNames.push(i === 0 ? "Awal → Titik 1" : `Titik ${i} → Titik ${i + 1}`);
    }
  }

  // Bucket durasi per leg: ditutup tiap event "tiba"
  const buckets: number[] = [0];
  for (const ev of withDur) {
    buckets[buckets.length - 1] += ev.dur;
    if (catOf(ev.status) === "tiba") buckets.push(0);
  }
  if (buckets.length > 1 && buckets[buckets.length - 1] === 0) buckets.pop();

  const n = Math.max(legNames.length, buckets.length);
  if (n === 0) {
    return <p className="text-sm text-slate-400">Belum ada data perjalanan</p>;
  }
  const rows = Array.from({ length: n }, (_, i) => ({
    name: legNames[i] ?? `Leg ${i + 1}`,
    dur: buckets[i] ?? 0,
  }));
  const total = buckets.reduce((a, b) => a + b, 0);

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Dari → Ke</th>
            <th className="px-3 py-2 text-right font-semibold">Durasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-slate-700">{r.name}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-800">{formatDur(r.dur)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50">
            <td className="px-3 py-2" colSpan={2}>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total Perjalanan</span>
            </td>
            <td className="px-3 py-2 text-right font-bold tabular-nums text-[#0c1e3a]">{formatDur(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}