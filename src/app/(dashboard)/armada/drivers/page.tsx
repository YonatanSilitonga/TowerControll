"use client";

import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useDriver } from "@/hooks/use-armada";
import type { DriverArmada } from "@/types/armada";

export default function DriversPage() {
  const { data, isLoading } = useDriver();
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Driver"
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
          { header: "Nama", className: "font-medium", render: (d) => d.nama_driver },
          {
            header: "Kendaraan",
            render: (d) =>
              d.plat_nomor ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-medium text-slate-800">{d.plat_nomor}</span>
                  {d.tracking_fresh ? (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Aktif
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      Lama
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-300">-</span>
              ),
          },
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