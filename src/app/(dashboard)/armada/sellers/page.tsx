"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useSeller } from "@/hooks/use-seller";
import type { Seller } from "@/types/seller";

export default function SellersPage() {
  const { data, isLoading } = useSeller();
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Seller"
        description="Daftar seller (titik pickup) & kontak — klik baris untuk lihat di peta"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Seller" }]}
      />
      <ArmadaTabs />

      <DataTable<Seller>
        loading={isLoading}
        rows={data ?? []}
        rowKey={(s) => String(s.id)}
        searchPlaceholder="Cari nama / kota seller..."
        searchFilter={(s, q) =>
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          (s.city ?? "").toLowerCase().includes(q.toLowerCase())
        }
        emptyText="Belum ada seller"
        onRowClick={(s) => router.push(`/armada/live-map?seller=${s.id}`)}
        columns={[
          { header: "Kode", className: "font-mono text-xs", render: (s) => s.code },
          { header: "Nama", className: "font-medium", render: (s) => s.name },
          { header: "Kota", render: (s) => s.city },
          { header: "PIC", render: (s) => s.pic ?? "-" },
          {
            header: "No HP",
            render: (s) => (s.no_hp ? <a href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`} className="text-emerald-700 hover:underline">{s.no_hp}</a> : "-"),
          },
          {
            header: "Peta",
            className: "text-right",
            render: (s) => (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-[#034075]">
                <MapPin className="h-3 w-3" /> Lihat di map
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}