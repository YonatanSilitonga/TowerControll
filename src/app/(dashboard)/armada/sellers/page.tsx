"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin, Phone, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { InfoTip } from "@/components/ui/info-tip";
import { useSeller } from "@/hooks/use-seller";
import { useTrackingMap } from "@/hooks/use-tracking";
import { cn } from "@/lib/utils";
import type { Seller } from "@/types/seller";

const LiveMap = dynamic(
  () => import("@/components/map/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  }
);

export default function SellersPage() {
  const { data, isLoading } = useSeller();
  // Sumber koordinat: tracking map (dijamin ada lat/lng) — master `/sellers`
  // punya lat/lng nullable, jadi gak andal buat marker.
  const map = useTrackingMap();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const sellers = data ?? [];
  const selected = sellers.find((s) => s.id === selectedId) ?? null;
  const tracked = map.data?.sellers ?? [];
  // Seller yang posisinya ada di peta (untuk indikator di tabel & notice).
  const trackedIds = new Set(tracked.map((t) => t.id_seller));
  const hasPos = selected ? trackedIds.has(selected.id) : false;

  return (
    <div>
      <PageHeader
        title="Seller"
        description="Master data titik pickup — informasi kontak & posisi"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Seller" }]}
      />

      <ArmadaTabs />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <DataTable<Seller>
          loading={isLoading}
          rows={sellers}
          rowKey={(s) => String(s.id)}
          tableLayout="fixed"
          searchPlaceholder="Cari nama / kota / alamat..."
          searchFilter={(s, q) =>
            s.name.toLowerCase().includes(q.toLowerCase()) ||
            (s.city ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (s.address ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (s.pic ?? "").toLowerCase().includes(q.toLowerCase())
          }
          emptyText="Belum ada seller"
          onRowClick={(s) =>
            setSelectedId((cur) => (cur === s.id ? null : s.id))
          }
          columns={[
            { header: "Kode", className: "w-20 font-mono text-xs", render: (s) => s.code },
            {
              header: "Nama",
              className: "w-[200px] font-medium",
              render: (s) => (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{s.name}</span>
                  {!trackedIds.has(s.id) && (
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      Tanpa posisi
                    </span>
                  )}
                </div>
              ),
            },
            {
              header: "Alamat",
              className: "w-[160px]",
              render: (s) =>
                s.address ? (
                  <span title={s.address} className="block w-full truncate text-slate-600">
                    {s.address}
                  </span>
                ) : (
                  "-"
                ),
            },
            { header: "PIC", className: "w-20", render: (s) => s.pic ?? "-" },
            {
              header: "No HP",
              className: "w-32",
              render: (s) =>
                s.no_hp ? (
                  <a
                    href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 sm:min-h-[30px]"
                  >
                    <Phone className="h-3 w-3" /> Telepon
                  </a>
                ) : (
                  <span className="text-xs text-slate-300">-</span>
                ),
            },
            {
              header: "Lokasi",
              className: "w-28 text-right",
              render: (s) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId((cur) => (cur === s.id ? null : s.id));
                  }}
                  className={cn(
                    "inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold sm:min-h-[30px]",
                    selectedId === s.id
                      ? "border-[#FEA103] bg-[#FEA103] text-white"
                      : "border-slate-200 bg-white text-[#FEA103] hover:bg-slate-50"
                  )}
                >
                  <MapPin className="h-3 w-3" /> Map
                </button>
              ),
            },
          ]}
        />

        {/* Panel kanan: peta seller + detail */}
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-lg border-slate-200">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Peta Seller
                <InfoTip text="Lokasi seller. Klik baris tabel untuk zoom & buka popup seller." />
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {tracked.length} bertitik
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] p-0">
              <LiveMap
                key={selectedId ?? "all"}
                compact
                vehicles={[]}
                sellers={tracked}
                gudang={map.data?.gudang ?? []}
                dropPoints={map.data?.drop_points ?? []}
                phones={{}}
                selectedVehicleId={null}
                onSelectVehicle={() => {}}
                initialFocus={
                  hasPos && selectedId ? { type: "seller", id: selectedId } : undefined
                }
              />
            </CardContent>
          </Card>

          {/* Panel Detail Seller */}
          <Card className="rounded-lg border-slate-200 lg:sticky lg:top-24">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm font-semibold">Detail Seller</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Klik baris seller untuk lihat detail
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-base font-bold text-amber-400">
                      {(selected.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-800">{selected.name}</p>
                      <p className="font-mono text-xs text-slate-400">{selected.code}</p>
                    </div>
                  </div>
                  {!hasPos && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Seller ini belum punya posisi (koordinat belum diisi).
                    </p>
                  )}
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
