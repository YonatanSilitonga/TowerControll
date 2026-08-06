"use client";

import { useState } from "react";
import { Phone, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useSeller } from "@/hooks/use-seller";
import type { Seller } from "@/types/seller";

export default function SellersPage() {
  const { data, isLoading } = useSeller();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = (data ?? []).find((s) => s.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader title="Seller" description="Daftar seller (titik pickup) & kontak" />
      <ArmadaTabs />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
          onRowClick={(s) => setSelectedId((cur) => (cur === s.id ? null : s.id))}
          columns={[
            { header: "Kode", className: "font-mono text-xs", render: (s) => s.code },
            { header: "Nama", className: "font-medium", render: (s) => s.name },
            { header: "Kota", render: (s) => s.city },
            { header: "PIC", render: (s) => s.pic ?? "-" },
            {
              header: "No HP",
              render: (s) =>
                s.no_hp ? (
                  <a href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                    <Phone className="h-3 w-3" /> {s.no_hp}
                  </a>
                ) : (
                  "-"
                ),
            },
          ]}
        />

        {/* Detail seller */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Detail Seller</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Klik baris seller untuk lihat detail
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-base font-bold text-emerald-700">{selected.name}</p>
                  <p className="text-xs text-slate-400">{selected.code}</p>
                </div>
                <div className="space-y-1.5">
                  <DetailRow label="Alamat" value={selected.address ?? "-"} />
                  <DetailRow label="Kota" value={selected.city ?? "-"} />
                  <DetailRow
                    label="PIC"
                    value={
                      selected.pic ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {selected.pic}
                        </span>
                      ) : "-"
                    }
                  />
                  <DetailRow
                    label="No HP"
                    value={
                      selected.no_hp ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {selected.no_hp}
                        </span>
                      ) : "-"
                    }
                  />
                  {selected.latitude && selected.longitude && (
                    <DetailRow
                      label="Koordinat"
                      value={`${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`}
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}