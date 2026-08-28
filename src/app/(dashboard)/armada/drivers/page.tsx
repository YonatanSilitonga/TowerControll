"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, MapPin, Phone, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTip } from "@/components/ui/info-tip";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useDriver } from "@/hooks/use-armada";
import { useTrackingMap } from "@/hooks/use-tracking";
import { cn, formatNumber } from "@/lib/utils";
import { OFFLINE_MINUTES } from "@/lib/constants";
import type { DriverArmada } from "@/types/armada";

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

export default function DriversPage() {
  const { data, isLoading } = useDriver();
  const { data: mapData } = useTrackingMap();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const liveVehicles = mapData?.vehicles ?? [];
  const selectedDriver = (data ?? []).find((d) => d.id_driver === selectedId);
  const selectedLive = selectedDriver?.id_kendaraan
    ? liveVehicles.find((v) => v.id_kendaraan === selectedDriver.id_kendaraan)
    : null;

  // No HP per driver (lowercase) — buat tombol "Telpon Driver" di popup peta.
  const phones: Record<string, string> = {};
  for (const dr of data ?? []) {
    if (dr.nama_driver && dr.no_hp) phones[dr.nama_driver.toLowerCase()] = dr.no_hp;
  }

  return (
    <div>
      <PageHeader
        title="Driver Roster"
        description="Daftar driver armada (tetap / kondisional) — klik baris untuk detail & log"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Driver" }]}
      />
      <ArmadaTabs />

      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_380px]">
        <DataTable<DriverArmada>
          loading={isLoading}
          rows={data ?? []}
          rowKey={(d) => String(d.id_driver)}
          searchPlaceholder="Cari nama / no HP driver..."
          showRowIndex
          searchFilter={(d, q) =>
            d.nama_driver.toLowerCase().includes(q.toLowerCase()) ||
            (d.no_hp ?? "").toLowerCase().includes(q.toLowerCase())
          }
          emptyText="Belum ada driver"
          onRowClick={(d) => router.push(`/armada/drivers/${d.id_driver}`)}
          columns={[
            {
              header: "Driver",
              render: (d) => (
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      d.tracking_fresh
                        ? "bg-[#0c1e3a] text-amber-400"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {d.nama_driver.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate font-medium text-slate-800">{d.nama_driver}</p>
                    <p className="text-[11px] capitalize text-slate-400">
                      ID {d.id_driver}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              header: "Kendaraan",
              render: (d) =>
                d.plat_nomor ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {d.plat_nomor}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                    <Truck className="h-3.5 w-3.5" /> Belum ada
                  </span>
                ),
            },
            {
              header: "Online",
              render: (d) =>
                d.tracking_fresh ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <i className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                    <i className="h-1 w-1 rounded-full bg-rose-500" />
                    Offline
                  </span>
                ),
            },
            { header: "Status Karyawan", render: (d) => <StatusBadge status={d.status_driver} /> },
            {
              header: "No HP",
              render: (d) =>
                d.no_hp ? (
                  <a
                    href={`tel:${d.no_hp.replace(/[^+\d]/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 sm:min-h-[32px]"
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
              render: (d) => (
                <div className="flex items-center justify-end gap-1.5">
                  {d.id_kendaraan && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((cur) => (cur === d.id_driver ? null : d.id_driver));
                      }}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold sm:min-h-[32px]",
                        selectedId === d.id_driver
                          ? "border-[#FEA103] bg-[#FEA103] text-white"
                          : "border-slate-200 bg-white text-[#FEA103] hover:bg-slate-50"
                      )}
                    >
                      <LocateFixed className="h-3 w-3" /> Map
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />

        {/* Panel kanan: mini peta live + info driver terpilih */}
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-lg border-slate-200">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Peta Armada
                <InfoTip text="Posisi realtime driver. Klik tombol Map di tabel untuk zoom ke kendaraan." />
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {liveVehicles.length} truk live
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[360px] p-0">
              <LiveMap
                compact
                vehicles={liveVehicles}
                sellers={mapData?.sellers ?? []}
                gudang={mapData?.gudang ?? []}
                dropPoints={mapData?.drop_points ?? []}
                phones={phones}
                selectedVehicleId={selectedDriver?.id_kendaraan ?? null}
                onSelectVehicle={(id) => {
                  const driver = (data ?? []).find((d) => d.id_kendaraan === id);
                  setSelectedId(driver?.id_driver ?? null);
                }}
              />
            </CardContent>
          </Card>

          {selectedDriver && (
            <Card className="rounded-lg border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0c1e3a]">
                    Focus
                  </span>
                  {selectedDriver.nama_driver}
                  {selectedLive && isLiveV(selectedLive) ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <i className="h-1 w-1 rounded-full bg-emerald-500" /> LIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      <i className="h-1 w-1 rounded-full bg-rose-500" />
                      Offline
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Kendaraan</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedDriver.plat_nomor ?? "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={selectedDriver.status_driver} />
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