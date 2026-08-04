"use client";

import {
  AlertTriangle,
  BellRing,
  Crosshair,
  Filter,
  MoreVertical,
  PackageCheck,
  PackageSearch,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDashboardAnalisis,
  useDashboardSummary,
} from "@/hooks/use-dashboard";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  AlertAnomali,
  DashboardAnalisis,
  DashboardSummary,
} from "@/types/dashboard";

/* ------------------------------------------------------------------ */
/* KPI Card                                                            */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Peta Indonesia — placeholder dengan legend                          */
/* ------------------------------------------------------------------ */

const HUBS = [
  { x: 62, y: 42, label: "JKT" },
  { x: 74, y: 52, label: "SBY" },
  { x: 56, y: 30, label: "MDN" },
  { x: 76, y: 64, label: "MKS" },
  { x: 66, y: 48, label: "BDG" },
];

function IndonesiaMap() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-semibold text-slate-800">
          Indonesia Transit Hubs
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Crosshair className="h-4 w-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Filter className="h-4 w-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#eef3f8]">
          <svg
            viewBox="0 0 100 60"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            {/* Pulau Sumatera */}
            <path
              d="M30 25 L38 18 L48 14 L55 16 L58 22 L52 30 L44 34 L36 36 L30 32 Z"
              fill="#d6e4f0"
              stroke="#b0c4de"
              strokeWidth="0.3"
            />
            {/* Pulau Jawa */}
            <path
              d="M56 40 L62 38 L72 36 L80 37 L84 40 L78 44 L68 46 L58 44 Z"
              fill="#d6e4f0"
              stroke="#b0c4de"
              strokeWidth="0.3"
            />
            {/* Kalimantan */}
            <path
              d="M55 28 L65 22 L78 24 L82 32 L76 40 L64 42 L54 38 Z"
              fill="#d6e4f0"
              stroke="#b0c4de"
              strokeWidth="0.3"
            />
            {/* Sulawesi */}
            <path
              d="M80 26 L84 20 L88 22 L90 30 L86 36 L82 34 L80 28 Z"
              fill="#d6e4f0"
              stroke="#b0c4de"
              strokeWidth="0.3"
            />
            {/* Papua */}
            <path
              d="M92 20 L98 18 L100 24 L97 30 L92 28 Z"
              fill="#d6e4f0"
              stroke="#b0c4de"
              strokeWidth="0.3"
            />
            {/* Garis transit */}
            <path
              d="M62 42 L74 52 M62 42 L66 48 M66 48 L74 52 M56 30 L62 42 M74 52 L76 64"
              stroke="#f59e0b"
              strokeWidth="0.4"
              strokeDasharray="2 1.5"
              fill="none"
              opacity="0.7"
            />
            {HUBS.map((h) => (
              <g key={h.label}>
                <circle cx={h.x} cy={h.y} r="2" fill="#1e40af" opacity="0.2" />
                <circle cx={h.x} cy={h.y} r="1" fill="#1e40af" />
              </g>
            ))}
          </svg>
          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-lg border bg-white/90 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-[10px] font-medium text-slate-600">
                Active Nodes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-medium text-slate-600">
                Transit Routes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-[10px] font-medium text-slate-600">
                Delays
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Analisis: durasi proses                                             */
/* ------------------------------------------------------------------ */

function DurasiRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-sm font-bold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertAnomali }) {
  const tone =
    alert.tingkat === "critical"
      ? "bg-rose-50 text-rose-700"
      : alert.tingkat === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-sky-50 text-sky-700";
  return (
    <div className="flex items-start gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
      <AlertTriangle
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          alert.tingkat === "critical"
            ? "text-rose-500"
            : alert.tingkat === "warning"
              ? "text-amber-500"
              : "text-sky-500"
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{alert.pesan}</p>
        <p
          className={cn(
            "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            tone
          )}
        >
          {alert.tingkat} · {alert.kategori}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[220px]" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();
  const analisis = useDashboardAnalisis();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Gagal memuat data dashboard.{" "}
          <PackageSearch className="mx-auto mt-2 h-8 w-8" />
        </CardContent>
      </Card>
    );
  }

  return <DashboardView data={data} analisis={analisis.data} />;
}

function DashboardView({
  data,
  analisis,
}: {
  data: DashboardSummary;
  analisis?: DashboardAnalisis | null;
}) {
  const durasi = analisis?.durasi;
  const bottleneck = analisis?.bottleneck ?? [];
  const alerts = analisis?.alerts ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Keseluruhan
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ringkasan operasional real-time — armada, driver & ritase.
          </p>
        </div>
        <Button className="bg-[#034075] text-white hover:bg-[#023060]">
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total AWB Hari Ini"
          value={formatNumber(data.total_awb_hari_ini)}
        />
        <KpiCard
          label="Armada Aktif"
          value={`${formatNumber(data.armada_aktif)}/${formatNumber(data.total_kendaraan)}`}
        />
        <KpiCard
          label="Driver Bertugas"
          value={`${formatNumber(data.driver_aktif)}/${formatNumber(data.total_driver)}`}
        />
        <KpiCard
          label="Ritase Aktif"
          value={`${formatNumber(data.ritase_aktif)}/${formatNumber(data.total_ritase)}`}
        />
        <KpiCard
          label="Total Seller"
          value={formatNumber(data.total_seller)}
        />
      </div>

      {/* KPI baris 2 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Ritase Selesai"
          value={formatNumber(data.ritase_selesai)}
        />
        <KpiCard
          label="Total Koli"
          value={formatNumber(data.total_koli)}
        />
        <KpiCard
          label="Paket Tertinggal"
          value={formatNumber(data.paket_tertinggal)}
        />
        <KpiCard
          label="Drop Point"
          value={formatNumber(data.total_drop_point)}
        />
        <KpiCard
          label="Armada Idle"
          value={formatNumber(data.armada_idle)}
        />
      </div>

      {/* 2-column layout */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* LEFT column: Map + status umum */}
        <div className="space-y-5 lg:col-span-3">
          <IndonesiaMap />

          {/* Ringkasan status armada */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-800">
                Ringkasan Operasional
              </p>
              <Truck className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[11px] font-semibold uppercase text-slate-500">
                      Metrik
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase text-slate-500">
                      Nilai
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: "Kendaraan Total", value: data.total_kendaraan },
                    { label: "Armada Aktif", value: data.armada_aktif },
                    { label: "Armada Selesai", value: data.armada_selesai },
                    { label: "Armada Idle", value: data.armada_idle },
                    { label: "Driver Bertugas", value: data.driver_aktif },
                    { label: "Driver Libur", value: data.driver_libur },
                    { label: "Driver Terlambat", value: data.driver_telat },
                    { label: "Ritase Hari Ini", value: data.ritase_hari_ini },
                    { label: "Seller Terlayani", value: data.seller_terlayani },
                    { label: "Karyawan", value: data.total_karyawan },
                    { label: "Total AWB (semua)", value: data.total_awb },
                  ].map((row) => (
                    <TableRow
                      key={row.label}
                      className="border-b border-slate-100"
                    >
                      <TableCell className="py-2.5 text-sm text-slate-700">
                        {row.label}
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-sm font-bold tabular-nums text-slate-800">
                        {formatNumber(row.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT column: Analisis */}
        <div className="space-y-5 lg:col-span-2">
          {/* Durasi proses */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <p className="text-sm font-semibold text-slate-800">
                Durasi Proses (rata-rata)
              </p>
            </CardHeader>
            <CardContent>
              <DurasiRow
                label="Loading"
                value={durasi?.rata_rata_loading ?? "belum ada data"}
              />
              <DurasiRow
                label="Perjalanan"
                value={durasi?.rata_rata_perjalanan ?? "belum ada data"}
              />
              <DurasiRow
                label="Unloading"
                value={durasi?.rata_rata_unloading ?? "belum ada data"}
              />
              <p className="mt-2 text-[11px] text-slate-400">
                {durasi?.total_ritase_dihitung ?? 0} ritase dihitung
              </p>
            </CardContent>
          </Card>

          {/* Bottleneck */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <p className="text-sm font-semibold text-slate-800">
                Potensi Hambatan (Bottleneck)
              </p>
            </CardHeader>
            <CardContent>
              {bottleneck.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-400">
                  Belum ada bottleneck terdeteksi
                </p>
              ) : (
                bottleneck.map((b) => (
                  <div
                    key={`${b.kategori}-${b.label}`}
                    className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {b.label}
                      </p>
                      <p className="text-xs capitalize text-slate-500">
                        {b.indikator} · {b.kategori}
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-800">
                      {formatNumber(b.nilai)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Alert anomali */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-800">
                Alert Anomali
              </p>
              <BellRing className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-400">
                  Tidak ada anomali 🎉
                </p>
              ) : (
                alerts.map((a, i) => <AlertRow key={i} alert={a} />)
              )}
            </CardContent>
          </Card>

          {/* Placeholder chart */}
          <Card className="shadow-sm">
            <CardContent className="flex h-[140px] items-center justify-center">
              <PackageCheck className="mr-2 h-4 w-4 text-slate-400" />
              <p className="text-sm text-slate-400">Chart placeholder</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
