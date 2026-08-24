"use client";

import { useState } from "react";
import { cn, formatDur } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";
import type { RitaseStop } from "@/types/armada";

interface TimelineItem {
  id?: number;
  status: string;
  created_at: string;
  durasi_detik?: number | null;
  catatan?: string | null;
  nama_lokasi?: string | null;
  jumlah_koli?: number | null;
  jumlah_ecer?: number | null;
  jumlah_high_value?: number | null;
}

function stopName(s?: RitaseStop): string {
  if (!s) return "";
  if (s.nama_gudang) return `${s.nama_gudang}${s.tipe_gudang ? ` (${s.tipe_gudang})` : ""}`;
  if (s.nama_seller) return s.nama_seller;
  if (s.nama_drop_point) return s.nama_drop_point;
  if (s.keterangan) return s.keterangan;
  return s.jenis_stop;
}

function toneOf(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("bongkar") || s.includes("muat")) return "bg-amber-400";
  if (s.includes("keluar")) return "bg-sky-500";
  if (s.includes("menuju")) return "bg-blue-400";
  if (s.includes("tiba") || s.includes("sampai")) return "bg-emerald-500";
  if (s.includes("selesai") || s.includes("done")) return "bg-green-600";
  return "bg-slate-400";
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const today = new Date();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hari Ini";
  if (sameDay(d, yest)) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function timeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Timeline status yang rapi: group per tanggal, dedup duplikat, dot berwarna, durasi chip, info titik. */
export function StatusTimeline({
  events,
  limit = 20,
  stops,
}: {
  events: TimelineItem[];
  limit?: number;
  stops?: RitaseStop[];
}) {
  const [showAll, setShowAll] = useState(false);

  // dedup: buang baris kembar (status + menit yang sama persis berurutan)
  const cleaned = (events ?? []).filter((ev, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    const sameTime =
      new Date(ev.created_at).getTime() === new Date(prev.created_at).getTime();
    return !(sameTime && ev.status === prev.status);
  });

  if (cleaned.length === 0) {
    return <p className="py-3 text-center text-sm text-slate-400">Belum ada riwayat status</p>;
  }

  // Label titik per event (dari event.nama_lokasi atau rute stops)
  const names = (stops ?? []).map(stopName);
  let arrived = 0;
  const labeled = cleaned.map((ev) => {
    const s = ev.status.toLowerCase();
    const isTiba = s.includes("tiba") || s.includes("sampai");
    const isMenuju = s.includes("menuju") || s.includes("berangkat");
    let idx = isTiba || isMenuju ? arrived + 1 : arrived;
    if (names.length > 0) idx = Math.min(idx, names.length - 1);
    if (isTiba) arrived += 1;
    const titik = ev.nama_lokasi || (names.length > 0 ? names[idx] : "");
    return { ...ev, titik };
  });

  const shown = showAll ? labeled : labeled.slice(0, limit);

  // Group by date label
  const groups: { label: string; items: (TimelineItem & { titik?: string })[] }[] = [];
  for (const ev of shown) {
    const label = dateLabel(ev.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(ev);
    else groups.push({ label, items: [ev] });
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {g.label}
          </p>
          <ol className="space-y-0">
            {g.items.map((ev, i) => {
              const isLast = i === g.items.length - 1;
              return (
                <li key={`${ev.id ?? i}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", toneOf(ev.status))} />
                    {!isLast && <span className="w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="pb-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="text-sm font-medium text-slate-800">{statusLabel(ev.status)}</p>
                      {ev.titik && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {ev.titik}
                        </span>
                      )}
                      {((ev.jumlah_koli ?? 0) > 0 || (ev.jumlah_ecer ?? 0) > 0 || (ev.jumlah_high_value ?? 0) > 0) && (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          📦 {ev.jumlah_koli ?? 0} Koli
                          {(ev.jumlah_ecer ?? 0) > 0 && ` • ${ev.jumlah_ecer} Ecer`}
                          {(ev.jumlah_high_value ?? 0) > 0 && ` • ${ev.jumlah_high_value} HV`}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{timeOnly(ev.created_at)}</span>
                      {ev.durasi_detik ? formatDur(ev.durasi_detik) && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {formatDur(ev.durasi_detik)}
                        </span>
                      ) : null}
                    </div>
                    {ev.catatan && <p className="mt-0.5 text-xs text-slate-400">{ev.catatan}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {cleaned.length > limit && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {showAll ? "Sembunyikan" : `Tampilkan semua (${cleaned.length})`}
        </button>
      )}
    </div>
  );
}