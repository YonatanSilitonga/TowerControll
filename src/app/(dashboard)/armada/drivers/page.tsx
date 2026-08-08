"use client";

import { Phone } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useDriver } from "@/hooks/use-armada";
import type { DriverArmada } from "@/types/armada";

export default function DriversPage() {
  const { data, isLoading } = useDriver();

  return (
    <div>
      <PageHeader
        title="Driver"
        description="Daftar driver armada (tetap / kondisional)"
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
        columns={[
          { header: "Nama", className: "font-medium", render: (d) => d.nama_driver },
          { header: "Telepon", render: (d) => d.no_hp ?? "-" },
          {
            header: "Jenis",
            render: (d) => (
              <span className="inline-flex rounded-full border border-slate-200 px-2 py-0.5 text-xs capitalize">
                {d.jenis_driver ?? "-"}
              </span>
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
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
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