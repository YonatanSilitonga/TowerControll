"use client";

import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Truck, Gauge, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DriverSummary } from "@/components/armada/driver-summary";
import { DashboardLogTable } from "@/components/dashboard/dashboard-log-table";
import type { RitaseInfo } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactScheduleHistory } from "@/components/armada/compact-schedule-history";
import { useKendaraan, useRitase, useDriver } from "@/hooks/use-armada";
import { useTrackingHistory, useTrackingMap } from "@/hooks/use-tracking";
import { formatDateDMY, formatNumber } from "@/lib/utils";
import { isRitaseExpired } from "@/lib/constants";
import type { Ritase } from "@/types/armada";

function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function minutesAgo(iso?: string | null): string {
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

export default function VehicleDetailPage({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const rawId = routeParams?.id ?? params?.id;
  const id = Number(rawId);
  const router = useRouter();

  const { data: kendaraan, isLoading: lK } = useKendaraan();
  const { data: ritase, isLoading: lRitase } = useRitase();
  const { data: contactDrivers } = useDriver();
  const { data: mapData } = useTrackingMap();
  const vehicle = Number.isFinite(id) ? (kendaraan ?? []).find((k) => k.id_kendaraan === id) : null;
  const [selectedDate, setSelectedDate] = useState<string>(todayLocal());
  const { data: history, isLoading: lHist } = useTrackingHistory(
    Number.isFinite(id) ? id : null, selectedDate || undefined
  );
  const liveV = (mapData?.vehicles ?? []).find((v) => v.id_kendaraan === id) ?? null;

  if (lK || kendaraan === undefined || !Number.isFinite(id)) {
    return (
    <div className="space-y-3 lg:space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Kendaraan Tidak Ditemukan"
          description="Data tidak tersedia."
          crumbs={[{ label: "Armada", href: "/armada" }, { label: "Kendaraan", href: "/armada/vehicles" }]}
        />
        <p className="rounded-lg border p-6 text-center text-sm text-slate-500">
          Kendaraan #{id} tidak ditemukan.
        </p>
      </div>
    );
  }

  const vehicleRitase = (ritase ?? []).filter((r) => r.id_kendaraan === id);

  const ritaseInfoMap = (() => {
    const m = new Map<string, RitaseInfo>();
    for (const r of vehicleRitase) {
      if (!m.has(r.kode_ritase)) {
        m.set(r.kode_ritase, { nama_driver: r.nama_driver, ritase_ke: r.ritase_ke, tanggal: r.tanggal, plat_nomor: r.plat_nomor });
      }
    }
    return m;
  })();

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
          <Card className="min-w-0">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Informasi Kendaraan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid items-center gap-4 p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_auto]"><div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-mono text-base font-semibold text-slate-900">{vehicle.plat_nomor}</p><p className="mt-1 text-xs text-slate-500">{vehicle.jenis_kendaraan || "—"}</p></div><StatusBadge status={vehicle.status_kendaraan} /></div>
<div className="grid grid-cols-2 gap-3 border-y py-3 text-xs sm:grid-cols-4 lg:border-y-0 lg:border-x lg:px-4"><div><p className="text-slate-400">Driver</p><p className="mt-1 break-words font-medium">{liveV?.nama_driver || "Belum tersedia"}</p></div><div><p className="text-slate-400">GPS</p><p className="mt-1 font-medium">{liveV ? liveV.offline ? "Offline" : "Online" : "Belum tersedia"}</p></div><div><p className="text-slate-400">Kapasitas berat</p><p className="mt-1 font-medium">{vehicle.kapasitas_kg != null ? formatNumber(vehicle.kapasitas_kg) + " kg" : "—"}</p></div><div><p className="text-slate-400">Kapasitas koli</p><p className="mt-1 font-medium">{vehicle.kapasitas_koli ?? "—"}</p></div>{liveV && <div className="col-span-2 text-slate-500">Update {minutesAgo(liveV.last_update)} · {liveV.kecepatan ?? 0} km/h</div>}</div>
<div className="grid grid-cols-2 items-center gap-2 [&>a]:min-h-11 [&>button]:min-h-11 lg:flex lg:flex-wrap lg:[&>a]:min-h-0 lg:[&>button]:min-h-0"><WhatsAppContact phone={contactDrivers?.find(d=>d.id_driver===liveV?.id_driver)?.no_hp} name={liveV?.nama_driver} /><button type="button" onClick={()=>router.push('/armada/live-map?kendaraan='+vehicle.id_kendaraan)} className="rounded-md bg-[#0c1e3a] px-3 py-2 text-xs font-semibold text-white">Lihat Peta</button></div>
            </CardContent>
          </Card>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0 self-start overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b px-3 py-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-[#0c1e3a]" /> Riwayat Tracking
              <InfoTip text="Tabel aktivitas per ritase, beserta driver dan kendaraan" />
            </CardTitle>
          <div className="w-[140px] shrink-0 sm:w-[180px]"><label htmlFor="tracking-date" className="sr-only">Tanggal aktivitas (WIB)</label>            <input
              aria-label="Tanggal riwayat tracking"
              id="tracking-date"
              type="date"
              value={selectedDate}
              max={todayLocal()}
              onChange={(e) => setSelectedDate(e.target.value || "")}
              className="min-h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs sm:text-sm focus:border-[#0c1e3a] focus:outline-none"
            /></div>
          </CardHeader>
          <CardContent className="p-3 lg:p-2">

            {lHist ? (
              <Skeleton className="h-20 w-full" />
            ) : (history ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada riwayat status</p>
            ) : (
              <div className="min-w-0 space-y-3">
                <details className="rounded-md border border-slate-200 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-slate-600">Ringkasan durasi</summary>
                  <div className="mt-3"><DriverSummary events={history ?? []} stops={[]} title="Ringkasan Durasi" /></div>
                </details>
                <div className="flex max-h-[480px] min-h-0 flex-col">
                  <DashboardLogTable roomy newestFirst key={selectedDate} events={history ?? []} ritaseInfoMap={ritaseInfoMap} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          <Card className="min-w-0 self-start overflow-hidden">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="text-sm font-semibold">
                Riwayat Jadwal
                <InfoTip text="Riwayat penugasan kendaraan" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-2">
              <div className="min-w-0 overflow-hidden">
                <CompactScheduleHistory loading={lRitase} rows={vehicleRitase} context="vehicle" />
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

/** Helper: baris informasi label-value di sidebar */
function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <div className="flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-sm font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
