"use client";

import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { Truck, ChevronRight } from "lucide-react";
import { cn, hasActiveSession } from "@/lib/utils";
import { displayTrackingStatus, ritaseStatusLabel } from "@/lib/constants";
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
  phone?: string | null;
  variant?: "default" | "table";
}

/**
 * Item armada — gaya list flat (garis pemisah tipis), bukan kartu ber-border.
 *
 * Status logic (4 state):
 *  1. LIVE       — GPS fresh, app aktif mengirim posisi → dot hijau berkedip
 *  2. atBeranda  — driver login, GPS tidak fresh, ada ritase aktif → dot amber
 *  3. Logout     — session habis / belum pernah login → dot abu
 *  4. Tidak ada jadwal / Selesai Bertugas → dot abu tipis, label berbeda
 */
export function VehicleItem({ vehicle, selected, onSelect, durasi, variant, phone }: VehicleItemProps) {
  const live =
    !(vehicle.offline ??
      (() => {
        const t = new Date(vehicle.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > 3 * 60 * 1000;
      })());

  const isSessionActive =
    vehicle.session_online !== undefined && vehicle.session_online !== null
      ? vehicle.session_online
      : hasActiveSession(vehicle.last_login);

  const loggedOut = !isSessionActive;
  const hasRitase = !!vehicle.id_ritase && !!vehicle.status_ritase;

  const ritaseLabel = hasRitase
    ? ritaseStatusLabel(vehicle.status_ritase, vehicle.jam_selesai, vehicle.tanggal, vehicle.jam_mulai)
    : null;

  const atBeranda = !loggedOut && !live;

  const atBerandaStatusText = (() => {
    if (ritaseLabel) return ritaseLabel;
    if (vehicle.status_ritase === "selesai") return "Selesai Bertugas";
    return "Tidak ada jadwal";
  })();

  // Dot color
  const dot = loggedOut
    ? "bg-slate-300"
    : atBeranda && ritaseLabel
    ? "bg-amber-400"
    : atBeranda && vehicle.status_ritase === "selesai"
    ? "bg-slate-300"
    : atBeranda
    ? "bg-slate-200"
    : "bg-emerald-500 animate-pulse";

  // Status text
  const statusText = loggedOut
    ? "Logout"
    : atBeranda
    ? atBerandaStatusText
    : displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update);

  // Status badge: colored pill
  const badgeStyle = (() => {
    if (loggedOut) return "bg-slate-100 text-slate-500";
    if (!live && !atBeranda) return "bg-slate-100 text-slate-500";
    if (atBeranda && ritaseLabel) {
      // Loading / berjalan
      if (ritaseLabel.toLowerCase().includes("berjalan")) return "bg-sky-100 text-sky-700";
      return "bg-amber-100 text-amber-700";
    }
    if (atBeranda) return "bg-slate-100 text-slate-500";
    // LIVE
    return "bg-emerald-100 text-emerald-700";
  })();

  const badgeDotColor = (() => {
    if (loggedOut) return "bg-slate-400";
    if (!live && !atBeranda) return "bg-slate-400";
    if (atBeranda && ritaseLabel) {
      if (ritaseLabel.toLowerCase().includes("berjalan")) return "bg-sky-500";
      return "bg-amber-500";
    }
    if (atBeranda) return "bg-slate-400";
    return "bg-emerald-500";
  })();

  const isPickup = vehicle.role_driver === "driver_pickup";

  if (variant === "table") return (
    <div className="flex min-w-0 items-center"><div className="min-w-0 flex-1"><button type="button" onClick={onSelect} aria-pressed={!!selected}
      className={cn("grid w-full grid-cols-[minmax(0,1.15fr)_64px_minmax(0,1fr)_10px] items-center gap-2 border-b border-l-2 border-b-slate-100 px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 min-[1800px]:grid-cols-[minmax(0,1.2fr)_76px_48px_minmax(0,1fr)_12px]", selected ? "border-l-blue-600 bg-blue-50" : "border-l-transparent hover:bg-slate-50")}>
      <span className="flex min-w-0 items-center gap-2">
        <Truck aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-[#0c1e3a] min-[1800px]:block" />
        <span className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="block truncate text-[11px] font-bold text-slate-900" title={vehicle.plat_nomor}>{vehicle.plat_nomor || "—"}</span>
            {isPickup && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-800">PICKUP</span>}
          </div>
          <span className="mt-1 block truncate text-[10px] text-slate-500" title={vehicle.nama_driver || ""}>{vehicle.nama_driver || "—"}</span>
        </span>
      </span>
      <span className={cn("rounded-md px-1.5 py-1.5 text-center text-[10px] font-semibold leading-tight", badgeStyle)}>{statusText}</span>
      <span className="hidden whitespace-nowrap text-[10px] tabular-nums text-slate-700 min-[1800px]:block">{live && !loggedOut && vehicle.kecepatan != null ? vehicle.kecepatan + " km/h" : "—"}</span>
      <span className="min-w-0">
        <span className="mb-1 block text-[9px] tabular-nums text-slate-600 min-[1800px]:hidden">{live && !loggedOut && vehicle.kecepatan != null ? vehicle.kecepatan + " km/h" : "—"}</span>
        <span className="block truncate text-[10px] text-slate-700" title={vehicle.nama_lokasi || "Lokasi belum tersedia"}>{vehicle.nama_lokasi || "—"}</span>
        <span className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
          <span>{minutesAgo(vehicle.last_update)}</span>
          {isPickup && vehicle.total_awb != null && <span className="font-semibold text-amber-700">{vehicle.total_awb} AWB</span>}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="h-3 w-3 text-blue-600" />
    </button></div>{phone !== undefined && <WhatsAppContact phone={phone} name={vehicle.nama_driver} compact />}</div>
  );

  return (
    <div
      className={cn(
        "group relative flex items-stretch rounded-xl border transition-all p-2.5 mb-1.5",
        selected
          ? "border-blue-500/50 bg-blue-50/70 shadow-sm ring-1 ring-blue-500/20"
          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-sm"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-none"
      >
        {/* Baris 1: Plat Nomor, Badge Pickup, Status Badge */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
            <span className="font-mono text-xs font-bold tracking-tight text-slate-800 shrink-0">
              {vehicle.plat_nomor || "Tanpa Plat"}
            </span>
            {isPickup && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 shrink-0">
                PICKUP
              </span>
            )}
          </div>
          {/* Status badge */}
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              badgeStyle
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", badgeDotColor)} />
            {statusText}
          </span>
        </div>

        {/* Baris 2: Nama Driver & Kecepatan / Lokasi */}
        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-medium text-slate-600">
            {vehicle.nama_driver || "Tanpa Driver"}
          </span>
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-slate-500">
            {vehicle.nama_lokasi && (
              <span className="max-w-[110px] truncate text-slate-400" title={vehicle.nama_lokasi}>
                {vehicle.nama_lokasi}
              </span>
            )}
            {live && (
              <span className="font-semibold text-slate-600">
                {vehicle.kecepatan ?? 0} km/h
              </span>
            )}
          </div>
        </div>

        {/* Baris 3: Muatan & Waktu Terakhir */}
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          {isPickup ? (
            <span className="font-medium text-amber-700">
              Muatan: <strong className="font-semibold">{vehicle.total_awb ?? 0} AWB</strong>
            </span>
          ) : vehicle.total_koli != null && vehicle.total_koli > 0 ? (
            <span className="font-medium text-slate-600">
              Muatan: <strong className="font-semibold text-slate-800">{vehicle.total_koli} koli</strong>
            </span>
          ) : durasi ? (
            <span className="text-slate-400 tabular-nums">{durasi}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}

          <span className="shrink-0 text-slate-400 tabular-nums">
            {live ? minutesAgo(vehicle.last_update) : ""}
          </span>
        </div>
      </button>

      {/* WhatsApp Contact Button */}
      {phone !== undefined && (
        <div className="flex shrink-0 items-center border-l border-slate-100 pl-1 ml-1.5">
          <WhatsAppContact phone={phone} name={vehicle.nama_driver} compact />
        </div>
      )}
    </div>
  );
}
