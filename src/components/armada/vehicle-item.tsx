"use client";

import { cn, hasActiveSession } from "@/lib/utils";
import { displayTrackingStatus } from "@/lib/constants";
import type { TrackingVehicle } from "@/types/armada";

function minutesAgo(iso?: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 jam lalu" : `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 hari lalu" : `${d} hari lalu`;
}

interface VehicleItemProps {
  vehicle: TrackingVehicle;
  selected?: boolean;
  onSelect?: () => void;
  /** Baris durasi ringkas (opsional), mis. "L 12m · J 1j 05m · T 45m". */
  durasi?: string;
}

/**
 * Item armada — gaya list flat (garis pemisah tipis), bukan kartu ber-border.
 * Dipakai di dashboard (panel kanan) & halaman Live Map.
 * Model status 2-state: LIVE (GPS ≤ ambang, app mengirim posisi) / Offline.
 * Info sesi login & buka app (last_login/last_open) tampil di panel detail, bukan di sini.
 */
export function VehicleItem({ vehicle, selected, onSelect, durasi }: VehicleItemProps) {
  const live =
    !(vehicle.offline ??
      (() => {
        const t = new Date(vehicle.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > 3 * 60 * 1000;
      })());
  // Hitung session dari last_login langsung (backend session_online computed field unreliable)
  const loggedOut = !hasActiveSession(vehicle.last_login);
  const atBeranda = !loggedOut && !live;               

  const dot = loggedOut
    ? "bg-slate-300"
    : atBeranda
    ? "bg-amber-400"                                       
    : "bg-emerald-500 animate-pulse";
  const statusText = loggedOut
    ? "Logout"
    : atBeranda
    ? "Belum memulai"                                          
    : displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update);
  const statusTone = loggedOut
    ? "text-slate-400"
    : atBeranda
    ? "text-amber-600"                                      
    : "text-emerald-700";

 return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border-b border-slate-100 py-2.5 text-left transition-colors last:border-0",
        selected ? "bg-slate-50" : "hover:bg-slate-50"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
          <p className="truncate font-mono text-[13px] font-semibold text-slate-800">
            {vehicle.plat_nomor || "-"}
          </p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-slate-500">
          {live ? `${vehicle.kecepatan ?? 0} km/h` : "-"}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 pl-[22px] pr-3">
        <p className="min-w-0 truncate text-xs text-slate-500">
          {vehicle.nama_driver || "-"}
        </p>
        <span className={cn("shrink-0 text-[11px] font-medium", statusTone)}>
          {statusText}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 pl-[22px] pr-3">
        {durasi ? (
          <span className="text-[11px] tabular-nums text-slate-400">{durasi}</span>
        ) : (
          <span className="text-[11px] text-slate-400" />
        )}
        <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
          {loggedOut || atBeranda ? "" : minutesAgo(vehicle.last_update)}  {/* ⬅️ kosongkan untuk keduanya */}
        </span>
      </div>
    </button>
  );
}