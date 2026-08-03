"use client";

import {
  Filter,
  MoreVertical,
  Crosshair,
  PackageCheck,
  PackageSearch,
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
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { deliveryStatusTone, DELIVERY_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types/dashboard";

/* ------------------------------------------------------------------ */
/* KPI Card — simple, no icon                                          */
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
          {/* Legend */}
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
/* Efektivitas Table                                                   */
/* ------------------------------------------------------------------ */

function EfektivitasTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: { lokasi: string; val1: number; val2: number; ratio: string }[];
  columns: [string, string];
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {title}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200">
              <TableHead className="text-[11px] font-semibold uppercase text-slate-500">
                Lokasi
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-slate-500">
                {columns[0]}
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-slate-500">
                {columns[1]}
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase text-slate-500">
                Efektivitas
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow
                key={r.lokasi}
                className={cn(
                  "border-b border-slate-100",
                  i === 0 && "text-red-600"
                )}
              >
                <TableCell
                  className={cn(
                    "py-2.5 text-sm font-medium",
                    i === 0 ? "text-red-600" : "text-slate-700"
                  )}
                >
                  {r.lokasi}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2.5 text-right text-sm tabular-nums",
                    i === 0 ? "text-red-600" : "text-slate-700"
                  )}
                >
                  {r.val1.toLocaleString("id-ID")}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2.5 text-right text-sm tabular-nums",
                    i === 0 ? "text-red-600" : "text-slate-700"
                  )}
                >
                  {r.val2.toLocaleString("id-ID")}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2.5 text-right text-sm tabular-nums",
                    i === 0 ? "text-red-600" : "text-slate-700"
                  )}
                >
                  {r.ratio}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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

  return <DashboardView data={data} />;
}

function DashboardView({ data }: { data: DashboardSummary }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Keseluruhan
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Real-time metrics for current operational cycle.
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
          value={data.total_awb.toLocaleString("id-ID")}
        />
        <KpiCard
          label="Total Seller Aktif"
          value={data.total_seller.toLocaleString("id-ID")}
        />
        <KpiCard
          label="Armada Aktif"
          value={`${data.armada_aktif}/${data.armada_total}`}
        />
        <KpiCard
          label="Implant Aktif"
          value={`${data.implant_aktif} / ${data.implant_total}`}
        />
        <KpiCard
          label="Total Manpower"
          value={data.total_manpower.toLocaleString("id-ID")}
        />
      </div>

      {/* 2-column layout */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* LEFT column: Map + Status */}
        <div className="space-y-5 lg:col-span-3">
          {/* Map */}
          <IndonesiaMap />

          {/* Status Pengiriman */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-semibold text-slate-800">
                Status Pengiriman
              </p>
              <button className="text-xs font-semibold text-blue-600 hover:underline">
                View Full Log
              </button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[11px] font-semibold uppercase text-slate-500">
                      ID Kendaraan
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-slate-500">
                      Driver
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-slate-500">
                      Asal Gudang
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-slate-500">
                      Tujuan
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase text-slate-500">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.status_pengiriman.map((s) => (
                    <TableRow
                      key={s.id_kendaraan}
                      className="border-b border-slate-100"
                    >
                      <TableCell className="py-2.5 font-mono text-sm font-semibold text-slate-800">
                        {s.id_kendaraan}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-slate-700">
                        {s.driver}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-slate-700">
                        {s.asal_gudang}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-slate-700">
                        {s.tujuan}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            deliveryStatusTone(s.status)
                          )}
                        >
                          {DELIVERY_STATUS_LABEL[s.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT column: Efektivitas + Top Gudang */}
        <div className="space-y-5 lg:col-span-2">
          {/* Efektivitas Manpower */}
          <EfektivitasTable
            title="Efektivitas Manpower"
            columns={["Total AWB", "Manpower"]}
            rows={data.manpower_efektivitas.map((m) => ({
              lokasi: m.lokasi,
              val1: m.total_awb,
              val2: m.manpower,
              ratio: m.efektivitas,
            }))}
          />

          {/* Efektivitas Pop Karung */}
          <EfektivitasTable
            title="Efektivitas Pop Karung"
            columns={["Total AWB", "Total Koli"]}
            rows={data.pop_karung_efektivitas.map((p) => ({
              lokasi: p.lokasi,
              val1: p.total_awb,
              val2: p.total_koli,
              ratio: p.efektivitas,
            }))}
          />

          {/* Chart placeholder */}
          <Card className="shadow-sm">
            <CardContent className="flex h-[180px] items-center justify-center">
              <p className="text-sm text-slate-400">Chart placeholder</p>
            </CardContent>
          </Card>

          {/* Top 5 Gudang */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <p className="text-sm font-semibold text-slate-800">
                Top 5 Gudang Terproduktif
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.top_gudang.map((g, i) => (
                <div
                  key={g.nama}
                  className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0
                        ? "bg-red-500 text-white"
                        : "bg-slate-800 text-white"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {g.nama}
                    </p>
                    <p className="text-xs text-slate-500">{g.area}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-800">
                    {g.total.toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
