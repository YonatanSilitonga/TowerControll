"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { stopTypeLabel, getFullPhotoUrl } from "@/lib/constants";
import type { RitaseStop } from "@/types/armada";

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

/** Render rute ritase sebagai urutan titik (Gudang → seller → … → GTW). */
export function RuteStepper({
  stops,
}: {
  stops: RitaseStop[];
}) {
  const [selectedFoto, setSelectedFoto] = useState<{ url: string; title: string } | null>(null);

  // Tutup lightbox via Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setSelectedFoto(null);
  }, []);

  useEffect(() => {
    if (selectedFoto) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [selectedFoto, handleKeyDown]);

  if (!stops || stops.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada rute</p>;
  }
  return (
    <>
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
              {stop.foto_manifest_url && (
                <button
                  type="button"
                  onClick={() => setSelectedFoto({ url: stop.foto_manifest_url!, title: stopTitle(stop) })}
                  title="Lihat foto bukti bongkar muat"
                  className="ml-1 inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors cursor-pointer"
                >
                  Foto
                </button>
              )}
            </div>
            {i < stops.length - 1 && (
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Lightbox Modal ── */}
      {selectedFoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedFoto(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedFoto.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Foto Manifest</p>
              </div>
              <button
                onClick={() => setSelectedFoto(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Image */}
            <div className="flex min-h-[250px] flex-1 items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-4">
              <img
                src={getFullPhotoUrl(selectedFoto.url)}
                alt="Foto Manifest"
                className="max-h-[70vh] max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
