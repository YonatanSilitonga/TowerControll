"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Phone, Truck, User, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { DriverSummary } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { DataTable } from "@/components/ui/data-table";
import { useDriver, useRitase } from "@/hooks/use-armada";
import { useTrackingHistory } from "@/hooks/use-tracking";
import { cn, formatDateDMY } from "@/lib/utils";
import { isRitaseExpired } from "@/lib/constants";
import type { Ritase } from "@/types/armada";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    driver?.id_kendaraan ?? null, selectedDate || undefined
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
      <ArmadaTabs />

      {/* === MOBILE: info bar compact === */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jenis</p>
            <p className="text-sm font-medium text-slate-800">{driver.jenis_driver ?? "-"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kendaraan</p>
            {driver.plat_nomor ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono text-sm font-semibold text-slate-800">{driver.plat_nomor}</span>
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold",
                  fresh ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                )}>
                  <i className={`h-1 w-1 rounded-full ${fresh ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  {fresh ? "Live" : "Off"}
                </span>
              </span>
            ) : <p className="text-sm text-slate-400">-</p>}
          </div>
          {driver.no_hp && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">No HP</p>
              <a
                href={`tel:${driver.no_hp.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                <Phone className="h-3 w-3" /> {driver.no_hp}
              </a>
            </div>
          )}
        </div>
        {driver.id_kendaraan && (
          <button
            type="button"
            onClick={() => router.push(`/armada/live-map?kendaraan=${driver.id_kendaraan}`)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#FEA103] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E09102]"
          >
            <MapPin className="h-3.5 w-3.5" /> Lihat Peta
          </button>
        )}
      </div>

      {/* === DESKTOP: grid sidebar === */}
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        {/* KIRI: Riwayat Tracking */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-[#0c1e3a]" /> Riwayat Tracking
              <InfoTip text="Timeline status kendaraan yang dikendarai driver ini." />
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
            {!driver.id_kendaraan ? (
              <p className="py-4 text-center text-sm text-slate-400">Driver belum terhubung ke kendaraan</p>
            ) : lHist ? (
              <Skeleton className="h-20 w-full" />
            ) : (history ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada riwayat status</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-0">
                  <DriverSummary events={history ?? []} stops={[]} title="Ringkasan Durasi" />
                  <div className="mt-4 border-t pt-3">
                    <StatusTimeline events={history ?? []} stops={[]} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KANAN: sidebar — desktop only */}
        <div className="hidden lg:flex lg:flex-col lg:gap-3">
          {/* Card: Informasi Driver */}
          <Card className="h-fit">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-[#0c1e3a]" /> Informasi Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 lg:space-y-1.5 lg:p-3">
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Nama" value={driver.nama_driver} />
              {driver.no_hp && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400"><Phone className="h-3.5 w-3.5" /></span>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">No HP</p>
                    <a href={`tel:${driver.no_hp.replace(/[^+\d]/g, "")}`} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
                      {driver.no_hp}
                    </a>
                  </div>
                </div>
              )}
              <InfoRow icon={<Truck className="h-3.5 w-3.5" />} label="Jenis" value={driver.jenis_driver ?? "-"} />
              <div className="border-t pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-1">
                  <StatusBadge status={driver.status_driver} />
                </div>
              </div>
              {driver.plat_nomor && (
                <div className="border-t pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kendaraan</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Car className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono text-sm font-semibold text-slate-800">{driver.plat_nomor}</span>
                    <span className={cn(
                      "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold",
                      fresh ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                    )}>
                      <i className={`h-1 w-1 rounded-full ${fresh ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                      {fresh ? "Live" : "Off"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Riwayat Ritase — desktop sidebar */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b px-3 py-2 lg:pb-2 lg:px-3">
              <CardTitle className="text-sm font-semibold">
                Riwayat Ritase
                <InfoTip text="Semua penugasan driver ini — klik untuk detail." />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-2">
              <div className="min-w-0 overflow-hidden">
                <DataTable<Ritase>
                  loading={lRitase}
                  rows={driverRitase}
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
                      header: "Kendaraan",
                      className: "text-xs",
                      render: (r) => r.plat_nomor ?? "-",
                    },
                    {
                      header: "Status",
                      className: "w-20",
                      render: (r) => (
                        <StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal) ? "tidak terlaksana" : r.status} />
                      ),
                    },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Button Lihat Peta — desktop */}
          {driver.id_kendaraan && (
            <button
              type="button"
              onClick={() => router.push(`/armada/live-map?kendaraan=${driver.id_kendaraan}`)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0c1e3a] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a3358]"
            >
              <MapPin className="h-3.5 w-3.5" /> Lihat di Peta
            </button>
          )}
        </div>

        {/* KANAN: Riwayat Ritase — mobile (di bawah tracking) */}
        <Card className="overflow-hidden lg:hidden">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              Riwayat Ritase
              <InfoTip text="Semua penugasan driver ini — klik untuk detail." />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="min-w-0 overflow-hidden">
              <DataTable<Ritase>
                loading={lRitase}
                rows={driverRitase}
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
                      <StatusBadge status={r.status === "direncanakan" && isRitaseExpired(r.jam_selesai, r.tanggal) ? "tidak terlaksana" : r.status} />
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
