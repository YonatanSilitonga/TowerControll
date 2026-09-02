"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTip } from "@/components/ui/info-tip";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useKendaraan, useDriver } from "@/hooks/use-armada";
import { useTrackingMap } from "@/hooks/use-tracking";
import { cn, formatNumber } from "@/lib/utils";
import { OFFLINE_MINUTES } from "@/lib/constants";
import type { Kendaraan } from "@/types/armada";

const LiveMap = dynamic(
  () => import("@/components/map/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  }
);

function minutesAgo(iso?: string): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

function isLiveV(v?: { offline?: boolean; last_update: string }): boolean {
  return (
    !!v &&
    !(v.offline ??
      (() => {
        const t = new Date(v.last_update).getTime();
        return Number.isNaN(t) ? true : Date.now() - t > OFFLINE_MINUTES * 60 * 1000;
      })())
  );
}

export default function KendaraanPage() {
  const { data, isLoading } = useKendaraan();
  const map = useTrackingMap();
  const { data: drivers } = useDriver();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const phones: Record<string, string> = {};
  for (const dr of drivers ?? []) {
    if (dr.nama_driver && dr.no_hp) phones[dr.nama_driver.toLowerCase()] = dr.no_hp;
  }

  const liveVehicles = map.data?.vehicles ?? [];
  const selectedLive = liveVehicles.find((v) => v.id_kendaraan === selectedId) ?? null;
  const selectedRow = (data ?? []).find((k) => k.id_kendaraan === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Kendaraan"
        description="Daftar kendaraan armada — klik baris untuk detail"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Kendaraan" }]}
      />
      <ArmadaTabs />

      {/* Sama persis dengan pola Seller: table kiri, sidebar kanan */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">

        {/* Table — wrapper persis seller: min-w-0 overflow-hidden */}
        <div className="min-w-0 overflow-hidden">
          <DataTable<Kendaraan>
            loading={isLoading}
            rows={data ?? []}
            rowKey={(k) => String(k.id_kendaraan)}
            tableLayout="fixed"
            searchPlaceholder="Cari plat / jenis kendaraan..."
            showRowIndex
            searchFilter={(k, q) =>
              k.plat_nomor.toLowerCase().includes(q.toLowerCase()) ||
              (k.jenis_kendaraan ?? "").toLowerCase().includes(q.toLowerCase())
            }
            emptyText="Belum ada kendaraan"
            onRowClick={(k) => router.push(`/armada/vehicles/${k.id_kendaraan}`)}
            columns={[
              {
                header: "Plat",
                className: "w-28 font-mono text-xs font-semibold",
                render: (k) => k.plat_nomor,
              },
              {
                header: "Jenis",
                className: "w-[140px]",
                render: (k) => (
                  <span className="block truncate text-slate-600">
                    {k.jenis_kendaraan ?? "-"}
                  </span>
                ),
              },
              {
                header: "Kapasitas",
                className: "w-28 text-right tabular-nums",
                render: (k) => `${formatNumber(k.kapasitas_kg ?? 0)} kg`,
              },
              {
                header: "Status",
                className: "w-28",
                render: (k) => <StatusBadge status={k.status_kendaraan} />,
              },
              {
                header: "Map",
                className: "w-20 text-right",
                render: (k) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId((cur) => cur === k.id_kendaraan ? null : k.id_kendaraan);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                      selectedId === k.id_kendaraan
                        ? "border-[#FEA103] bg-[#FEA103] text-white"
                        : "border-slate-200 bg-white text-[#FEA103] hover:bg-slate-50"
                    )}
                  >
                    <LocateFixed className="h-3 w-3" /> Map
                  </button>
                ),
              },
            ]}
          />
        </div>

        {/* Panel kanan: peta + detail — sama persis dengan seller */}
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-lg border-slate-200">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Peta Armada
                <InfoTip text="Posisi realtime kendaraan" />
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {liveVehicles.length} live
                </span>
              </CardTitle>
            </CardHeader>
            {/* Tinggi sama dengan seller: h-[280px] */}
            <CardContent className="h-[280px] p-0">
              <LiveMap
                compact
                vehicles={liveVehicles}
                sellers={map.data?.sellers ?? []}
                gudang={map.data?.gudang ?? []}
                dropPoints={map.data?.drop_points ?? []}
                phones={phones}
                selectedVehicleId={selectedId}
                onSelectVehicle={setSelectedId}
              />
            </CardContent>
          </Card>

          {/* Detail panel — sama persis dengan seller */}
          <Card className="rounded-lg border-slate-200 lg:sticky lg:top-24">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm font-semibold">Detail Kendaraan</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedRow ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Klik baris kendaraan untuk lihat detail
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-base font-bold text-amber-400">
                      {(selectedRow.plat_nomor || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-slate-800">{selectedRow.plat_nomor}</p>
                      <p className="truncate text-xs text-slate-400">{selectedRow.jenis_kendaraan ?? "-"}</p>
                    </div>
                    {selectedLive && isLiveV(selectedLive) ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <i className="h-1 w-1 rounded-full bg-emerald-500" /> LIVE
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        <i className="h-1 w-1 rounded-full bg-rose-500" /> Offline
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <DetailRow label="Kapasitas" value={`${formatNumber(selectedRow.kapasitas_kg ?? 0)} kg`} />
                    <DetailRow label="Status" value={<StatusBadge status={selectedRow.status_kendaraan} />} />
                    <DetailRow label="Driver" value={selectedLive?.nama_driver ?? "-"} />
                    {selectedLive && isLiveV(selectedLive) && (
                      <DetailRow label="Kecepatan" value={`${selectedLive.kecepatan ?? 0} km/h`} />
                    )}
                    <DetailRow label="Update" value={selectedLive ? minutesAgo(selectedLive.last_update) : "-"} />
                  </div>
                  <button
                    onClick={() => router.push(`/armada/vehicles/${selectedRow.id_kendaraan}`)}
                    className="mt-1 w-full rounded-md bg-[#0c1e3a] py-2 text-xs font-semibold text-white hover:bg-[#0c1e3a]/90"
                  >
                    Buka Detail Lengkap →
                  </button>
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
      <span className="min-w-0 flex-1 break-words text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
