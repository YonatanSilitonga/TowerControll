"use client";

import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { LIVE_MAP_RETURN_KEY, safeMapReturn } from "@/lib/live-map-navigation";
import { useSearchParams, useRouter } from "next/navigation";
import { MapPin, RadioTower, X, ArrowLeft, List, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTrackingHistory,
  useTrackingMap,
  useAllDriverPickupHistory,
} from "@/hooks/use-tracking";
import { OFFLINE_MINUTES } from "@/lib/constants";
import { cn, hasActiveSession } from "@/lib/utils";
import { useDriver } from "@/hooks/use-armada";
import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { VehicleItem } from "@/components/armada/vehicle-item";
import { DashboardLogTable } from "@/components/dashboard/dashboard-log-table";
import type { RitaseInfo } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import type { TrackingVehicle, RitaseDetail, DriverPickupLog } from "@/types/armada";

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

  const { data, isLoading, isError: mapError, refetch: reloadMap } = useTrackingMap();
  const { data: drivers } = useDriver();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayLocal());
  const router = useRouter();
  const [listOpen, setListOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [controlsContainer, setControlsContainer] = useState<HTMLDivElement | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fleetFilter, setFleetFilter] = useState<"all" | "gateway" | "pickup">("all");
  useEffect(() => {
    const screen = window.matchMedia("(min-width: 1024px)");
    setListOpen(screen.matches);
    const resize = () => { if (!screen.matches) { setListOpen(false); setDetailOpen(false); setLogOpen(false); } };
    screen.addEventListener("change", resize);
    return () => screen.removeEventListener("change", resize);
  }, []);
  const goBack = () => {
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(LIVE_MAP_RETURN_KEY); } catch {}
    router.replace(safeMapReturn(searchParams.get("from") ?? saved));
  };
  const { data: history, isLoading: loadingHistory } = useTrackingHistory(selectedId, selectedDate);
  const token = useAuthStore((state) => state.token);
  const tripIds = [...new Set((history ?? []).map((event) => event.id_ritase))];
  const tripQueries = useQueries({ queries: tripIds.map((id) => ({
    queryKey: ["armada-ritase", id],
    queryFn: () => get<RitaseDetail>(`/armada/ritase/${id}`, { token }),
    enabled: !!token,
    staleTime: 30_000,
  })) });
  const ritaseInfoMap = new Map<string, RitaseInfo>();
  tripQueries.forEach(({ data: trip }) => {
    if (trip) ritaseInfoMap.set(trip.kode_ritase, { nama_driver: trip.nama_driver, ritase_ke: trip.ritase_ke });
  });
  // Fokus mobil dari tabel armada (`?kendaraan=ID`)
  useEffect(() => {
    if (kendaraanParam) { const id = Number(kendaraanParam); if (Number.isInteger(id) && id > 0) { setSelectedId(id); setDetailOpen(true); } }
  }, [kendaraanParam]);

  // Preserve vehicle selection; open the floating detail panel.
  const handleSelectVehicle = (id: number | null) => {
    setSelectedId(id);
    setDetailOpen(id != null);
    if (window.innerWidth < 1024) { setListOpen(false); setLogOpen(false); }
  };

  const allVehicles = data?.vehicles ?? [];
  const pickupCount = allVehicles.filter((v) => v.role_driver === "driver_pickup").length;
  const gatewayCount = allVehicles.filter((v) => v.role_driver !== "driver_pickup").length;

  const vehicles = allVehicles.filter((v) => {
    if (fleetFilter === "gateway") return v.role_driver !== "driver_pickup";
    if (fleetFilter === "pickup") return v.role_driver === "driver_pickup";
    return true;
  });
  const sellers = data?.sellers ?? [];
  const implants = data?.implants ?? [];
  const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedId) ?? null;
    const isPickupDriver = selectedVehicle?.role_driver === "driver_pickup";
  const matchedPickupDriver = isPickupDriver && selectedVehicle
    ? (data?.driver_pickups ?? []).find(
        (dp) =>
          dp.nama_driver?.toLowerCase() === selectedVehicle.nama_driver?.toLowerCase() ||
          dp.username?.toLowerCase() === selectedVehicle.nama_driver?.toLowerCase() ||
          dp.id_user === selectedVehicle.id_driver
      )
    : null;
  const resolvedPickupUserId = matchedPickupDriver?.id_user ?? selectedVehicle?.id_driver;

  const { data: rawPickupHistory, isLoading: loadingPickupHistory } = useAllDriverPickupHistory(
    isPickupDriver ? { id_user: resolvedPickupUserId || undefined, tanggal: selectedDate } : undefined
  );

  const pickupHistory = useMemo(() => {
    if (!isPickupDriver || !rawPickupHistory) return [];
    const nameLower = selectedVehicle?.nama_driver?.toLowerCase();
    return rawPickupHistory.filter((l) => {
      if (!nameLower) return true;
      if (l.nama_driver?.toLowerCase() === nameLower) return true;
      if (resolvedPickupUserId && l.id_user === resolvedPickupUserId) return true;
      return false;
    });
  }, [isPickupDriver, rawPickupHistory, selectedVehicle?.nama_driver, resolvedPickupUserId]);const totalAwbHariIni = (pickupHistory ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.jumlah_barang || 0), 0);
  const totalKoliHariIni = (pickupHistory ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.koli || 0), 0);
  const totalEcerHariIni = (pickupHistory ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.ecer || 0), 0);
  const totalHvHariIni = (pickupHistory ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.high_value || 0), 0);

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
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-100">
      <div className="absolute inset-0"><LiveMap fullscreen controlsContainer={controlsContainer} onFilterOpenChange={setFilterOpen} vehicles={vehicles} sellers={sellers} implants={implants} gudang={data?.gudang ?? []} dropPoints={data?.drop_points ?? []} initialFocus={sellerParam ? { type: "seller", id: Number(sellerParam) } : undefined} selectedVehicleId={selectedId} onSelectVehicle={handleSelectVehicle} />{isLoading && <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 text-sm">Memuat peta...</div>}</div>
      <div className="pointer-events-none absolute left-14 right-44 top-3 z-30 flex flex-wrap items-center gap-2">
        <button type="button" onClick={goBack} className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"><ArrowLeft className="h-4 w-4" />Kembali</button>
        <div className="hidden rounded-lg border bg-white px-3 py-2 text-xs text-slate-600 shadow-sm lg:block"><b className="mr-2 text-[#0c1e3a]">Live Maps</b>{allVehicles.length} armada ({gatewayCount} Gateway · {pickupCount} Pickup) · {liveVehicles.length} GPS online</div>
      </div>
      {mapError && <div role="alert" className="absolute left-14 top-14 z-[70] rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700">Pembaruan peta gagal; posisi mungkin belum terkini. <button onClick={() => reloadMap()} className="underline">Coba lagi</button></div>}
      {listOpen && <aside aria-label="Daftar armada" className={cn("absolute left-3 right-3 z-30 min-h-0 lg:right-auto lg:w-[280px]", "top-20 bottom-20")}>
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <RadioTower className="h-4 w-4 text-[#0c1e3a]" />
                Daftar Armada <InfoTip text="Posisi realtime. LIVE = GPS masih fresh" align="right" />
              <button type="button" onClick={() => setListOpen(false)} aria-label="Tutup daftar armada" className="ml-auto rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button></CardTitle>
              <div className="mt-2.5 flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setFleetFilter("all")}
                  className={cn("flex-1 rounded-md py-1 text-center transition-colors", fleetFilter === "all" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                >
                  Semua ({allVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFleetFilter("gateway")}
                  className={cn("flex-1 rounded-md py-1 text-center transition-colors", fleetFilter === "gateway" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                  title="Driver yang dorong muatan ke Gateway"
                >
                  Gateway ({gatewayCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFleetFilter("pickup")}
                  className={cn("flex-1 rounded-md py-1 text-center transition-colors", fleetFilter === "pickup" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900")}
                  title="Driver pickup toko / seller"
                >
                  Pickup ({pickupCount})
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-2 overflow-y-auto overscroll-contain [scrollbar-width:thin]" tabIndex={0} aria-label="Daftar armada, gulir untuk melihat lainnya">
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
                      phone={drivers?.find((driver) => driver.id_driver === v.id_driver)?.no_hp ?? null}
                      selected={selectedId === v.id_kendaraan}
                      onSelect={() => handleSelectVehicle(v.id_kendaraan)}
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
                          phone={drivers?.find((driver) => driver.id_driver === v.id_driver)?.no_hp ?? null}
                          selected={selectedId === v.id_kendaraan}
                          onSelect={() => handleSelectVehicle(v.id_kendaraan)}
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
                          phone={drivers?.find((driver) => driver.id_driver === v.id_driver)?.no_hp ?? null}
                          selected={selectedId === v.id_kendaraan}
                          onSelect={() => handleSelectVehicle(v.id_kendaraan)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
      </aside>}
      {selectedVehicle && detailOpen && !filterOpen && <aside aria-label="Detail armada" className={cn("absolute left-3 right-3 z-30 min-h-0 lg:left-auto lg:w-[300px]", "top-20 max-h-[calc(100dvh-170px)]")}>
        <Card className="flex max-h-[inherit] min-h-0 flex-col overflow-hidden shadow-lg">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate">{selectedVehicle.plat_nomor || "-"}</span>
                  <InfoTip text="Log status kendaraan" />
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Tutup detail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardTitle>

              </CardHeader>
              <CardContent className="flex-1 min-h-0 space-y-3 overflow-y-auto">
                <p className="text-sm font-medium text-slate-600">{selectedVehicle.nama_driver || "Driver belum tersedia"}</p>
                <WhatsAppContact phone={drivers?.find((driver) => driver.id_driver === selectedVehicle.id_driver)?.no_hp} name={selectedVehicle.nama_driver} />
                {(() => {
                  const selLive = isOnline(selectedVehicle);
                  const sesOnline = hasActiveSession(selectedVehicle.last_login);
                  const badgeTxt = selLive
                    ? "LIVE"
                    : sesOnline
                      ? "Tidak aktif"
                      : "Offline";
                  return (
                    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3 [&>div]:flex-col [&>div]:items-start [&>div]:gap-1">
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
                <button type="button" className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => { setLogOpen(true); if (window.innerWidth < 1024) setDetailOpen(false); }}>Lihat log perjalanan</button>
              </CardContent>
            </Card>
      </aside>}
      <Dialog.Root open={logOpen && !!selectedVehicle} onOpenChange={setLogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex h-[75dvh] max-h-[720px] w-[calc(100%-24px)] max-w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none">
            <div className="shrink-0 border-b p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px] sm:pr-10">
                <div className="min-w-0 pr-10 sm:pr-0"><Dialog.Title className="break-words text-lg font-semibold text-slate-900">Log perjalanan · {selectedVehicle?.plat_nomor}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Driver saat ini: {selectedVehicle?.nama_driver || "—"}</Dialog.Description><p className="mt-2 text-xs text-slate-400">Riwayat kendaraan · seluruh waktu dalam WIB</p></div>
                <div className="min-w-0"><label htmlFor="live-log-date" className="mb-1.5 block text-xs font-medium text-slate-500">Tanggal aktivitas (WIB)</label><input id="live-log-date" type="date" value={selectedDate} max={todayLocal()} onChange={(e) => setSelectedDate(e.target.value || "")} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-blue-600" /></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
                <div><p className="text-slate-500">Aktivitas</p><p className="mt-1 font-semibold text-slate-800">{loadingHistory ? "…" : (history ?? []).length}</p></div>
                <div className="border-l pl-3"><p className="text-slate-500">Ritase</p><p className="mt-1 font-semibold text-slate-800">{loadingHistory ? "…" : new Set((history ?? []).filter(e => e.kode_ritase || e.id_ritase).map(e => e.kode_ritase || String(e.id_ritase))).size}</p></div>
                <div className="border-l pl-3"><p className="text-slate-500">Aktivitas terakhir</p><p className="mt-1 font-semibold text-slate-800">{(() => { const times = (history ?? []).map(e => Date.parse(e.created_at)).filter(Number.isFinite); return loadingHistory ? "…" : times.length ? new Intl.DateTimeFormat("id-ID", {hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date(Math.max(...times))) + " WIB" : "—"; })()}</p></div>
              </div>
            </div>
            <Dialog.Close aria-label="Tutup log perjalanan" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></Dialog.Close>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
              {loadingHistory ? <Skeleton className="h-40" /> : !(history ?? []).length ? <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center"><p className="font-medium text-slate-700">Belum ada aktivitas</p><p className="text-sm text-slate-500">Tidak ada log kendaraan pada tanggal ini. Pilih tanggal lain untuk melihat riwayat.</p></div> : <DashboardLogTable roomy key={String(selectedId) + selectedDate} events={history ?? []} ritaseInfoMap={ritaseInfoMap} />}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-50 flex flex-wrap justify-end gap-2 rounded-xl bg-white/95 p-2 shadow-lg lg:bottom-auto lg:right-3 lg:top-3">
        <button type="button" aria-expanded={listOpen} onClick={() => { setListOpen(!listOpen); if (window.innerWidth < 1024) { setDetailOpen(false); setLogOpen(false); } }} className="inline-flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-semibold text-[#0c1e3a]"><List className="h-4 w-4" />Armada</button>
        {selectedVehicle && <><button type="button" aria-expanded={detailOpen} onClick={() => { setDetailOpen(!detailOpen); if (window.innerWidth < 1024) { setListOpen(false); setLogOpen(false); } }} className="rounded-md border px-2 py-2 text-xs font-semibold text-[#0c1e3a]">Detail</button><button type="button" aria-expanded={logOpen} onClick={() => { setLogOpen(!logOpen); if (window.innerWidth < 1024) { setListOpen(false); setDetailOpen(false); } }} className="inline-flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-semibold text-[#0c1e3a]"><ChevronUp className="h-4 w-4" />Log</button></>}
        <div ref={setControlsContainer} />
      </div>
    </div>
  );
}
export default function LiveMapPage() { return <Suspense fallback={<div className="p-6 text-sm text-slate-400">Memuat peta live...</div>}><LiveMapBody /></Suspense>; }
