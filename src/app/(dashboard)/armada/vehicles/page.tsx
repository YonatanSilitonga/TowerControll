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
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 jam lalu" : `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 hari lalu" : `${d} hari lalu`;
}

/** LIVE = GPS masih fresh (≤ ambang offline) — kecepatan cuma valid kalau ini. */
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

  // No HP per driver (lowercase) — buat tombol "Telpon Driver" di popup peta.
  const phones: Record<string, string> = {};
  for (const dr of drivers ?? []) {
    if (dr.nama_driver && dr.no_hp) phones[dr.nama_driver.toLowerCase()] = dr.no_hp;
  }

  const liveVehicles = map.data?.vehicles ?? [];
  const selectedLive =
    liveVehicles.find((v) => v.id_kendaraan === selectedId) ?? null;
  const selectedRow =
    (data ?? []).find((k) => k.id_kendaraan === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Kendaraan"
        description="Daftar kendaraan armada & statusnya — klik baris untuk detail & log"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Kendaraan" }]}
      />
      <ArmadaTabs />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <DataTable<Kendaraan>
          loading={isLoading}
          rows={data ?? []}
          rowKey={(k) => String(k.id_kendaraan)}
          searchPlaceholder="Cari plat / jenis kendaraan..."
          showRowIndex
          searchFilter={(k, q) =>
            k.plat_nomor.toLowerCase().includes(q.toLowerCase()) ||
            (k.jenis_kendaraan ?? "").toLowerCase().includes(q.toLowerCase())
          }
          emptyText="Belum ada kendaraan"
          onRowClick={(k) => router.push(`/armada/vehicles/${k.id_kendaraan}`)}
          columns={[
            { header: "Plat", className: "font-mono text-xs font-medium", render: (k) => k.plat_nomor },
            { header: "Jenis", render: (k) => k.jenis_kendaraan ?? "-" },
            { header: "Kapasitas (kg)", className: "text-right", render: (k) => formatNumber(k.kapasitas_kg ?? 0) },
            { header: "Status", render: (k) => <StatusBadge status={k.status_kendaraan} /> },
            {
              header: "Lokasi",
              className: "text-right",
              render: (k) => {
                const live = liveVehicles.find((v) => v.id_kendaraan === k.id_kendaraan);
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    {live &&
                      (isLiveV(live) ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                            (live.kecepatan ?? 0) > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {(live.kecepatan ?? 0) > 0
                            ? `${live.kecepatan} km/h`
                            : "Berhenti"}
                        </span>
                      ) : (
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          Offline
                        </span>
                      ))}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((cur) =>
                          cur === k.id_kendaraan ? null : k.id_kendaraan
                        );
                      }}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold sm:min-h-[32px]",
                        selectedId === k.id_kendaraan
                          ? "border-[#FEA103] bg-[#FEA103] text-white"
                          : "border-slate-200 bg-white text-[#FEA103] hover:bg-slate-50"
                      )}
                    >
                      <LocateFixed className="h-3 w-3" /> Map
                    </button>
                  </div>
                );
              },
            },
          ]}
        />

        {/* Panel kanan: mini peta live + info kendaraan terpilih */}
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-lg border-slate-200">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Peta Armada
                <InfoTip text="Posisi realtime kendaraan. Klik tombol Map di tabel untuk zoom ke truk." />
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {liveVehicles.length} truk live
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[360px] p-0">
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

          {selectedRow && (
            <Card className="rounded-lg border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0c1e3a]">
                    Focus
                  </span>
                  {selectedRow.plat_nomor}
                  {selectedLive &&
                    (isLiveV(selectedLive) ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <i className="h-1 w-1 rounded-full bg-emerald-500" /> LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        Offline
                      </span>
                    ))}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={selectedRow.status_kendaraan} />
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Driver</span>
                  <span className="font-medium text-slate-800">
                    {selectedLive?.nama_driver ?? "-"}
                  </span>
                </div>
                {selectedLive && isLiveV(selectedLive) && (
                  <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
                    <span className="text-slate-500">Kecepatan</span>
                    <span className="font-semibold tabular-nums text-slate-800">
                      {`${selectedLive.kecepatan ?? 0} km/h`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">Update</span>
                  <span className="tabular-nums text-slate-800">
                    {selectedLive ? minutesAgo(selectedLive.last_update) : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}