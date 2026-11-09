"use client";

import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Calendar, CalendarRange, Clock, X, User, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useRitase, useDriver } from "@/hooks/use-armada";
import { cn, formatDateDMY, formatNumber } from "@/lib/utils";
import { isRitaseExpired } from "@/lib/constants";
import type { Ritase } from "@/types/armada";

export default function RitasePage() {
  const { data, isLoading } = useRitase();
  const { data: contactDrivers } = useDriver();
  const router = useRouter();

  // ── Date Filter State Terstandarisasi ──
  const getWIBDate = (d: Date = new Date()) => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  const todayStr = getWIBDate(new Date());
  const [dateMode, setDateMode] = useState<"all" | "today" | "yesterday" | "this_week" | "this_month" | "last_30d" | "custom">("all");
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const activeDateRange = useMemo<{
    mode: string;
    startDate?: string;
    endDate?: string;
    label: string;
  }>(() => {
    const now = new Date();

    if (dateMode === "all") {
      return { mode: "all", label: "Semua Waktu" };
    }

    if (dateMode === "today") {
      return {
        mode: "today",
        startDate: todayStr,
        endDate: todayStr,
        label: `Hari Ini (${todayStr})`,
      };
    }

    if (dateMode === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = getWIBDate(yest);
      return {
        mode: "yesterday",
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

      const monStr = getWIBDate(monday);
      const sunStr = getWIBDate(sunday);
      return {
        mode: "this_week",
        startDate: monStr,
        endDate: sunStr,
        label: `Minggu Ini (${monStr} s/d ${sunStr})`,
      };
    }

    if (dateMode === "this_month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1);
      const startStr = getWIBDate(firstDay);
      return {
        mode: "this_month",
        startDate: startStr,
        endDate: todayStr,
        label: `Bulan Ini (${startStr} s/d ${todayStr})`,
      };
    }

    if (dateMode === "last_30d") {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 29);
      const d30Str = getWIBDate(d30);
      return {
        mode: "last_30d",
        startDate: d30Str,
        endDate: todayStr,
        label: `30 Hari (${d30Str} s/d ${todayStr})`,
      };
    }

    if (dateMode === "custom") {
      return {
        mode: "custom",
        startDate: customStart,
        endDate: customEnd,
        label: `${customStart} s/d ${customEnd}`,
      };
    }

    return { mode: "all", label: "Semua Waktu" };
  }, [dateMode, customStart, customEnd, todayStr]);

  // ── Search & Filter State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenisFilter, setJenisFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dropPointFilter, setDropPointFilter] = useState("all");

  // ── Unique values for dropdowns ──
  const uniqueDrivers = useMemo(
    () => [...new Set((data ?? []).map((r) => r.nama_driver))].filter(Boolean).sort(),
    [data],
  );
  const uniqueDropPoints = useMemo(
    () => [...new Set((data ?? []).map((r) => r.nama_drop_point).filter(Boolean))].sort(),
    [data],
  );

  // ── Filter tanpa status (basis untuk status counts) ──
  const filteredBase = useMemo(
    () =>
      (data ?? [])
        .filter((r) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            (r.kode_ritase ?? "").toLowerCase().includes(q) ||
            (r.nama_driver ?? "").toLowerCase().includes(q) ||
            (r.plat_nomor ?? "").toLowerCase().includes(q)
          );
        })
        .filter((r) => {
          if (activeDateRange.mode === "all" || !activeDateRange.startDate || !activeDateRange.endDate) {
            return true;
          }
          const tgl = (r.tanggal ?? "").slice(0, 10);
          if (!tgl) return false;
          return tgl >= activeDateRange.startDate && tgl <= activeDateRange.endDate;
        })
        .filter((r) => jenisFilter === "all" || (r.jenis_ritase ?? "outgoing") === jenisFilter)
        .filter((r) => driverFilter === "all" || r.nama_driver === driverFilter)
        .filter((r) => dropPointFilter === "all" || r.nama_drop_point === dropPointFilter),
    [data, searchQuery, activeDateRange, jenisFilter, driverFilter, dropPointFilter],
  );

  // ── Status options (dinamis dari filteredBase) ──
  const statusOptions = useMemo(() => [
    { value: "all",          label: "Semua",        count: filteredBase.length },
    { value: "direncanakan", label: "Direncanakan",  count: filteredBase.filter((r) => r.status === "direncanakan").length },
    { value: "berjalan",     label: "Berjalan",      count: filteredBase.filter((r) => r.status === "berjalan").length },
    { value: "selesai",      label: "Selesai",       count: filteredBase.filter((r) => r.status === "selesai").length },
  ], [filteredBase]);

  // ── Rows final (filteredBase + status) ──
  const rows = useMemo(
    () => filteredBase.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [filteredBase, statusFilter],
  );

  const hasFilter =
    searchQuery ||
    dateMode !== "all" ||
    statusFilter !== "all" ||
    jenisFilter !== "all" ||
    driverFilter !== "all" ||
    dropPointFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setDateMode("all");
    setStatusFilter("all");
    setJenisFilter("all");
    setDriverFilter("all");
    setDropPointFilter("all");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jadwal & Riwayat Ritase"
        description="Daftar RIT / penugasan perjalanan — klik baris untuk lihat detail rute & timeline"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Jadwal & Riwayat" }]}
      />

      {/* ── UNIFIED FILTER TOOLBAR (Style Riwayat Pickup - Kanan & Kiri Rapi) ── */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-3.5 space-y-3">
          {/* Baris 1: Periode Presets (Kiri) & Periode Aktif Badge (Kanan) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Kiri: Periode Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Periode:
              </span>

              {/* Semua */}
              <button
                type="button"
                onClick={() => setDateMode("all")}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  dateMode === "all"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                Semua
              </button>

              {/* Hari Ini */}
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

              {/* Kemarin */}
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

              {/* Minggu Ini */}
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

              {/* Bulan Ini */}
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

              {/* 30 Hari */}
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

              {/* Pilih Rentang */}
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

            {/* Kanan: Tanggal Aktif Indicator */}
            <div className="flex items-center shrink-0 self-start sm:self-center">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  Periode: <strong className="text-slate-900 dark:text-white font-semibold">{activeDateRange.label}</strong>
                </span>
              </div>
            </div>
          </div>

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

          <div className="h-px bg-slate-100 dark:bg-slate-800/80" />

          {/* Baris 2: Search Input (Kiri) & Dropdowns Driver/Drop Point (Kanan) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Kiri: Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode ritase, driver, plat nomor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Kanan: Dropdowns Driver & Drop Point */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:shrink-0">
              <div className="w-full sm:w-52 relative">
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-400 transition-all"
                >
                  <option value="all">Semua Driver ({uniqueDrivers.length})</option>
                  {uniqueDrivers.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-56 relative">
                <select
                  value={dropPointFilter}
                  onChange={(e) => setDropPointFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-slate-400 transition-all"
                >
                  <option value="all">Semua Drop Point ({uniqueDropPoints.length})</option>
                  {uniqueDropPoints.map((dp) => (
                    <option key={dp} value={dp}>
                      {dp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/80" />

          {/* Baris 3: Status & Jenis (Kiri) & Total + Reset (Kanan) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Kiri: Status Pills + Jenis Pills */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Status Pills */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Status:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {statusOptions.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatusFilter(s.value)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        statusFilter === s.value
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {s.label} ({s.count})
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" />

              {/* Jenis Pills */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Jenis:
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { value: "all", label: "Semua" },
                    { value: "outgoing", label: "Outgoing" },
                    { value: "incoming", label: "Incoming" },
                  ].map((j) => (
                    <button
                      key={j.value}
                      type="button"
                      onClick={() => setJenisFilter(j.value)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                        jenisFilter === j.value
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {j.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kanan: Result Counter & Reset Button */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <strong className="text-slate-900 dark:text-white font-semibold">{rows.length}</strong> ritase
              </span>
              {hasFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                  title="Reset semua filter"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DATA TABLE ── */}
      <DataTable<Ritase>
        loading={isLoading}
        rows={rows}
        rowKey={(r) => String(r.id_ritase)}
        showRowIndex
        emptyText="Belum ada jadwal"
        onRowClick={(r) => router.push(`/armada/trips/${r.id_ritase}`)}
        rowClassName={(r) => {
          const s = r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) ? "tidak terlaksana" : r.status;
          if (s === "berjalan") return "border-l-4 border-l-sky-500 hover:bg-sky-50/30";
          if (s === "selesai") return "border-l-4 border-l-emerald-500 hover:bg-emerald-50/20";
          if (s === "tidak terlaksana") return "border-l-4 border-l-rose-500 hover:bg-rose-50/20";
          return "border-l-4 border-l-amber-400 hover:bg-amber-50/20";
        }}
        columns={[
          {
            header: "Kode",
            className: "font-mono text-xs font-semibold",
            sortKey: "kode_ritase",
            sortable: true,
            render: (r) => (
              <Link href={`/armada/trips/${r.id_ritase}`} className="text-slate-900 hover:text-[#FEA103] dark:text-slate-100">
                {r.kode_ritase}
              </Link>
            ),
          },
          {
            header: "Tanggal",
            className: "tabular-nums text-xs text-slate-700 dark:text-slate-300",
            sortKey: "tanggal",
            sortable: true,
            render: (r) => formatDateDMY(r.tanggal),
          },
          {
            header: "Driver",
            className: "text-xs font-medium uppercase",
            sortKey: "nama_driver",
            sortable: true,
            render: (r) => (
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                {r.nama_driver}
                <WhatsAppContact phone={contactDrivers?.find((d) => d.id_driver === r.id_driver)?.no_hp} name={r.nama_driver} compact />
              </span>
            ),
          },
          {
            header: "Plat",
            className: "font-mono text-xs text-slate-700 dark:text-slate-300",
            sortKey: "plat_nomor",
            sortable: true,
            render: (r) => r.plat_nomor,
          },
          {
            header: "RIT",
            className: "text-center tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200",
            sortKey: "ritase_ke",
            sortable: true,
            render: (r) => r.ritase_ke ?? "-",
          },
          {
            header: "AWB",
            className: "text-center tabular-nums text-xs text-slate-700 dark:text-slate-300",
            sortKey: "total_awb",
            sortable: true,
            render: (r) => formatNumber(r.total_awb ?? 0),
          },
          {
            header: "Koli",
            className: "text-center tabular-nums text-xs text-slate-700 dark:text-slate-300",
            sortKey: "total_koli",
            sortable: true,
            render: (r) => formatNumber(r.total_koli ?? 0),
          },
          {
            header: "Ecer",
            className: "text-center tabular-nums text-xs text-slate-700 dark:text-slate-300",
            sortKey: "total_eceran",
            sortable: true,
            render: (r) => formatNumber(r.total_eceran ?? 0),
          },
          {
            header: "Tujuan / Drop Point",
            className: "text-xs text-slate-700 dark:text-slate-300",
            render: (r) => (
              <span className="line-clamp-1" title={r.nama_drop_point ?? ""}>
                {r.nama_drop_point || "-"}
              </span>
            ),
          },
          {
            header: "Mulai",
            className: "tabular-nums text-xs text-slate-600 dark:text-slate-400",
            sortKey: "jam_mulai",
            sortable: true,
            render: (r) => r.jam_mulai?.slice(0, 5) || "-",
          },
          {
            header: "Selesai",
            className: "tabular-nums text-xs text-slate-600 dark:text-slate-400",
            sortKey: "jam_selesai",
            sortable: true,
            render: (r) => r.jam_selesai?.slice(0, 5) || "-",
          },
          {
            header: "Status",
            sortKey: "status",
            sortable: true,
            render: (r) => {
              const expired = r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai);
              return <StatusBadge status={expired ? "tidak terlaksana" : r.status} />;
            },
          },
        ]}
      />
    </div>
  );
}
