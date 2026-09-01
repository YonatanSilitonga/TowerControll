"use client";

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
}

/**
 * Item armada — gaya list flat (garis pemisah tipis), bukan kartu ber-border.
 *
 * Status logic (4 state):
 *  1. LIVE       — GPS fresh, app aktif mengirim posisi → dot hijau berkedip
 *  2. atBeranda  — driver login, GPS tidak fresh, ada ritase aktif → dot amber
 *  3. Logout     — session habis / belum pernah login → dot abu
 *  4. Tidak ada jadwal / Selesai Bertugas → dot abu tipis, label berbeda
 *
 * Bug 7: session_online dari backend dipakai sebagai primary.
 *   hasActiveSession(last_login) hanya sebagai fallback kalau backend
 *   belum kirim field session_online (null/undefined).
 */
export function VehicleItem({ vehicle, selected, onSelect, durasi }: VehicleItemProps) {
  // LIVE: pakai field `offline` dari backend (computed di query SQL).
  // Fallback ke perhitungan 3 menit hanya kalau field offline null/undefined.
  const live =
    !(vehicle.offline ??
      (() => {
        const t = new Date(vehicle.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > 3 * 60 * 1000;
      })());

  // Bug 7: pakai session_online backend sebagai primary, hasActiveSession sebagai fallback.
  const isSessionActive =
    vehicle.session_online !== undefined && vehicle.session_online !== null
      ? vehicle.session_online
      : hasActiveSession(vehicle.last_login);

  const loggedOut = !isSessionActive;

  const hasRitase = !!vehicle.id_ritase && !!vehicle.status_ritase;
  
  // Pass tanggal ke ritaseStatusLabel — kalau backend belum kirim (null), fallback cek jam saja
  const ritaseLabel = hasRitase
    ? ritaseStatusLabel(vehicle.status_ritase, vehicle.jam_selesai, vehicle.tanggal, vehicle.jam_mulai)
    : null;

  // atBeranda: driver login tapi GPS tidak fresh (layar mati, belum mulai, atau
  // sudah pulang tapi session masih aktif).
  const atBeranda = !loggedOut && !live;

  // Bug 2: tentukan label status lebih akurat saat atBeranda.
  // Logika:
  //   - Ada ritase berjalan     → label dari ritaseStatusLabel ("Sedang Berjalan", dll.)
  //   - Ritase status "selesai" → "Selesai Bertugas" (semua jadwal hari ini selesai)
  //   - Ritase ada tapi lewat jam jadwal → ritaseStatusLabel return null → "Tidak ada jadwal"
  //   - Tidak ada ritase sama sekali → tidak ada jadwal hari ini → "Tidak ada jadwal"
  //   - Ada ritase "direncanakan" & masih dalam window → "Siap Berangkat" (dari ritaseStatusLabel)
  const atBerandaStatusText = (() => {
    if (ritaseLabel) return ritaseLabel; // "Sedang Berjalan", "Siap Berangkat", dll.
    // Cek apakah ritase ada tapi sudah selesai
    if (vehicle.status_ritase === "selesai") return "Selesai Bertugas";
    // Tidak ada ritase sama sekali, atau ritase "direncanakan" tapi sudah lewat jam/tanggal
    return "Tidak ada jadwal";
  })();

  const dot = loggedOut
    ? "bg-slate-300"
    : atBeranda && ritaseLabel
    ? "bg-amber-400"
    : atBeranda && vehicle.status_ritase === "selesai"
    ? "bg-slate-300"
    : atBeranda
    ? "bg-slate-200"
    : "bg-emerald-500 animate-pulse";

  const statusText = loggedOut
    ? "Logout"
    : atBeranda
    ? atBerandaStatusText
    : displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update);

  const statusTone = loggedOut
    ? "text-slate-400"
    : atBeranda && ritaseLabel
    ? "text-amber-600"
    : atBeranda && vehicle.status_ritase === "selesai"
    ? "text-emerald-600"
    : atBeranda
    ? "text-slate-400"
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
          {/* Tampilkan "X menit lalu" hanya saat LIVE — saat atBeranda/logout tidak relevan */}
          {live ? minutesAgo(vehicle.last_update) : ""}
        </span>
      </div>
    </button>
  );
}
