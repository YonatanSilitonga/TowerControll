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
import { useTrackingHistory, useTrackingMap } from "@/hooks/use-tracking";
import { formatDateDMY, formatNumber } from "@/lib/utils";
import type { Ritase } from "@/types/armada";

function minutesAgo(iso?: string | null): string {
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

export default function VehicleDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();

  const { data: kendaraan, isLoading: lK } = useKendaraan();
  const { data: ritase, isLoading: lRitase } = useRitase();
  const { data: mapData } = useTrackingMap();
  const vehicle = (kendaraan ?? []).find((k) => k.id_kendaraan === id);
  const { data: history, isLoading: lHist } = useTrackingHistory(Number.isFinite(id) ? id : null);
  // Info live dari tracking map (kalau kendaraan ini lagi kirim posisi).
  const liveV =
    (mapData?.vehicles ?? []).find((v) => v.id_kendaraan === id) ?? null;

  if (lK || kendaraan === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!vehicle) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Kendaraan Tidak Ditemukan"
          description="Data kendaraan tidak tersedia atau ID tidak valid."
          crumbs={[{ label: "Armada", href: "/armada" }, { label: "Kendaraan", href: "/armada/vehicles" }]}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Kendaraan dengan ID #{id} tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const vehicleRitase = (ritase ?? []).filter((r) => r.id_kendaraan === id);

  return (
    <div className="space-y-4">
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
        <div className="space-y-4">
          {/* Riwayat tracking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Riwayat Tracking
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
            <CardHeader className="pb-2">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Informasi Kendaraan
              <InfoTip text="Detail master kendaraan + status live terakhir." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <InfoRow label="Plat" value={vehicle.plat_nomor} />
            <InfoRow label="Jenis" value={vehicle.jenis_kendaraan ?? "-"} />
            <InfoRow label="Kapasitas" value={vehicle.kapasitas_kg ? `${formatNumber(vehicle.kapasitas_kg)} kg` : "-"} />
            <InfoRow label="Status" value={<StatusBadge status={vehicle.status_kendaraan} />} />
            <InfoRow
              label="Online"
              value={
                liveV ? (
                  <span
                    className={
                      liveV.offline
                        ? "inline-flex items-center gap-1.5 font-semibold text-rose-600"
                        : "inline-flex items-center gap-1.5 font-semibold text-emerald-700"
                    }
                  >
                    <i className={`h-1.5 w-1.5 rounded-full ${liveV.offline ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                    {liveV.offline ? "Offline" : "Online"}
                  </span>
                ) : (
                  "-"
                )
              }
            />
            {liveV && !liveV.offline && (
              <>
                <InfoRow label="Driver" value={liveV.nama_driver ?? "-"} />
                <InfoRow label="Kecepatan" value={`${liveV.kecepatan ?? 0} km/h`} />
              </>
            )}
            {liveV && (
              <InfoRow label="Update" value={minutesAgo(liveV.last_update)} />
            )}
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => router.push(`/armada/live-map?kendaraan=${vehicle.id_kendaraan}`)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#FEA103] px-3 py-2 text-sm font-semibold text-white hover:bg-[#E09102]"
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
