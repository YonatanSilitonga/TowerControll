"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Camera,
  Search,
  Download,
  X,
  Truck,
  User,
  Package,
  Clock,
  MapPin,
  RefreshCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Rows3,
  Images,
  Timer,
  ShieldCheck,
  Calendar,
  Filter,
} from "lucide-react";
import { useManifestPhotos } from "@/hooks/use-manifest-photos";
import { useDriver } from "@/hooks/use-armada";
import { getFullPhotoUrl } from "@/lib/constants";
import { formatDateTime, formatDur, cn } from "@/lib/utils";
import type { ManifestPhotoItem, DriverArmada } from "@/types/armada";

/* ──────────── types ──────────── */

type ViewMode = "ritase" | "grid" | "timeline";

interface RitaseGroup {
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  ritase_ke: number;
  id_driver: number;
  nama_driver: string;
  nopol: string;
  totalKoli: number;
  totalEcer: number;
  totalHV: number;
  photos: ManifestPhotoItem[];
}

interface DriverGroup {
  id_driver: number;
  nama_driver: string;
  nopol: string;
  totalKoli: number;
  totalEcer: number;
  totalHV: number;
  ritaseCount: number;
  photos: ManifestPhotoItem[];
}

function formatCustomDateDisplay(dateStr: string) {
  if (!dateStr || dateStr === "all") return "Pilih";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/* ──────────── page ──────────── */

export default function ManifestFotoPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<ManifestPhotoItem | null>(
    null,
  );
  const [activePhotoList, setActivePhotoList] = useState<ManifestPhotoItem[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("ritase");
  const [expandedDrivers, setExpandedDrivers] = useState<Set<number>>(new Set());

  const customDateInputRef = useRef<HTMLInputElement>(null);

  const { data: drivers = [] } = useDriver();

  const filterParam = useMemo(
    () => ({
      tanggal: selectedDate === "all" ? undefined : selectedDate,
      driver_id: selectedDriverId === "all" ? null : Number(selectedDriverId),
      search: searchQuery.trim() || undefined,
    }),
    [selectedDate, selectedDriverId, searchQuery],
  );

  const {
    data: rawPhotos = [],
    isLoading,
    isRefetching,
    refetch,
  } = useManifestPhotos(filterParam);

  /* ── Filter multi-layer client-side agar responsif & akurat ── */
  const photos = useMemo(() => {
    let result = rawPhotos;

    if (selectedDriverId !== "all") {
      const dId = Number(selectedDriverId);
      result = result.filter((p) => p.id_driver === dId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.nama_driver?.toLowerCase().includes(q) ||
          p.nopol?.toLowerCase().includes(q) ||
          p.nama_lokasi?.toLowerCase().includes(q) ||
          p.kode_ritase?.toLowerCase().includes(q) ||
          String(p.id_ritase).includes(q),
      );
    }

    return result;
  }, [rawPhotos, selectedDriverId, searchQuery]);

  /* ── stats dihitung dari foto yang aktif difilter ── */
  const stats = useMemo(() => {
    const uniquePhotoUrls = new Set(
      photos.map((p) => p.foto_manifest_url).filter(Boolean),
    );
    const totalPhotos = uniquePhotoUrls.size;
    const uniqueDrivers = new Set(photos.map((p) => p.id_driver)).size;

    const uniquePhotos = photos.filter(
      (p, i, self) =>
        i ===
        self.findIndex((t) => t.foto_manifest_url === p.foto_manifest_url),
    );

    const totalKoli = uniquePhotos.reduce(
      (a, p) => a + ((p.total_koli ?? p.jumlah_koli ?? 0) || 0),
      0,
    );
    const totalEcer = uniquePhotos.reduce(
      (a, p) => a + ((p.total_ecer ?? p.jumlah_ecer ?? 0) || 0),
      0,
    );
    const totalHV = uniquePhotos.reduce(
      (a, p) => a + ((p.total_hv ?? p.jumlah_high_value ?? 0) || 0),
      0,
    );
    return { totalPhotos, uniqueDrivers, totalKoli, totalEcer, totalHV };
  }, [photos]);

  /* ── deduplikasi foto untuk flat grid view ── */
  const dedupedPhotos = useMemo(
    () =>
      photos.filter(
        (p, i, self) =>
          i ===
          self.findIndex((t) => t.foto_manifest_url === p.foto_manifest_url),
      ),
    [photos],
  );

  const todayStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
        new Date(),
      ),
    [],
  );
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(d);
  }, []);

  const isCustomDate =
    selectedDate !== "all" &&
    selectedDate !== todayStr &&
    selectedDate !== yesterdayStr;

  /* ── grouping by ritase ── */
  const ritaseGroups = useMemo<RitaseGroup[]>(() => {
    const map = new Map<number, RitaseGroup>();
    for (const p of photos) {
      let g = map.get(p.id_ritase);
      if (!g) {
        g = {
          id_ritase: p.id_ritase,
          kode_ritase: p.kode_ritase,
          tanggal: p.tanggal,
          ritase_ke: p.ritase_ke,
          id_driver: p.id_driver,
          nama_driver: p.nama_driver,
          nopol: p.nopol,
          totalKoli: 0,
          totalEcer: 0,
          totalHV: 0,
          photos: [],
        };
        map.set(p.id_ritase, g);
      }
      if (
        !g.photos.some(
          (existing) => existing.foto_manifest_url === p.foto_manifest_url,
        )
      ) {
        g.totalKoli += (p.total_koli ?? p.jumlah_koli ?? 0) || 0;
        g.totalEcer += (p.total_ecer ?? p.jumlah_ecer ?? 0) || 0;
        g.totalHV += (p.total_hv ?? p.jumlah_high_value ?? 0) || 0;
        g.photos.push(p);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() ||
        b.ritase_ke - a.ritase_ke,
    );
  }, [photos]);

  /* ── grouping by driver ── */
  const driverGroups = useMemo<DriverGroup[]>(() => {
    const map = new Map<number, DriverGroup>();
    const ritasePerDriver = new Map<number, Set<number>>();

    for (const p of photos) {
      let g = map.get(p.id_driver);
      if (!g) {
        g = {
          id_driver: p.id_driver,
          nama_driver: p.nama_driver,
          nopol: p.nopol,
          totalKoli: 0,
          totalEcer: 0,
          totalHV: 0,
          ritaseCount: 0,
          photos: [],
        };
        map.set(p.id_driver, g);
        ritasePerDriver.set(p.id_driver, new Set());
      }

      ritasePerDriver.get(p.id_driver)?.add(p.id_ritase);

      if (
        !g.photos.some(
          (existing) => existing.foto_manifest_url === p.foto_manifest_url,
        )
      ) {
        g.totalKoli += (p.total_koli ?? p.jumlah_koli ?? 0) || 0;
        g.totalEcer += (p.total_ecer ?? p.jumlah_ecer ?? 0) || 0;
        g.totalHV += (p.total_hv ?? p.jumlah_high_value ?? 0) || 0;
        g.photos.push(p);
      }
    }

    // Set ritase count per driver
    map.forEach((g, driverId) => {
      g.ritaseCount = ritasePerDriver.get(driverId)?.size || 0;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nama_driver.localeCompare(b.nama_driver, "id", { sensitivity: "base" }),
    );
  }, [photos]);

  const toggleDriver = useCallback((id: number) => {
    setExpandedDrivers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedDrivers(new Set(driverGroups.map((g) => g.id_driver)));
  }, [driverGroups]);

  const collapseAll = useCallback(() => {
    setExpandedDrivers(new Set());
  }, []);

  /* ── modal handlers ── */
  const handleOpenModal = (
    photo: ManifestPhotoItem,
    photoList?: ManifestPhotoItem[],
  ) => {
    setSelectedPhoto(photo);
    setActivePhotoList(photoList || [photo]);
    setZoomLevel(1);
    setRotation(0);
  };
  const handleCloseModal = () => {
    setSelectedPhoto(null);
    setActivePhotoList([]);
    setZoomLevel(1);
    setRotation(0);
  };
  const handleDownload = (photo: ManifestPhotoItem) => {
    const link = document.createElement("a");
    link.href = getFullPhotoUrl(photo.foto_manifest_url);
    link.download = `manifest_${photo.kode_ritase}_${photo.nama_lokasi.replace(/\s+/g, "_")}.webp`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto || activePhotoList.length <= 1) return;
    const currentIndex = activePhotoList.findIndex(
      (p) => p.id_event === selectedPhoto.id_event,
    );
    if (currentIndex > 0) {
      setSelectedPhoto(activePhotoList[currentIndex - 1]);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto || activePhotoList.length <= 1) return;
    const currentIndex = activePhotoList.findIndex(
      (p) => p.id_event === selectedPhoto.id_event,
    );
    if (currentIndex >= 0 && currentIndex < activePhotoList.length - 1) {
      setSelectedPhoto(activePhotoList[currentIndex + 1]);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-20">
      {/* ── Breadcrumb & Title Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link
              href="/"
              className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Beranda
            </Link>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Foto Manifest
            </span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dokumentasi Foto Manifest
          </h1>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="uppercase text-[11px] tracking-wider font-bold">
            Menyambungkan
          </span>
        </div>
      </div>

      {/* ── 4 KPI Stat Cards (2 Kolom di Mobile, 4 di Desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* TOTAL FOTO */}
        <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Total Foto
            </p>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.totalPhotos.toLocaleString("id-ID")}
              </span>
              <span className="rounded-md bg-emerald-100 px-1 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                +12%
              </span>
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
              +12% vs Kemarin
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* DRIVER AKTIF */}
        <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Driver Aktif
            </p>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.uniqueDrivers.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
              {stats.uniqueDrivers > 0 ? "5 Baru" : "0 Baru"}
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* TOTAL KOLI */}
        <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Total Koli
            </p>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.totalKoli.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
              Ringkasan Muatan
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* HIGH VALUE */}
        <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              High Value
            </p>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.totalHV.toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
              Perhatian Khusus
            </p>
          </div>
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Responsive Layout ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
        {/* Baris 1: Mode Tampilan + Filter Tanggal Cepat */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Mode Tampilan (Pills dengan Counter) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setViewMode("ritase")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all shadow-2xs shrink-0",
                viewMode === "ritase"
                  ? "bg-[#FEA103] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              <Rows3 className="h-3.5 w-3.5" />
              <span>Per Ritase</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  viewMode === "ritase"
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {ritaseGroups.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all shadow-2xs shrink-0",
                viewMode === "grid"
                  ? "bg-[#FEA103] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Galeri</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  viewMode === "grid"
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {dedupedPhotos.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all shadow-2xs shrink-0",
                viewMode === "timeline"
                  ? "bg-[#FEA103] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              <Images className="h-3.5 w-3.5" />
              <span>Per Driver</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  viewMode === "timeline"
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {driverGroups.length}
              </span>
            </button>
          </div>

          {/* Quick Date Pills + Custom Date Picker */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                "rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors shrink-0",
                selectedDate === todayStr
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              Hari ini
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={cn(
                "rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors shrink-0",
                selectedDate === yesterdayStr
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              Kemarin
            </button>
            <button
              onClick={() => setSelectedDate("all")}
              className={cn(
                "rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors shrink-0",
                selectedDate === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              Semua
            </button>

            {/* Custom Date Picker — 100% Functional & Mobile Ready */}
            <div className="relative inline-flex items-center shrink-0">
              <div
                className={cn(
                  "pointer-events-none flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs",
                  isCustomDate
                    ? "border-amber-400 bg-amber-50 text-amber-900 font-bold dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300 ring-2 ring-amber-400/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                )}
              >
                <Calendar
                  className={cn(
                    "h-3.5 w-3.5",
                    isCustomDate
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400",
                  )}
                />
                <span className="whitespace-nowrap font-sans">
                  Custom:{" "}
                  {isCustomDate
                    ? formatCustomDateDisplay(selectedDate)
                    : "18/09/2026"}
                </span>
              </div>
              <input
                ref={customDateInputRef}
                type="date"
                value={selectedDate === "all" ? "" : selectedDate}
                max={todayStr}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch {}
                }}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
                title="Pilih tanggal kustom"
              />
            </div>
          </div>
        </div>

        {/* Baris 2: Filter Driver Dropdown, Search Input, Refresh, & Expand Action */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Driver Selector Dropdown */}
          <div className="relative flex-1 sm:flex-none sm:min-w-[190px]">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className={cn(
                "h-9 w-full rounded-xl border px-3 text-xs font-semibold transition-colors focus:border-[#0c1e3a] focus:outline-none dark:bg-slate-800 dark:text-white cursor-pointer",
                selectedDriverId !== "all"
                  ? "border-amber-400 bg-amber-50/60 text-amber-900 font-bold dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-700",
              )}
            >
              <option value="all">Semua Driver ({drivers.length})</option>
              {drivers.map((d: DriverArmada) => (
                <option key={d.id_driver} value={d.id_driver.toString()}>
                  {d.nama_driver}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input dengan Clear Button */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari driver, armada, lokasi, ritase..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                title="Hapus pencarian"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (isLoading || isRefetching) && "animate-spin",
              )}
            />
          </button>

          {/* Buka Semua / Tutup Semua (khusus mode Per Driver) */}
          {viewMode === "timeline" && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-1">
              <button
                onClick={expandAll}
                className="hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Buka Semua
              </button>
              <span>·</span>
              <button
                onClick={collapseAll}
                className="hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Tutup Semua
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content View ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          isFiltered={
            selectedDriverId !== "all" ||
            Boolean(searchQuery) ||
            isCustomDate
          }
          onReset={() => {
            setSelectedDate(todayStr);
            setSelectedDriverId("all");
            setSearchQuery("");
          }}
        />
      ) : viewMode === "ritase" ? (
        /* ─── 1. MODE: PER RITASE (Card Grid) ─── */
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {ritaseGroups.map((g) => {
            const firstPhoto = g.photos[0];
            return (
              <div
                key={g.id_ritase}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex gap-3">
                  {/* Left: Document photo thumbnail */}
                  <div
                    onClick={() =>
                      firstPhoto && handleOpenModal(firstPhoto, g.photos)
                    }
                    className="relative h-[125px] w-[90px] sm:h-[130px] sm:w-[95px] shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 shadow-2xs group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {firstPhoto ? (
                      <img
                        src={getFullPhotoUrl(firstPhoto.foto_manifest_url)}
                        alt={`Manifest ${firstPhoto.nama_lokasi}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-slate-300">
                        <Camera className="h-6 w-6" />
                        <span className="mt-1 text-[9px]">Belum ada</span>
                      </div>
                    )}
                    {g.photos.length > 1 && (
                      <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.5 text-[8.5px] font-bold text-white backdrop-blur-xs">
                        +{g.photos.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Right: Driver Info & Muatan Chips */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {g.nama_driver}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Ritase ID: {g.kode_ritase || g.id_ritase}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                        {g.nopol} • Ritase ke-{g.ritase_ke}
                      </p>
                    </div>

                    {/* Chips: TOTAL KOLI & HIGH VALUE */}
                    <div className="my-1.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[10.5px] font-bold text-slate-700 border border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/50">
                        <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Total Koli
                        </span>
                        <span className="ml-auto font-mono text-slate-900 dark:text-white">
                          {g.totalKoli.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[10.5px] font-bold text-slate-700 border border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/50">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          High Value
                        </span>
                        <span className="ml-auto font-mono text-slate-900 dark:text-white">
                          {g.totalHV.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Lihat Detail Button */}
                <button
                  type="button"
                  onClick={() =>
                    firstPhoto && handleOpenModal(firstPhoto, g.photos)
                  }
                  className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-[#0c1e3a] hover:bg-[#0c1e3a] hover:text-white transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#0c1e3a] dark:hover:border-[#0c1e3a]"
                >
                  Lihat Detail ({g.photos.length} Foto)
                </button>
              </div>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* ─── 2. MODE: GALERI (Flat Photo Grid) ─── */
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {dedupedPhotos.map((photo) => (
            <div
              key={photo.id_event}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                onClick={() => handleOpenModal(photo, dedupedPhotos)}
                className="relative aspect-4/3 w-full cursor-pointer overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={getFullPhotoUrl(photo.foto_manifest_url)}
                  alt={`Manifest ${photo.nama_lokasi}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0c1e3a] shadow-lg backdrop-blur-xs">
                    <Maximize2 className="h-3.5 w-3.5" /> Perbesar
                  </span>
                </div>
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDateTime(photo.created_at)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3.5">
                <div className="flex items-start gap-1.5 mb-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                  <span className="text-xs font-bold text-slate-900 line-clamp-1 dark:text-white">
                    {photo.nama_lokasi}
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <User className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate font-semibold">
                      {photo.nama_driver}
                    </span>
                  </div>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {photo.nopol}
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="inline-flex items-center gap-0.5 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50">
                    📦 {(photo.total_koli ?? photo.jumlah_koli ?? 0)} Koli
                    {(photo.total_ecer ?? photo.jumlah_ecer ?? 0) > 0 && (
                      <span>· {(photo.total_ecer ?? photo.jumlah_ecer ?? 0)}E</span>
                    )}
                    {(photo.total_hv ?? photo.jumlah_high_value ?? 0) > 0 && (
                      <span>· {(photo.total_hv ?? photo.jumlah_high_value ?? 0)}HV</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDownload(photo)}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800"
                    title="Unduh"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── 3. MODE: PER DRIVER (Card Grid + Detail Stop) ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {driverGroups.map((g) => {
            const isCollapsed = !expandedDrivers.has(g.id_driver);
            const firstPhoto = g.photos[0];

            return (
              <div
                key={g.id_driver}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs transition-all hover:border-slate-300"
              >
                {/* Driver Summary Card Header */}
                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0c1e3a] text-sm font-black text-white shrink-0 shadow-sm">
                        {g.nama_driver.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                          {g.nama_driver}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono font-semibold">{g.nopol}</span>
                          <span>•</span>
                          <span>{g.ritaseCount} Ritase</span>
                          <span>•</span>
                          <span>{g.photos.length} Foto</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300">
                        <Package className="h-3 w-3" />
                        {g.totalKoli} Koli
                        {g.totalHV > 0 && <span>· {g.totalHV} HV</span>}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Row Preview (maksimal 4 foto pertama) */}
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {g.photos.slice(0, 4).map((p) => (
                      <div
                        key={p.id_event}
                        onClick={() => handleOpenModal(p, g.photos)}
                        className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 hover:border-[#0c1e3a] transition-all hover:scale-105 dark:border-slate-700"
                        title={p.nama_lokasi}
                      >
                        <img
                          src={getFullPhotoUrl(p.foto_manifest_url)}
                          alt={p.nama_lokasi}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                    {g.photos.length > 4 && (
                      <button
                        type="button"
                        onClick={() => toggleDriver(g.id_driver)}
                        className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span>+{g.photos.length - 4}</span>
                        <span className="text-[8.5px]">Lainnya</span>
                      </button>
                    )}
                  </div>

                  {/* Toggle expand/collapse button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleDriver(g.id_driver)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    >
                      {isCollapsed ? (
                        <>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span>Rincian Titik & Foto ({g.photos.length})</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          <span>Sembunyikan Rincian</span>
                        </>
                      )}
                    </button>

                    {firstPhoto && (
                      <button
                        type="button"
                        onClick={() => handleOpenModal(firstPhoto, g.photos)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                      >
                        Buka Galeri Driver →
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: Stop details + foto per titik */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-3.5 py-3 dark:border-slate-800/80 dark:bg-slate-800/30">
                    <div className="space-y-2">
                      {g.photos.map((photo, idx) => (
                        <div
                          key={photo.id_event}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {photo.nama_lokasi}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                              <span className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(photo.created_at).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  },
                                )}
                              </span>
                              {((photo.total_koli ?? photo.jumlah_koli ?? 0) > 0 ||
                                (photo.total_hv ?? photo.jumlah_high_value ?? 0) > 0) && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Package className="h-2.5 w-2.5" />
                                  {(photo.total_koli ?? photo.jumlah_koli ?? 0)} koli{" "}
                                  {(photo.total_hv ?? photo.jumlah_high_value ?? 0) > 0 &&
                                    `· ${(photo.total_hv ?? photo.jumlah_high_value ?? 0)} HV`}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(photo, g.photos)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <Camera className="h-3 w-3" />
                            Foto
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}



      {/* ── Lightbox Modal ── */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[95vh] sm:max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5 sm:px-4 sm:py-3 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedPhoto.nama_lokasi}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedPhoto.nama_driver} ({selectedPhoto.nopol}) •{" "}
                    {formatDateTime(selectedPhoto.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                {activePhotoList.length > 1 && (
                  <div className="flex items-center gap-1 mr-1 sm:mr-2 border-r border-slate-200 pr-1.5 sm:pr-2 dark:border-slate-700">
                    <button
                      onClick={handlePrevPhoto}
                      disabled={
                        activePhotoList.findIndex(
                          (p) => p.id_event === selectedPhoto.id_event,
                        ) === 0
                      }
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      title="Foto Sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-500">
                      {activePhotoList.findIndex(
                        (p) => p.id_event === selectedPhoto.id_event,
                      ) + 1}{" "}
                      / {activePhotoList.length}
                    </span>
                    <button
                      onClick={handleNextPhoto}
                      disabled={
                        activePhotoList.findIndex(
                          (p) => p.id_event === selectedPhoto.id_event,
                        ) ===
                        activePhotoList.length - 1
                      }
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      title="Foto Selanjutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setZoomLevel((p) => Math.min(p + 0.25, 3))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((p) => Math.max(p - 0.25, 0.75))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((p) => (p + 90) % 360)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Putar"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Unduh</span>
                </button>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 h-[60vh] sm:h-[65vh] overflow-auto bg-slate-100 dark:bg-slate-950 p-2 sm:p-4">
              <img
                src={getFullPhotoUrl(selectedPhoto.foto_manifest_url)}
                alt="Manifest Preview"
                className={cn(
                  "m-auto block object-contain transition-transform duration-200",
                  zoomLevel > 1
                    ? "max-w-none max-h-none"
                    : "max-h-full max-w-full",
                )}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-[#0c1e3a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                  {selectedPhoto.kode_ritase}
                </span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  #{selectedPhoto.ritase_ke}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  📦 {(selectedPhoto.total_koli ?? selectedPhoto.jumlah_koli ?? 0)} Koli
                  {(selectedPhoto.total_ecer ?? selectedPhoto.jumlah_ecer ?? 0) > 0 &&
                    ` · ${(selectedPhoto.total_ecer ?? selectedPhoto.jumlah_ecer ?? 0)}E`}
                  {(selectedPhoto.total_hv ?? selectedPhoto.jumlah_high_value ?? 0) > 0 &&
                    ` · ${(selectedPhoto.total_hv ?? selectedPhoto.jumlah_high_value ?? 0)}HV`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {selectedPhoto.foto_manifest_url.split("/").pop()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  isFiltered,
  onReset,
}: {
  isFiltered?: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Camera className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
        {isFiltered ? "Tidak Ada Hasil yang Cocok" : "Belum Ada Foto Manifest"}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
        {isFiltered
          ? "Coba ubah filter tanggal, driver, atau kata kunci pencarian Anda."
          : "Foto yang diambil oleh driver akan otomatis muncul di galeri ini."}
      </p>
      {isFiltered && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Reset Semua Filter
        </button>
      )}
    </div>
  );
}
