"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, RadioTower, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTrackingHistory,
  useTrackingMap,
} from "@/hooks/use-tracking";
import { OFFLINE_MINUTES } from "@/lib/constants";
import { cn, hasActiveSession } from "@/lib/utils";
import { VehicleItem } from "@/components/armada/vehicle-item";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { DriverSummary } from "@/components/armada/driver-summary";
import { InfoTip } from "@/components/ui/info-tip";
import type { TrackingVehicle } from "@/types/armada";

const LiveMap = dynamic(
  () => import("@/components/map/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Memuat peta...
      </div>
    ),
  }
);

/** Tanggal lokal (WIB) dalam format YYYY-MM-DD. */
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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

function LiveMapBody() {
  const searchParams = useSearchParams();
  const kendaraanParam = searchParams.get("kendaraan");
  const sellerParam = searchParams.get("seller");

  const { data, isLoading } = useTrackingMap();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayLocal());
  // Mobile (< lg): switch antara tampilan Peta dan daftar Armada.
  const [mobileTab, setMobileTab] = useState<"peta" | "armada">("peta");
  const { data: history, isLoading: loadingHistory } = useTrackingHistory(selectedId, selectedDate);

  // Fokus mobil dari tabel armada (`?kendaraan=ID`)
  useEffect(() => {
    if (kendaraanParam) setSelectedId(Number(kendaraanParam));
  }, [kendaraanParam]);

  // Pilih armada (dari marker peta): set selected + di mobile pindah ke tab armada
  const handleSelectVehicle = (id: number | null) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileTab("armada");
    }
  };

  const vehicles = data?.vehicles ?? [];
  const sellers = data?.sellers ?? [];
  const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedId) ?? null;

  // Definisi LIVE: GPS masih fresh (≤ ambang offline OFFLINE_MINUTES) — app benar-benar
  // mengirim posisi. Status cuma 2: LIVE (app hidup) atau Offline. Sesi login
  // (session_online) & riwayat buka app (last_open/last_login) tampil sebagai konteks
  // di panel detail, bukan status.
  const isOnline = (v: TrackingVehicle) =>
    !(v.offline ??
      (() => {
        const t = new Date(v.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > OFFLINE_MINUTES * 60 * 1000;
      })());
  const liveVehicles = vehicles.filter(isOnline);
  const restingVehicles = vehicles.filter((v) => !isOnline(v));
  const inactiveVehicles = restingVehicles.filter((v) => hasActiveSession(v.last_login));
  const offlineVehicles = restingVehicles.filter((v) => !hasActiveSession(v.last_login));

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description="Posisi terkini armada + lokasi seller (auto-refresh tiap 10 detik)"
        crumbs={[
          { label: "Armada", href: "/armada" },
          { label: "Live Map" },
        ]}
        actions={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RadioTower className="h-4 w-4 text-emerald-600" />
            <span>{liveVehicles.length} truk aktif</span>
            <span className="text-slate-300">|</span>
            <span>{sellers.length} seller</span>
          </div>
        }
      />

      {/* Tab switch mobile (< lg): Peta atau Armada */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("peta")}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
            mobileTab === "peta"
              ? "bg-white text-[#0c1e3a] shadow-sm"
              : "text-slate-500"
          )}
        >
          Peta
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("armada")}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
            mobileTab === "armada"
              ? "bg-white text-[#0c1e3a] shadow-sm"
              : "text-slate-500"
          )}
        >
          Armada ({liveVehicles.length})
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Peta — mobile: tab "peta" full tinggi; desktop: flex-1 setara tinggi panel kanan */}
        <div className={cn("flex-1 min-w-0", mobileTab !== "peta" && "hidden lg:block")}>
          <Card className="flex h-[calc(100svh-220px)] min-h-[400px] lg:h-full flex-col overflow-hidden">
            <CardContent className="flex h-full flex-1 p-0">
              <div className="h-full w-full flex-1">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <LiveMap
                    vehicles={vehicles}
                    sellers={sellers}
                    gudang={data?.gudang ?? []}
                    dropPoints={data?.drop_points ?? []}
                    initialFocus={sellerParam ? { type: "seller", id: Number(sellerParam) } : undefined}
                    selectedVehicleId={selectedId}
                    onSelectVehicle={handleSelectVehicle}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel samping — mobile: tab "armada" */}
        <div className={cn("flex flex-col gap-4 lg:w-[340px] shrink-0", mobileTab !== "armada" && "hidden lg:block")}>
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <RadioTower className="h-4 w-4 text-[#0c1e3a]" />
                Armada Aktif <InfoTip text="Posisi realtime. LIVE = GPS masih fresh" align="right" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-2 overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : liveVehicles.length === 0 && inactiveVehicles.length === 0 && offlineVehicles.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada armada mengirim posisi
                </p>
              ) : (
                <>
                  {liveVehicles.map((v) => (
                    <VehicleItem
                      key={v.id_kendaraan}
                      vehicle={v}
                      selected={selectedId === v.id_kendaraan}
                      onSelect={() => setSelectedId(v.id_kendaraan)}
                    />
                  ))}
                  {inactiveVehicles.length > 0 && (
                    <>
                      <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        Tidak aktif ({inactiveVehicles.length})
                      </p>
                      {inactiveVehicles.map((v) => (
                        <VehicleItem
                          key={v.id_kendaraan}
                          vehicle={v}
                          selected={selectedId === v.id_kendaraan}
                          onSelect={() => setSelectedId(v.id_kendaraan)}
                        />
                      ))}
                    </>
                  )}
                  {offlineVehicles.length > 0 && (
                    <>
                      <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                        Offline ({offlineVehicles.length})
                      </p>
                      {offlineVehicles.map((v) => (
                        <VehicleItem
                          key={v.id_kendaraan}
                          vehicle={v}
                          selected={selectedId === v.id_kendaraan}
                          onSelect={() => setSelectedId(v.id_kendaraan)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {selectedVehicle && (
            <Card className="flex flex-col flex-1 min-h-0">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  Detail Armada · {selectedVehicle.plat_nomor || "-"}
                  <InfoTip text="Log status kendaraan" />
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Tutup detail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardTitle>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayLocal()}
                  onChange={(e) => setSelectedDate(e.target.value || "")}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0c1e3a] focus:outline-none focus:ring-2 focus:ring-[#0c1e3a]/20"
                />
              </CardHeader>
              <CardContent className="flex-1 min-h-0 space-y-3 overflow-y-auto">
                {(() => {
                  const selLive = isOnline(selectedVehicle);
                  const sesOnline = hasActiveSession(selectedVehicle.last_login);
                  const badgeTxt = selLive
                    ? "LIVE"
                    : sesOnline
                      ? "Tidak aktif"
                      : "Offline";
                  return (
                    <div className="space-y-1.5 border-b border-slate-100 pb-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-xs text-slate-500">Status</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold",
                            selLive
                              ? "bg-emerald-50 text-emerald-700"
                              : sesOnline
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                          )}
                        >
                          <i
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              selLive ? "bg-emerald-500" : sesOnline ? "bg-amber-500" : "bg-rose-500"
                            )}
                          />
                          {badgeTxt}
                        </span>
                      </div>
                      {selLive && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-xs text-slate-500">Kecepatan</span>
                          <span className="text-sm font-medium tabular-nums text-slate-800">{`${selectedVehicle.kecepatan ?? 0} km/h`}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-xs text-slate-500">Update</span>
                        <span className="text-sm font-medium text-slate-800">{minutesAgo(selectedVehicle.last_update)}</span>
                      </div>
                      {selectedVehicle.last_login && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-xs text-slate-500">Login</span>
                          <span className="text-sm font-medium text-slate-800">{minutesAgo(selectedVehicle.last_login)}</span>
                        </div>
                      )}
                      {selectedVehicle.last_open && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-xs text-slate-500">App dibuka</span>
                          <span className="text-sm font-medium text-slate-800">{minutesAgo(selectedVehicle.last_open)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  // Tampil kalau ada ritase aktif (kode_ritase), bukan berdasarkan angka > 0
                  if (!selectedVehicle.kode_ritase) return null;
                  const koli = selectedVehicle.total_koli ?? 0;
                  const hv = selectedVehicle.total_high_value ?? 0;
                  const ec = selectedVehicle.total_eceran ?? 0;
                  return (
                    <div className="space-y-1.5 border-b border-slate-100 pb-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-xs text-slate-500">Muatan</span>
                        <span className="text-sm font-medium text-slate-800">
                          {koli} koli{hv > 0 && <> · {hv} HV</>}{ec > 0 && <> · {ec} pcs</>}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {loadingHistory ? (
                  <Skeleton className="h-24 w-full" />
                ) : (history ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada riwayat status
                  </p>
                ) : (
                  <>
                    <DriverSummary events={history ?? []} stops={[]} title="Ringkasan Durasi" />
                    <div className="mt-3 border-t pt-3">
                      <StatusTimeline events={history ?? []} stops={[]} limit={15} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LiveMapPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Memuat peta live...</div>}>
      <LiveMapBody />
    </Suspense>
  );
}
