"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrackingMap } from "@/hooks/use-tracking";
import { cn } from "@/lib/utils";
import type { ImplantLocation } from "@/types/armada";

const LiveMap = dynamic(
  () => import("@/components/map/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
  }
);

function hasCoordinate(item: ImplantLocation) {
  return (
    item.latitude != null &&
    item.longitude != null &&
    (item.latitude !== 0 || item.longitude !== 0)
  );
}

export default function ImplantsPage() {
  const map = useTrackingMap();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const implants = useMemo(() => map.data?.implants ?? [], [map.data?.implants]);
  const trackedIds = useMemo(
    () => new Set(implants.filter(hasCoordinate).map((item) => item.id_implant)),
    [implants]
  );
  const mapImplants = useMemo(() => {
    const points = map.data?.implant_points;
    return points && points.length > 0 ? points : implants.filter(hasCoordinate);
  }, [implants, map.data?.implant_points]);

  const selected = implants.find((item) => item.id_implant === selectedId) ?? null;
  const selectedHasCoordinate = selected
    ? trackedIds.has(selected.id_implant)
    : false;
  const hasMapPoint = selected
    ? mapImplants.some((item) => item.id_implant === selected.id_implant)
    : false;

  return (
    <div>
      <PageHeader
        title="Implan"
        description="Master data titik implant — informasi kapten & posisi"
        crumbs={[{ label: "Armada", href: "/armada" }, { label: "Implan" }]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 overflow-hidden">
          <DataTable<ImplantLocation>
            loading={map.isLoading}
            rows={implants}
            rowKey={(item) => String(item.id_implant)}
            tableLayout="fixed"
            searchPlaceholder="Cari nama / kode / kota / alamat..."
            showRowIndex
            searchFilter={(item, q) => {
              const query = q.toLowerCase();
              return (
                item.nama_implant.toLowerCase().includes(query) ||
                (item.kode_implant ?? "").toLowerCase().includes(query) ||
                (item.kota ?? "").toLowerCase().includes(query) ||
                (item.alamat ?? "").toLowerCase().includes(query) ||
                (item.kapten ?? "").toLowerCase().includes(query)
              );
            }}
            emptyText="Belum ada implant"
            onRowClick={(item) =>
              setSelectedId((current) =>
                current === item.id_implant ? null : item.id_implant
              )
            }
            columns={[
              {
                header: "Kode",
                className: "w-20 font-mono text-xs",
                sortKey: "kode_implant",
                sortable: true,
                render: (item) => item.kode_implant || "-",
              },
              {
                header: "Nama",
                className: "w-[220px] font-medium",
                sortKey: "nama_implant",
                sortable: true,
                render: (item) => (
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{item.nama_implant}</span>
                    {!trackedIds.has(item.id_implant) && (
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        Tanpa posisi
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: "Alamat",
                className: "w-[220px] overflow-hidden whitespace-nowrap",
                render: (item) =>
                  item.alamat ? (
                    <span title={item.alamat} className="block truncate text-slate-600">
                      {item.alamat}
                    </span>
                  ) : (
                    "-"
                  ),
              },
              {
                header: "Kapten",
                className: "w-32",
                render: (item) => item.kapten || "-",
              },
              {
                header: "No HP",
                className: "w-32",
                render: (item) =>
                  item.no_hp ? (
                    <WhatsAppContact phone={item.no_hp} name={item.kapten} compact />
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  ),
              },
              {
                header: "Lokasi",
                className: "w-28 text-right",
                render: (item) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId((current) =>
                        current === item.id_implant ? null : item.id_implant
                      );
                    }}
                    className={cn(
                      "inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold sm:min-h-[30px]",
                      selectedId === item.id_implant
                        ? "border-[#FEA103] bg-[#FEA103] text-white"
                        : "border-slate-200 bg-white text-[#FEA103] hover:bg-slate-50"
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    Map
                  </button>
                ),
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-lg border-slate-200">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Peta Implan
                <InfoTip text="Lokasi implant di peta" />
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {mapImplants.length} titik
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] p-0">
              <LiveMap
                key={selectedId ?? "all"}
                compact
                vehicles={[]}
                sellers={[]}
                implants={mapImplants}
                gudang={map.data?.gudang ?? []}
                dropPoints={map.data?.drop_points ?? []}
                phones={{}}
                selectedVehicleId={null}
                onSelectVehicle={() => {}}
                initialFocus={
                  hasMapPoint && selectedId
                    ? { type: "implant", id: selectedId }
                    : undefined
                }
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 lg:sticky lg:top-24">
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm font-semibold">Detail Implan</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Klik baris implant untuk lihat detail
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-base font-bold text-amber-400">
                      {(selected.nama_implant || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-800">
                        {selected.nama_implant}
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        {selected.kode_implant || "-"}
                      </p>
                    </div>
                  </div>

                  {!selectedHasCoordinate && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Implant ini belum punya posisi (koordinat belum diisi).
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <DetailRow label="Kota" value={selected.kota || "-"} />
                    <DetailRow label="Alamat" value={selected.alamat || "-"} />
                    <DetailRow label="Kapten" value={selected.kapten || "-"} />
                    <DetailRow
                      label="No HP"
                      value={
                        selected.no_hp ? (
                          <WhatsAppContact
                            phone={selected.no_hp}
                            name={selected.kapten}
                          />
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
      <span className="min-w-0 max-w-[220px] break-words text-right text-sm font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}
