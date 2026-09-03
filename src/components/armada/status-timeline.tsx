"use client";

import { useState, useMemo } from "react";
import { cn, formatDur } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";
import type { RitaseStop } from "@/types/armada";

export interface TimelineItem {
  id?: number;
  id_ritase?: number;
  kode_ritase?: string;
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
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Deduplicate: buang exact duplikat + consecutive same-status (spam tombol).
 *  Tapi JANGAN buang kalau muatannya beda (koli/ecer/hv berubah). */
export function dedupEvents(events: TimelineItem[]): TimelineItem[] {
  return events.filter((ev, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    const sameTime =
      new Date(ev.created_at).getTime() === new Date(prev.created_at).getTime();
    if (sameTime && ev.status === prev.status) return false;
    if (ev.status === prev.status) {
      // Jangan buang kalau muatan beda
      const prevKoli = prev.jumlah_koli ?? 0;
      const prevEcer = prev.jumlah_ecer ?? 0;
      const prevHV = prev.jumlah_high_value ?? 0;
      const curKoli = ev.jumlah_koli ?? 0;
      const curEcer = ev.jumlah_ecer ?? 0;
      const curHV = ev.jumlah_high_value ?? 0;
      if (curKoli !== prevKoli || curEcer !== prevEcer || curHV !== prevHV) return true;
      return false;
    }
    return true;
  });
}

/** Render timeline list (flat) — dipakai per-group atau single group. */
function TimelineList({
  items,
  showDateHeader,
}: {
  items: (TimelineItem & { titik?: string; durasi?: number })[];
  showDateHeader?: boolean;
}) {
  // Group by date
  const groups = useMemo(() => {
    const g: { label: string; items: typeof items }[] = [];
    for (const ev of items) {
      const label = dateLabel(ev.created_at);
      const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(ev);
      else g.push({ label, items: [ev] });
    }
    return g;
  }, [items]);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.label}>
          {showDateHeader && (
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {g.label}
            </p>
          )}
          <ol className="space-y-0">
            {g.items.map((ev, i) => {
              const isLast = i === g.items.length - 1;
              return (
                <li key={`${ev.id ?? i}-${i}`} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneOf(ev.status))} />
                    {!isLast && <span className="w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="min-w-0 pb-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className="min-w-0 truncate text-sm font-medium text-slate-800">{statusLabel(ev.status)}</p>
                      {ev.titik && (
                        <span className="min-w-0 truncate text-[11px] text-slate-500">{ev.titik}</span>
                      )}
                      {ev.status.toLowerCase().includes("bongkar") && (
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
    </div>
  );
}

/** Timeline status yang rapi: auto-group per kode_ritase, dedup, dot berwarna. */
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

  // 1. Sort chronologically ASC
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // 2. Dedup
  const cleaned = dedupEvents(sorted);

  if (cleaned.length === 0) {
    return <p className="py-3 text-center text-sm text-slate-400">Belum ada riwayat status</p>;
  }

  // 3. Label titik (fallback ke nama_lokasi)
  const names = (stops ?? []).map((s) => {
    if (!s) return "";
    if (s.nama_gudang) return `${s.nama_gudang}${s.tipe_gudang ? ` (${s.tipe_gudang})` : ""}`;
    if (s.nama_seller) return s.nama_seller;
    if (s.nama_drop_point) return s.nama_drop_point;
    if (s.keterangan) return s.keterangan;
    return s.jenis_stop;
  });
  let arrived = 0;
  const labeled = cleaned.map((ev, i) => {
    const s = ev.status.toLowerCase();
    const isTiba = s.includes("tiba") || s.includes("sampai");
    const isMenuju = s.includes("menuju") || s.includes("berangkat");

    let titik = "";
    if (names.length > 0) {
      const idx = isTiba || isMenuju ? arrived + 1 : arrived;
      if (idx < names.length) titik = names[idx];
      else titik = ev.nama_lokasi || "";
    } else {
      // Path B (no stops): derive lokasi "Tiba" dari event "menuju" sebelumnya
      if (isTiba) {
        const prevMenuju = cleaned.slice(0, i).reverse().find((e2) =>
          e2.status?.toLowerCase().includes("menuju") || e2.status?.toLowerCase().includes("berangkat")
        );
        titik = prevMenuju?.nama_lokasi || ev.nama_lokasi || "";
      } else {
        titik = ev.nama_lokasi || "";
      }
    }
    if (isTiba) arrived += 1;

    const next = cleaned[i + 1];
    const durasi = next
      ? Math.max(
          0,
          (new Date(next.created_at).getTime() - new Date(ev.created_at).getTime()) / 1000
        )
      : ev.status.toLowerCase().includes("selesai")
        ? (ev.durasi_detik ?? 0)
        : 0;
    return { ...ev, titik, durasi };
  });

  // 4. Group by kode_ritase
  const byKode = new Map<string, typeof labeled>();
  for (const ev of labeled) {
    const key = ev.kode_ritase || "Tanpa Ritase";
    const arr = byKode.get(key) ?? [];
    arr.push(ev);
    byKode.set(key, arr);
  }
  const kodeGroups = [...byKode.entries()].sort((a, b) => {
    const tA = new Date(a[1][0]?.created_at ?? 0).getTime();
    const tB = new Date(b[1][0]?.created_at ?? 0).getTime();
    return tA - tB;
  });

  const shownItems = showAll ? labeled : labeled.slice(0, limit);

  // 5. Selalu render dengan header kode_ritase per group
  return (
    <div className="space-y-4">
      {kodeGroups.map(([kode, groupEvents]) => {
        const items = showAll ? groupEvents : groupEvents.slice(0, limit);
        const hasCode = kode !== "Tanpa Ritase";
        return (
          <div key={kode}>
            {hasCode && (
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded bg-[#0c1e3a]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#0c1e3a]">
                  {kode}
                </span>
                <span className="text-[10px] text-slate-400">{groupEvents.length} event</span>
              </div>
            )}
            <TimelineList items={items} showDateHeader />
          </div>
        );
      })}
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
