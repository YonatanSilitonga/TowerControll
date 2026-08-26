"use client";

import { useState, useMemo, useCallback } from "react";
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
  LayoutGrid,
  Rows3,
  Images,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { useManifestPhotos } from "@/hooks/use-manifest-photos";
import { useDriver } from "@/hooks/use-armada";
import { API_URL } from "@/lib/constants";
import { formatDateTime, formatDur, cn } from "@/lib/utils";
import type { ManifestPhotoItem, DriverArmada } from "@/types/armada";

/* ──────────── helper ──────────── */

const getFullPhotoUrl = (url: string) => {
  if (!url) return "/placeholder-photo.png";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseHost = API_URL.replace(/\/api\/v1\/?$/, "");
  return `${baseHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

/* ──────────── types ──────────── */

type ViewMode = "ritase" | "grid" | "timeline";

interface RitaseGroup {
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  ritase_ke: number;
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
  photos: ManifestPhotoItem[];
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
  const [selectedPhoto, setSelectedPhoto] = useState<ManifestPhotoItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("ritase");
  const [collapsedRitase, setCollapsedRitase] = useState<Set<number>>(new Set());
  const [collapsedDrivers, setCollapsedDrivers] = useState<Set<number>>(new Set());

  const { data: drivers = [] } = useDriver();

  const filterParam = useMemo(
    () => ({
      tanggal: selectedDate === "all" ? undefined : selectedDate,
      driver_id: selectedDriverId === "all" ? null : Number(selectedDriverId),
      search: searchQuery.trim() || undefined,
    }),
    [selectedDate, selectedDriverId, searchQuery],
  );

  const { data: photos = [], isLoading, isRefetching, refetch } = useManifestPhotos(filterParam);

  /* ── stats ── */
  const stats = useMemo(() => {
    const totalPhotos = photos.length;
    const uniqueDrivers = new Set(photos.map((p) => p.id_driver)).size;
    const totalKoli = photos.reduce((a, p) => a + (p.jumlah_koli || 0), 0);
    const totalEcer = photos.reduce((a, p) => a + (p.jumlah_ecer || 0), 0);
    const totalHV = photos.reduce((a, p) => a + (p.jumlah_high_value || 0), 0);
    return { totalPhotos, uniqueDrivers, totalKoli, totalEcer, totalHV };
  }, [photos]);

  const todayStr = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
    [],
  );
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
  }, []);

  /* ── grouping ── */
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
          nama_driver: p.nama_driver,
          nopol: p.nopol,
          totalKoli: 0,
          totalEcer: 0,
          totalHV: 0,
          photos: [],
        };
        map.set(p.id_ritase, g);
      }
      g.totalKoli += p.jumlah_koli || 0;
      g.totalEcer += p.jumlah_ecer || 0;
      g.totalHV += p.jumlah_high_value || 0;
      g.photos.push(p);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.ritase_ke - a.ritase_ke;
    });
  }, [photos]);

  const driverGroups = useMemo<DriverGroup[]>(() => {
    const map = new Map<number, DriverGroup>();
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
          photos: [],
        };
        map.set(p.id_driver, g);
      }
      g.totalKoli += p.jumlah_koli || 0;
      g.totalEcer += p.jumlah_ecer || 0;
      g.totalHV += p.jumlah_high_value || 0;
      g.photos.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.photos.length - a.photos.length);
  }, [photos]);

  /* ── toggle collapse ── */
  const toggleRitase = useCallback((id: number) => {
    setCollapsedRitase((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleDriver = useCallback((id: number) => {
    setCollapsedDrivers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedRitase(new Set());
    setCollapsedDrivers(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedRitase(new Set(ritaseGroups.map((g) => g.id_ritase)));
    setCollapsedDrivers(new Set(driverGroups.map((g) => g.id_driver)));
  }, [ritaseGroups, driverGroups]);

  /* ── modal handlers ── */
  const handleOpenModal = (photo: ManifestPhotoItem) => {
    setSelectedPhoto(photo);
    setZoomLevel(1);
    setRotation(0);
  };
  const handleCloseModal = () => {
    setSelectedPhoto(null);
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

  /* ────────────────────────────────────────────── */
  /*                   RENDER                       */
  /* ────────────────────────────────────────────── */
  return (
    <div className="space-y-5 pb-12">
      {/* ── Header + Breadcrumb ── */}
      <PageHeader
        title="Dokumentasi Foto Manifest"
        description="Bukti foto bongkar muat yang dikirim driver per ritase. Gunakan filter untuk mencari berdasarkan tanggal, driver, atau lokasi."
        crumbs={[{ label: "Foto Manifest" }]}
      />

      {/* ── KPI Summary Cards — tema konsisten ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Total Foto"
          value={stats.totalPhotos}
          icon={Camera}
          color="slate"
          size="sm"
        />
        <KPICard
          label="Driver"
          value={stats.uniqueDrivers}
          icon={Truck}
          color="blue"
          size="sm"
        />
        <KPICard
          label="Total Koli"
          value={stats.totalKoli}
          icon={Package}
          color="green"
          size="sm"
        />
        <KPICard
          label="Eceran"
          value={stats.totalEcer}
          icon={Package}
          color="amber"
          size="sm"
        />
        <KPICard
          label="High Value"
          value={stats.totalHV}
          icon={Package}
          color="purple"
          size="sm"
        />
      </div>

      {/* ── Filter Toolbar — semua dalam 1 bar ── */}
      <div className="flex flex-col gap-2.5 sm:gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        {/* Baris 1: Date + Search + Refresh */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <DatePill label="Hari Ini" active={selectedDate === todayStr} onClick={() => setSelectedDate(todayStr)} />
            <DatePill label="Kemarin" active={selectedDate === yesterdayStr} onClick={() => setSelectedDate(yesterdayStr)} />
            <DatePill label="Semua" active={selectedDate === "all"} onClick={() => setSelectedDate("all")} />
            <input
              type="date"
              value={selectedDate === "all" ? "" : selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value || "all")}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Semua Driver</option>
            {drivers.map((d: DriverArmada) => (
              <option key={d.id_driver} value={d.id_driver.toString()}>
                {d.nama_driver}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari driver, nopol, lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-40 rounded-md border border-slate-200 bg-white pl-7 pr-2 text-[11px] focus:border-[#0c1e3a] focus:outline-none sm:w-48 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3 w-3", (isLoading || isRefetching) && "animate-spin")} />
          </button>
        </div>

        {/* Baris 2: Tampilan toggle */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800 overflow-x-auto">
          <span className="hidden sm:inline text-[11px] font-medium text-slate-400 shrink-0">Tampilan:</span>
          <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800 shrink-0">
            <ViewBtn active={viewMode === "ritase"} onClick={() => setViewMode("ritase")} icon={Rows3} label="Per Ritase" />
            <ViewBtn active={viewMode === "grid"} onClick={() => setViewMode("grid")} icon={LayoutGrid} label="Galeri" />
            <ViewBtn active={viewMode === "timeline"} onClick={() => setViewMode("timeline")} icon={Images} label="Per Driver" />
          </div>

          {viewMode !== "grid" && (
            <>
              <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button onClick={expandAll} className="hidden sm:inline text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0">
                Buka Semua
              </button>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">·</span>
              <button onClick={collapseAll} className="hidden sm:inline text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0">
                Tutup Semua
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState />
      ) : viewMode === "ritase" ? (
        /* ─── GROUPED BY RITASE ─── */
        <div className="space-y-2">
          {ritaseGroups.map((g) => {
            const isCollapsed = collapsedRitase.has(g.id_ritase);
            return (
              <div key={g.id_ritase} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                {/* Header */}
                <button
                  onClick={() => toggleRitase(g.id_ritase)}
                  className="flex w-full items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="shrink-0 rounded bg-[#0c1e3a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                      {g.kode_ritase}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      #{g.ritase_ke}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <User className="h-3 w-3" />
                      <span className="font-semibold">{g.nama_driver}</span>
                      <Truck className="h-3 w-3 ml-1" />
                      <span className="font-mono">{g.nopol}</span>
                    </div>
                    <MuatanBadge koli={g.totalKoli} ecer={g.totalEcer} hv={g.totalHV} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {g.photos.length} foto
                    </span>
                  </div>
                </button>

                {/* Thumbnails */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/80">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {g.photos.map((photo) => (
                        <button
                          key={photo.id_event}
                          onClick={() => handleOpenModal(photo)}
                          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition-all hover:border-[#0c1e3a] hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                        >
                          <img
                            src={getFullPhotoUrl(photo.foto_manifest_url)}
                            alt={photo.nama_lokasi}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="absolute bottom-1 left-1 right-1 truncate text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {photo.nama_lokasi}
                          </span>
                          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 className="h-2.5 w-2.5 text-white" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "timeline" ? (
        /* ─── GROUPED BY DRIVER ─── */
        <div className="space-y-2">
          {driverGroups.map((g) => {
            const isCollapsed = collapsedDrivers.has(g.id_driver);
            return (
              <div key={g.id_driver} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={() => toggleDriver(g.id_driver)}
                  className="flex w-full items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c1e3a] text-[10px] font-bold text-white shrink-0">
                      {g.nama_driver.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{g.nama_driver}</p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{g.nopol}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <MuatanBadge koli={g.totalKoli} ecer={g.totalEcer} hv={g.totalHV} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {g.photos.length} foto
                    </span>
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/80">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {g.photos.map((photo) => (
                        <button
                          key={photo.id_event}
                          onClick={() => handleOpenModal(photo)}
                          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition-all hover:border-[#0c1e3a] hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                        >
                          <img
                            src={getFullPhotoUrl(photo.foto_manifest_url)}
                            alt={photo.nama_lokasi}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="absolute bottom-1 left-1 right-1 truncate text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {photo.nama_lokasi}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── FLAT GRID ─── */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id_event}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                onClick={() => handleOpenModal(photo)}
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
                    <Maximize2 className="h-3.5 w-3.5" />
                    Lihat Penuh
                  </span>
                </div>
                <span className="absolute top-2 left-2 rounded bg-[#0c1e3a]/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                  Ritase #{photo.ritase_ke}
                </span>
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDateTime(photo.created_at)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-start gap-1.5 mb-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                  <span className="text-xs font-bold text-slate-900 line-clamp-1 dark:text-white">{photo.nama_lokasi}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <User className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate font-semibold">{photo.nama_driver}</span>
                  </div>
                  <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{photo.nopol}</span>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    📦 {photo.jumlah_koli} Koli
                    {photo.jumlah_ecer > 0 && <span>· {photo.jumlah_ecer}E</span>}
                    {photo.jumlah_high_value > 0 && <span>· {photo.jumlah_high_value}HV</span>}
                  </span>
                  {photo.durasi_detik > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      ⏱ {formatDur(photo.durasi_detik)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDownload(photo)}
                    className="ml-auto flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800"
                    title="Unduh"
                  >
                    <Download className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[95vh] sm:max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-5 sm:py-3 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Camera className="h-3 w-3" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{selectedPhoto.nama_lokasi}</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedPhoto.nama_driver} ({selectedPhoto.nopol}) • {formatDateTime(selectedPhoto.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button onClick={() => setZoomLevel((p) => Math.min(p + 0.25, 3))} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" title="Zoom In">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button onClick={() => setZoomLevel((p) => Math.max(p - 0.25, 0.75))} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" title="Zoom Out">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button onClick={() => setRotation((p) => (p + 90) % 360)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" title="Putar">
                  <RotateCw className="h-4 w-4" />
                </button>
                <button onClick={() => handleDownload(selectedPhoto)} className="hidden sm:flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                  <Download className="h-3.5 w-3.5" />
                  Unduh
                </button>
                <button onClick={() => handleDownload(selectedPhoto)} className="sm:hidden flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Unduh">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={handleCloseModal} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative flex min-h-[250px] sm:min-h-[350px] max-h-[65vh] sm:max-h-[60vh] flex-1 items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-4">
              <img
                src={getFullPhotoUrl(selectedPhoto.foto_manifest_url)}
                alt="Manifest Preview"
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 sm:px-5 sm:py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-[#0c1e3a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{selectedPhoto.kode_ritase}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">#{selectedPhoto.ritase_ke}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  📦 {selectedPhoto.jumlah_koli} Koli
                  {selectedPhoto.jumlah_ecer > 0 && ` · ${selectedPhoto.jumlah_ecer}E`}
                  {selectedPhoto.jumlah_high_value > 0 && ` · ${selectedPhoto.jumlah_high_value}HV`}
                </span>
                {selectedPhoto.durasi_detik > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">⏱ {formatDur(selectedPhoto.durasi_detik)}</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">{selectedPhoto.foto_manifest_url.split("/").pop()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────── Small Components ──────────── */

function DatePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors",
        active
          ? "bg-[#FEA103] text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
      )}
    >
      {label}
    </button>
  );
}

function ViewBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold transition-colors",
        active
          ? "bg-[#FEA103] text-white"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function MuatanBadge({ koli, ecer, hv }: { koli: number; ecer: number; hv: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300">
      📦 {koli}
      <span className="hidden sm:inline">
        {ecer > 0 && <span>· {ecer}E</span>}
        {hv > 0 && <span>· {hv}HV</span>}
      </span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Camera className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Foto Manifest</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
        Foto yang diambil oleh driver akan otomatis muncul di galeri ini.
      </p>
    </div>
  );
}
