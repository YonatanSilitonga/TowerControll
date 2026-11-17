"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Store,
  Truck,
  User,
  X,
  ArrowUpDown,
  Filter,
  Building2,
  Package,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAllDriverPickupHistory, useTrackingMap } from "@/hooks/use-tracking";
import { useManifestPenjemputan } from "@/hooks/use-manifest-photos";
import { getRitaseFromLog, RITASE_CONFIG } from "@/lib/ritase";
import type { DriverPickupLog, RiwayatPenjemputan } from "@/types/armada";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────────────── */
function toWIBDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatWIBTime(isoString: string): string {
  if (!isoString) return "--:--";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "--:--";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00+07:00");
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

type DateMode = "today" | "yesterday" | "custom";

/* ─────────────────────────────────────────────────────────────────────────────
 * Struktur Data Tunggal Gabungan (Unified Row)
 * ───────────────────────────────────────────────────────────────────────────── */
interface UnifiedRow {
  id: string;
  sourceType: "pickup" | "implan";
  timestamp: string;
  lokasi: string;
  driverOrPetugas: string;
  platOrCode: string;
  awb: number;
  koliJkt: number;
  koliSeg: number;
  koliBtn: number;
  totalKoli: number;
  ecerJkt: number;
  ecerSeg: number;
  ecerBtn: number;
  totalEcer: number;
  highValue: number;
  ritase: number;
  status: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Badges
 * ───────────────────────────────────────────────────────────────────────────── */
function SourceBadge({ type }: { type: "pickup" | "implan" }) {
  if (type === "pickup") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
        <Truck className="h-3 w-3" />
        Pickup
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-200">
      <Building2 className="h-3 w-3" />
      Implan (Kapten)
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    selesai: {
      label: "Selesai",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    menuju_gudang: {
      label: "Menuju Gudang",
      cls: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    sedang_menuju: {
      label: "Sedang Menuju",
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    konfirmasi: {
      label: "Terkonfirmasi",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
  };
  const cfg = map[status] ?? {
    label: status || "Selesai",
    cls: "bg-slate-50 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
        cfg.cls
      )}
    >
      {cfg.label}
    </span>
  );
}

function RitaseBadge({ ritase }: { ritase: number }) {
  const cfg = RITASE_CONFIG[ritase as keyof typeof RITASE_CONFIG] ?? {
    label: `Ritase ${ritase}`,
  };
  const colorMap: Record<number, string> = {
    1: "bg-sky-50 text-sky-700 ring-sky-200",
    2: "bg-violet-50 text-violet-700 ring-violet-200",
    3: "bg-orange-50 text-orange-700 ring-orange-200",
    4: "bg-amber-50 text-amber-700 ring-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
        colorMap[ritase] ?? "bg-slate-50 text-slate-600 ring-slate-200"
      )}
    >
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Skeleton Row
 * ───────────────────────────────────────────────────────────────────────────── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100">
          <td className="px-3 py-3 text-center">
            <div className="mx-auto h-4 w-5 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="h-4 w-12 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="h-5 w-16 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="h-4 w-28 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3">
            <div className="h-4 w-28 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3 text-right">
            <div className="ml-auto h-4 w-10 rounded bg-slate-100" />
          </td>
          <td colSpan={3} className="px-3 py-3 text-center">
            <div className="mx-auto h-4 w-16 rounded bg-slate-100" />
          </td>
          <td colSpan={3} className="px-3 py-3 text-center">
            <div className="mx-auto h-4 w-16 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3 text-center">
            <div className="mx-auto h-4 w-8 rounded bg-slate-100" />
          </td>
          <td className="px-3 py-3 text-center">
            <div className="mx-auto h-5 w-14 rounded-full bg-slate-100" />
          </td>
          <td className="px-3 py-3 text-center">
            <div className="mx-auto h-5 w-16 rounded-full bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Summary Cards
 * ───────────────────────────────────────────────────────────────────────────── */
function SummaryCards({
  rows,
  isLoading,
}: {
  rows: UnifiedRow[];
  isLoading: boolean;
}) {
  const summary = useMemo(() => {
    let awb = 0;
    let koliJkt = 0;
    let koliSeg = 0;
    let koliBtn = 0;
    let ecerJkt = 0;
    let ecerSeg = 0;
    let ecerBtn = 0;
    let hv = 0;

    rows.forEach((r) => {
      awb += r.awb;
      koliJkt += r.koliJkt;
      koliSeg += r.koliSeg;
      koliBtn += r.koliBtn;
      ecerJkt += r.ecerJkt;
      ecerSeg += r.ecerSeg;
      ecerBtn += r.ecerBtn;
      hv += r.highValue;
    });

    const totalKoli = koliJkt + koliSeg + koliBtn;
    const totalEcer = ecerJkt + ecerSeg + ecerBtn;

    return {
      totalRows: rows.length,
      awb,
      totalKoli,
      koliJkt,
      koliSeg,
      koliBtn,
      totalEcer,
      ecerJkt,
      ecerSeg,
      ecerBtn,
      hv,
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 h-3 w-16 rounded bg-slate-100" />
            <div className="h-7 w-12 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {/* Total Sesi */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
            <Layers className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-500">Total Transaksi</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{summary.totalRows}</p>
        <p className="mt-1 text-[11px] text-slate-400">Pickup + Implan</p>
      </div>

      {/* Total AWB */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
            <Truck className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-500">Total AWB</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-blue-600">
          {summary.awb.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">Muatan Paket Toko</p>
      </div>

      {/* Total Koli */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-purple-50 p-1.5 text-purple-600">
            <Package className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-500">Total Koli</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-purple-700">
          {summary.totalKoli.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          JKT: <span className="font-semibold text-slate-700">{summary.koliJkt}</span> | SEG:{" "}
          <span className="font-semibold text-slate-700">{summary.koliSeg}</span> | BTN:{" "}
          <span className="font-semibold text-slate-700">{summary.koliBtn}</span>
        </p>
      </div>

      {/* Total Ecer */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
            <Store className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-500">Total Ecer</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-emerald-700">
          {summary.totalEcer.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          JKT: <span className="font-semibold text-slate-700">{summary.ecerJkt}</span> | SEG:{" "}
          <span className="font-semibold text-slate-700">{summary.ecerSeg}</span> | BTN:{" "}
          <span className="font-semibold text-slate-700">{summary.ecerBtn}</span>
        </p>
      </div>

      {/* High Value */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-slate-500">High Value (HV)</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-amber-600">
          {summary.hv.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">Paket Bernilai Tinggi</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main Page
 * ───────────────────────────────────────────────────────────────────────────── */
export default function ExportExcelPage() {
  /* ---- Date States ---- */
  const todayStr = useMemo(() => toWIBDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toWIBDateString(d);
  }, []);

  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "pickup" | "implan">("all");
  const [selectedRitase, setSelectedRitase] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const dateInputRef = useRef<HTMLInputElement>(null);

  /* ---- Tanggal aktif ---- */
  const activeDate = useMemo(() => {
    if (dateMode === "today") return todayStr;
    if (dateMode === "yesterday") return yesterdayStr;
    return customDate;
  }, [dateMode, customDate, todayStr, yesterdayStr]);

  /* ── 1. Fetch Data Pickup Driver ── */
  const pickupQueryParams = useMemo(
    () => ({
      start_date: activeDate,
      end_date: activeDate,
      tanggal: activeDate,
      limit: 1000,
    }),
    [activeDate]
  );
  const {
    data: rawPickupLogs = [],
    isLoading: isPickupLoading,
    isFetching: isPickupFetching,
    refetch: refetchPickup,
  } = useAllDriverPickupHistory(pickupQueryParams);

  /* ── 2. Fetch Data Implan Kapten ── */
  const {
    data: rawImplanData,
    isLoading: isImplanLoading,
    isFetching: isImplanFetching,
    refetch: refetchImplan,
  } = useManifestPenjemputan({ tanggal: activeDate });

  /* ── 3. Data Live Map untuk Plat Nomor ── */
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

  const getPlatNomor = useCallback(
    (log: DriverPickupLog) => {
      if (log.plat_nomor && log.plat_nomor.trim() && log.plat_nomor !== "B8888WIS") {
        return log.plat_nomor;
      }
      if (log.id_user && driverPlatMap.has(log.id_user)) {
        return driverPlatMap.get(log.id_user)!;
      }
      const matchName = (mapData?.vehicles ?? []).find(
        (v) => v.nama_driver?.toLowerCase() === log.nama_driver?.toLowerCase()
      );
      if (matchName?.plat_nomor) return matchName.plat_nomor;
      return log.plat_nomor || "";
    },
    [driverPlatMap, mapData]
  );

  /* ── 4. Normalisasi dan Penggabungan Data ke 1 Array Tunggal ── */
  const unifiedRows = useMemo(() => {
    const list: UnifiedRow[] = [];

    // A. Masukkan Baris Pickup Driver (Hanya transaksi penjemputan riil toko seller)
    rawPickupLogs.forEach((p) => {
      const sellerStr = (p.asal_seller ?? "").trim();
      const sellerLower = sellerStr.toLowerCase();
      const statusLower = (p.status ?? "").trim().toLowerCase();
      const catatanLower = (p.catatan ?? "").trim().toLowerCase();

      // Filter: Abaikan semua log Gudang, kepulangan, atau perjalanan gudang
      const isGudangOrTravel =
        sellerLower === "gudang" ||
        sellerLower.includes("gudang") ||
        sellerLower.includes("perjalanan") ||
        sellerLower === "" ||
        statusLower === "selesai" ||
        statusLower === "kembali_ke_gudang" ||
        catatanLower.includes("gudang");

      if (isGudangOrTravel) {
        return; // Lewati, tidak perlu dimasukkan
      }

      list.push({
        id: `pickup-${p.id_log}`,
        sourceType: "pickup",
        timestamp: p.created_at || p.tanggal,
        lokasi: sellerStr,
        driverOrPetugas: p.nama_driver || "Driver Pickup",
        platOrCode: getPlatNomor(p),
        awb: p.jumlah_barang || 0,
        koliJkt: 0,
        koliSeg: 0,
        koliBtn: 0,
        totalKoli: p.koli || 0,
        ecerJkt: 0,
        ecerSeg: 0,
        ecerBtn: 0,
        totalEcer: p.ecer || 0,
        highValue: p.high_value || 0,
        ritase: getRitaseFromLog(p),
        status: p.status,
      });
    });

    // B. Masukkan Baris Implan Kapten (Abaikan jika lokasi adalah Gudang)
    const implanRiwayat = rawImplanData?.riwayat ?? [];
    implanRiwayat.forEach((imp: RiwayatPenjemputan) => {
      const lokasiStr = (imp.nama_lokasi ?? "").trim();
      const lokasiLower = lokasiStr.toLowerCase();

      // Abaikan jika lokasi bernilai Gudang
      if (lokasiLower === "gudang" || lokasiLower.includes("gudang") || lokasiStr === "") {
        return;
      }

      const koliJ = imp.koli_jkt ?? 0;
      const koliS = imp.koli_seg ?? 0;
      const koliB = imp.koli_btn ?? 0;
      const ecerJ = imp.ecer_jkt ?? 0;
      const ecerS = imp.ecer_seg ?? 0;
      const ecerB = imp.ecer_btn ?? 0;

      list.push({
        id: `implan-${imp.id}`,
        sourceType: "implan",
        timestamp: imp.created_at || imp.tanggal,
        lokasi: lokasiStr || "Titik Implan",
        driverOrPetugas: imp.nama_driver || "Kapten",
        platOrCode: imp.kode_ritase || "Line Haul",
        awb: imp.jumlah_awb || 0,
        koliJkt: koliJ,
        koliSeg: koliS,
        koliBtn: koliB,
        totalKoli: koliJ + koliS + koliB || imp.total_koli || 0,
        ecerJkt: ecerJ,
        ecerSeg: ecerS,
        ecerBtn: ecerB,
        totalEcer: ecerJ + ecerS + ecerB || imp.total_ecer || 0,
        highValue: imp.total_hv || 0,
        ritase: imp.ritase_ke || 1,
        status: "selesai",
      });
    });

    return list;
  }, [rawPickupLogs, rawImplanData, getPlatNomor]);

  /* ── 5. Filtering & Sorting ── */
  const filteredRows = useMemo(() => {
    // Pastikan tidak ada data Gudang yang lolos ke tabel
    let result = unifiedRows.filter(
      (r) => !r.lokasi.toLowerCase().includes("gudang") && r.lokasi.trim() !== ""
    );

    // Filter Kategori (Pickup / Implan)
    if (categoryFilter !== "all") {
      result = result.filter((r) => r.sourceType === categoryFilter);
    }

    // Filter Ritase
    if (selectedRitase !== "all") {
      const ritTarget = parseInt(selectedRitase, 10);
      result = result.filter((r) => r.ritase === ritTarget);
    }

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.lokasi.toLowerCase().includes(q) ||
          r.driverOrPetugas.toLowerCase().includes(q) ||
          r.platOrCode.toLowerCase().includes(q)
      );
    }

    // Sort kronologis jam
    return [...result].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [unifiedRows, categoryFilter, selectedRitase, search, sortAsc]);

  /* ---- Navigasi Tanggal ---- */
  function shiftDate(dir: 1 | -1) {
    const base = dateMode === "today" ? todayStr : dateMode === "yesterday" ? yesterdayStr : customDate;
    const d = new Date(base + "T00:00:00+07:00");
    d.setDate(d.getDate() + dir);
    const next = toWIBDateString(d);
    setCustomDate(next);
    setDateMode("custom");
  }

  const customLabel = useMemo(
    () =>
      dateMode === "custom"
        ? new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(customDate + "T00:00:00+07:00"))
        : "Pilih Tanggal",
    [dateMode, customDate]
  );

  const isLoading = isPickupLoading || isImplanLoading;
  const isFetching = isPickupFetching || isImplanFetching;

  const handleRefresh = () => {
    refetchPickup();
    refetchImplan();
  };

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <PageHeader
        title="Export Excel"
        description="Laporan rekapitulasi data gabungan Pickup Driver dan Implan Kapten dalam satu tampilan terpadu."
        crumbs={[{ label: "Export Excel" }]}
        actions={
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 opacity-60 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ekspor Excel
          </button>
        }
      />

      {/* ── Filter & Navigation Bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {/* Tanggal Navigation */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all"
            title="Tanggal sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => setDateMode("today")}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-all",
              dateMode === "today"
                ? "bg-[#0c1e3a] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-800"
            )}
          >
            Hari Ini
          </button>

          <button
            onClick={() => setDateMode("yesterday")}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-all",
              dateMode === "yesterday"
                ? "bg-[#0c1e3a] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-slate-800"
            )}
          >
            Kemarin
          </button>

          <div className="relative">
            <button
              onClick={() => dateInputRef.current?.showPicker?.()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-all",
                dateMode === "custom"
                  ? "bg-[#0c1e3a] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-800"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {customLabel}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={customDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value) {
                  setCustomDate(e.target.value);
                  setDateMode("custom");
                }
              }}
              className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
            />
          </div>

          <button
            onClick={() => shiftDate(1)}
            disabled={activeDate >= todayStr}
            className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-30"
            title="Tanggal berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Label Tanggal Aktif */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-800">{formatDisplayDate(activeDate)}</span>
        </div>

        <div className="hidden h-6 w-px bg-slate-200 md:block" />

        {/* Filter Kategori (Pickup / Implan) */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | "pickup" | "implan")}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition-all"
          >
            <option value="all">Semua Kategori (Pickup & Implan)</option>
            <option value="pickup">📦 Hanya Pickup Driver</option>
            <option value="implan">🏢 Hanya Implan (Kapten)</option>
          </select>
        </div>

        {/* Filter Ritase */}
        <div className="flex items-center gap-1">
          <select
            value={selectedRitase}
            onChange={(e) => setSelectedRitase(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition-all"
          >
            <option value="all">Semua Ritase</option>
            <option value="1">Ritase 1</option>
            <option value="2">Ritase 2</option>
            <option value="3">Ritase 3</option>
            <option value="4">Ritase 4</option>
          </select>
        </div>

        <div className="flex-1" />

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari toko, driver, atau kapten…"
            className="h-9 w-48 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all sm:w-56"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          title="Sinkronisasi Data Terbaru"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-blue-600")} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <SummaryCards rows={filteredRows} isLoading={isLoading} />

      {/* ── TABEL GABUNGAN PICKUP & IMPLAN (KAPTEN) ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table Header Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Tabel Rekapitulasi Terpadu (Pickup & Implan)</span>
            {!isLoading && (
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {filteredRows.length} baris
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Urutan Jam: {sortAsc ? "Awal → Akhir" : "Akhir → Awal"}</span>
            </button>
            <span className="hidden text-slate-300 sm:inline">•</span>
            <div className="hidden items-center gap-1 text-slate-400 sm:flex">
              <Clock className="h-3.5 w-3.5" />
              <span>WIB (UTC+7)</span>
            </div>
          </div>
        </div>

        {/* Scroll Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-xs">
            <thead>
              {/* Row 1: Header Grup */}
              <tr className="border-b border-slate-700 bg-[#0c1e3a] text-white">
                <th rowSpan={2} className="w-10 px-3 py-2 text-center border-r border-slate-700/60 font-semibold">
                  #
                </th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-700/60 font-semibold">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="inline-flex items-center gap-1 text-white hover:text-slate-200"
                  >
                    <Clock className="h-3.5 w-3.5 opacity-70" />
                    <span>Jam</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-700/60 font-semibold">
                  Kategori
                </th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-700/60 font-semibold">
                  Toko / Lokasi
                </th>
                <th rowSpan={2} className="px-3 py-2 text-left border-r border-slate-700/60 font-semibold">
                  Driver / Petugas
                </th>
                <th rowSpan={2} className="px-3 py-2 text-right border-r border-slate-700/60 font-semibold">
                  AWB
                </th>

                {/* Sub-Header Group: KOLI */}
                <th colSpan={3} className="px-2 py-1.5 text-center border-r border-slate-700/60 bg-blue-950/70 font-semibold uppercase tracking-wider text-[11px] text-blue-200">
                  Muatan Koli
                </th>

                {/* Sub-Header Group: ECER */}
                <th colSpan={3} className="px-2 py-1.5 text-center border-r border-slate-700/60 bg-emerald-950/70 font-semibold uppercase tracking-wider text-[11px] text-emerald-200">
                  Muatan Ecer
                </th>

                <th rowSpan={2} className="px-3 py-2 text-center border-r border-slate-700/60 font-semibold">
                  HV
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center border-r border-slate-700/60 font-semibold">
                  Ritase
                </th>
                <th rowSpan={2} className="px-3 py-2 text-center font-semibold">
                  Status
                </th>
              </tr>

              {/* Row 2: Sub-Kolom Koli & Ecer */}
              <tr className="border-b border-slate-200 bg-[#0c1e3a]/95 text-slate-200 text-[11px]">
                {/* Koli sub-cols */}
                <th className="px-2.5 py-1 text-center bg-blue-950/50 border-r border-slate-700/40">JKT</th>
                <th className="px-2.5 py-1 text-center bg-blue-950/50 border-r border-slate-700/40">SEG</th>
                <th className="px-2.5 py-1 text-center bg-blue-950/50 border-r border-slate-700/60">BTN</th>

                {/* Ecer sub-cols */}
                <th className="px-2.5 py-1 text-center bg-emerald-950/50 border-r border-slate-700/40">JKT</th>
                <th className="px-2.5 py-1 text-center bg-emerald-950/50 border-r border-slate-700/40">SEG</th>
                <th className="px-2.5 py-1 text-center bg-emerald-950/50 border-r border-slate-700/60">BTN</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <SkeletonRows />
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <FileSpreadsheet className="h-10 w-10 text-slate-200" />
                      <div>
                        <p className="font-semibold text-slate-600">
                          {search || categoryFilter !== "all" || selectedRitase !== "all"
                            ? "Tidak ada data yang sesuai filter"
                            : "Belum ada transaksi pickup atau implan"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {search || categoryFilter !== "all" || selectedRitase !== "all"
                            ? "Coba ubah kata kunci pencarian atau sesuaikan filter kategori/ritase"
                            : `Tidak ditemukan catatan muatan pada ${formatDisplayDate(activeDate)}`}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* Nomor */}
                      <td className="px-3 py-2.5 text-center font-medium text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* Jam */}
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap border-r border-slate-100">
                        {formatWIBTime(r.timestamp)}
                      </td>

                      {/* Kategori */}
                      <td className="px-3 py-2.5 whitespace-nowrap border-r border-slate-100">
                        <SourceBadge type={r.sourceType} />
                      </td>

                      {/* Toko / Lokasi */}
                      <td className="px-3 py-2.5 font-semibold text-slate-800 border-r border-slate-100">
                        <span>{r.lokasi}</span>
                      </td>

                      {/* Driver / Petugas */}
                      <td className="px-3 py-2.5 border-r border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-800">{r.driverOrPetugas}</p>
                          {r.platOrCode && (
                            <p className="text-[10px] text-slate-500">{r.platOrCode}</p>
                          )}
                        </div>
                      </td>

                      {/* AWB */}
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-900 border-r border-slate-100">
                        {r.awb === 0 ? (
                          <span className="text-slate-300 font-normal">-</span>
                        ) : (
                          r.awb.toLocaleString("id-ID")
                        )}
                      </td>

                      {/* Koli JKT */}
                      <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-100">
                        {r.koliJkt > 0 ? (
                          <span className="font-bold text-blue-700">{r.koliJkt}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Koli SEG */}
                      <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-100">
                        {r.koliSeg > 0 ? (
                          <span className="font-bold text-blue-700">{r.koliSeg}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Koli BTN */}
                      <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-100">
                        {r.koliBtn > 0 ? (
                          <span className="font-bold text-blue-700">{r.koliBtn}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ecer JKT */}
                      <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-100">
                        {r.ecerJkt > 0 ? (
                          <span className="font-bold text-emerald-700">{r.ecerJkt}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ecer SEG */}
                      <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-100">
                        {r.ecerSeg > 0 ? (
                          <span className="font-bold text-emerald-700">{r.ecerSeg}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ecer BTN */}
                      <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-100">
                        {r.ecerBtn > 0 ? (
                          <span className="font-bold text-emerald-700">{r.ecerBtn}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* High Value (HV) */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        {r.highValue > 0 ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {r.highValue} HV
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ritase */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap border-r border-slate-100">
                        <RitaseBadge ritase={r.ritase} />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        {!isLoading && filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
            <span>
              Menampilkan <span className="font-semibold text-slate-700">{filteredRows.length}</span> baris data terpadu
            </span>
            <div className="flex items-center gap-4 text-slate-600">
              <span>
                Total AWB:{" "}
                <strong className="text-slate-900">
                  {filteredRows.reduce((s, r) => s + r.awb, 0).toLocaleString("id-ID")}
                </strong>
              </span>
              <span>•</span>
              <span>
                Total Koli:{" "}
                <strong className="text-purple-700">
                  {filteredRows.reduce((s, r) => s + r.totalKoli, 0).toLocaleString("id-ID")}
                </strong>
              </span>
              <span>•</span>
              <span>
                Total Ecer:{" "}
                <strong className="text-emerald-700">
                  {filteredRows.reduce((s, r) => s + r.totalEcer, 0).toLocaleString("id-ID")}
                </strong>
              </span>
              <span>•</span>
              <span>
                Total HV:{" "}
                <strong className="text-amber-700">
                  {filteredRows.reduce((s, r) => s + r.highValue, 0)}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
