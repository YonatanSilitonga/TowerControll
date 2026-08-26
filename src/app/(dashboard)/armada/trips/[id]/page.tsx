"use client";

import { useParams } from "next/navigation";
import {
  Clock,
  MapPin,
  RadioTower,
  Timer,
  Truck,
  User,
} from "lucide-react";
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
import dynamic from "next/dynamic";
import { TripMapSkeleton } from "@/components/armada/trip-map";

const TripMap = dynamic(() => import("@/components/armada/trip-map").then(m => m.TripMap), {
  ssr: false,
  loading: () => <TripMapSkeleton />,
});

import { DriverSummary, summarizeEvents } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { useRitaseDetail } from "@/hooks/use-armada";
import { useTrackingMap } from "@/hooks/use-tracking";
import { displayTrackingStatus, statusLabel } from "@/lib/constants";
import { cn, formatDateDMY, formatDur, formatNumber, hasActiveSession } from "@/lib/utils";

export default function RitaseDetailPage({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const rawId = (routeParams?.id ?? params?.id ?? "") as string;
  const { data, isLoading } = useRitaseDetail(rawId);
  const { data: mapData } = useTrackingMap();

  const vehicle = mapData?.vehicles.find(v => v.id_kendaraan === data?.id_kendaraan);

  if (isLoading || data === undefined || !rawId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
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
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Ritase dengan ID #{rawId} tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const muatan = [
    { label: "Total AWB", value: data.total_awb ?? 0, accent: false },
    { label: "Total Koli", value: data.total_koli ?? 0, accent: false },
    { label: "High Value", value: data.total_high_value ?? 0, accent: true },
    { label: "Eceran (pcs)", value: data.total_eceran ?? 0, accent: false },
  ];

  // ── Statistik ritase (client-side dari events + stops) ──
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

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const deltaMin = (jadwal?: string | null, realisasi?: string | null) => {
    if (!jadwal || !realisasi) return null;
    const d = toMin(realisasi) - toMin(jadwal);
    return Number.isNaN(d) ? null : d;
  };
  const fmtDelta = (d: number) =>
    d === 0 ? "Tepat waktu" : d > 0 ? `Telat ${d}m` : `Lebih awal ${-d}m`;

  const realisasiRows = [
    { label: "Berangkat", jadwal: data.jam_mulai, realisasi: data.jam_berangkat },
    { label: "Tiba", jadwal: data.jam_selesai, realisasi: data.jam_tiba },
  ];

  const isLive = vehicle ? hasActiveSession(vehicle.last_login) : false;

  return (
    <div className="space-y-5">
      <PageHeader
        title={data.kode_ritase}
        description={`RIT ${data.ritase_ke ?? "-"} · ${formatDateDMY(data.tanggal)}`}
        crumbs={[
          { label: "Armada", href: "/armada" },
          { label: "Ritase", href: "/armada/trips" },
          { label: data.kode_ritase },
        ]}
        actions={<StatusBadge status={data.status} />}
      />
      <ArmadaTabs />

      {/* ── Vitals bar: semua yang perlu dilihat sekali pandang, tanpa scroll ── */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 divide-slate-100 sm:divide-x">
          <VitalItem icon={<User className="h-4 w-4" />} label="Driver" value={data.nama_driver} first />
          <VitalItem icon={<Truck className="h-4 w-4" />} label="Kendaraan" value={data.plat_nomor} />
          {vehicle ? (
            <div className="flex items-center gap-2 pl-0 sm:pl-6">
              <span className="relative flex h-2 w-2 shrink-0">
                {isLive && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", isLive ? "bg-emerald-500" : "bg-slate-300")} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status Live</p>
                <p className="truncate text-sm font-bold text-slate-800">
                  {displayTrackingStatus(vehicle.status, vehicle.kecepatan, vehicle.last_update, isLive)}
                </p>
              </div>
            </div>
          ) : (
            <VitalItem icon={<RadioTower className="h-4 w-4" />} label="Status" value={statusLabel(data.status)} />
          )}
          <VitalItem icon={<Timer className="h-4 w-4" />} label="Total Durasi" value={formatDur(sum.total)} />

          {/* Badge telat/tepat waktu — ringkasan cepat dari blok jadwal di sidebar */}
          <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-6">
            {realisasiRows.map((r) => {
              const d = deltaMin(r.jadwal, r.realisasi);
              if (d === null) return null;
              return (
                <span
                  key={r.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    d === 0 ? "bg-emerald-50 text-emerald-700" : d > 0 ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"
                  )}
                >
                  {r.label}: {fmtDelta(d)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main: Perjalanan (rute+peta digabung) di kiri, ringkasan di kanan ── */}
      <div className="grid gap-5 lg:grid-cols-3 mt-2">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#0c1e3a]" /> Perjalanan
                <InfoTip text="Rute, komposisi titik, dan posisi perjalanan ritase." />
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                  <i className="h-2 w-2 rounded-full bg-sky-500" /> Gudang {formatNumber(nGudang)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                  <i className="h-2 w-2 rounded-full bg-emerald-500" /> Seller {formatNumber(nSeller)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                  <i className="h-2 w-2 rounded-full bg-orange-500" /> Gateway {formatNumber(nDrop)}
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RuteStepper stops={data.stops ?? []} />

            {sum.total > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Komposisi Durasi
                </p>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  {durasiParts.map((p) => (
                    <div key={p.label} className={p.color} style={{ width: `${(p.v / sum.total) * 100}%` }} />
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                  {durasiParts.map((p) => (
                    <span key={p.label} className="inline-flex items-center gap-1">
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

        {/* Sidebar: data referensi cepat */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Muatan
                <InfoTip text="Jumlah AWB, koli, high value, dan eceran (pcs) yang tercatat." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {muatan.map((m) => (
                  <div
                    key={m.label}
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      m.accent ? "border-amber-200 bg-amber-50/60" : "border-slate-100"
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{m.label}</p>
                    <p className={cn("mt-0.5 text-lg font-bold tabular-nums", m.accent ? "text-amber-700" : "text-slate-800")}>
                      {formatNumber(m.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Jadwal
                <InfoTip text="Jadwal rencana berangkat & tiba dari ritase." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Berangkat */}
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Berangkat</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Jadwal</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{data.jam_mulai ?? "-"}</span>
                  <span className="text-slate-300">→</span>
                  {data.jam_berangkat ? (
                    <span className={cn(
                      "text-sm font-semibold",
                      data.jam_mulai && data.jam_berangkat <= data.jam_mulai
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}>
                      {data.jam_berangkat}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </div>
              </div>

              {/* Tiba */}
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiba</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Jadwal</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{data.jam_selesai ?? "-"}</span>
                  <span className="text-slate-300">→</span>
                  {data.jam_tiba ? (
                    <span className={cn(
                      "text-sm font-semibold",
                      data.jam_selesai && data.jam_tiba <= data.jam_selesai
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}>
                      {data.jam_tiba}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Timeline: paling padat isinya, layak dapat lebar penuh ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0c1e3a]" /> Timeline Status & Durasi
              <InfoTip text="Riwayat status & durasi proses (loading, perjalanan, tiba) selama ritase." />
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {formatNumber((data.events ?? []).length)} event
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.events ?? []).length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">Belum ada event status</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <DriverSummary events={data.events ?? []} stops={data.stops ?? []} />
              <div className="border-t pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <StatusTimeline events={data.events ?? []} stops={data.stops ?? []} limit={15} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Satu segmen pada vitals bar (baris ringkasan paling atas). */
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
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}