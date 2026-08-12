"use client";

import { useRouter } from "next/navigation";
import { Phone, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useDriver } from "@/hooks/use-armada";
import { cn } from "@/lib/utils";
import type { DriverArmada } from "@/types/armada";

export default function DriversPage() {
  const { data, isLoading } = useDriver();
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Driver Roster"
        description="Daftar driver armada (tetap / kondisional) — klik baris untuk detail & log"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Driver" }]}
      />
      <ArmadaTabs />

      <DataTable<DriverArmada>
        loading={isLoading}
        rows={data ?? []}
        rowKey={(d) => String(d.id_driver)}
        searchPlaceholder="Cari nama / no HP driver..."
        searchFilter={(d, q) =>
          d.nama_driver.toLowerCase().includes(q.toLowerCase()) ||
          (d.no_hp ?? "").toLowerCase().includes(q.toLowerCase())
        }
        emptyText="Belum ada driver"
        onRowClick={(d) => router.push(`/armada/drivers/${d.id_driver}`)}
        columns={[
          {
            header: "Driver",
            render: (d) => (
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    d.tracking_fresh
                      ? "bg-[#0c1e3a] text-amber-400"
                      : "bg-slate-200 text-slate-600"
                  )}
                >
                  {d.nama_driver.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-medium text-slate-800">{d.nama_driver}</p>
                  <p className="text-[11px] capitalize text-slate-400">
                    ID {d.id_driver}
                  </p>
                </div>
              </div>
            ),
          },
          {
            header: "Kendaraan",
            render: (d) =>
              d.plat_nomor ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {d.plat_nomor}
                  </span>
                  {d.tracking_fresh ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <i className="h-1 w-1 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      <i className="h-1 w-1 rounded-full bg-rose-500" />
                      Offline
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                  <Truck className="h-3.5 w-3.5" /> Belum ada
                </span>
              ),
          },
          {
            header: "Kontak",
            render: (d) =>
              d.no_hp ? (
                <span className="tabular-nums text-slate-600">{d.no_hp}</span>
              ) : (
                <span className="text-xs text-slate-300">-</span>
              ),
          },
          { header: "Status", render: (d) => <StatusBadge status={d.status_driver} /> },
          {
            header: "Aksi",
            className: "text-right",
            render: (d) =>
              d.no_hp ? (
                <a
                  href={`tel:${d.no_hp.replace(/[^+\d]/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 sm:min-h-[32px]"
                >
                  <Phone className="h-3 w-3" /> Telepon
                </a>
              ) : (
                <span className="text-xs text-slate-300">-</span>
              ),
          },
        ]}
      />
    </div>
  );
}