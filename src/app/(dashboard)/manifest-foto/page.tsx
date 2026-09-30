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
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronDown,
  ChevronRight,
  Rows3,
  Images,
  Timer,
  Store,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { useManifestPhotos, useManifestPenjemputan } from "@/hooks/use-manifest-photos";
import { getFullPhotoUrl } from "@/lib/constants";
import { formatDateTime, formatDur, cn } from "@/lib/utils";
import type { ManifestPhotoItem, PenjemputanRingkasan, RiwayatPenjemputan } from "@/types/armada";

/* ──────────── types ──────────── */

type ViewMode = "ritase" | "implant" | "timeline";
type RegionalModal = "awb" | "koli" | "ecer" | "hv" | null;

interface CumulativeData {
  awb: number;
  koli_jkt: number;
  koli_seg: number;
  koli_btn: number;
  ecer_jkt: number;
  ecer_seg: number;
  ecer_btn: number;
  koli_hv_jkt: number;
  koli_hv_seg: number;
  koli_hv_btn: number;
  ecer_hv_jkt: number;
  ecer_hv_seg: number;
  ecer_hv_btn: number;
  total_koli: number;
  total_ecer: number;
  total_hv: number;
}

interface RitaseGroup {
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  ritase_ke: number;
  nama_driver: string;
  nopol: string;
  totalAwb: number;
  totalKoli: number;
  totalEcer: number;
  totalHV: number;
  latestUpdatedEventId?: number;
  photos: ManifestPhotoItem[];
}

interface DriverGroup {
  id_driver: number;
  nama_driver: string;
  nopol: string;
  totalAwb: number;
  totalKoli: number;
  totalEcer: number;
  totalHV: number;
  latestUpdatedEventId?: number;
  photos: ManifestPhotoItem[];
}

interface KaptenGroup {
  input_by_id: number | null;
  nama_lokasi: string;
  nama_kapten: string;
  totalAwb: number;
  totalKoli: number;
  totalEcer: number;
  totalHV: number;
  latestUpdatedEventId?: number;
  cumulativeMap: Map<number, CumulativeData>;
  photos: ManifestPhotoItem[];
}

/* ──────────── page ──────────── */

export default function ManifestFotoPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date());
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<ManifestPhotoItem | null>(
    null,
  );
  const [detailKapten, setDetailKapten] = useState<KaptenGroup | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("ritase");
  const [expandedRitase, setExpandedRitase] = useState<Set<number>>(new Set());
  const [expandedDrivers, setExpandedDrivers] = useState<Set<number>>(
    new Set(),
  );
  const [expandedKapten, setExpandedKapten] = useState<Set<string>>(
    new Set(),
  );

  // Tab state: Ritase ke berapa (hanya outgoing, 3 ritase)
  const [ritaseKe, setRitaseKe] = useState<number>(1);

  // Modal state untuk regional breakdown
  const [showRegional, setShowRegional] = useState<RegionalModal>(null);

  const filterParam = useMemo(
    () => ({
      tanggal: selectedDate === "all" ? undefined : selectedDate,
      search: searchQuery.trim() || undefined,
      jenis_ritase: "outgoing",
      ritase_ke: ritaseKe,
    }),
    [selectedDate, searchQuery, ritaseKe],
  );

  const {
    data: photos = [],
    isLoading,
    isRefetching,
    refetch,
  } = useManifestPhotos(filterParam);

  /* ── serah terima kapten (diambil & sisa) ── */
  const { data: penjemputan } = useManifestPenjemputan(filterParam);

  const ringkasanByKey = useMemo(() => {
    const map = new Map<string, PenjemputanRingkasan[]>();
    for (const r of penjemputan?.ringkasan ?? []) {
      const key = `${r.nama_lokasi}__${r.ritase_ke}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [penjemputan]);

  const riwayatByKey = useMemo(() => {
    const map = new Map<string, RiwayatPenjemputan[]>();
    for (const r of penjemputan?.riwayat ?? []) {
      const key = `${r.nama_lokasi}__${r.ritase_ke}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [penjemputan]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const uniquePhotoUrls = new Set(
      photos.map((p) => p.foto_manifest_url).filter(Boolean),
    );
    const totalPhotos = uniquePhotoUrls.size;

    // Hitung jumlah seller yang input data via kapten
    const uniqueSellers = new Set(
      photos.filter((p) => p.input_by === "kapten").map((p) => p.nama_lokasi),
    ).size;

    // Deduplikasi untuk hitung total muatan agar tidak terhitung ganda.
    // Baris tanpa foto (URL '') tidak boleh saling men-dedup (kunci '' === ''),
    // jadi fallback ke id_event sebagai kunci unik.
    const uniquePhotos = photos.filter(
      (p, i, self) =>
        i ===
        self.findIndex(
          (t) => (t.foto_manifest_url || `#${t.id_event}`) === (p.foto_manifest_url || `#${p.id_event}`),
        ),
    );

    const totalKoli = uniquePhotos.reduce(
      (a, p) => a + (p.total_koli || 0),
      0,
    );
    const totalEcer = uniquePhotos.reduce(
      (a, p) => a + (p.total_ecer || 0),
      0,
    );
    const totalHV = uniquePhotos.reduce(
      (a, p) => a + (p.total_hv || 0),
      0,
    );
    const totalAwb = uniquePhotos.reduce(
      (a, p) => a + (p.jumlah_awb || 0),
      0,
    );

    // Regional breakdown
    const koliJkt = uniquePhotos.reduce((a, p) => a + (p.koli_jkt || 0), 0);
    const koliSeg = uniquePhotos.reduce((a, p) => a + (p.koli_seg || 0), 0);
    const koliBtn = uniquePhotos.reduce((a, p) => a + (p.koli_btn || 0), 0);
    const ecerJkt = uniquePhotos.reduce((a, p) => a + (p.ecer_jkt || 0), 0);
    const ecerSeg = uniquePhotos.reduce((a, p) => a + (p.ecer_seg || 0), 0);
    const ecerBtn = uniquePhotos.reduce((a, p) => a + (p.ecer_btn || 0), 0);
    const hvJkt = uniquePhotos.reduce((a, p) => a + (p.koli_hv_jkt || 0) + (p.ecer_hv_jkt || 0), 0);
    const hvSeg = uniquePhotos.reduce((a, p) => a + (p.koli_hv_seg || 0) + (p.ecer_hv_seg || 0), 0);
    const hvBtn = uniquePhotos.reduce((a, p) => a + (p.koli_hv_btn || 0) + (p.ecer_hv_btn || 0), 0);

    return {
      totalPhotos, uniqueSellers, totalKoli, totalEcer, totalHV, totalAwb,
      koliJkt, koliSeg, koliBtn,
      ecerJkt, ecerSeg, ecerBtn,
      hvJkt, hvSeg, hvBtn,
    };
  }, [photos]);

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

  /* ── grouping (dengan deduplikasi foto URL) ── */
  const ritaseGroups = useMemo<RitaseGroup[]>(() => {
    const map = new Map<number, RitaseGroup>();
    for (const p of photos) {
      if (!p.foto_manifest_url) continue;
      if (p.input_by === "kapten") continue;
      let g = map.get(p.id_ritase);
      if (!g) {
        g = {
          id_ritase: p.id_ritase,
          kode_ritase: p.kode_ritase,
          tanggal: p.tanggal,
          ritase_ke: p.ritase_ke,
          nama_driver: p.nama_driver,
          nopol: p.nopol,
          totalAwb: 0,
          totalKoli: 0,
          totalEcer: 0,
          totalHV: 0,
          photos: [],
        };
        map.set(p.id_ritase, g);
      }
      // Anti-duplikat foto dengan URL yang sama dalam ritase
      if (
        !g.photos.some(
          (existing) => existing.foto_manifest_url === p.foto_manifest_url,
        )
      ) {
        g.totalAwb += p.jumlah_awb || 0;
        g.totalKoli += p.total_koli || 0;
        g.totalEcer += p.total_ecer || 0;
        g.totalHV += p.total_hv || 0;
        g.photos.push(p);
      }
    }
    return Array.from(map.values()).map(g => {
      g.latestUpdatedEventId = g.photos
        .filter(p => p.updated_at)
        .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())[0]?.id_event;
      return g;
    }).sort((a, b) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.ritase_ke - a.ritase_ke;
    });
  }, [photos]);

  const driverGroups = useMemo<DriverGroup[]>(() => {
    const map = new Map<number, DriverGroup>();
    for (const p of photos) {
      if (!p.foto_manifest_url) continue;
      if (p.input_by === "kapten") continue;
      let g = map.get(p.id_driver);
      if (!g) {
        g = {
          id_driver: p.id_driver,
          nama_driver: p.nama_driver,
          nopol: p.nopol,
          totalAwb: 0,
          totalKoli: 0,
          totalEcer: 0,
          totalHV: 0,
          photos: [],
        };
        map.set(p.id_driver, g);
      }
      // Anti-duplikat foto dengan URL yang sama untuk driver
      if (
        !g.photos.some(
          (existing) => existing.foto_manifest_url === p.foto_manifest_url,
        )
      ) {
        g.totalAwb += p.jumlah_awb || 0;
        g.totalKoli += p.total_koli || 0;
        g.totalEcer += p.total_ecer || 0;
        g.totalHV += p.total_hv || 0;
        g.photos.push(p);
      }
    }
    return Array.from(map.values()).map(g => {
      g.latestUpdatedEventId = g.photos
        .filter(p => p.updated_at)
        .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())[0]?.id_event;
      return g;
    }).sort((a, b) =>
  a.nama_driver.localeCompare(b.nama_driver, "id", { sensitivity: "base" }),
);
  }, [photos]);

  /* ── grouping by kapten (grouped by nama_lokasi + input_by_id) ── */
  const kaptenGroups = useMemo<KaptenGroup[]>(() => {
    const map = new Map<string, KaptenGroup>();
    for (const p of photos) {
      if (p.input_by !== "kapten") continue;
      const key = `${p.nama_lokasi}__${p.input_by_id ?? 0}`;
      let g = map.get(key);
      if (!g) {
        g = {
          input_by_id: p.input_by_id ?? null,
          nama_lokasi: p.nama_lokasi,
          nama_kapten: p.input_by_name || "Kapten",
          totalAwb: 0,
          totalKoli: 0,
          totalEcer: 0,
          totalHV: 0,
          cumulativeMap: new Map(),
          photos: [],
        };
        map.set(key, g);
      }
      g.totalAwb += p.jumlah_awb || 0;
      g.totalKoli += p.total_koli || 0;
      g.totalEcer += p.total_ecer || 0;
      g.totalHV += p.total_hv || 0;
      g.photos.push(p);
    }
    return Array.from(map.values()).map(g => {
      const sorted = [...g.photos].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      g.photos = sorted;
      g.latestUpdatedEventId = sorted[sorted.length - 1]?.id_event;
      const cumMap = new Map<number, CumulativeData>();
      let running: CumulativeData = {
        awb: 0, koli_jkt: 0, koli_seg: 0, koli_btn: 0,
        ecer_jkt: 0, ecer_seg: 0, ecer_btn: 0,
        koli_hv_jkt: 0, koli_hv_seg: 0, koli_hv_btn: 0,
        ecer_hv_jkt: 0, ecer_hv_seg: 0, ecer_hv_btn: 0,
        total_koli: 0, total_ecer: 0, total_hv: 0,
      };
      for (const p of sorted) {
        running.awb += p.jumlah_awb || 0;
        running.koli_jkt += p.koli_jkt || 0;
        running.koli_seg += p.koli_seg || 0;
        running.koli_btn += p.koli_btn || 0;
        running.ecer_jkt += p.ecer_jkt || 0;
        running.ecer_seg += p.ecer_seg || 0;
        running.ecer_btn += p.ecer_btn || 0;
        running.koli_hv_jkt += p.koli_hv_jkt || 0;
        running.koli_hv_seg += p.koli_hv_seg || 0;
        running.koli_hv_btn += p.koli_hv_btn || 0;
        running.ecer_hv_jkt += p.ecer_hv_jkt || 0;
        running.ecer_hv_seg += p.ecer_hv_seg || 0;
        running.ecer_hv_btn += p.ecer_hv_btn || 0;
        running.total_koli += p.total_koli || 0;
        running.total_ecer += p.total_ecer || 0;
        running.total_hv += p.total_hv || 0;
        cumMap.set(p.id_event, { ...running });
      }
      g.cumulativeMap = cumMap;
      return g;
    }).sort((a, b) =>
      a.nama_lokasi.localeCompare(b.nama_lokasi, "id", { sensitivity: "base" }),
    );
  }, [photos]);

  /* ── flat lookup: photo id → cumulative data (kapten only) ── */
  const kaptenCumulativeLookup = useMemo(() => {
    const lookup = new Map<number, CumulativeData>();
    for (const g of kaptenGroups) {
      for (const [id, cum] of g.cumulativeMap) {
        lookup.set(id, cum);
      }
    }
    return lookup;
  }, [kaptenGroups]);

  /* ── toggle collapse ── */
  const toggleRitase = useCallback((id: number) => {
    setExpandedRitase((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleDriver = useCallback((id: number) => {
    setExpandedDrivers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleKapten = useCallback((key: string) => {
    setExpandedKapten((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedRitase(new Set(ritaseGroups.map((g) => g.id_ritase)));
    setExpandedDrivers(new Set(driverGroups.map((g) => g.id_driver)));
    setExpandedKapten(
      new Set(kaptenGroups.map((g) => `${g.nama_lokasi}__${g.input_by_id ?? 0}`)),
    );
  }, [ritaseGroups, driverGroups, kaptenGroups]);

  const collapseAll = useCallback(() => {
    setExpandedRitase(new Set());
    setExpandedDrivers(new Set());
    setExpandedKapten(new Set());
  }, []);

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

      {/* ── KPI Summary Cards — 2 kartu atas ── */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Total Foto"
          value={stats.totalPhotos}
          icon={Camera}
          size="sm"
        />
        <KPICard
          label="Seller Implant"
          value={stats.uniqueSellers}
          icon={Store}
          size="sm"
        />
      </div>

      {/* ── Ringkasan Muatan — 4 kartu clickable ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "awb" as const, label: "AWB", value: stats.totalAwb, icon: Package, subtitle: "Klik untuk detail" },
          { key: "koli" as const, label: "Total Koli", value: stats.totalKoli, icon: Package, subtitle: "Klik untuk detail" },
          { key: "ecer" as const, label: "Eceran", value: stats.totalEcer, icon: Package, subtitle: "Klik untuk detail" },
          { key: "hv" as const, label: "High Value", value: stats.totalHV, icon: Package, subtitle: "Klik untuk detail" },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setShowRegional(card.key)}
            className="group rounded-lg border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FEA103]/40 hover:shadow-md hover:shadow-amber-100/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-700/30 dark:hover:shadow-amber-900/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {card.value.toLocaleString("id-ID")}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-slate-400 transition-colors group-hover:text-[#FEA103] dark:text-slate-500 dark:group-hover:text-amber-400">
                  {card.subtitle} ›
                </p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2 transition-colors group-hover:bg-[#FEA103]/10 dark:bg-slate-800 dark:group-hover:bg-amber-900/20">
                <card.icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-[#FEA103] dark:text-slate-500 dark:group-hover:text-amber-400" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        {/* Baris 1: Ritase tabs — compact pills */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Ritase</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((ke) => (
              <button
                key={ke}
                onClick={() => setRitaseKe(ke)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold transition-all",
                  ritaseKe === ke
                    ? "bg-[#FEA103] text-white shadow-sm shadow-amber-200 dark:shadow-amber-900/30"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
                )}
              >
                Rit {ke}
              </button>
            ))}
          </div>
        </div>

        {/* Baris 2: Date pills + Search */}
        <div className="flex items-center gap-1.5">
          <DatePill
            label="Hari ini"
            active={selectedDate === todayStr}
            onClick={() => setSelectedDate(todayStr)}
          />
          <DatePill
            label="Kemarin"
            active={selectedDate === yesterdayStr}
            onClick={() => setSelectedDate(yesterdayStr)}
          />
          <DatePill
            label="Semua"
            active={selectedDate === "all"}
            onClick={() => setSelectedDate("all")}
          />
          <input
            type="date"
            value={selectedDate === "all" ? "" : selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || "all")}
            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Baris 3: Search + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-[11px] focus:border-[#0c1e3a] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            title="Refresh"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (isLoading || isRefetching) && "animate-spin",
              )}
            />
          </button>
        </div>
      </div>

      {/* ── View Mode Tabs — standalone ── */}
      <div className="flex w-full items-center justify-between gap-2">
        {/* Kiri: View toggle */}
        <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <ViewBtn
            active={viewMode === "ritase"}
            onClick={() => setViewMode("ritase")}
            icon={Rows3}
            label="Per Ritase"
          />
          <ViewBtn
            active={viewMode === "implant"}
            onClick={() => setViewMode("implant")}
            icon={Store}
            label="Per Implant"
          />
          <ViewBtn
            active={viewMode === "timeline"}
            onClick={() => setViewMode("timeline")}
            icon={Images}
            label="Per Driver"
          />
        </div>

        {/* Kanan: Expand / Collapse — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
            >
              Buka Semua
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={collapseAll}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
            >
              Tutup Semua
            </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState />
      ) : viewMode === "ritase" || viewMode === "implant" ? (
        /* ─── GROUPED BY RITASE / PER IMPLANT (kartu kapten dipakai bersama;
               grup driver hanya tampil di Per Ritase) ─── */
        <>
        {viewMode === "ritase" && (
        <div className="space-y-2">
          {ritaseGroups.map((g) => {
            const isCollapsed = !expandedRitase.has(g.id_ritase);
            // Hitung total durasi dari semua foto dalam ritase ini
            const totalDurasi = g.photos.reduce(
              (sum, p) => sum + (p.durasi_detik || 0),
              0,
            );
            // Cari waktu pertama & terakhir dari created_at
            const sortedPhotos = [...g.photos].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
            const waktuMulai =
              sortedPhotos.length > 0
                ? new Date(sortedPhotos[0].created_at)
                : null;
            const waktuSelesai =
              sortedPhotos.length > 0
                ? new Date(sortedPhotos[sortedPhotos.length - 1].created_at)
                : null;
            const fmtTime = (d: Date) =>
              d.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            const latestUpdatedPhoto = g.photos.find(p => p.id_event === g.latestUpdatedEventId);
            const waktuUpdateTerbaru = latestUpdatedPhoto?.updated_at ? new Date(latestUpdatedPhoto.updated_at) : null;
            const waktuTampil = waktuUpdateTerbaru
              ? fmtTime(waktuUpdateTerbaru)
              : waktuMulai
                ? fmtTime(waktuMulai)
                : null;

            return (
              <div
                key={g.id_ritase}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Header */}
                <button
  onClick={() => toggleRitase(g.id_ritase)}
  className="grid w-full grid-cols-[minmax(140px,220px)_1fr_auto] items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/50"
>
  <div className="flex items-center gap-2.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {g.nama_driver}
                    </span>
                  </div>

                  {/* Tengah: Kode ritase + nomor ritase + kendaraan + waktu */}
                  <div className="hidden md:flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Ritase {g.ritase_ke}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600 mx-0.5">
                      ·
                    </span>
                    <Truck className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{g.nopol}</span>
                    {waktuTampil && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600 mx-0.5">
                          ·
                        </span>
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{waktuTampil}</span>
                      </>
                    )}
                  </div>

                  {/* Kanan: Muatan + Foto button */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <MuatanBadge
                      awb={g.totalAwb}
                      koli={g.totalKoli}
                      ecer={g.totalEcer}
                      hv={g.totalHV}
                    />
                    {totalDurasi > 0 && (
                      <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        <Timer className="h-3 w-3" />
                        {formatDur(totalDurasi)}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-[#0c1e3a] hover:text-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      title={`${g.photos.length} foto bukti bongkar muat`}
                    >
                      <Camera className="h-3 w-3" />
                      {g.photos.length} foto
                    </span>
                  </div>
                </button>

                {/* Expanded: Stop details + foto per titik */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/80">
                    <div className="space-y-2">
                      {g.photos.map((photo, idx) => (
                        <div
                          key={photo.id_event}
                          className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-2.5 py-2 sm:gap-3 sm:px-3 dark:border-slate-800 dark:bg-slate-800/30"
                        >
                          {/* Nomor urut */}
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {idx + 1}
                          </span>

                          {/* Info: Lokasi + Waktu + Muatan */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {photo.nama_lokasi}
                              </p>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                              {/* Waktu realisasi dari created_at */}
                              <span
                                className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300"
                                title="Waktu realisasi: kapan foto diambil"
                              >
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
                              {photo.jumlah_awb > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  title="Jumlah AWB"
                                >
                                  {photo.jumlah_awb} AWB
                                </span>
                              )}
                              {(photo.total_koli > 0 ||
                                photo.total_ecer > 0 ||
                                photo.total_hv > 0) && (
                                <RegionalBreakdown photo={photo} />
                              )}
                              {photo.durasi_detik > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5"
                                  title="Durasi: waktu yang dihabiskan di titik ini"
                                >
                                  <Timer className="h-2.5 w-2.5" />
                                  {formatDur(photo.durasi_detik)}
                                </span>
                              )}
                              <span
                                className="text-slate-300 dark:text-slate-600"
                                title="Status: jenis kegiatan di titik ini"
                              >
                                · {photo.status}
                              </span>
                              {photo.id_event === g.latestUpdatedEventId && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-700/50">
                                  update terbaru
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Foto button — clickable link */}
                          <button
                            onClick={() => handleOpenModal(photo)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 min-h-[36px] hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0c1e3a]"
                            title={`Lihat foto ${photo.nama_lokasi}`}
                          >
                            <Camera className="h-3 w-3" />
                            <span className="hidden sm:inline">Foto</span>
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
        {/* ─── KAPTEN GROUPS (Per Ritase: setelah grup driver; Per Implant: isi utama) ─── */}
        {kaptenGroups.length > 0 && (
          <div className="space-y-2">
            {kaptenGroups.map((g) => {
              const groupKey = `${g.nama_lokasi}__${g.input_by_id ?? 0}`;
              const isCollapsed = !expandedKapten.has(groupKey);
              const totalDurasi = g.photos.reduce(
                (sum, p) => sum + (p.durasi_detik || 0),
                0,
              );
              const sortedPhotos = [...g.photos].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              );
              const waktuMulai =
                sortedPhotos.length > 0
                  ? new Date(sortedPhotos[0].created_at)
                  : null;
              const fmtTime = (d: Date) =>
                d.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
              const latestUpdatedPhoto = g.photos.find(p => p.id_event === g.latestUpdatedEventId);
              const waktuUpdateTerbaru = latestUpdatedPhoto?.updated_at ? new Date(latestUpdatedPhoto.updated_at) : null;
              const waktuTampil = waktuUpdateTerbaru
                ? fmtTime(waktuUpdateTerbaru)
                : waktuMulai
                  ? fmtTime(waktuMulai)
                  : null;

              return (
                <div
                  key={groupKey}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Header */}
                  <button
                    onClick={() => toggleKapten(groupKey)}
                    className="grid w-full grid-cols-[minmax(140px,220px)_1fr_auto] items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {g.nama_lokasi}
                      </span>
                    </div>

                    <div className="hidden md:flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Kapten: {g.nama_kapten}</span>
                      {waktuTampil && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600 mx-0.5">·</span>
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="font-mono">{waktuTampil}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {totalDurasi > 0 && (
                        <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          <Timer className="h-3 w-3" />
                          {formatDur(totalDurasi)}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-[#0c1e3a] hover:text-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        title={`${g.photos.length} data input kapten (${g.photos.filter((p) => p.foto_manifest_url).length} dengan foto)`}
                      >
                        <Camera className="h-3 w-3" />
                        {g.photos.filter((p) => p.foto_manifest_url).length}/{g.photos.length} foto
                      </span>
                      {g.photos.some((p) => !p.id_ritase) && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
                          title="Sebagian data belum dikonfirmasi kapten ke trip driver"
                        >
                          Belum dikonfirmasi
                        </span>
                      )}
                      {(() => {
                        const key = `${g.nama_lokasi}__${ritaseKe}`;
                        const entries = ringkasanByKey.get(key) ?? [];
                        const jemput = riwayatByKey.get(key) ?? [];
                        if (jemput.length === 0) return null;
                        const dAwb = entries.reduce((a, e) => a + (e.diambil_awb || 0), 0);
                        const dKoli = entries.reduce((a, e) => a + (e.diambil_koli || 0), 0);
                        const dEcer = entries.reduce((a, e) => a + (e.diambil_ecer || 0), 0);
                        const dHv = entries.reduce((a, e) => a + (e.diambil_hv || 0), 0);
                        const sKoli = entries.reduce((a, e) => a + (e.sisa_koli || 0), 0);
                        const sEcer = entries.reduce((a, e) => a + (e.sisa_ecer || 0), 0);
                        const sHv = entries.reduce((a, e) => a + (e.sisa_hv || 0), 0);
                        const sAwb = entries.reduce((a, e) => a + (e.sisa_awb || 0), 0);
                        const adaSisa = sKoli > 0 || sEcer > 0 || sHv > 0 || sAwb > 0;
                        return (
                          <>
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-300"
                              title={`Sudah diambil driver: ${dAwb} AWB, ${dKoli} koli, ${dEcer} ecer, ${dHv} HV`}
                            >
                              Sudah diambil
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold",
                                adaSisa
                                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "border-green-200 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-950/40 dark:text-green-300",
                              )}
                              title={adaSisa ? `Sisa belum diambil: ${sAwb} AWB, ${sKoli} koli, ${sEcer} ecer, ${sHv} HV` : "Semua sudah diambil driver"}
                            >
                              {adaSisa ? "Sisa" : "Selesai"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </button>

                  {/* Expanded: satu baris = kejadian terbaru (klik untuk rincian semua) */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/80">
                      <div className="space-y-2">
                        {(() => {
                          const photo = sortedPhotos[sortedPhotos.length - 1];
                          if (!photo) return null;
                          return (
                          <div
                            key={photo.id_event}
                            onClick={() => setDetailKapten(g)}
                            title="Klik untuk melihat rincian semua input"
                            className="group flex cursor-pointer items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FEA103]/40 hover:bg-slate-100/80 hover:shadow-md hover:shadow-amber-100/50 sm:gap-3 sm:px-3 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-amber-700/30 dark:hover:bg-slate-800/60"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-slate-200 transition-colors group-hover:bg-[#FEA103] group-hover:text-white dark:bg-slate-700 dark:text-slate-300" title={`${sortedPhotos.length} input digabung — menampilkan yang terbaru`}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                  {photo.nama_lokasi}
                                </p>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                <span
                                  className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300"
                                  title="Waktu realisasi"
                                >
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
                                {(() => {
                                  const cum = g.cumulativeMap.get(photo.id_event);
                                  const awb = cum?.awb ?? photo.jumlah_awb;
                                  return awb > 0 ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                      title="Jumlah AWB (kumulatif)"
                                    >
                                      {awb} AWB
                                    </span>
                                  ) : null;
                                })()}
                                <RegionalBreakdown
                                  photo={photo}
                                  cumulative={g.cumulativeMap.get(photo.id_event)}
                                  variant="text"
                                />
                                {photo.durasi_detik > 0 && (
                                  <span
                                    className="inline-flex items-center gap-0.5"
                                    title="Durasi"
                                  >
                                    <Timer className="h-2.5 w-2.5" />
                                    {formatDur(photo.durasi_detik)}
                                  </span>
                                )}
                                <span
                                  className="text-slate-300 dark:text-slate-600"
                                  title="Status"
                                >
                                  · {photo.status}
                                </span>
                                {photo.id_event === g.latestUpdatedEventId && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-700/50">
                                    update terbaru
                                  </span>
                                )}
                              </div>
                            </div>
                            {photo.foto_manifest_url ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(photo);
                                }}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 min-h-[36px] hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0c1e3a]"
                                title={`Lihat foto ${photo.nama_lokasi}`}
                              >
                                <Camera className="h-3 w-3" />
                                <span className="hidden sm:inline">Foto</span>
                              </button>
                            ) : (
                              <span
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 min-h-[36px] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                                title="Input ini tidak disertai foto manifest"
                              >
                                <Camera className="h-3 w-3" />
                                <span className="hidden sm:inline">Belum ada foto</span>
                              </span>
                            )}
                            <span className="hidden shrink-0 items-center gap-0.5 text-[11px] font-medium text-slate-300 transition-colors group-hover:text-[#FEA103] sm:inline-flex dark:text-slate-600 dark:group-hover:text-amber-400">
                              Rincian ›
                            </span>
                          </div>
                          );
                        })()}
                      </div>
                      {/* ── Riwayat serah terima (diambil driver) ── */}
                      {(() => {
                        const list = riwayatByKey.get(`${g.nama_lokasi}__${ritaseKe}`) ?? [];
                        if (list.length === 0) return null;
                        // Sisa berjalan per kejadian: total input grup − akumulasi
                        // diambil s.d. kejadian itu (urut kronologis).
                        const ring = ringkasanByKey.get(`${g.nama_lokasi}__${ritaseKe}`) ?? [];
                        const inAwb = ring.reduce((a, e) => a + (e.input_awb || 0), 0);
                        const inKoli = ring.reduce((a, e) => a + (e.input_koli || 0), 0);
                        const inEcer = ring.reduce((a, e) => a + (e.input_ecer || 0), 0);
                        const inHv = ring.reduce((a, e) => a + (e.input_hv || 0), 0);
                        const asc = [...list].sort(
                          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                        );
                        let runAwb = 0, runKoli = 0, runEcer = 0, runHv = 0;
                        const sisaById = new Map<number, { awb: number; koli: number; ecer: number; hv: number }>();
                        for (const r of asc) {
                          runAwb += r.jumlah_awb || 0;
                          runKoli += r.total_koli || 0;
                          runEcer += r.total_ecer || 0;
                          runHv += r.total_hv || 0;
                          sisaById.set(r.id, {
                            awb: inAwb - runAwb,
                            koli: inKoli - runKoli,
                            ecer: inEcer - runEcer,
                            hv: inHv - runHv,
                          });
                        }
                        // Nomor urut kejadian dalam grup (kronologis) untuk status.
                        const seqById = new Map<number, number>();
                        asc.forEach((item, idx) => seqById.set(item.id, idx + 1));
                        const urutanWords: Record<number, string> = {
                          1: "pertama", 2: "kedua", 3: "ketiga", 4: "keempat", 5: "kelima",
                          6: "keenam", 7: "ketujuh", 8: "kedelapan", 9: "kesembilan", 10: "kesepuluh",
                        };
                        const urutanWord = (n: number) => urutanWords[n] ?? `ke-${n}`;
                        return (
                          <div className="mt-3 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Diterima driver ({list.length})
                            </p>
                            {list.map((r) => {
                              const sisa = sisaById.get(r.id) ?? { awb: 0, koli: 0, ecer: 0, hv: 0 };
                              const adaSisa = sisa.awb > 0 || sisa.koli > 0 || sisa.ecer > 0 || sisa.hv > 0;
                              const sisaParts: string[] = [];
                              if (sisa.awb > 0) sisaParts.push(`${sisa.awb} AWB`);
                              if (sisa.koli > 0) sisaParts.push(`${sisa.koli} koli`);
                              if (sisa.ecer > 0) sisaParts.push(`${sisa.ecer} ecer`);
                              if (sisa.hv > 0) sisaParts.push(`${sisa.hv} HV`);
                              return (
                              <div
                                key={`pj-${r.id}`}
                                className={adaSisa
                                  ? "flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-2 sm:gap-3 sm:px-3 dark:border-amber-700/50 dark:bg-amber-950/20"
                                  : "flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50/50 px-2.5 py-2 sm:gap-3 sm:px-3 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                                }
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                    Nama Driver: {r.nama_driver || "Driver"}
                                    {r.created_at && (
                                      <span className="ml-1.5 font-mono font-normal text-slate-400">
                                        {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                      </span>
                                    )}
                                  </p>
                                  <span className="mt-0.5 inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50">
                                    Penjemputan {urutanWord(seqById.get(r.id) ?? 1)}
                                  </span>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    {(() => {
                                      const seg = (label: string, jkt?: number, segV?: number, btn?: number) => {
                                        const parts: string[] = [];
                                        if ((jkt ?? 0) > 0) parts.push(`JKT ${jkt}`);
                                        if ((segV ?? 0) > 0) parts.push(`SEG ${segV}`);
                                        if ((btn ?? 0) > 0) parts.push(`BTN ${btn}`);
                                        if (parts.length === 0) return null;
                                        return `${label}: ${parts.join(", ")}`;
                                      };
                                      const chunks: string[] = [];
                                      if (r.jumlah_awb > 0) chunks.push(`${r.jumlah_awb} AWB`);
                                      const k = seg("Koli", r.koli_jkt, r.koli_seg, r.koli_btn);
                                      const e = seg("Ecer", r.ecer_jkt, r.ecer_seg, r.ecer_btn);
                                      const kh = seg("Koli HV", r.koli_hv_jkt, r.koli_hv_seg, r.koli_hv_btn);
                                      const eh = seg("Ecer HV", r.ecer_hv_jkt, r.ecer_hv_seg, r.ecer_hv_btn);
                                      // Fallback ringkas bila rincian per wilayah tidak ada.
                                      if (chunks.length === 0 && !k && !e && !kh && !eh) {
                                        if (r.jumlah_awb > 0 || r.total_koli > 0 || r.total_ecer > 0 || r.total_hv > 0) {
                        return (
                                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                                              Diambil: {r.jumlah_awb} AWB, {r.total_koli} koli, {r.total_ecer} ecer, {r.total_hv} HV
                                            </span>
                                          );
                                        }
                                        return null;
                                      }
                                      if (k) chunks.push(k);
                                      if (e) chunks.push(e);
                                      if (kh) chunks.push(kh);
                                      if (eh) chunks.push(eh);
                                      return (
                                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                                          Diambil: {chunks.join(" · ")}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  {adaSisa ? (
                                    <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                      Sisa: {sisaParts.join(", ")}
                                    </p>
                                  ) : (
                                    <span className="mt-1 inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-700/50">
                                      Habis
                                    </span>
                                  )}
                                  {r.catatan && (
                                    <p className="mt-0.5 text-[11px] italic text-slate-500 dark:text-slate-400">
                                      📝 {r.catatan}
                                    </p>
                                  )}
                                </div>
                                {r.foto_penjemputan_url ? (
                                  <button
                                    onClick={() =>
                                      handleOpenModal({
                                        id_event: -r.id,
                                        id_ritase: r.id_ritase,
                                        kode_ritase: r.kode_ritase,
                                        tanggal: r.tanggal,
                                        ritase_ke: r.ritase_ke,
                                        jenis_ritase: r.jenis_ritase,
                                        id_driver: 0,
                                        nama_driver: r.nama_driver,
                                        jabatan_driver: "TRANSPORTER",
                                        id_kendaraan: 0,
                                        nopol: "-",
                                        jenis_kendaraan: "-",
                                        nama_lokasi: r.nama_lokasi,
                                        status: "Serah Terima",
                                        jumlah_awb: r.jumlah_awb,
                                        koli_jkt: r.koli_jkt ?? 0, koli_seg: r.koli_seg ?? 0, koli_btn: r.koli_btn ?? 0,
                                        ecer_jkt: r.ecer_jkt ?? 0, ecer_seg: r.ecer_seg ?? 0, ecer_btn: r.ecer_btn ?? 0,
                                        koli_hv_jkt: r.koli_hv_jkt ?? 0, koli_hv_seg: r.koli_hv_seg ?? 0, koli_hv_btn: r.koli_hv_btn ?? 0,
                                        ecer_hv_jkt: r.ecer_hv_jkt ?? 0, ecer_hv_seg: r.ecer_hv_seg ?? 0, ecer_hv_btn: r.ecer_hv_btn ?? 0,
                                        total_koli: r.total_koli,
                                        total_ecer: r.total_ecer,
                                        total_hv: r.total_hv,
                                        durasi_detik: 0,
                                        foto_manifest_url: r.foto_penjemputan_url,
                                        created_at: r.created_at,
                                        input_by: "kapten",
                                      } as ManifestPhotoItem)
                                    }
                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 min-h-[36px] hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0c1e3a]"
                                    title="Lihat foto serah terima"
                                  >
                                    <Camera className="h-3 w-3" />
                                    <span className="hidden sm:inline">Foto</span>
                                  </button>
                                ) : null}
                              </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {viewMode === "implant" && kaptenGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Store className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              Belum Ada Laporan Implant
            </h3>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              Laporan muatan dari kapten seller implant akan muncul di sini.
            </p>
          </div>
        )}
        </>
      ) : viewMode === "timeline" ? (
        /* ─── GROUPED BY DRIVER ─── */
        <div className="space-y-2">
          {driverGroups.map((g) => {
            const isCollapsed = !expandedDrivers.has(g.id_driver);
            const totalDurasi = g.photos.reduce(
              (sum, p) => sum + (p.durasi_detik || 0),
              0,
            );
            return (
              <div
                key={g.id_driver}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
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
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {g.nama_driver}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {g.nopol}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <MuatanBadge
                      awb={g.totalAwb}
                      koli={g.totalKoli}
                      ecer={g.totalEcer}
                      hv={g.totalHV}
                    />
                    {totalDurasi > 0 && (
                      <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        <Timer className="h-3 w-3" />
                        {formatDur(totalDurasi)}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-[#0c1e3a] hover:text-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      title={`${g.photos.length} foto bukti bongkar muat`}
                    >
                      <Camera className="h-3 w-3" />
                      {g.photos.length} foto
                    </span>
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/80">
                    <div className="space-y-2">
                      {g.photos.map((photo, idx) => (
                        <div
                          key={photo.id_event}
                          className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-2.5 py-2 sm:gap-3 sm:px-3 dark:border-slate-800 dark:bg-slate-800/30"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                              {photo.nama_lokasi}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                              {/* Waktu realisasi dari created_at */}
                              <span
                                className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300"
                                title="Waktu realisasi: kapan foto diambil"
                              >
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
                              {photo.jumlah_awb > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  title="Jumlah AWB"
                                >
                                  {photo.jumlah_awb} AWB
                                </span>
                              )}
                              {(photo.total_koli > 0 ||
                                photo.total_ecer > 0 ||
                                photo.total_hv > 0) && (
                                <RegionalBreakdown photo={photo} />
                              )}
                              {photo.durasi_detik > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5"
                                  title="Durasi"
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDur(photo.durasi_detik)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenModal(photo)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 min-h-[36px] hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0c1e3a]"
                            title={`Lihat foto ${photo.nama_lokasi}`}
                          >
                            <Camera className="h-3 w-3" />
                            <span className="hidden sm:inline">Foto</span>
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
      ) : null}

      {/* ── Modal Rincian Kapten (semua input dalam grup) ── */}
      {detailKapten && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDetailKapten(null)}
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Rincian Input • {detailKapten.nama_lokasi}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Kapten: {detailKapten.nama_kapten} • {detailKapten.photos.length} input
                </p>
              </div>
              <button
                onClick={() => setDetailKapten(null)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto px-4 py-3">
              {[...detailKapten.photos]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((photo, idx, arr) => {
                  const isLatest = idx === arr.length - 1;
                  return (
                    <div
                      key={photo.id_event}
                      className="rounded-md border border-slate-100 bg-slate-50/50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-800/30"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {photo.nama_lokasi}
                        </p>
                        {isLatest && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-700/50">
                            update terbaru
                          </span>
                        )}
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">
                          {new Date(photo.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {photo.jumlah_awb > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {photo.jumlah_awb} AWB
                          </span>
                        )}
                        <RegionalBreakdown photo={photo} variant="text" />
                        <span className="text-slate-300 dark:text-slate-600" title="Status">
                          · {photo.status}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        {photo.foto_manifest_url ? (
                          <button
                            onClick={() => handleOpenModal(photo)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0c1e3a]"
                            title={`Lihat foto ${photo.nama_lokasi}`}
                          >
                            <Camera className="h-3 w-3" />
                            <span>Foto</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                            title="Input ini tidak disertai foto manifest"
                          >
                            <Camera className="h-3 w-3" />
                            <span>Belum ada foto</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
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
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedPhoto.nama_lokasi}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedPhoto.nama_driver} ({selectedPhoto.nopol}) •{" "}
                    {formatDateTime(selectedPhoto.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => setZoomLevel((p) => Math.min(p + 0.25, 3))}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((p) => Math.max(p - 0.25, 0.75))}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((p) => (p + 90) % 360)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Putar"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="hidden sm:flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh
                </button>
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="sm:hidden flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  title="Unduh"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCloseModal}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 h-[65vh] sm:h-[60vh] overflow-auto bg-slate-100 dark:bg-slate-950 p-2 sm:p-4">
  <img
    src={getFullPhotoUrl(selectedPhoto.foto_manifest_url)}
    alt="Manifest Preview"
    className={cn(
      "m-auto block object-contain transition-transform duration-200",
      zoomLevel > 1 ? "max-w-none max-h-none" : "max-h-full max-w-full",
    )}
    style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
  />
</div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 sm:px-5 sm:py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-[#0c1e3a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                  {selectedPhoto.kode_ritase}
                </span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Rit {selectedPhoto.ritase_ke}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                {(() => {
                  const cum = kaptenCumulativeLookup.get(selectedPhoto.id_event);
                  const awb = cum?.awb ?? selectedPhoto.jumlah_awb;
                  return awb > 0 ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      📋 {awb} AWB
                    </span>
                  ) : null;
                })()}
                <RegionalBreakdown
                  photo={selectedPhoto}
                  cumulative={kaptenCumulativeLookup.get(selectedPhoto.id_event)}
                />
                {selectedPhoto.durasi_detik > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      ⏱ {formatDur(selectedPhoto.durasi_detik)}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                {selectedPhoto.foto_manifest_url.split("/").pop()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Regional Breakdown Modal ── */}
      {showRegional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {showRegional === "awb" && "Detail AWB"}
                {showRegional === "koli" && "Detail Koli"}
                {showRegional === "ecer" && "Detail Eceran"}
                {showRegional === "hv" && "Detail High Value"}
              </h3>
              <button
                onClick={() => setShowRegional(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {showRegional === "awb" ? (
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {stats.totalAwb.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Total AWB
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-2 text-left font-semibold text-slate-500 dark:text-slate-400"></th>
                      <th className="pb-2 text-center font-semibold text-slate-500 dark:text-slate-400">JKT</th>
                      <th className="pb-2 text-center font-semibold text-slate-500 dark:text-slate-400">SEG</th>
                      <th className="pb-2 text-center font-semibold text-slate-500 dark:text-slate-400">BTN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showRegional === "koli" && (
                      <tr>
                        <td className="py-2 font-medium text-slate-700 dark:text-slate-300">Koli</td>
                        <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.koliJkt}</td>
                        <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.koliSeg}</td>
                        <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.koliBtn}</td>
                      </tr>
                    )}
                    {showRegional === "ecer" && (
                      <tr>
                        <td className="py-2 font-medium text-slate-700 dark:text-slate-300">Ecer</td>
                        <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.ecerJkt}</td>
                        <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.ecerSeg}</td>
                        <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.ecerBtn}</td>
                      </tr>
                    )}
                    {showRegional === "hv" && (
                      <>
                        <tr>
                          <td className="py-2 font-medium text-slate-700 dark:text-slate-300">HV Total</td>
                          <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.hvJkt}</td>
                          <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.hvSeg}</td>
                          <td className="py-2 text-center font-bold text-slate-900 dark:text-white">{stats.hvBtn}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td className="pt-2 font-bold text-slate-700 dark:text-slate-300">Total</td>
                      {showRegional === "koli" && (
                        <>
                          <td className="pt-2 text-center font-bold text-[#FEA103]">{stats.koliJkt + stats.koliSeg + stats.koliBtn}</td>
                          <td className="pt-2"></td>
                          <td className="pt-2"></td>
                        </>
                      )}
                      {showRegional === "ecer" && (
                        <>
                          <td className="pt-2 text-center font-bold text-[#FEA103]">{stats.ecerJkt + stats.ecerSeg + stats.ecerBtn}</td>
                          <td className="pt-2"></td>
                          <td className="pt-2"></td>
                        </>
                      )}
                      {showRegional === "hv" && (
                        <>
                          <td className="pt-2 text-center font-bold text-[#FEA103]">{stats.hvJkt + stats.hvSeg + stats.hvBtn}</td>
                          <td className="pt-2"></td>
                          <td className="pt-2"></td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────── Small Components ──────────── */

function DatePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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

function ViewBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
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

function MuatanBadge({
  awb,
  koli,
  ecer,
  hv,
}: {
  awb: number;
  koli: number;
  ecer: number;
  hv: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300">
      <Package className="h-3 w-3" />
      {awb > 0 && (
        <span>{awb} <span className="font-normal">AWB</span></span>
      )}
      <span className="hidden sm:inline">
        {koli > 0 && (
          <span>
            {awb > 0 && "· "} {koli} <span className="font-normal">Koli</span>
          </span>
        )}
        {ecer > 0 && (
          <span>
            · {ecer} <span className="font-normal">Ecer</span>
          </span>
        )}
        {hv > 0 && (
          <span>
            · {hv} <span className="font-normal">HV</span>
          </span>
        )}
      </span>
    </span>
  );
}

function RegionalBreakdown({ photo, cumulative, variant = "table" }: { photo: ManifestPhotoItem; cumulative?: CumulativeData; variant?: "table" | "text" }) {
  const koliJkt = cumulative?.koli_jkt ?? photo.koli_jkt;
  const koliSeg = cumulative?.koli_seg ?? photo.koli_seg;
  const koliBtn = cumulative?.koli_btn ?? photo.koli_btn;
  const ecerJkt = cumulative?.ecer_jkt ?? photo.ecer_jkt;
  const ecerSeg = cumulative?.ecer_seg ?? photo.ecer_seg;
  const ecerBtn = cumulative?.ecer_btn ?? photo.ecer_btn;
  const hvkJkt = cumulative?.koli_hv_jkt ?? photo.koli_hv_jkt;
  const hvkSeg = cumulative?.koli_hv_seg ?? photo.koli_hv_seg;
  const hvkBtn = cumulative?.koli_hv_btn ?? photo.koli_hv_btn;
  const hveJkt = cumulative?.ecer_hv_jkt ?? photo.ecer_hv_jkt;
  const hveSeg = cumulative?.ecer_hv_seg ?? photo.ecer_hv_seg;
  const hveBtn = cumulative?.ecer_hv_btn ?? photo.ecer_hv_btn;
  const totalKoli = cumulative?.total_koli ?? photo.total_koli;
  const totalEcer = cumulative?.total_ecer ?? photo.total_ecer;
  const totalHv = cumulative?.total_hv ?? photo.total_hv;

  const hasData = totalKoli > 0 || totalEcer > 0 || totalHv > 0;
  if (!hasData) return null;

  const rows = [
    { label: "Koli", jkt: koliJkt, seg: koliSeg, btn: koliBtn },
    { label: "Ecer", jkt: ecerJkt, seg: ecerSeg, btn: ecerBtn },
    { label: "Koli HV", jkt: hvkJkt, seg: hvkSeg, btn: hvkBtn },
    { label: "Ecer HV", jkt: hveJkt, seg: hveSeg, btn: hveBtn },
  ];

  // Varian teks: hanya entri berisi (nol tidak tampil, kategori kosong hilang).
  // Satu baris per kategori: label bold beraksen + angka semibold.
  if (variant === "text") {
    const colored: { label: string; segs: string[]; accent: string }[] = [];
    const accents: Record<string, string> = {
      Koli: "text-blue-700 dark:text-blue-300",
      Ecer: "text-amber-700 dark:text-amber-300",
      "Koli HV": "text-orange-700 dark:text-orange-300",
      "Ecer HV": "text-pink-700 dark:text-pink-300",
    };
    for (const r of rows) {
      const segs: string[] = [];
      if (r.jkt > 0) segs.push(`JKT ${r.jkt}`);
      if (r.seg > 0) segs.push(`SEG ${r.seg}`);
      if (r.btn > 0) segs.push(`BTN ${r.btn}`);
      if (segs.length > 0) {
        colored.push({ label: r.label, segs, accent: accents[r.label] ?? "text-slate-700 dark:text-slate-200" });
      }
    }
    if (colored.length === 0) return null;
    return (
      <span className="mt-1 block space-y-0.5 text-[11px] leading-relaxed">
        {colored.map((c) => (
          <span key={c.label} className="block">
            <span className={`font-bold ${c.accent}`}>{c.label}: </span>
            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {c.segs.join(" · ")}
            </span>
          </span>
        ))}
      </span>
    );
  }

  const colStyle = "px-2 py-0.5 text-[10px] tabular-nums font-medium";

  return (
    <div className="mt-1 rounded bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/50 inline-block">
      <table className="text-[10px] leading-tight">
        <thead>
          <tr className="text-slate-400 dark:text-slate-500">
            <th className={`${colStyle} text-left font-medium`}></th>
            <th className={`${colStyle} text-center font-medium`}>JKT</th>
            <th className={`${colStyle} text-center font-medium`}>SEG</th>
            <th className={`${colStyle} text-center font-medium`}>BTN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className={`${colStyle} text-slate-500 dark:text-slate-400 font-medium`}>{r.label}</td>
              <td className={`${colStyle} text-center text-slate-700 dark:text-slate-300 ${r.jkt > 0 ? "font-semibold" : "text-slate-300 dark:text-slate-600"}`}>
                {r.jkt || "-"}
              </td>
              <td className={`${colStyle} text-center text-slate-700 dark:text-slate-300 ${r.seg > 0 ? "font-semibold" : "text-slate-300 dark:text-slate-600"}`}>
                {r.seg || "-"}
              </td>
              <td className={`${colStyle} text-center text-slate-700 dark:text-slate-300 ${r.btn > 0 ? "font-semibold" : "text-slate-300 dark:text-slate-600"}`}>
                {r.btn || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Camera className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
        Belum Ada Foto Manifest
      </h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
        Foto yang diambil oleh driver akan otomatis muncul di galeri ini.
      </p>
    </div>
  );
}
