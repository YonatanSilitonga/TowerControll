"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PackageCheck,
  Search,
  Truck,
  MapPin,
  User,
  Package,
  Clock,
  Calendar,
  CalendarRange,
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
  Camera,
  ZoomIn,
  Download,
  ExternalLink,
  Image as ImageIcon,
  UserCheck,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { getFullPhotoUrl } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllDriverPickupHistory, useDriverPickups, useTrackingMap } from "@/hooks/use-tracking";
import { useDriver } from "@/hooks/use-armada";
import { formatDateTime, cn, normalizeSellerName } from "@/lib/utils";
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

/* ─────────────────────────────────────────────────────────────────────────────
 * Pembagian Waktu Ritase Pickup (Otomatis berdasarkan jam WIB)
 * - Ritase 1: 00:00 - 15:59 WIB (Kloter Siang)
 * - Ritase 2: 16:00 - 19:59 WIB (Kloter Sore)
 * - Ritase 3: 20:00 - 23:59 WIB (Kloter Malam / Closing)
 * ───────────────────────────────────────────────────────────────────────────── */
export type RitaseType = 1 | 2 | 3;

export const RITASE_CONFIG = {
  1: {
    label: "Ritase 1",
    shortTime: "00:00 - 15:59",
    timeRange: "00:00 - 15:59 WIB",
    desc: "Kloter Pagi & Siang",
  },
  2: {
    label: "Ritase 2",
    shortTime: "16:00 - 19:59",
    timeRange: "16:00 - 19:59 WIB",
    desc: "Kloter Sore / Prime",
  },
  3: {
    label: "Ritase 3",
    shortTime: "20:00 - 23:59",
    timeRange: "20:00 - 23:59 WIB",
    desc: "Kloter Malam / Closing",
  },
} as const;

export function getRitaseFromLog(log: {
  created_at?: string | null;
  updated_at?: string | null;
  tanggal?: string | null;
}): RitaseType {
  const timeStr = log.created_at || log.updated_at;
  if (!timeStr) return 1;

  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return 1;

    // Format jam dalam zona waktu WIB (Asia/Jakarta)
    const wibHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).format(d);
    const hour = parseInt(wibHourStr, 10);

    if (hour >= 0 && hour < 16) return 1;
    if (hour >= 16 && hour < 20) return 2;
    return 3;
  } catch {
    return 1;
  }
}

function RiwayatPickupContent() {
  const searchParams = useSearchParams();
  // Filter States
  const [search, setSearch] = useState("");
  const driverParam = searchParams.get("driver");
  const [selectedDriver, setSelectedDriver] = useState<string>(driverParam || "all");

  useEffect(() => {
    if (driverParam) {
      setSelectedDriver(driverParam);
    }
  }, [driverParam]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "this_week" | "this_month" | "last_30d" | "custom">("today");
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Tampilan Mode: 'analytics' (Driver Cards) vs 'raw' (Audit Logs)
  const [viewMode, setViewMode] = useState<"analytics" | "raw">("analytics");

  // Mode Tampilan Utama: 'fleet_overview' (Ringkasan Seluruh Armada) default vs 'per_driver' (Riwayat Driver)
  const [activeMainTab, setActiveMainTab] = useState<"fleet_overview" | "per_driver">("fleet_overview");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const mainDateInputRef = useRef<HTMLInputElement>(null);

  // State Driver Terpilih di Tab 'Riwayat Per Driver'
  const [selectedDriverUser, setSelectedDriverUser] = useState<{
    idUser: number;
    namaDriver: string;
    platNomor?: string;
    noHp?: string;
    isOnline?: boolean;
  } | null>(null);

  // State Slide-Over Drawer di Tab 'Ringkasan Armada' (null = tertutup)
  const [drawerDriver, setDrawerDriver] = useState<{
    idUser: number;
    namaDriver: string;
    platNomor?: string;
    noHp?: string;
    isOnline?: boolean;
  } | null>(null);
  const [modalLogDetail, setModalLogDetail] = useState<DriverPickupLog | null>(null);

  // State Tanggal Khusus Driver Terpilih
  const [drawerDateMode, setDrawerDateMode] = useState<"synced" | "today" | "yesterday" | "this_week" | "custom_day">("today");
  const [drawerPickedDate, setDrawerPickedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const drawerDateInputRef = useRef<HTMLInputElement>(null);

  // State Pencarian & Filter di dalam Slide-Over Drawer
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerOnlyPhotos, setDrawerOnlyPhotos] = useState(false);
  const [drawerSubView, setDrawerSubView] = useState<"rekap_seller" | "timeline">("rekap_seller");

  // State Filter Pembagian Ritase: null (Semua Ritase) | 1 | 2 | 3
  const [selectedRitaseFilter, setSelectedRitaseFilter] = useState<RitaseType | null>(null);
  const [fleetRitaseFilter, setFleetRitaseFilter] = useState<RitaseType | null>(null);
  const [modalRitaseDetail, setModalRitaseDetail] = useState<RitaseType | null>(null);
  const [modalRitaseSearch, setModalRitaseSearch] = useState("");

  // State Modal Lightbox Preview Foto Bukti
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    awb?: number;
    koli?: number;
    ecer?: number;
    hv?: number;
  } | null>(null);

  // Rentang tanggal aktif yang dipakai query (terstandarisasi)
  const activeDateRange = useMemo<{
    startDate: string;
    endDate: string;
    label: string;
  }>(() => {
    const now = new Date();
    const toWIB = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);

    if (dateMode === "today") {
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: `Hari Ini (${todayStr})`,
      };
    }

    if (dateMode === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toWIB(yest);
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

      const monStr = toWIB(monday);
      const sunStr = toWIB(sunday);
      return {
        startDate: monStr,
        endDate: sunStr,
        label: `Minggu Ini (${monStr} s/d ${sunStr})`,
      };
    }

    if (dateMode === "this_month") {
      const firstMonthStr = toWIB(new Date(now.getFullYear(), now.getMonth(), 1));
      return {
        startDate: firstMonthStr,
        endDate: todayStr,
        label: `Bulan Ini (${firstMonthStr} s/d ${todayStr})`,
      };
    }

    if (dateMode === "last_30d") {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 29);
      const d30Str = toWIB(d30);
      return {
        startDate: d30Str,
        endDate: todayStr,
        label: `30 Hari (${d30Str} s/d ${todayStr})`,
      };
    }

    if (dateMode === "custom") {
      return {
        startDate: customStart,
        endDate: customEnd,
        label: `${customStart} s/d ${customEnd}`,
      };
    }

    return {
      startDate: todayStr,
      endDate: todayStr,
      label: todayStr,
    };
  }, [dateMode, customStart, customEnd, todayStr]);

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
  const { data: armadaDrivers = [] } = useDriver();
  const { data: mapData } = useTrackingMap();

  const driverPlatMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const v of mapData?.vehicles ?? []) {
      if (v.id_driver && v.plat_nomor) {
        m.set(v.id_driver, v.plat_nomor);
      }
    }
    return m;
  }, [mapData]);

  const getPlatForDriver = useCallback((idUser?: number | null, nama?: string) => {
    if (idUser && driverPlatMap.has(idUser)) return driverPlatMap.get(idUser)!;
    const byName = (mapData?.vehicles ?? []).find(v => v.nama_driver?.toLowerCase() === nama?.toLowerCase());
    if (byName?.plat_nomor) return byName.plat_nomor;
    return "B 9278 PDD";
  }, [driverPlatMap, mapData]);



  /* ─────────────────────────────────────────────────────────────────────────
   * OLAH DATA ANALITIK
   * ───────────────────────────────────────────────────────────────────────── */
  // Rekapitulasi Pembagian Ritase Seluruh Armada untuk Periode Aktif
  const fleetRitaseBreakdown = useMemo(() => {
    const result: Record<
      RitaseType,
      {
        ritase: RitaseType;
        totalAwb: number;
        totalKoli: number;
        totalEcer: number;
        totalHv: number;
        totalLogs: number;
        drivers: Set<string>;
        sellers: Map<
          string,
          {
            namaSeller: string;
            awb: number;
            koli: number;
            ecer: number;
            hv: number;
            pickupCount: number;
            drivers: Set<string>;
            lastTime?: string;
          }
        >;
      }
    > = {
      1: { ritase: 1, totalAwb: 0, totalKoli: 0, totalEcer: 0, totalHv: 0, totalLogs: 0, drivers: new Set(), sellers: new Map() },
      2: { ritase: 2, totalAwb: 0, totalKoli: 0, totalEcer: 0, totalHv: 0, totalLogs: 0, drivers: new Set(), sellers: new Map() },
      3: { ritase: 3, totalAwb: 0, totalKoli: 0, totalEcer: 0, totalHv: 0, totalLogs: 0, drivers: new Set(), sellers: new Map() },
    };

    logs.forEach((l) => {
      const rit = getRitaseFromLog(l);
      const b = result[rit];
      b.totalAwb += l.jumlah_barang || 0;
      b.totalKoli += l.koli || 0;
      b.totalEcer += l.ecer || 0;
      b.totalHv += l.high_value || 0;
      b.totalLogs += 1;
      const driverName = l.nama_driver || `Driver #${l.id_user || 0}`;
      b.drivers.add(driverName);

      const rawSeller = l.asal_seller && l.asal_seller.trim() ? l.asal_seller.trim() : "Gudang";
      if (rawSeller.toLowerCase() !== "gudang") {
        const exist = b.sellers.get(rawSeller) || {
          namaSeller: rawSeller,
          awb: 0,
          koli: 0,
          ecer: 0,
          hv: 0,
          pickupCount: 0,
          drivers: new Set<string>(),
          lastTime: l.updated_at || l.created_at || l.tanggal,
        };
        exist.awb += l.jumlah_barang || 0;
        exist.koli += l.koli || 0;
        exist.ecer += l.ecer || 0;
        exist.hv += l.high_value || 0;
        exist.pickupCount += 1;
        exist.drivers.add(driverName);
        if (!exist.lastTime && (l.updated_at || l.created_at || l.tanggal)) {
          exist.lastTime = l.updated_at || l.created_at || l.tanggal;
        }
        b.sellers.set(rawSeller, exist);
      }
    });

    return result;
  }, [logs]);

  // Log armada efektif setelah difilter per ritase (jika ritase tertentu dipilih)
  const effectiveFleetLogs = useMemo(() => {
    if (fleetRitaseFilter === null) return logs;
    return logs.filter((l) => getRitaseFromLog(l) === fleetRitaseFilter);
  }, [logs, fleetRitaseFilter]);

  const { driverSummaryList, sellerRankingList, overallMetrics } = useMemo(() => {
    let grandAwb = 0;
    let grandKoli = 0;
    let grandEcer = 0;
    let grandHv = 0;
    let grandSelesaiTrip = 0;

    const driverMap = new Map<number, DriverAggregated>();
    const sellerMap = new Map<string, SellerAggregated>();

    effectiveFleetLogs.forEach((log) => {
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

      // Parse & normalisasi nama seller
      const parts = asalSellerStr
        .split(",")
        .map((s) => normalizeSellerName(s))
        .filter((s): s is string => Boolean(s));

      parts.forEach((cleanSeller) => {
        dAgg.sellerSet.add(cleanSeller);

        // 2. Agregasi Seller
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
        totalLogs: effectiveFleetLogs.length,
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
  }, [effectiveFleetLogs]);

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

  // Set driver nonaktif dari master armada untuk isolasi driver yang sudah dinonaktifkan
  const inactiveDriverNames = useMemo(() => {
    const set = new Set<string>();
    armadaDrivers.forEach((d) => {
      const s = (d.status_driver || "").toLowerCase().trim();
      if (s === "nonaktif" || s === "inactive" || s === "off" || s === "libur") {
        if (d.nama_driver) {
          set.add(d.nama_driver.toLowerCase().trim());
        }
      }
    });
    return set;
  }, [armadaDrivers]);

  // Master list seluruh driver pickup aktif yang terdaftar (hanya driver aktif role driver_pickup)
  const allPickupDrivers = useMemo(() => {
    const map = new Map<number, { idUser: number; namaDriver: string; platNomor?: string; noHp?: string; isOnline?: boolean }>();

    // Hanya ambil dari master driverPickups (role = driver_pickup aktif)
    driverPickups.forEach((dp) => {
      if (dp.id_user && dp.id_user > 0) {
        const cleanName = (dp.nama_driver || dp.username || "").trim();
        const lowerName = cleanName.toLowerCase();

        // Lewati placeholder/dummy
        if (!cleanName || lowerName === "pickup" || lowerName === "test" || lowerName === "admin") {
          return;
        }

        // Filter status driver atau status user jika dinonaktifkan
        const rawStatusDriver = (dp.status_driver || "").toLowerCase().trim();
        if (rawStatusDriver === "nonaktif" || rawStatusDriver === "inactive" || rawStatusDriver === "off") {
          return;
        }
        const rawStatusUser = (dp.status_user || "").toLowerCase().trim();
        if (rawStatusUser === "nonaktif" || rawStatusUser === "inactive") {
          return;
        }

        // Filter jika terdaftar nonaktif di master armada driver
        if (inactiveDriverNames.has(lowerName)) {
          return;
        }

        map.set(dp.id_user, {
          idUser: dp.id_user,
          namaDriver: cleanName,
          platNomor: dp.plat_nomor || getPlatForDriver(dp.id_user, cleanName),
          noHp: dp.no_hp || "",
          isOnline: Boolean(dp.session_online || (dp.status && dp.status !== "standby" && dp.status !== "selesai")),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.namaDriver.localeCompare(b.namaDriver));
  }, [driverPickups, inactiveDriverNames, getPlatForDriver]);

  // Filter daftar driver aktif berdasarkan pencarian nama atau plat
  const visibleActiveDrivers = useMemo(() => {
    if (!driverSearchQuery.trim()) return allPickupDrivers;
    const q = driverSearchQuery.toLowerCase().trim();
    return allPickupDrivers.filter(
      (d) =>
        d.namaDriver.toLowerCase().includes(q) ||
        (d.platNomor && d.platNomor.toLowerCase().includes(q))
    );
  }, [allPickupDrivers, driverSearchQuery]);

  // Rentang tanggal efektif yang dipakai di dalam Drawer / Riwayat Driver
  const drawerActiveDateRange = useMemo<{
    startDate: string;
    endDate: string;
    label: string;
  }>(() => {
    if (drawerDateMode === "synced") {
      return activeDateRange;
    }
    const now = new Date();
    if (drawerDateMode === "today") {
      const todayStr = now.toISOString().split("T")[0];
      return { startDate: todayStr, endDate: todayStr, label: `Hari Ini (${todayStr})` };
    }
    if (drawerDateMode === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];
      return { startDate: yestStr, endDate: yestStr, label: `Kemarin (${yestStr})` };
    }
    if (drawerDateMode === "this_week") {
      const currentDay = now.getDay();
      const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const monStr = monday.toISOString().split("T")[0];
      const sunStr = sunday.toISOString().split("T")[0];
      return { startDate: monStr, endDate: sunStr, label: `Minggu Ini (${monStr} s/d ${sunStr})` };
    }
    if (drawerDateMode === "custom_day") {
      return { startDate: drawerPickedDate, endDate: drawerPickedDate, label: `Tanggal: ${drawerPickedDate}` };
    }
    return activeDateRange;
  }, [drawerDateMode, drawerPickedDate, activeDateRange]);

  // Label tampilan tanggal terpilih dalam bahasa Indonesia
  const selectedDateDisplay = useMemo(() => {
    if (drawerDateMode === "today") {
      const today = new Date();
      return `Hari Ini (${today.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (drawerDateMode === "yesterday") {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      return `Kemarin (${yest.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (drawerDateMode === "this_week") {
      return drawerActiveDateRange.label;
    }
    if (drawerDateMode === "custom_day") {
      try {
        const parts = drawerPickedDate.split("-");
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      } catch {
        return drawerPickedDate;
      }
    }
    return drawerActiveDateRange.label;
  }, [drawerDateMode, drawerPickedDate, drawerActiveDateRange]);

  // Buka Slide-Over Drawer Driver tertentu
  const openDriverDrawer = useCallback(
    (driverId?: number | null, driverName?: string) => {
      let target = allPickupDrivers.find((d) => driverId && d.idUser === driverId);
      if (!target && driverName) {
        target = allPickupDrivers.find(
          (d) => d.namaDriver.toLowerCase() === driverName.toLowerCase()
        );
      }
      if (!target && driverId) {
        target = {
          idUser: driverId,
          namaDriver: driverName || `Driver #${driverId}`,
          platNomor: getPlatForDriver(driverId, driverName),
        };
      }
      if (target) {
        setDrawerDriver(target);
        setDrawerSearch("");
        setDrawerOnlyPhotos(false);
        setSelectedRitaseFilter(null);
        setDrawerSubView("rekap_seller");
      }
    },
    [allPickupDrivers, getPlatForDriver]
  );

  // Driver yang sedang diinspeksi (di tab 'per_driver' atau slide-over drawer)
  const currentDriver = activeMainTab === "fleet_overview" ? drawerDriver : (selectedDriverUser || allPickupDrivers[0] || null);

  // Otomatis sinkronkan driver terpilih jika driverParam dari URL tersedia atau default ke driver aktif pertama
  useEffect(() => {
    if (allPickupDrivers.length > 0 && !selectedDriverUser) {
      if (driverParam) {
        const parsedId = parseInt(driverParam, 10);
        const match = allPickupDrivers.find((d) =>
          !isNaN(parsedId) ? d.idUser === parsedId : d.namaDriver.toLowerCase() === driverParam.toLowerCase()
        );
        if (match) {
          setSelectedDriverUser(match);
          return;
        }
      }
      setSelectedDriverUser(allPickupDrivers[0]);
    }
  }, [driverParam, allPickupDrivers, selectedDriverUser]);

  // Query data riwayat khusus driver yang diinspeksi untuk rentang tanggal yang dipilih
  const {
    data: drawerDriverLogs = [],
    isLoading: isDrawerLogsLoading,
    isFetching: isDrawerLogsFetching,
    refetch: refetchDrawerLogs,
  } = useAllDriverPickupHistory(
    currentDriver?.idUser
      ? {
          id_user: currentDriver.idUser,
          start_date: drawerActiveDateRange.startDate,
          end_date: drawerActiveDateRange.endDate,
          limit: 1000,
        }
      : undefined
  );

  // Kalkulasi statistik muatan driver di Drawer untuk tanggal aktif
  const drawerStats = useMemo(() => {
    let awb = 0;
    let koli = 0;
    let ecer = 0;
    let hv = 0;
    let photos = 0;
    const sellers = new Set<string>();
    let latestStatus = "standby";

    drawerDriverLogs.forEach((l) => {
      awb += l.jumlah_barang || 0;
      koli += l.koli || 0;
      ecer += l.ecer || 0;
      hv += l.high_value || 0;
      if (l.foto_url) photos++;
      if (l.asal_seller && l.asal_seller.toLowerCase() !== "gudang") {
        l.asal_seller.split(",").forEach((s) => {
          const t = s.trim();
          if (t && t.toLowerCase() !== "gudang") sellers.add(t);
        });
      }
    });

    if (drawerDriverLogs.length > 0) {
      latestStatus = drawerDriverLogs[0].status || "standby";
    } else if (currentDriver) {
      const live = driverPickups.find(
        (dp) => dp.id_user === currentDriver.idUser || dp.nama_driver?.toLowerCase() === currentDriver.namaDriver.toLowerCase()
      );
      if (live?.status) latestStatus = live.status;
    }

    return {
      totalAwb: awb,
      totalKoli: koli,
      totalEcer: ecer,
      totalHv: hv,
      totalPhotos: photos,
      totalSellers: sellers.size,
      latestStatus,
      totalSesi: drawerDriverLogs.length,
    };
  }, [drawerDriverLogs, currentDriver, driverPickups]);

  // Breakdown Per Ritase untuk Driver Terpilih
  const driverRitaseBreakdown = useMemo(() => {
    const result: Record<
      RitaseType,
      {
        ritase: RitaseType;
        totalAwb: number;
        totalKoli: number;
        totalEcer: number;
        totalHv: number;
        totalSesi: number;
        sellers: Array<{
          namaSeller: string;
          awb: number;
          koli: number;
          ecer: number;
          hv: number;
          pickupCount: number;
          lastTime?: string;
          fotoUrl?: string;
          status?: string;
          catatan?: string;
        }>;
      }
    > = {
      1: { ritase: 1, totalAwb: 0, totalKoli: 0, totalEcer: 0, totalHv: 0, totalSesi: 0, sellers: [] },
      2: { ritase: 2, totalAwb: 0, totalKoli: 0, totalEcer: 0, totalHv: 0, totalSesi: 0, sellers: [] },
      3: { ritase: 3, totalAwb: 0, totalKoli: 0, totalEcer: 0, totalHv: 0, totalSesi: 0, sellers: [] },
    };

    const sMaps: Record<
      RitaseType,
      Map<
        string,
        {
          namaSeller: string;
          awb: number;
          koli: number;
          ecer: number;
          hv: number;
          pickupCount: number;
          lastTime?: string;
          fotoUrl?: string;
          status?: string;
          catatan?: string;
        }
      >
    > = {
      1: new Map(),
      2: new Map(),
      3: new Map(),
    };

    drawerDriverLogs.forEach((l) => {
      const rit = getRitaseFromLog(l);
      const b = result[rit];
      b.totalAwb += l.jumlah_barang || 0;
      b.totalKoli += l.koli || 0;
      b.totalEcer += l.ecer || 0;
      b.totalHv += l.high_value || 0;
      b.totalSesi += 1;

      const rawSeller = l.asal_seller && l.asal_seller.trim() ? l.asal_seller.trim() : "Gudang Utama";
      const sMap = sMaps[rit];
      const exist = sMap.get(rawSeller) || {
        namaSeller: rawSeller,
        awb: 0,
        koli: 0,
        ecer: 0,
        hv: 0,
        pickupCount: 0,
        lastTime: l.updated_at || l.created_at || l.tanggal,
        fotoUrl: l.foto_url,
        status: l.status,
        catatan: l.catatan,
      };
      exist.awb += l.jumlah_barang || 0;
      exist.koli += l.koli || 0;
      exist.ecer += l.ecer || 0;
      exist.hv += l.high_value || 0;
      exist.pickupCount += 1;
      if (l.foto_url && !exist.fotoUrl) {
        exist.fotoUrl = l.foto_url;
      }
      if (!exist.lastTime && (l.updated_at || l.created_at || l.tanggal)) {
        exist.lastTime = l.updated_at || l.created_at || l.tanggal;
      }
      if (l.catatan && !exist.catatan) {
        exist.catatan = l.catatan;
      }
      sMap.set(rawSeller, exist);
    });

    ([1, 2, 3] as RitaseType[]).forEach((rit) => {
      result[rit].sellers = Array.from(sMaps[rit].values()).sort((a, b) => b.awb - a.awb);
    });

    return result;
  }, [drawerDriverLogs]);

  // Filter list log di dalam Slide-Over Drawer & Riwayat Driver
  const drawerFilteredLogs = useMemo(() => {
    return drawerDriverLogs.filter((log) => {
      if (selectedRitaseFilter !== null && getRitaseFromLog(log) !== selectedRitaseFilter) {
        return false;
      }
      if (drawerOnlyPhotos && !log.foto_url) {
        return false;
      }
      if (drawerSearch.trim()) {
        const q = drawerSearch.toLowerCase().trim();
        const matchSeller = (log.asal_seller || "").toLowerCase().includes(q);
        const matchNote = (log.catatan || "").toLowerCase().includes(q);
        const matchStatus = (log.status || "").toLowerCase().includes(q);
        const matchId = String(log.id_log).includes(q);
        return matchSeller || matchNote || matchStatus || matchId;
      }
      return true;
    });
  }, [drawerDriverLogs, drawerSearch, drawerOnlyPhotos, selectedRitaseFilter]);

  // Hitung jumlah log dengan foto bukti pada driver aktif
  const drawerPhotoCount = drawerStats.totalPhotos;

  // Export to CSV helper
  const handleExportCSV = useCallback(() => {
    if (logs.length === 0) return;

    const headers = [
      "ID Log",
      "Tanggal",
      "Ritase",
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

    const rows = logs.map((item) => {
      const rit = getRitaseFromLog(item);
      const ritLabel = `${RITASE_CONFIG[rit].label} (${RITASE_CONFIG[rit].shortTime})`;
      return [
        item.id_log,
        item.tanggal || "-",
        `"${ritLabel}"`,
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
      ];
    });

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
        crumbs={[{ label: "Riwayat Pickup" }]}
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

      {/* ── Mode Switcher Tab ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Ringkasan Seluruh Armada (Tampil Pertama secara Default) */}
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("fleet_overview");
              setDrawerDriver(null); // Tutup slide-over drawer saat berpindah ke ringkasan armada
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer",
              activeMainTab === "fleet_overview"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-slate-950/10"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
            )}
          >
            <Boxes className="h-4 w-4" />
            <span>Ringkasan Seluruh Armada</span>
          </button>

          {/* Tab 2: Riwayat Per Driver Pickup */}
          <button
            type="button"
            onClick={() => setActiveMainTab("per_driver")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer",
              activeMainTab === "per_driver"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-slate-950/10"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
            )}
          >
            <UserCheck className="h-4 w-4" />
            <span>Riwayat Per Driver Pickup</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                activeMainTab === "per_driver"
                  ? "bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              {allPickupDrivers.length} Driver Aktif
            </span>
          </button>
        </div>

        {activeMainTab === "per_driver" && currentDriver && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Driver Aktif:</span>
            <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              {currentDriver.namaDriver} ({currentDriver.platNomor || getPlatForDriver(currentDriver.idUser, currentDriver.namaDriver)})
            </span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────
       * MODE 1: RIWAYAT PER DRIVER (LANGKAH 1 -> LANGKAH 2 -> LANGKAH 3)
       * ─────────────────────────────────────────────────────────────────── */}
      {activeMainTab === "per_driver" && (
        <div className="space-y-6">
          {/* ── PILIH DRIVER PICKUP AKTIF ── */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Pilih Driver Pickup Aktif
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih driver di bawah untuk melihat rincian tanggal & riwayat muatannya
                  </p>
                </div>
              </div>

              {/* Search Driver */}
              <div className="relative min-w-[200px] max-w-[280px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari driver / plat..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {driverSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDriverSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <CardContent className="p-4">
              {allPickupDrivers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada driver dengan role driver_pickup yang terdaftar aktif.
                </div>
              ) : visibleActiveDrivers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ditemukan driver dengan pencarian &quot;{driverSearchQuery}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {visibleActiveDrivers.map((driver) => {
                    const isSelected = currentDriver?.idUser === driver.idUser;
                    const liveInfo = driverPickups.find((dp) => dp.id_user === driver.idUser);
                    const isOnline = driver.isOnline || Boolean(liveInfo?.session_online);

                    return (
                      <button
                        key={driver.idUser}
                        type="button"
                        onClick={() => {
                          setSelectedDriverUser(driver);
                        }}
                        className={cn(
                          "group relative p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-2.5 cursor-pointer",
                          isSelected
                            ? "border-slate-900 dark:border-slate-100 bg-slate-50/90 dark:bg-slate-800/60 ring-1 ring-slate-900/10 dark:ring-slate-100/10 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                        )}
                      >
                        {/* Top Indicator */}
                        <div className="flex items-center justify-between w-full">
                          <div className="relative">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all",
                                isSelected
                                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              )}
                            >
                              {driver.namaDriver.charAt(0).toUpperCase()}
                            </div>
                            {/* Online Dot */}
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900",
                                isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                              )}
                              title={isOnline ? "Driver Online/Aktif" : "Driver Standby"}
                            />
                          </div>

                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-900 dark:text-white bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded">
                              <CheckCircle2 className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                              <span>Dipilih</span>
                            </span>
                          )}
                        </div>

                        {/* Driver Name & Plate */}
                        <div>
                          <div
                            className={cn(
                              "font-bold text-xs truncate transition-colors",
                              isSelected ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-200"
                            )}
                            title={driver.namaDriver}
                          >
                            {driver.namaDriver}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {driver.platNomor || getPlatForDriver(driver.idUser, driver.namaDriver)}
                          </div>
                        </div>

                        {/* Status Footer */}
                        <div className="w-full pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <span
                            className={cn(
                              "truncate font-medium",
                              isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                            )}
                          >
                            {isOnline ? "Aktif / Online" : "Standby"}
                          </span>
                          <span className="text-slate-400 font-mono text-[9px]">#{driver.idUser}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── PILIH TANGGAL UNTUK DRIVER TERPILIH ── */}
          {currentDriver && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Pilih Tanggal Riwayat untuk <span className="font-extrabold text-slate-900 dark:text-white underline underline-offset-4 decoration-slate-400">{currentDriver.namaDriver}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pilih tanggal di mana Anda ingin memeriksa rincian muatan & bukti pickup driver ini
                    </p>
                  </div>
                </div>

                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Periode: <strong className="text-slate-900 dark:text-white">{selectedDateDisplay}</strong></span>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Tombol Hari Ini */}
                  <button
                    type="button"
                    onClick={() => setDrawerDateMode("today")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                      drawerDateMode === "today"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    <span>Hari Ini</span>
                  </button>

                  {/* Tombol Kemarin */}
                  <button
                    type="button"
                    onClick={() => setDrawerDateMode("yesterday")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                      drawerDateMode === "yesterday"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    <span>Kemarin</span>
                  </button>

                  {/* Tombol Minggu Ini */}
                  <button
                    type="button"
                    onClick={() => setDrawerDateMode("this_week")}
                    className={cn(
                      "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                      drawerDateMode === "this_week"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    <span>Minggu Ini</span>
                  </button>

                  {/* Custom Date Picker */}
                  <div className="relative inline-flex items-center">
                    <input
                      ref={mainDateInputRef}
                      type="date"
                      value={drawerPickedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDrawerPickedDate(e.target.value);
                          setDrawerDateMode("custom_day");
                        }
                      }}
                      className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
                      tabIndex={-1}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (mainDateInputRef.current) {
                          if (typeof mainDateInputRef.current.showPicker === "function") {
                            mainDateInputRef.current.showPicker();
                          } else {
                            mainDateInputRef.current.focus();
                            mainDateInputRef.current.click();
                          }
                        }
                      }}
                      className={cn(
                        "px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                        drawerDateMode === "custom_day"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                      title="Klik untuk memilih tanggal apa saja dari kalender"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {drawerDateMode === "custom_day" ? `Tanggal: ${drawerPickedDate}` : "Pilih Tanggal Lain..."}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => refetchDrawerLogs()}
                    disabled={isDrawerLogsFetching}
                    className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isDrawerLogsFetching && "animate-spin text-slate-500")} />
                    <span>Segarkan</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── RIWAYAT & METRIK MUATAN TERPILIH ── */}
          {currentDriver && (
            <div className="space-y-5">
              {/* Profile & Metric Summary Card */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-base flex items-center justify-center shadow-xs">
                      {currentDriver.namaDriver.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {currentDriver.namaDriver}
                        </h2>
                        {renderStatusBadge(drawerStats.latestStatus)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <Truck className="h-3 w-3 text-slate-500" />
                          {currentDriver.platNomor || getPlatForDriver(currentDriver.idUser, currentDriver.namaDriver)}
                        </span>
                        <span>•</span>
                        <span>Periode: <strong>{selectedDateDisplay}</strong></span>
                        {currentDriver.noHp && (
                          <>
                            <span>•</span>
                            <a
                              href={`https://wa.me/${currentDriver.noHp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                            >
                              <Phone className="h-3 w-3" />
                              {currentDriver.noHp}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter Toolbar dalam Riwayat */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari toko seller..."
                        value={drawerSearch}
                        onChange={(e) => setDrawerSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      {drawerSearch && (
                        <button
                          type="button"
                          onClick={() => setDrawerSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDrawerOnlyPhotos(!drawerOnlyPhotos)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer",
                        drawerOnlyPhotos
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Hanya Foto ({drawerStats.totalPhotos})</span>
                    </button>
                  </div>
                </div>

                {/* 4 Metrik Box */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Muatan</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {drawerStats.totalAwb.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs text-slate-400">AWB</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Koli & Ecer</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {drawerStats.totalKoli}
                      </span>
                      <span className="text-xs text-slate-400">Koli • {drawerStats.totalEcer} Ecer</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Toko Disambangi</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {drawerStats.totalSellers}
                      </span>
                      <span className="text-xs text-slate-400">Toko Seller</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sesi & Bukti</span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {drawerStats.totalSesi}
                      </span>
                      <span className="text-xs text-slate-400">Sesi • {drawerStats.totalPhotos} Foto</span>
                    </div>
                  </div>
                </div>

                {/* ── BREAKDOWN PER RITASE (RITASE 1, 2, 3) ── */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Pembagian Ritase / Kloter Jam Pickup
                      </h4>
                    </div>
                    {selectedRitaseFilter !== null && (
                      <button
                        type="button"
                        onClick={() => setSelectedRitaseFilter(null)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                      >
                        Tampilkan Semua Ritase
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {([1, 2, 3] as RitaseType[]).map((rit) => {
                      const cfg = RITASE_CONFIG[rit];
                      const b = driverRitaseBreakdown[rit];
                      const isSelected = selectedRitaseFilter === rit;

                      return (
                        <div
                          key={rit}
                          onClick={() => setSelectedRitaseFilter(isSelected ? null : rit)}
                          className={cn(
                            "group p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                            isSelected
                              ? "border-slate-900 dark:border-slate-100 bg-slate-50/90 dark:bg-slate-800/60 ring-1 ring-slate-900/10 dark:ring-slate-100/10 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  isSelected
                                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                )}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {cfg.shortTime} WIB
                              </span>
                            </div>

                            {isSelected ? (
                              <span className="text-[10px] font-semibold text-slate-900 dark:text-white bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Filter Aktif</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                Klik untuk filter
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {b.totalAwb.toLocaleString("id-ID")}
                              </span>
                              <span className="text-xs text-slate-400">AWB</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>{b.totalKoli} Koli</span>
                              <span>•</span>
                              <span>{b.totalEcer} Ecer</span>
                              <span>•</span>
                              <span>{b.totalSesi} Sesi</span>
                            </div>
                          </div>

                          {/* Daftar Toko Seller pada Ritase ini */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Toko Seller ({b.sellers.length}):
                            </span>
                            {b.sellers.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">
                                Belum ada pickup di kloter ini
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {b.sellers.slice(0, 4).map((s) => (
                                  <span
                                    key={s.namaSeller}
                                    className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded truncate max-w-[140px]"
                                    title={`${s.namaSeller}: ${s.awb} AWB (${s.koli} Koli, ${s.ecer} Ecer)`}
                                  >
                                    {s.namaSeller} ({s.awb})
                                  </span>
                                ))}
                                {b.sellers.length > 4 && (
                                  <span className="text-[10px] font-semibold text-slate-400 self-center">
                                    +{b.sellers.length - 4} toko lagi
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Chronological Timeline Feed */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>
                        Timeline Aktivitas Pickup ({drawerFilteredLogs.length} Transaksi)
                        {selectedRitaseFilter && ` • ${RITASE_CONFIG[selectedRitaseFilter].label}`}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      Diurutkan dari transaksi terbaru
                    </span>
                  </div>

                  {/* Ritase Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedRitaseFilter(null)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                        selectedRitaseFilter === null
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      )}
                    >
                      Semua Ritase
                    </button>
                    {([1, 2, 3] as RitaseType[]).map((rit) => {
                      const cfg = RITASE_CONFIG[rit];
                      const b = driverRitaseBreakdown[rit];
                      const isSel = selectedRitaseFilter === rit;

                      return (
                        <button
                          key={rit}
                          type="button"
                          onClick={() => setSelectedRitaseFilter(isSel ? null : rit)}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                            isSel
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          )}
                        >
                          <span>{cfg.label}</span>
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-bold",
                              isSel
                                ? "bg-slate-800 text-slate-200 dark:bg-slate-200 dark:text-slate-800"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            )}
                          >
                            {b.totalAwb}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isDrawerLogsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                  </div>
                ) : drawerFilteredLogs.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                    <PackageCheck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2.5 opacity-60" />
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Tidak Ada Riwayat Pickup
                    </p>
                    <p className="text-xs mt-1 text-slate-500 max-w-sm mx-auto">
                      Tidak ditemukan catatan aktivitas pickup untuk <strong>{currentDriver.namaDriver}</strong> pada periode {selectedDateDisplay}.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawerDateMode("today")}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs cursor-pointer"
                      >
                        Cek Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerDateMode("yesterday")}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Cek Kemarin
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
                    {drawerFilteredLogs.map((logItem) => (
                      <div key={logItem.id_log} className="relative group">
                        {/* Bullet Node */}
                        <div className="absolute -left-[31px] top-2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-slate-900 dark:bg-slate-100 shadow-xs" />

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/70 transition-all shadow-xs space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {logItem.asal_seller || "Gudang Utama"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  <Layers className="h-3 w-3 text-slate-400" />
                                  <span>{RITASE_CONFIG[getRitaseFromLog(logItem)].label}</span>
                                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({RITASE_CONFIG[getRitaseFromLog(logItem)].shortTime} WIB)</span>
                                </span>
                                {(logItem.plat_nomor || currentDriver.platNomor) && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    • {logItem.plat_nomor || currentDriver.platNomor}
                                  </span>
                                )}
                              </div>
                            </div>
                            {renderStatusBadge(logItem.status)}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {logItem.updated_at
                                ? new Date(logItem.updated_at).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : logItem.tanggal || "-"}
                            </span>
                            <span>•</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              +{logItem.jumlah_barang} AWB
                            </span>
                            <span className="text-[11px]">
                              ({logItem.koli || 0} Koli, {logItem.ecer || 0} Ecer
                              {logItem.high_value ? `, ${logItem.high_value} HV` : ""})
                            </span>
                          </div>

                          {logItem.catatan && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                              &quot;{logItem.catatan}&quot;
                            </p>
                          )}

                          {/* Foto Bukti Pickup Preview */}
                          {logItem.foto_url && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <Camera className="h-3.5 w-3.5 text-blue-500" />
                                  Foto Bukti Pickup
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxPhoto({
                                      url: logItem.foto_url!,
                                      title: `${logItem.asal_seller || "Gudang"} - ${currentDriver.namaDriver}`,
                                      subtitle: `${logItem.tanggal || ""} ${
                                        logItem.updated_at
                                          ? new Date(logItem.updated_at).toLocaleTimeString("id-ID")
                                          : ""
                                      }`,
                                      awb: logItem.jumlah_barang,
                                      koli: logItem.koli,
                                      ecer: logItem.ecer,
                                      hv: logItem.high_value,
                                    })
                                  }
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                                >
                                  Perbesar Foto
                                </button>
                              </div>
                              <div
                                onClick={() =>
                                  setLightboxPhoto({
                                    url: logItem.foto_url!,
                                    title: `${logItem.asal_seller || "Gudang"} - ${currentDriver.namaDriver}`,
                                    subtitle: `${logItem.tanggal || ""} ${
                                      logItem.updated_at
                                        ? new Date(logItem.updated_at).toLocaleTimeString("id-ID")
                                        : ""
                                    }`,
                                    awb: logItem.jumlah_barang,
                                    koli: logItem.koli,
                                    ecer: logItem.ecer,
                                    hv: logItem.high_value,
                                  })
                                }
                                className="relative group/pic cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 max-w-sm aspect-video flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition-all shadow-sm"
                              >
                                <img
                                  src={getFullPhotoUrl(logItem.foto_url)}
                                  alt={`Bukti pickup ${logItem.asal_seller}`}
                                  className="w-full h-full object-cover group-hover/pic:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                  <ZoomIn className="h-5 w-5 drop-shadow" />
                                  <span className="text-xs font-semibold drop-shadow">Buka Foto Penuh</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
       * MODE 2: RINGKASAN SELURUH ARMADA (FLEET OVERVIEW)
       * ─────────────────────────────────────────────────────────────────── */}
      {activeMainTab === "fleet_overview" && (
        <div className="space-y-6">
          {/* ── 1. Top Date Filter Toolbar Terstandarisasi ── */}
          <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    Periode:
                  </span>

                  {/* Tombol Hari Ini */}
                  <button
                    type="button"
                    onClick={() => setDateMode("today")}
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
                    type="button"
                    onClick={() => setDateMode("yesterday")}
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
                    type="button"
                    onClick={() => setDateMode("this_week")}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      dateMode === "this_week"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    Minggu Ini
                  </button>

                  {/* Tombol Bulan Ini */}
                  <button
                    type="button"
                    onClick={() => setDateMode("this_month")}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      dateMode === "this_month"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    Bulan Ini
                  </button>

                  {/* Tombol 30 Hari */}
                  <button
                    type="button"
                    onClick={() => setDateMode("last_30d")}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      dateMode === "last_30d"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    30 Hari
                  </button>

                  {/* Tombol Pilih Rentang */}
                  <button
                    type="button"
                    onClick={() => setDateMode(dateMode === "custom" ? "today" : "custom")}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                      dateMode === "custom"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                    title="Atur rentang tanggal spesifik"
                  >
                    <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
                    <span>Pilih Rentang</span>
                  </button>
                </div>

                {/* Tanggal Aktif Indicator */}
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Periode Aktif: <strong className="text-slate-900 dark:text-white font-semibold">{activeDateRange.label}</strong></span>
                </div>
              </div>

              {/* Inline Rentang Kustom */}
              {dateMode === "custom" && (
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
                            value={customStart}
                            onChange={(e) => {
                              setCustomStart(e.target.value);
                              setDateMode("custom");
                            }}
                            className="bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-none text-xs"
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">s/d</span>
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 px-3 py-1.5 text-xs">
                          <span className="text-[11px] font-medium text-slate-400">Sampai:</span>
                          <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => {
                              setCustomEnd(e.target.value);
                              setDateMode("custom");
                            }}
                            className="bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-none text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStart(todayStr);
                          setCustomEnd(todayStr);
                          setDateMode("today");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium"
                      >
                        Reset Rentang
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

      {/* ── 1.5 Rekapitulasi Ritase Armada Harian (Ritase 1, 2, 3) ── */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Rekapitulasi Ritase Armada Harian
            </h3>
            {fleetRitaseFilter !== null && (
              <span className="text-[11px] font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Filter: {RITASE_CONFIG[fleetRitaseFilter].label} Aktif
              </span>
            )}
          </div>
          {fleetRitaseFilter !== null && (
            <button
              type="button"
              onClick={() => setFleetRitaseFilter(null)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              Reset / Tampilkan Semua Ritase
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([1, 2, 3] as RitaseType[]).map((rit) => {
            const cfg = RITASE_CONFIG[rit];
            const b = fleetRitaseBreakdown[rit];
            const isSelected = fleetRitaseFilter === rit;

            return (
              <button
                key={rit}
                type="button"
                onClick={() => setFleetRitaseFilter(isSelected ? null : rit)}
                className={cn(
                  "group p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3",
                  isSelected
                    ? "border-slate-900 dark:border-slate-100 bg-slate-50/90 dark:bg-slate-800/70 ring-1 ring-slate-900/10 dark:ring-slate-100/10 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-xs"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        isSelected
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {cfg.shortTime} WIB
                    </span>
                  </div>
                  {isSelected ? (
                    <span className="text-[10px] font-semibold text-slate-900 dark:text-white bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Filter Aktif</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Klik untuk filter
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {b.totalAwb.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">AWB</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>{b.sellers.size} Toko Seller</span>
                    <span>•</span>
                    <span>{b.drivers.size} Driver</span>
                    <span>•</span>
                    <span>{b.totalLogs} Transaksi</span>
                  </div>
                </div>

                {/* Seller Preview Chips & Tombol Rincian Lengkap */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 w-full">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Seller Terpickup ({b.sellers.size}):
                    </span>
                    {b.sellers.size > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalRitaseDetail(rit);
                          setModalRitaseSearch("");
                        }}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Buka rincian lengkap seluruh toko seller pada ritase ini"
                      >
                        Lihat Rincian ({b.sellers.size} Toko) ↗
                      </span>
                    )}
                  </div>
                  {b.sellers.size === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">
                      Belum ada pickup pada kloter ini
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Array.from(b.sellers.values()).slice(0, 3).map((s) => (
                        <span
                          key={s.namaSeller}
                          className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded truncate max-w-[130px]"
                          title={`${s.namaSeller}: ${s.awb} AWB (${s.koli} Koli)`}
                        >
                          {s.namaSeller} ({s.awb})
                        </span>
                      ))}
                      {b.sellers.size > 3 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalRitaseDetail(rit);
                            setModalRitaseSearch("");
                          }}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 self-center hover:underline cursor-pointer"
                        >
                          +{b.sellers.size - 3} lainnya ↗
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

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

            {/* Quick Driver Selector Dropdown (Seluruh Driver Pickup) */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={drawerDriver ? drawerDriver.idUser : ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val) {
                      openDriverDrawer(val);
                    }
                  }}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all max-w-[240px] truncate"
                  aria-label="Pilih driver pickup untuk melihat riwayat"
                >
                  <option value="">👤 Pilih Driver Pickup...</option>
                  {allPickupDrivers.map((d) => (
                    <option key={d.idUser} value={d.idUser}>
                      {d.namaDriver} {d.isOnline ? "🟢 (Aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>
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
                    onClick={() => openDriverDrawer(driver.idUser, driver.namaDriver)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
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
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold border border-slate-200 dark:border-slate-700">
                                <Truck className="h-3 w-3 text-slate-500" /> {getPlatForDriver(driver.idUser, driver.namaDriver)}
                              </span>
                              <span className="text-[10px] text-slate-400">• {driver.totalSesi} Sesi Pickup</span>
                            </div>
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
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Sesi Pickup</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {driver.totalSesi} Sesi
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Rata-rata/Toko</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {driver.sellersCount > 0 ? Math.round(driver.totalAwb / driver.sellersCount) : 0} AWB
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
                        onClick={(e) => {
                          e.stopPropagation();
                          openDriverDrawer(driver.idUser, driver.namaDriver);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 transition-all shadow-sm"
                      >
                        <span>Buka Riwayat</span>
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
                Log Transaksi Pickup ({effectiveFleetLogs.length} Baris)
                {fleetRitaseFilter && ` • ${RITASE_CONFIG[fleetRitaseFilter].label}`}
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Ritase</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Armada / Plat</th>
                  <th className="py-3 px-4">Asal Seller / Titik</th>
                  <th className="py-3 px-4 text-center">Total AWB</th>
                  <th className="py-3 px-4">Rincian Paket</th>
                  <th className="py-3 px-4 text-center">Foto Bukti</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {effectiveFleetLogs.map((item) => (
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                        {RITASE_CONFIG[getRitaseFromLog(item)].label}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDriverDrawer(item.id_user, item.nama_driver);
                        }}
                        className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors group/d"
                        title="Klik untuk membuka slide panel riwayat driver"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400 group-hover/d:text-blue-500" />
                        <span>{item.nama_driver}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 text-[11px] font-mono font-bold border border-slate-200 dark:border-slate-700">
                        <Truck className="h-3 w-3 text-slate-500" />
                        {getPlatForDriver(item.id_user, item.nama_driver)}
                      </span>
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
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.foto_url ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxPhoto({
                              url: item.foto_url!,
                              title: `${item.asal_seller || "Gudang"} - ${item.nama_driver}`,
                              subtitle: `${item.tanggal || ""} ${item.updated_at ? new Date(item.updated_at).toLocaleTimeString("id-ID") : ""}`,
                              awb: item.jumlah_barang,
                              koli: item.koli,
                              ecer: item.ecer,
                              hv: item.high_value,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 text-slate-700 dark:text-slate-200 transition-all shadow-sm group/pic"
                          title="Lihat foto bukti pickup"
                        >
                          <Camera className="h-3.5 w-3.5 text-blue-500 group-hover/pic:scale-110 transition-transform" />
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Foto</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-500">
                      {item.catatan || "-"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDriverDrawer(item.id_user, item.nama_driver);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                          title="Buka Slide Panel Riwayat Driver"
                        >
                          Riwayat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )}

      {/* ───────────────────────────────────────────────────────────────────
       * SLIDE-OVER DRAWER: PANEL RIWAYAT DRIVER PICKUP & BUKTI FOTO (KANAN)
       * (Ditampilkan saat mode Ringkasan Armada jika kartu driver diklik)
       * ─────────────────────────────────────────────────────────────────── */}
      {drawerDriver && activeMainTab === "fleet_overview" && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setDrawerDriver(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <div
              className="w-screen max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header: Profil Driver & Plat */}
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-sm flex items-center justify-center shadow-xs">
                    {drawerDriver.namaDriver.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {drawerDriver.namaDriver}
                      </h3>
                      {renderStatusBadge(drawerStats.latestStatus)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300">
                        <Truck className="h-3 w-3 text-slate-400" />
                        {getPlatForDriver(drawerDriver.idUser, drawerDriver.namaDriver)}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {drawerActiveDateRange.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {allPickupDrivers.length > 1 && (
                    <select
                      value={drawerDriver.idUser}
                      onChange={(e) => {
                        const uid = parseInt(e.target.value, 10);
                        if (uid) openDriverDrawer(uid);
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
                      title="Ganti driver yang diinspeksi"
                    >
                      {allPickupDrivers.map((d) => (
                        <option key={d.idUser} value={d.idUser}>
                          {d.namaDriver}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => setDrawerDriver(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    title="Tutup Panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Strip Tanggal & Ringkasan Cepat */}
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDrawerDateMode("today")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                      drawerDateMode === "today"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerDateMode("yesterday")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                      drawerDateMode === "yesterday"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    Kemarin
                  </button>
                  <div className="relative inline-flex items-center">
                    <input
                      ref={drawerDateInputRef}
                      type="date"
                      value={drawerPickedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDrawerPickedDate(e.target.value);
                          setDrawerDateMode("custom_day");
                        }
                      }}
                      className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
                      tabIndex={-1}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (drawerDateInputRef.current) {
                          if (typeof drawerDateInputRef.current.showPicker === "function") {
                            drawerDateInputRef.current.showPicker();
                          } else {
                            drawerDateInputRef.current.focus();
                            drawerDateInputRef.current.click();
                          }
                        }
                      }}
                      className={cn(
                        "px-2 py-1 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 border cursor-pointer",
                        drawerDateMode === "custom_day"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{drawerDateMode === "custom_day" ? drawerPickedDate : "Pilih..."}</span>
                    </button>
                  </div>
                </div>

                {/* KPI Total Cepat */}
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div>
                    Total: <strong className="text-sm font-extrabold text-slate-900 dark:text-white">{drawerStats.totalAwb.toLocaleString("id-ID")}</strong> AWB
                  </div>
                  {drawerStats.totalKoli > 0 && (
                    <div>• <span>{drawerStats.totalKoli} Koli</span></div>
                  )}
                  {drawerPhotoCount > 0 && (
                    <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      <span>{drawerPhotoCount} Foto</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Ritase Pills */}
              <div className="px-5 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedRitaseFilter(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                    selectedRitaseFilter === null
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  <span>Semua Ritase</span>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold",
                    selectedRitaseFilter === null ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}>
                    {drawerStats.totalAwb}
                  </span>
                </button>

                {([1, 2, 3] as RitaseType[]).map((rit) => {
                  const cfg = RITASE_CONFIG[rit];
                  const b = driverRitaseBreakdown[rit];
                  const isSel = selectedRitaseFilter === rit;

                  return (
                    <button
                      key={rit}
                      type="button"
                      onClick={() => setSelectedRitaseFilter(isSel ? null : rit)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0",
                        isSel
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      )}
                      title={`${cfg.label} (${cfg.timeRange}): ${b.totalAwb} AWB dari ${b.sellers.length} toko`}
                    >
                      <span>{cfg.label}</span>
                      <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold",
                        isSel ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                      )}>
                        {b.totalAwb}
                      </span>
                      {b.sellers.length > 0 && (
                        <span className={cn("text-[10px] font-medium", isSel ? "text-slate-300 dark:text-slate-700" : "text-slate-400")}>
                          ({b.sellers.length} Toko)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Controls: Search & Sub-View Switcher (Rekap Seller vs Timeline) */}
              <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari toko seller..."
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  {drawerSearch && (
                    <button
                      onClick={() => setDrawerSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDrawerOnlyPhotos((prev) => !prev)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all border cursor-pointer",
                      drawerOnlyPhotos
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                    title="Filter hanya yang memiliki foto bukti"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Foto ({drawerPhotoCount})</span>
                  </button>

                  {/* Mode Tab Switcher */}
                  <div className="flex items-center bg-slate-200/80 dark:bg-slate-700 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDrawerSubView("rekap_seller")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                        drawerSubView === "rekap_seller"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                      title="Rekap ringkas per toko seller"
                    >
                      <Store className="h-3.5 w-3.5" />
                      <span>Rekap Toko</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerSubView("timeline")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                        drawerSubView === "timeline"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                      title="Timeline kronologis log aktivitas"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Timeline</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isDrawerLogsLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                    <RefreshCw className="h-7 w-7 mx-auto animate-spin text-slate-400" />
                    <p className="font-medium">Mengambil riwayat muatan {drawerDriver.namaDriver}...</p>
                  </div>
                ) : drawerFilteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <PackageCheck className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      Tidak Ada Riwayat Pickup
                    </p>
                    <p className="text-[11px] mt-1 text-slate-500 max-w-xs mx-auto">
                      Belum ada catatan aktivitas pickup untuk <strong className="text-slate-700 dark:text-slate-300">{drawerDriver.namaDriver}</strong> pada periode {drawerActiveDateRange.label}.
                    </p>
                  </div>
                ) : drawerSubView === "rekap_seller" ? (
                  /* ── TAMPILAN 1: REKAP TOKO SELLER (COMPACT & FAST SCANNING) ── */
                  <div className="space-y-4">
                    {([3, 2, 1] as RitaseType[])
                      .filter((rit) => selectedRitaseFilter === null || selectedRitaseFilter === rit)
                      .map((rit) => {
                        const cfg = RITASE_CONFIG[rit];
                        const sellersInRit = driverRitaseBreakdown[rit].sellers.filter((s) => {
                          if (drawerOnlyPhotos && !s.fotoUrl) return false;
                          if (drawerSearch.trim()) {
                            return s.namaSeller.toLowerCase().includes(drawerSearch.toLowerCase().trim());
                          }
                          return true;
                        });

                        if (sellersInRit.length === 0) return null;

                        const totalAwbInRit = sellersInRit.reduce((acc, s) => acc + s.awb, 0);

                        return (
                          <div key={rit} className="space-y-2">
                            {/* Ritase Group Header */}
                            <div className="flex items-center justify-between px-1 py-1 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                                  {cfg.label}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {cfg.shortTime} WIB
                                </span>
                                <span className="text-xs text-slate-400">
                                  • {sellersInRit.length} Toko Seller
                                </span>
                              </div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {totalAwbInRit.toLocaleString("id-ID")} AWB
                              </div>
                            </div>

                            {/* Seller Rows */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                              {sellersInRit.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <Store className="h-4 w-4 text-slate-500 shrink-0" />
                                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {s.namaSeller}
                                      </span>
                                      {s.pickupCount > 1 && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                          {s.pickupCount}x Pickup
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                      {s.lastTime && (
                                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                          🕒 {new Date(s.lastTime).toLocaleTimeString("id-ID", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })} WIB
                                        </span>
                                      )}
                                      {(s.koli > 0 || s.ecer > 0) && (
                                        <>
                                          <span>•</span>
                                          <span>{s.koli} Koli, {s.ecer} Ecer</span>
                                        </>
                                      )}
                                      {s.catatan && (
                                        <>
                                          <span>•</span>
                                          <span className="italic truncate max-w-[180px] text-slate-400">&quot;{s.catatan}&quot;</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {/* AWB Big Badge */}
                                    <div className="text-right">
                                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                        +{s.awb.toLocaleString("id-ID")}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 block -mt-1">
                                        AWB
                                      </span>
                                    </div>

                                    {/* Foto Thumbnail / Button */}
                                    {s.fotoUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setLightboxPhoto({
                                          url: s.fotoUrl!,
                                          title: `${s.namaSeller} - ${drawerDriver.namaDriver}`,
                                          subtitle: `${drawerActiveDateRange.label} • ${s.awb} AWB`,
                                          awb: s.awb,
                                          koli: s.koli,
                                          ecer: s.ecer,
                                        })}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                                        title="Lihat foto bukti pickup"
                                      >
                                        <Camera className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  /* ── TAMPILAN 2: TIMELINE AUDIT KRONOLOGIS ── */
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3.5 pl-5 space-y-5">
                    {drawerFilteredLogs.map((logItem) => (
                      <div key={logItem.id_log} className="relative group">
                        {/* Timeline Bullet Node */}
                        <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-slate-900 dark:bg-slate-100 shadow-sm" />

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all shadow-sm space-y-2.5">
                          {/* Stop Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-slate-500" />
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {logItem.asal_seller || "Gudang Utama"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  <Layers className="h-3 w-3 text-slate-400" />
                                  <span>{RITASE_CONFIG[getRitaseFromLog(logItem)].label}</span>
                                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({RITASE_CONFIG[getRitaseFromLog(logItem)].shortTime} WIB)</span>
                                </span>
                              </div>
                            </div>
                            {renderStatusBadge(logItem.status)}
                          </div>

                          {/* Time & Volume Stats */}
                          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {logItem.updated_at
                                ? new Date(logItem.updated_at).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : logItem.tanggal || "-"}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              +{logItem.jumlah_barang} AWB
                            </span>
                            <span className="text-[11px]">
                              ({logItem.koli || 0} Koli, {logItem.ecer || 0} Ecer
                              {logItem.high_value ? `, ${logItem.high_value} HV` : ""})
                            </span>
                          </div>

                          {/* Remarks */}
                          {logItem.catatan && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                              &quot;{logItem.catatan}&quot;
                            </p>
                          )}

                          {/* Foto Bukti Pickup Preview */}
                          {logItem.foto_url && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <Camera className="h-3.5 w-3.5 text-blue-500" />
                                  Foto Bukti Pickup
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLightboxPhoto({
                                    url: logItem.foto_url!,
                                    title: `${logItem.asal_seller || "Gudang"} - ${drawerDriver.namaDriver}`,
                                    subtitle: `${logItem.tanggal || ""} ${logItem.updated_at ? new Date(logItem.updated_at).toLocaleTimeString("id-ID") : ""}`,
                                    awb: logItem.jumlah_barang,
                                    koli: logItem.koli,
                                    ecer: logItem.ecer,
                                    hv: logItem.high_value,
                                  })}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                >
                                  Perbesar Foto
                                </button>
                              </div>
                              <div
                                onClick={() => setLightboxPhoto({
                                  url: logItem.foto_url!,
                                  title: `${logItem.asal_seller || "Gudang"} - ${drawerDriver.namaDriver}`,
                                  subtitle: `${logItem.tanggal || ""} ${logItem.updated_at ? new Date(logItem.updated_at).toLocaleTimeString("id-ID") : ""}`,
                                  awb: logItem.jumlah_barang,
                                  koli: logItem.koli,
                                  ecer: logItem.ecer,
                                  hv: logItem.high_value,
                                })}
                                className="relative group/pic cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-video flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition-all shadow-sm"
                              >
                                <img
                                  src={getFullPhotoUrl(logItem.foto_url)}
                                  alt={`Bukti pickup ${logItem.asal_seller}`}
                                  className="w-full h-full object-cover group-hover/pic:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                  <ZoomIn className="h-5 w-5 drop-shadow" />
                                  <span className="text-xs font-semibold drop-shadow">Buka Foto Penuh</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total {drawerDriverLogs.length} catatan pada {drawerActiveDateRange.label}
                </span>
                <button
                  onClick={() => setDrawerDriver(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
                >
                  Tutup Panel
                </button>
              </div>
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
              <p><strong>Armada / Kendaraan:</strong> <span className="font-mono font-bold">{getPlatForDriver(modalLogDetail.id_user, modalLogDetail.nama_driver)}</span></p>
              <p><strong>Titik:</strong> {modalLogDetail.asal_seller}</p>
              <p><strong>Total AWB:</strong> {modalLogDetail.jumlah_barang} AWB</p>
              <p><strong>Rincian:</strong> {modalLogDetail.koli || 0} Koli, {modalLogDetail.ecer || 0} Ecer, {modalLogDetail.high_value || 0} HV</p>
              <p><strong>Status:</strong> {modalLogDetail.status}</p>
              <p><strong>Waktu:</strong> {modalLogDetail.tanggal} {modalLogDetail.updated_at}</p>
              {modalLogDetail.catatan && <p><strong>Catatan:</strong> {modalLogDetail.catatan}</p>}

              {modalLogDetail.foto_url && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-blue-500" />
                    Foto Bukti Pickup:
                  </span>
                  <div
                    onClick={() => setLightboxPhoto({
                      url: modalLogDetail.foto_url!,
                      title: `${modalLogDetail.asal_seller || "Gudang"} - ${modalLogDetail.nama_driver}`,
                      subtitle: `${modalLogDetail.tanggal} ${modalLogDetail.updated_at || ""}`,
                      awb: modalLogDetail.jumlah_barang,
                      koli: modalLogDetail.koli,
                      ecer: modalLogDetail.ecer,
                      hv: modalLogDetail.high_value,
                    })}
                    className="cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-video flex items-center justify-center group relative"
                  >
                    <img
                      src={getFullPhotoUrl(modalLogDetail.foto_url)}
                      alt="Foto Bukti"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                      <ZoomIn className="h-4 w-4" />
                      <span className="text-[11px] font-semibold">Perbesar</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalLogDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
       * LIGHTBOX MODAL: PREVIEW FOTO BUKTI PICKUP
       * ─────────────────────────────────────────────────────────────────── */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-white truncate">
                  {lightboxPhoto.title}
                </h3>
                {lightboxPhoto.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lightboxPhoto.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getFullPhotoUrl(lightboxPhoto.url)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Unduh / Buka Asli"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Photo Viewer */}
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-3 sm:p-6 min-h-[300px]">
              <img
                src={getFullPhotoUrl(lightboxPhoto.url)}
                alt="Foto Bukti Pickup"
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>

            {/* Footer with Details */}
            {lightboxPhoto.awb !== undefined && (
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">
                    Muatan: {lightboxPhoto.awb} AWB
                  </span>
                  <span>
                    ({lightboxPhoto.koli || 0} Koli, {lightboxPhoto.ecer || 0} Ecer, {lightboxPhoto.hv || 0} HV)
                  </span>
                </div>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all text-xs"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
       * MODAL DIALOG: RINCIAN LENGKAP SELLER PER RITASE (OPSI 1)
       * ─────────────────────────────────────────────────────────────────── */}
      {modalRitaseDetail !== null && (() => {
        const rit = modalRitaseDetail;
        const cfg = RITASE_CONFIG[rit];
        const b = fleetRitaseBreakdown[rit];
        const sellerList = Array.from(b.sellers.values())
          .sort((x, y) => y.awb - x.awb)
          .filter((s) => {
            if (!modalRitaseSearch.trim()) return true;
            return s.namaSeller.toLowerCase().includes(modalRitaseSearch.toLowerCase().trim());
          });

        const handleExportRitaseCSV = () => {
          const rows = [
            ["No", "Nama Toko Seller", "Ritase", "Volume AWB", "Driver Bertugas"],
          ];
          const sorted = Array.from(b.sellers.values()).sort((x, y) => y.awb - x.awb);
          sorted.forEach((s, idx) => {
            rows.push([
              String(idx + 1),
              s.namaSeller,
              cfg.label,
              String(s.awb),
              Array.from(s.drivers).join("; "),
            ]);
          });
          const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `Laporan_${cfg.label.replace(/\s+/g, "_")}_${activeDateRange.label.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setModalRitaseDetail(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs">
                      {cfg.label}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Rincian Seller & AWB ({cfg.timeRange})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Periode: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activeDateRange.label}</strong> • {cfg.desc}
                  </p>
                </div>
                <button
                  onClick={() => setModalRitaseDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* KPI Strip */}
              <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Volume</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {b.totalAwb.toLocaleString("id-ID")} AWB
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Toko Seller</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {b.sellers.size} Toko
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Driver Bertugas</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {b.drivers.size} Driver
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Transaksi</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {b.totalLogs} Log
                  </span>
                </div>
              </div>

              {/* Search Inside Modal & Action */}
              <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari toko seller di ritase ini..."
                    value={modalRitaseSearch}
                    onChange={(e) => setModalRitaseSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  {modalRitaseSearch && (
                    <button
                      onClick={() => setModalRitaseSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                    {sellerList.length} dari {b.sellers.size} toko
                  </span>
                  <button
                    type="button"
                    onClick={handleExportRitaseCSV}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Unduh data ritase ini ke format CSV"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {sellerList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <Store className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      Tidak Ada Toko Seller Ditemukan
                    </p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      {modalRitaseSearch ? `Tidak ada toko seller yang cocok dengan kata kunci "${modalRitaseSearch}".` : "Belum ada catatan pickup pada ritase ini."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-4">Nama Toko Seller</th>
                          <th className="py-2.5 px-4 text-right">Volume AWB</th>
                          <th className="py-2.5 px-4">Driver yang Ambil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {sellerList.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-400 text-center">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-slate-500 shrink-0" />
                                <span className="text-sm">{s.namaSeller}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                {s.awb.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 ml-1">
                                AWB
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {Array.from(s.drivers).map((dr, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                                  >
                                    {dr}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total {b.sellers.size} toko seller terdaftar di {cfg.label}
                </span>
                <button
                  onClick={() => setModalRitaseDetail(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function RiwayatPickupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Memuat riwayat pickup...</div>}>
      <RiwayatPickupContent />
    </Suspense>
  );
}
