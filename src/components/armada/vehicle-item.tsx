"use client";

import { cn } from "@/lib/utils";
import { displayTrackingStatus } from "@/lib/constants";
import type { TrackingVehicle } from "@/types/armada";

function minutesAgo(iso?: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} m lalu`;
  return `${Math.floor(m / 60)} jam ${m % 60} m lalu`;
}

interface VehicleItemProps {
  vehicle: TrackingVehicle;
  selected?: boolean;
  onSelect?: () => void;
  /** Baris durasi ringkas (opsional), mis. "L 12m · J 1j 05m · T 45m". */
  durasi?: string;
}

/** Item armada klik-klik — dipakai di dashboard (panel kanan) & halaman Live Map.
 *  Model status: LIVE (GPS ≤ ambang) / Online (session aktif, GPS stale) / Offline. */
export function VehicleItem({ vehicle, selected, onSelect, durasi }: VehicleItemProps) {
  const live =
    !(vehicle.offline ??
      (() => {
        const t = new Date(vehicle.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > 15 * 60 * 1000;
      })());
  const session = !!vehicle.session_online;

  let statusNode: React.ReactNode;
  if (live) {
    const label = displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update);
    statusNode = (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        {label}
      </span>
    );
  } else if (session) {
    statusNode = (
      <span
        title={`Session aktif (belum logout) • posisi terakhir ${minutesAgo(vehicle.last_update)} • app terakhir dibuka ${vehicle.last_open ? minutesAgo(vehicle.last_open) : "-"}`}
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"
      >
        Online · data lama
      </span>
    );
  } else {
    // Logout / belum login → LANGSUNG Offline (gak nunggu GPS stale).
    statusNode = (
      <span
        title={`Sesi selesai (logout) atau belum login • posisi terakhir ${minutesAgo(vehicle.last_update)} • app terakhir dibuka ${vehicle.last_open ? minutesAgo(vehicle.last_open) : "-"}`}
        className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700"
      >
        Offline
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-amber-400 bg-amber-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{vehicle.plat_nomor || "-"}</p>
        <span className="text-[11px] text-slate-400">{minutesAgo(vehicle.last_update)}</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{vehicle.nama_driver || "-"}</p>
      <div className="mt-1 flex items-center justify-between">
        {statusNode}
        <span className="text-xs text-slate-400">{vehicle.kecepatan ?? 0} km/h</span>
      </div>
      {durasi && <p className="mt-1 text-[11px] tabular-nums text-slate-400">{durasi}</p>}
    </button>
  );
}
