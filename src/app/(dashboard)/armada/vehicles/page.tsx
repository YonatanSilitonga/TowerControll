"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useKendaraan } from "@/hooks/use-armada";
import { formatNumber } from "@/lib/utils";
import type { Kendaraan } from "@/types/armada";

export default function KendaraanPage() {
  const { data, isLoading } = useKendaraan();

  return (
    <div>
      <PageHeader title="Kendaraan" description="Daftar kendaraan armada & statusnya" />
      <ArmadaTabs />

      <DataTable<Kendaraan>
        loading={isLoading}
        rows={data ?? []}
        rowKey={(k) => String(k.id_kendaraan)}
        searchPlaceholder="Cari plat / jenis kendaraan..."
        searchFilter={(k, q) =>
          k.plat_nomor.toLowerCase().includes(q.toLowerCase()) ||
          (k.jenis_kendaraan ?? "").toLowerCase().includes(q.toLowerCase())
        }
        emptyText="Belum ada kendaraan"
        columns={[
          { header: "Plat", className: "font-mono text-xs font-medium", render: (k) => k.plat_nomor },
          { header: "Jenis", render: (k) => k.jenis_kendaraan ?? "-" },
          { header: "Kapasitas (kg)", className: "text-right", render: (k) => formatNumber(k.kapasitas_kg ?? 0) },
          { header: "Status", render: (k) => <StatusBadge status={k.status_kendaraan} /> },
        ]}
      />
    </div>
  );
}