"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useRitase } from "@/hooks/use-armada";
import { cn, formatDateDMY, formatNumber } from "@/lib/utils";
import { isRitaseExpired } from "@/lib/constants";
import type { Ritase } from "@/types/armada";

export default function RitasePage() {
  const { data, isLoading } = useRitase();
  const router = useRouter();

  // ── Search (di atas filter) ──
  const [searchQuery, setSearchQuery] = useState("");

  // ── Filters ──
  const [tanggal, setTanggal] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenisFilter, setJenisFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dropPointFilter, setDropPointFilter] = useState("all");

  // ── Unique values for dropdowns ──
  const uniqueDrivers = useMemo(
    () => [...new Set((data ?? []).map((r) => r.nama_driver))].sort(),
    [data],
  );
  const uniqueDropPoints = useMemo(
    () => [...new Set((data ?? []).map((r) => r.nama_drop_point).filter(Boolean))].sort(),
    [data],
  );

  // ── Status options with counts ──
  const statusOptions = useMemo(() => {
    const base = data ?? [];
    return [
      { value: "all", label: "Semua", count: base.length },
      { value: "direncanakan", label: "Direncanakan", count: base.filter((r) => r.status === "direncanakan").length },
      { value: "berjalan", label: "Berjalan", count: base.filter((r) => r.status === "berjalan").length },
      { value: "selesai", label: "Selesai", count: base.filter((r) => r.status === "selesai").length },
    ];
  }, [data]);

  // ── Filter logic ──
  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((r) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            r.kode_ritase.toLowerCase().includes(q) ||
            r.nama_driver.toLowerCase().includes(q) ||
            r.plat_nomor.toLowerCase().includes(q)
          );
        })
        .filter((r) => !tanggal || r.tanggal === tanggal)
        .filter((r) => statusFilter === "all" || r.status === statusFilter)
        .filter((r) => jenisFilter === "all" || (r.jenis_ritase ?? "outgoing") === jenisFilter)
        .filter((r) => driverFilter === "all" || r.nama_driver === driverFilter)
        .filter((r) => dropPointFilter === "all" || r.nama_drop_point === dropPointFilter),
    [data, searchQuery, tanggal, statusFilter, jenisFilter, driverFilter, dropPointFilter],
  );

  const hasFilter = searchQuery || tanggal || statusFilter !== "all" || jenisFilter !== "all" || driverFilter !== "all" || dropPointFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setTanggal("");
    setStatusFilter("all");
    setJenisFilter("all");
    setDriverFilter("all");
    setDropPointFilter("all");
  };

  return (
    <div>
      <PageHeader
        title="Ritase"
        description="Daftar RIT / penugasan perjalanan — klik baris untuk lihat detail rute & timeline"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Ritase" }]}
      />
      <ArmadaTabs />

      {/* ── FILTER BAR ── */}
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {/* Row 1: Search + Reset (mobile: full width) */}
        <div className="flex items-center gap-2">
          <div className="relative min-h-[44px] flex-1 sm:min-h-[32px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode / driver / plat..."
              className="min-h-[44px] pl-9 sm:min-h-[32px]"
            />
          </div>
          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[44px] shrink-0 rounded-md border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400 sm:min-h-[32px]"
            >
              Reset
            </button>
          )}
        </div>

        {/* Row 2: Status + Jenis chips (horizontal scroll on mobile) */}
        <div className="flex flex-wrap items-end gap-2">
          {/* Tanggal */}
          <div className="flex shrink-0 flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tanggal</span>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
          </div>

          {/* Status */}
          <div className="flex shrink-0 flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</span>
            <div className="flex items-center gap-0.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {statusOptions.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatusFilter(s.value)}
                  className={cn(
                    "whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold transition-all",
                    statusFilter === s.value
                      ? "bg-[#FEA103] text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  {s.label}({s.count})
                </button>
              ))}
            </div>
          </div>

          {/* Jenis */}
          <div className="flex shrink-0 flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Jenis</span>
            <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
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
                    "whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold transition-all",
                    jenisFilter === j.value
                      ? "bg-[#FEA103] text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Driver + Drop Point dropdowns (full width on mobile) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Driver</span>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="h-8 w-full truncate rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua</option>
              {uniqueDrivers.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Drop Point</span>
            <select
              value={dropPointFilter}
              onChange={(e) => setDropPointFilter(e.target.value)}
              className="h-8 w-full truncate rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua</option>
              {uniqueDropPoints.map((dp) => (
                <option key={dp} value={dp}>{dp}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DataTable<Ritase>
        loading={isLoading}
        rows={rows}
        rowKey={(r) => String(r.id_ritase)}
        showRowIndex
        emptyText="Belum ada ritase"
        onRowClick={(r) => router.push(`/armada/trips/${r.id_ritase}`)}
        rowClassName={(r) => {
          const s = r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) ? "tidak terlaksana" : r.status;
          if (s === "berjalan") return "border-l-[3px] border-l-sky-500";
          if (s === "selesai") return "border-l-[3px] border-l-emerald-500";
          if (s === "tidak terlaksana") return "border-l-[3px] border-l-rose-500";
          return "border-l-[3px] border-l-amber-400";
        }}
        columns={[
          {
            header: "Kode",
            className: "font-mono text-xs font-medium",
            sortKey: "kode_ritase",
            sortable: true,
            render: (r) => (
              <Link href={`/armada/trips/${r.id_ritase}`} className="text-primary hover:underline">
                {r.kode_ritase}
              </Link>
            ),
          },
          { header: "Tanggal", className: "tabular-nums", sortKey: "tanggal", sortable: true, render: (r) => formatDateDMY(r.tanggal) },
          { header: "Driver", className: "font-medium", sortKey: "nama_driver", sortable: true, render: (r) => r.nama_driver },
          { header: "Plat", className: "font-mono text-xs", sortKey: "plat_nomor", sortable: true, render: (r) => r.plat_nomor },
          { header: "RIT", className: "text-right", sortKey: "ritase_ke", sortable: true, render: (r) => r.ritase_ke ?? "-" },
          { header: "AWB", className: "text-right tabular-nums", sortKey: "total_awb", sortable: true, render: (r) => formatNumber(r.total_awb ?? 0) },
          { header: "Koli", className: "text-right tabular-nums", sortKey: "total_koli", sortable: true, render: (r) => formatNumber(r.total_koli ?? 0) },
          { header: "HV", className: "text-right tabular-nums", sortKey: "total_high_value", sortable: true, render: (r) => formatNumber(r.total_high_value ?? 0) },
          { header: "Eceran", className: "text-right tabular-nums", sortKey: "total_eceran", sortable: true, render: (r) => formatNumber(r.total_eceran ?? 0) },
          {
            header: "Jadwal",
            render: (r) =>
              r.jam_mulai && r.jam_selesai ? `${r.jam_mulai} – ${r.jam_selesai}` : "-",
          },
          { header: "Status", sortKey: "status", sortable: true, render: (r) => <StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) ? "tidak terlaksana" : r.status} /> },
          {
            header: "Detail",
            className: "text-right",
            render: (r) => (
              <Link
                href={`/armada/trips/${r.id_ritase}`}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-[#FEA103]/40 hover:text-[#FEA103] sm:min-h-[32px]"
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
