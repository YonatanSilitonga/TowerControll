"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarDays,
  CalendarRange,
  RotateCcw,
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
  ArrowLeft,
  Download,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRitase, useKendaraan } from "@/hooks/use-armada";
import { useAllDriverPickupHistory } from "@/hooks/use-tracking";
import { cn, exportCsv, formatNumber } from "@/lib/utils";
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

function formatDateID(t: string): string {
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? t : format(d, "dd/MM/yyyy");
}


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
// Acuan data batas maksimal kapasitas muatan logistik terstandarisasi.
const getVehicleCapacity = (jenis: string, dbKapasitasKoli?: number | null) => {
  if (dbKapasitasKoli && dbKapasitasKoli > 0) {
    return {
      maxKoli: dbKapasitasKoli,
      maxEcer: dbKapasitasKoli * 15,
    };
  }

  const type = (jenis || "").toLowerCase();
  if (type.includes("wingbox") || type.includes("tronton") || type.includes("8m")) {
    return { maxKoli: 120, maxEcer: 1800 };
  }
  if (type.includes("cddl") || type.includes("double long")) {
    return { maxKoli: 70, maxEcer: 1050 };
  }
  if (type.includes("cdd") || type.includes("box 6m") || type.includes("double")) {
    return { maxKoli: 60, maxEcer: 900 };
  }
  if (type.includes("cdel") || type.includes("engkel") || type.includes("cde") || type.includes("box 4m")) {
    return { maxKoli: 40, maxEcer: 600 };
  }
  if (type.includes("traga") || type.includes("l300") || type.includes("pickup") || type.includes("bak")) {
    return { maxKoli: 25, maxEcer: 375 };
  }
  if (type.includes("blindvan") || type.includes("bv") || type.includes("van") || type.includes("granmax") || type.includes("luxio")) {
    return { maxKoli: 12, maxEcer: 180 };
  }
  if (type.includes("motor") || type.includes("roda dua")) {
    return { maxKoli: 4, maxEcer: 60 };
  }
  return { maxKoli: 50, maxEcer: 750 }; // Default fallback realistis
};

/* ---------- REKOMENDASI SISTEM GENERATOR ---------- */
function getVehicleEvaluationDetails(v: VehicleMetrics) {
  const isUnder = v.statusKapasitas === "Under";
  const isOverload = v.statusKapasitas === "Overload";
  const type = (v.jenisKendaraan || "").toLowerCase();
  const roundedKoli = Math.round(v.avgKoli);
  const roundedEcer = Math.round(v.avgEcer);
  const totalEkuivKoli = Math.round(v.avgKoli + (v.avgEcer / 15));
  const utilPercent = Math.round((totalEkuivKoli / v.maxKoli) * 100);

  let title = "";
  let diagnosis = "";
  let routeSuggestion = "";
  let vehicleSuggestion = "";

  if (isUnder) {
    title = "Kapasitas Kurang Maksimal (<50%)";
    const sisaKoli = Math.max(0, v.maxKoli - totalEkuivKoli);
    diagnosis = `Rata-rata muatan terisi ${roundedKoli} Koli${roundedEcer > 0 ? ` & ${roundedEcer} Eceran` : ""} (ekuivalen ${totalEkuivKoli} Koli dari batas ${v.maxKoli} Koli, ${utilPercent}%). Sisa ruang kargo ~${sisaKoli} Koli belum terisi di setiap ritase.`;
    
    routeSuggestion = `Tambahkan 1-2 titik pickup seller baru yang sejalur dengan rute ini, atau konsolidasikan muatan dengan jadwal ritase unit lain yang searah agar ruang kargo terisi optimal.`;
    
    if (type.includes("wingbox") || type.includes("tronton") || type.includes("8m")) {
      vehicleSuggestion = `Muatan terlalu sedikit untuk Truk Wingbox. Pertimbangkan alihkan rute ini ke Truk CDD Box (kapasitas 60 koli) atau Engkel agar efisiensi solar dan operasional jauh lebih hemat.`;
    } else if (type.includes("cdd") || type.includes("cddl")) {
      vehicleSuggestion = `Pertimbangkan alihkan jadwal ke unit yang lebih kecil (Engkel / CDEL) agar biaya operasional solar & tol lebih hemat.`;
    } else if (type.includes("cdel") || type.includes("engkel")) {
      vehicleSuggestion = `Pertimbangkan memakai unit Traga atau Blindvan untuk rute ini agar penggunaan kapasitas lebih proporsional.`;
    } else {
      vehicleSuggestion = `Pertimbangkan mengonsolidasikan jadwal pengiriman dengan unit lain yang searah.`;
    }
  } else if (isOverload) {
    title = "Kelebihan Muatan (>100%)";
    const lebihKoli = Math.max(0, totalEkuivKoli - v.maxKoli);
    diagnosis = `Rata-rata muatan mencapai ${roundedKoli} Koli${roundedEcer > 0 ? ` & ${roundedEcer} Eceran` : ""} (ekuivalen ${totalEkuivKoli} Koli dari batas ${v.maxKoli} Koli, ${utilPercent}%). Kelebihan muatan ~${lebihKoli} Koli berisiko mengurangi faktor keselamatan dan merusak kargo.`;
    
    routeSuggestion = `Bagi rute pengiriman menjadi 2 ritase (ritase pagi & siang), atau pisahkan jadwal pickup seller berkapasitas besar ke unit armada pendukung lainnya.`;

    if (type.includes("blindvan") || type.includes("bv")) {
      vehicleSuggestion = `Muatan tidak lagi muat di Blindvan. Direkomendasikan segera upgrade unit ke tipe Traga (maks 25 koli) atau CDEL (maks 40 koli).`;
    } else if (type.includes("traga") || type.includes("pickup")) {
      vehicleSuggestion = `Direkomendasikan upgrade armada ke Truk Engkel (CDEL kapasitas 40 koli) atau tambah jadwal ritase harian.`;
    } else if (type.includes("cdel") || type.includes("engkel")) {
      vehicleSuggestion = `Direkomendasikan upgrade ke Truk CDD (kapasitas 60 koli) atau CDDL (kapasitas 70 koli).`;
    } else {
      vehicleSuggestion = `Kapasitas kargo maksimal. Disarankan menambah armada pendukung atau membagi rute menjadi dua jadwal ritase berbeda.`;
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
  const [startDate, setStartDate] = useState<string>(todayLocal());
  const [endDate, setEndDate] = useState<string>(todayLocal());
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [showCustomRange, setShowCustomRange] = useState(false);

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
      { id: "today", label: "Hari Ini", from: todayLocal(), to: todayLocal(), days: 0 },
      { id: "yesterday", label: "Kemarin", from: daysAgo(1), to: daysAgo(1), days: 1 },
      { id: "this_week", label: "Minggu Ini", from: toWIB(monday), to: toWIB(sunday), days: -1 },
      { id: "this_month", label: "Bulan Ini", from: firstMonthStr, to: todayLocal(), days: -2 },
      { id: "30d", label: "30 Hari", from: daysAgo(29), to: todayLocal(), days: 30 },
    ];
  }, []);

  const isPresetActive = presets.some((p) => p.from === startDate && p.to === endDate);
  const [productivityView, setProductivityView] = useState<"tipe" | "driver">("tipe");
  const [selectedArmadaForHistory, setSelectedArmadaForHistory] = useState<VehicleMetrics | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);
  const [evaluationFilter, setEvaluationFilter] = useState<"all" | "under" | "overload">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tableStatusFilter, setTableStatusFilter] = useState<"all" | "aktif" | "under" | "optimal" | "overload" | "tanpa_ritase">("all");
  const [pickupSearchQuery, setPickupSearchQuery] = useState<string>("");
  const [pickupStatusFilter, setPickupStatusFilter] = useState<"all" | "optimal" | "overload" | "under">("all");

  // Pagination Table 1 (Armada Dorong)
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(10);

  // Pagination Table 2 (Driver Pickup)
  const [pickupPage, setPickupPage] = useState<number>(1);
  const [pickupPageSize, setPickupPageSize] = useState<number>(10);

  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, tableStatusFilter, startDate, endDate]);

  useEffect(() => {
    setPickupPage(1);
  }, [pickupSearchQuery, pickupStatusFilter, startDate, endDate]);

  /** Format jam tanpa detik. Handle both HH:MM string dan ISO timestamp. */
  const fmtTime = (val?: string | null) => {
    if (!val) return null;
    if (/^\d{2}:\d{2}$/.test(val)) return val;
    const d = new Date(val.includes("T") ? val : val + "Z");
    if (Number.isNaN(d.getTime())) return null;
    const h = String((d.getUTCHours() + 7) % 24).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

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
  const filteredRitase = (allRitase ?? []).slice(0, 5000);

  // 2. Compute Metrics per Vehicle
  const vehicleMetricsMap = useMemo(() => {
    const map = new Map<number, VehicleMetrics>();

    allKendaraan.forEach((k) => {
      const capacity = getVehicleCapacity(k.jenis_kendaraan || "", k.kapasitas_koli);
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
        const capacity = getVehicleCapacity("cdd", null);
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

        // Muatan gabungan kargo logistik Gateway (Koli fisik + Eceran yang memakan ruang):
        // 1 Karung Koli standar ≈ 15 Paket Eceran
        const totalKoliEkuivalen = vm.avgKoli + (vm.avgEcer / 15);
        const combinedUtilPercent = (totalKoliEkuivalen / vm.maxKoli) * 100;

        // Penentuan Status Beban & Efisiensi Armada yang akurat:
        if (combinedUtilPercent < 50) {
          vm.statusKapasitas = "Under";
        } else if (combinedUtilPercent > 100) {
          vm.statusKapasitas = "Overload";
        } else {
          vm.statusKapasitas = "Optimal";
        }
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

  // Filtered vehicles untuk tabel
  const filteredTableVehicles = useMemo(() => {
    return vehicleMetricsMap.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPlate = v.platNomor.toLowerCase().includes(q);
        const matchType = (v.jenisKendaraan || "").toLowerCase().includes(q);
        if (!matchPlate && !matchType) return false;
      }

      if (tableStatusFilter === "aktif") return v.ritaseCount > 0;
      if (tableStatusFilter === "tanpa_ritase") return v.ritaseCount === 0 || v.statusKapasitas === "NoData";
      if (tableStatusFilter === "under") return v.statusKapasitas === "Under";
      if (tableStatusFilter === "optimal") return v.statusKapasitas === "Optimal";
      if (tableStatusFilter === "overload") return v.statusKapasitas === "Overload";

      return true;
    });
  }, [vehicleMetricsMap, searchQuery, tableStatusFilter]);

  const totalTablePages = Math.max(1, Math.ceil(filteredTableVehicles.length / tablePageSize));
  const paginatedVehicles = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredTableVehicles.slice(start, start + tablePageSize);
  }, [filteredTableVehicles, tablePage, tablePageSize]);

  const handleExportCsv = () => {
    const headers = [
      "Plat Nomor",
      "Jenis Kendaraan",
      "Total Ritase",
      "Rata-rata Koli",
      "Kapasitas Maks Koli",
      "Utilisasi Koli (%)",
      "Rata-rata Eceran",
      "Kapasitas Maks Eceran",
      "Utilisasi Eceran (%)",
      "Status Kapasitas",
    ];
    const rows = filteredTableVehicles.map((v) => [
      v.platNomor,
      v.jenisKendaraan,
      v.ritaseCount,
      Math.round(v.avgKoli),
      v.maxKoli,
      v.avgUtilKoliPercent.toFixed(1),
      Math.round(v.avgEcer),
      v.maxEcer,
      v.avgUtilEcerPercent.toFixed(1),
      v.statusKapasitas,
    ]);
    exportCsv(`efektivitas_armada_${startDate}_sd_${endDate}`, headers, rows);
  };

  // ── SEGMEN PICKUP DATA & LOGIC ──
  const [fleetSegment, setFleetSegment] = useState<"linehaul" | "pickup">("linehaul");

  const pickupHistoryQuery = useAllDriverPickupHistory({
    start_date: startDate,
    end_date: endDate,
  });
  const pickupLogs = pickupHistoryQuery.data ?? [];
  const loadingPickup = pickupHistoryQuery.isLoading;

  interface PickupFleetMetric {
    namaDriver: string;
    totalSesi: number;
    totalKoli: number;
    totalEcer: number;
    totalAwb: number;
    avgKoli: number;
    avgAwb: number;
    avgKoliEkuiv: number;
    statusEfisiensi: "Optimal" | "Overload" | "Under";
    rekomendasiArmada: string;
    platNomor?: string;
  }

  const { pickupMetricsList, pickupKpis } = useMemo(() => {
    const map = new Map<string, {
      namaDriver: string;
      totalSesi: number;
      totalKoli: number;
      totalEcer: number;
      totalAwb: number;
      platNomor?: string;
    }>();

    for (const l of pickupLogs) {
      const name = (l.nama_driver || "Driver Pickup").trim();
      if (!map.has(name)) {
        map.set(name, {
          namaDriver: name,
          totalSesi: 0,
          totalKoli: 0,
          totalEcer: 0,
          totalAwb: 0,
          platNomor: l.plat_nomor || undefined,
        });
      }
      const item = map.get(name)!;
      item.totalSesi += 1;
      item.totalKoli += l.koli || 0;
      item.totalEcer += l.ecer || 0;
      item.totalAwb += l.jumlah_barang || 0;
      if (!item.platNomor && l.plat_nomor) {
        item.platNomor = l.plat_nomor;
      }
    }

    let countOver = 0;
    let countUnder = 0;
    let countOptimal = 0;
    let totalAllKoli = 0;
    let totalAllAwb = 0;
    let totalAllSesi = 0;
    let totalAllKoliEkuiv = 0;

    const list: PickupFleetMetric[] = Array.from(map.values()).map((p) => {
      // Perhitungan beban realistis penjemputan:
      // Seller sering mencatat per AWB (ecer) atau per karung koli.
      // 1 karung koli ≈ 20 AWB (atau 15 eceran)
      const ekuivKoliFromAwb = p.totalEcer > 0 
        ? (p.totalEcer / 15) 
        : (p.totalKoli === 0 && p.totalAwb > 0 ? (p.totalAwb / 20) : 0);
      
      const koliEkuivalen = p.totalKoli + ekuivKoliFromAwb;
      const avgKoliEkuiv = p.totalSesi > 0 ? (koliEkuivalen / p.totalSesi) : 0;
      const avgKoliMurni = p.totalSesi > 0 ? (p.totalKoli / p.totalSesi) : 0;
      const avgAwb = p.totalSesi > 0 ? (p.totalAwb / p.totalSesi) : 0;

      totalAllKoli += p.totalKoli;
      totalAllAwb += p.totalAwb;
      totalAllSesi += p.totalSesi;
      totalAllKoliEkuiv += koliEkuivalen;

      let statusEfisiensi: "Optimal" | "Overload" | "Under" = "Optimal";
      let rekomendasiArmada = "Muatan proporsional untuk operasional penjemputan harian.";

      // Beban Berat: >25 koli ekuivalen ATAU >350 AWB per sesi
      if (avgKoliEkuiv > 25 || avgAwb > 350) {
        statusEfisiensi = "Overload";
        const hasCar = p.platNomor ? true : false;
        rekomendasiArmada = hasCar
          ? "Volume muatan tinggi (>25 koli ekuiv). Pertahankan alokasi unit mobil (Blindvan/Pickup) agar kapasitas muat aman."
          : "Volume muatan tinggi (>25 koli ekuiv). Wajib dialokasikan mobil Blindvan/Pickup, bukan motor.";
        countOver += 1;
      // Muatan Rendah: <5 koli ekuivalen DAN <30 AWB per sesi
      } else if (avgKoliEkuiv < 5 && avgAwb < 30) {
        statusEfisiensi = "Under";
        rekomendasiArmada = "Volume penjemputan minim (<5 koli ekuiv). Evaluasi konsolidasi jadwal pickup dengan seller sejalur.";
        countUnder += 1;
      } else {
        countOptimal += 1;
      }

      return {
        ...p,
        avgKoli: avgKoliMurni,
        avgAwb,
        avgKoliEkuiv,
        statusEfisiensi,
        rekomendasiArmada,
      };
    }).sort((a, b) => (b.avgKoliEkuiv * b.totalSesi) - (a.avgKoliEkuiv * a.totalSesi));

    const avgKoliPerSesi = totalAllSesi > 0 ? (totalAllKoliEkuiv / totalAllSesi).toFixed(1) : "0";

    return {
      pickupMetricsList: list,
      pickupKpis: {
        totalDrivers: list.length,
        totalAllKoli,
        totalAllAwb,
        totalAllSesi,
        avgKoliPerSesi,
        countOver,
        countUnder,
        countOptimal,
      },
    };
  }, [pickupLogs]);

  const filteredPickupMetrics = useMemo(() => {
    return pickupMetricsList.filter((p) => {
      if (pickupSearchQuery.trim()) {
        const q = pickupSearchQuery.toLowerCase().trim();
        if (!p.namaDriver.toLowerCase().includes(q)) return false;
      }
      if (pickupStatusFilter === "overload") return p.statusEfisiensi === "Overload";
      if (pickupStatusFilter === "under") return p.statusEfisiensi === "Under";
      if (pickupStatusFilter === "optimal") return p.statusEfisiensi === "Optimal";
      return true;
    });
  }, [pickupMetricsList, pickupSearchQuery, pickupStatusFilter]);

  const totalPickupPages = Math.max(1, Math.ceil(filteredPickupMetrics.length / pickupPageSize));
  const paginatedPickupMetrics = useMemo(() => {
    const start = (pickupPage - 1) * pickupPageSize;
    return filteredPickupMetrics.slice(start, start + pickupPageSize);
  }, [filteredPickupMetrics, pickupPage, pickupPageSize]);

  const handleExportPickupCsv = () => {
    const headers = [
      "Nama Driver Pickup",
      "Total Sesi Penjemputan",
      "Total Koli Dijemput",
      "Total AWB",
      "Rata-rata Koli / Sesi",
      "Status Keterisian",
      "Rekomendasi Armada",
    ];
    const rows = filteredPickupMetrics.map((p) => [
      p.namaDriver,
      p.totalSesi,
      p.totalKoli,
      p.totalAwb,
      Math.round(p.avgKoliEkuiv),
      p.statusEfisiensi,
      p.rekomendasiArmada,
    ]);
    exportCsv(`efektivitas_pickup_${startDate}_sd_${endDate}`, headers, rows);
  };

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
    <div className="space-y-4 pb-8">
      {/* ── HEADER ── */}
      <PageHeader
        title="Dasbor Efektivitas Armada"
        description="Pemantauan optimalisasi kapasitas koli pada armada truk yang bertugas mendorong muatan ke Gateway (JKT/SEG) maupun driver pickup."
        crumbs={[{ label: "Analitik", href: "/analitik" }, { label: "Efektivitas Armada" }]}
        actions={
          <Link
            href="/analitik"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 text-slate-400" />
            <span>Kembali ke Analitik</span>
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
                const isActive = startDate === p.from && endDate === p.to;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setStartDate(p.from);
                      setEndDate(p.to);
                      setSelectedPreset(p.days);
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
                  Periode: <strong className="text-slate-900 dark:text-white font-semibold">{formatDateID(startDate)} – {formatDateID(endDate)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Baris 2 (Rentang Kustom): Dari Tanggal - Sampai Tanggal & Tombol Reset */}
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
                        value={startDate}
                        max={endDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setStartDate(e.target.value);
                            setSelectedPreset(-1);
                          }
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                    <span className="text-slate-400 font-semibold">–</span>
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 px-3 py-1.5 text-xs">
                      <span className="text-[11px] font-medium text-slate-400">Sampai:</span>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        max={todayLocal()}
                        onChange={(e) => {
                          if (e.target.value) {
                            setEndDate(e.target.value);
                            setSelectedPreset(-1);
                          }
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
                      setStartDate(todayLocal());
                      setEndDate(todayLocal());
                      setSelectedPreset(0);
                      setShowCustomRange(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset (Hari Ini)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── SEGMEN ARMADA SWITCHER ── */}
      <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 w-fit inline-flex gap-1">
        <button
          type="button"
          onClick={() => setFleetSegment("linehaul")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            fleetSegment === "linehaul"
              ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>Armada Dorong (Gateway)</span>
        </button>
        <button
          type="button"
          onClick={() => setFleetSegment("pickup")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
            fleetSegment === "pickup"
              ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          )}
        >
          <Store className="h-3.5 w-3.5" />
          <span>Armada &amp; Tim Pickup</span>
        </button>
      </div>

      {fleetSegment === "linehaul" ? (
        <>
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
            {vehicleMetricsMap.filter((v) => v.ritaseCount > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <Truck className="h-8 w-8 mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-700">Belum ada armada beroperasi</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tidak ditemukan data ritase koli pada rentang tanggal ini.</p>
              </div>
            ) : (
              vehicleMetricsMap.filter(v => v.ritaseCount > 0).slice(0, 5).map(v => {
                const primaryUtil = v.avgKoli > 0 || v.avgEcer === 0
                  ? v.avgUtilKoliPercent
                  : v.avgUtilEcerPercent;
                const renderPct = Math.min(100, Math.max(0, primaryUtil));
                const roundedKoli = Math.round(v.avgKoli);
                const roundedEcer = Math.round(v.avgEcer);
                
                let barColor = "bg-emerald-500";
                let labelText = "Optimal (50-100%)";
                let labelBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                
                if (primaryUtil < 50) {
                  barColor = "bg-rose-500";
                  labelText = "Kurang Maksimal (<50%)";
                  labelBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                } else if (primaryUtil > 100) {
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
                                {Math.round(primaryUtil)}%
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
              })
            )}
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
          <CardHeader className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Tabel Optimalisasi &amp; Keterisian Armada
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 font-normal mt-0.5">
                Daftar armada terdaftar dengan catatan keterisian koli aktual dan status efisiensi.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-mono text-slate-500">
                Menampilkan {filteredTableVehicles.length} dari {vehicleMetricsMap.length} Unit
              </span>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                title="Unduh data tabel armada ke format CSV"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </CardHeader>

          {/* Table Controls / Filter Toolbar */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari plat nomor atau tipe armada..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex flex-wrap items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => setTableStatusFilter("all")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                  tableStatusFilter === "all" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter("aktif")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                  tableStatusFilter === "aktif" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Aktif Ritase ({kpis.activeCount})
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter("under")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                  tableStatusFilter === "under" ? "bg-rose-500 text-white shadow-2xs" : "text-slate-600 hover:text-rose-700"
                )}
              >
                Kurang Maksimal ({kpis.underCapacity})
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter("optimal")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                  tableStatusFilter === "optimal" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-emerald-700"
                )}
              >
                Optimal
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter("overload")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                  tableStatusFilter === "overload" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600 hover:text-amber-700"
                )}
              >
                Overload ({kpis.overCapacity})
              </button>
              <button
                type="button"
                onClick={() => setTableStatusFilter("tanpa_ritase")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                  tableStatusFilter === "tanpa_ritase" ? "bg-slate-700 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Tanpa Ritase
              </button>
            </div>
          </div>

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
                  {filteredTableVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Truck className="h-7 w-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-600">Tidak ada armada yang sesuai filter</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau reset filter status.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((v) => {
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Table 1 */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {filteredTableVehicles.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}–
                    {Math.min(tablePage * tablePageSize, filteredTableVehicles.length)}
                  </strong>{" "}
                  dari <strong className="text-slate-800 dark:text-slate-200">{filteredTableVehicles.length}</strong> armada
                </span>
                <select
                  value={tablePageSize}
                  onChange={(e) => {
                    setTablePageSize(Number(e.target.value));
                    setTablePage(1);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value={10}>10 / hal</option>
                  <option value={20}>20 / hal</option>
                  <option value={50}>50 / hal</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                  {tablePage} / {totalTablePages}
                </span>
                <button
                  type="button"
                  disabled={tablePage >= totalTablePages}
                  onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      ) : (
        <div className="space-y-6">
          {/* ── ROW 1: KPI SUMMARY PICKUP ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 bg-white rounded-lg shadow-xs overflow-hidden">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Total Koli Dijemput
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-bold text-slate-900">
                        {loadingPickup ? <Skeleton className="h-9 w-20" /> : formatNumber(pickupKpis.totalAllKoli)}
                      </h2>
                      <span className="text-xs font-normal text-slate-500">koli</span>
                      <span className="text-xs font-medium text-slate-400">({formatNumber(pickupKpis.totalAllAwb)} AWB)</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-md">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <Activity className="h-3.5 w-3.5 text-slate-400" />
                  <span>Dari {pickupKpis.totalAllSesi} sesi penjemputan ({pickupKpis.totalDrivers} driver)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white rounded-lg shadow-xs overflow-hidden">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Rata² Muatan / Sesi
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-bold text-slate-900">
                        {loadingPickup ? <Skeleton className="h-9 w-16" /> : pickupKpis.avgKoliPerSesi}
                      </h2>
                      <span className="text-xs font-normal text-slate-500">koli/sesi</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-100 text-slate-700 rounded-md">
                    <Truck className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{pickupKpis.countOptimal} driver muatan proporsional</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-amber-200 bg-amber-50/30 rounded-lg shadow-xs overflow-hidden">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                      Muatan Berat (&gt;25 Koli)
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-bold text-amber-700">
                        {loadingPickup ? <Skeleton className="h-9 w-12" /> : pickupKpis.countOver}
                      </h2>
                      <span className="text-xs font-normal text-amber-700/80">Driver</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-md">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                  <span>Perlu alokasi unit mobil/Blindvan</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-rose-200 bg-rose-50/30 rounded-lg shadow-xs overflow-hidden">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wider mb-1">
                      Muatan Rendah (&lt;5 Koli)
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-bold text-rose-700">
                        {loadingPickup ? <Skeleton className="h-9 w-12" /> : pickupKpis.countUnder}
                      </h2>
                      <span className="text-xs font-normal text-rose-700/80">Driver</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-rose-100 text-rose-800 rounded-md">
                    <Info className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                  <span>Evaluasi konsolidasi rute toko</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── TABEL TIM & ARMADA PICKUP ── */}
          <Card className="border border-slate-200 bg-white rounded-lg shadow-xs overflow-hidden">
            <CardHeader className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#0c1e3a]" />
                  Tabel Optimalisasi Armada &amp; Tim Penjemputan (Pickup)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-normal mt-0.5">
                  Daftar driver penjemputan dari seller/implan toko dengan rata-rata muatan dan rekomendasi jenis armada.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-xs font-mono text-slate-500">
                  Menampilkan {filteredPickupMetrics.length} Driver
                </span>
                <button
                  type="button"
                  onClick={handleExportPickupCsv}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  title="Unduh data efektivitas pickup ke format CSV"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </CardHeader>

            {/* Toolbar: Search + Status Filter */}
            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama driver pickup..."
                  value={pickupSearchQuery}
                  onChange={(e) => setPickupSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
                {pickupSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPickupSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => setPickupStatusFilter("all")}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                    pickupStatusFilter === "all" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Semua ({pickupMetricsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPickupStatusFilter("overload")}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                    pickupStatusFilter === "overload" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600 hover:text-amber-700"
                  )}
                >
                  Beban Berat ({pickupKpis.countOver})
                </button>
                <button
                  type="button"
                  onClick={() => setPickupStatusFilter("optimal")}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                    pickupStatusFilter === "optimal" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-emerald-700"
                  )}
                >
                  Optimal ({pickupKpis.countOptimal})
                </button>
                <button
                  type="button"
                  onClick={() => setPickupStatusFilter("under")}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-semibold transition-all",
                    pickupStatusFilter === "under" ? "bg-rose-500 text-white shadow-2xs" : "text-slate-600 hover:text-rose-700"
                  )}
                >
                  Muatan Rendah ({pickupKpis.countUnder})
                </button>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-5 whitespace-nowrap">Driver Pickup</th>
                      <th className="py-3 px-4 text-center">Total Sesi</th>
                      <th className="py-3 px-4 text-right">Total Koli</th>
                      <th className="py-3 px-4 text-right">Total AWB</th>
                      <th className="py-3 px-4 text-right">Rata² Koli/Sesi</th>
                      <th className="py-3 px-6 text-center">Status Beban</th>
                      <th className="py-3 px-5">Rekomendasi Armada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingPickup ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Skeleton className="h-5 w-48 mx-auto" />
                        </td>
                      </tr>
                    ) : filteredPickupMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Store className="h-7 w-7 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                          <p className="text-xs font-semibold text-slate-600">Tidak ada data driver pickup</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Belum ada aktivitas penjemputan pada filter periode ini.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedPickupMetrics.map((p) => (
                        <tr key={p.namaDriver} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-5 font-bold text-slate-900 whitespace-nowrap">
                            <div>{p.namaDriver}</div>
                            {p.platNomor && (
                              <div className="text-[10px] font-mono text-slate-400 font-normal">{p.platNomor}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {p.totalSesi}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatNumber(p.totalKoli)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatNumber(p.totalAwb)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-800">
                            <span className="font-bold text-xs">
                              {Math.round(p.avgKoliEkuiv)} koli
                            </span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              ~{Math.round(p.avgAwb)} AWB/sesi
                            </span>
                          </td>
                          <td className="py-3 px-6 text-center">
                            {p.statusEfisiensi === "Overload" ? (
                              <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                Beban Berat (&gt;25 koli)
                              </span>
                            ) : p.statusEfisiensi === "Under" ? (
                              <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                Muatan Rendah (&lt;5 koli)
                              </span>
                            ) : (
                              <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                Optimal (5-25 koli)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5 text-slate-600 text-[11px] leading-relaxed">
                            {p.rekomendasiArmada}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                              {fmtTime(trip.jam_berangkat) || "-"} s/d {fmtTime(trip.jam_tiba) || "-"}
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
