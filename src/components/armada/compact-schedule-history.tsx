"use client";
import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { isRitaseExpired } from "@/lib/constants";
import { formatDateDMY } from "@/lib/utils";
import type { Ritase } from "@/types/armada";
export function CompactScheduleHistory({ rows, loading, context }: { rows: Ritase[]; loading?: boolean; context: "driver" | "vehicle" }) {
 const [query,setQuery]=useState(""); const [page,setPage]=useState(1);
 const filtered=[...rows].filter(r => [r.kode_ritase,r.nama_driver,r.plat_nomor,r.tanggal].join(" ").toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.tanggal.localeCompare(a.tanggal)||b.id_ritase-a.id_ritase);
 const pages=Math.max(1,Math.ceil(filtered.length/5)); const current=Math.min(page,pages);
 return <div className="space-y-2">
 <input aria-label="Cari riwayat jadwal" placeholder="Cari jadwal, driver, atau plat..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs" />
 {loading ? <p className="py-5 text-center text-xs text-slate-400">Memuat jadwal...</p> : !filtered.length ? <p className="py-5 text-center text-xs text-slate-400">Tidak ada jadwal yang sesuai.</p> : <div className="overflow-x-auto rounded-md border border-slate-200"><table className="w-full min-w-[460px] table-fixed text-left text-xs"><caption className="sr-only">Riwayat jadwal ritase</caption><thead className="bg-slate-50 text-slate-500"><tr><th scope="col" className="w-[45%] px-3 py-2 font-medium">Tanggal / Ritase</th><th scope="col" className="px-3 py-2 font-medium">{context === "vehicle" ? "Driver" : "Kendaraan"}</th><th scope="col" className="w-[110px] px-3 py-2 font-medium">Status</th></tr></thead><tbody>{filtered.slice((current-1)*5,current*5).map(r=><tr key={r.id_ritase} className="border-t border-slate-100 align-top hover:bg-slate-50"><td className="px-3 py-3"><Link href={"/armada/trips/"+r.id_ritase} className="block font-semibold text-[#0c1e3a] hover:underline">{formatDateDMY(r.tanggal)} · Rit {r.ritase_ke ?? "—"}<span className="mt-1 block truncate font-mono text-[10px] font-normal text-slate-400" title={r.kode_ritase}>{r.kode_ritase}</span></Link></td><td className="break-words px-3 py-3 text-slate-600">{context === "vehicle" ? r.nama_driver || "—" : r.plat_nomor || "—"}</td><td className="px-3 py-3 [&>span]:whitespace-normal"><StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai,r.tanggal,r.jam_mulai) ? "tidak terlaksana" : r.status} /></td></tr>)}</tbody></table></div>}
 <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-slate-500"><span>{filtered.length} jadwal · {current}/{pages}</span><div className="flex gap-1"><button type="button" disabled={current===1} onClick={()=>setPage(current-1)} className="min-h-11 rounded border px-3 py-2 disabled:opacity-40 sm:min-h-0 sm:px-2 sm:py-1">Sebelumnya</button><button type="button" disabled={current===pages} onClick={()=>setPage(current+1)} className="rounded border px-2 py-1 disabled:opacity-40">Berikutnya</button></div></div>
 </div>;
}
