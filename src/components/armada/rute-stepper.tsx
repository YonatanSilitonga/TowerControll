"use client";

import { ArrowRight, Package, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { stopTypeLabel } from "@/lib/constants";
import type { RitaseEvent, RitaseStop } from "@/types/armada";

function stopTitle(stop: RitaseStop): string {
  if (stop.nama_gudang) return `${stop.nama_gudang}${stop.tipe_gudang ? ` (${stop.tipe_gudang})` : ""}`;
  if (stop.nama_seller) return stop.nama_seller;
  if (stop.nama_drop_point) return stop.nama_drop_point;
  if (stop.keterangan) return stop.keterangan;
  return stop.jenis_stop;
}

function stopTone(stop: RitaseStop): string {
  switch (stop.jenis_stop) {
    case "seller":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "drop_point":
    case "gateway":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function stopIcon(stop: RitaseStop) {
  switch (stop.jenis_stop) {
    case "seller":
      return <Package className="h-3.5 w-3.5" />;
    case "drop_point":
    case "gateway":
      return <span className="text-[9px] font-bold">GTW</span>;
    default:
      return <Warehouse className="h-3.5 w-3.5" />;
  }
}

/** Render rute ritase sebagai urutan titik (Gudang → seller → … → GTW). */
export function RuteStepper({
  stops,
  events,
}: {
  stops: RitaseStop[];
  events?: RitaseEvent[];
}) {
  if (!stops || stops.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada rute</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {stops.map((stop, i) => (
        <div key={`${stop.id_stop}-${i}`} className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-sm", stopTone(stop))}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-bold text-[10px] shadow-sm">
              {stop.urutan ?? i + 1}
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold">{stopTitle(stop)}</p>
              <p className="text-[10px] capitalize opacity-70">{stopTypeLabel(stop.jenis_stop)}</p>
            </div>
          </div>
          {i < stops.length - 1 && (
            <div className="flex items-center gap-1">
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}