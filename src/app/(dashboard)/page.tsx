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
  const [implanTab, setImplanTab] = useState<"menunggu" | "diambil" | "all">("menunggu");
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

  // Filter peta: truk → hanya kendaraan; gudang → hanya gudang + drop point; semua → semua.
  const mapVehicles = mapFilter === "warehouse" ? [] : vehicles;
  const mapSellers = mapFilter === "trucks" ? [] : sellers;
  const mapGudang = mapFilter === "trucks" ? [] : (map.data?.gudang ?? []);
  const mapDrop = mapFilter === "trucks" ? [] : (map.data?.drop_points ?? []);

  /* ── TAMPILAN KHUSUS KOORDINATOR GUDANG (FADEL) ─────────────────
     Peta full-height dengan sidebar kanan: Implan yang Perlu Dijemput
     ───────────────────────────────────────────────────────────── */
  if (isKoorGudang) {
    const ql = implanQ.trim().toLowerCase();

    // Data implan
    const allSellers = sellers;
    const waitingSellers = allSellers.filter(
      (s) => (s.status_pickup === "menunggu" || !s.status_pickup) && (s.jumlah_barang ?? 0) > 0
    );
    const completedSellers = allSellers.filter(
      (s) => s.status_pickup === "sudah_diambil"
    );

    const totalAwbWaiting = waitingSellers.reduce((acc, s) => acc + (s.jumlah_barang ?? 0), 0);

    const targetList =
      implanTab === "menunggu"
        ? waitingSellers
        : implanTab === "diambil"
        ? completedSellers
        : allSellers;

    const displayedSellers = targetList.filter((s) => {
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
            vehicles={vehicles}
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
            <button
              type="button"
              onClick={() => setRightPanelOpen(true)}
              className="absolute top-4 right-4 z-[1000] flex items-center gap-2 rounded-xl bg-[#0c1e3a] px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl border border-white/10 hover:bg-[#0c1e3a]/90 active:scale-95 transition-all"
              title="Buka panel implan"
            >
              <Store className="h-4 w-4 text-amber-400" />
              <span>Implan Jemput</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                {waitingSellers.length} Menunggu
              </span>
              <ChevronLeft className="h-4 w-4 text-slate-300" />
            </button>
          )}
        </div>

        {/* SIDEBAR KANAN: IMPLAN YANG PERLU DIJEMPUT */}
        {rightPanelOpen && (
          <aside className="relative flex h-full w-full max-w-[390px] shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300">
            {/* Header sidebar kanan */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Implan Perlu Dijemput</h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {waitingSellers.length} Menunggu · <b className="text-amber-600">{totalAwbWaiting.toLocaleString("id-ID")} AWB</b>
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

            {/* Tab Filter & Link ke Kelola AWB */}
            <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setImplanTab("menunggu")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-bold transition-all",
                    implanTab === "menunggu"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Menunggu ({waitingSellers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setImplanTab("diambil")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-bold transition-all",
                    implanTab === "diambil"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Diambil ({completedSellers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setImplanTab("all")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-bold transition-all",
                    implanTab === "all"
                      ? "bg-[#0c1e3a] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Semua ({allSellers.length})
                </button>
              </div>

              <Link
                href="/implan"
                className="text-[10px] font-semibold text-sky-600 hover:underline flex items-center gap-0.5 shrink-0"
              >
                Kelola AWB ↗
              </Link>
            </div>

            {/* Pencarian Implan */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={implanQ}
                onChange={(e) => setImplanQ(e.target.value)}
                placeholder="Cari nama implan, kota, PIC..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:bg-white focus:ring-2 focus:ring-[#0c1e3a]/15 transition-all"
              />
            </div>

            {/* List Implan yang Perlu Dijemput (Scrollable) */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {map.isPending ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : displayedSellers.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    {ql
                      ? "Tidak ada implan yang cocok"
                      : implanTab === "menunggu"
                      ? "Tidak ada implan yang perlu dijemput saat ini"
                      : "Tidak ada data implan"}
                  </p>
                  {implanTab === "menunggu" && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Semua barang implan sudah dijemput atau belum ada muatan.
                    </p>
                  )}
                </div>
              ) : (
                displayedSellers.map((s) => {
                  const isDone = s.status_pickup === "sudah_diambil";
                  const awbCount = s.jumlah_barang ?? 0;

                  return (
                    <div
                      key={s.id_seller}
                      onClick={() => setFocusTarget({ type: "seller", id: s.id_seller })}
                      className={cn(
                        "rounded-xl border p-3 transition-all text-xs bg-white hover:border-slate-300 shadow-xs cursor-pointer hover:bg-slate-50/80",
                        isDone ? "border-emerald-200/80 bg-emerald-50/20" : "border-slate-200"
                      )}
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
                              isDone
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : awbCount > 0
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            <span className="block text-[12px] leading-tight font-extrabold">
                              {isDone ? "✓ 0" : awbCount}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-90">
                              AWB
                            </span>
                          </div>

                          {/* Kotak Koli */}
                          <div
                            className={cn(
                              "rounded-lg px-2 py-1 text-center font-extrabold text-xs shadow-2xs min-w-[38px] border",
                              isDone
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                                : "bg-slate-100 text-slate-700 border-slate-200/70"
                            )}
                          >
                            <span className="block text-[12px] leading-tight font-extrabold">
                              {isDone ? 0 : (s.koli ?? 0)}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">
                              Koli
                            </span>
                          </div>

                          {/* Kotak HV (High Value) */}
                          <div
                            className={cn(
                              "rounded-lg px-2 py-1 text-center font-extrabold text-xs shadow-2xs min-w-[38px] border",
                              isDone
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                                : "bg-slate-100 text-slate-700 border-slate-200/70"
                            )}
                          >
                            <span className="block text-[12px] leading-tight font-extrabold">
                              {isDone ? 0 : (s.high_value ?? 0)}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">
                              HV
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notifikasi jika barang sudah diambil */}
                      {isDone && (
                        <p className="mt-1.5 rounded bg-emerald-50/80 px-2 py-1 text-[10px] font-medium text-emerald-800 border border-emerald-200/50 flex items-center justify-between">
                          <span>✓ Muatan sudah diambil armada</span>
                          <span className="text-[9px] text-emerald-600 font-normal">Tadi: {awbCount} AWB · {s.koli ?? 0} Koli · {s.high_value ?? 0} HV</span>
                        </p>
                      )}

                      {/* Catatan jika ada */}
                      {s.catatan_pickup && (
                        <p className="mt-1.5 rounded bg-slate-50 p-1 text-[10px] text-slate-600 italic border border-slate-100">
                          &quot;{s.catatan_pickup}&quot;
                        </p>
                      )}

                      {/* PIC & Kontak Telepon */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">PIC: <b className="text-slate-700">{s.pic || "-"}</b></span>
                        {s.no_hp && (
                          <a
                            href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {s.no_hp}
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
