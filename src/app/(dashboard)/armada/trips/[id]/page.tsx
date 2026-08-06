"use client";

import { notFound } from "next/navigation";
import { Clock, MapPin, PackageSearch, Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { RuteStepper } from "@/components/armada/rute-stepper";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { DriverSummary } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { useRitaseDetail } from "@/hooks/use-armada";
import { formatNumber } from "@/lib/utils";

export default function RitaseDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useRitaseDetail(params.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!data) return notFound();

  const muatan = [
    { label: "Total AWB", value: data.total_awb ?? 0 },
    { label: "Total Koli", value: data.total_koli ?? 0 },
    { label: "Paket Tertinggal", value: data.paket_tertinggal ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={data.kode_ritase}
        description={`RIT ${data.ritase_ke ?? "-"} · ${data.tanggal}`}
        actions={<StatusBadge status={data.status} />}
      />
      <ArmadaTabs />

      {/* Info ritase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Informasi Ritase</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={<Truck className="h-4 w-4" />} label="Driver" value={data.nama_driver} />
          <Info icon={<Truck className="h-4 w-4" />} label="Kendaraan" value={data.plat_nomor} />
          <Info
            icon={<Clock className="h-4 w-4" />}
            label="Jadwal RIT"
            value={data.jam_mulai && data.jam_selesai ? `${data.jam_mulai} – ${data.jam_selesai}` : "-"}
          />
          <Info icon={<PackageSearch className="h-4 w-4" />} label="Status" value={data.status} />
        </CardContent>
      </Card>

      {/* Rute */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4" /> Rute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RuteStepper stops={data.stops ?? []} />
        </CardContent>
      </Card>

      {/* Muatan + Timeline */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Muatan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {muatan.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
              >
                <span className="text-sm text-slate-600">{m.label}</span>
                <span className="text-sm font-bold tabular-nums">{formatNumber(m.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Timeline Status & Durasi</CardTitle>
          </CardHeader>
          <CardContent>
            {(data.events ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada event status</p>
            ) : (
              <>
                <DriverSummary events={data.events ?? []} stops={data.stops ?? []} />
                <div className="mt-4 border-t pt-3">
                  <StatusTimeline events={data.events ?? []} stops={data.stops ?? []} limit={15} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}