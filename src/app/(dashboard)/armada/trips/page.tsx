"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useRitase } from "@/hooks/use-armada";
import { cn, formatDateDMY, formatNumber } from "@/lib/utils";
import { isRitaseExpired, statusLabel } from "@/lib/constants";
import type { Ritase } from "@/types/armada";

export default function RitasePage() {
  const { data, isLoading } = useRitase();
  const router = useRouter();

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
    () =>
      [...new Set((data ?? []).map((r) => r.nama_drop_point).filter(Boolean))].sort(),
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

  const jenisOptions = useMemo(() => {
    const base = data ?? [];
    return [
      { value: "all", label: "Semua" },
      { value: "outgoing", label: "Outgoing" },
      { value: "incoming", label: "Incoming" },
    ];
  }, [data]);

  // ── Filter logic ──
  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((r) => !tanggal || r.tanggal === tanggal)
        .filter((r) => statusFilter === "all" || r.status === statusFilter)
        .filter((r) => jenisFilter === "all" || r.jenis_ritase === jenisFilter)
        .filter((r) => driverFilter === "all" || r.nama_driver === driverFilter)
        .filter((r) => dropPointFilter === "all" || r.nama_drop_point === dropPointFilter),
    [data, tanggal, statusFilter, jenisFilter, driverFilter, dropPointFilter],
  );

  const hasFilter = tanggal || statusFilter !== "all" || jenisFilter !== "all" || driverFilter !== "all" || dropPointFilter !== "all";

  const resetFilters = () => {
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

      <DataTable<Ritase>
        loading={isLoading}
        rows={rows}
        rowKey={(r) => String(r.id_ritase)}
        searchPlaceholder="Cari kode / driver / plat..."
        showRowIndex
        toolbar={
          <div className="flex flex-wrap items-end gap-2">
            {/* Tanggal */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</span>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-auto"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
              <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {statusOptions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatusFilter(s.value)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
                      statusFilter === s.value
                        ? "bg-[#FEA103] text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                    )}
                  >
                    {s.label} ({s.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Jenis */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenis</span>
              <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                {jenisOptions.map((j) => (
                  <button
                    key={j.value}
                    type="button"
                    onClick={() => setJenisFilter(j.value)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
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

            {/* Driver */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</span>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Semua Driver</option>
                {uniqueDrivers.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Drop Point */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drop Point</span>
              <select
                value={dropPointFilter}
                onChange={(e) => setDropPointFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Semua Drop Point</option>
                {uniqueDropPoints.map((dp) => (
                  <option key={dp} value={dp}>{dp}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-8 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
              >
                Reset
              </button>
            )}
          </div>
        }
        searchFilter={(r, q) =>
          r.kode_ritase.toLowerCase().includes(q.toLowerCase()) ||
          r.nama_driver.toLowerCase().includes(q.toLowerCase()) ||
          r.plat_nomor.toLowerCase().includes(q.toLowerCase())
        }
        emptyText="Belum ada ritase"
        onRowClick={(r) => router.push(`/armada/trips/${r.id_ritase}`)}
        columns={[
          {
            header: "Kode",
            className: "font-mono text-xs font-medium",
            render: (r) => (
              <Link href={`/armada/trips/${r.id_ritase}`} className="text-primary hover:underline">
                {r.kode_ritase}
              </Link>
            ),
          },
          { header: "Tanggal", className: "tabular-nums", render: (r) => formatDateDMY(r.tanggal) },
          { header: "Driver", className: "font-medium", render: (r) => r.nama_driver },
          { header: "Plat", className: "font-mono text-xs", render: (r) => r.plat_nomor },
          { header: "RIT", className: "text-right", render: (r) => r.ritase_ke ?? "-" },
          { header: "AWB", className: "text-right tabular-nums", render: (r) => formatNumber(r.total_awb ?? 0) },
          { header: "Koli", className: "text-right tabular-nums", render: (r) => formatNumber(r.total_koli ?? 0) },
          { header: "HV", className: "text-right tabular-nums", render: (r) => formatNumber(r.total_high_value ?? 0) },
          { header: "Eceran", className: "text-right tabular-nums", render: (r) => formatNumber(r.total_eceran ?? 0) },
          {
            header: "Jadwal",
            render: (r) =>
              r.jam_mulai && r.jam_selesai ? `${r.jam_mulai} – ${r.jam_selesai}` : "-",
          },
          { header: "Status", render: (r) => <StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) ? "tidak terlaksana" : r.status} /> },
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
