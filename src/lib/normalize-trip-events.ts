import type { TimelineItem } from "@/components/armada/status-timeline";
/** Shared chronological view. Keep stored events intact; merge consecutive updates to a cargo stage. */
export function normalizeTripEvents<T extends TimelineItem>(events: T[]): T[] {
 const groups = new Map<string,T[]>();
 const canonical=(s:string)=>s.toLowerCase()==="bongkar muat barang" ? "Muat Barang" : s;
 for(const source of events){const event={...source,status:canonical(source.status)};const key=String(event.id_ritase ?? event.kode_ritase ?? "single");groups.set(key,[...(groups.get(key)??[]),event]);}
 const output:T[]=[];
 for(const list of groups.values()){
 list.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||((a.id??0)-(b.id??0)));
 const merged:T[]=[];
 for(const event of list){const last=merged[merged.length-1];
 if(last && event.id!=null && last.id===event.id)continue;
 if(last && event.nama_lokasi && event.nama_lokasi===last.nama_lokasi && event.status===last.status && ["Muat Barang","Bongkar Barang"].includes(event.status)){
 for(const field of ["jumlah_koli","jumlah_ecer","jumlah_high_value"] as const)last[field]=Math.max(last[field]??0,event[field]??0);
 last.durasi_detik=Math.max(0,(Date.parse(event.created_at)-Date.parse(last.created_at))/1000)+(event.durasi_detik??0);
 if(event.catatan && event.catatan!==last.catatan)last.catatan=[last.catatan,event.catatan].filter(Boolean).join("\n");
 }else merged.push(event);
 }
 merged.forEach((event,i)=>{const next=merged[i+1];if(next){const seconds=(Date.parse(next.created_at)-Date.parse(event.created_at))/1000;if(Number.isFinite(seconds)&&seconds>=0)event.durasi_detik=Math.floor(seconds);}});
 output.push(...merged);
 }
 return output.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
}
