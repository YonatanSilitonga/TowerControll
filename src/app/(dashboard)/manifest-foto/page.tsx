"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Camera,
  Calendar as CalendarIcon,
  Search,
  Download,
  Eye,
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
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useManifestPhotos } from "@/hooks/use-manifest-photos";
import { useDriver } from "@/hooks/use-armada";
import { API_URL } from "@/lib/constants";
import { formatDateTime, formatDur, cn } from "@/lib/utils";
import type { ManifestPhotoItem, DriverArmada } from "@/types/armada";

export default function ManifestFotoPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default hari ini waktu Jakarta
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<ManifestPhotoItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const { data: drivers = [] } = useDriver();

  const filterParam = useMemo(() => ({
    tanggal: selectedDate === "all" ? undefined : selectedDate,
    driver_id: selectedDriverId === "all" ? null : Number(selectedDriverId),
    search: searchQuery.trim() || undefined,
  }), [selectedDate, selectedDriverId, searchQuery]);

  const {
    data: photos = [],
    isLoading,
    isRefetching,
    refetch,
  } = useManifestPhotos(filterParam);

  // Helper resolusi URL gambar (apakah relative /uploads atau absolute)
  const getFullPhotoUrl = (url: string) => {
    if (!url) return "/placeholder-photo.png";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    // Bersihkan API_URL dari trailing /api/v1 agar mengarah ke domain host
    const baseHost = API_URL.replace(/\/api\/v1\/?$/, "");
    return `${baseHost}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const totalPhotos = photos.length;
    const uniqueDrivers = new Set(photos.map((p) => p.id_driver)).size;
    const totalKoli = photos.reduce((acc, p) => acc + (p.jumlah_koli || 0), 0);
    const totalEcer = photos.reduce((acc, p) => acc + (p.jumlah_ecer || 0), 0);
    return { totalPhotos, uniqueDrivers, totalKoli, totalEcer };
  }, [photos]);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(d);
  }, []);

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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Dokumentasi Foto Manifest"
        crumbs={[
          { label: "Foto Manifest" },
        ]}
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Camera className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Total Foto Manifest
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalPhotos}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Truck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Driver Terlampir
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.uniqueDrivers} <span className="text-xs font-normal text-slate-400">Armada</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Package className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Total Muatan Tervalidasi
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalKoli} <span className="text-xs font-normal text-slate-400">Koli</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Ecer / High Value
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalEcer} <span className="text-xs font-normal text-slate-400">Pcs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        {/* Quick Date Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              selectedDate === todayStr
                ? "bg-[#0c1e3a] text-white shadow-xs dark:bg-amber-500 dark:text-slate-950"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setSelectedDate(yesterdayStr)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              selectedDate === yesterdayStr
                ? "bg-[#0c1e3a] text-white shadow-xs dark:bg-amber-500 dark:text-slate-950"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            Kemarin
          </button>
          <button
            onClick={() => setSelectedDate("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              selectedDate === "all"
                ? "bg-[#0c1e3a] text-white shadow-xs dark:bg-amber-500 dark:text-slate-950"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            Semua Riwayat
          </button>

          {/* Date Picker Custom */}
          <div className="relative flex items-center">
            <CalendarIcon className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate === "all" ? "" : selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value || "all")}
              className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-medium text-slate-800 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Search & Driver Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Driver Select */}
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Semua Driver</option>
            {drivers.map((d: DriverArmada) => (
              <option key={d.id_driver} value={d.id_driver.toString()}>
                {d.nama_driver}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari driver, nopol, lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs focus:border-[#0c1e3a] focus:outline-none sm:w-56 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Camera className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-200">
            Belum Ada Foto Manifest
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Foto yang diambil oleh driver saat menyelesaikan proses bongkar muat akan otomatis muncul di galeri ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id_event}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Thumbnail Container */}
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

                {/* Gradient Overlay & Hover Button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0c1e3a] shadow-lg backdrop-blur-xs">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Lihat Penuh
                  </span>
                </div>

                {/* Badge Ritase Ke */}
                <span className="absolute top-2 left-2 rounded-md bg-[#0c1e3a]/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                  Ritase #{photo.ritase_ke}
                </span>

                {/* Badge Waktu */}
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDateTime(photo.created_at)}
                </span>
              </div>

              {/* Card Details */}
              <div className="flex flex-1 flex-col p-3.5">
                {/* Lokasi */}
                <div className="flex items-start gap-1.5 mb-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span className="text-xs font-extrabold text-slate-900 line-clamp-1 dark:text-white">
                    {photo.nama_lokasi}
                  </span>
                </div>

                {/* Driver & Nopol */}
                <div className="mb-2.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate font-semibold">{photo.nama_driver}</span>
                  </div>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {photo.nopol}
                  </span>
                </div>

                {/* Muatan Badges */}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300">
                    <span>📦</span>
                    <span>{photo.jumlah_koli} Koli</span>
                    {photo.jumlah_ecer > 0 && <span>• {photo.jumlah_ecer} Ecer</span>}
                    {photo.jumlah_high_value > 0 && <span>• {photo.jumlah_high_value} HV</span>}
                  </span>

                  {photo.durasi_detik > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/40 dark:border-blue-700/50 dark:text-blue-300">
                      <span>⏱️</span>
                      <span>{formatDur(photo.durasi_detik)}</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleDownload(photo)}
                    className="ml-auto flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    title="Unduh Foto"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bukti Manifest: {selectedPhoto.nama_lokasi}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedPhoto.nama_driver} ({selectedPhoto.nopol}) • {formatDateTime(selectedPhoto.created_at)}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75))}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Putar 90 Derajat"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                  title="Unduh Foto"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Area */}
            <div className="relative flex min-h-[350px] max-h-[60vh] flex-1 items-center justify-center overflow-auto bg-slate-950 p-4">
              <img
                src={getFullPhotoUrl(selectedPhoto.foto_manifest_url)}
                alt="Manifest Full Preview"
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              />
            </div>

            {/* Modal Footer Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-5 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#0c1e3a] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                  {selectedPhoto.kode_ritase}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Ritase #{selectedPhoto.ritase_ke}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  📦 {selectedPhoto.jumlah_koli} Koli
                  {selectedPhoto.jumlah_ecer > 0 && ` • ${selectedPhoto.jumlah_ecer} Ecer`}
                  {selectedPhoto.jumlah_high_value > 0 && ` • ${selectedPhoto.jumlah_high_value} HV`}
                </span>
                {selectedPhoto.durasi_detik > 0 && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      ⏱️ Bongkar Muat: {formatDur(selectedPhoto.durasi_detik)}
                    </span>
                  </>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                File: {selectedPhoto.foto_manifest_url.split("/").pop()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
