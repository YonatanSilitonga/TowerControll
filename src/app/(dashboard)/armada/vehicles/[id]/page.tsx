"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Truck, Gauge, Package } from "lucide-react";
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

      {/* === MOBILE: info bar compact === */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jenis</p>
            <p className="text-sm font-medium text-slate-800">{vehicle.jenis_kendaraan ?? "-"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kapasitas</p>
            <p className="text-sm font-medium text-slate-800">{formatNumber(vehicle.kapasitas_kg ?? 0)} kg</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">GPS</p>
            {liveV ? (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${liveV.offline ? "text-rose-600" : "text-emerald-700"}`}>
                <i className={`h-1.5 w-1.5 rounded-full ${liveV.offline ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                {liveV.offline ? "Offline" : "Online"}
              </span>
            ) : <p className="text-xs text-slate-400">-</p>}
          </div>
          {liveV && !liveV.offline && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Driver</p>
              <p className="text-sm font-medium text-slate-800">{liveV.nama_driver ?? "-"}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push(`/armada/live-map?kendaraan=${vehicle.id_kendaraan}`)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#FEA103] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E09102]"
        >
          <MapPin className="h-3.5 w-3.5" /> Lihat Peta
        </button>
      </div>

      {/* === DESKTOP: grid sidebar === */}
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        {/* KIRI: Riwayat Tracking */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-[#0c1e3a]" /> Riwayat Tracking
              <InfoTip text="Timeline status kendaraan" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-2">
            <input
              type="date"
              value={selectedDate}
              max={todayLocal()}
              onChange={(e) => setSelectedDate(e.target.value || "")}
              className="mb-3 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#0c1e3a] focus:outline-none"
            />
            {lHist ? (
              <Skeleton className="h-20 w-full" />
            ) : (history ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada riwayat status</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-0">
                  <DriverSummary events={history ?? []} stops={[]} title="Ringkasan Durasi" />
                  <div className="mt-4 border-t pt-3">
                    <StatusTimeline events={history ?? []} stops={[]} limit={12} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KANAN: sidebar — desktop only */}
        <div className="hidden lg:flex lg:flex-col lg:gap-3">
          {/* Card: Informasi Kendaraan */}
          <Card className="h-fit">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Informasi Kendaraan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 lg:space-y-1.5 lg:p-3">
              <InfoRow icon={<Truck className="h-3.5 w-3.5" />} label="Plat Nomor" value={vehicle.plat_nomor} mono />
              <InfoRow icon={<Gauge className="h-3.5 w-3.5" />} label="Jenis" value={vehicle.jenis_kendaraan ?? "-"} />
              <InfoRow icon={<Package className="h-3.5 w-3.5" />} label="Kapasitas" value={`${formatNumber(vehicle.kapasitas_kg ?? 0)} kg`} />
              <div className="border-t pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-1">
                  <StatusBadge status={vehicle.status_kendaraan} />
                </div>
              </div>
              {liveV && (
                <div className="border-t pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">GPS</p>
                  <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${liveV.offline ? "text-rose-600" : "text-emerald-700"}`}>
                    <i className={`h-1.5 w-1.5 rounded-full ${liveV.offline ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                    {liveV.offline ? "Offline" : "Online"} — {liveV.nama_driver ?? "-"}
                  </span>
                  {(liveV.kecepatan ?? 0) > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{liveV.kecepatan} km/h · {minutesAgo(liveV.last_update)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat Ritase — desktop sidebar */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="text-sm font-semibold">
                Riwayat Ritase
                <InfoTip text="Riwayat penugasan kendaraan" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-2">
              <div className="min-w-0 overflow-hidden">
                <DataTable<Ritase>
                  loading={lRitase}
                  rows={vehicleRitase}
                  rowKey={(r) => String(r.id_ritase)}
                  searchPlaceholder="Cari kode ritase..."
                  searchFilter={(r, q) => r.kode_ritase.toLowerCase().includes(q.toLowerCase())}
                  tableLayout="fixed"
                  emptyText="Belum ada ritase"
                  onRowClick={(r) => router.push(`/armada/trips/${r.id_ritase}`)}
                  columns={[
                    {
                      header: "Kode",
                      className: "w-[100px] font-mono text-xs font-semibold",
                      render: (r) => (
                        <span className="inline-flex items-center gap-1 text-[#0c1e3a] underline-offset-2 hover:underline">{r.kode_ritase}</span>
                      ),
                    },
                    {
                      header: "Tanggal",
                      className: "w-20 tabular-nums text-xs",
                      render: (r) => formatDateDMY(r.tanggal),
                    },
                    {
                      header: "Driver",
                      className: "text-xs",
                      render: (r) => r.nama_driver ?? "-",
                    },
                    {
                      header: "Status",
                      className: "w-20",
                      render: (r) => (
                        <StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) ? "tidak terlaksana" : r.status} />
                      ),
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Button Lihat Peta — desktop */}
          <button
            type="button"
            onClick={() => router.push(`/armada/live-map?kendaraan=${vehicle.id_kendaraan}`)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0c1e3a] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a3358]"
          >
            <MapPin className="h-3.5 w-3.5" /> Lihat di Peta
          </button>
        </div>

        {/* KANAN: Riwayat Ritase — mobile (di bawah tracking) */}
        <Card className="overflow-hidden lg:hidden">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              Riwayat Ritase
              <InfoTip text="Riwayat penugasan kendaraan" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="min-w-0 overflow-hidden">
              <DataTable<Ritase>
                loading={lRitase}
                rows={vehicleRitase}
                rowKey={(r) => String(r.id_ritase)}
                searchPlaceholder="Cari kode ritase..."
                tableLayout="fixed"
                searchFilter={(r, q) => r.kode_ritase.toLowerCase().includes(q.toLowerCase())}
                emptyText="Belum ada ritase"
                onRowClick={(r) => router.push(`/armada/trips/${r.id_ritase}`)}
                columns={[
                  {
                    header: "Kode",
                    className: "font-mono text-xs font-semibold",
                    render: (r) => r.kode_ritase,
                  },
                  {
                    header: "Tanggal",
                    className: "tabular-nums text-xs",
                    render: (r) => formatDateDMY(r.tanggal),
                  },
                  {
                    header: "Status",
                    className: "w-20",
                    render: (r) => (
                      <StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) ? "tidak terlaksana" : r.status} />
                    ),
                  },
                ]}
              />
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
