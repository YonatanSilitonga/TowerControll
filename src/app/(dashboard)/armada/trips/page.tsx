"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useRitase } from "@/hooks/use-armada";
import type { Ritase } from "@/types/armada";

export default function RitasePage() {
  const { data, isLoading } = useRitase();
  const [tanggal, setTanggal] = useState("");

  const rows = (data ?? []).filter((r) => (tanggal ? r.tanggal === tanggal : true));

  return (
    <div>
      <PageHeader title="Ritase" description="Daftar RIT / penugasan perjalanan" />
      <ArmadaTabs />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="w-auto"
        />
        {tanggal && (
          <button onClick={() => setTanggal("")} className="text-xs font-semibold text-primary hover:underline">
            Reset tanggal
          </button>
        )}
      </div>

      <DataTable<Ritase>
        loading={isLoading}
        rows={rows}
        rowKey={(r) => String(r.id_ritase)}
        searchPlaceholder="Cari kode / driver / plat..."
        searchFilter={(r, q) =>
          r.kode_ritase.toLowerCase().includes(q.toLowerCase()) ||
          r.nama_driver.toLowerCase().includes(q.toLowerCase()) ||
          r.plat_nomor.toLowerCase().includes(q.toLowerCase())
        }
        emptyText="Belum ada ritase"
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
          { header: "Tanggal", render: (r) => r.tanggal },
          { header: "Driver", className: "font-medium", render: (r) => r.nama_driver },
          { header: "Plat", className: "font-mono text-xs", render: (r) => r.plat_nomor },
          { header: "RIT", className: "text-right", render: (r) => r.ritase_ke ?? "-" },
          {
            header: "Jadwal",
            render: (r) =>
              r.jam_mulai && r.jam_selesai ? `${r.jam_mulai} – ${r.jam_selesai}` : "-",
          },
          { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  );
}