"use client";

import { normalizeTripEvents } from "@/lib/normalize-trip-events";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn, formatDur } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";
import type { TimelineItem, RitaseInfo } from "@/components/armada/status-timeline";

export function DashboardLogTable({ events, activeRitaseId, ritaseInfoMap, roomy = false, newestFirst = false }: {
  roomy?: boolean;
  newestFirst?: boolean;
  events: TimelineItem[];
  activeRitaseId?: number;
  ritaseInfoMap?: Map<string, RitaseInfo>;
}) {
  events = normalizeTripEvents(events);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = new Map<string, TimelineItem[]>();
  for (const event of [...events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
    const key = event.kode_ritase || String(event.id_ritase ?? "Tanpa ritase");
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const entries = [...groups.entries()].reverse();
  if (newestFirst) for (const [, items] of entries) items.reverse();
  const activeKey = entries.find(([, items]) => items.some((e) => e.id_ritase === activeRitaseId))?.[0] ?? entries[0]?.[0];
  const time = (iso: string) => Number.isNaN(Date.parse(iso)) ? "—" : new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));
  return <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
    <p className="text-[11px] text-slate-500">{events.length} aktivitas · Waktu WIB</p>
    <div className={cn("min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border border-slate-200", roomy ? "[&_section]:min-w-[540px] [&_table]:text-xs sm:[&_table]:text-sm [&_th]:p-3 [&_td]:p-3 [&_th:first-child]:w-[76px] [&_th:last-child]:w-[90px] [&_section>button]:text-xs" : "max-h-[320px]")} tabIndex={0} aria-label="Log aktivitas armada">
      {entries.map(([key, items]) => {
        const open = expanded[key] ?? key === activeKey;
        return <section key={key} className="border-b border-slate-200 last:border-0">
          <button type="button" aria-expanded={open} onClick={() => setExpanded((prev) => ({ ...prev, [key]: !open }))} className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2.5 text-left text-[10px]">
            <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800" title={key}>{key}</span><span className="mt-1 block whitespace-normal break-words text-slate-600" title={ritaseInfoMap?.get(key)?.nama_driver}>{ritaseInfoMap?.get(key)?.nama_driver || "Nama driver belum tersedia"}{ritaseInfoMap?.get(key)?.plat_nomor && <> · {ritaseInfoMap.get(key)!.plat_nomor}</>}</span></span>
            {ritaseInfoMap?.get(key)?.ritase_ke != null && <span className="shrink-0 text-slate-500">Rit {ritaseInfoMap.get(key)!.ritase_ke}</span>}
            <span className="ml-auto shrink-0 text-slate-500">{items.length} event</span>
          </button>
          {open && <table className="w-full table-fixed text-left text-[10px]">
            <caption className="sr-only">Log ritase {key}, waktu WIB</caption>
            <thead className="sticky top-0 z-10 bg-white text-slate-500"><tr><th scope="col" className="w-[48px] border-b p-2 font-medium">Waktu</th><th scope="col" className="w-[31%] border-b p-2 font-medium">Aktivitas</th><th scope="col" className="border-b p-2 font-medium">Lokasi</th><th scope="col" className="w-[52px] border-b p-2 font-medium">Durasi</th></tr></thead>
            <tbody>{items.map((event, index) => <tr key={event.id ?? index} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
              <td className="p-2 tabular-nums" title={event.created_at}>{time(event.created_at)}</td>
              <td className="break-words p-2 font-medium text-slate-800">{statusLabel(event.status)}
                {((event.jumlah_koli ?? 0) > 0 || (event.jumlah_ecer ?? 0) > 0 || (event.jumlah_high_value ?? 0) > 0) && <p className="mt-1 text-xs font-normal text-amber-700">{[(event.jumlah_koli ?? 0) > 0 ? event.jumlah_koli + " koli" : null, (event.jumlah_ecer ?? 0) > 0 ? event.jumlah_ecer + " ecer" : null, (event.jumlah_high_value ?? 0) > 0 ? event.jumlah_high_value + " HV" : null].filter(Boolean).join(" · ")}</p>}
                {event.catatan && <p className="mt-1 whitespace-pre-wrap break-words text-xs font-normal text-slate-500">{event.catatan}</p>}
              </td>
              <td className="break-words p-2 text-slate-500" title={event.nama_lokasi || ""}>{event.nama_lokasi || "—"}</td>
              <td className="p-2 tabular-nums text-slate-600">{event.durasi_detik != null ? formatDur(event.durasi_detik) || "0s" : "—"}</td>
            </tr>)}</tbody>
          </table>}
        </section>;
      })}
    </div>
  </div>;
}
