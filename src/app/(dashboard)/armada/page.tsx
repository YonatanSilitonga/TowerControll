"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { InfoTip } from "@/components/ui/info-tip";
import { useDriver, useKendaraan, useRitase } from "@/hooks/use-armada";
import { useSeller } from "@/hooks/use-seller";
import { useTrackingMap } from "@/hooks/use-tracking";
import { formatNumber } from "@/lib/utils";
import {
  Truck,
  Users,
  Store,
  Route,
  ArrowUp,
  MoreHorizontal,
  Menu,
  SlidersHorizontal,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ArmadaOverviewPage() {
  const { data: kendaraan, isLoading: lK } = useKendaraan();
  const { data: driver, isLoading: lD } = useDriver();
  const { data: ritase, isLoading: lR } = useRitase();
  const { data: seller, isLoading: lS } = useSeller();
  const { data: mapData } = useTrackingMap();

  // State toggle filter online driver
  const [showOnlyOnlineDriver, setShowOnlyOnlineDriver] = useState(false);

  // Perhitungan Kendaraan
  const onlineIds = new Set(
    (mapData?.vehicles ?? []).filter((v) => !v.offline).map((v) => v.id_kendaraan)
  );
  const onlineCount = (kendaraan ?? []).filter((k) =>
    onlineIds.has(k.id_kendaraan)
  ).length;
  const totalKapasitas = (kendaraan ?? []).reduce(
    (acc, k) => acc + (k.kapasitas_kg ?? 0),
    0
  );
  const totalKendaraan = kendaraan?.length ?? 0;
  const aktifKendaraan = (kendaraan ?? []).filter(
    (k) => (k.status_kendaraan ?? "").toLowerCase() === "aktif" || (k.status_kendaraan ?? "").toLowerCase() === "available" || !k.status_kendaraan
  ).length;

  // Data Pie Chart Kendaraan
  const kendaraanOuterData = [
    { name: "Aktif", value: aktifKendaraan || 1, color: "#10b981" },
    { name: "Lainnya", value: Math.max(0, totalKendaraan - aktifKendaraan), color: "#f1f5f9" },
  ];
  const kendaraanInnerData = [
    { name: "Kapasitas Terpakai", value: 100, color: "#f59e0b" },
  ];

  // Perhitungan Driver
  const totalDriver = driver?.length ?? 0;
  const driverOnlineCount = (driver ?? []).filter((d) => d.tracking_fresh).length;
  const nonaktifDriver = (driver ?? []).filter(
    (d) =>
      (d.status_driver ?? "").toLowerCase() === "nonaktif" ||
      (d.status_driver ?? "").toLowerCase() === "off" ||
      (d.status_driver ?? "").toLowerCase() === "libur"
  ).length;
  const aktifDriver = Math.max(0, totalDriver - nonaktifDriver);

  // Jika toggle Online aktif, tampilkan breakdown driver online vs offline
  const displayedAktif = showOnlyOnlineDriver ? driverOnlineCount : aktifDriver;
  const displayedNonaktif = showOnlyOnlineDriver ? Math.max(0, totalDriver - driverOnlineCount) : nonaktifDriver;
  const currentTotal = showOnlyOnlineDriver ? driverOnlineCount : totalDriver;

  const pctAktifDriver = totalDriver > 0 ? Math.round((displayedAktif / totalDriver) * 100) : 0;
  const pctNonaktifDriver = totalDriver > 0 ? Math.round((displayedNonaktif / totalDriver) * 100) : 0;

  // Data Pie Chart Driver
  const driverPieData = showOnlyOnlineDriver
    ? [
        { name: "Online", value: driverOnlineCount || 0.001, color: "#10b981" },
        { name: "Offline", value: Math.max(0, totalDriver - driverOnlineCount) || 0.001, color: "#e2e8f0" },
      ]
    : [
        { name: "Aktif", value: aktifDriver || 1, color: "#10b981" },
        { name: "Nonaktif", value: nonaktifDriver || 0.001, color: "#f97316" },
        { name: "Lainnya", value: Math.max(0, Math.floor(totalDriver * 0.15)), color: "#0f766e" },
      ];

  // Perhitungan Jadwal & Status
  const totalRitase = ritase?.length ?? 0;
  const statusCounts: Record<string, number> = {
    direncanakan: 0,
    selesai: 0,
    berjalan: 0,
    loading: 0,
  };

  (ritase ?? []).forEach((r) => {
    const s = (r.status ?? "").toLowerCase();
    if (s.includes("rencana") || s === "planned") statusCounts.direncanakan++;
    else if (s.includes("selesai") || s === "completed") statusCounts.selesai++;
    else if (s.includes("jalan") || s === "in_progress" || s === "in_transit") statusCounts.berjalan++;
    else if (s.includes("load") || s.includes("muat")) statusCounts.loading++;
    else statusCounts.direncanakan++;
  });

  const jadwalItems = [
    {
      key: "direncanakan",
      label: "Direncanakan",
      count: statusCounts.direncanakan,
      color: "bg-[#0c1e3a]",
      dotColor: "#0c1e3a",
    },
    {
      key: "selesai",
      label: "Selesai",
      count: statusCounts.selesai,
      color: "bg-slate-400",
      dotColor: "#94a3b8",
    },
    {
      key: "berjalan",
      label: "Berjalan",
      count: statusCounts.berjalan,
      color: "bg-emerald-500",
      dotColor: "#10b981",
    },
    {
      key: "loading",
      label: "Mulai Loading",
      count: statusCounts.loading,
      color: "bg-amber-500",
      dotColor: "#f59e0b",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Armada"
        description="Kelola kendaraan, driver, seller, dan jadwal/riwayat ritase"
        crumbs={[{ label: "Armada" }]}
      />

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Kendaraan */}
        <Link href="/armada/vehicles" className="group block">
          <Card className="h-full border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Kendaraan</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Truck className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {lK ? "..." : totalKendaraan}
                </p>
                <p className="mt-1 flex items-center text-[11px] text-slate-500 group-hover:text-emerald-600">
                  <span>Plat, jenis & status armada</span>
                  <ChevronRight className="ml-0.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
              {/* Mini Sparkline Bar Vertikal Hijau */}
              <div className="flex items-end gap-1 pb-1">
                <div className="h-2 w-1.5 rounded-sm bg-emerald-500" />
                <div className="h-4 w-1.5 rounded-sm bg-emerald-500" />
                <div className="h-6 w-1.5 rounded-sm bg-emerald-500" />
                <div className="h-3 w-1.5 rounded-sm bg-emerald-500" />
                <div className="h-5 w-1.5 rounded-sm bg-emerald-500" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Card 2: Driver */}
        <Link href="/armada/drivers" className="group block">
          <Card className="h-full border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Driver</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <MoreHorizontal className="h-3 w-3" />
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Users className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {lD ? "..." : totalDriver}
                </p>
                <p className="mt-1 flex items-center text-[11px] text-slate-500 group-hover:text-slate-800">
                  <span>Driver tetap & kondisional</span>
                  <ChevronRight className="ml-0.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
              {/* Mini Sparkline Bar Vertikal Abu-abu */}
              <div className="flex items-end gap-1 pb-1">
                <div className="h-2 w-1.5 rounded-sm bg-slate-400" />
                <div className="h-3 w-1.5 rounded-sm bg-slate-400" />
                <div className="h-5 w-1.5 rounded-sm bg-slate-400" />
                <div className="h-4 w-1.5 rounded-sm bg-slate-400" />
                <div className="h-4 w-1.5 rounded-sm bg-slate-400" />
              </div>
            </div>
          </Card>
        </Link>

        {/* Card 3: Seller */}
        <Link href="/armada/sellers" className="group block">
          <Card className="h-full border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-amber-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Seller</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Menu className="h-3 w-3" />
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Store className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {lS ? "..." : seller?.length ?? 0}
                </p>
                <p className="mt-1 flex items-center text-[11px] text-slate-500 group-hover:text-amber-700">
                  <span>Titik pickup & kontak</span>
                  <ChevronRight className="ml-0.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
              {/* Mini Wave Area Sparkline */}
              <svg className="h-6 w-12 text-emerald-500" viewBox="0 0 48 24" fill="none">
                <path
                  d="M0 18 C10 18, 14 6, 24 10 C34 14, 38 4, 48 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0 18 C10 18, 14 6, 24 10 C34 14, 38 4, 48 8 L48 24 L0 24 Z"
                  fill="currentColor"
                  fillOpacity="0.12"
                />
              </svg>
            </div>
          </Card>
        </Link>

        {/* Card 4: Jadwal & Riwayat */}
        <Link href="/armada/trips" className="group block">
          <Card className="h-full border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Jadwal & Riwayat</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <SlidersHorizontal className="h-3 w-3" />
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Route className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {lR ? "..." : totalRitase}
                </p>
                <p className="mt-1 flex items-center text-[11px] text-slate-500 group-hover:text-slate-900">
                  <span>Daftar RIT & rute pejalanan</span>
                  <ChevronRight className="ml-0.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
              {/* Mini Sparkline Line Chart */}
              <svg className="h-6 w-12 text-slate-700" viewBox="0 0 48 24" fill="none">
                <path
                  d="M0 20 L12 16 L22 18 L32 8 L40 12 L48 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Card>
        </Link>
      </div>

      {/* 3 Middle Cards: Status Kendaraan, Status Driver, Status Jadwal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Panel 1: Status Kendaraan */}
        <Card className="border border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              Status Kendaraan
              <InfoTip text="Status operasional armada di database dan live tracking" />
            </CardTitle>
            <span className="text-xs text-slate-400 font-medium">{totalKendaraan} total</span>
          </CardHeader>
          <CardContent className="pt-2">
            {lK ? (
              <Skeleton className="h-36 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                {/* Donut Chart with Centered Text */}
                <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kendaraanOuterData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={62}
                        strokeWidth={0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {kendaraanOuterData.map((entry, index) => (
                          <Cell key={`outer-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Pie
                        data={kendaraanInnerData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={47}
                        strokeWidth={0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {kendaraanInnerData.map((entry, index) => (
                          <Cell key={`inner-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total Center Badge */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400">Total</span>
                    <span className="text-xs font-bold text-slate-800">{totalKendaraan} (100%)</span>
                  </div>
                </div>

                {/* Info Samping Kanan */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-slate-400">Aktif</p>
                    <p className="text-base font-bold text-slate-900">{aktifKendaraan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Kapasitas total</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatNumber(totalKapasitas)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sedang online</p>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {onlineCount} armada
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Status Driver */}
        <Card className="border border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              Status Driver
              <InfoTip text="Status kepegawaian dan ketersediaan supir. Nyalakan toggle 'Online' untuk memfilter supir yang sedang aktif live tracking." />
            </CardTitle>
            <span className="text-xs text-slate-400 font-medium">{currentTotal} total</span>
          </CardHeader>
          <CardContent className="pt-2">
            {lD ? (
              <Skeleton className="h-36 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                {/* Donut Chart Driver */}
                <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={driverPieData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        strokeWidth={2}
                        stroke="#ffffff"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {driverPieData.map((entry, index) => (
                          <Cell key={`driver-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Total Center Badge */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400">{showOnlyOnlineDriver ? "Online" : "Total"}</span>
                    <span className="text-xs font-bold text-slate-800">{displayedAktif} ({pctAktifDriver}%)</span>
                  </div>
                </div>

                {/* Legend & Metrik Driver */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {showOnlyOnlineDriver ? "Online Live" : "Aktif"}
                    </span>
                    <span className="font-bold text-slate-800">
                      {displayedAktif} <span className="font-normal text-slate-400">({pctAktifDriver}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      {showOnlyOnlineDriver ? "Offline" : "Nonaktif"}
                    </span>
                    <span className="font-bold text-slate-800">
                      {displayedNonaktif} <span className="font-normal text-slate-400">({pctNonaktifDriver}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Total Terdaftar
                    </span>
                    <span className="font-bold text-slate-800">
                      {totalDriver}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Sedang Online</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      {driverOnlineCount} driver
                    </span>
                  </div>

                  {/* Online Toggle Switch Interaktif */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 font-medium" title="Filter chart hanya untuk driver yang online">
                      Filter Online
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showOnlyOnlineDriver}
                      title="Klik untuk memfilter grafik driver online / semua driver"
                      onClick={() => setShowOnlyOnlineDriver(!showOnlyOnlineDriver)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        showOnlyOnlineDriver ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          showOnlyOnlineDriver ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: Status Jadwal */}
        <Card className="border border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              Status Jadwal
              <InfoTip text="Distribusi progres RIT ritase saat ini" align="right" />
            </CardTitle>
            <span className="text-xs text-slate-400 font-medium">{totalRitase} total</span>
          </CardHeader>
          <CardContent className="pt-2">
            {lR ? (
              <Skeleton className="h-36 w-full" />
            ) : (
              <div className="space-y-2.5">
                {jadwalItems.map((item) => {
                  const pct = totalRitase > 0 ? Math.round((item.count / totalRitase) * 100) : 0;
                  return (
                    <div key={item.key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className="font-bold text-slate-800">
                          {item.count}{" "}
                          <span className="font-normal text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all duration-300`}
                          style={{ width: `${Math.max(pct, totalRitase > 0 && item.count > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Total</span>
                  <span className="font-bold text-slate-900">{totalRitase}</span>
                </div>

                {/* Legend Dots di bagian bawah */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0c1e3a]" />
                    Direncanakan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Selesai
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Berjalan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Mulai Loading
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Total
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Notification Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 pr-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs text-slate-600">
            Peta live & status armada ada di{" "}
            <Link href="/" className="font-semibold text-slate-800 underline-offset-2 hover:underline">
              Dashboard
            </Link>
            . Detail kendaraan, driver, dan jadwal/riwayat ada di menu Armada.
          </p>
        </div>
      </div>
    </div>
  );
}
