"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, MapPin, Phone, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { InfoTip } from "@/components/ui/info-tip";
import { useSeller } from "@/hooks/use-seller";
import type { Seller } from "@/types/seller";

export default function SellersPage() {
  const { data, isLoading } = useSeller();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const sellers = data ?? [];
  const selected = sellers.find((s) => s.id === selectedId) ?? null;
  const kotaCount = new Set(sellers.map((s) => s.city ?? "").filter(Boolean)).size;

  return (
    <div>
      <PageHeader
        title="Seller"
        description="Master data titik pickup — informasi kontak & posisi"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Seller" }]}
      />

      {!isLoading && sellers.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-[#034075]" /> {sellers.length} seller
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" /> {kotaCount} kota
          </span>
          <span className="text-slate-400">Geser header kolom untuk atur lebar · klik baris → peta</span>
        </div>
      )}

      <ArmadaTabs />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <DataTable<Seller>
          loading={isLoading}
          rows={sellers}
          rowKey={(s) => String(s.id)}
          searchPlaceholder="Cari nama / kota / alamat..."
          searchFilter={(s, q) =>
            s.name.toLowerCase().includes(q.toLowerCase()) ||
            (s.city ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (s.address ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (s.pic ?? "").toLowerCase().includes(q.toLowerCase())
          }
          emptyText="Belum ada seller"
          onRowClick={(s) => router.push(`/armada/live-map?seller=${s.id}`)}
          columns={[
            { header: "Kode", className: "font-mono text-xs", render: (s) => s.code },
            { header: "Nama", className: "font-medium", render: (s) => s.name },
            {
              header: "Alamat",
              render: (s) =>
                s.address ? (
                  <span title={s.address} className="block max-w-[240px] truncate text-slate-600">
                    {s.address}
                  </span>
                ) : (
                  "-"
                ),
            },
            { header: "PIC", render: (s) => s.pic ?? "-" },
            {
              header: "No HP",
              render: (s) =>
                s.no_hp ? (
                  <a
                    href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Phone className="h-3 w-3" /> Telepon
                  </a>
                ) : (
                  <span className="text-xs text-slate-300">-</span>
                ),
            },
            {
              header: "Aksi",
              className: "text-right",
              render: (s) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId((cur) => (cur === s.id ? null : s.id));
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-[#034075]/40 hover:text-[#034075]"
                  >
                    <Eye className="h-3 w-3" /> Detail
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/armada/live-map?seller=${s.id}`);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-[#034075] hover:bg-[#034075] hover:text-white"
                  >
                    <MapPin className="h-3 w-3" /> Map
                  </button>
                </div>
              ),
            },
          ]}
        />

        {/* Panel Detail Seller (sticky) */}
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Detail Seller
              <InfoTip text="Info lengkap seller. Klik tombol Detail di baris tabel untuk memilih." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Klik "Detail" pada baris seller
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold text-emerald-700">
                    {(selected.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-800">{selected.name}</p>
                    <p className="font-mono text-xs text-slate-400">{selected.code}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <DetailRow label="Kota" value={selected.city ?? "-"} />
                  <DetailRow label="Alamat" value={selected.address ?? "-"} />
                  <DetailRow
                    label="PIC"
                    value={
                      selected.pic ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {selected.pic}
                        </span>
                      ) : (
                        "-"
                      )
                    }
                  />
                  <DetailRow
                    label="No HP"
                    value={
                      selected.no_hp ? (
                        <a
                          href={`tel:${selected.no_hp.replace(/[^+\d]/g, "")}`}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Phone className="h-3 w-3" /> {selected.no_hp}
                        </a>
                      ) : (
                        "-"
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/armada/live-map?seller=${selected.id}`)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#034075] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0a5aa8]"
                >
                  <MapPin className="h-4 w-4" /> Lihat di map
                </button>
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
