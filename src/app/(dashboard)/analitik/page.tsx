"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gem,
  Package,
  PackageCheck,
  Percent,
  Route as RouteIcon,
  Truck,
  Sparkles,
  Gift,
  TrendingUp,
  TrendingDown,
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
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTip } from "@/components/ui/info-tip";
import {
  useAnalyticsDrivers,
  useAnalyticsSellers,
  useAnalyticsTrend,
} from "@/hooks/use-analytics";
import { useDashboardAnalisis } from "@/hooks/use-dashboard";
import { AlertCard, BottleneckCard } from "@/components/dashboard/analisis-cards";
import { cn, formatNumber } from "@/lib/utils";
import type {
  DriverPerformance,
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
  { label: "7 hari", days: 7 },
  { label: "30 hari", days: 30 },
  { label: "90 hari", days: 90 },
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

  // Jam "diupdate" realtime — refresh tiap 30 detik biar label waktu selalu segar.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const trend = useAnalyticsTrend(from, to);
  const drivers = useAnalyticsDrivers(from, to);
  const sellers = useAnalyticsSellers(from, to);
  const analisis = useDashboardAnalisis();

  const trendData = trend.data ?? [];
  const driverData = drivers.data ?? [];
  const sellerData = sellers.data ?? [];
  const bottlenecks = analisis.data?.bottleneck ?? [];
  const alerts = analisis.data?.alerts ?? [];

  const loading = trend.isLoading || drivers.isLoading || sellers.isLoading;
  const errorMsg =
    trend.error?.message ?? drivers.error?.message ?? sellers.error?.message ?? null;

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

  const setPreset = (days: number) => {
    setFrom(daysAgo(days - 1));
    setTo(todayLocal());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analitik"
        description="Analisis data operasional berdasarkan tanggal jadwal ritase."
        crumbs={[{ label: "Analitik" }]}
      />

      {/* ── Filter Bar: Vertical stack ── */}
      <div className="flex w-full flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        {/* Period info */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <CalendarDays className="h-3.5 w-3.5 text-[#0c1e3a]" />
            <b className="tabular-nums">{fmtFullDate(from)}</b>
            <span className="text-slate-400">–</span>
            <b className="tabular-nums">{fmtFullDate(to)}</b>
          </span>
          <span className="text-slate-300">·</span>
          <span className="tabular-nums text-slate-400">{insight.days} hari berdata</span>
          <span className="text-slate-300">·</span>
          <span className="tabular-nums text-slate-400">
            Update{" "}
            {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
          </span>
        </div>

        {/* Preset buttons */}
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPreset(p.days)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors",
                to === todayLocal() && from === daysAgo(p.days - 1)
                  ? "bg-[#FEA103] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Dari</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <span className="text-slate-400">–</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Sampai</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayLocal()}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} />}

      <Tabs defaultValue="ringkasan">
        <TabsList>
          <TabsTrigger value="ringkasan" className="data-[state=active]:bg-[#FEA103] data-[state=active]:text-white">Ringkasan</TabsTrigger>
          <TabsTrigger value="driver" className="data-[state=active]:bg-[#FEA103] data-[state=active]:text-white">Driver</TabsTrigger>
          <TabsTrigger value="seller" className="data-[state=active]:bg-[#FEA103] data-[state=active]:text-white">Seller</TabsTrigger>
        </TabsList>

        {/* ===== RINGKASAN ===== */}
        <TabsContent value="ringkasan" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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

        {/* ===== DRIVER ===== */}
        <TabsContent value="driver" className="space-y-4">
          <Card className="rounded-lg border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Ritase per Driver (Top 10)
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
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Detail Performa Driver
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {driverData.length} driver
                </span>
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Detail Kunjungan Seller
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {sellerData.length} seller
                </span>
              </CardTitle>
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
      </Tabs>
    </div>
  );
}
