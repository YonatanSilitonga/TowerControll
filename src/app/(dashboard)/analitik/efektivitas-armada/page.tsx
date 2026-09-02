"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  TrendingUp,
  Package,
  Truck,
  Activity,
  Info,
  History,
  X,
  User,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Store,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRitase, useKendaraan } from "@/hooks/use-armada";
import { cn } from "@/lib/utils";
import type { Kendaraan, Ritase } from "@/types/armada";
import dynamic from "next/dynamic";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Grafik di-load secara dinamis agar unmount-nya tidak memblokir main thread
// saat user berpindah halaman
const ProductivityStackedChart = dynamic(
  () => import("@/components/charts/efektivitas-charts").then((m) => m.ProductivityStackedChart),
  { ssr: false, loading: () => <div className="w-full h-full animate-pulse bg-slate-100 rounded" /> }
);

/* ---------- HELPER FUNCTIONS ---------- */

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const PRESETS = [
  { label: "Hari Ini", days: 0 },
  { label: "7 Hari Terakhir", days: 7 },
  { label: "30 Hari Terakhir", days: 30 },
];

/* ---------- CAPACITY DICTIONARY ---------- */
// Acuan data batas maksimal kapasitas muatan.
const getVehicleCapacity = (jenis: string) => {
  const type = (jenis || "").toLowerCase();
  if (type.includes("blindvan") || type.includes("bv")) return { maxKoli: 10, maxEcer: 10 };
  if (type.includes("traga")) return { maxKoli: 25, maxEcer: 20 };
  if (type.includes("cdel") || type.includes("engkel")) return { maxKoli: 40, maxEcer: 35 };
  if (type.includes("cddl")) return { maxKoli: 60, maxEcer: 50 };
  if (type.includes("cdd")) return { maxKoli: 50, maxEcer: 45 };
  return { maxKoli: 50, maxEcer: 45 }; // Default fallback
};

/* ---------- REKOMENDASI SISTEM GENERATOR ---------- */
function getVehicleEvaluationDetails(v: VehicleMetrics) {
  const isUnder = v.statusKapasitas === "Under";
  const isOverload = v.statusKapasitas === "Overload";
  const type = (v.jenisKendaraan || "").toLowerCase();
  const roundedKoli = Math.round(v.avgKoli);

  let title = "";
  let diagnosis = "";
  let routeSuggestion = "";
  let vehicleSuggestion = "";

  if (isUnder) {
    title = "Kapasitas Kurang Maksimal (<50%)";
    const sisaKoli = Math.max(0, v.maxKoli - roundedKoli);
    diagnosis = `Rata-rata muatan hanya terisi ${roundedKoli} Koli dari batas ${v.maxKoli} Koli (${v.avgUtilKoliPercent.toFixed(0)}%). Sisa ruang kosong ${sisaKoli} Koli belum terisi di setiap ritase.`;
    
    routeSuggestion = `Tambahkan 1-2 titik pickup seller baru yang sejalur dengan rute ini, atau gabungkan muatan dengan jadwal ritase rute terdekat agar ruang kendaraan terisi optimal.`;
    
    if (type.includes("cddl") || type.includes("cdd")) {
      vehicleSuggestion = `Muatan terlalu sedikit untuk truk besar CDD. Disarankan ganti unit ke tipe Traga (maks 25 koli) atau Blindvan (maks 10 koli) untuk memangkas konsumsi BBM dan biaya operasional.`;
    } else if (type.includes("cdel") || type.includes("engkel") || type.includes("traga")) {
      vehicleSuggestion = `Disarankan mengganti unit armada ke tipe Blindvan (maks 10 koli) atau satukan muatan dengan unit lain.`;
    } else {
      vehicleSuggestion = `Pertimbangkan mengonsolidasikan jadwal pengiriman dengan unit lain yang searah.`;
    }
  } else if (isOverload) {
    title = "Kelebihan Muatan (>100%)";
    const lebihKoli = Math.max(0, roundedKoli - v.maxKoli);
    diagnosis = `Rata-rata muatan mencapai ${roundedKoli} Koli, melebihi batas kapasitas aman ${v.maxKoli} Koli (${v.avgUtilKoliPercent.toFixed(0)}%). Kelebihan muatan ${lebihKoli} Koli berisiko merusak unit & melanggar batas keselamatan.`;
    
    routeSuggestion = `Bagi rute pengiriman menjadi 2 ritase (pagi & siang), atau pisahkan jadwal pickup seller berkapasitas besar ke unit armada pendukung lainnya.`;

    if (type.includes("blindvan") || type.includes("bv")) {
      vehicleSuggestion = `Muatan tidak lagi muat di Blindvan. Direkomendasikan segera ganti/upgrade unit ke tipe Traga (maks 25 koli) atau CDEL (maks 40 koli).`;
    } else if (type.includes("traga")) {
      vehicleSuggestion = `Direkomendasikan upgrade armada ke Truk Engkel (CDEL - 40 koli) atau CDD (50 koli) agar seluruh muatan koli terangkut aman.`;
    } else if (type.includes("cdd")) {
      vehicleSuggestion = `Gunakan unit truk sasis ekstra panjang CDDL (maks 60 koli) atau buat jadwal ritase kedua untuk menampung sisa koli.`;
    } else {
      vehicleSuggestion = `Tingkatkan kapasitas tipe kendaraan atau tambahkan ritase armada tambahan.`;
    }
  }

  return { title, diagnosis, routeSuggestion, vehicleSuggestion };
}

/* ---------- TYPES ---------- */

interface VehicleMetrics {
  idKendaraan: number;
  platNomor: string;
  jenisKendaraan: string;
  ritaseCount: number;
  totalKoli: number;
  totalEceran: number;
  totalHV: number;
  maxKoli: number;
  maxEcer: number;
  avgKoli: number;
  avgEcer: number;
  avgUtilKoliPercent: number;
  avgUtilEcerPercent: number;
  statusKapasitas: "Under" | "Optimal" | "Overload" | "NoData";
  // trips TIDAK disimpan di sini — diambil lazily via selectedVehicleTrips
}

export default function EfektivitasArmadaPage() {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(todayLocal());
  const [endDate, setEndDate] = useState<string>(todayLocal());
  const [productivityView, setProductivityView] = useState<"tipe" | "driver">("tipe");
  const [selectedArmadaForHistory, setSelectedArmadaForHistory] = useState<VehicleMetrics | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);
  const [evaluationFilter, setEvaluationFilter] = useState<"all" | "under" | "overload">("all");

  const handlePreset = (days: number) => {
    setSelectedPreset(days);
    if (days === 0) {
      setStartDate(todayLocal());
      setEndDate(todayLocal());
    } else {
      setStartDate(daysAgo(days));
      setEndDate(todayLocal());
    }
  };

  // Fetch Data
  const { data: allRitase = [], isLoading: loadingRitase } = useRitase(startDate, endDate);
  const { data: allKendaraan = [], isLoading: loadingKendaraan } = useKendaraan();
  const isLoading = loadingRitase || loadingKendaraan;

  // 1. Backend already filtered Ritase by Date. 
  // (We slice it to max 5000 records to absolutely prevent React from freezing the browser 
  // just in case the backend hasn't been updated yet)
  const filteredRitase = allRitase.slice(0, 5000);

  // 2. Compute Metrics per Vehicle
  const vehicleMetricsMap = useMemo(() => {
    const map = new Map<number, VehicleMetrics>();

    allKendaraan.forEach((k) => {
      const capacity = getVehicleCapacity(k.jenis_kendaraan || "");
      map.set(k.id_kendaraan, {
        idKendaraan: k.id_kendaraan,
        platNomor: k.plat_nomor,
        jenisKendaraan: k.jenis_kendaraan || "Truk",
        ritaseCount: 0,
        totalKoli: 0,
        totalEceran: 0,
        totalHV: 0,
        maxKoli: capacity.maxKoli,
        maxEcer: capacity.maxEcer,
        avgKoli: 0,
        avgEcer: 0,
        avgUtilKoliPercent: 0,
        avgUtilEcerPercent: 0,
        statusKapasitas: "NoData",
      });
    });

    filteredRitase.forEach((r) => {
      if (!r.id_kendaraan) return;
      let vm = map.get(r.id_kendaraan);
      if (!vm) {
        const capacity = getVehicleCapacity("cdd");
        vm = {
          idKendaraan: r.id_kendaraan,
          platNomor: r.plat_nomor || "-",
          jenisKendaraan: "Truk",
          ritaseCount: 0,
          totalKoli: 0,
          totalEceran: 0,
          totalHV: 0,
          maxKoli: capacity.maxKoli,
          maxEcer: capacity.maxEcer,
          avgKoli: 0,
          avgEcer: 0,
          avgUtilKoliPercent: 0,
          avgUtilEcerPercent: 0,
          statusKapasitas: "NoData",
        };
        map.set(r.id_kendaraan, vm);
      }
      if (!vm) return;
      
      vm.ritaseCount += 1;
      vm.totalKoli += r.total_koli || 0;
      vm.totalEceran += r.total_eceran || 0;
      vm.totalHV += r.total_high_value || 0;
      // trips TIDAK disimpan di sini — diambil lazily saat modal dibuka
    });

    Array.from(map.values()).forEach((vm) => {
      if (vm.ritaseCount > 0) {
        vm.avgKoli = vm.totalKoli / vm.ritaseCount;
        vm.avgEcer = vm.totalEceran / vm.ritaseCount;
        vm.avgUtilKoliPercent = (vm.avgKoli / vm.maxKoli) * 100;
        vm.avgUtilEcerPercent = (vm.avgEcer / vm.maxEcer) * 100;

        const maxUtil = Math.max(vm.avgUtilKoliPercent, vm.avgUtilEcerPercent);
        if (maxUtil < 50) vm.statusKapasitas = "Under";
        else if (maxUtil > 100) vm.statusKapasitas = "Overload";
        else vm.statusKapasitas = "Optimal";
      }
    });

    return Array.from(map.values()).sort((a, b) => b.ritaseCount - a.ritaseCount);
  }, [filteredRitase, allKendaraan]);

  // Trips untuk kendaraan yang dipilih — hanya dihitung saat modal dibuka (lazy)
  const selectedVehicleTrips = useMemo(() => {
    if (!selectedArmadaForHistory) return [];
    return filteredRitase
      .filter((r) => r.id_kendaraan === selectedArmadaForHistory.idKendaraan)
      .sort((a, b) => (b.tanggal ?? "").localeCompare(a.tanggal ?? ""));
  }, [selectedArmadaForHistory, filteredRitase]);

  // 3. Aggregate KPIs for Row 1
  const kpis = useMemo(() => {
    let activeVehicles = 0;
    let underCapacityCount = 0;
    let overCapacityCount = 0;

    vehicleMetricsMap.forEach(vm => {
      if (vm.ritaseCount > 0) activeVehicles++;
      if (vm.statusKapasitas === "Under") underCapacityCount++;
      if (vm.statusKapasitas === "Overload") overCapacityCount++;
    });

    const fleetUtilization = allKendaraan.length > 0 ? (activeVehicles / allKendaraan.length) * 100 : 0;

    return {
      fleetUtilization: Math.round(fleetUtilization),
      underCapacity: underCapacityCount,
      overCapacity: overCapacityCount,
      activeCount: activeVehicles,
      totalRegistered: allKendaraan.length,
    };
  }, [vehicleMetricsMap, allKendaraan.length]);

  // Evaluated Vehicles list for Modal
  const evaluatedVehicles = useMemo(() => {
    return vehicleMetricsMap.filter(v => {
      if (v.ritaseCount === 0) return false;
      if (evaluationFilter === "under") return v.statusKapasitas === "Under";
      if (evaluationFilter === "overload") return v.statusKapasitas === "Overload";
      return v.statusKapasitas === "Under" || v.statusKapasitas === "Overload";
    });
  }, [vehicleMetricsMap, evaluationFilter]);

  // Prepare Chart Data
  const stackedChartDataDriver = useMemo(() => {
    return vehicleMetricsMap
      .filter(v => v.ritaseCount > 0)
      .slice(0, 8)
      .map(v => {
        const driverName = v.platNomor;
        return {
          name: driverName.split(' ')[0],
          'Koli Reguler': Math.max(0, (v.totalKoli || 0) - (v.totalHV || 0)),
          'High Value': v.totalHV || 0,
        };
      });
  }, [vehicleMetricsMap]);

  const stackedChartDataTipe = useMemo(() => {
    const agg = new Map<string, { reg: number, hv: number }>();
    vehicleMetricsMap.forEach(v => {
      if (v.ritaseCount === 0) return;
      const type = (v.jenisKendaraan || "Truk").toUpperCase();
      const current = agg.get(type) || { reg: 0, hv: 0 };
      current.reg += Math.max(0, (v.totalKoli || 0) - (v.totalHV || 0));
      current.hv += v.totalHV || 0;
      agg.set(type, current);
    });
    return Array.from(agg.entries()).map(([name, data]) => ({
      name,
      'Koli Reguler': data.reg,
      'High Value': data.hv,
    }));
  }, [vehicleMetricsMap]);

  const stackedChartData = productivityView === "tipe" ? stackedChartDataTipe : stackedChartDataDriver;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 bg-[#f8fafc] min-h-screen text-slate-900 font-sans antialiased">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Dasbor Efektivitas Armada
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-normal">
            Pemantauan optimalisasi kapasitas koli, keterisian armada, dan evaluasi operasional pengiriman.
          </p>
        </div>

        {/* Filter Periode */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => handlePreset(p.days)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold transition-all",
                  selectedPreset === p.days
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setSelectedPreset(-1);
                setStartDate(e.target.value);
              }}
              className="bg-transparent focus:outline-none text-slate-800 font-semibold cursor-pointer text-xs"
            />
            <span className="text-slate-300 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setSelectedPreset(-1);
                setEndDate(e.target.value);
              }}
              className="bg-transparent focus:outline-none text-slate-800 font-semibold cursor-pointer text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── ROW 1: KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI 1: TINGKAT KEAKTIFAN ARMADA */}
        <Card className="border border-slate-200 bg-white rounded-lg shadow-xs overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tingkat Keaktifan Armada
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-bold text-slate-900">
                    {isLoading ? <Skeleton className="h-9 w-20" /> : `${kpis.fleetUtilization}%`}
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    ({kpis.activeCount} dari {kpis.totalRegistered} unit)
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-md text-slate-700">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-2.5 py-0.5 rounded-full w-max">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Aktif Beroperasi
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: UNIT PERLU EVALUASI KAPASITAS (CLICKABLE) */}
        <Card 
          onClick={() => setShowEvaluationModal(true)}
          className="border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 rounded-lg shadow-xs overflow-hidden cursor-pointer transition-all hover:border-amber-300 group"
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Unit Perlu Evaluasi Kapasitas
                  </p>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mb-1" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-bold text-amber-700">
                    {isLoading ? <Skeleton className="h-9 w-16" /> : `${kpis.underCapacity + kpis.overCapacity}`}
                    <span className="text-sm font-normal text-amber-700/80 ml-1.5">Unit</span>
                  </h2>
                </div>
              </div>
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-md">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[11px]">
                  {kpis.underCapacity} Kurang Maksimal (&lt;50%)
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px]">
                  {kpis.overCapacity} Kelebihan Muatan (&gt;100%)
                </span>
              </div>
              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 group-hover:underline inline-flex items-center gap-1">
                Buka Analisis &amp; Saran Solusi →
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 2: WIDGETS ANALITIK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET A: OPTIMALISASI MUATAN KENDARAAN */}
        <Card className="border border-slate-200 bg-white rounded-lg shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-700" />
                Optimalisasi Muatan Kendaraan
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 font-normal">
                Keterisian koli rata-rata vs kapasitas maksimal tipe armada (Top 5 Aktif).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {vehicleMetricsMap.filter(v => v.ritaseCount > 0).slice(0, 5).map(v => {
              const maxUtilPct = Math.max(v.avgUtilKoliPercent, v.avgUtilEcerPercent);
              const renderPct = Math.min(100, maxUtilPct);
              const roundedKoli = Math.round(v.avgKoli);
              const roundedEcer = Math.round(v.avgEcer);
              
              let barColor = "bg-emerald-500";
              let labelText = "Optimal (50-100%)";
              let labelBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
              
              if (maxUtilPct < 50) {
                barColor = "bg-rose-500";
                labelText = "Kurang Maksimal (<50%)";
                labelBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
              } else if (maxUtilPct > 100) {
                barColor = "bg-amber-500";
                labelText = "Kelebihan Muatan (>100%)";
                labelBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
              }

              return (
                <TooltipPrimitive.Provider key={v.idKendaraan} delayDuration={100}>
                  <TooltipPrimitive.Root>
                    <TooltipPrimitive.Trigger asChild>
                      <div 
                        onClick={() => setSelectedArmadaForHistory(v)}
                        className="cursor-pointer group p-2.5 -mx-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors font-mono">
                              {v.platNomor}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">({v.jenisKendaraan})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-bold border px-1.5 py-0.5 rounded", labelBadgeClass)}>
                              {labelText}
                            </span>
                            <span className="font-bold text-xs text-slate-900 font-mono">
                              {Math.round(maxUtilPct)}%
                            </span>
                          </div>
                        </div>
                        {/* Traffic Light Bar */}
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-700", barColor)} 
                            style={{ width: `${renderPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                          <span>Muatan: {roundedKoli} Koli / {v.maxKoli} Max</span>
                          <span>{v.ritaseCount} Ritase</span>
                        </div>
                      </div>
                    </TooltipPrimitive.Trigger>
                    <TooltipPrimitive.Portal>
                      <TooltipPrimitive.Content
                        className="z-50 overflow-hidden rounded-md border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg text-xs animate-in fade-in-0 zoom-in-95"
                        sideOffset={6}
                      >
                        <div className="space-y-1.5 font-sans">
                          <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 font-mono">
                            {v.platNomor} ({v.jenisKendaraan})
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                            <span>Rata-rata Koli:</span>
                            <span className="font-bold text-slate-900 text-right font-mono">{roundedKoli} / {v.maxKoli}</span>
                            <span>Rata-rata Ecer:</span>
                            <span className="font-bold text-slate-900 text-right font-mono">{roundedEcer} / {v.maxEcer}</span>
                            <span>Total Ritase:</span>
                            <span className="font-bold text-slate-900 text-right font-mono">{v.ritaseCount} Rit</span>
                          </div>
                          <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-blue-600 font-medium">
                            Klik untuk membuka riwayat ritase
                          </div>
                        </div>
                        <TooltipPrimitive.Arrow className="fill-slate-200" />
                      </TooltipPrimitive.Content>
                    </TooltipPrimitive.Portal>
                  </TooltipPrimitive.Root>
                </TooltipPrimitive.Provider>
              );
            })}
          </CardContent>
        </Card>

        {/* WIDGET B: PRODUKTIVITAS KOLI & HIGH VALUE */}
        <Card className="border border-slate-200 bg-white rounded-lg shadow-xs flex flex-col">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-700" />
                Produktivitas Koli &amp; High Value
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 font-normal">
                Kontras muatan koli reguler vs paket bernilai tinggi (HV).
              </CardDescription>
            </div>
            {/* View Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
              <button 
                onClick={() => setProductivityView("tipe")}
                className={cn("px-2 py-0.5 text-[11px] font-semibold rounded transition-colors", productivityView === "tipe" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900")}
              >
                Per Tipe
              </button>
              <button 
                onClick={() => setProductivityView("driver")}
                className={cn("px-2 py-0.5 text-[11px] font-semibold rounded transition-colors", productivityView === "driver" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900")}
              >
                Per Driver
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-5 flex-1 min-h-[290px]">
            <ProductivityStackedChart data={stackedChartData} />
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 3: TABEL DATA MENTAH ── */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border border-slate-200 bg-white rounded-lg shadow-xs overflow-hidden">
          <CardHeader className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Tabel Optimalisasi &amp; Keterisian Armada
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-normal">
                Daftar lengkap seluruh armada terdaftar dan catatan keterisian koli aktual.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {vehicleMetricsMap.length} Total Unit
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-5 whitespace-nowrap">Nopol / Tipe</th>
                    <th className="py-3 px-4 text-center">Total Ritase</th>
                    <th className="py-3 px-4 text-right">Rata2 Koli / Max</th>
                    <th className="py-3 px-4 text-right">Rata2 Ecer / Max</th>
                    <th className="py-3 px-6 text-center">Status Optimalisasi</th>
                    <th className="py-3 px-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vehicleMetricsMap.map((v) => {
                    const roundedKoli = Math.round(v.avgKoli);
                    const roundedEcer = Math.round(v.avgEcer);
                    const isNoData = v.ritaseCount === 0 || v.statusKapasitas === "NoData";

                    return (
                      <tr 
                        key={v.idKendaraan} 
                        onClick={() => setSelectedArmadaForHistory(v)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        {/* NOPOL & TIPE */}
                        <td className="py-3 px-5">
                          <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors font-mono whitespace-nowrap">
                            {v.platNomor}
                          </div>
                          <div className="text-slate-400 text-[10px] font-medium whitespace-nowrap">{v.jenisKendaraan}</div>
                        </td>

                        {/* TOTAL RITASE */}
                        <td className="py-3 px-4 text-center">
                          <span className={cn("font-bold text-xs font-mono", isNoData ? "text-slate-400" : "text-slate-900")}>
                            {v.ritaseCount}
                          </span>
                        </td>

                        {/* RATA2 KOLI / MAX */}
                        <td className="py-3 px-4 text-right font-mono">
                          <span className={cn("font-bold text-xs", isNoData ? "text-slate-400" : "text-slate-900")}>
                            {isNoData ? 0 : roundedKoli}
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">/ {v.maxKoli}</span>
                        </td>

                        {/* RATA2 ECER / MAX */}
                        <td className="py-3 px-4 text-right font-mono">
                          <span className={cn("font-bold text-xs", isNoData ? "text-slate-400" : "text-slate-900")}>
                            {isNoData ? 0 : roundedEcer}
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">/ {v.maxEcer}</span>
                        </td>

                        {/* STATUS OPTIMALISASI */}
                        <td className="py-3 px-6 text-center">
                          {isNoData ? (
                            <span className="inline-block bg-slate-100 text-slate-500 border border-slate-200/80 text-[10px] font-medium px-2 py-0.5 rounded">
                              Tanpa Ritase
                            </span>
                          ) : v.statusKapasitas === "Under" ? (
                            <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Kurang Maksimal (&lt;50%)
                            </span>
                          ) : v.statusKapasitas === "Overload" ? (
                            <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Kelebihan Muatan (&gt;100%)
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Optimal (50-100%)
                            </span>
                          )}
                        </td>

                        {/* AKSI */}
                        <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedArmadaForHistory(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors shadow-2xs"
                          >
                            <History className="h-3 w-3 text-slate-500" />
                            Riwayat
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── MODAL 1: KESIMPULAN & EVALUASI KAPASITAS ARMADA ── */}
      {showEvaluationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Evaluasi &amp; Rekomendasi Efisiensi Armada
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Analisis sistem terhadap unit dengan muatan kurang maksimal (&lt;50%) atau kelebihan beban (&gt;100%).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex bg-slate-200/80 p-0.5 rounded">
                <button
                  type="button"
                  onClick={() => setEvaluationFilter("all")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
                    evaluationFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Semua Perlu Evaluasi ({kpis.underCapacity + kpis.overCapacity})
                </button>
                <button
                  type="button"
                  onClick={() => setEvaluationFilter("under")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
                    evaluationFilter === "under" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Kurang Maksimal ({kpis.underCapacity})
                </button>
                <button
                  type="button"
                  onClick={() => setEvaluationFilter("overload")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded transition-colors",
                    evaluationFilter === "overload" ? "bg-white text-amber-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Kelebihan Muatan ({kpis.overCapacity})
                </button>
              </div>

              <span className="text-xs font-mono text-slate-500">
                {evaluatedVehicles.length} Unit Ditemukan
              </span>
            </div>

            {/* List Evaluasi */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {evaluatedVehicles.length > 0 ? (
                evaluatedVehicles.map((v) => {
                  const evalDetails = getVehicleEvaluationDetails(v);
                  const isUnder = v.statusKapasitas === "Under";

                  return (
                    <div 
                      key={v.idKendaraan} 
                      className={cn(
                        "rounded-lg border p-4 bg-white transition-all space-y-3",
                        isUnder ? "border-rose-200 bg-rose-50/10" : "border-amber-200 bg-amber-50/10"
                      )}
                    >
                      {/* Item Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "p-1.5 rounded font-mono text-xs font-bold",
                            isUnder ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                          )}>
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 font-mono">{v.platNomor}</span>
                              <Badge variant="outline" className="text-[10px] font-medium border-slate-300">
                                {v.jenisKendaraan}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Kapasitas Maksimal: {v.maxKoli} Koli / {v.maxEcer} Ecer • {v.ritaseCount} Ritase Dijalankan
                            </p>
                          </div>
                        </div>

                        <div>
                          <span className={cn(
                            "text-[10px] font-bold border px-2 py-0.5 rounded",
                            isUnder ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200"
                          )}>
                            {isUnder ? "Kurang Maksimal" : "Kelebihan Muatan"} ({Math.round(v.avgUtilKoliPercent)}%)
                          </span>
                        </div>
                      </div>

                      {/* Hasil Analisis & Kesimpulan */}
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                        <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", isUnder ? "text-rose-500" : "text-amber-500")} />
                        <div>
                          <p className="font-bold text-slate-900 text-[11px] mb-0.5">Hasil Analisis:</p>
                          <p className="leading-relaxed text-[11px]">{evalDetails.diagnosis}</p>
                        </div>
                      </div>

                      {/* Rekomendasi Solusi */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {/* Solusi 1: Seller & Rute */}
                        <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Store className="h-3.5 w-3.5 text-blue-600" />
                            Opsi 1: Optimasi Titik Seller &amp; Rute
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                            {evalDetails.routeSuggestion}
                          </p>
                        </div>

                        {/* Solusi 2: Ganti Tipe Kendaraan */}
                        <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Truck className="h-3.5 w-3.5 text-indigo-600" />
                            Opsi 2: Penggantian Tipe Armada
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                            {evalDetails.vehicleSuggestion}
                          </p>
                        </div>
                      </div>

                      {/* Footer Action */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowEvaluationModal(false);
                            setSelectedArmadaForHistory(v);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Lihat Detail Ritase {v.platNomor} →
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
                  <p className="font-semibold text-xs text-slate-700">Semua armada aktif beroperasi dalam batas optimal!</p>
                  <p className="text-[11px] text-slate-400">Tidak ada unit yang tergolong kurang maksimal atau kelebihan muatan.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEvaluationModal(false)}
                className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RIWAYAT RITASE ARMADA ── */}
      {selectedArmadaForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded">
                  <Truck className="h-5 w-5 text-slate-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">
                      {selectedArmadaForHistory.platNomor}
                    </h3>
                    <Badge className="bg-white/20 text-white hover:bg-white/20 border-0 text-[10px] font-semibold">
                      {selectedArmadaForHistory.jenisKendaraan}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Riwayat Penggunaan &amp; Muatan Ritase ({startDate} s/d {endDate})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArmadaForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Sub-Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
              <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Ritase</p>
                <p className="text-lg font-bold text-slate-900 font-mono">{selectedArmadaForHistory.ritaseCount} <span className="text-xs font-normal text-slate-500">Rit</span></p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Koli Dibawa</p>
                <p className="text-lg font-bold text-slate-900 font-mono">{selectedArmadaForHistory.totalKoli} <span className="text-xs font-normal text-slate-500">Koli</span></p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Eceran</p>
                <p className="text-lg font-bold text-slate-900 font-mono">{selectedArmadaForHistory.totalEceran} <span className="text-xs font-normal text-slate-500">Pcs</span></p>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total High Value</p>
                <p className="text-lg font-bold text-amber-600 font-mono">{selectedArmadaForHistory.totalHV} <span className="text-xs font-normal text-slate-500">Koli</span></p>
              </div>
            </div>

            {/* Modal Body: List of Trips */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {selectedVehicleTrips.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedVehicleTrips.map((trip, idx) => (
                    <div 
                      key={trip.id_ritase || idx}
                      className="border border-slate-200 rounded-lg p-3.5 bg-white hover:border-slate-300 transition-all space-y-2.5"
                    >
                      {/* Trip Top Line */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 font-mono">
                            {trip.kode_ritase}
                          </span>
                          {trip.ritase_ke && (
                            <span className="text-[10px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              Rit ke-{trip.ritase_ke}
                            </span>
                          )}
                          <span 
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                              trip.status === "selesai" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              trip.status === "berjalan" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              "bg-slate-100 text-slate-600 border border-slate-200"
                            )}
                          >
                            {(trip.status || "direncanakan").toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {trip.tanggal ? format(new Date(trip.tanggal), "dd MMM yyyy") : "-"}
                        </div>
                      </div>

                      {/* Trip Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400">Driver</p>
                            <p className="font-semibold text-slate-800">{trip.nama_driver || "-"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400">Drop Point Tujuan</p>
                            <p className="font-semibold text-slate-800">{trip.nama_drop_point || "-"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400">Jam Berangkat - Tiba</p>
                            <p className="font-semibold text-slate-800 font-mono text-[11px]">
                              {trip.jam_berangkat || "-"} s/d {trip.jam_tiba || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cargo Summary Pill */}
                      <div className="bg-slate-50 p-2 rounded flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-3 text-[11px]">
                          <div>
                            <span className="text-slate-500">Koli: </span>
                            <span className="font-bold text-slate-900">{trip.total_koli ?? 0}</span>
                            <span className="text-[10px] text-slate-400">/{selectedArmadaForHistory.maxKoli}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Ecer: </span>
                            <span className="font-bold text-slate-900">{trip.total_eceran ?? 0}</span>
                            <span className="text-[10px] text-slate-400">/{selectedArmadaForHistory.maxEcer}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">HV: </span>
                            <span className="font-bold text-amber-600">{trip.total_high_value ?? 0}</span>
                          </div>
                        </div>

                        {/* Capacity Percentage on this trip */}
                        {(() => {
                          const koliPct = ((trip.total_koli || 0) / selectedArmadaForHistory.maxKoli) * 100;
                          const ecerPct = ((trip.total_eceran || 0) / selectedArmadaForHistory.maxEcer) * 100;
                          const maxTripPct = Math.max(koliPct, ecerPct);
                          return (
                            <span className={cn(
                              "font-bold text-[10px] px-1.5 py-0.5 rounded",
                              maxTripPct > 100 ? "bg-amber-100 text-amber-800" :
                              maxTripPct < 50 ? "bg-rose-100 text-rose-800" :
                              "bg-emerald-100 text-emerald-800"
                            )}>
                              {Math.round(maxTripPct)}% Terisi
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 space-y-1">
                  <Package className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-xs">Tidak ada riwayat ritase pada rentang tanggal ini.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArmadaForHistory(null)}
                className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
