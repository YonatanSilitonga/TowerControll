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

/** Item armada klik-klik — dipakai di dashboard (panel kanan) & halaman Live Map. */
export function VehicleItem({ vehicle, selected, onSelect, durasi }: VehicleItemProps) {
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
        <span className="text-xs font-medium text-slate-700">
          {displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update)}
        </span>
        <span className="text-xs text-slate-400">{vehicle.kecepatan ?? 0} km/h</span>
      </div>
      {durasi && <p className="mt-1 text-[11px] tabular-nums text-slate-400">{durasi}</p>}
    </button>
  );
}
