"use client";

import {
  Camera,
  Clock,
  Edit2,
  RefreshCw,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import { formatAuditTime, formatDateDMY } from "@/lib/utils";
import { isRitaseExpired } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { JenisBadge } from "@/components/ui/jenis-badge";
import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { MiniMapWrapper } from "@/components/jadwal/mini-map-wrapper";
import type { AdminRitaseItem, DriverArmada } from "@/types/armada";

interface JadwalListProps {
  isLoading: boolean;
  isError: boolean;
  ritases: AdminRitaseItem[];
  selectedDate: string;
  todayStr: string;
  isWhisnu: boolean;
  contactDrivers?: DriverArmada[];
  locationLookup: Map<string, [number, number]>;
  onOpenGenerateModal: () => void;
  onEditRitase: (r: AdminRitaseItem) => void;
  onDeleteRitase: (id: number, kode: string) => void;
  onSelectFoto: (foto: { url: string; title: string }) => void;
}

function formatJam(value?: string | null) {
  if (!value) return "-";
  return value.substring(0, 5);
}

export function JadwalList({
  isLoading,
  isError,
  ritases,
  selectedDate,
  todayStr,
  isWhisnu,
  contactDrivers,
  locationLookup,
  onOpenGenerateModal,
  onEditRitase,
  onDeleteRitase,
  onSelectFoto,
}: JadwalListProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-sm font-medium">Memuat jadwal ritase...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
        <p className="text-sm font-medium">
          Gagal memuat jadwal ritase. Silakan coba refresh.
        </p>
      </div>
    );
  }

  if (ritases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
          <Zap className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          Tidak Ada Jadwal Ritase Untuk Tanggal Ini ({selectedDate})
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          {selectedDate === todayStr
            ? 'Klik tombol "Generate Otomatis" di atas untuk membuatkan rute tetap untuk seluruh driver hari ini.'
            : "Pilih tanggal lain di bagian filter untuk melihat riwayat rute terdahulu."}
        </p>
        {selectedDate === todayStr && (
          <button
            type="button"
            onClick={onOpenGenerateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#FEA103] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#E09102]"
          >
            <Zap className="h-3.5 w-3.5" /> Generate Sekarang (1-Klik)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {ritases.map((r) => (
        <div
          key={r.id_ritase}
          className="group relative z-0 isolate flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 flex-1 h-full">
            {/* Kolom Kiri: Info + Stops */}
            <div className="sm:col-span-7 flex flex-col gap-3 p-4">
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Ritase ke-{r.ritase_ke}
                </span>
                <JenisBadge jenis={r.jenis_ritase} />
                <StatusBadge
                  status={
                    r.status === "direncanakan" &&
                    isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai)
                      ? "tidak terlaksana"
                      : r.status
                  }
                />
              </div>

              {/* Driver name + WA */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-[15px] font-extrabold text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                    {r.nama_driver}
                    <WhatsAppContact
                      phone={
                        contactDrivers?.find(
                          (d) => d.id_driver === r.id_driver,
                        )?.no_hp
                      }
                      name={r.nama_driver}
                      compact
                    />
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Truck className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold font-mono text-slate-700 dark:text-slate-200">
                        {r.nopol}
                      </span>
                    </span>
                    {r.jam_mulai && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>
                          {formatJam(r.jam_mulai)} – {formatJam(r.jam_selesai)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit / Delete actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {(isWhisnu ||
                    (r.status !== "selesai" &&
                      !(
                        r.status === "direncanakan" &&
                        isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai)
                      ))) && (
                    <button
                      type="button"
                      onClick={() => onEditRitase(r)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {(isWhisnu ||
                    (r.status === "direncanakan" &&
                      !isRitaseExpired(
                        r.jam_selesai,
                        r.tanggal,
                        r.jam_mulai,
                      ))) && (
                    <button
                      type="button"
                      onClick={() => onDeleteRitase(r.id_ritase, r.kode_ritase)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors dark:border-rose-700 dark:bg-slate-800 dark:text-rose-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Stops timeline */}
              <div className="relative pl-4 space-y-2 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {(r.stops ?? []).map((stop) => (
                  <div
                    key={stop.id_stop}
                    className="relative flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex flex-1 min-w-0 items-center gap-1.5">
                      <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                        {stop.urutan}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {stop.nama_lokasi}
                      </span>
                      <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-500 uppercase dark:bg-slate-800">
                        {stop.jenis_stop}
                      </span>
                      {((stop.jumlah_koli ?? 0) > 0 ||
                        (stop.jumlah_ecer ?? 0) > 0) && (
                        <span className="shrink-0 text-[9px] text-amber-600 dark:text-amber-400">
                          📦 {stop.jumlah_koli ?? 0}K
                          {(stop.jumlah_ecer ?? 0) > 0 && (
                            <span>·{stop.jumlah_ecer}E</span>
                          )}
                        </span>
                      )}
                    </div>
                    {stop.foto_manifest_url && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectFoto({
                            url: stop.foto_manifest_url!,
                            title: stop.nama_lokasi,
                          })
                        }
                        className="shrink-0 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800"
                      >
                        <Camera className="h-2.5 w-2.5" /> Foto
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer audit */}
              <div className="mt-auto border-t border-slate-100 pt-2 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    Tanggal:{" "}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {formatDateDMY(r.tanggal)}
                    </span>
                  </span>
                  {r.created_at && (
                    <span>
                      Dibuat {formatAuditTime(r.created_at)}
                      {r.created_by_name && (
                        <span className="ml-1">oleh {r.created_by_name}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Real Leaflet Map */}
            <div className="sm:col-span-5 relative z-0 isolate flex flex-col bg-slate-50 dark:bg-slate-800/50 min-h-[220px] h-full overflow-hidden">
              <div className="flex-1 w-full h-full min-h-[220px]">
                <MiniMapWrapper
                  stops={r.stops ?? []}
                  ritaseId={r.id_ritase}
                  locationLookup={locationLookup}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
