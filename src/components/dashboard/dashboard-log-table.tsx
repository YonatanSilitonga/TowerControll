"use client";

import { normalizeTripEvents } from "@/lib/normalize-trip-events";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, X } from "lucide-react";
import { cn, formatDur } from "@/lib/utils";
import { getFullPhotoUrl, statusLabel } from "@/lib/constants";
import { useMuatanDetail } from "@/hooks/use-tracking";
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
              <td className="break-words p-2 text-slate-500" title={event.nama_lokasi || ""}>
                {event.nama_lokasi || "—"}
                {event.status.toLowerCase().includes("muat") && event.id_ritase != null && event.nama_lokasi ? (
                  <MuatanDetailView idRitase={event.id_ritase} namaLokasi={event.nama_lokasi} />
                ) : null}
              </td>
              <td className="p-2 tabular-nums text-slate-600">{event.durasi_detik != null ? formatDur(event.durasi_detik) || "0s" : "—"}</td>
            </tr>)}</tbody>
          </table>}
        </section>;
      })}
    </div>
  </div>;
}

function fmtWaktu(iso: string): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "—";
  return (
    new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso)) + " WIB"
  );
}

function muatanParts(d: { awb: number; koli: number; ecer: number; hv: number }): string[] {
  const parts: string[] = [];
  if (d.awb > 0) parts.push(`${d.awb} AWB`);
  if (d.koli > 0) parts.push(`${d.koli} koli`);
  if (d.ecer > 0) parts.push(`${d.ecer} ecer`);
  if (d.hv > 0) parts.push(`${d.hv} HV`);
  return parts;
}

function muatanRingkas(d: { awb: number; koli: number; ecer: number; hv: number }): string {
  const parts = muatanParts(d);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function adaMuatan(d: { awb: number; koli: number; ecer: number; hv: number }): boolean {
  return d.awb > 0 || d.koli > 0 || d.ecer > 0 || d.hv > 0;
}

/** Nilai ringkasan anti-patah baris di tengah satuan ("23 / HV"). */
function MuatanValue({ d, className }: { d: { awb: number; koli: number; ecer: number; hv: number }; className?: string }) {
  const parts = muatanParts(d);
  if (parts.length === 0) return <span className={className}>—</span>;
  return (
    <span className={cn("tabular-nums", className)}>
      {parts.map((p, i) => (
        <span key={p}>
          {i > 0 && <span className="font-normal text-slate-300"> · </span>}
          <span className="whitespace-nowrap">{p}</span>
        </span>
      ))}
    </span>
  );
}

/** Angka muatan + tombol Detail (modal rincian per konfirmasi) di sel Lokasi.
 *  Hanya tampil bila titik itu punya muatan (input/terkonfirmasi); saat
 *  loading atau kosong, sel hanya menampilkan nama lokasi. Saat error,
 *  tombol Detail tetap tampil sebagai jalur diagnosis. */
function MuatanDetailView({
  idRitase,
  namaLokasi,
}: {
  idRitase: number;
  namaLokasi: string;
}) {
  const [open, setOpen] = useState(false);
  const q = useMuatanDetail(idRitase, namaLokasi, true);
  const d = q.data;

  if (q.isLoading || (!q.isError && d && !adaMuatan(d.diambil) && !adaMuatan(d.input))) {
    return null;
  }
  const label =
    d && adaMuatan(d.diambil)
      ? <>Terkonfirmasi: {muatanRingkas(d.diambil)}</>
      : d && adaMuatan(d.input)
        ? <>Input: {muatanRingkas(d.input)}</>
        : null;

  return (
    <>
      {label && <p className="mt-1 text-xs font-normal text-emerald-700">{label}</p>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-0.5 text-xs font-semibold text-blue-600 hover:underline"
      >
        Detail
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-slate-950/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[111] max-h-[80dvh] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl focus:outline-none sm:p-5">
            <div className="mb-3 pr-8">
              <Dialog.Title className="text-base font-bold text-slate-900">
                Rincian muatan · {namaLokasi}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-slate-500">
                Yang sudah dikonfirmasi koor gudang / kapten pada ritase ini.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Tutup rincian muatan"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
            {q.isLoading ? (
              <p className="py-6 text-center text-sm text-slate-400">Memuat rincian...</p>
            ) : q.isError || !d ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Gagal memuat rincian muatan.
              </p>
            ) : d.lokasi == null || d.konfirmasi.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Belum ada konfirmasi muatan pada titik ini.
              </p>
            ) : (
              <div className="space-y-3">
                {d.konfirmasi.length > 0 && !adaMuatan(d.sisa) && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] text-white">
                      ✓
                    </span>
                    Semua muatan titik ini sudah diambil — tidak ada sisa.
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Input</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      <MuatanValue d={d.input} />
                    </p>
                  </div>
                  <div className="min-w-0 border-x border-slate-200 px-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Diambil</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      <MuatanValue d={d.diambil} />
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Sisa</p>
                    <p className="mt-1 text-sm font-bold text-amber-600">
                      <MuatanValue d={d.sisa} />
                    </p>
                  </div>
                </div>
                {d.konfirmasi.map((k) => (
                  <div key={k.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-xs font-bold uppercase text-white">
                        {(k.oleh || "?").trim().charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {k.oleh} <span className="font-medium text-slate-400">· {k.peran}</span>
                        </p>
                        <p className="text-[11px] tabular-nums text-slate-400">{fmtWaktu(k.waktu)}</p>
                      </div>
                    </div>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-sm font-semibold text-slate-800">
                      <MuatanValue d={{ awb: k.jumlah_awb, koli: k.koli, ecer: k.ecer, hv: k.hv }} />
                    </p>
                    {k.catatan && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs italic text-slate-500">
                        &quot;{k.catatan}&quot;
                      </p>
                    )}
                    {k.foto && (
                      <a
                        href={getFullPhotoUrl(k.foto)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Lihat foto bukti
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
