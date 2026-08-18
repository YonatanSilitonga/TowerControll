"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  PackageOpen,
  PlayCircle,
  RadioTower,
  Route as RouteIcon,
  Search,
  Truck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalisis, useDashboardSummary } from "@/hooks/use-dashboard";
import { useTrackingHistory, useTrackingMap } from "@/hooks/use-tracking";
import { useDriver, useRitaseDetail } from "@/hooks/use-armada";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { summarizeEvents } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { VehicleItem } from "@/components/armada/vehicle-item";
import { AlertCard, BottleneckCard } from "@/components/dashboard/analisis-cards";
import { InfoTip } from "@/components/ui/info-tip";
import { cn, formatNumber } from "@/lib/utils";
import type { TrackingCheckpoint, TrackingVehicle } from "@/types/armada";

const LiveMap = dynamic(
  () => import("@/components/map/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  }
);

function fmtShort(sec: number): string {
  if (sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m}m` : `${m}m ${r}s`;
  return `${Math.floor(m / 60)}j ${m % 60}m`;
}

function fmtFull(sec: number): string {
  if (sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m}m` : `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0) return `${h}j`;
  return `${h}j ${rm}m`;
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

/** Tanggal lokal (WIB) format YYYY-MM-DD — buat batas maksimum input tanggal. */
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const MAP_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "trucks", label: "Truk" },
  { key: "warehouse", label: "Gudang" },
] as const;
type MapFilter = (typeof MAP_FILTERS)[number]["key"];

export default function DashboardPage() {
  const summary = useDashboardSummary();
  const analisis = useDashboardAnalisis();
  const map = useTrackingMap();
  const { data: drivers } = useDriver();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  // Pencarian armada di panel kanan (plat / driver).
  const [armadaQ, setArmadaQ] = useState("");
  // "" = semua tanggal; kalau diisi → filter riwayat per hari.
  const [selectedDate, setSelectedDate] = useState<string>("");
  // Jam WIB live (update tiap detik).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const token = useAuthStore((s) => s.token);

  // No HP per driver (lowercase) — buat tombol "Telpon Driver" di popup peta.
  const phones: Record<string, string> = {};
  for (const dr of drivers ?? []) {
    if (dr.nama_driver && dr.no_hp) phones[dr.nama_driver.toLowerCase()] = dr.no_hp;
  }

  const vehicles = map.data?.vehicles ?? [];
  // Kunci stabil dari set id kendaraan (bukan posisi) — biar re-render peta
  // gak nge-refetch ulang history tiap poll 10 detik.
  const idsKey = useMemo(
    () => vehicles.map((v) => v.id_kendaraan).join(","),
    [vehicles]
  );
  // Array query DI-MEMOIZE dari set id — hindari churn/refetch tiap render.
  const historyQueries = useMemo(
    () =>
      vehicles.map((v) => ({
        queryKey: ["hist", v.id_kendaraan],
        queryFn: () =>
          get<TrackingCheckpoint[]>("/armada/tracking/history", {
            token,
            query: { kendaraan_id: v.id_kendaraan },
          }),
        enabled: !!token && vehicles.length > 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, token]
  );
  const histories = useQueries({ queries: historyQueries });

  // Definisi "Aktif/LIVE": GPS masih fresh (≤ 15 menit) — app benar-benar mengirim posisi.
  // Status cuma 2: LIVE (app hidup) atau Offline. Sesi login (session_online) & riwayat
  // buka app (last_open/last_login) ditampilkan sebagai konteks di panel detail, bukan status.
  const isOnline = (v: TrackingVehicle) =>
    !(v.offline ??
      (() => {
        const t = new Date(v.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > 3 * 60 * 1000;
      })());
  const onlineVehicles = vehicles.filter(isOnline);
  const offlineVehicles = vehicles.filter((v) => !isOnline(v));
  const histById = new Map<number, TrackingCheckpoint[]>(
    vehicles.map((v, i) => [v.id_kendaraan, histories[i]?.data ?? []])
  );
  const durasiOf = (v: TrackingVehicle) => {
    const sum = summarizeEvents(histById.get(v.id_kendaraan) ?? []);
    return sum.total > 0
      ? `L ${fmtShort(sum.loading)} · J ${fmtShort(sum.perjalanan)} · T ${fmtShort(sum.total)}`
      : undefined;
  };

  const { data: history, isLoading: loadingHistory } = useTrackingHistory(
    selectedId,
    selectedDate || undefined
  );

  const selectedRitaseId =
    history && history.length > 0
      ? (history[history.length - 1]?.id_ritase ?? history[0]?.id_ritase)
      : undefined;
  const { data: ritaseDetail } = useRitaseDetail(selectedRitaseId);

  if (summary.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[50vh] w-full rounded-lg" />
      </div>
    );
  }

  const d = summary.data;
  const bottlenecks = analisis.data?.bottleneck ?? [];
  const alerts = analisis.data?.alerts ?? [];
  const sellers = map.data?.sellers ?? [];
  const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedId) ?? null;

  // Kalau ada query gagal (backend down/401 dll) → tampilkan banner, jangan senyap.
  const dashError =
    summary.error?.message ?? analisis.error?.message ?? map.error?.message ?? null;

  const allHist = histories.map((h) => h.data ?? []);
  const avgOf = (cat: "loading" | "perjalanan" | "tiba" | "selesai") => {
    const vals = allHist.map((evs) => summarizeEvents(evs)[cat]).filter((v) => v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgLoading = avgOf("loading");
  const avgPerjalanan = avgOf("perjalanan");
  const avgUnloading = avgOf("tiba");
  const totalAvg = avgLoading + avgPerjalanan + avgUnloading;
  const pct = (v: number) => (totalAvg > 0 ? Math.round((v / totalAvg) * 100) : 0);
  const lastUpdate =
    vehicles.length > 0
      ? vehicles.reduce((acc, v) => (v.last_update > acc ? v.last_update : ""), "")
      : null;

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const jamWIB = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(now);

  const summaryCards = [
    { label: "Total Armada", value: formatNumber(d?.total_kendaraan ?? 0), icon: Truck },
    { label: "Aktif Online", value: formatNumber(d?.armada_online ?? d?.armada_aktif ?? 0), icon: PlayCircle },
    { label: "Selesai", value: formatNumber(d?.armada_selesai ?? 0), icon: CheckCircle2 },
    { label: "Rata² Loading", value: fmtShort(avgLoading), icon: PackageCheck },
    { label: "Rata² Perjalanan", value: fmtShort(avgPerjalanan), icon: RouteIcon },
    { label: "Rata² Unloading", value: fmtShort(avgUnloading), icon: PackageOpen },
  ];

  // Filter peta: truk → hanya kendaraan; gudang → hanya gudang + drop point; semua → semua.
  const mapVehicles = mapFilter === "warehouse" ? [] : vehicles;
  const mapSellers = mapFilter === "trucks" ? [] : sellers;
  const mapGudang = mapFilter === "trucks" ? [] : (map.data?.gudang ?? []);
  const mapDrop = mapFilter === "trucks" ? [] : (map.data?.drop_points ?? []);

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-lg bg-[#0c1e3a] p-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-40 -bottom-14 h-36 w-36 rounded-full bg-amber-400/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Operational Dashboard</h1>
            <p className="mt-1 text-xs tabular-nums text-slate-400">
              {today} · <span className="font-semibold text-slate-200">{jamWIB} WIB</span>
            </p>
          </div>
          {lastUpdate && (
            <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium tabular-nums text-slate-300">
              Update {minutesAgo(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* ERROR BANNER */}
      {dashError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Gagal mengambil data: <b>{dashError}</b>. Coba refresh, atau cek backend / token.
          </span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {c.label}
              </p>
              <c.icon className="h-4 w-4 text-slate-300" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* PETA KIRI + ARMADA KANAN */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* KIRI: peta live — dengan filter tabs */}
        <Card className="flex flex-col overflow-hidden rounded-lg border-slate-200">
  <CardContent className="flex-1 p-0">
    <div className="h-[80vh] min-h-[700px] w-full">
      <LiveMap
        vehicles={vehicles}
        sellers={sellers}
        gudang={map.data?.gudang ?? []}
        dropPoints={map.data?.drop_points ?? []}
        phones={phones}
        selectedVehicleId={selectedId}
        onSelectVehicle={setSelectedId}
      />
    </div>
  </CardContent>
</Card>

        {/* KANAN: panel armada */}
        <div className="space-y-4">
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Armada Aktif
                <InfoTip text="Aktif = GPS terbaru ≤ 15 menit. Klik armada untuk lihat riwayat & durasi; peta zoom ke truknya." />
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {onlineVehicles.length} LIVE
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Pencarian armada (plat / driver) */}
              <div className="relative mb-2 border-b border-slate-100 pb-2">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={armadaQ}
                  onChange={(e) => setArmadaQ(e.target.value)}
                  placeholder="Cari plat / driver..."
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/20"
                />
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {map.isPending ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : (() => {
                  const ql = armadaQ.trim().toLowerCase();
                  const match = (v: TrackingVehicle) =>
                    !ql ||
                    v.plat_nomor.toLowerCase().includes(ql) ||
                    (v.nama_driver ?? "").toLowerCase().includes(ql);
                  const onlineShown = onlineVehicles.filter(match);
                  const offlineShown = offlineVehicles.filter(match);

                  if (onlineShown.length === 0 && offlineShown.length === 0) {
                    return (
                      <p className="py-6 text-center text-sm text-slate-400">
                        {ql
                          ? "Tidak ada armada yang cocok"
                          : "Belum ada armada mengirim posisi"}
                      </p>
                    );
                  }

                  return (
                    <>
                      {onlineShown.map((v) => (
                        <VehicleItem
                          key={v.id_kendaraan}
                          vehicle={v}
                          selected={selectedId === v.id_kendaraan}
                          onSelect={() =>
                            setSelectedId((cur) =>
                              cur === v.id_kendaraan ? null : v.id_kendaraan
                            )
                          }
                          durasi={durasiOf(v)}
                        />
                      ))}
                      {offlineShown.length > 0 && (
                        <>
                          <p className="pt-1 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                            Offline ({offlineShown.length})
                          </p>
                          {offlineShown.map((v) => (
                            <VehicleItem
                              key={v.id_kendaraan}
                              vehicle={v}
                              selected={selectedId === v.id_kendaraan}
                              onSelect={() =>
                                setSelectedId((cur) =>
                                  cur === v.id_kendaraan ? null : v.id_kendaraan
                                )
                              }
                              durasi={durasiOf(v)}
                            />
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          
           <Card className="rounded-lg border-slate-200">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
      <MapPin className={cn("h-4 w-4", selectedVehicle ? "text-amber-500" : "text-slate-300")} />
      {selectedVehicle ? (selectedVehicle.plat_nomor || "-") : "Detail Armada"}
      {selectedVehicle && (
        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0c1e3a]">
          Focus
        </span>
      )}
      <InfoTip text="Status terkini + riwayat log kendaraan. Isi tanggal untuk filter per hari (kosong = semua)." />
      {selectedVehicle && (
        <span className="ml-auto text-xs font-normal text-slate-400">
          {selectedVehicle.nama_driver || "-"}
        </span>
      )}
    </CardTitle>
  </CardHeader>
  <CardContent className="max-h-[500px] space-y-3 overflow-y-auto pt-0">
    {!selectedVehicle ? (
      <p className="py-10 text-center text-sm text-slate-400">
        Pilih driver untuk melihat riwayat
      </p>
    ) : (
      <>
        {/* Metric rows: status, kecepatan, update, login, app dibuka */}
        {(() => {
          const selLive = isOnline(selectedVehicle);
          return (
            <div className="space-y-1.5 border-b border-slate-100 pb-2">
              <MetricRow
                label="Status"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold",
                      selLive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    )}
                  >
                    <i
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        selLive ? "bg-emerald-500" : "bg-rose-500"
                      )}
                    />
                    {selLive ? "LIVE" : "Offline"}
                  </span>
                }
              />
              {selLive && (
                <MetricRow
                  label="Kecepatan"
                  value={
                    <span className="tabular-nums">
                      {`${selectedVehicle.kecepatan ?? 0} km/h`}
                    </span>
                  }
                />
              )}
              <MetricRow
                label="Update"
                value={minutesAgo(selectedVehicle.last_update)}
              />
              {selectedVehicle.last_login && (
                <MetricRow
                  label="Login"
                  value={minutesAgo(selectedVehicle.last_login)}
                />
              )}
              {selectedVehicle.last_open && (
                <MetricRow
                  label="App dibuka"
                  value={minutesAgo(selectedVehicle.last_open)}
                />
              )}
            </div>
          );
        })()}

        <input
          type="date"
          value={selectedDate}
          max={todayLocal()}
          onChange={(e) => setSelectedDate(e.target.value || "")}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#0c1e3a] focus:outline-none focus:ring-2 focus:ring-[#0c1e3a]/20"
        />

        {loadingHistory ? (
          <Skeleton className="h-24 w-full" />
        ) : (history ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Belum ada riwayat status
          </p>
        ) : (
          <StatusTimeline
            events={history ?? []}
            stops={ritaseDetail?.stops ?? []}
            limit={12}
          />
        )}
      </>
    )}
  </CardContent>
</Card>

        </div>
      </div>

      {/* INFO BAWAH (full-width) */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Durasi proses */}
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-slate-400" /> Durasi Proses
              <InfoTip text="Rata-rata durasi Loading, Perjalanan & Unloading dari ritase aktif — buat lihat bottleneck." />
              <span className="ml-auto text-xs font-normal text-slate-400">
                {allHist.length} ritase
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <DurasiBar label="Loading" value={avgLoading} pct={pct(avgLoading)} />
            <DurasiBar label="Perjalanan" value={avgPerjalanan} pct={pct(avgPerjalanan)} />
            <DurasiBar label="Unloading" value={avgUnloading} pct={pct(avgUnloading)} />
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
              <span className="text-slate-500">Total siklus rata-rata</span>
              <span className="font-bold tabular-nums text-slate-800">{fmtFull(totalAvg)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bottleneck & Alert — klik item untuk detail + rekomendasi */}
        <BottleneckCard bottlenecks={bottlenecks} />
        <AlertCard alerts={alerts} />
      </div>
    </div>
  );
}

function DurasiBar({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold tabular-nums text-slate-800">
          {fmtFull(value)}
          <span className="ml-1.5 text-[11px] font-semibold text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#0c1e3a]" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
