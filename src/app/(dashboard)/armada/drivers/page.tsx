"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTip } from "@/components/ui/info-tip";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { useDriver } from "@/hooks/use-armada";
import { useTrackingMap } from "@/hooks/use-tracking";
import { cn } from "@/lib/utils";
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

  const phones: Record<string, string> = {};
  for (const dr of data ?? []) {
    if (dr.nama_driver && dr.no_hp) phones[dr.nama_driver.toLowerCase()] = dr.no_hp;
  }

  return (
    <div>
      <PageHeader
        title="Driver"
        description="Daftar driver armada — klik baris untuk detail"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Driver" }]}
      />
      <ArmadaTabs />

      {/* Sama persis dengan pola Seller: table kiri, sidebar kanan */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">

        {/* Table — wrapper persis seller: min-w-0 overflow-hidden */}
        <div className="min-w-0 overflow-hidden">
          <DataTable<DriverArmada>
            loading={isLoading}
            rows={data ?? []}
            rowKey={(d) => String(d.id_driver)}
            tableLayout="fixed"
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
                header: "Nama Driver",
                className: "w-[180px] font-medium",
                render: (d) => (
                  <span className="block truncate">{d.nama_driver}</span>
                ),
              },
              {
                header: "Kendaraan",
                className: "w-24",
                render: (d) =>
                  d.plat_nomor ? (
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {d.plat_nomor}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  ),
              },
              {
                header: "GPS",
                className: "w-16",
                render: (d) =>
                  d.tracking_fresh ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <i className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" /> Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      <i className="h-1 w-1 rounded-full bg-rose-500" /> Off
                    </span>
                  ),
              },
              {
                header: "Status",
                className: "w-28",
                render: (d) => <StatusBadge status={d.status_driver} />,
              },
              {
                header: "No HP",
                className: "w-28",
                render: (d) =>
                  d.no_hp ? (
                    <a
                      href={`tel:${d.no_hp.replace(/[^+\d]/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Phone className="h-3 w-3" /> Telepon
                    </a>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  ),
              },
              {
                header: "Map",
                className: "w-20 text-right",
                render: (d) =>
                  d.id_kendaraan ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((cur) => cur === d.id_driver ? null : d.id_driver);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                        selectedId === d.id_driver
                          ? "border-[#FEA103] bg-[#FEA103] text-white"
                          : "border-slate-200 bg-white text-[#FEA103] hover:bg-slate-50"
                      )}
                    >
                      <LocateFixed className="h-3 w-3" /> Map
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
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
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Peta Driver
                <InfoTip text="Posisi realtime driver. Klik tombol Map di tabel untuk zoom ke kendaraan." />
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

          {/* Detail panel — sama persis dengan seller */}
          <Card className="rounded-lg border-slate-200 lg:sticky lg:top-24">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm font-semibold">Detail Driver</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDriver ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Klik baris driver untuk lihat detail
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-base font-bold text-amber-400">
                      {(selectedDriver.nama_driver || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-slate-800">{selectedDriver.nama_driver}</p>
                      <p className="truncate text-xs text-slate-400">{selectedDriver.plat_nomor ?? "Belum ada kendaraan"}</p>
                    </div>
                    {selectedDriver.tracking_fresh ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <i className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" /> LIVE
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        <i className="h-1 w-1 rounded-full bg-rose-500" /> Offline
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <DetailRow label="Status" value={<StatusBadge status={selectedDriver.status_driver} />} />
                    <DetailRow
                      label="No HP"
                      value={
                        selectedDriver.no_hp ? (
                          <a
                            href={`tel:${selectedDriver.no_hp.replace(/[^+\d]/g, "")}`}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <Phone className="h-3 w-3" /> {selectedDriver.no_hp}
                          </a>
                        ) : "-"
                      }
                    />
                    {selectedLive && isLiveV(selectedLive) && (
                      <DetailRow label="Kecepatan" value={`${selectedLive.kecepatan ?? 0} km/h`} />
                    )}
                    <DetailRow label="Update" value={selectedLive ? minutesAgo(selectedLive.last_update) : "-"} />
                  </div>
                  <button
                    onClick={() => router.push(`/armada/drivers/${selectedDriver.id_driver}`)}
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
