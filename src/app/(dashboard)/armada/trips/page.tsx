"use client";

import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { useRitase, useDriver } from "@/hooks/use-armada";
import { cn, formatDateDMY, formatNumber } from "@/lib/utils";
import { isRitaseExpired } from "@/lib/constants";
import type { Ritase } from "@/types/armada";

export default function RitasePage() {
  const { data, isLoading } = useRitase();
  const { data: contactDrivers } = useDriver();
  const router = useRouter();

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
        .filter((r) => jenisFilter === "all" || (r.jenis_ritase ?? "outgoing") === jenisFilter)
        .filter((r) => driverFilter === "all" || r.nama_driver === driverFilter)
        .filter((r) => dropPointFilter === "all" || r.nama_drop_point === dropPointFilter),
    [data, searchQuery, jenisFilter, driverFilter, dropPointFilter],
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

  const hasFilter = searchQuery || statusFilter !== "all" || jenisFilter !== "all" || driverFilter !== "all" || dropPointFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setJenisFilter("all");
    setDriverFilter("all");
    setDropPointFilter("all");
  };

  return (
    <div>
      <PageHeader
        title="Jadwal & Riwayat Ritase"
        description="Daftar RIT / penugasan perjalanan — klik baris untuk lihat detail rute & timeline"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Jadwal & Riwayat" }]}
      />

      {/* ── FILTER BAR CARD (Layout Grid Seimbang 2-Baris Presisi) ── */}
      <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {/* Row 1: Search (Lebar) + Driver Select */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode / driver / plat..."
              className="h-9 pl-9 text-xs rounded-lg border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="flex shrink-0 flex-col gap-1 w-full sm:w-60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</span>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="h-9 w-full truncate rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua</option>
              {uniqueDrivers.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Status chips + Drop Point + Jenis (Berjejer harmonis tanpa gap kosong renggang) */}
        <div className="mt-3.5 flex flex-wrap items-end gap-3 sm:gap-4 pt-1">
          {/* Status Pills */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200/90 bg-slate-50/80 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
              {statusOptions.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatusFilter(s.value)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                    statusFilter === s.value
                      ? "bg-[#FEA103] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                  )}
                >
                  {s.label}({s.count})
                </button>
              ))}
            </div>
          </div>

          {/* Drop Point */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drop Point</span>
            <select
              value={dropPointFilter}
              onChange={(e) => setDropPointFilter(e.target.value)}
              className="h-9 w-full truncate rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua</option>
              {uniqueDropPoints.map((dp) => (
                <option key={dp} value={dp}>{dp}</option>
              ))}
            </select>
          </div>

          {/* Jenis */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenis</span>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-slate-50/80 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
              {[
                { value: "all", label: "Semua" },
                { value: "outgoing", label: "Out" },
                { value: "incoming", label: "In" },
              ].map((j) => (
                <button
                  key={j.value}
                  type="button"
                  onClick={() => setJenisFilter(j.value)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                    jenisFilter === j.value
                      ? "bg-[#FEA103] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                  )}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters button */}
          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
              title="Reset semua filter"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

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
            header: "HV",
            className: "text-center tabular-nums text-xs text-slate-700 dark:text-slate-300",
            sortKey: "total_high_value",
            sortable: true,
            render: (r) => formatNumber(r.total_high_value ?? 0),
          },
          {
            header: "Eceran",
            className: "text-center tabular-nums text-xs text-slate-700 dark:text-slate-300",
            sortKey: "total_eceran",
            sortable: true,
            render: (r) => formatNumber(r.total_eceran ?? 0),
          },
          {
            header: "Jadwal",
            className: "text-xs text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-400",
            render: (r) =>
              r.jam_mulai && r.jam_selesai
                ? `${r.jam_mulai.slice(0, 5)} – ${r.jam_selesai.slice(0, 5)}`
                : "-",
          },
          {
            header: "Status",
            sortKey: "status",
            sortable: true,
            render: (r) => (
              <StatusBadge
                status={
                  r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai)
                    ? "tidak terlaksana"
                    : r.status
                }
              />
            ),
          },
          {
            header: "Detail",
            className: "text-right",
            render: (r) => (
              <Link
                href={`/armada/trips/${r.id_ritase}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-[#FEA103]/40 hover:bg-slate-50 hover:text-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Eye className="h-3 w-3" /> Buka
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
