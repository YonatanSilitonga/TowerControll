"use client";

import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Phone, Truck, User, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DriverSummary } from "@/components/armada/driver-summary";
import { DashboardLogTable } from "@/components/dashboard/dashboard-log-table";
import type { RitaseInfo } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { CompactScheduleHistory } from "@/components/armada/compact-schedule-history";
import { useDriver, useRitase } from "@/hooks/use-armada";
import { useTrackingHistory } from "@/hooks/use-tracking";
import { cn, formatDateDMY } from "@/lib/utils";
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

export default function DriverDetailPage({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const rawId = routeParams?.id ?? params?.id;
  const id = Number(rawId);
  const router = useRouter();

  const { data: drivers, isLoading: lDrivers } = useDriver();
  const { data: ritase, isLoading: lRitase } = useRitase();
  const driver = Number.isFinite(id) ? (drivers ?? []).find((d) => d.id_driver === id) : null;
  const [selectedDate, setSelectedDate] = useState<string>(todayLocal());
  const { data: history, isLoading: lHist } = useTrackingHistory(
    null, selectedDate || undefined, Number.isFinite(id) ? id : null
  );

  if (lDrivers || drivers === undefined || !Number.isFinite(id)) {
    return (
    <div className="space-y-3 lg:space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Driver Tidak Ditemukan"
          description="Data tidak tersedia."
          crumbs={[{ label: "Armada", href: "/armada" }, { label: "Driver", href: "/armada/drivers" }]}
        />
        <p className="rounded-lg border p-6 text-center text-sm text-slate-500">
          Driver #{id} tidak ditemukan.
        </p>
      </div>
    );
  }

  const driverRitase = (ritase ?? []).filter((r) => r.id_driver === id);

  const ritaseInfoMap = (() => {
    const m = new Map<string, RitaseInfo>();
    for (const r of driverRitase) {
      m.set(r.kode_ritase, { nama_driver: r.nama_driver, ritase_ke: r.ritase_ke, tanggal: r.tanggal, plat_nomor: r.plat_nomor });
    }
    return m;
  })();
  const fresh = !!driver.tracking_fresh;

  return (
    <div className="space-y-5">
      <PageHeader
        title={driver.nama_driver}
        description={`Driver · ${driver.jenis_driver ?? "tetap"}`}
        crumbs={[
          { label: "Armada", href: "/armada" },
          { label: "Driver", href: "/armada/drivers" },
          { label: driver.nama_driver },
        ]}
        actions={<StatusBadge status={driver.status_driver} />}
      />
          <Card className="min-w-0">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-[#0c1e3a]" /> Informasi Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="grid items-center gap-4 p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_auto]"><div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-base font-semibold text-slate-900">{driver.nama_driver}</p><p className="mt-1 text-xs text-slate-500">Driver {driver.jenis_driver || "—"}</p></div><StatusBadge status={driver.status_driver} /></div>
<div className="grid grid-cols-2 gap-3 border-y py-3 text-xs sm:grid-cols-4 lg:border-y-0 lg:border-x lg:px-4"><div><p className="text-slate-400">Kendaraan</p><p className="mt-1 font-mono font-medium">{driver.plat_nomor || "Belum ditugaskan"}</p></div><div><p className="text-slate-400">GPS kendaraan</p><p className="mt-1 font-medium">{driver.plat_nomor ? fresh ? "Online" : "Offline" : "—"}</p></div><div className="col-span-2"><p className="text-slate-400">Nomor WhatsApp</p><p className="mt-1 font-medium">{driver.no_hp || "Belum tersedia"}</p></div></div>
<div className="grid grid-cols-2 items-center gap-2 [&>a]:min-h-11 [&>button]:min-h-11 lg:flex lg:flex-wrap lg:[&>a]:min-h-0 lg:[&>button]:min-h-0"><WhatsAppContact phone={driver.no_hp} name={driver.nama_driver} />{driver.id_kendaraan && <button type="button" onClick={()=>router.push('/armada/live-map?kendaraan='+driver.id_kendaraan)} className="rounded-md bg-[#0c1e3a] px-3 py-2 text-xs font-semibold text-white">Lihat Peta</button>}</div>
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
                <InfoTip text="Riwayat penugasan driver" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-2">
              <div className="min-w-0 overflow-hidden">
                <CompactScheduleHistory loading={lRitase} rows={driverRitase} context="driver" />
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
