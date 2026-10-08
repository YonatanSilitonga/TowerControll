"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  PackageCheck,
  Search,
  Truck,
  User,
  Package,
  Clock,
  Calendar,
  RefreshCw,
  Boxes,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  Store,
  LayoutGrid,
  List,
  Building2,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllDriverPickupHistory, useDriverPickups } from "@/hooks/use-tracking";
import { formatDateTime, cn } from "@/lib/utils";
import type { DriverPickupLog } from "@/types/armada";

/* ─────────────────────────────────────────────────────────────────────────────
 * Tipe Data Teragregasi untuk Analisis Logistik
 * ───────────────────────────────────────────────────────────────────────────── */
interface DriverAggregated {
  idUser: number;
  namaDriver: string;
  totalAwb: number;
  totalKoli: number;
  totalEcer: number;
  totalHv: number;
  totalTripSelesai: number;
  totalSesi: number;
  latestStatus: string;
  latestUpdate: string;
  sellerSet: Set<string>;
  sellersCount: number;
  logs: DriverPickupLog[];
}

interface SellerAggregated {
  namaSeller: string;
  totalAwb: number;
  totalKoli: number;
  totalEcer: number;
  totalHv: number;
  pickupCount: number;
  drivers: Set<string>;
}

export default function RiwayatPickupPage() {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "this_week" | "custom_day" | "custom_month">("today");
  const [pickedDate, setPickedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [pickedMonth, setPickedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  // Tampilan Mode: 'analytics' (Driver Cards) vs 'raw' (Audit Logs)
  const [viewMode, setViewMode] = useState<"analytics" | "raw">("analytics");

  // State Modal Drill-down Driver
  const [modalDriver, setModalDriver] = useState<DriverAggregated | null>(null);
  const [modalLogDetail, setModalLogDetail] = useState<DriverPickupLog | null>(null);

  // Rentang tanggal aktif yang dipakai query
  const activeDateRange = useMemo<{
    startDate: string;
    endDate: string;
    label: string;
  }>(() => {
    const now = new Date();

    if (dateMode === "today") {
      const todayStr = now.toISOString().split("T")[0];
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: `Hari Ini (${todayStr})`,
      };
    }

    if (dateMode === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];
      return {
        startDate: yestStr,
        endDate: yestStr,
        label: `Kemarin (${yestStr})`,
      };
    }

    if (dateMode === "this_week") {
      const currentDay = now.getDay();
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = monday.toISOString().split("T")[0];
      const sunStr = sunday.toISOString().split("T")[0];
      return {
        startDate: monStr,
        endDate: sunStr,
        label: `Minggu Ini (${monStr} s/d ${sunStr})`,
      };
    }

    if (dateMode === "custom_day") {
      return {
        startDate: pickedDate,
        endDate: pickedDate,
        label: `Tanggal: ${pickedDate}`,
      };
    }

    if (dateMode === "custom_month") {
      const parts = pickedMonth.split("-");
      const year = parseInt(parts[0], 10) || now.getFullYear();
      const monthIndex = (parseInt(parts[1], 10) || now.getMonth() + 1) - 1;

      const firstDay = new Date(year, monthIndex, 1);
      const lastDay = new Date(year, monthIndex + 1, 0);

      const startMonthStr = firstDay.toISOString().split("T")[0];
      const endMonthStr = lastDay.toISOString().split("T")[0];
      const monthName = firstDay.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

      return {
        startDate: startMonthStr,
        endDate: endMonthStr,
        label: `Bulan ${monthName}`,
      };
    }

    const todayStr = now.toISOString().split("T")[0];
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: todayStr,
    };
  }, [dateMode, pickedDate, pickedMonth]);

  // Query parameters
  const queryParams = useMemo(() => {
    const params: {
      start_date?: string;
      end_date?: string;
      id_user?: number;
      status?: string;
      limit?: number;
    } = {
      start_date: activeDateRange.startDate,
      end_date: activeDateRange.endDate,
      limit: 5000,
    };

    if (selectedDriver !== "all") {
      const parsedId = parseInt(selectedDriver, 10);
      if (!isNaN(parsedId) && parsedId > 0) {
        params.id_user = parsedId;
      }
    }

    if (selectedStatus !== "all") {
      params.status = selectedStatus;
    }

    return params;
  }, [activeDateRange, selectedDriver, selectedStatus]);

  // Data Fetching
  const { data: logs = [], isLoading, isFetching, refetch } = useAllDriverPickupHistory(queryParams);
  const { data: driverPickups = [] } = useDriverPickups();

  // Date Filter Handler
  const handleDateModeChange = (mode: "today" | "yesterday" | "this_week" | "custom_day" | "custom_month") => {
    setDateMode(mode);
    const now = new Date();
    if (mode === "today") {
      setPickedDate(now.toISOString().split("T")[0]);
    } else if (mode === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      setPickedDate(yest.toISOString().split("T")[0]);
    }
  };

  // Month & Year Picker Modal State
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState<number>(() => {
    const today = new Date();
    return today.getFullYear();
  });

  const MONTH_NAMES = [
    { num: "01", short: "Jan", full: "Januari" },
    { num: "02", short: "Feb", full: "Februari" },
    { num: "03", short: "Mar", full: "Maret" },
    { num: "04", short: "Apr", full: "April" },
    { num: "05", short: "Mei", full: "Mei" },
    { num: "06", short: "Jun", full: "Juni" },
    { num: "07", short: "Jul", full: "Juli" },
    { num: "08", short: "Ags", full: "Agustus" },
    { num: "09", short: "Sep", full: "September" },
    { num: "10", short: "Okt", full: "Oktober" },
    { num: "11", short: "Nov", full: "November" },
    { num: "12", short: "Des", full: "Desember" },
  ];

  const handleSelectMonth = (monthNum: string) => {
    const formatted = `${monthPickerYear}-${monthNum}`;
    setPickedMonth(formatted);
    setDateMode("custom_month");
    setShowMonthModal(false);
  };

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === "function") {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  const monthDisplayLabel = useMemo(() => {
    const parts = pickedMonth.split("-");
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (!isNaN(year) && !isNaN(monthIndex)) {
      const d = new Date(year, monthIndex, 1);
      return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    }
    return "Pilih Bulan";
  }, [pickedMonth]);

  /* ─────────────────────────────────────────────────────────────────────────
   * OLAH DATA ANALITIK
   * ───────────────────────────────────────────────────────────────────────── */
  const { driverSummaryList, sellerRankingList, overallMetrics } = useMemo(() => {
    let grandAwb = 0;
    let grandKoli = 0;
    let grandEcer = 0;
    let grandHv = 0;
    let grandSelesaiTrip = 0;

    const driverMap = new Map<number, DriverAggregated>();
    const sellerMap = new Map<string, SellerAggregated>();

    logs.forEach((log) => {
      const rawUserId = log.id_user || 0;
      const driverName = log.nama_driver || `Driver #${rawUserId}`;
      const jml = log.jumlah_barang || 0;
      const koli = log.koli || 0;
      const ecer = log.ecer || 0;
      const hv = log.high_value || 0;
      const status = (log.status || "").toLowerCase().trim();
      const asalSellerStr = log.asal_seller || "Gudang";

      grandAwb += jml;
      grandKoli += koli;
      grandEcer += ecer;
      grandHv += hv;
      if (status === "selesai") grandSelesaiTrip++;

      // 1. Agregasi Driver
      if (!driverMap.has(rawUserId)) {
        driverMap.set(rawUserId, {
          idUser: rawUserId,
          namaDriver: driverName,
          totalAwb: 0,
          totalKoli: 0,
          totalEcer: 0,
          totalHv: 0,
          totalTripSelesai: 0,
          totalSesi: 0,
          latestStatus: log.status || "standby",
          latestUpdate: log.updated_at || log.created_at || log.tanggal,
          sellerSet: new Set<string>(),
          sellersCount: 0,
          logs: [],
        });
      }

      const dAgg = driverMap.get(rawUserId)!;
      dAgg.totalAwb += jml;
      dAgg.totalKoli += koli;
      dAgg.totalEcer += ecer;
      dAgg.totalHv += hv;
      dAgg.totalSesi += 1;
      if (status === "selesai") dAgg.totalTripSelesai += 1;
      dAgg.logs.push(log);

      // Parse nama seller
      const parts = asalSellerStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== "gudang" && s.toLowerCase() !== "menuju seller");

      parts.forEach((p) => {
        dAgg.sellerSet.add(p);

        // 2. Agregasi Seller
        const cleanSeller = p;
        if (!sellerMap.has(cleanSeller)) {
          sellerMap.set(cleanSeller, {
            namaSeller: cleanSeller,
            totalAwb: 0,
            totalKoli: 0,
            totalEcer: 0,
            totalHv: 0,
            pickupCount: 0,
            drivers: new Set<string>(),
          });
        }
        const sAgg = sellerMap.get(cleanSeller)!;
        sAgg.totalAwb += jml;
        sAgg.totalKoli += koli;
        sAgg.totalEcer += ecer;
        sAgg.totalHv += hv;
        sAgg.pickupCount += 1;
        sAgg.drivers.add(driverName);
      });
    });

    // Update sellersCount di driver
    driverMap.forEach((d) => {
      d.sellersCount = d.sellerSet.size;
      d.logs.sort((a, b) => {
        const tA = new Date(a.updated_at || a.created_at || a.tanggal).getTime();
        const tB = new Date(b.updated_at || b.created_at || b.tanggal).getTime();
        return tB - tA;
      });
      if (d.logs.length > 0) {
        d.latestStatus = d.logs[0].status;
        d.latestUpdate = d.logs[0].updated_at || d.logs[0].created_at || d.logs[0].tanggal;
      }
    });

    // Urutkan driver berdasarkan total AWB terbanyak
    const sortedDrivers = Array.from(driverMap.values()).sort(
      (a, b) => b.totalAwb - a.totalAwb || b.totalSesi - a.totalSesi
    );

    // Urutkan seller berdasarkan total AWB terbanyak
    const sortedSellers = Array.from(sellerMap.values()).sort(
      (a, b) => b.totalAwb - a.totalAwb || b.pickupCount - a.pickupCount
    );

    const activeDriversCount = driverMap.size;
    const totalSellersCount = sellerMap.size;
    const avgAwbPerSeller = totalSellersCount > 0 ? grandAwb / totalSellersCount : 0;
    const avgAwbPerDriver = activeDriversCount > 0 ? grandAwb / activeDriversCount : 0;
    const topSeller = sortedSellers.length > 0 ? sortedSellers[0] : null;
    const topSellerContributionPct =
      topSeller && grandAwb > 0 ? (topSeller.totalAwb / grandAwb) * 100 : 0;

    return {
      driverSummaryList: sortedDrivers,
      sellerRankingList: sortedSellers,
      overallMetrics: {
        totalLogs: logs.length,
        totalAwb: grandAwb,
        totalKoli: grandKoli,
        totalEcer: grandEcer,
        totalHv: grandHv,
        totalTripSelesai: grandSelesaiTrip,
        activeDriversCount,
        totalSellersCount,
        avgAwbPerSeller,
        avgAwbPerDriver,
        topSeller,
        topSellerContributionPct,
      },
    };
  }, [logs]);

  // Filtered Driver List (berdasarkan search nama driver atau seller)
  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return driverSummaryList;
    const q = search.toLowerCase().trim();
    return driverSummaryList.filter((d) => {
      const matchName = d.namaDriver.toLowerCase().includes(q);
      const matchSeller = Array.from(d.sellerSet).some((s) => s.toLowerCase().includes(q));
      return matchName || matchSeller;
    });
  }, [driverSummaryList, search]);

  // Export to CSV helper
  const handleExportCSV = useCallback(() => {
    if (logs.length === 0) return;

    const headers = [
      "ID Log",
      "Tanggal",
      "Waktu Catat",
      "Nama Driver",
      "Asal Seller",
      "Total AWB",
      "Koli",
      "Ecer",
      "High Value",
      "Status",
      "Catatan",
      "Diinput Oleh",
    ];

    const rows = logs.map((item) => [
      item.id_log,
      item.tanggal || "-",
      item.updated_at ? new Date(item.updated_at).toLocaleString("id-ID") : "-",
      `"${(item.nama_driver || "").replace(/"/g, '""')}"`,
      `"${(item.asal_seller || "").replace(/"/g, '""')}"`,
      item.jumlah_barang || 0,
      item.koli || 0,
      item.ecer || 0,
      item.high_value || 0,
      `"${(item.status || "").replace(/"/g, '""')}"`,
      `"${(item.catatan || "").replace(/"/g, '""')}"`,
      `"${(item.created_by || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `riwayat_pickup_${activeDateRange.startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [logs, activeDateRange.startDate]);

  // Helper render status badge yang rapi & subtil
  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === "selesai") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Sampai Gudang
        </span>
      );
    }
    if (s === "menuju_gudang") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Menuju Gudang
        </span>
      );
    }
    if (s === "menuju_seller") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Sedang Menuju
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {status || "Standby"}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Riwayat Pickup Driver"
        description="Monitoring performa muatan dan riwayat pickup driver dari toko seller ke gudang."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-slate-500")} />
              <span>{isFetching ? "Menyinkronkan..." : "Segarkan"}</span>
            </button>
          </div>
        }
      />

      {/* ── 1. Top Date Filter Toolbar (Hari Ini, Kemarin, Minggu Ini, Pilih Tanggal, Pilih Bulan) ── */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Periode:
              </span>

              {/* Tombol Hari Ini */}
              <button
                onClick={() => handleDateModeChange("today")}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  dateMode === "today"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                Hari Ini
              </button>

              {/* Tombol Kemarin */}
              <button
                onClick={() => handleDateModeChange("yesterday")}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  dateMode === "yesterday"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                Kemarin
              </button>

              {/* Tombol Minggu Ini */}
              <button
                onClick={() => handleDateModeChange("this_week")}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  dateMode === "this_week"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                Minggu Ini
              </button>

              {/* Tombol Pilih Tanggal (Pop-up Langsung) */}
              <div className="relative inline-flex items-center">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={pickedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setPickedDate(e.target.value);
                      setDateMode("custom_day");
                    }
                  }}
                  className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={handleOpenDatePicker}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                    dateMode === "custom_day"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                  title="Klik untuk memilih tanggal spesifik"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{dateMode === "custom_day" ? `Tanggal: ${pickedDate}` : "Pilih Tanggal"}</span>
                </button>
              </div>

              {/* Tombol Pilih Bulan (Pop-up Modal Langsung) */}
              <button
                type="button"
                onClick={() => {
                  const parts = pickedMonth.split("-");
                  const y = parseInt(parts[0], 10);
                  if (!isNaN(y)) setMonthPickerYear(y);
                  setShowMonthModal(true);
                }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  dateMode === "custom_month"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
                title="Klik untuk memilih bulan spesifik"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{dateMode === "custom_month" ? `Bulan: ${monthDisplayLabel}` : "Pilih Bulan"}</span>
              </button>
            </div>

            {/* Tanggal Aktif Indicator */}
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Periode Aktif: <strong className="text-slate-900 dark:text-white font-semibold">{activeDateRange.label}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Executive Metric Cards (4-Column Layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume AWB Terpickup */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Total AWB Terpickup
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {overallMetrics.totalLogs} Log
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {isLoading ? <Skeleton className="h-8 w-24" /> : overallMetrics.totalAwb.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Paket AWB</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{overallMetrics.totalKoli} Koli • {overallMetrics.totalEcer} Ecer</span>
            {overallMetrics.totalHv > 0 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400">{overallMetrics.totalHv} HV</span>
            )}
          </div>
        </div>

        {/* Card 2: Rata-rata AWB per Seller */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Rata-rata / Toko Seller
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {overallMetrics.totalSellersCount} Toko
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  overallMetrics.avgAwbPerSeller.toLocaleString("id-ID", { maximumFractionDigits: 1 })
                )}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AWB / Toko</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Dari {overallMetrics.totalSellersCount} titik seller yang dikunjungi</span>
          </div>
        </div>

        {/* Card 3: Rata-rata AWB per Driver */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Rata-rata / Driver
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {overallMetrics.activeDriversCount} Driver
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  overallMetrics.avgAwbPerDriver.toLocaleString("id-ID", { maximumFractionDigits: 1 })
                )}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AWB / Driver</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{overallMetrics.activeDriversCount} Driver bertugas</span>
            <span>{overallMetrics.totalTripSelesai} Trip selesai</span>
          </div>
        </div>

        {/* Card 4: Top Kontributor Seller */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Top Seller
                </span>
              </div>
              {overallMetrics.topSeller && (
                <span className="text-[11px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {overallMetrics.topSellerContributionPct.toFixed(1)}% Vol
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="mt-3 space-y-1.5">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : overallMetrics.topSeller ? (
              <div className="mt-3">
                <div className="text-base font-bold text-slate-900 dark:text-white truncate" title={overallMetrics.topSeller.namaSeller}>
                  {overallMetrics.topSeller.namaSeller}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {overallMetrics.topSeller.totalAwb.toLocaleString("id-ID")}
                  </strong>{" "}
                  AWB ({overallMetrics.topSeller.pickupCount}x pickup)
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-400 italic">Belum ada data</div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Kontributor volume terbesar hari ini</span>
          </div>
        </div>
      </div>

      {/* ── 3. Search & View Mode Controls Toolbar ── */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama driver atau nama toko seller..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setViewMode("analytics")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all",
                  viewMode === "analytics"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kartu Driver</span>
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all",
                  viewMode === "raw"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span>Audit Log</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────
       * VIEW 1: DRIVER CARDS & TIMELINE (PROFESSIONAL LOGISTICS THEME)
       * ─────────────────────────────────────────────────────────────────── */}
      {viewMode === "analytics" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              Daftar Driver Pickup ({filteredDrivers.length} Driver)
            </h2>
            <span className="text-xs text-slate-400">
              Klik kartu driver untuk melihat rincian riwayat muatan
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
              <PackageCheck className="h-10 w-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Tidak Ada Transaksi Pickup
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tidak ada data aktivitas pickup pada periode {activeDateRange.label}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrivers.map((driver, rankIdx) => {
                const percentageOfTotal =
                  overallMetrics.totalAwb > 0
                    ? Math.round((driver.totalAwb / overallMetrics.totalAwb) * 100)
                    : 0;

                return (
                  <div
                    key={driver.idUser}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    {/* Driver Card Header */}
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            {driver.namaDriver.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                {driver.namaDriver}
                              </h3>
                              <span className="text-[10px] text-slate-400">
                                #{rankIdx + 1}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              User ID: {driver.idUser} • {driver.totalSesi} Log
                            </p>
                          </div>
                        </div>
                        {renderStatusBadge(driver.latestStatus)}
                      </div>

                      {/* Main Metric Box */}
                      <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Muatan AWB
                          </span>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {driver.totalAwb.toLocaleString("id-ID")}{" "}
                            <span className="text-xs font-normal text-slate-400">AWB</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Porsi
                          </span>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {percentageOfTotal}%
                          </div>
                        </div>
                      </div>

                      {/* Breakdown Stats */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Koli</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {driver.totalKoli}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Ecer</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {driver.totalEcer}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">HV</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {driver.totalHv}
                          </span>
                        </div>
                      </div>

                      {/* Toko Seller Chips */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Toko Seller ({driver.sellersCount}):
                        </div>
                        {driver.sellerSet.size > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                            {Array.from(driver.sellerSet).map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Belum ada nama toko spesifik
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Driver Card Action Button */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {driver.totalTripSelesai}x Selesai di Gudang
                      </span>
                      <button
                        onClick={() => setModalDriver(driver)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 transition-all shadow-sm"
                      >
                        <span>Lihat Riwayat</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Top Seller Ranking Table ── */}
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rekap Muatan per Seller ({sellerRankingList.length} Toko)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Diurutkan berdasarkan volume AWB</span>
            </div>

            {sellerRankingList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada data toko seller spesifik pada periode {activeDateRange.label}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Seller</th>
                      <th className="py-3 px-4 text-center">Total Volume</th>
                      <th className="py-3 px-4">% Kontribusi</th>
                      <th className="py-3 px-4">Rincian Muatan</th>
                      <th className="py-3 px-4">Frekuensi Pickup</th>
                      <th className="py-3 px-4">Driver yang Menangani</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {sellerRankingList.slice(0, 10).map((seller, idx) => {
                      const sharePct =
                        overallMetrics.totalAwb > 0
                          ? (seller.totalAwb / overallMetrics.totalAwb) * 100
                          : 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-semibold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {seller.namaSeller}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                            {seller.totalAwb.toLocaleString("id-ID")} AWB
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 min-w-[110px]">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-900 dark:bg-slate-100 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(sharePct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">
                                {sharePct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {seller.totalKoli} Koli • {seller.totalEcer} Ecer{" "}
                            {seller.totalHv > 0 && `• ${seller.totalHv} HV`}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {seller.pickupCount} Kali
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {Array.from(seller.drivers).map((dr, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700"
                                >
                                  {dr}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
       * VIEW 2: RAW AUDIT LOGS (TABLE VIEW BARIS DEMI BARIS)
       * ─────────────────────────────────────────────────────────────────── */}
      {viewMode === "raw" && (
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Log Transaksi Pickup ({logs.length} Baris)
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Asal Seller / Titik</th>
                  <th className="py-3 px-4 text-center">Total AWB</th>
                  <th className="py-3 px-4">Rincian Paket</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.map((item) => (
                  <tr
                    key={item.id_log}
                    onClick={() => setModalLogDetail(item)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.tanggal || "-"}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                      {item.nama_driver}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {item.asal_seller || "Gudang Utama"}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                      {item.jumlah_barang} AWB
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {item.koli || 0} Koli • {item.ecer || 0} Ecer • {item.high_value || 0} HV
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-500">
                      {item.catatan || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold hover:underline">
                        Buka
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────────────
       * MODAL DRILL-DOWN: DETAIL RIWAYAT DRIVER SPESIFIK
       * ─────────────────────────────────────────────────────────────────── */}
      {modalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-base flex items-center justify-center">
                  {modalDriver.namaDriver.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Riwayat Muatan: {modalDriver.namaDriver}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total {modalDriver.totalAwb} AWB ({modalDriver.logs.length} kali input)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalDriver(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Driver Metrics Summary */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-center text-xs">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total AWB</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{modalDriver.totalAwb}</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Koli</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">{modalDriver.totalKoli}</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Ecer</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">{modalDriver.totalEcer}</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">High Value</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">{modalDriver.totalHv}</span>
              </div>
            </div>

            {/* Modal Body: Timeline Log Perjalanan */}
            <div className="p-5 overflow-y-auto space-y-3 text-xs flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Timeline & Riwayat Sesi Driver
              </div>

              <div className="space-y-2.5">
                {modalDriver.logs.map((logItem) => (
                  <div
                    key={logItem.id_log}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {logItem.asal_seller || "Gudang Utama"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          #{logItem.id_log}
                        </span>
                      </div>
                      {renderStatusBadge(logItem.status)}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {logItem.updated_at
                          ? new Date(logItem.updated_at).toLocaleTimeString("id-ID")
                          : "-"}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        +{logItem.jumlah_barang} AWB
                      </span>
                      <span>
                        ({logItem.koli || 0} Koli, {logItem.ecer || 0} Ecer, {logItem.high_value || 0} HV)
                      </span>
                    </div>

                    {logItem.catatan && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic mt-1">
                        &quot;{logItem.catatan}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
              <button
                onClick={() => setModalDriver(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Log Modal (for raw view) */}
      {modalLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-3.5 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Detail Log #{modalLogDetail.id_log}
              </h3>
              <button onClick={() => setModalLogDetail(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <p><strong>Driver:</strong> {modalLogDetail.nama_driver}</p>
              <p><strong>Titik:</strong> {modalLogDetail.asal_seller}</p>
              <p><strong>Total AWB:</strong> {modalLogDetail.jumlah_barang} AWB</p>
              <p><strong>Rincian:</strong> {modalLogDetail.koli || 0} Koli, {modalLogDetail.ecer || 0} Ecer, {modalLogDetail.high_value || 0} HV</p>
              <p><strong>Status:</strong> {modalLogDetail.status}</p>
              <p><strong>Waktu:</strong> {modalLogDetail.tanggal} {modalLogDetail.updated_at}</p>
              {modalLogDetail.catatan && <p><strong>Catatan:</strong> {modalLogDetail.catatan}</p>}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalLogDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Month & Year Picker Modal Pop-up ── */}
      {showMonthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowMonthModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal with Year Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pilih Bulan & Tahun</h3>
              </div>
              <button
                onClick={() => setShowMonthModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Year Navigator */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMonthPickerYear((y) => y - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {monthPickerYear}
              </span>
              <button
                type="button"
                onClick={() => setMonthPickerYear((y) => y + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTH_NAMES.map((m) => {
                const isSelected =
                  dateMode === "custom_month" &&
                  pickedMonth === `${monthPickerYear}-${m.num}`;

                return (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => handleSelectMonth(m.num)}
                    className={cn(
                      "py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border text-center flex flex-col items-center justify-center gap-0.5",
                      isSelected
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm"
                        : "bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <span className="font-bold text-xs">{m.short}</span>
                    <span className={cn("text-[10px]", isSelected ? "text-slate-300 dark:text-slate-600" : "text-slate-400")}>
                      {m.full}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setMonthPickerYear(now.getFullYear());
                  const curMonthNum = String(now.getMonth() + 1).padStart(2, "0");
                  handleSelectMonth(curMonthNum);
                }}
                className="font-bold text-slate-700 dark:text-slate-300 hover:underline"
              >
                Bulan Sekarang
              </button>
              <button
                type="button"
                onClick={() => setShowMonthModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
