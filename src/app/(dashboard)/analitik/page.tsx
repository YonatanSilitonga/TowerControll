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
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Download,
  Gem,
  Package,
  PackageCheck,
  Percent,
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

// Grafik di-load secara dinamis agar unmount-nya tidak memblokir main thread
// saat user berpindah halaman
const ChartSkeleton = () => <div className="h-full w-full animate-pulse rounded-md bg-slate-100" />;
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
import { useDashboardAnalisis } from "@/hooks/use-dashboard";
import { AlertCard, BottleneckCard } from "@/components/dashboard/analisis-cards";
import { cn, formatNumber, exportCsv } from "@/lib/utils";
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
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  wib.setUTCDate(wib.getUTCDate() - n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(wib);
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

/** Tick sumbu-X: "d MMM", tambah tahun di bulan Januari biar konteks lintas tahun jelas. */
function fmtTick(t: string): string {
  const d = new Date(`${t}T00:00:00`);
  if (Number.isNaN(d.getTime())) return t;
  return d.getMonth() === 0 ? format(d, "d MMM yyyy") : format(d, "d MMM");
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

const PRESETS = [
  { label: "7 Hari", days: 7 },
  { label: "10 Hari", days: 10 },
  { label: "90 Hari", days: 90 },
];

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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}
          {info && <InfoTip text={info} align={infoAlign} />}
        </p>
        <Icon className={cn("h-4 w-4", tone ?? "text-slate-300")} />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
          {isText ? value : formatNumber(value as number)}
        </p>
      )}
      {!loading && sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
      {!loading && progress != null && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#0c1e3a]"
            style={{ width: `${Math.min(100, Math.max(progress, 0))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CardSkeleton({ h = "h-[300px]" }: { h?: string }) {
  return <Skeleton className={cn("w-full rounded-lg", h)} />;
}

function EmptyNote() {
  return (
    <p className="py-8 text-center text-sm text-slate-400">
      Belum ada data pada periode ini
    </p>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
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
        "rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        arah === "out" ? "bg-[#0c1e3a]/5 text-[#0c1e3a]" : "bg-slate-100 text-slate-600"
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
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);

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
  const topSellers = useMemo(
    () => [...sellerData].sort((a, b) => b.kunjungan - a.kunjungan).slice(0, 10),
    [sellerData]
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

    for (const log of pickupLogs) {
      const name = (log.nama_driver || "Driver Pickup").trim();
      sumKoli += log.koli || 0;
      sumAwb += log.jumlah_barang || 0;

      if (!map.has(name)) {
        map.set(name, {
          id_user: log.id_user || 0,
          nama_driver: name,
          total_sesi: 0,
          sesi_selesai: 0,
          total_koli: 0,
          total_awb: 0,
          total_ecer: 0,
          total_hv: 0,
          sellers: new Set<string>(),
        });
      }

      const d = map.get(name)!;
      d.total_sesi += 1;
      const st = (log.status || "").toLowerCase();
      if (st === "selesai" || st === "menuju_gudang") {
        d.sesi_selesai += 1;
      }
      d.total_koli += log.koli || 0;
      d.total_awb += log.jumlah_barang || 0;
      d.total_ecer += log.ecer || 0;
      d.total_hv += log.high_value || 0;
      if (log.asal_seller) {
        d.sellers.add(log.asal_seller);
      }
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

  const setPreset = (days: number) => {
    setFrom(daysAgo(days - 1));
    setTo(todayLocal());
  };

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
    const rows = sellerData.map((s) => [
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
    exportCsv(`kunjungan_seller_${from}_sd_${to}`, headers, rows);
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
    <div className="space-y-4">
      <PageHeader
        title="Analitik"
        description="Analisis data ritase driver dorong dan arus muatan koli ke Gateway (JKT/SEG)."
        crumbs={[{ label: "Analitik" }]}
        actions={
          <Link
            href="/analitik/efektivitas-armada"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Truck className="h-4 w-4 text-[#0c1e3a]" />
            <span>Dasbor Efektivitas Armada</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        }
      />

      {/* ── Filter Bar ── */}
      <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        {/* Baris 1: Preset pills + Rencana */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <DatePill
              key={p.days}
              label={p.label}
              active={to === todayLocal() && from === daysAgo(p.days - 1)}
              onClick={() => setPreset(p.days)}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              setFrom(todayLocal());
              setTo(todayLocal());
            }}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors",
              from === todayLocal() && to === todayLocal()
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
            )}
          >
            <CalendarRange className="h-3 w-3" />
            Rencana
          </button>
        </div>

        {/* Baris 2: Date range display */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dateFromRef.current?.showPicker()}
            className="flex flex-1 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium tabular-nums text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {formatDateID(from)}
          </button>
          <span className="text-slate-400">–</span>
          <button
            type="button"
            onClick={() => dateToRef.current?.showPicker()}
            className="flex flex-1 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium tabular-nums text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {formatDateID(to)}
          </button>
          <button
            type="button"
            onClick={() => setPreset(30)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700"
            title="Reset"
          >
            <X className="h-3 w-3" />
          </button>
          {/* Hidden date inputs */}
          <input
            ref={dateFromRef}
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="hidden"
          />
          <input
            ref={dateToRef}
            type="date"
            value={to}
            min={from}
            max={todayLocal()}
            onChange={(e) => setTo(e.target.value)}
            className="hidden"
          />
        </div>

        {/* Baris 3: Period info compact */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span>{fmtFullDate(from)} – {fmtFullDate(to)}</span>
          <span>·</span>
          <span>{insight.days} hari</span>
          <span>·</span>
          <span>Update {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} />}

      <Tabs defaultValue="ringkasan">
        <TabsList>
          <TabsTrigger value="ringkasan" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Ringkasan</TabsTrigger>
          <TabsTrigger value="driver_linehaul" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Driver Dorong (Gateway)</TabsTrigger>
          <TabsTrigger value="driver_pickup" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Driver Pickup</TabsTrigger>
          <TabsTrigger value="seller" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Seller</TabsTrigger>
          <TabsTrigger value="implant" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">Implant</TabsTrigger>
        </TabsList>

        {/* ===== RINGKASAN ===== */}
        <TabsContent value="ringkasan" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Total Ritase" value={kpi.ritase} icon={Truck} loading={loading} info="Jumlah ritase pada periode (tanggal jadwal)." sub={insight.days > 0 ? `${insight.rataHari.toFixed(1)}/hari` : undefined} />
            <KpiCard label="Selesai" value={kpi.selesai} icon={CheckCircle2} loading={loading} info="Ritase berstatus selesai." sub={`${insight.pctSelesai}% dari total`} progress={insight.pctSelesai} infoAlign="right" />
            <KpiCard label="Total AWB" value={kpi.awb} icon={Boxes} loading={loading} sub={kpi.ritase > 0 ? `${Math.round(kpi.awb / kpi.ritase)} AWB/ritase` : undefined} />
            <KpiCard label="Total Koli" value={kpi.koli} icon={Package} loading={loading} sub={kpi.awb > 0 ? `${(kpi.koli / kpi.awb).toFixed(2)} koli/AWB` : undefined} />
            <KpiCard label="High Value" value={kpi.hv} icon={Sparkles} loading={loading} sub={kpi.koli > 0 ? `${((kpi.hv / kpi.koli) * 100).toFixed(1)}% dari koli` : undefined} />
            <KpiCard label="Eceran" value={kpi.ecer} icon={Gift} loading={loading} sub={kpi.koli > 0 ? `${((kpi.ecer / kpi.koli) * 100).toFixed(1)}% dari koli` : undefined} />
            <KpiCard label="Outgoing" value={kpi.out} icon={TrendingUp} loading={loading} info="Ritase ke Gateway JKT (barang keluar)." sub={`${insight.outPct}% arah`} />
            <KpiCard label="Incoming" value={kpi.inc} icon={TrendingDown} loading={loading} info="Ritase ke Gateway SEG (barang masuk)." sub={`${100 - insight.outPct}% arah`} infoAlign="right" />
            <KpiCard label="Rata² Loading (Total)" value={fmtDurStr(analisis.data?.durasi?.rata_rata_loading)} icon={PackageCheck} loading={analisis.isLoading} info="Rata-rata durasi bongkar muat dari seluruh data ritase." isText />
            <KpiCard label="Rata² Perjalanan (Total)" value={fmtDurStr(analisis.data?.durasi?.rata_rata_perjalanan)} icon={RouteIcon} loading={analisis.isLoading} info="Rata-rata durasi perjalanan dari seluruh data ritase." isText infoAlign="right" />
          </div>

          {/* Strip insight — ringkasan operasional periode */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0c1e3a]/5 text-[#0c1e3a]">
                <Percent className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Persen Selesai</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">{insight.pctSelesai}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0c1e3a]/5 text-[#0c1e3a]">
                <RouteIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rata² Ritase/Hari</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">{insight.rataHari.toFixed(1)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hari Berdata</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">{insight.days}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <ArrowUpFromLine className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Arah Dominan</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {insight.outPct >= 50 ? "Outgoing" : "Incoming"}
                </p>
              </div>
            </div>
          </div>

          {/* Perbandingan First-Mile (Pickup Toko) vs Middle-Mile (Gateway Linehaul) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Total Koli Dijemput (First-Mile Pickup)</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatNumber(totalPickupKoli)} <span className="text-xs font-normal text-slate-500">koli ({pickupDriverData.length} driver)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Total Koli Didorong (Driver Gateway)</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatNumber(kpi.koli)} <span className="text-xs font-normal text-slate-500">koli ({kpi.ritase} ritase)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Rasio Distribusi Pickup ke Gateway</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {totalPickupKoli > 0 ? `${Math.round((kpi.koli / totalPickupKoli) * 100)}%` : "100%"}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">terdistribusi</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-lg border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4 text-[#0c1e3a]" /> Ritase per Hari
                  <InfoTip text="Navy = total, Slate = selesai" align="right" />
                </CardTitle>
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

            <Card className="rounded-lg border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowUpFromLine className="h-4 w-4 text-[#0c1e3a]" /> Arah Operasional
                  <InfoTip text="Out = JKT, In = SEG" align="right" />
                </CardTitle>
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

          {/* Bottleneck & Alert — klik item untuk detail + rekomendasi */}
          <div className="grid gap-4 lg:grid-cols-2">
            <BottleneckCard bottlenecks={bottlenecks} />
            <AlertCard alerts={alerts} />
          </div>
        </TabsContent>

        {/* ===== DRIVER DORONG (GATEWAY) ===== */}
        <TabsContent value="driver_linehaul" className="space-y-4">
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Ritase per Driver Dorong Gateway (Top 10)
              </CardTitle>
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

          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4 text-[#0c1e3a]" /> Detail Performa Driver Dorong
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Akumulasi ritase dan muatan koli driver dorong Gateway pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-normal text-slate-400">
                  {driverData.length} driver
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    title="Unduh data performa driver ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                }
                emptyText="Belum ada data driver pada periode ini"
                columns={[
                  { header: "Driver", render: (d) => <span className="font-medium text-slate-800">{d.nama_driver}</span> },
                  { header: "Ritase", render: (d) => <span className="tabular-nums font-semibold">{formatNumber(d.ritase_total)}</span> },
                  { header: "Selesai", render: (d) => <span className="tabular-nums text-[#0c1e3a]">{formatNumber(d.ritase_selesai)}</span> },
                  { header: "AWB", render: (d) => <span className="tabular-nums">{formatNumber(d.total_awb)}</span> },
                   { header: "Koli", render: (d) => <span className="tabular-nums">{formatNumber(d.total_koli)}</span> },
                   { header: "HV", render: (d) => <span className="tabular-nums text-amber-500">{formatNumber(d.total_high_value)}</span> },
                   { header: "Ecer", render: (d) => <span className="tabular-nums text-violet-500">{formatNumber(d.total_eceran)}</span> },
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
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-[#0c1e3a]" /> Detail Performa Driver Pickup
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Akumulasi penjemputan paket dari seller/implan toko ke gudang transit pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-normal text-slate-400">
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    title="Unduh data performa driver pickup ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                }
                emptyText="Belum ada data driver pickup pada periode ini"
                columns={[
                  { header: "Driver Pickup", render: (d) => <span className="font-medium text-slate-800">{d.nama_driver}</span> },
                  { header: "Total Sesi", render: (d) => <span className="tabular-nums font-semibold">{formatNumber(d.total_sesi)}</span> },
                  { header: "Selesai", render: (d) => <span className="tabular-nums text-[#0c1e3a]">{formatNumber(d.sesi_selesai)}</span> },
                  { header: "Toko Dikunjungi", render: (d) => <span className="tabular-nums">{formatNumber(d.total_seller)}</span> },
                  { header: "Total Koli", render: (d) => <span className="tabular-nums font-bold text-slate-900">{formatNumber(d.total_koli)}</span> },
                  { header: "Total AWB", render: (d) => <span className="tabular-nums">{formatNumber(d.total_awb)}</span> },
                  { header: "HV", render: (d) => <span className="tabular-nums text-amber-500">{formatNumber(d.total_hv)}</span> },
                  { header: "Ecer", render: (d) => <span className="tabular-nums text-violet-500">{formatNumber(d.total_ecer)}</span> },
                  { header: "Rata² Koli/Sesi", render: (d) => <span className="tabular-nums font-medium text-slate-700">{d.rata_koli} koli</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SELLER ===== */}
        <TabsContent value="seller" className="space-y-4">
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Kunjungan per Seller (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
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

          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4 text-[#0c1e3a]" /> Detail Kunjungan Seller
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Statistik volume koli dan frekuensi kunjungan seller dorong Gateway pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-normal text-slate-400">
                  {sellerData.length} seller
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable<SellerAnalytics>
                loading={loading}
                rows={sellerData}
                rowKey={(s) => String(s.id_seller)}
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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
                      <span className="block max-w-[220px] truncate font-medium text-slate-800" title={s.nama_seller}>
                        {s.nama_seller || "-"}
                      </span>
                    ),
                  },
                  { header: "Kota", render: (s) => <span className="text-slate-500">{s.kota || "-"}</span> },
                  { header: "Kunjungan", render: (s) => <span className="tabular-nums font-semibold">{formatNumber(s.kunjungan)}</span> },
                  { header: "Selesai", render: (s) => <span className="tabular-nums text-[#0c1e3a]">{formatNumber(s.ritase_selesai)}</span> },
                  { header: "AWB", render: (s) => <span className="tabular-nums">{formatNumber(s.total_awb)}</span> },
                   { header: "Koli", render: (s) => <span className="tabular-nums">{formatNumber(s.total_koli)}</span> },
                   { header: "HV", render: (s) => <span className="tabular-nums text-amber-500">{formatNumber(s.total_high_value)}</span> },
                   { header: "Ecer", render: (s) => <span className="tabular-nums text-violet-500">{formatNumber(s.total_eceran)}</span> },
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
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Kunjungan per Implant (Top 10)
              </CardTitle>
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

          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Truck className="h-4 w-4 text-[#0c1e3a]" /> Detail Kunjungan Implant
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Statistik volume koli dan frekuensi kunjungan implant dorong Gateway pada periode terpilih.
                  </CardDescription>
                </div>
                <span className="text-xs font-normal text-slate-400">
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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
                      <span className="block max-w-[220px] truncate font-medium text-slate-800" title={s.nama_implant}>
                        {s.nama_implant || "-"}
                      </span>
                    ),
                  },
                  { header: "Kota", render: (s) => <span className="text-slate-500">{s.kota || "-"}</span> },
                  { header: "Kunjungan", render: (s) => <span className="tabular-nums font-semibold">{formatNumber(s.kunjungan)}</span> },
                  { header: "Selesai", render: (s) => <span className="tabular-nums text-[#0c1e3a]">{formatNumber(s.ritase_selesai)}</span> },
                  { header: "AWB", render: (s) => <span className="tabular-nums">{formatNumber(s.total_awb)}</span> },
                   { header: "Koli", render: (s) => <span className="tabular-nums">{formatNumber(s.total_koli)}</span> },
                   { header: "HV", render: (s) => <span className="tabular-nums text-amber-500">{formatNumber(s.total_high_value)}</span> },
                   { header: "Ecer", render: (s) => <span className="tabular-nums text-violet-500">{formatNumber(s.total_eceran)}</span> },
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
      </Tabs>
    </div>
  );
}

/* ---------- DatePill ---------- */
function DatePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors",
        active
          ? "bg-slate-900 text-white shadow-xs"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
      )}
    >
      {label}
    </button>
  );
}
