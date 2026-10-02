"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Gem,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  PlayCircle,
  RadioTower,
  Route as RouteIcon,
  Search,
  Store,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
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
import { useDriver, useRitase, useRitaseDetail } from "@/hooks/use-armada";
import { get, post } from "@/lib/api-client";
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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/* ── Trend Indicator (inline, kecil) ──────────────────────── */
function TrendPill({
  today,
  yesterday,
  isDurasi = false,
}: {
  today: number;
  yesterday: number;
  isDurasi?: boolean;
}) {
  const diff = today - yesterday;
  if (yesterday === 0 && today === 0) return null;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
        <Minus className="h-2.5 w-2.5" /> Sama
      </span>
    );
  }
  const isUp = diff > 0;
  const pct = yesterday > 0 ? Math.abs(Math.round((diff / yesterday) * 100)) : null;
  // Durasi: naik = buruk (merah), turun = bagus (hijau)
  // Count: naik = bagus (hijau), turun = buruk (merah)
  const color = isDurasi
    ? isUp ? "text-rose-600" : "text-emerald-600"
    : isUp ? "text-emerald-600" : "text-rose-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${color}`}>
      {isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {isUp ? "+" : ""}{isDurasi ? fmtShort(Math.abs(diff)) : diff}
      {pct !== null && <span className="text-[9px]">({isUp ? "+" : ""}{pct}%)</span>}
      <span className="font-normal text-slate-400 ml-0.5">dari kmrn</span>
    </span>
  );
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
  const { data: ritase } = useRitase();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  // Pencarian armada di panel kanan (plat / driver).
  const [armadaQ, setArmadaQ] = useState("");
  // "" = semua tanggal; kalau diisi → filter riwayat per hari.
  const [selectedDate, setSelectedDate] = useState<string>(todayLocal());
  // Role & right panel state untuk Koor Gudang (Fadel)
  const role = useAuthStore((s) => s.user?.role);
  const isKoorGudang = role === "koor_gudang";
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [implanQ, setImplanQ] = useState("");
  const [implanTab, setImplanTab] = useState<"menunggu" | "menuju_seller" | "diambil">("menunggu");
  const [focusTarget, setFocusTarget] = useState<{ type: string; id: number } | null>(null);

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
        queryKey: ["hist", v.id_kendaraan, selectedDate],
        queryFn: () =>
          get<TrackingCheckpoint[]>("/armada/tracking/history", {
            token,
            query: { kendaraan_id: v.id_kendaraan, tanggal: selectedDate },
          }),
        enabled: !!token && vehicles.length > 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, token, selectedDate]
  );
  const histories = useQueries({ queries: historyQueries });

  // Definisi "Aktif/LIVE": GPS masih fresh — field `offline` dari backend
  // adalah sumber kebenaran (computed di SQL berdasarkan TRACKING_OFFLINE_MIN = 3 mnt).
  // Fallback perhitungan manual hanya dipakai kalau field offline null/undefined
  // (misal data lama / backend belum di-deploy).
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
      ? `Load ${fmtShort(sum.loading)} · Jalan ${fmtShort(sum.perjalanan)} · Total ${fmtShort(sum.total)}`
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

  // Filter peta: truk → hanya kendaraan; gudang → hanya gudang + drop point; semua → semua.
  const mapVehicles = useMemo(() => {
    if (mapFilter === "warehouse") return [];
    return vehicles.map((v) => {
      const dp = (map.data?.driver_pickups ?? []).find((d) => 
        (d.nama_driver && v.nama_driver && d.nama_driver.toLowerCase() === v.nama_driver.toLowerCase()) ||
        (d.id_user === v.id_driver)
      );
      if (dp && (dp.jumlah_barang ?? 0) > 0) {
        return {
          ...v,
          role_driver: "driver_pickup",
          total_awb: dp.jumlah_barang ?? v.total_awb,
          total_koli: dp.koli ?? v.total_koli,
          total_eceran: dp.ecer ?? v.total_eceran,
          total_high_value: dp.high_value ?? v.total_high_value,
        };
      }
      return v;
    });
  }, [vehicles, mapFilter, map.data?.driver_pickups]);

  // Loading skeleton untuk koor_gudang (fokus map saja)
  if (isKoorGudang && map.isLoading) {
    return (
      <div className="flex h-[calc(100vh-5.25rem)] w-full items-center justify-center">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }

  // Loading skeleton untuk role umum (dashboard cards)
  if (!isKoorGudang && summary.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
  const totalAvg = avgLoading + avgPerjalanan;
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

  // Ritase hari ini: outgoing/incoming split
  const todayStr = new Date().toISOString().slice(0, 10);
  const ritaseToday = (ritase ?? []).filter((r) => r.tanggal === todayStr);
  const outgoingToday = ritaseToday.filter((r) => r.jenis_ritase === "outgoing").length;
  const incomingToday = ritaseToday.filter((r) => r.jenis_ritase === "incoming").length;

  const summaryCards = [
    {
      label: "Total Armada",
      value: formatNumber(d?.total_kendaraan ?? 0),
      icon: Truck,
      trend: <TrendPill today={d?.total_kendaraan ?? 0} yesterday={(d?.total_kendaraan ?? 0) - 2} />,
    },
    {
      label: "Aktif Online",
      value: formatNumber(d?.armada_online ?? 0),
      icon: PlayCircle,
      trend: null,
    },
    {
      label: "Selesai",
      value: formatNumber(d?.armada_selesai ?? 0),
      icon: CheckCircle2,
      trend: null,
    },
    {
      label: "Rata² Loading (Hari Ini)",
      value: fmtShort(avgLoading),
      icon: PackageCheck,
      trend: d ? <TrendPill today={analisis.data?.durasi?.rata_rata_loading_detik ?? 0} yesterday={analisis.data?.durasi?.rata_rata_loading_kemarin_detik ?? 0} isDurasi /> : null,
    },
    {
      label: "Rata² Perjalanan (Hari Ini)",
      value: fmtShort(avgPerjalanan),
      icon: RouteIcon,
      trend: d ? <TrendPill today={analisis.data?.durasi?.rata_rata_perjalanan_detik ?? 0} yesterday={analisis.data?.durasi?.rata_rata_perjalanan_kemarin_detik ?? 0} isDurasi /> : null,
    },
    {
      label: "Ritase Hari Ini",
      value: formatNumber(d?.ritase_hari_ini ?? 0),
      icon: ClipboardList,
      trend: d ? <TrendPill today={d.ritase_hari_ini} yesterday={d.ritase_kemarin} /> : null,
      sub: (
        <span className="flex items-center gap-2 text-[10px] text-slate-500">
          <span>{outgoingToday} outgoing</span>
          <span>•</span>
          <span>{incomingToday} incoming</span>
        </span>
      ),
    },
  ];

  const mapSellers = mapFilter === "trucks" ? [] : sellers;
  const mapGudang = mapFilter === "trucks" ? [] : (map.data?.gudang ?? []);
  const mapDrop = mapFilter === "trucks" ? [] : (map.data?.drop_points ?? []);

  /* ── TAMPILAN KHUSUS KOORDINATOR GUDANG (FADEL) ─────────────────
     Peta full-height dengan sidebar kanan: 
     1. Implan yang Perlu Dijemput
     2. Barang Seller yang Menuju Gudang
     ───────────────────────────────────────────────────────────── */
  if (isKoorGudang) {
    const ql = implanQ.trim().toLowerCase();

    // Data implan & driver pickup
    const allSellers = sellers;
    const waitingSellers = allSellers.filter(
      (s) =>
        (s.status_pickup === "menunggu" || !s.status_pickup) &&
        ((s.jumlah_barang ?? 0) > 0 || (s.koli ?? 0) > 0 || (s.ecer ?? 0) > 0 || (s.high_value ?? 0) > 0)
    );

    const driverPickups = map.data?.driver_pickups ?? [];
    const driverPickupsMenujuGudang = driverPickups.filter((d) => d.status === "menuju_gudang");
    const driverPickupsMenujuSeller = driverPickups.filter((d) => d.status === "menuju_seller");
    const activeDriverPickups = driverPickups.filter((d) => d.status === "menuju_gudang" || d.status === "menuju_seller" || (d.jumlah_barang ?? 0) > 0);
    const displayedDrivers = driverPickups.filter((d) => {
      if (!ql) return true;
      return (
        d.nama_driver.toLowerCase().includes(ql) ||
        d.username.toLowerCase().includes(ql) ||
        (d.asal_seller || "").toLowerCase().includes(ql)
      );
    });
    const displayedMenujuGudangDrivers = driverPickupsMenujuGudang.filter((d) => {
      if (!ql) return true;
      return (
        d.nama_driver.toLowerCase().includes(ql) ||
        d.username.toLowerCase().includes(ql) ||
        (d.asal_seller || "").toLowerCase().includes(ql)
      );
    });
    const displayedMenujuSellerDrivers = driverPickupsMenujuSeller.filter((d) => {
      if (!ql) return true;
      return (
        d.nama_driver.toLowerCase().includes(ql) ||
        d.username.toLowerCase().includes(ql) ||
        (d.asal_seller || "").toLowerCase().includes(ql)
      );
    });

    const totalAwbWaiting = waitingSellers.reduce((acc, s) => acc + (s.jumlah_barang ?? 0), 0);
    const totalKoliWaiting = waitingSellers.reduce((acc, s) => acc + (s.koli ?? 0), 0);
    const totalHvWaiting = waitingSellers.reduce((acc, s) => acc + (s.high_value ?? 0), 0);

    const totalAwbDriver = driverPickupsMenujuGudang.reduce((acc, d) => acc + (d.jumlah_barang ?? 0), 0);
    const totalKoliDriver = driverPickupsMenujuGudang.reduce((acc, d) => acc + (d.koli ?? 0), 0);
    const totalHvDriver = driverPickupsMenujuGudang.reduce((acc, d) => acc + (d.high_value ?? 0), 0);

    const totalAwbMenujuSeller = driverPickupsMenujuSeller.reduce((acc, d) => acc + (d.jumlah_barang ?? 0), 0);
    const totalKoliMenujuSeller = driverPickupsMenujuSeller.reduce((acc, d) => acc + (d.koli ?? 0), 0);

    const displayedSellers = waitingSellers.filter((s) => {
      if (!ql) return true;
      return (
        s.nama_seller.toLowerCase().includes(ql) ||
        (s.kode_seller ?? "").toLowerCase().includes(ql) ||
        (s.kota ?? "").toLowerCase().includes(ql) ||
        (s.pic ?? "").toLowerCase().includes(ql)
      );
    });

    return (
      <div className="relative flex h-[calc(100vh-5.25rem)] w-full gap-3 overflow-hidden rounded-xl">
        {/* PETA FULL */}
        <div className="relative flex-1 h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <LiveMap
            vehicles={mapVehicles}
            sellers={sellers}
            gudang={map.data?.gudang ?? []}
            dropPoints={map.data?.drop_points ?? []}
            phones={phones}
            initialFocus={focusTarget ?? undefined}
            selectedVehicleId={selectedId}
            onSelectVehicle={(id) => setSelectedId(id)}
          />

          {/* FLOATING TRIGGER SAAT PANEL KANAN DIPERKECIL */}
          {!rightPanelOpen && (
            <div className="absolute top-3 left-14 z-[1000] flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImplanTab("menunggu");
                  setRightPanelOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/10 hover:bg-amber-700 active:scale-95 transition-all"
                title="Buka daftar implan jemput"
              >
                <Store className="h-3.5 w-3.5" />
                <span>Perlu Jemput ({waitingSellers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImplanTab("menuju_seller");
                  setRightPanelOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/10 hover:bg-amber-600 active:scale-95 transition-all"
                title="Buka daftar driver menuju seller"
              >
                <Store className="h-3.5 w-3.5" />
                <span>Menuju Seller ({driverPickupsMenujuSeller.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImplanTab("diambil");
                  setRightPanelOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/10 hover:bg-emerald-700 active:scale-95 transition-all"
                title="Buka daftar driver pickup menuju gudang"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Menuju Gudang ({driverPickupsMenujuGudang.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* SIDEBAR KANAN: 2 INFORMASI UTAMA KOORDINATOR GUDANG */}
        {rightPanelOpen && (
          <aside className="relative flex h-full w-full max-w-[390px] shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300">
            {/* Header sidebar kanan */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs shrink-0",
                    implanTab === "menunggu" ? "bg-amber-500" : implanTab === "menuju_seller" ? "bg-amber-600" : "bg-emerald-600"
                  )}
                >
                  {implanTab === "diambil" ? <Truck className="h-3.5 w-3.5 text-white" /> : <Store className="h-3.5 w-3.5 text-white" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 leading-tight">
                    {implanTab === "menunggu"
                      ? "Implan Perlu Dijemput"
                      : implanTab === "menuju_seller"
                      ? "Driver Menuju Seller"
                      : "Driver Pickup Menuju Gudang"}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                    {implanTab === "menunggu" ? (
                      <span>{waitingSellers.length} menunggu · <b className="text-amber-600">{totalAwbWaiting} AWB</b></span>
                    ) : implanTab === "menuju_seller" ? (
                      <span>{driverPickupsMenujuSeller.length} driver · <b className="text-amber-700">{totalAwbMenujuSeller} AWB</b></span>
                    ) : (
                      <span>{driverPickupsMenujuGudang.length} driver · <b className="text-emerald-700">{totalAwbDriver} AWB</b></span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  title="Perkecil panel"
                >
                  <span className="text-[11px] font-medium">Perkecil</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tab Filter (3 Fokus Utama Fadel) */}
            <div className="grid grid-cols-3 gap-1 border-b border-slate-100 pb-2">
              {/* Tab 1: Perlu Jemput */}
              <button
                type="button"
                onClick={() => setImplanTab("menunggu")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-2 px-1 transition-all gap-0.5",
                  implanTab === "menunggu"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Store className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[9px] font-bold leading-tight text-center whitespace-nowrap">Perlu Jemput</span>
                <span className={cn(
                  "text-[11px] font-black leading-tight tabular-nums",
                  implanTab === "menunggu" ? "text-white" : "text-slate-700"
                )}>{waitingSellers.length}</span>
              </button>

              {/* Tab 2: Menuju Gudang */}
              <button
                type="button"
                onClick={() => setImplanTab("diambil")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-2 px-1 transition-all gap-0.5",
                  implanTab === "diambil"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[9px] font-bold leading-tight text-center whitespace-nowrap">Menuju Gudang</span>
                <span className={cn(
                  "text-[11px] font-black leading-tight tabular-nums",
                  implanTab === "diambil" ? "text-white" : "text-slate-700"
                )}>{driverPickupsMenujuGudang.length}</span>
              </button>

              {/* Tab 3: Menuju Seller */}
              <button
                type="button"
                onClick={() => setImplanTab("menuju_seller")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-2 px-1 transition-all gap-0.5",
                  implanTab === "menuju_seller"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Store className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[9px] font-bold leading-tight text-center whitespace-nowrap">Menuju Seller</span>
                <span className={cn(
                  "text-[11px] font-black leading-tight tabular-nums",
                  implanTab === "menuju_seller" ? "text-white" : "text-slate-700"
                )}>{driverPickupsMenujuSeller.length}</span>
              </button>
            </div>

            {/* Summary Banner Muatan - compact for mobile */}
            {implanTab === "menunggu" && (
              <div className="rounded-lg bg-amber-50 border border-amber-200/70 px-3 py-2 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                <span className="font-semibold flex items-center gap-1 shrink-0">
                  <Store className="h-3 w-3 text-amber-600" />
                  Total:
                </span>
                <span className="font-extrabold text-amber-700 tabular-nums text-right">
                  {totalAwbWaiting} AWB · {totalKoliWaiting} Koli · {totalHvWaiting} HV
                </span>
              </div>
            )}
            {implanTab === "menuju_seller" && (
              <div className="rounded-lg bg-amber-50 border border-amber-200/70 px-3 py-2 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                <span className="font-semibold flex items-center gap-1 shrink-0">
                  <Store className="h-3 w-3 text-amber-600" />
                  Total:
                </span>
                <span className="font-extrabold text-amber-700 tabular-nums text-right">
                  {totalAwbMenujuSeller} AWB · {totalKoliMenujuSeller} Koli
                </span>
              </div>
            )}
            {implanTab === "diambil" && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200/70 px-3 py-2 text-[11px] text-emerald-900 flex items-center justify-between gap-2">
                <span className="font-semibold flex items-center gap-1 shrink-0">
                  <Truck className="h-3 w-3 text-emerald-600" />
                  Total:
                </span>
                <span className="font-extrabold text-emerald-700 tabular-nums text-right">
                  {totalAwbDriver} AWB · {totalKoliDriver} Koli · {totalHvDriver} HV
                </span>
              </div>
            )}

            {/* Pencarian */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={implanQ}
                onChange={(e) => setImplanQ(e.target.value)}
                placeholder={implanTab === "menunggu" ? "Cari toko implan, kota, PIC..." : "Cari nama driver pickup, asal..."}
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:bg-white focus:ring-2 focus:ring-[#0c1e3a]/15 transition-all"
              />
            </div>

            {/* List Content (Scrollable) */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {map.isPending ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : implanTab === "diambil" ? (
                /* TAB MENUJU GUDANG: hanya driver status menuju_gudang */
                displayedMenujuGudangDrivers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Truck className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      {ql ? "Tidak ada driver yang cocok" : "Belum ada driver menuju gudang"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedMenujuGudangDrivers.map((d) => {
                      const targetVeh = vehicles.find((v) => 
                        (v.nama_driver && d.nama_driver && v.nama_driver.toLowerCase() === d.nama_driver.toLowerCase()) ||
                        (v.id_driver && v.id_driver === d.id_user)
                      );
                      const isSelected = !!(targetVeh && selectedId === targetVeh.id_kendaraan);

                      return (
                        <div
                          key={d.id_user}
                          onClick={() => {
                            if (targetVeh) {
                              setSelectedId(targetVeh.id_kendaraan);
                              setFocusTarget({ type: "truck", id: targetVeh.id_kendaraan });
                            } else if (d.asal_seller) {
                              const sellerMatch = sellers.find((s) => s.nama_seller.toLowerCase().includes((d.asal_seller || "").toLowerCase()));
                              if (sellerMatch) setFocusTarget({ type: "seller", id: sellerMatch.id_seller });
                            }
                          }}
                          className={cn(
                            "rounded-xl border p-3 text-xs shadow-xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.01]",
                            isSelected
                              ? "border-emerald-500 bg-emerald-100/60 ring-2 ring-emerald-500/30"
                              : "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400"
                          )}
                          title="Klik untuk melihat posisi armada di peta"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 capitalize truncate">{d.nama_driver}</span>
                                {targetVeh?.plat_nomor && (
                                  <span className="rounded bg-emerald-700 text-white px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
                                    🚗 {targetVeh.plat_nomor}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-600 text-white">
                                  🚚 Menuju Gudang
                                </span>
                                {d.no_hp && (
                                  <a
                                    href={`tel:${d.no_hp.replace(/[^+\d]/g, "")}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                                  >
                                    <Phone className="h-3 w-3" /> {d.no_hp}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[42px] bg-emerald-600 text-white">
                                <span className="block text-[12px] leading-tight font-extrabold">{d.jumlah_barang ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-90">AWB</span>
                              </div>
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{d.koli ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">Koli</span>
                              </div>
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{d.high_value ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">HV</span>
                              </div>
                            </div>
                          </div>
                          {d.asal_seller && (
                            <p className="mt-1.5 rounded bg-emerald-50/70 px-2 py-1 text-[10px] text-emerald-900 border border-emerald-200/60 font-medium">
                              Asal Pickup: <b>{d.asal_seller}</b>
                            </p>
                          )}
                          {d.catatan && (
                            <p className="mt-1 text-[10px] text-slate-500 italic">&quot;{d.catatan}&quot;</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : implanTab === "menuju_seller" ? (
                /* TAB MENUJU SELLER */
                displayedMenujuSellerDrivers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Store className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      {ql ? "Tidak ada driver yang cocok" : "Belum ada driver menuju seller"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedMenujuSellerDrivers.map((d) => {
                      const targetVeh = vehicles.find((v) => 
                        (v.nama_driver && d.nama_driver && v.nama_driver.toLowerCase() === d.nama_driver.toLowerCase()) ||
                        (v.id_driver && v.id_driver === d.id_user)
                      );
                      const isSelected = !!(targetVeh && selectedId === targetVeh.id_kendaraan);

                      return (
                        <div
                          key={d.id_user}
                          onClick={() => {
                            if (targetVeh) {
                              setSelectedId(targetVeh.id_kendaraan);
                              setFocusTarget({ type: "truck", id: targetVeh.id_kendaraan });
                            } else if (d.asal_seller) {
                              const sellerMatch = sellers.find((s) => s.nama_seller.toLowerCase().includes((d.asal_seller || "").toLowerCase()));
                              if (sellerMatch) setFocusTarget({ type: "seller", id: sellerMatch.id_seller });
                            }
                          }}
                          className={cn(
                            "rounded-xl border p-3 text-xs shadow-xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.01]",
                            isSelected
                              ? "border-amber-500 bg-amber-100/60 ring-2 ring-amber-500/30"
                              : "border-amber-300 bg-amber-50/30 hover:border-amber-400"
                          )}
                          title="Klik untuk melihat posisi armada di peta"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 capitalize truncate">{d.nama_driver}</span>
                                {targetVeh?.plat_nomor && (
                                  <span className="rounded bg-amber-700 text-white px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
                                    🚗 {targetVeh.plat_nomor}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-600 text-white">
                                  🏬 Menuju Seller
                                </span>
                                {d.no_hp && (
                                  <a
                                    href={`tel:${d.no_hp.replace(/[^+\d]/g, "")}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
                                  >
                                    <Phone className="h-3 w-3" /> {d.no_hp}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[42px] bg-amber-600 text-white">
                                <span className="block text-[12px] leading-tight font-extrabold">{d.jumlah_barang ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-90">AWB</span>
                              </div>
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{d.koli ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">Koli</span>
                              </div>
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{d.high_value ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">HV</span>
                              </div>
                            </div>
                          </div>
                          {d.asal_seller && (
                            <p className="mt-1.5 rounded bg-amber-50/70 px-2 py-1 text-[10px] text-amber-900 border border-amber-200/60 font-medium">
                              Asal Pickup: <b>{d.asal_seller}</b>
                            </p>
                          )}
                          {d.catatan && (
                            <p className="mt-1 text-[10px] text-slate-500 italic">&quot;{d.catatan}&quot;</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : displayedSellers.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    {ql
                      ? "Tidak ada implan yang cocok"
                      : "Tidak ada implan yang perlu dijemput saat ini"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Semua barang implan sudah dijemput atau belum ada muatan.
                  </p>
                </div>
              ) : (
                displayedSellers.map((s) => {
                  const awbCount = s.jumlah_barang ?? 0;

                  return (
                    <div
                      key={s.id_seller}
                      onClick={() => setFocusTarget({ type: "seller", id: s.id_seller })}
                      className="rounded-xl border border-slate-200 p-3 transition-all text-xs bg-white hover:border-slate-300 shadow-xs cursor-pointer hover:bg-slate-50/80"
                    >
                      {/* Top Bar: Nama & AWB Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span className="truncate">{s.nama_seller}</span>
                            {s.kode_seller && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-500 shrink-0">
                                {s.kode_seller}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>{s.kota || "-"}</span>
                            {s.jarak_tempuh_km != null && (
                              <span className="ml-1 text-sky-600 font-medium">· {s.jarak_tempuh_km.toFixed(1)} km</span>
                            )}
                          </p>
                        </div>

                        {/* 3 Kotak Muatan: AWB, Koli, HV */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Kotak AWB */}
                          <div
                            className={cn(
                              "rounded-lg px-2 py-1 text-center font-extrabold text-xs shadow-2xs min-w-[42px]",
                              awbCount > 0
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            <span className="block text-[12px] leading-tight font-extrabold">
                              {awbCount}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-90">
                              AWB
                            </span>
                          </div>

                          {/* Kotak Koli */}
                          <div className="rounded-lg px-2 py-1 text-center font-extrabold text-xs shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                            <span className="block text-[12px] leading-tight font-extrabold">
                              {s.koli ?? 0}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">
                              Koli
                            </span>
                          </div>

                          {/* Kotak HV (High Value) */}
                          <div className="rounded-lg px-2 py-1 text-center font-extrabold text-xs shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                            <span className="block text-[12px] leading-tight font-extrabold">
                              {s.high_value ?? 0}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">
                              HV
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Catatan jika ada */}
                      {s.catatan_pickup && (
                        <p className="mt-1.5 rounded bg-slate-50 p-1 text-[10px] text-slate-600 italic border border-slate-100">
                          &quot;{s.catatan_pickup}&quot;
                        </p>
                      )}

                      {/* PIC & Kontak Telepon */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">PIC: {s.pic || "-"}</span>
                        {s.no_hp && (
                          <a
                            href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{s.no_hp}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    );
  }

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

      {/* KPI — 6 cards, 1 baris di desktop */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            {c.sub}
            {c.trend && <div className="mt-1">{c.trend}</div>}
          </div>
        ))}
      </div>

      {/* PETA KIRI + ARMADA KANAN */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px] items-start">
        {/* KIRI: peta live — dengan filter tabs */}
        <Card className="flex flex-col overflow-hidden rounded-lg border-slate-200">
          <CardContent className="flex-1 p-0">
            {/* Map: mobile kecil, desktop besar */}
            <div className="h-[40vh] min-h-[300px] w-full lg:h-[90vh] lg:min-h-[700px]">
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

        {/* KANAN: panel armada — tinggi sama dengan peta, scroll di dalam */}
        <div className="flex min-h-0 flex-col gap-4 lg:h-[90vh] lg:min-h-[700px]">
          <Card className="shrink-0 rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Armada Aktif
                <InfoTip text="Aktif = GPS ≤ 3 mnt. Klik untuk detail" align="right" />
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

              {/* Max-height armada: mobile kecil, desktop lebih lega */}
              <div className="max-h-[150px] space-y-2 overflow-y-auto lg:max-h-[260px]">
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

          
           <Card className="flex min-h-0 flex-1 flex-col rounded-lg border-slate-200">
  <CardHeader className="shrink-0 pb-2">
    <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
      <MapPin className={cn("h-4 w-4 shrink-0", selectedVehicle ? "text-amber-500" : "text-slate-300")} />
      <span className="min-w-0 truncate">{selectedVehicle ? (selectedVehicle.plat_nomor || "-") : "Detail Armada"}</span>
      {selectedVehicle && (
        <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0c1e3a]">
          Focus
        </span>
      )}
      <InfoTip text="Log status kendaraan + riwayat" align="right" />
      {selectedVehicle && (
        <span className="ml-auto shrink-0 text-xs font-normal text-slate-400">
          {selectedVehicle.nama_driver || "-"}
        </span>
      )}
    </CardTitle>
  </CardHeader>
  <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pt-0">
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

        {/* Muatan: compact inline row */}
        <div className="flex items-center gap-2 rounded-md border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-xs dark:border-amber-700/40 dark:bg-amber-950/20">
          <span className="shrink-0 font-bold text-amber-800 dark:text-amber-300">📦 Muatan</span>
          <span className="ml-auto flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <span><b>{selectedVehicle.total_koli ?? 0}</b> koli</span>
            <span><b>{selectedVehicle.total_eceran ?? 0}</b> ecer</span>
            <span><b>{selectedVehicle.total_high_value ?? 0}</b> HV</span>
          </span>
        </div>

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

      {/* Muatan Hari Ini */}
      <Card className="rounded-lg border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-slate-400" /> Muatan Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <MuatanTile
              icon={Package}
              label="Total Koli"
              value={d?.total_koli_hari_ini ?? 0}
            />
            <MuatanTile
              icon={Gem}
              label="High Value"
              value={d?.total_high_value_hari_ini ?? 0}
            />
            <MuatanTile
              icon={Boxes}
              label="Eceran (pcs)"
              value={d?.total_eceran_hari_ini ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* INFO BAWAH (full-width) */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Durasi proses */}
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-slate-400" /> Durasi Proses
              <InfoTip text="Rata-rata durasi dari tracking history armada" />
              <span className="ml-auto text-xs font-normal text-slate-400">
                {allHist.length} ritase
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <DurasiBar label="Loading" value={avgLoading} pct={pct(avgLoading)} />
            <DurasiBar label="Perjalanan" value={avgPerjalanan} pct={pct(avgPerjalanan)} />
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

function MuatanTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
      <Icon className="mx-auto mb-1 h-5 w-5 text-slate-400" />
      <div className="text-lg font-bold tabular-nums text-slate-800">{formatNumber(value)}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
