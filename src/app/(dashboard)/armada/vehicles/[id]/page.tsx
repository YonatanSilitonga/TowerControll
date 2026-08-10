"use client";

import { notFound, useRouter } from "next/navigation";
import { MapPin, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { DriverSummary } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { DataTable } from "@/components/ui/data-table";
import { useKendaraan, useRitase } from "@/hooks/use-armada";
import { useTrackingHistory } from "@/hooks/use-tracking";
import { formatDateDMY, formatNumber } from "@/lib/utils";
import type { Ritase } from "@/types/armada";

export default function VehicleDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();

  const { data: kendaraan, isLoading: lK } = useKendaraan();
  const { data: ritase, isLoading: lRitase } = useRitase();
  const vehicle = (kendaraan ?? []).find((k) => k.id_kendaraan === id);
  const { data: history, isLoading: lHist } = useTrackingHistory(Number.isFinite(id) ? id : null);

  if (lK) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!vehicle) return notFound();

  const vehicleRitase = (ritase ?? []).filter((r) => r.id_kendaraan === id);

  return (
    <div className="space-y-5">
      <PageHeader
        title={vehicle.plat_nomor}
        description={vehicle.jenis_kendaraan ?? "Kendaraan armada"}
        crumbs={[
          { label: "Armada", href: "/armada" },
          { label: "Kendaraan", href: "/armada/vehicles" },
          { label: vehicle.plat_nomor },
        ]}
        actions={<StatusBadge status={vehicle.status_kendaraan} />}
      />
      <ArmadaTabs />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Riwayat tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#034075]" /> Riwayat Tracking
                <InfoTip text="Timeline status kendaraan ini (dari event ritase)." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lHist ? (
                <Skeleton className="h-24 w-full" />
              ) : (history ?? []).length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-400">Belum ada riwayat status</p>
              ) : (
                <>
                  <DriverSummary events={history ?? []} stops={[]} title="Ringkasan Durasi" />
                  <div className="mt-4 border-t pt-3">
                    <StatusTimeline events={history ?? []} stops={[]} limit={12} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Daftar ritase kendaraan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Daftar Ritase
                <InfoTip text="Semua penugasan dengan kendaraan ini — klik baris untuk detail." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable<Ritase>
                loading={lRitase}
                rows={vehicleRitase}
                rowKey={(r) => String(r.id_ritase)}
                searchPlaceholder="Cari kode ritase..."
                searchFilter={(r, q) => r.kode_ritase.toLowerCase().includes(q.toLowerCase())}
                emptyText="Belum ada ritase untuk kendaraan ini"
                onRowClick={(r) => router.push(`/armada/trips/${r.id_ritase}`)}
                columns={[
                  {
                    header: "Kode",
                    className: "font-mono text-xs font-medium",
                    render: (r) => (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => router.push(`/armada/trips/${r.id_ritase}`)}
                      >
                        {r.kode_ritase}
                      </button>
                    ),
                  },
                  { header: "Tanggal", className: "tabular-nums", render: (r) => formatDateDMY(r.tanggal) },
                  { header: "Driver", className: "font-medium", render: (r) => r.nama_driver },
                  { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Info kendaraan */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Informasi Kendaraan
              <InfoTip text="Detail master kendaraan." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <InfoRow label="Plat" value={vehicle.plat_nomor} />
            <InfoRow label="Jenis" value={vehicle.jenis_kendaraan ?? "-"} />
            <InfoRow label="Kapasitas" value={vehicle.kapasitas_kg ? `${formatNumber(vehicle.kapasitas_kg)} kg` : "-"} />
            <InfoRow label="Status" value={vehicle.status_kendaraan} />
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => router.push(`/armada/live-map?kendaraan=${vehicle.id_kendaraan}`)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#034075] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0a5aa8]"
        >
          <MapPin className="h-4 w-4" /> Lihat di peta
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
