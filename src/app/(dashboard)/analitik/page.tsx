"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Download,
  Gem,
  Package,
  PackageCheck,
  Percent,
  RotateCcw,
  Route as RouteIcon,
  Store,
  Truck,
  Sparkles,
  Gift,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

// Grafik di-load secara dinamis agar unmount-nya tidak memblokir main thread saat user berpindah halaman
const ChartSkeleton = () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
const TrendAreaChart = dynamic(
  () => import("@/components/charts/analitik-charts").then((m) => m.TrendAreaChart),
  { ssr: false, loading: ChartSkeleton }
);
const TrendDirectionChart = dynamic(
  () => import("@/components/charts/analitik-charts").then((m) => m.TrendDirectionChart),
  { ssr: false, loading: ChartSkeleton }
);
const DriverBarChart = dynamic(
  () => import("@/components/charts/analitik-charts").then((m) => m.DriverBarChart),
  { ssr: false, loading: ChartSkeleton }
);
const SellerBarChart = dynamic(
  () => import("@/components/charts/analitik-charts").then((m) => m.SellerBarChart),
  { ssr: false, loading: ChartSkeleton }
);
const ImplantBarChart = dynamic(
  () => import("@/components/charts/analitik-charts").then((m) => m.ImplantBarChart),
  { ssr: false, loading: ChartSkeleton }
);
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTip } from "@/components/ui/info-tip";
import {
  useAnalyticsDrivers,
  useAnalyticsImplants,
  useAnalyticsSellers,
  useAnalyticsTrend,
} from "@/hooks/use-analytics";
import { useAllDriverPickupHistory } from "@/hooks/use-tracking";
import { useSeller } from "@/hooks/use-seller";
import { useDashboardAnalisis } from "@/hooks/use-dashboard";
import { AlertCard, BottleneckCard } from "@/components/dashboard/analisis-cards";
import { cn, formatNumber, exportCsv, normalizeSellerName } from "@/lib/utils";
import type {
  DriverPerformance,
  ImplantAnalytics,
  SellerAnalytics,
  TrendPoint,
} from "@/types/analytics";

/* ---------- helper tanggal & format ---------- */

function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgo(n: number): string {
  const now = new Date();
  now.setDate(now.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Tanggal lengkap (15 Agu 2026) — buat tooltip & label periode. */
function fmtFullDate(t: string): string {
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? t : format(d, "d MMM yyyy");
}

/** Tanggal pendek dd/MM/yyyy — buat date display. */
function formatDateID(t: string): string {
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? t : format(d, "dd/MM/yyyy");
}

/** Durasi ringkas dari detik → "45m" / "1j 5m". */
function fmtDur(sec?: number | null): string {
  if (sec == null || sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s}d`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}j ${m % 60}m`;
}

/** Format durasi dari backend ("40 menit 5 detik") jadi tampilan rapi, atau placeholder. */
function fmtDurStr(val?: string | null): string {
  if (!val || val === "belum ada data") return "—";
  return val;
}

/* ---------- komponen kecil ---------- */

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  loading,
  info,
  sub,
  progress,
  isText,
  infoAlign,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
  loading?: boolean;
  info?: string;
  sub?: string;
  progress?: number;
  isText?: boolean;
  infoAlign?: "left" | "right";
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
            {info && <InfoTip text={info} align={infoAlign} />}
          </p>
          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
            <Icon className={cn("h-4 w-4", tone ?? "text-slate-600 dark:text-slate-400")} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-24" />
        ) : (
          <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {isText ? value : formatNumber(value as number)}
          </p>
        )}
      </div>
      <div>
        {!loading && sub && (
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{sub}</p>
        )}
        {!loading && progress != null && (
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-slate-100 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(progress, 0))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CardSkeleton({ h = "h-[300px]" }: { h?: string }) {
  return <Skeleton className={cn("w-full rounded-xl", h)} />;
}

function EmptyNote() {
  return (
    <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
      Belum ada data pada periode ini
    </p>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Gagal mengambil data: <b>{msg}</b>
      </span>
    </div>
  );
}

function ArahBadge({ n, arah }: { n: number; arah: "out" | "inc" }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums",
        arah === "out"
          ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
      )}
    >
      {n}
    </span>
  );
}

/* ---------- halaman ---------- */

export default function AnalitikPage() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayLocal());
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Jam "diupdate" realtime — refresh tiap 30 detik biar label waktu selalu segar.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const trend = useAnalyticsTrend(from, to);
  const drivers = useAnalyticsDrivers(from, to);
  const sellers = useAnalyticsSellers(from, to);
  const implants = useAnalyticsImplants(from, to);
  const analisis = useDashboardAnalisis();
  const pickupHistoryQuery = useAllDriverPickupHistory({
    start_date: from,
    end_date: to,
  });

  const trendData = trend.data ?? [];
  const driverData = drivers.data ?? [];
  const sellerData = sellers.data ?? [];
  const implantData = implants.data ?? [];
  const pickupLogs = pickupHistoryQuery.data ?? [];
  const bottlenecks = analisis.data?.bottleneck ?? [];
  const alerts = analisis.data?.alerts ?? [];

  const loading = trend.isLoading || drivers.isLoading || sellers.isLoading || implants.isLoading;
  const loadingPickup = pickupHistoryQuery.isLoading;
  const errorMsg =
    trend.error?.message ?? drivers.error?.message ?? sellers.error?.message ?? implants.error?.message ?? null;

  const kpi = useMemo(() => {
    let ritase = 0,
      selesai = 0,
      awb = 0,
      koli = 0,
      hv = 0,
      ecer = 0,
      out = 0,
      inc = 0;
    for (const t of trendData) {
      ritase += t.ritase_total;
      selesai += t.ritase_selesai;
      awb += t.total_awb;
      koli += t.total_koli;
      hv += t.total_high_value;
      ecer += t.total_eceran;
      out += t.outgoing;
      inc += t.incoming;
    }
    return { ritase, selesai, awb, koli, hv, ecer, out, inc };
  }, [trendData]);

  const insight = useMemo(() => {
    const total = kpi.ritase;
    const pctSelesai = total > 0 ? Math.round((kpi.selesai / total) * 100) : 0;
    const days = trendData.length;
    const rataHari = days > 0 ? total / days : 0;
    const arahTotal = kpi.out + kpi.inc;
    const outPct = arahTotal > 0 ? Math.round((kpi.out / arahTotal) * 100) : 0;
    return { pctSelesai, days, rataHari, outPct };
  }, [kpi, trendData]);

  const topDrivers = useMemo(
    () => [...driverData].sort((a, b) => b.ritase_total - a.ritase_total).slice(0, 10),
    [driverData]
  );
  const { data: masterSellers = [] } = useSeller();
  const [sellerSource, setSellerSource] = useState<"semua" | "pickup" | "linehaul">("semua");

  const masterSellerMap = useMemo(() => {
    const map = new Map<string, { code: string; city: string }>();
    for (const s of masterSellers) {
      const norm = normalizeSellerName(s.name);
      if (norm) {
        map.set(norm.toLowerCase(), { code: s.code, city: s.city || "Tangerang" });
      }
    }
    return map;
  }, [masterSellers]);

  const pickupSellerData = useMemo<SellerAnalytics[]>(() => {
    // Urutkan log secara kronologis dari waktu terlama ke terbaru
    const sortedLogs = [...pickupLogs].sort((a, b) => {
      const tA = new Date(a.created_at || a.updated_at || a.tanggal).getTime();
      const tB = new Date(b.created_at || b.updated_at || b.tanggal).getTime();
      return tA - tB;
    });

    interface VisitSession {
      sellerName: string;
      driverId: string;
      lastTimestamp: number;
      isSelesai: boolean;
      awb: number;
      koli: number;
      hv: number;
      ecer: number;
    }

    const sessions: VisitSession[] = [];

    for (const log of sortedLogs) {
      if (!log.asal_seller) continue;
      const norm = normalizeSellerName(log.asal_seller);
      if (!norm) continue;

      const time = new Date(log.created_at || log.updated_at || log.tanggal).getTime();
      const driverKey = String(log.id_user || log.nama_driver || "driver");
      const st = (log.status || "").toLowerCase();
      const isCompleted = st === "selesai" || st === "menuju_gudang";
      const awb = log.jumlah_barang || 0;
      const koli = log.koli || 0;
      const hv = log.high_value || 0;
      const ecer = log.ecer || 0;

      // Cari sesi kunjungan yang sama dalam jeda <= 30 menit (checkpoint status update atau double-tap)
      const existingSession = sessions.slice().reverse().find(
        (s) => s.sellerName === norm && s.driverId === driverKey && Math.abs(time - s.lastTimestamp) <= 30 * 60 * 1000
      );

      if (existingSession) {
        existingSession.lastTimestamp = time;
        if (isCompleted) {
          existingSession.isSelesai = true;
        }
        // Ambil nilai terbaru/maksimum muatan agar tidak melipatgandakan AWB
        existingSession.awb = Math.max(existingSession.awb, awb);
        existingSession.koli = Math.max(existingSession.koli, koli);
        existingSession.hv = Math.max(existingSession.hv, hv);
        existingSession.ecer = Math.max(existingSession.ecer, ecer);
      } else {
        // Sesi kunjungan terpisah / baru
        sessions.push({
          sellerName: norm,
          driverId: driverKey,
          lastTimestamp: time,
          isSelesai: isCompleted,
          awb,
          koli,
          hv,
          ecer,
        });
      }
    }

    const map = new Map<string, {
      nama_seller: string;
      kunjungan: number;
      ritase_selesai: number;
      total_awb: number;
      total_koli: number;
      total_high_value: number;
      total_eceran: number;
    }>();

    for (const s of sessions) {
      if (!map.has(s.sellerName)) {
        map.set(s.sellerName, {
          nama_seller: s.sellerName,
          kunjungan: 0,
          ritase_selesai: 0,
          total_awb: 0,
          total_koli: 0,
          total_high_value: 0,
          total_eceran: 0,
        });
      }
      const item = map.get(s.sellerName)!;
      item.kunjungan += 1;
      if (s.isSelesai) {
        item.ritase_selesai += 1;
      }
      item.total_awb += s.awb;
      item.total_koli += s.koli;
      item.total_high_value += s.hv;
      item.total_eceran += s.ecer;
    }

    return Array.from(map.values()).map((item, idx) => {
      const meta = masterSellerMap.get(item.nama_seller.toLowerCase());
      return {
        id_seller: -(idx + 1),
        kode_seller: meta?.code || `SLR-PKP`,
        nama_seller: item.nama_seller,
        kota: meta?.city || "Tangerang",
        jarak_tempuh_km: null,
        jarak_dc_km: null,
        kunjungan: item.kunjungan,
        ritase_selesai: item.ritase_selesai,
        total_awb: item.total_awb,
        total_koli: item.total_koli,
        total_high_value: item.total_high_value,
        total_eceran: item.total_eceran,
      };
    });
  }, [pickupLogs, masterSellerMap]);

  const combinedSellerData = useMemo<SellerAnalytics[]>(() => {
    const map = new Map<string, SellerAnalytics>();

    // 1. Linehaul sellers
    for (const s of sellerData) {
      const norm = normalizeSellerName(s.nama_seller) || s.nama_seller;
      map.set(norm.toLowerCase(), {
        ...s,
        nama_seller: norm,
      });
    }

    // 2. Pickup sellers
    for (const p of pickupSellerData) {
      const key = p.nama_seller.toLowerCase();
      if (map.has(key)) {
        const exist = map.get(key)!;
        exist.kunjungan += p.kunjungan;
        exist.ritase_selesai += p.ritase_selesai;
        exist.total_awb += p.total_awb;
        exist.total_koli += p.total_koli;
        exist.total_high_value += p.total_high_value;
        exist.total_eceran += p.total_eceran;
      } else {
        map.set(key, { ...p });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.kunjungan - a.kunjungan);
  }, [sellerData, pickupSellerData]);

  const activeSellerData = useMemo(() => {
    if (sellerSource === "pickup") return [...pickupSellerData].sort((a, b) => b.kunjungan - a.kunjungan);
    if (sellerSource === "linehaul") return [...sellerData].sort((a, b) => b.kunjungan - a.kunjungan);
    return combinedSellerData;
  }, [sellerSource, pickupSellerData, sellerData, combinedSellerData]);

  const topSellers = useMemo(
    () => [...activeSellerData].slice(0, 10),
    [activeSellerData]
  );
  const topImplants = useMemo(
    () => [...implantData].sort((a, b) => b.kunjungan - a.kunjungan).slice(0, 10),
    [implantData]
  );

  interface PickupDriverPerf {
    id_user: number;
    nama_driver: string;
    total_sesi: number;
    sesi_selesai: number;
    total_koli: number;
    total_awb: number;
    total_ecer: number;
    total_hv: number;
    total_seller: number;
    rata_koli: number;
  }

  const { pickupDriverData, totalPickupKoli, totalPickupAwb } = useMemo(() => {
    // Urutkan log secara kronologis untuk sesi per driver + seller
    const sortedLogs = [...pickupLogs].sort((a, b) => {
      const tA = new Date(a.created_at || a.updated_at || a.tanggal).getTime();
      const tB = new Date(b.created_at || b.updated_at || b.tanggal).getTime();
      return tA - tB;
    });

    interface DriverSession {
      driverName: string;
      idUser: number;
      sellerName: string;
      lastTimestamp: number;
      isSelesai: boolean;
      awb: number;
      koli: number;
      hv: number;
      ecer: number;
    }

    const sessions: DriverSession[] = [];

    for (const log of sortedLogs) {
      const name = (log.nama_driver || "Driver Pickup").trim();
      const norm = normalizeSellerName(log.asal_seller) || (log.asal_seller ? log.asal_seller.trim() : "Gudang");
      const time = new Date(log.created_at || log.updated_at || log.tanggal).getTime();
      const st = (log.status || "").toLowerCase();
      const isCompleted = st === "selesai" || st === "menuju_gudang";
      const awb = log.jumlah_barang || 0;
      const koli = log.koli || 0;
      const hv = log.high_value || 0;
      const ecer = log.ecer || 0;

      const existing = sessions.slice().reverse().find(
        (s) => s.driverName === name && s.sellerName === norm && Math.abs(time - s.lastTimestamp) <= 30 * 60 * 1000
      );

      if (existing) {
        existing.lastTimestamp = time;
        if (isCompleted) existing.isSelesai = true;
        existing.awb = Math.max(existing.awb, awb);
        existing.koli = Math.max(existing.koli, koli);
        existing.hv = Math.max(existing.hv, hv);
        existing.ecer = Math.max(existing.ecer, ecer);
      } else {
        sessions.push({
          driverName: name,
          idUser: log.id_user || 0,
          sellerName: norm,
          lastTimestamp: time,
          isSelesai: isCompleted,
          awb,
          koli,
          hv,
          ecer,
        });
      }
    }

    const map = new Map<string, {
      id_user: number;
      nama_driver: string;
      total_sesi: number;
      sesi_selesai: number;
      total_koli: number;
      total_awb: number;
      total_ecer: number;
      total_hv: number;
      sellers: Set<string>;
    }>();

    let sumKoli = 0;
    let sumAwb = 0;

    for (const s of sessions) {
      if (!map.has(s.driverName)) {
        map.set(s.driverName, {
          id_user: s.idUser,
          nama_driver: s.driverName,
          total_sesi: 0,
          sesi_selesai: 0,
          total_koli: 0,
          total_awb: 0,
          total_ecer: 0,
          total_hv: 0,
          sellers: new Set<string>(),
        });
      }

      const d = map.get(s.driverName)!;
      d.total_sesi += 1;
      if (s.isSelesai) d.sesi_selesai += 1;
      d.total_koli += s.koli;
      d.total_awb += s.awb;
      d.total_ecer += s.ecer;
      d.total_hv += s.hv;
      if (s.sellerName && s.sellerName.toLowerCase() !== "gudang") {
        d.sellers.add(s.sellerName);
      }

      sumKoli += s.koli;
      sumAwb += s.awb;
    }

    const list: PickupDriverPerf[] = Array.from(map.values()).map((d) => ({
      id_user: d.id_user,
      nama_driver: d.nama_driver,
      total_sesi: d.total_sesi,
      sesi_selesai: d.sesi_selesai,
      total_koli: d.total_koli,
      total_awb: d.total_awb,
      total_ecer: d.total_ecer,
      total_hv: d.total_hv,
      total_seller: d.sellers.size,
      rata_koli: d.total_sesi > 0 ? Math.round(d.total_koli / d.total_sesi) : 0,
    })).sort((a, b) => b.total_koli - a.total_koli);

    return { pickupDriverData: list, totalPickupKoli: sumKoli, totalPickupAwb: sumAwb };
  }, [pickupLogs]);

  // Presets definition terstandarisasi
  const presets = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const toWIB = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

    const firstMonthStr = toWIB(new Date(now.getFullYear(), now.getMonth(), 1));

    return [
      { id: "today", label: "Hari Ini", from: todayLocal(), to: todayLocal() },
      { id: "yesterday", label: "Kemarin", from: daysAgo(1), to: daysAgo(1) },
      { id: "this_week", label: "Minggu Ini", from: toWIB(monday), to: toWIB(sunday) },
      { id: "this_month", label: "Bulan Ini", from: firstMonthStr, to: todayLocal() },
      { id: "30d", label: "30 Hari", from: daysAgo(29), to: todayLocal() },
    ];
  }, []);

  const isPresetActive = presets.some((p) => p.from === from && p.to === to);

  const handleExportDriversCsv = () => {
    const headers = [
      "Nama Driver",
      "Total Ritase",
      "Ritase Selesai",
      "Total AWB",
      "Total Koli",
      "High Value",
      "Eceran",
      "Outgoing (JKT)",
      "Incoming (SEG)",
      "Rata Loading (menit)",
      "Rata Perjalanan (menit)",
    ];
    const rows = driverData.map((d) => [
      d.nama_driver,
      d.ritase_total,
      d.ritase_selesai,
      d.total_awb,
      d.total_koli,
      d.total_high_value,
      d.total_eceran,
      d.outgoing,
      d.incoming,
      d.rata_loading != null ? Math.round(d.rata_loading / 60) : 0,
      d.rata_perjalanan != null ? Math.round(d.rata_perjalanan / 60) : 0,
    ]);
    exportCsv(`performa_driver_${from}_sd_${to}`, headers, rows);
  };

  const handleExportSellersCsv = () => {
    const headers = [
      "Kode Seller",
      "Nama Seller",
      "Kota",
      "Kunjungan",
      "Ritase Selesai",
      "Total AWB",
      "Total Koli",
      "High Value",
      "Eceran",
      "Jarak Tempuh (km)",
    ];
    const rows = activeSellerData.map((s) => [
      s.kode_seller || "-",
      s.nama_seller,
      s.kota || "-",
      s.kunjungan,
      s.ritase_selesai,
      s.total_awb,
      s.total_koli,
      s.total_high_value,
      s.total_eceran,
      s.jarak_tempuh_km != null ? s.jarak_tempuh_km.toFixed(1) : "-",
    ]);
    exportCsv(`kunjungan_seller_${sellerSource}_${from}_sd_${to}`, headers, rows);
  };

  const handleExportPickupDriversCsv = () => {
    const headers = [
      "Nama Driver Pickup",
      "Total Sesi / Log",
      "Sesi Selesai",
      "Toko/Seller Terlayani",
      "Total Koli",
      "Total AWB",
      "Eceran",
      "High Value",
      "Rata-rata Koli / Sesi",
    ];
    const rows = pickupDriverData.map((d) => [
      d.nama_driver,
      d.total_sesi,
      d.sesi_selesai,
      d.total_seller,
      d.total_koli,
      d.total_awb,
      d.total_ecer,
      d.total_hv,
      d.rata_koli,
    ]);
    exportCsv(`performa_driver_pickup_${from}_sd_${to}`, headers, rows);
  };

  const handleExportImplantsCsv = () => {
    const headers = [
      "Kode Implant",
      "Nama Implant",
      "Kota",
      "Kunjungan",
      "Ritase Selesai",
      "Total AWB",
      "Total Koli",
      "High Value",
      "Eceran",
      "Jarak Tempuh (km)",
    ];
    const rows = implantData.map((s) => [
      s.kode_implant || "-",
      s.nama_implant,
      s.kota || "-",
      s.kunjungan,
      s.ritase_selesai,
      s.total_awb,
      s.total_koli,
      s.total_high_value,
      s.total_eceran,
      s.jarak_tempuh_km != null ? s.jarak_tempuh_km.toFixed(1) : "-",
    ]);
    exportCsv(`kunjungan_implant_${from}_sd_${to}`, headers, rows);
  };

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Analitik Bisnis & Ritase"
        description="Analisis performa ritase driver, arus muatan koli ke Gateway (JKT/SEG), dan pemantauan penjemputan paket seller."
        crumbs={[{ label: "Analitik" }]}
        actions={
          <Link
            href="/analitik/efektivitas-armada"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Truck className="h-4 w-4 text-[#0c1e3a] dark:text-white" />
            <span>Dasbor Efektivitas Armada</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        }
      />

      {/* ── UNIFIED FILTER TOOLBAR (Style Riwayat Pickup - Kanan & Kiri Rapi) ── */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-3.5 space-y-3">
          {/* Baris 1: Preset Periode (Kiri) & Indikator Tanggal Aktif (Kanan) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Kiri: Periode Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Periode:
              </span>

              {presets.map((p) => {
                const isActive = from === p.from && to === p.to;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setFrom(p.from);
                      setTo(p.to);
                      setShowCustomRange(false);
                    }}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      isActive
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}

              {/* Tombol Pilih Rentang */}
              <button
                type="button"
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  showCustomRange || !isPresetActive
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
                title="Atur rentang tanggal spesifik"
              >
                <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
                <span>Pilih Rentang</span>
              </button>
            </div>

            {/* Kanan: Indikator Periode Aktif */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  Periode: <strong className="text-slate-900 dark:text-white font-semibold">{fmtFullDate(from)} – {fmtFullDate(to)}</strong>
                  <span className="text-slate-400 ml-1 font-normal">({insight.days || 1} hari)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Baris 2 (Kustom Range): Dari Tanggal - Sampai Tanggal & Tombol Reset */}
          {(showCustomRange || !isPresetActive) && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-800/80" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Rentang Kustom:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 px-3 py-1.5 text-xs">
                      <span className="text-[11px] font-medium text-slate-400">Dari:</span>
                      <input
                        type="date"
                        value={from}
                        max={to}
                        onChange={(e) => {
                          if (e.target.value) setFrom(e.target.value);
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                    <span className="text-slate-400 font-semibold">–</span>
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 px-3 py-1.5 text-xs">
                      <span className="text-[11px] font-medium text-slate-400">Sampai:</span>
                      <input
                        type="date"
                        value={to}
                        min={from}
                        max={todayLocal()}
                        onChange={(e) => {
                          if (e.target.value) setTo(e.target.value);
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setFrom(daysAgo(29));
                      setTo(todayLocal());
                      setShowCustomRange(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset (30 Hari)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {errorMsg && <ErrorBanner msg={errorMsg} />}

      <Tabs defaultValue="ringkasan" className="space-y-4">
        {/* Tab Navigation Pill Bar */}
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 gap-1 inline-flex">
            <TabsTrigger value="ringkasan" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900 transition-all">
              Ringkasan Eksekutif
            </TabsTrigger>
            <TabsTrigger value="driver_linehaul" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900 transition-all">
              Driver Dorong (Gateway)
            </TabsTrigger>
            <TabsTrigger value="driver_pickup" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900 transition-all">
              Driver Pickup
            </TabsTrigger>
            <TabsTrigger value="seller" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900 transition-all">
              Seller
            </TabsTrigger>
            <TabsTrigger value="implant" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900 transition-all">
              Implant
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ===== RINGKASAN EKSEKUTIF ===== */}
        <TabsContent value="ringkasan" className="space-y-4">
          {/* 1. Hero KPI Cards (4 Column Primary Logistics Metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Ritase Armada"
              value={kpi.ritase}
              icon={Truck}
              loading={loading}
              info="Total penugasan ritase armada pada rentang tanggal terpilih."
              sub={`${insight.pctSelesai}% terlaksana (${kpi.selesai} selesai)`}
              progress={insight.pctSelesai}
            />
            <KpiCard
              label="Total Muatan Koli"
              value={kpi.koli}
              icon={Package}
              loading={loading}
              info="Akumulasi koli yang didorong ke Gateway."
              sub={kpi.awb > 0 ? `${(kpi.koli / kpi.awb).toFixed(2)} koli/AWB (${formatNumber(kpi.awb)} AWB)` : undefined}
            />
            <KpiCard
              label="Kategori Khusus"
              value={`${formatNumber(kpi.hv)} HV`}
              icon={Sparkles}
              loading={loading}
              tone="text-amber-500"
              isText
              info="High Value (HV) dan barang eceran yang ditangani."
              sub={`${formatNumber(kpi.ecer)} eceran (${kpi.koli > 0 ? ((kpi.hv / kpi.koli) * 100).toFixed(1) : 0}% HV dari total koli)`}
            />
            <KpiCard
              label="Distribusi Arah Ritase"
              value={`${kpi.out} Out / ${kpi.inc} In`}
              icon={TrendingUp}
              loading={loading}
              isText
              info="Arah pengiriman: Outgoing (ke JKT) vs Incoming (ke SEG)."
              sub={`${insight.outPct}% Outgoing • ${100 - insight.outPct}% Incoming`}
              progress={insight.outPct}
            />
          </div>

          {/* 2. Operational Efficiency Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rata² Ritase / Hari</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {insight.rataHari.toFixed(1)} <span className="text-xs font-normal text-slate-500">ritase</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tingkat Penyelesaian</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {insight.pctSelesai}% <span className="text-xs font-normal text-slate-500">selesai</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rata² Durasi Loading</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white truncate">
                {fmtDurStr(analisis.data?.durasi?.rata_rata_loading)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rata² Durasi Jalan</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white truncate">
                {fmtDurStr(analisis.data?.durasi?.rata_rata_perjalanan)}
              </p>
            </div>
          </div>

          {/* 3. Komparasi First-Mile (Pickup Toko) vs Middle-Mile (Gateway Linehaul) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">First-Mile (Pickup Toko)</p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {totalPickupKoli > 0 ? (
                    <>
                      {formatNumber(totalPickupKoli)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">koli</span>
                      {totalPickupAwb > 0 && (
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-1">({formatNumber(totalPickupAwb)} AWB)</span>
                      )}
                    </>
                  ) : totalPickupAwb > 0 ? (
                    <>
                      {formatNumber(totalPickupAwb)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">AWB</span>
                    </>
                  ) : (
                    <>
                      0 <span className="text-xs font-normal text-slate-500 dark:text-slate-400">koli</span>
                    </>
                  )}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">({pickupDriverData.length} driver)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Middle-Mile (Gateway Linehaul)</p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {kpi.koli > 0 ? (
                    <>
                      {formatNumber(kpi.koli)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">koli</span>
                      {kpi.awb > 0 && (
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-1">({formatNumber(kpi.awb)} AWB)</span>
                      )}
                    </>
                  ) : kpi.awb > 0 ? (
                    <>
                      {formatNumber(kpi.awb)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">AWB</span>
                    </>
                  ) : (
                    <>
                      0 <span className="text-xs font-normal text-slate-500 dark:text-slate-400">koli</span>
                    </>
                  )}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">({kpi.ritase} ritase)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Rasio Distribusi Pickup ke Gateway</p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {totalPickupKoli > 0
                    ? `${Math.min(100, Math.round((kpi.koli / totalPickupKoli) * 100))}%`
                    : totalPickupAwb > 0 && kpi.awb > 0
                      ? `${Math.min(100, Math.round((kpi.awb / totalPickupAwb) * 100))}%`
                      : totalPickupKoli === 0 && kpi.koli === 0 && totalPickupAwb === 0 && kpi.awb === 0
                        ? "0%"
                        : "100%"}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">terdistribusi</span>
                </p>
              </div>
            </div>
          </div>

          {/* 4. Visualisasi Grafik Tren */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Tren Ritase per Hari
                  <InfoTip text="Navy = Total Ritase, Slate = Selesai" align="right" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pergerakan volume ritase harian sepanjang periode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <CardSkeleton />
                ) : trendData.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <div className="h-[300px] w-full">
                    <TrendAreaChart data={trendData} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowUpFromLine className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Perbandingan Arah Operasional
                  <InfoTip text="Out = Gateway JKT, In = Gateway SEG" align="right" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Perbandingan ritase outgoing vs incoming per hari.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <CardSkeleton />
                ) : trendData.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <div className="h-[300px] w-full">
                    <TrendDirectionChart data={trendData} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 5. Bottleneck & Alert Operasional */}
          <div className="grid gap-4 lg:grid-cols-2">
            <BottleneckCard bottlenecks={bottlenecks} />
            <AlertCard alerts={alerts} />
          </div>
        </TabsContent>

        {/* ===== DRIVER DORONG (GATEWAY) ===== */}
        <TabsContent value="driver_linehaul" className="space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Top 10 Ritase Driver Dorong Gateway
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Driver dengan penugasan ritase linehaul terbanyak pada periode ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <CardSkeleton h="h-[260px]" />
              ) : topDrivers.length === 0 ? (
                <EmptyNote />
              ) : (
                <div className="h-[260px] w-full">
                  <DriverBarChart data={topDrivers} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Detail Performa Driver Dorong
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Akumulasi ritase dan muatan koli driver dorong Gateway pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {driverData.length} driver aktif
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable<DriverPerformance>
                loading={loading}
                rows={driverData}
                rowKey={(d) => String(d.id_driver)}
                searchPlaceholder="Cari nama driver..."
                searchFilter={(d, q) =>
                  d.nama_driver.toLowerCase().includes(q.toLowerCase())
                }
                toolbar={
                  <button
                    type="button"
                    onClick={handleExportDriversCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    title="Unduh data performa driver ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                }
                emptyText="Belum ada data driver pada periode ini"
                columns={[
                  { header: "Driver", render: (d) => <span className="font-semibold text-slate-800 dark:text-slate-200">{d.nama_driver}</span> },
                  { header: "Ritase", render: (d) => <span className="tabular-nums font-bold">{formatNumber(d.ritase_total)}</span> },
                  { header: "Selesai", render: (d) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{formatNumber(d.ritase_selesai)}</span> },
                  { header: "AWB", render: (d) => <span className="tabular-nums">{formatNumber(d.total_awb)}</span> },
                  { header: "Koli", render: (d) => <span className="tabular-nums font-semibold">{formatNumber(d.total_koli)}</span> },
                  { header: "HV", render: (d) => <span className="tabular-nums text-amber-500 font-medium">{formatNumber(d.total_high_value)}</span> },
                  { header: "Ecer", render: (d) => <span className="tabular-nums text-violet-500 font-medium">{formatNumber(d.total_eceran)}</span> },
                  { header: "Out", render: (d) => <ArahBadge n={d.outgoing} arah="out" /> },
                  { header: "In", render: (d) => <ArahBadge n={d.incoming} arah="inc" /> },
                  { header: "Loading", render: (d) => <span className="tabular-nums text-slate-500">{fmtDur(d.rata_loading)}</span> },
                  { header: "Jalan", render: (d) => <span className="tabular-nums text-slate-500">{fmtDur(d.rata_perjalanan)}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DRIVER PICKUP ===== */}
        <TabsContent value="driver_pickup" className="space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Detail Performa Driver Pickup
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Akumulasi penjemputan paket dari seller/implan toko ke gudang transit pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {pickupDriverData.length} driver pickup
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable<PickupDriverPerf>
                loading={loadingPickup}
                rows={pickupDriverData}
                rowKey={(d) => String(d.nama_driver)}
                searchPlaceholder="Cari nama driver pickup..."
                searchFilter={(d, q) =>
                  d.nama_driver.toLowerCase().includes(q.toLowerCase())
                }
                toolbar={
                  <button
                    type="button"
                    onClick={handleExportPickupDriversCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    title="Unduh data performa driver pickup ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                }
                emptyText="Belum ada data driver pickup pada periode ini"
                columns={[
                  { header: "Driver Pickup", render: (d) => <span className="font-semibold text-slate-800 dark:text-slate-200">{d.nama_driver}</span> },
                  { header: "Total Sesi", render: (d) => <span className="tabular-nums font-bold">{formatNumber(d.total_sesi)}</span> },
                  { header: "Selesai", render: (d) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{formatNumber(d.sesi_selesai)}</span> },
                  { header: "Toko Dikunjungi", render: (d) => <span className="tabular-nums">{formatNumber(d.total_seller)}</span> },
                  { header: "Total Koli", render: (d) => <span className="tabular-nums font-bold text-slate-900 dark:text-white">{formatNumber(d.total_koli)}</span> },
                  { header: "Total AWB", render: (d) => <span className="tabular-nums">{formatNumber(d.total_awb)}</span> },
                  { header: "HV", render: (d) => <span className="tabular-nums text-amber-500 font-medium">{formatNumber(d.total_hv)}</span> },
                  { header: "Ecer", render: (d) => <span className="tabular-nums text-violet-500 font-medium">{formatNumber(d.total_ecer)}</span> },
                  { header: "Rata² Koli/Sesi", render: (d) => <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{d.rata_koli} koli</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SELLER ===== */}
        <TabsContent value="seller" className="space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Top 10 Kunjungan Seller
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Seller dengan volume kunjungan dan muatan koli/AWB terbanyak pada periode ini.
                  </CardDescription>
                </div>

                {/* Filter Sumber Data Seller */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setSellerSource("semua")}
                    className={cn(
                      "px-3 py-1 font-semibold rounded-md transition-all",
                      sellerSource === "semua"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    Semua ({combinedSellerData.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerSource("pickup")}
                    className={cn(
                      "px-3 py-1 font-semibold rounded-md transition-all",
                      sellerSource === "pickup"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    Pickup Toko ({pickupSellerData.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerSource("linehaul")}
                    className={cn(
                      "px-3 py-1 font-semibold rounded-md transition-all",
                      sellerSource === "linehaul"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    Dorong Gateway ({sellerData.length})
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading || loadingPickup ? (
                <CardSkeleton h="h-[260px]" />
              ) : topSellers.length === 0 ? (
                <EmptyNote />
              ) : (
                <div className="h-[260px] w-full">
                  <SellerBarChart data={topSellers} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Detail Kunjungan Seller
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Statistik volume koli, AWB, dan frekuensi kunjungan seller pada periode terpilih ({sellerSource === "semua" ? "Seluruh Penjemputan Toko & Gateway" : sellerSource === "pickup" ? "Penjemputan Toko / First-Mile" : "Armada Dorong Gateway / Linehaul"}).
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {activeSellerData.length} seller terdata
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable<SellerAnalytics>
                loading={loading || loadingPickup}
                rows={activeSellerData}
                rowKey={(s) => `${s.nama_seller}-${s.id_seller}`}
                searchPlaceholder="Cari nama / kode seller..."
                searchFilter={(s, q) =>
                  `${s.nama_seller} ${s.kode_seller ?? ""} ${s.kota ?? ""}`
                    .toLowerCase()
                    .includes(q.toLowerCase())
                }
                toolbar={
                  <button
                    type="button"
                    onClick={handleExportSellersCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    title="Unduh data kunjungan seller ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                }
                emptyText="Belum ada data seller pada periode ini"
                columns={[
                  { header: "Kode", render: (s) => <span className="font-mono text-xs text-slate-500">{s.kode_seller || "-"}</span> },
                  {
                    header: "Seller",
                    render: (s) => (
                      <span className="block max-w-[220px] truncate font-semibold text-slate-800 dark:text-slate-200" title={s.nama_seller}>
                        {s.nama_seller || "-"}
                      </span>
                    ),
                  },
                  { header: "Kota", render: (s) => <span className="text-slate-500">{s.kota || "-"}</span> },
                  { header: "Kunjungan", render: (s) => <span className="tabular-nums font-bold">{formatNumber(s.kunjungan)}</span> },
                  { header: "Selesai", render: (s) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{formatNumber(s.ritase_selesai)}</span> },
                  { header: "AWB", render: (s) => <span className="tabular-nums">{formatNumber(s.total_awb)}</span> },
                  { header: "Koli", render: (s) => <span className="tabular-nums font-semibold">{formatNumber(s.total_koli)}</span> },
                  { header: "HV", render: (s) => <span className="tabular-nums text-amber-500 font-medium">{formatNumber(s.total_high_value)}</span> },
                  { header: "Ecer", render: (s) => <span className="tabular-nums text-violet-500 font-medium">{formatNumber(s.total_eceran)}</span> },
                  {
                    header: "Jarak OG",
                    render: (s) => (
                      <span className="tabular-nums text-slate-500">
                        {s.jarak_tempuh_km != null ? `${s.jarak_tempuh_km.toFixed(1)} km` : "-"}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== IMPLANT ===== */}
        <TabsContent value="implant" className="space-y-4">
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Store className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Top 10 Kunjungan Implant
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Titik implant dengan frekuensi kunjungan dan muatan koli terbanyak pada periode ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <CardSkeleton h="h-[260px]" />
              ) : topImplants.length === 0 ? (
                <EmptyNote />
              ) : (
                <div className="h-[260px] w-full">
                  <ImplantBarChart data={topImplants} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-[#0c1e3a] dark:text-white" /> Detail Kunjungan Implant
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Statistik volume koli dan frekuensi kunjungan implant dorong Gateway pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {implantData.length} implant
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable<ImplantAnalytics>
                loading={loading}
                rows={implantData}
                rowKey={(s) => String(s.id_implant)}
                searchPlaceholder="Cari nama / kode implant..."
                searchFilter={(s, q) =>
                  `${s.nama_implant} ${s.kode_implant ?? ""} ${s.kota ?? ""}`
                    .toLowerCase()
                    .includes(q.toLowerCase())
                }
                toolbar={
                  <button
                    type="button"
                    onClick={handleExportImplantsCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    title="Unduh data kunjungan implant ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                }
                emptyText="Belum ada data implant pada periode ini"
                columns={[
                  { header: "Kode", render: (s) => <span className="font-mono text-xs text-slate-500">{s.kode_implant || "-"}</span> },
                  {
                    header: "Implant",
                    render: (s) => (
                      <span className="block max-w-[220px] truncate font-semibold text-slate-800 dark:text-slate-200" title={s.nama_implant}>
                        {s.nama_implant || "-"}
                      </span>
                    ),
                  },
                  { header: "Kota", render: (s) => <span className="text-slate-500">{s.kota || "-"}</span> },
                  { header: "Kunjungan", render: (s) => <span className="tabular-nums font-bold">{formatNumber(s.kunjungan)}</span> },
                  { header: "Selesai", render: (s) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{formatNumber(s.ritase_selesai)}</span> },
                  { header: "AWB", render: (s) => <span className="tabular-nums">{formatNumber(s.total_awb)}</span> },
                  { header: "Koli", render: (s) => <span className="tabular-nums font-semibold">{formatNumber(s.total_koli)}</span> },
                  { header: "HV", render: (s) => <span className="tabular-nums text-amber-500 font-medium">{formatNumber(s.total_high_value)}</span> },
                  { header: "Ecer", render: (s) => <span className="tabular-nums text-violet-500 font-medium">{formatNumber(s.total_eceran)}</span> },
                  {
                    header: "Jarak Tempuh",
                    render: (s) => (
                      <span className="tabular-nums text-slate-500">
                        {s.jarak_tempuh_km != null ? `${s.jarak_tempuh_km.toFixed(1)} km` : "-"}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
