"use client";

import { useParams } from "next/navigation";
import { Clock, MapPin, RadioTower, Timer, Truck, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { RuteStepper } from "@/components/armada/rute-stepper";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import dynamic from "next/dynamic";
import { TripMapSkeleton } from "@/components/armada/trip-map";

const TripMap = dynamic(() => import("@/components/armada/trip-map").then(m => m.TripMap), {
  ssr: false,
  loading: () => <TripMapSkeleton />,
});

import { DriverSummary, summarizeEvents } from "@/components/armada/driver-summary";
import { StatusTimeline, dedupEvents } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { useRitaseDetail } from "@/hooks/use-armada";
import { useTrackingMap } from "@/hooks/use-tracking";
import { displayTrackingStatus, isRitaseExpired, isStale, statusLabel } from "@/lib/constants";
import { cn, formatDateDMY, formatDur, formatNumber, formatAuditTime, hasActiveSession } from "@/lib/utils";

export default function RitaseDetailPage({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const rawId = (routeParams?.id ?? params?.id ?? "") as string;
  const { data, isLoading } = useRitaseDetail(rawId);
  const { data: mapData } = useTrackingMap();

  // Match vehicle: harus id_kendaraan + id_ritase cocok → hindari cross-ritase bleed
  const vehicle = (mapData?.vehicles ?? []).find(
    v => v.id_kendaraan === data?.id_kendaraan && (!v.id_ritase || v.id_ritase === data?.id_ritase)
  );

  // Live = session aktif + GPS fresh + ritase belum selesai
  const isGpsFresh = vehicle ? !isStale(vehicle.last_update) : false;
  const isLive = vehicle
    ? hasActiveSession(vehicle.last_login) && isGpsFresh && data?.status !== "selesai"
    : false;

  if (isLoading || data === undefined || !rawId) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12" />
        <Skeleton className="h-14" />
        <div className="grid gap-3 lg:grid-cols-[1fr_320px] lg:items-start">
          <Skeleton className="h-[300px] lg:h-[400px]" />
          <div className="order-1 space-y-3 lg:order-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-28" />
          </div>
        </div>
        <Skeleton className="h-[280px]" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Ritase Tidak Ditemukan"
          description="Data ritase tidak tersedia atau ID tidak valid."
          crumbs={[{ label: "Armada", href: "/armada" }, { label: "Ritase", href: "/armada/trips" }]}
        />
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Ritase dengan ID #{rawId} tidak ditemukan.
        </p>
      </div>
    );
  }

  const muatan = [
    { label: "AWB", value: data.total_awb ?? 0, accent: false },
    { label: "Koli", value: data.total_koli ?? 0, accent: false },
    { label: "High Value", value: data.total_high_value ?? 0, accent: true },
    { label: "Eceran", value: data.total_eceran ?? 0, accent: false },
  ];

  const sum = summarizeEvents(data.events ?? []);
  const stops = data.stops ?? [];
  const countStop = (t: string) => stops.filter((s) => s.jenis_stop === t).length;
  const nSeller = countStop("seller");
  const nDrop = countStop("drop_point");
  const nGudang = countStop("gudang");

  const durasiParts = [
    { label: "Loading", v: sum.loading, color: "bg-[#0c1e3a]" },
    { label: "Perjalanan", v: sum.perjalanan, color: "bg-[#1c3d63]" },
    { label: "Tiba", v: sum.tiba, color: "bg-[#3a628f]" },
    { label: "Selesai", v: sum.selesai, color: "bg-[#5b82ab]" },
  ].filter((p) => p.v > 0);

  const events = data.events ?? [];
  const fmtTime = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const h = String((d.getUTCHours() + 7) % 24).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const evSorted = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const evBerangkat = evSorted.find((e) => e.status?.includes("berangkat") || e.status?.includes("mulai_loading"));
  const evTiba = [...evSorted].reverse().find((e) => e.status?.includes("tiba") || e.status?.includes("selesai") || e.status?.includes("sampai"));

  const realisasiBerangkat = data.jam_berangkat || fmtTime(evBerangkat?.created_at);
  const realisasiTiba = data.jam_tiba || fmtTime(evTiba?.created_at);

  return (
    <div className="space-y-3">
      <PageHeader
        title={data.kode_ritase}
        description={`RIT ${data.ritase_ke ?? "-"} · ${formatDateDMY(data.tanggal)}`}
        crumbs={[
          { label: "Armada", href: "/armada" },
          { label: "Ritase", href: "/armada/trips" },
          { label: data.kode_ritase },
        ]}
        actions={<StatusBadge status={data.status === "direncanakan" && isRitaseExpired(data.jam_selesai, data.tanggal, data.jam_mulai) ? "tidak terlaksana" : data.status} />}
      />
      <ArmadaTabs />

      {/* Vitals bar — full width, mobile friendly */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <VitalItem icon={<User className="h-4 w-4" />} label="Driver" value={data.nama_driver} first />
          <VitalItem icon={<Truck className="h-4 w-4" />} label="Kendaraan" value={data.plat_nomor} />
          {vehicle ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", isLive ? "bg-emerald-500" : "bg-slate-300")} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Live</p>
                <p className="text-sm font-bold text-slate-800">
                  {displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update, isLive)}
                </p>
              </div>
            </div>
          ) : (
            <VitalItem icon={<RadioTower className="h-4 w-4" />} label="Status" value={statusLabel(data.status)} />
          )}
          <VitalItem icon={<Timer className="h-4 w-4" />} label="Total Durasi" value={formatDur(sum.total)} />
        </div>
      </div>

      {/* === 2-column grid: Desktop (kiri=perjalanan, kanan=muatan+jadwal) / Mobile (stacking) === */}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">

        {/* KIRI — Mobile order-2 (bawah), Desktop order-1 (kiri) */}
        <div className="order-2 space-y-3 lg:order-1">
          {/* Perjalanan + Peta */}
          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Perjalanan
                  <InfoTip text="Rute & posisi titik" />
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                    <i className="h-2 w-2 rounded-full bg-sky-500" /> {nGudang} Gudang
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                    <i className="h-2 w-2 rounded-full bg-emerald-500" /> {nSeller} Seller
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600">
                    <i className="h-2 w-2 rounded-full bg-orange-500" /> {nDrop} Gateway
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <RuteStepper stops={data.stops ?? []} />
              {sum.total > 0 && (
                <div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    {durasiParts.map((p) => (
                      <div key={p.label} className={p.color} style={{ width: `${(p.v / sum.total) * 100}%` }} />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    {durasiParts.map((p) => (
                      <span key={p.label} className="inline-flex items-center gap-1.5">
                        <i className={cn("h-2 w-2 rounded-full", p.color)} />
                        {p.label} {Math.round((p.v / sum.total) * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <TripMap stops={data.stops ?? []} events={data.events ?? []} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KANAN — Mobile order-1 (atas), Desktop order-2 (kanan) */}
        <div className="order-1 flex flex-col gap-3 lg:order-2">
          {/* Muatan */}
          <Card className="flex flex-col flex-1">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                Muatan
                <InfoTip text="Muatan ritase" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4">
              <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {muatan.map((m) => (
                  <div
                    key={m.label}
                    className={cn(
                      "flex flex-col justify-center rounded-lg border px-4 py-4",
                      m.accent ? "border-amber-200 bg-amber-50/60" : "border-slate-100 bg-slate-50/50"
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{m.label}</p>
                    <p className={cn("mt-1 text-2xl font-bold tabular-nums", m.accent ? "text-amber-700" : "text-slate-800")}>
                      {formatNumber(m.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Jadwal */}
          <Card className="flex flex-col flex-1">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                Jadwal
                <InfoTip text="Jadwal vs realisasi" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 p-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Berangkat</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-base">
                  <span className="text-slate-400">Jadwal</span>
                  <span className="font-bold text-slate-700">{data.jam_mulai ?? "-"}</span>
                  <span className="text-slate-300">→</span>
                  {realisasiBerangkat ? (
                    <span className={cn("font-bold", data.jam_mulai && realisasiBerangkat <= data.jam_mulai ? "text-emerald-600" : "text-rose-600")}>
                      {realisasiBerangkat}
                    </span>
                  ) : <span className="text-slate-400">-</span>}
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tiba</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-base">
                  <span className="text-slate-400">Jadwal</span>
                  <span className="font-bold text-slate-700">{data.jam_selesai ?? "-"}</span>
                  <span className="text-slate-300">→</span>
                  {realisasiTiba ? (
                    <span className={cn("font-bold", data.jam_selesai && realisasiTiba <= data.jam_selesai ? "text-emerald-600" : "text-rose-600")}>
                      {realisasiTiba}
                    </span>
                  ) : <span className="text-slate-400">-</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Riwayat Perubahan */}
          {data.created_at && (
            <Card>
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  Riwayat Perubahan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-start gap-2">
                    <span className="w-20 shrink-0 font-semibold text-slate-400 pt-0.5">Dibuat</span>
                    <div>
                      <span className="text-slate-600 dark:text-slate-300">
                        {formatAuditTime(data.created_at)}
                      </span>
                      {data.created_by_name && (
                        <span className="ml-1 text-slate-400">oleh {data.created_by_name}</span>
                      )}
                    </div>
                  </div>
                  {data.updated_at && (
                    <div className="flex items-start gap-2">
                      <span className="w-20 shrink-0 font-semibold text-slate-400 pt-0.5">Diubah</span>
                      <div>
                        <span className="text-slate-600 dark:text-slate-300">
                          {formatAuditTime(data.updated_at)}
                        </span>
                        {data.updated_by_name && (
                          <span className="ml-1 text-slate-400">oleh {data.updated_by_name}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Timeline — full width, perbesar */}
      <Card>
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#0c1e3a]" /> Timeline Status &amp; Durasi
              <InfoTip text="Riwayat status & durasi" />
            </span>
            <span className="text-xs text-slate-400">{formatNumber(dedupEvents(data.events ?? []).length)} event</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {(data.events ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Belum ada event status</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <DriverSummary events={data.events ?? []} stops={data.stops ?? []} />
              <div className="border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <StatusTimeline events={data.events ?? []} stops={data.stops ?? []} limit={15} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VitalItem({
  icon,
  label,
  value,
  first = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  first?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", !first && "pl-0 sm:pl-6")}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a]/8 text-[#0c1e3a]">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}
