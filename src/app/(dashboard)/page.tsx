"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Package,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Gem,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  PlayCircle,
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
import { useTrackingHistory, useTrackingMap, useAllDriverPickupHistory } from "@/hooks/use-tracking";
import { useKendaraan, useDriver, useRitase, useRitaseDetail } from "@/hooks/use-armada";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { summarizeEvents } from "@/components/armada/driver-summary";
import { DashboardLogTable } from "@/components/dashboard/dashboard-log-table";
import type { RitaseInfo } from "@/components/armada/status-timeline";
import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { VehicleItem } from "@/components/armada/vehicle-item";
import { InfoTip } from "@/components/ui/info-tip";
import { cn, formatNumber, hasActiveSession } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";
import type { TrackingCheckpoint, TrackingVehicle, RitaseDetail, DriverPickupLog } from "@/types/armada";

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
  { key: "trucks", label: "Kendaraan" },
  { key: "warehouse", label: "Gudang" },
  { key: "seller", label: "Seller" },
] as const;
type MapFilter = (typeof MAP_FILTERS)[number]["key"];

export default function DashboardPage() {
  const summary = useDashboardSummary();
  const analisis = useDashboardAnalisis();
  const map = useTrackingMap();
  const { data: drivers } = useDriver();
  const { data: ritase } = useRitase();

  const ritaseInfoMap = useMemo(() => {
    const m = new Map<string, RitaseInfo>();
    for (const r of ritase ?? []) {
      if (!m.has(r.kode_ritase)) {
        m.set(r.kode_ritase, { nama_driver: r.nama_driver, ritase_ke: r.ritase_ke, tanggal: r.tanggal });
      }
    }
    return m;
  }, [ritase]);

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
  const [implanTab, setImplanTab] = useState<"menunggu" | "diambil" | "menuju_seller" | "reguler">("menunggu");
  const [focusTarget, setFocusTarget] = useState<{ type: string; id: number } | null>(null);

  // Jam WIB live (update tiap detik).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Detail armada tabs
  const [detailTab, setDetailTab] = useState<"jadwal" | "muatan" | "riwayat">("jadwal");

  const token = useAuthStore((s) => s.token);

  // Kendaraan + driver lookup maps
  const { data: kendaraanList } = useKendaraan();
  const { data: driverList } = useDriver();
  const kendaraanMap = useMemo(() => {
    const m = new Map<number, NonNullable<typeof kendaraanList>[number]>();
    for (const k of kendaraanList ?? []) m.set(k.id_kendaraan, k);
    return m;
  }, [kendaraanList]);
  const driverMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof driverList>[number]>();
    for (const d of driverList ?? []) {
      if (d.nama_driver) m.set(d.nama_driver.toLowerCase(), d);
    }
    return m;
  }, [driverList]);

  // No HP per driver (lowercase) — buat tombol "Telpon Driver" di popup peta.
  const phones: Record<string, string> = {};
  for (const dr of drivers ?? []) {
    if (dr.nama_driver && dr.no_hp) phones[dr.nama_driver.toLowerCase()] = dr.no_hp;
  }

  const rawVehicles = map.data?.vehicles ?? [];
  const vehicles = useMemo(() => {
    const seen = new Set<number>();
    return rawVehicles.filter((v) => {
      if (!v || v.id_kendaraan == null) return false;
      if (seen.has(v.id_kendaraan)) return false;
      seen.add(v.id_kendaraan);
      return true;
    });
  }, [rawVehicles]);
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

  // Query seluruh riwayat pickup hari ini untuk menghitung ritase/sesi pickup terbaru secara akurat di Web
  const pickupHistoryQuery = useQuery({
    queryKey: ["pickupHistoryToday", todayLocal()],
    queryFn: () =>
      get<DriverPickupLog[]>("/armada/pickup/history", {
        token,
        query: { tanggal: todayLocal() },
      }),
    enabled: !!token,
    refetchInterval: 10_000,
  });

  // Hitung jumlah AWB / muatan per driver pickup mulai dari sesi pickup terbaru (cutoff saat selesai / mulai pickup baru)
  const resolvedDriverPickups = useMemo(() => {
    const dps = map.data?.driver_pickups ?? [];
    if (!pickupHistoryQuery.data || pickupHistoryQuery.data.length === 0) return dps;

    // Kelompokkan log per id_user (terurut DESC dari backend)
    const logsByUser = new Map<number, DriverPickupLog[]>();
    for (const log of pickupHistoryQuery.data) {
      if (log.id_user == null) continue;
      const list = logsByUser.get(log.id_user) ?? [];
      list.push(log);
      logsByUser.set(log.id_user, list);
    }

    return dps.map((dp) => {
      const uLogs = logsByUser.get(dp.id_user);
      if (!uLogs || uLogs.length === 0) return dp;

      // Jika log terakhir berstatus 'selesai', berarti ritase selesai dan belum mulai lagi
      const latestLog = uLogs[0];
      const latestStatus = (latestLog.status || "").toLowerCase();
      if (latestStatus === "selesai") {
        return {
          ...dp,
          jumlah_barang: 0,
          koli: 0,
          ecer: 0,
          high_value: 0,
        };
      }

      let sumAwb = 0;
      let sumKoli = 0;
      let sumEcer = 0;
      let sumHv = 0;

      for (const l of uLogs) {
        const st = (l.status || "").toLowerCase();
        const cat = (l.catatan || "").toLowerCase();
        const asal = (l.asal_seller || "").toLowerCase();

        // Titik cutoff: log 'selesai' sebelumnya atau log 'mulai pickup' (berangkat dari gudang)
        if (
          st === "selesai" ||
          cat.includes("berangkat dari gudang") ||
          (st === "menuju_seller" && asal === "gudang")
        ) {
          break;
        }

        sumAwb += l.jumlah_barang || 0;
        sumKoli += l.koli || 0;
        sumEcer += l.ecer || 0;
        sumHv += l.high_value || 0;
      }

      return {
        ...dp,
        jumlah_barang: sumAwb,
        koli: sumKoli,
        ecer: sumEcer,
        high_value: sumHv,
      };
    });
  }, [map.data?.driver_pickups, pickupHistoryQuery.data]);

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

  // Kategori vehicle untuk status tabs
  const vehicleCategory = (v: TrackingVehicle): "online" | "perjalanan" | "loading" | "offline" => {
    if (!isOnline(v)) return "offline";
    const s = (v.status ?? "").toLowerCase();
    if (v.id_ritase) {
      if (s.includes("bongkar") || s.includes("muat") || s.includes("tiba")) return "loading";
      if (s.includes("menuju") || s.includes("berangkat") || v.status_ritase === "berjalan") return "perjalanan";
    }
    return "online";
  };

  // Status tabs
  const [statusTab, setStatusTab] = useState<string>("all");
  const statusTabs = [
    { key: "all", label: "Semua", count: vehicles.length },
    { key: "online", label: "Online", count: vehicles.filter((v) => vehicleCategory(v) === "online").length },
    { key: "perjalanan", label: "Perjalanan", count: vehicles.filter((v) => vehicleCategory(v) === "perjalanan").length },
    { key: "loading", label: "Loading", count: vehicles.filter((v) => vehicleCategory(v) === "loading").length },
    { key: "offline", label: "Offline", count: offlineVehicles.length },
  ];
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

  const focusedVehicle = vehicles.find((v) => v.id_kendaraan === selectedId);
  // History belongs to the vehicle; resolve each trip's actual driver before filtering.
  const historyTripIds = [...new Set((history ?? []).map((event) => event.id_ritase))];
  const historyTripQueries = useQueries({ queries: historyTripIds.map((id) => ({
    queryKey: ["armada-ritase", id],
    queryFn: () => get<RitaseDetail>(`/armada/ritase/${id}`, { token }),
    enabled: !!token && !ritase?.some((r) => r.id_ritase === id),
    staleTime: 30_000,
  })) });
  const historyTrips = new Map((ritase ?? []).map((r) => [r.id_ritase, r]));
  for (const query of historyTripQueries) {
    if (query.data) historyTrips.set(query.data.id_ritase, query.data);
  }
  const historyInfoMap = new Map(ritaseInfoMap);
  for (const trip of historyTrips.values()) {
    historyInfoMap.set(trip.kode_ritase, { nama_driver: trip.nama_driver, ritase_ke: trip.ritase_ke, tanggal: trip.tanggal });
  }
  const driverHistory = (history ?? []).filter((event) => {
    const trip = historyTrips.get(event.id_ritase);
    return !!trip && trip.id_driver === focusedVehicle?.id_driver && trip.id_kendaraan === selectedId;
  });
  const resolvingHistory = historyTripQueries.some((query) => query.isFetching);
  const historyMetadataError = historyTripQueries.some((query) => query.isError);
  const selectedRitaseId = [...driverHistory].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]?.id_ritase;
  const { data: ritaseDetail } = useRitaseDetail(selectedRitaseId);
  // ── histById + aktivitas terakhir (MUST be before early return) ──
  const histById = useMemo(
    () => new Map<number, TrackingCheckpoint[]>(
      vehicles.map((v, i) => [v.id_kendaraan, histories[i]?.data ?? []])
    ),
    [vehicles, histories]
  );
  const recentActivities = useMemo(() => {
    const evts: Array<{ plat: string; driver: string; status: string; time: string }> = [];
    for (const [id, evs] of histById) {
      if (evs.length === 0) continue;
      const last = evs[evs.length - 1];
      const v = vehicles.find((vv) => vv.id_kendaraan === id);
      if (v) {
        evts.push({
          plat: v.plat_nomor,
          driver: v.nama_driver ?? "",
          status: last.status,
          time: last.created_at,
        });
      }
    }
    return evts
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [histById, vehicles]);

  // Filter peta: truk → hanya kendaraan; gudang → hanya gudang + drop point; semua → semua.
  const mapVehicles = useMemo(() => {
    if (mapFilter === "warehouse") return [];
    return vehicles.map((v) => {
      const dp = (resolvedDriverPickups ?? []).find(
        (d) =>
          d.nama_driver &&
          v.nama_driver &&
          d.nama_driver.toLowerCase() === v.nama_driver.toLowerCase()
      );
      if (dp || v.role_driver === "driver_pickup") {
        return {
          ...v,
          role_driver: "driver_pickup",
          total_awb: dp?.jumlah_barang ?? v.total_awb,
          total_koli: dp?.koli ?? v.total_koli,
          total_eceran: dp?.ecer ?? v.total_eceran,
          total_high_value: dp?.high_value ?? v.total_high_value,
        };
      }
      return v;
    });
  }, [vehicles, mapFilter, resolvedDriverPickups]);

    const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedId) ?? null;
  const isSelectedPickup = selectedVehicle?.role_driver === "driver_pickup";
  const matchedPickupDriver = isSelectedPickup && selectedVehicle
    ? (map.data?.driver_pickups ?? []).find(
        (dp) =>
          dp.nama_driver?.toLowerCase() === selectedVehicle.nama_driver?.toLowerCase() ||
          dp.username?.toLowerCase() === selectedVehicle.nama_driver?.toLowerCase() ||
          dp.id_user === selectedVehicle.id_driver
      )
    : null;
  const resolvedPickupUserId = matchedPickupDriver?.id_user ?? selectedVehicle?.id_driver;

  const { data: rawSelectedPickupLogs, isLoading: loadingSelectedPickupLogs } = useAllDriverPickupHistory(
    isSelectedPickup ? { id_user: resolvedPickupUserId || undefined, tanggal: selectedDate } : undefined
  );

  const selectedPickupLogs = useMemo(() => {
    if (!isSelectedPickup || !rawSelectedPickupLogs) return [];
    const nameLower = selectedVehicle?.nama_driver?.toLowerCase();
    return rawSelectedPickupLogs.filter((l) => {
      if (!nameLower) return true;
      if (l.nama_driver?.toLowerCase() === nameLower) return true;
      if (resolvedPickupUserId && l.id_user === resolvedPickupUserId) return true;
      return false;
    });
  }, [isSelectedPickup, rawSelectedPickupLogs, selectedVehicle?.nama_driver, resolvedPickupUserId]);

  const pickupDayAwb = (selectedPickupLogs ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.jumlah_barang || 0), 0);
  const pickupDayKoli = (selectedPickupLogs ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.koli || 0), 0);
  const pickupDayEcer = (selectedPickupLogs ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.ecer || 0), 0);
  const pickupDayHv = (selectedPickupLogs ?? []).reduce((acc: number, curr: DriverPickupLog) => acc + (curr.high_value || 0), 0);

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
  // Jadwal ritase hari ini: outgoing/incoming split
  const todayStr = new Date().toISOString().slice(0, 10);
  const ritaseToday = (ritase ?? []).filter((r) => r.tanggal === todayStr);
  const outgoingToday = ritaseToday.filter((r) => r.jenis_ritase === "outgoing").length;
  const incomingToday = ritaseToday.filter((r) => r.jenis_ritase === "incoming").length;

  const summaryCards = [
    {
      label: "Total Armada",
      value: formatNumber(d?.total_kendaraan ?? 0),
      icon: Truck,
      color: "text-slate-500",
      trend: <TrendPill today={d?.total_kendaraan ?? 0} yesterday={(d?.total_kendaraan ?? 0) - 2} />,
    },
    {
      label: "Online",
      value: formatNumber(d?.armada_online ?? 0),
      icon: PlayCircle,
      color: "text-emerald-500",
      sub: <span className="text-[10px] text-emerald-600 font-semibold">{d?.total_kendaraan ? Math.round(((d.armada_online ?? 0) / d.total_kendaraan) * 100) : 0}%</span>,
    },
    {
      label: "Dalam Perjalanan",
      value: formatNumber(vehicles.filter((v) => vehicleCategory(v) === "perjalanan").length),
      icon: RouteIcon,
      color: "text-blue-500",
    },
    {
      label: "Loading",
      value: formatNumber(vehicles.filter((v) => vehicleCategory(v) === "loading").length),
      icon: PackageCheck,
      color: "text-amber-500",
    },
    {
      label: "Offline",
      value: formatNumber(offlineVehicles.length),
      icon: Minus,
      color: "text-slate-400",
      sub: <span className="text-[10px] text-slate-400 font-semibold">{d?.total_kendaraan ? Math.round(((offlineVehicles.length) / d.total_kendaraan) * 100) : 0}%</span>,
    },
    {
      label: "Jadwal Hari Ini",
      value: formatNumber(d?.ritase_hari_ini ?? 0),
      icon: ClipboardList,
      color: "text-[#0c1e3a]",
      trend: d ? <TrendPill today={d.ritase_hari_ini} yesterday={d.ritase_kemarin} /> : null,
    },
    {
      label: "Outgoing",
      value: formatNumber(outgoingToday),
      icon: ArrowUpRight,
      color: "text-emerald-500",
    },
    {
      label: "Incoming",
      value: formatNumber(incomingToday),
      icon: ArrowDownRight,
      color: "text-sky-500",
    },
  ];

  // Filter peta
    const mapSellers = mapFilter === "trucks" || mapFilter === "warehouse" ? [] : sellers;
  const implants = map.data?.implants ?? [];
  const mapImplants = mapFilter === "trucks" || mapFilter === "warehouse" ? [] : implants;
  const mapGudang = mapFilter === "trucks" || mapFilter === "seller" ? [] : (map.data?.gudang ?? []);
  const mapDrop = mapFilter === "trucks" || mapFilter === "seller" ? [] : (map.data?.drop_points ?? []);

  /* ── TAMPILAN KHUSUS KOORDINATOR GUDANG (FADEL) ─────────────────
     Peta full-height dengan sidebar kanan: 
     1. Implan yang Perlu Dijemput
     2. Barang Seller yang Menuju Gudang
     ───────────────────────────────────────────────────────────── */
  if (isKoorGudang) {
    const ql = implanQ.trim().toLowerCase();

    // Data implan & driver pickup (sumber: master implant)
    const allImplants = implants;
    const waitingSellers = allImplants.filter(
      (s) =>
        (s.status_pickup === "menunggu" || !s.status_pickup) &&
        ((s.jumlah_barang ?? 0) > 0 || (s.koli ?? 0) > 0 || (s.ecer ?? 0) > 0 || (s.high_value ?? 0) > 0)
    );

    const driverPickups = resolvedDriverPickups;
    const driverPickupsMenujuGudang = driverPickups.filter((d) => d.status === "menuju_gudang");
    const driverPickupsMenujuSeller = driverPickups.filter((d) => d.status === "menuju_seller");
    const regularDrivers = vehicles.filter((v) => v.role_driver !== "driver_pickup" && v.session_online === true);

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
    const displayedRegularDrivers = regularDrivers.filter((v) => {
      if (!ql) return true;
      return (
        (v.nama_driver || "").toLowerCase().includes(ql) ||
        (v.plat_nomor || "").toLowerCase().includes(ql) ||
        (v.nama_lokasi || "").toLowerCase().includes(ql) ||
        (v.kode_ritase || "").toLowerCase().includes(ql)
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

    const totalAwbReguler = regularDrivers.reduce((acc, v) => acc + (v.total_awb ?? 0), 0);
    const totalKoliReguler = regularDrivers.reduce((acc, v) => acc + (v.total_koli ?? 0), 0);
    const totalHvReguler = regularDrivers.reduce((acc, v) => acc + (v.total_high_value ?? 0), 0);

    const displayedSellers = waitingSellers.filter((s) => {
      if (!ql) return true;
      return (
        s.nama_implant.toLowerCase().includes(ql) ||
        (s.kode_implant ?? "").toLowerCase().includes(ql) ||
        (s.kota ?? "").toLowerCase().includes(ql) ||
        (s.kapten ?? "").toLowerCase().includes(ql)
      );
    });

    return (
      <div className="relative flex h-[calc(100vh-5.25rem)] w-full gap-3 overflow-hidden rounded-xl">
        {/* PETA FULL */}
        <div className="relative flex-1 h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <LiveMap
            vehicles={mapVehicles}
            sellers={sellers}
            implants={mapImplants}
            gudang={map.data?.gudang ?? []}
            dropPoints={map.data?.drop_points ?? []}
            phones={phones}
            initialFocus={focusTarget ?? undefined}
            selectedVehicleId={selectedId}
            onSelectVehicle={setSelectedId}
          />

          {/* FLOATING TRIGGER SAAT PANEL KANAN DIPERKECIL */}
          {!rightPanelOpen && (
            <div className="absolute top-3 left-14 z-20 flex flex-wrap items-center gap-2">
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

              <button
                type="button"
                onClick={() => {
                  setImplanTab("reguler");
                  setRightPanelOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg border border-white/10 hover:bg-blue-700 active:scale-95 transition-all"
                title="Buka daftar driver reguler"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Reguler ({regularDrivers.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* SIDEBAR KANAN: KOORDINATOR GUDANG */}
        {rightPanelOpen && (
          <aside className="relative flex h-full w-full max-w-[400px] shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300">
            {/* Header sidebar kanan */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs shrink-0",
                    implanTab === "menunggu"
                      ? "bg-amber-500"
                      : implanTab === "menuju_seller"
                      ? "bg-amber-600"
                      : implanTab === "diambil"
                      ? "bg-emerald-600"
                      : "bg-blue-600"
                  )}
                >
                  {implanTab === "menunggu" ? (
                    <Store className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Truck className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 leading-tight">
                    {implanTab === "menunggu"
                      ? "Implan Perlu Dijemput"
                      : implanTab === "menuju_seller"
                      ? "Driver Menuju Seller"
                      : implanTab === "diambil"
                      ? "Driver Pickup Menuju Gudang"
                      : "Driver Reguler (Antar / Ambil)"}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                    {implanTab === "menunggu" ? (
                      <span>{waitingSellers.length} menunggu · <b className="text-amber-600">{totalAwbWaiting} AWB</b></span>
                    ) : implanTab === "menuju_seller" ? (
                      <span>{driverPickupsMenujuSeller.length} driver · <b className="text-amber-700">{totalAwbMenujuSeller} AWB</b></span>
                    ) : implanTab === "diambil" ? (
                      <span>{driverPickupsMenujuGudang.length} driver · <b className="text-emerald-700">{totalAwbDriver} AWB</b></span>
                    ) : (
                      <span>{regularDrivers.length} armada · <b className="text-blue-700">{totalKoliReguler} Koli</b></span>
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

            {/* Tab Filter (4 Pilihan: Perlu Jemput, Menuju Gudang, Menuju Seller, Driver Reguler) */}
            <div className="grid grid-cols-4 gap-1 border-b border-slate-100 pb-2">
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
                <span className="text-[8.5px] font-bold leading-tight text-center whitespace-nowrap">Jemput</span>
                <span className={cn(
                  "text-[10px] font-black leading-tight tabular-nums",
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
                <span className="text-[8.5px] font-bold leading-tight text-center whitespace-nowrap">Ke Gudang</span>
                <span className={cn(
                  "text-[10px] font-black leading-tight tabular-nums",
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
                <span className="text-[8.5px] font-bold leading-tight text-center whitespace-nowrap">Ke Seller</span>
                <span className={cn(
                  "text-[10px] font-black leading-tight tabular-nums",
                  implanTab === "menuju_seller" ? "text-white" : "text-slate-700"
                )}>{driverPickupsMenujuSeller.length}</span>
              </button>

              {/* Tab 4: Driver Reguler */}
              <button
                type="button"
                onClick={() => setImplanTab("reguler")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-2 px-1 transition-all gap-0.5",
                  implanTab === "reguler"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[8.5px] font-bold leading-tight text-center whitespace-nowrap">Reguler</span>
                <span className={cn(
                  "text-[10px] font-black leading-tight tabular-nums",
                  implanTab === "reguler" ? "text-white" : "text-slate-700"
                )}>{regularDrivers.length}</span>
              </button>
            </div>

            {/* Summary Banner Muatan */}
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
            {implanTab === "reguler" && (
              <div className="rounded-lg bg-blue-50 border border-blue-200/70 px-3 py-2 text-[11px] text-blue-900 flex items-center justify-between gap-2">
                <span className="font-semibold flex items-center gap-1 shrink-0">
                  <Truck className="h-3 w-3 text-blue-600" />
                  Total:
                </span>
                <span className="font-extrabold text-blue-700 tabular-nums text-right">
                  {totalAwbReguler} AWB · {totalKoliReguler} Koli · {totalHvReguler} HV
                </span>
              </div>
            )}

            {/* Pencarian */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={implanQ}
                onChange={(e) => setImplanQ(e.target.value)}
                placeholder={
                  implanTab === "menunggu"
                    ? "Cari toko implan, kota, PIC..."
                    : implanTab === "reguler"
                    ? "Cari driver, plat nopol, lokasi..."
                    : "Cari nama driver pickup, asal..."
                }
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
                        (v.nama_driver && d.nama_driver && v.nama_driver.trim().toLowerCase() === d.nama_driver.trim().toLowerCase()) ||
                        (v.id_driver && d.id_user && v.id_driver === d.id_user)
                      );
                      const isSelected = !!(targetVeh && selectedId === targetVeh.id_kendaraan);

                      return (
                        <div
                          key={d.id_user}
                          onClick={() => {
                            if (targetVeh) {
                              setSelectedId(targetVeh.id_kendaraan);
                              setFocusTarget({ type: "truck", id: targetVeh.id_kendaraan, ts: Date.now() } as any);
                            } else if (d.asal_seller) {
                              const implantMatch = implants.find((s) => s.nama_implant.toLowerCase().includes((d.asal_seller || "").toLowerCase()));
                              if (implantMatch) setFocusTarget({ type: "implant", id: implantMatch.id_implant });
                              else {
                                const sellerMatch = sellers.find((s) => s.nama_seller.toLowerCase().includes((d.asal_seller || "").toLowerCase()));
                                if (sellerMatch) setFocusTarget({ type: "seller", id: sellerMatch.id_seller });
                              }
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
                        (v.nama_driver && d.nama_driver && v.nama_driver.trim().toLowerCase() === d.nama_driver.trim().toLowerCase()) ||
                        (v.id_driver && d.id_user && v.id_driver === d.id_user)
                      );
                      const isSelected = !!(targetVeh && selectedId === targetVeh.id_kendaraan);

                      return (
                        <div
                          key={d.id_user}
                          onClick={() => {
                            if (targetVeh) {
                              setSelectedId(targetVeh.id_kendaraan);
                              setFocusTarget({ type: "truck", id: targetVeh.id_kendaraan, ts: Date.now() } as any);
                            } else if (d.asal_seller) {
                              const implantMatch = implants.find((s) => s.nama_implant.toLowerCase().includes((d.asal_seller || "").toLowerCase()));
                              if (implantMatch) setFocusTarget({ type: "implant", id: implantMatch.id_implant });
                              else {
                                const sellerMatch = sellers.find((s) => s.nama_seller.toLowerCase().includes((d.asal_seller || "").toLowerCase()));
                                if (sellerMatch) setFocusTarget({ type: "seller", id: sellerMatch.id_seller });
                              }
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
              ) : implanTab === "reguler" ? (
                /* TAB DRIVER REGULER: armada reguler */
                displayedRegularDrivers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Truck className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      {ql ? "Tidak ada driver yang cocok" : "Belum ada armada reguler"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedRegularDrivers.map((v, idx) => {
                      const isSelected = selectedId === v.id_kendaraan;
                      const live = isOnline(v);
                      const isSessionActive =
                        v.session_online !== undefined && v.session_online !== null
                          ? v.session_online
                          : hasActiveSession(v.last_login);
                      const loggedOut = !isSessionActive;
                      const phone = v.nama_driver ? phones[v.nama_driver.toLowerCase()] : undefined;

                      return (
                        <div
                          key={`reg-${v.id_kendaraan}-${v.id_driver || idx}`}
                          onClick={() => {
                            setSelectedId(v.id_kendaraan);
                            setFocusTarget({ type: "truck", id: v.id_kendaraan });
                          }}
                          className={cn(
                            "rounded-xl border p-3 text-xs shadow-xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.01]",
                            isSelected
                              ? "border-blue-500 bg-blue-100/60 ring-2 ring-blue-500/30"
                              : "border-slate-200 bg-white hover:border-blue-300"
                          )}
                          title="Klik untuk melihat posisi armada di peta"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 capitalize truncate">{v.nama_driver || "Tanpa Driver"}</span>
                                {v.plat_nomor && (
                                  <span className="rounded bg-slate-800 text-white px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
                                    🚚 {v.plat_nomor}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={cn(
                                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                    loggedOut
                                      ? "bg-slate-200 text-slate-600"
                                      : live
                                      ? "bg-emerald-600 text-white"
                                      : "bg-amber-100 text-amber-800"
                                  )}
                                >
                                  {loggedOut ? "Logout" : live ? "LIVE" : "Standby"}
                                </span>
                                {phone && (
                                  <a
                                    href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                  >
                                    <Phone className="h-3 w-3" /> {phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{v.total_koli ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">Koli</span>
                              </div>
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{v.total_eceran ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">Ecer</span>
                              </div>
                              <div className="rounded-lg px-2 py-1 text-center shadow-2xs min-w-[38px] border bg-slate-100 text-slate-700 border-slate-200/70">
                                <span className="block text-[12px] leading-tight font-extrabold">{v.total_high_value ?? 0}</span>
                                <span className="block text-[8px] uppercase tracking-wider font-semibold opacity-75">HV</span>
                              </div>
                            </div>
                          </div>
                          {v.nama_lokasi && (
                            <p className="mt-1.5 rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-700 border border-slate-200 font-medium truncate">
                              📍 <b>{v.nama_lokasi}</b>
                            </p>
                          )}
                          {v.status_ritase && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Ritase: <span className="font-semibold text-slate-700">{v.status_ritase}</span> {v.kode_ritase ? `(${v.kode_ritase})` : ""}
                            </p>
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
                      key={s.id_implant}
                      onClick={() => setFocusTarget({ type: "implant", id: s.id_implant })}
                      className="rounded-xl border border-slate-200 p-3 transition-all text-xs bg-white hover:border-slate-300 shadow-xs cursor-pointer hover:bg-slate-50/80"
                    >
                      {/* Top Bar: Nama & AWB Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span className="truncate">{s.nama_implant}</span>
                            {s.kode_implant && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-500 shrink-0">
                                {s.kode_implant}
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
                        <span className="text-slate-600 font-medium">Kapten: {s.kapten || "-"}</span>
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
      {/* ERROR BANNER */}
      {dashError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Gagal mengambil data: <b>{dashError}</b>. Coba refresh, atau cek backend / token.
          </span>
        </div>
      )}

      {/* KPI — 8 cards, 1 baris di desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {summaryCards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {c.label}
              </p>
              <c.icon className={cn("h-4 w-4", c.color ?? "text-slate-300")} />
            </div>
            <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-900">
              {c.value}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {c.sub}
              {c.trend && <div>{c.trend}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN 3-COLUMN: Map | Daftar Armada | Detail Armada */}
      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">

        {/* ── KIRI: Live Map + filter tabs ── */}
        <Card className="flex h-[440px] min-w-0 flex-col overflow-hidden rounded-lg border-slate-200 lg:h-[640px]">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {/* Map filter tabs */}
            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 px-3 py-1.5">
              {MAP_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setMapFilter(f.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                    mapFilter === f.key
                      ? "bg-[#0c1e3a] text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 w-full flex-1">
              <LiveMap
                vehicles={mapVehicles}
                sellers={mapSellers}
                implants={mapImplants}
                gudang={mapGudang}
                dropPoints={mapDrop}
                phones={phones}
                selectedVehicleId={selectedId}
                onSelectVehicle={setSelectedId}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── TENGAH: Daftar Armada ── */}
        <Card className="flex h-[640px] min-w-0 flex-col overflow-hidden rounded-lg border-slate-200">
          <CardHeader className="px-3 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-[#0c1e3a]" /> Daftar Armada
              <InfoTip text="Klik armada untuk lihat detail di panel kanan" align="right" />
            </CardTitle>
            {/** Status filters */}
            <p className="pt-1 text-[11px] font-medium text-slate-500">Filter status</p>
            <div className="flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200 bg-slate-50 p-1 pb-2 [scrollbar-width:thin]">
              {statusTabs.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusTab(st.key)} aria-pressed={statusTab === st.key}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-[11px] font-semibold transition-all",
                    statusTab === st.key
                      ? "bg-[#FEA103] text-white"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {st.label} ({st.count})
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-0">
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={armadaQ}
                onChange={(e) => setArmadaQ(e.target.value)}
                placeholder="Cari plat / driver..."
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/20"
              />
            </div>

            {/* Vehicle list */}
            <div className="min-h-0 flex-1 space-y-0 overflow-y-auto">
              {map.isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : (() => {
                const ql = armadaQ.trim().toLowerCase();
                const match = (v: TrackingVehicle) =>
                  !ql ||
                  v.plat_nomor.toLowerCase().includes(ql) ||
                  (v.nama_driver ?? "").toLowerCase().includes(ql);
                const matchStatus = (v: TrackingVehicle) =>
                  statusTab === "all" || vehicleCategory(v) === statusTab;
                const shown = vehicles.filter(match).filter(matchStatus);

                if (shown.length === 0) {
                  return (
                    <p className="py-6 text-center text-sm text-slate-400">
                      {ql ? "Tidak ada armada yang cocok" : "Belum ada armada"}
                    </p>
                  );
                }

                return shown.map((v) => (
                  <VehicleItem
                    key={v.id_kendaraan}
                    vehicle={v} phone={drivers?.find((driver) => driver.id_driver === v.id_driver)?.no_hp ?? null}
                    selected={selectedId === v.id_kendaraan}
                    onSelect={() =>
                      setSelectedId((cur) =>
                        cur === v.id_kendaraan ? null : v.id_kendaraan
                      )
                    }
                    variant="table"
                  />
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {/* ── KANAN: Detail Armada ── */}
        <Card className="flex h-[640px] min-w-0 flex-col overflow-hidden rounded-lg border-slate-200">
          <CardHeader className="shrink-0 px-3 pb-2 pt-4">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <MapPin className={cn("h-4 w-4 shrink-0", selectedVehicle ? "text-amber-500" : "text-slate-300")} />
              <span className="min-w-0 truncate">{selectedVehicle ? (selectedVehicle.plat_nomor || "-") : "Detail Armada"}</span>

              {selectedVehicle && (() => {
                const selLive = isOnline(selectedVehicle);
                return (
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none", selLive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600")}>
                    <i className={cn("h-1.5 w-1.5 rounded-full", selLive ? "bg-emerald-500" : "bg-rose-500")} />
                    {selLive ? "LIVE" : "OFF"}
                  </span>
                );
              })()}

              <InfoTip text="Log status kendaraan + riwayat" align="right" />
              {selectedVehicle && (
                <span className="ml-auto shrink-0 text-xs font-normal text-slate-400">
                  {selectedVehicle.nama_driver || "-"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden [&>div:not(:last-child)]:shrink-0 [&>input]:shrink-0 px-3 pb-3 pt-0">
            {!selectedVehicle ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Pilih armada untuk melihat detail
              </p>
            ) : (
              <>
                {/* Metric rows */}
                {(() => {
                  const selLive = isOnline(selectedVehicle);
                  return (
                    <div className="grid shrink-0 grid-cols-4 gap-2 border-b border-slate-100 pb-2">
                      <div className="flex flex-col rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-center text-[11px]">
                        <span className="text-slate-400">App dibuka</span>
                        <span className="font-medium text-slate-700">{selectedVehicle.last_open ? minutesAgo(selectedVehicle.last_open) : "—"}</span>
                      </div>
                      <div className="flex flex-col rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-center text-[11px]">
                        <span className="text-slate-400">Update</span>
                        <span className="font-medium text-slate-700">{minutesAgo(selectedVehicle.last_update)}</span>
                      </div>
                      <div className="flex flex-col rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-center text-[11px]">
                        <span className="text-slate-400">Login</span>
                        <span className="font-medium text-slate-700">{selectedVehicle.last_login ? minutesAgo(selectedVehicle.last_login) : "—"}</span>
                      </div>
                      <div className="flex flex-col rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-center text-[11px]">
                        <span className="text-slate-400">Kecepatan</span>
                        <span className="tabular-nums font-medium text-slate-700">{selLive ? `${selectedVehicle.kecepatan ?? 0} km/h` : "—"}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Info driver + kapasitas */}
                {(() => {
                  const kd = kendaraanMap.get(selectedVehicle.id_kendaraan);
                  const dr = drivers?.find((driver) => driver.id_driver === selectedVehicle.id_driver);
                  return (
                    <div className="shrink-0 space-y-1 border-b border-slate-100 pb-2 text-xs">
                      <WhatsAppContact phone={dr?.no_hp} name={dr?.nama_driver} />
                      <MetricRow label="Kapasitas" value={
                        <span>
                          {kd?.kapasitas_koli != null ? `${kd.kapasitas_koli} koli` : "—"}
                          {kd?.kapasitas_kg != null ? ` / ${kd.kapasitas_kg} kg` : ""}
                        </span>
                      } />
                    </div>
                  );
                })()}

                {/* Tabs */}
                <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5">
                  {(["jadwal", "muatan", "riwayat"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setDetailTab(t)}
                      className={cn("flex-1 rounded px-2 py-1 text-[11px] font-bold capitalize transition-all",
                        detailTab === t ? "bg-[#FEA103] text-white" : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Tab: Jadwal */}
                {detailTab === "jadwal" && (
                  <>
                    <div className="flex items-center gap-2 rounded-md border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-xs">
                      <span className="shrink-0 font-bold text-amber-800">
                        {isSelectedPickup ? "📦 Muatan Hari Ini" : "📦 Muatan"}
                      </span>
                      <span className="ml-auto flex items-center gap-2.5 text-slate-700">
                        {isSelectedPickup ? (
                          <>
                            <span className="font-bold text-amber-900">{pickupDayAwb > 0 ? pickupDayAwb : (selectedVehicle.total_awb ?? 0)} AWB</span>
                            <span><b>{pickupDayKoli > 0 ? pickupDayKoli : (selectedVehicle.total_koli ?? 0)}</b> koli</span>
                            <span><b>{pickupDayEcer > 0 ? pickupDayEcer : (selectedVehicle.total_eceran ?? 0)}</b> ecer</span>
                          </>
                        ) : (
                          <>
                            <span><b>{selectedVehicle.total_koli ?? 0}</b> koli</span>
                            <span><b>{selectedVehicle.total_eceran ?? 0}</b> ecer</span>
                            <span><b>{selectedVehicle.total_high_value ?? 0}</b> HV</span>
                          </>
                        )}
                      </span>
                    </div>
                    <input type="date" value={selectedDate} max={todayLocal()}
                      onChange={(e) => setSelectedDate(e.target.value || "")}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#0c1e3a] focus:outline-none focus:ring-2 focus:ring-[#0c1e3a]/20"
                    />
                    {isSelectedPickup ? (
                      loadingSelectedPickupLogs ? (
                        <Skeleton className="h-24 w-full" />
                      ) : !(selectedPickupLogs ?? []).length ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          <p className="font-semibold text-slate-600">Belum ada kunjungan pickup pada {selectedDate}</p>
                          <p className="mt-1 text-[11px]">Tidak ada log penjemputan barang untuk driver ini.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 min-h-0 overflow-y-auto">
                          {(selectedPickupLogs ?? []).map((l) => (
                            <div key={l.id_log} className="p-2 rounded-lg border border-slate-100 bg-slate-50 text-xs flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{l.asal_seller || "Seller"}</p>
                                <p className="text-[10px] text-slate-500 capitalize">{l.status?.replace(/_/g, " ")} {l.catatan ? "· " + l.catatan : ""}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-amber-800">{l.jumlah_barang || 0} AWB</span>
                                <span className="text-[10px] text-slate-500 block">{l.koli || 0} koli · {l.ecer || 0} ecer</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : loadingHistory || resolvingHistory ? (
                      <Skeleton className="h-24 w-full" />
                    ) : driverHistory.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">{historyMetadataError ? "Data driver ritase gagal dimuat. Buka Riwayat untuk melihat log kendaraan." : "Tidak ada aktivitas untuk driver dan kendaraan ini pada tanggal terpilih."}</p>
                    ) : (
                      <DashboardLogTable key={`${selectedId}-${selectedDate}-${detailTab}`} events={driverHistory} activeRitaseId={selectedRitaseId ?? undefined} ritaseInfoMap={historyInfoMap} />
                    )}
                  </>
                )}

                {/* Tab: Muatan */}
                {detailTab === "muatan" && (
                  <div className="min-h-0 overflow-y-auto space-y-2">
                    {isSelectedPickup ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md border border-amber-100 bg-amber-50/70 p-2.5">
                            <p className="text-[10px] font-bold uppercase text-amber-700">Total AWB Hari Ini</p>
                            <p className="text-xl font-bold tabular-nums text-amber-950">{pickupDayAwb > 0 ? pickupDayAwb : (selectedVehicle.total_awb ?? 0)}</p>
                          </div>
                          <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Total Koli</p>
                            <p className="text-xl font-bold tabular-nums text-slate-800">{pickupDayKoli > 0 ? pickupDayKoli : (selectedVehicle.total_koli ?? 0)}</p>
                          </div>
                          <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Eceran</p>
                            <p className="text-lg font-bold tabular-nums text-slate-800">{pickupDayEcer > 0 ? pickupDayEcer : (selectedVehicle.total_eceran ?? 0)}</p>
                          </div>
                          <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
                            <p className="text-[10px] font-bold uppercase text-slate-400">High Value</p>
                            <p className="text-lg font-bold tabular-nums text-slate-800">{pickupDayHv > 0 ? pickupDayHv : (selectedVehicle.total_high_value ?? 0)}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1">
                          <p className="font-semibold text-slate-700">Status Operasional Pickup:</p>
                          <p className="text-slate-500 capitalize">Status: <b className="text-slate-800">{selectedVehicle.status || "Standby"}</b></p>
                          <p className="text-slate-500">Toko dikunjungi: <b className="text-slate-800">{(selectedPickupLogs ?? []).length} seller</b></p>
                        </div>
                        <a href={"/riwayat-pickup?driver=" + encodeURIComponent(selectedVehicle.nama_driver || "")} className="block text-center text-xs font-semibold text-blue-600 hover:underline py-1">
                          Lihat Riwayat Lengkap di Menu Pickup &rarr;
                        </a>
                      </div>
                    ) : (
                      (() => {
                        const stops = ritaseDetail?.stops ?? [];
                        const events = history ?? [];
                        const bongkarEvents = events.filter((e) => e.status === "Bongkar Muat Barang");
                        const totalKoli = bongkarEvents.reduce((sum, e) => sum + (e.jumlah_koli ?? 0), 0);
                        const totalEcer = bongkarEvents.reduce((sum, e) => sum + (e.jumlah_ecer ?? 0), 0);
                        const totalHV = bongkarEvents.reduce((sum, e) => sum + (e.jumlah_high_value ?? 0), 0);
                        const totalAWB = (ritaseDetail?.total_awb ?? 0);
                        const dropped = stops.filter((s) => s.jenis_stop === "drop_point");
                        const gws = stops.filter((s) => s.jenis_stop === "gateway");
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Total AWB</p>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{totalAWB}</p>
                              </div>
                              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Koli Terkirim</p>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{totalKoli}</p>
                              </div>
                              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Eceran</p>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{totalEcer}</p>
                              </div>
                              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">High Value</p>
                                <p className="text-lg font-bold tabular-nums text-slate-800">{totalHV}</p>
                              </div>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                              <p className="text-[11px] font-bold text-slate-500">Tujuan: {dropped.length} drop point · {gws.length} gateway</p>
                            </div>
                            {bongkarEvents.length === 0 ? (
                              <p className="py-4 text-center text-xs text-slate-400">Belum ada data muatan</p>
                            ) : (
                              <div className="space-y-1.5">
                                {bongkarEvents.map((ev, i) => (
                                  <div key={i} className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs">
                                    <span className="truncate font-semibold text-slate-700">{ev.nama_lokasi ?? "—"}</span>
                                    <span className="ml-auto shrink-0 tabular-nums text-slate-500">
                                      {ev.jumlah_koli ?? 0} koli · {ev.jumlah_ecer ?? 0} ecer · {ev.jumlah_high_value ?? 0} HV
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Tab: Riwayat */}
                {detailTab === "riwayat" && (
                  <>
                    <input type="date" value={selectedDate} max={todayLocal()}
                      onChange={(e) => setSelectedDate(e.target.value || "")}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#0c1e3a] focus:outline-none focus:ring-2 focus:ring-[#0c1e3a]/20"
                    />
                    {isSelectedPickup ? (
                      loadingSelectedPickupLogs ? (
                        <Skeleton className="h-24 w-full" />
                      ) : !(selectedPickupLogs ?? []).length ? (
                        <p className="py-6 text-center text-sm text-slate-400">Belum ada riwayat pickup pada tanggal {selectedDate}</p>
                      ) : (
                        <div className="space-y-1.5 min-h-0 overflow-y-auto max-h-[350px]">
                          {(selectedPickupLogs ?? []).map((l) => (
                            <div key={l.id_log} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{l.asal_seller || "Seller"}</span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {l.updated_at ? new Date(l.updated_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "—"}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-slate-600 text-[11px]">
                                <span className="font-semibold text-amber-800">{l.jumlah_barang || 0} AWB ({l.koli || 0} koli)</span>
                                <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-slate-200/70 text-slate-700">{l.status?.replace(/_/g, " ")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : loadingHistory ? (
                      <Skeleton className="h-24 w-full" />
                    ) : (history ?? []).length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">Belum ada riwayat status</p>
                    ) : (
                      <DashboardLogTable key={`${selectedId}-${selectedDate}-${detailTab}`} events={history ?? []} activeRitaseId={selectedRitaseId ?? undefined} ritaseInfoMap={historyInfoMap} />
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BOTTOM 4 CARDS ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* Alert & Notifikasi */}
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="px-3 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Alert & Notifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Tidak ada alert</p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 4).map((a, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md border border-rose-100 bg-rose-50/60 px-2.5 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-rose-800">{a.kategori}</p>
                      <p className="text-[11px] text-rose-600">{a.pesan}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rangkuman Hari Ini */}
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="px-3 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-[#0c1e3a]" /> Rangkuman Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Koli</p>
                <p className="text-lg font-bold tabular-nums text-slate-800">{formatNumber(d?.total_koli_hari_ini ?? 0)}</p>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">High Value</p>
                <p className="text-lg font-bold tabular-nums text-slate-800">{formatNumber(d?.total_high_value_hari_ini ?? 0)}</p>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Eceran</p>
                <p className="text-lg font-bold tabular-nums text-slate-800">{formatNumber(d?.total_eceran_hari_ini ?? 0)}</p>
              </div>
              <div className="rounded-md border border-slate-100 bg-slate-50 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Jadwal</p>
                <p className="text-lg font-bold tabular-nums text-slate-800">{formatNumber(d?.ritase_hari_ini ?? 0)}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2 space-y-1.5">
              <DurasiBar label="Rata² Loading" value={avgLoading} pct={pct(avgLoading)} />
              <DurasiBar label="Rata² Perjalanan" value={avgPerjalanan} pct={pct(avgPerjalanan)} />
            </div>
          </CardContent>
        </Card>

        {/* Bottleneck */}
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="px-3 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Bottleneck
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottlenecks.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Tidak ada bottleneck</p>
            ) : (
              <div className="space-y-2">
                {bottlenecks.slice(0, 4).map((b, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-2.5 py-2">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-800">{b.label}</p>
                      <p className="text-[11px] text-amber-600">{b.deskripsi ?? `${b.indikator}: ${b.nilai}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aktivitas Terakhir */}
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="px-3 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-sky-500" /> Aktivitas Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-1.5">
                {recentActivities.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-slate-700">{a.plat}</p>
                      <p className="truncate text-[11px] text-slate-500">{statusLabel(a.status)}</p>
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                      {new Date(a.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
