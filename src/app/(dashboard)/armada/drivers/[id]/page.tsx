"use client";

import { notFound, useRouter } from "next/navigation";
import { MapPin, Phone, Truck, User } from "lucide-react";
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
import type { Ritase } from "@/types/armada";

export default function DriverDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();

  const { data: drivers, isLoading: lDrivers } = useDriver();
  const { data: ritase, isLoading: lRitase } = useRitase();
  const driver = (drivers ?? []).find((d) => d.id_driver === id);
  const { data: history, isLoading: lHist } = useTrackingHistory(driver?.id_kendaraan ?? null);

  if (lDrivers || drivers === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!driver) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Driver Tidak Ditemukan"
          description="Data driver tidak tersedia atau ID tidak valid."
          crumbs={[{ label: "Armada", href: "/armada" }, { label: "Driver", href: "/armada/drivers" }]}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Driver dengan ID #{id} tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const driverRitase = (ritase ?? []).filter((r) => r.id_driver === id);
  const plat = driver.plat_nomor ?? null;
  const fresh = !!driver.tracking_fresh;

  return (
    <div className="space-y-4">
      <PageHeader
        title={driver.nama_driver}
        description={`Driver ID ${driver.id_driver} · ${driver.jenis_driver ?? "tetap"}`}
        crumbs={[
          { label: "Armada", href: "/armada" },
          { label: "Driver", href: "/armada/drivers" },
          { label: driver.nama_driver },
        ]}
        actions={<StatusBadge status={driver.status_driver} />}
      />
      <ArmadaTabs />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Riwayat tracking kendaraan terakhir */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#0c1e3a]" /> Riwayat Tracking
                <InfoTip text="Timeline status kendaraan yang dia kendarai (dari event ritase)." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!driver.id_kendaraan ? (
                <p className="py-3 text-center text-sm text-slate-400">
                  Driver belum terhubung ke kendaraan mana pun
                </p>
              ) : lHist ? (
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

          {/* Daftar ritase driver */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Daftar Ritase
                <InfoTip text="Semua penugasan driver ini — klik baris untuk lihat detail rute & timeline." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable<Ritase>
                loading={lRitase}
                rows={driverRitase}
                rowKey={(r) => String(r.id_ritase)}
                searchPlaceholder="Cari kode ritase..."
                searchFilter={(r, q) => r.kode_ritase.toLowerCase().includes(q.toLowerCase())}
                emptyText="Belum ada ritase untuk driver ini"
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
                  { header: "Kendaraan", className: "font-mono text-xs", render: (r) => r.plat_nomor },
                  { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Info driver */}
        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-[#0c1e3a]" /> Informasi Driver
                <InfoTip text="Data kontak & kendaraan yang sedang/terakhir dikendarai." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <InfoRow label="Nama" value={driver.nama_driver} />
              <InfoRow
                label="No HP"
                value={
                  driver.no_hp ? (
                    <a href={`tel:${driver.no_hp.replace(/[^+\d]/g, "")}`} className="text-emerald-700 hover:underline">
                      {driver.no_hp}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
              <InfoRow label="Jenis" value={driver.jenis_driver ?? "-"} />
              <InfoRow label="Status" value={<StatusBadge status={driver.status_driver} />} />
              <InfoRow
                label="Kendaraan"
                value={
                  plat ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-mono text-xs font-semibold">{plat}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                          fresh ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}
                      >
                        <i className={`h-1 w-1 rounded-full ${fresh ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {fresh ? "Live" : "Offline"}
                      </span>
                    </div>
                  ) : (
                    "-"
                  )
                }
              />
            </CardContent>
          </Card>

          {driver.id_kendaraan && (
            <button
              type="button"
              onClick={() => router.push(`/armada/live-map?kendaraan=${driver.id_kendaraan}`)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#FEA103] px-3 py-2 text-sm font-semibold text-white hover:bg-[#E09102]"
            >
              <MapPin className="h-4 w-4" /> Lihat di peta
            </button>
          )}
        </div>
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
