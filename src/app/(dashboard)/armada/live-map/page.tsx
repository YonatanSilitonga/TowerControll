"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, RadioTower } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTrackingHistory,
  useTrackingMap,
} from "@/hooks/use-tracking";
import { statusLabel } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import { VehicleItem } from "@/components/armada/vehicle-item";
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

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds} dtk`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 0) return `${minutes} mnt`;
  return `${minutes} mnt ${rest} dtk`;
}

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
  // biar detail langsung kebuka (popup peta di HP cuma ringkas).
  const handleSelectVehicle = (id: number | null) => {
    setSelectedId((cur) => (cur === id ? null : id));
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileTab("armada");
    }
  };

  const vehicles = data?.vehicles ?? [];
  const sellers = data?.sellers ?? [];
  const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedId) ?? null;

  // Definisi "Aktif/LIVE": GPS masih fresh (≤ 15 menit) — app benar-benar mengirim posisi.
  // Status cuma 2: LIVE (app hidup) atau Offline. Sesi login (session_online) & riwayat
  // buka app (last_open/last_login) tampil sebagai konteks di panel detail, bukan status.
  const isOnline = (v: TrackingVehicle) =>
    !(v.offline ??
      (() => {
        const t = new Date(v.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > 3 * 60 * 1000;
      })());
  const onlineVehicles = vehicles.filter(isOnline);
  const offlineVehicles = vehicles.filter((v) => !isOnline(v));

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description="Posisi terkini armada + lokasi seller (auto-refresh tiap 10 detik)"
        actions={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RadioTower className="h-4 w-4 text-emerald-600" />
            <span>{onlineVehicles.length} truk aktif</span>
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
          Armada ({onlineVehicles.length})
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Peta — mobile: tab "peta" full tinggi; desktop: flex-1 mengikuti panel kanan */}
        <div className={cn(mobileTab !== "peta" && "hidden lg:block")}>
          <Card className="flex h-[calc(100vh-230px)] min-h-[420px] flex-col overflow-hidden lg:h-auto">
            <CardContent className="flex h-full flex-1 p-0">
              <div className="h-full min-h-[420px] w-full flex-1">
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
        <div className={cn("space-y-4", mobileTab !== "armada" && "hidden lg:block")}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RadioTower className="h-4 w-4 text-[#0c1e3a]" />
                Armada Aktif <InfoTip text="Posisi realtime armada. Klik untuk parkir popup & riwayat di bawah." />
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[280px] space-y-2 overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : onlineVehicles.length === 0 && offlineVehicles.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada armada mengirim posisi
                </p>
              ) : (
                <>
                  {onlineVehicles.map((v) => (
                    <VehicleItem
                      key={v.id_kendaraan}
                      vehicle={v}
                      selected={selectedId === v.id_kendaraan}
                      onSelect={() =>
                        setSelectedId((cur) =>
                          cur === v.id_kendaraan ? null : v.id_kendaraan
                        )
                      }
                    />
                  ))}
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
                          onSelect={() =>
                            setSelectedId((cur) =>
                              cur === v.id_kendaraan ? null : v.id_kendaraan
                            )
                          }
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {selectedVehicle && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  Detail Armada · {selectedVehicle.plat_nomor || "-"}
                  <InfoTip text="Status terkini + riwayat log kendaraan. Filter tanggal untuk lihat hari tertentu." />
                </CardTitle>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayLocal()}
                  onChange={(e) =>
                    setSelectedDate(e.target.value || todayLocal())
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0c1e3a] focus:outline-none focus:ring-2 focus:ring-[#0c1e3a]/20"
                />
              </CardHeader>
              <CardContent className="max-h-[420px] space-y-3 overflow-y-auto">
                {(() => {
                  const selLive = isOnline(selectedVehicle);
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-bold",
                          selLive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        )}
                      >
                        {selLive ? "LIVE" : "Offline"}
                      </span>
                      {selLive && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {`${selectedVehicle.kecepatan ?? 0} km/h`}
                        </span>
                      )}
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Update {minutesAgo(selectedVehicle.last_update)}
                      </span>
                      {selectedVehicle.last_login && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Login {minutesAgo(selectedVehicle.last_login)}
                        </span>
                      )}
                      {selectedVehicle.last_open && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          App dibuka {minutesAgo(selectedVehicle.last_open)}
                        </span>
                      )}
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
                  (history ?? []).map((h, idx) => (
                    <div key={h.id_event} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow",
                            idx === 0 ? "bg-amber-500" : "bg-[#0c1e3a]"
                          )}
                        />
                        {idx < (history?.length ?? 0) - 1 && (
                          <div className="w-px flex-1 bg-slate-200" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">
                          {statusLabel(h.status)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(h.created_at)} · {formatDuration(h.durasi_detik)}
                        </p>
                        {h.catatan && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {h.catatan}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
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
