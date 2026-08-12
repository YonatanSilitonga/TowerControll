"use client";

import { notFound } from "next/navigation";
import {
  BarChart3,
  Clock,
  Flag,
  ListChecks,
  MapPin,
  PackageCheck,
  PackageSearch,
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
import { DriverSummary, summarizeEvents } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { InfoTip } from "@/components/ui/info-tip";
import { useRitaseDetail } from "@/hooks/use-armada";
import { cn, formatDateDMY, formatDur, formatNumber } from "@/lib/utils";

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

  // ── Statistik ritase (client-side dari events + stops) ──
  const sum = summarizeEvents(data.events ?? []);
  const stops = data.stops ?? [];
  const countStop = (t: string) => stops.filter((s) => s.jenis_stop === t).length;
  const nSeller = countStop("seller");
  const nDrop = countStop("drop_point");
  const nGudang = countStop("gudang");
  const totalTitik = stops.length;

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
    d === 0 ? "Tepat waktu" : d > 0 ? `Telat ${d} m` : `Lebih awal ${-d} m`;

  const realisasiRows = [
    { label: "Berangkat", jadwal: data.jam_mulai, realisasi: data.jam_berangkat },
    { label: "Tiba", jadwal: data.jam_selesai, realisasi: data.jam_tiba },
  ];

  return (
    <div className="space-y-4">
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

      {/* Info ritase */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Informasi Ritase
            <InfoTip text="Ringkasan penugasan: driver, kendaraan, jadwal RIT, dan status." />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={<User className="h-4 w-4" />} label="Driver" value={data.nama_driver} />
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
            <InfoTip text="Urutan perjalanan ritase: gudang → seller → drop point." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RuteStepper stops={data.stops ?? []} />
        </CardContent>
      </Card>

      {/* Statistik Ritase */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-[#0c1e3a]" /> Statistik Ritase
            <InfoTip text="Ringkasan durasi, komposisi rute, dan perbandingan realisasi vs jadwal." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Ringkasan angka */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <StatTile icon={<Timer className="h-4 w-4" />} label="Total Durasi" value={formatDur(sum.total)} tip="Total waktu dari seluruh event status." />
            <StatTile icon={<ListChecks className="h-4 w-4" />} label="Titik Rute" value={formatNumber(totalTitik)} tip="Total titik dalam rute: gudang + seller + drop point." />
            <StatTile icon={<PackageCheck className="h-4 w-4" />} label="Seller" value={formatNumber(nSeller)} tip="Jumlah seller yang dikunjungi." />
            <StatTile icon={<Flag className="h-4 w-4" />} label="Drop Point" value={formatNumber(nDrop)} tip="Jumlah drop point / gateway tujuan." />
            <StatTile icon={<Clock className="h-4 w-4" />} label="Event Status" value={formatNumber((data.events ?? []).length)} tip="Jumlah update status yang tercatat." />
          </div>

          {/* Komposisi durasi */}
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

          {/* Komposisi rute */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rute:</p>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
              <i className="h-2 w-2 rounded-full bg-sky-500" /> Gudang {formatNumber(nGudang)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
              <i className="h-2 w-2 rounded-full bg-emerald-500" /> Seller {formatNumber(nSeller)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
              <i className="h-2 w-2 rounded-full bg-orange-500" /> Drop {formatNumber(nDrop)}
            </span>
          </div>

          {/* Realisasi vs jadwal */}
          <div className="grid gap-2 sm:grid-cols-2">
            {realisasiRows.map((r) => {
              const d = deltaMin(r.jadwal, r.realisasi);
              return (
                <div key={r.label} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.label}</p>
                  <p className="mt-0.5 text-sm">
                    <span className="text-slate-500">Jadwal {r.jadwal ?? "-"}</span>
                    <span className="mx-1.5 text-slate-300">→</span>
                    <span className="font-semibold text-slate-800">{r.realisasi ?? "-"}</span>
                  </p>
                  {d !== null && (
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold",
                        d === 0
                          ? "bg-emerald-50 text-emerald-700"
                          : d > 0
                          ? "bg-rose-50 text-rose-700"
                          : "bg-sky-50 text-sky-700"
                      )}
                    >
                      {fmtDelta(d)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Muatan + Timeline */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Muatan
              <InfoTip text="Jumlah AWB, koli, dan paket yang tertinggal." />
            </CardTitle>
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
            <CardTitle className="text-sm font-semibold">
              Timeline Status & Durasi
              <InfoTip text="Riwayat status & durasi proses (loading, perjalanan, tiba) selama ritase." />
            </CardTitle>
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

/** Tile angka kecil untuk Statistik Ritase. */
function StatTile({
  icon,
  label,
  value,
  tip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tip: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
          <span className="block text-base font-bold tabular-nums text-slate-800">{value}</span>
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">{tip}</p>
    </div>
  );
}