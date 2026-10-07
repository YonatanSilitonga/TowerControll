"use client";

import { normalizeTripEvents as dedupEvents } from "@/lib/normalize-trip-events";
import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
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

/** Date label from YYYY-MM-DD string (for ritase.tanggal). */
function dateLabelFromStr(tgl: string): string {
  const [y, m, d] = tgl.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(date.getTime())) return tgl;
  const today = new Date();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Hari Ini";
  if (sameDay(date, yest)) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function timeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Info ritase untuk ditampilkan di header group (driver name + ritase ke). */
export interface RitaseInfo {
  plat_nomor?: string | null;
  nama_driver?: string;
  ritase_ke?: number | null;
  tanggal?: string;
}

/** Deduplicate: merge consecutive bongkar muat di ritase + lokasi sama,
 *  buang exact duplikat, buang spam tombol (same status + same payload). */
export { normalizeTripEvents as dedupEvents } from "@/lib/normalize-trip-events";
/** Render timeline list (flat) — dipakai per-group atau single group. */
function TimelineList({
  items,
  showDateHeader,
  compact,
  ritaseTanggal,
}: {
  items: (TimelineItem & { titik?: string; durasi?: number })[];
  showDateHeader?: boolean;
  compact?: boolean;
  ritaseTanggal?: string;
}) {
  // Group by date — if ritaseTanggal provided, all items share one date header
  const groups = useMemo(() => {
    if (ritaseTanggal) {
      const label = dateLabelFromStr(ritaseTanggal);
      return [{ label, items }];
    }
    const g: { label: string; items: typeof items }[] = [];
    for (const ev of items) {
      const label = dateLabel(ev.created_at);
      const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(ev);
      else g.push({ label, items: [ev] });
    }
    return g;
  }, [items, ritaseTanggal]);

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
                      {!compact && ev.titik && (
                        <span className="min-w-0 truncate text-[11px] text-slate-500">{ev.titik}</span>
                      )}
                      {!compact && ((ev.jumlah_koli ?? 0) > 0 || (ev.jumlah_ecer ?? 0) > 0 || (ev.jumlah_high_value ?? 0) > 0) && (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          📦 {(ev.jumlah_koli ?? 0) > 0 && `${ev.jumlah_koli} Koli`}
                          {(ev.jumlah_ecer ?? 0) > 0 && ` • ${ev.jumlah_ecer} Ecer`}
                          {(ev.jumlah_high_value ?? 0) > 0 && ` • ${ev.jumlah_high_value} HV`}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{timeOnly(ev.created_at)}</span>
                      {!compact && ev.durasi_detik ? formatDur(ev.durasi_detik) && (
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

/** Timeline status yang rapi: auto-group per kode_ritase, dedup, dot berwarna. Tiap group bisa di-collapse. */
export function StatusTimeline({
  events,
  stops,
  ritaseInfoMap,
  variant,
}: {
  events: TimelineItem[];
  stops?: RitaseStop[];
  ritaseInfoMap?: Map<string, RitaseInfo>;
  variant?: "default" | "compact";
}) {
  const isCompact = variant === "compact";
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (kode: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  };

  // 1. Sort chronologically ASC
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // 2. Dedup
  const cleaned = dedupEvents(sorted);

  if (cleaned.length === 0) {
    return <p className="py-3 text-center text-sm text-slate-400">Belum ada riwayat status</p>;
  }

  // Use the recorded location and shared duration, never infer a different stop.
  const labeled = cleaned.map(ev => ({ ...ev, titik: ev.nama_lokasi || "—", durasi: ev.durasi_detik ?? 0 }));

  // 4. Group by kode_ritase
  const byKode = new Map<string, typeof labeled>();
  for (const ev of labeled) {
    const key = ev.kode_ritase || "Tanpa Jadwal";
    const arr = byKode.get(key) ?? [];
    arr.push(ev);
    byKode.set(key, arr);
  }
  const kodeGroups = [...byKode.entries()].sort((a, b) => {
    const tA = new Date(a[1][0]?.created_at ?? 0).getTime();
    const tB = new Date(b[1][0]?.created_at ?? 0).getTime();
    return tA - tB;
  });

  // 5. Render per-group dengan collapse/expand
  return (
    <div className="space-y-4">
      {kodeGroups.map(([kode, groupEvents]) => {
        const isCollapsed = collapsedGroups.has(kode);
        const hasCode = kode !== "Tanpa Jadwal";
        return (
          <div key={kode}>
            {hasCode && (
              <button
                type="button"
                onClick={() => toggleGroup(kode)}
                className="mb-1.5 flex flex-wrap items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200",
                    !isCollapsed && "rotate-90",
                  )}
                />
                <span className="rounded bg-[#0c1e3a]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#0c1e3a]">
                  {kode}
                </span>
                {ritaseInfoMap?.get(kode)?.nama_driver && (
                  <span className="text-[10px] font-semibold text-slate-600">
                    {ritaseInfoMap.get(kode)!.nama_driver}
                  </span>
                )}
                {ritaseInfoMap?.get(kode)?.ritase_ke != null && (
                  <span className="text-[10px] text-slate-400">
                    Rit {ritaseInfoMap.get(kode)!.ritase_ke}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">{groupEvents.length} event</span>
              </button>
            )}
            {!isCollapsed && <TimelineList items={groupEvents} showDateHeader={!isCompact} compact={isCompact} ritaseTanggal={ritaseInfoMap?.get(kode)?.tanggal} />}
          </div>
        );
      })}
    </div>
  );
}
