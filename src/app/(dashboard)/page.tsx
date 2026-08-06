"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  PackageOpen,
  PlayCircle,
  RadioTower,
  Route as RouteIcon,
  Truck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalisis, useDashboardSummary } from "@/hooks/use-dashboard";
import { useTrackingHistory, useTrackingMap } from "@/hooks/use-tracking";
import { useRitaseDetail } from "@/hooks/use-armada";
import { get } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { DriverSummary, summarizeEvents } from "@/components/armada/driver-summary";
import { StatusTimeline } from "@/components/armada/status-timeline";
import { VehicleItem } from "@/components/armada/vehicle-item";
import { InfoTip } from "@/components/ui/info-tip";
import { cn, formatNumber } from "@/lib/utils";
import type { TrackingCheckpoint } from "@/types/armada";

const LiveMap = dynamic(
  () => import("@/components/map/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-xl" />,
  }
);

function fmtShort(sec: number): string {
  if (sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s}dtk`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m}m` : `${m}m ${r}dtk`;
  return `${Math.floor(m / 60)}j ${m % 60}m`;
}

function fmtFull(sec: number): string {
  if (sec <= 0) return "-";
  const s = Math.round(sec);
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r === 0 ? `${m} menit` : `${m} menit ${r} detik`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0) return `${h} jam`;
  return `${h} jam ${rm} menit`;
}

function minutesAgo(iso?: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  return `${h} jam ${m % 60} mnt lalu`;
}

/** Tanggal lokal (WIB) format YYYY-MM-DD — buat batas maksimum input tanggal. */
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function DashboardPage() {
  const summary = useDashboardSummary();
  const analisis = useDashboardAnalisis();
  const map = useTrackingMap();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // "" = semua tanggal; kalau diisi → filter riwayat per hari.
  const [selectedDate, setSelectedDate] = useState<string>("");
  const token = useAuthStore((s) => s.token);

  const vehicles = map.data?.vehicles ?? [];
  // Kunci stabil dari set id kendaraan (bukan posisi) — biar re-render peta
  // gak nge-refetch ulang history tiap poll 10 detik.
  const idsKey = useMemo(
    () => vehicles.map((v) => v.id_kendaraan).join(","),
    [vehicles]
  );
  // Array query DI-MEMOIZE dari set id — hindari churn/refetch tiap render.
  const historyQueries = useMemo(
    () =>
      vehicles.map((v) => ({
        queryKey: ["hist", v.id_kendaraan],
        queryFn: () =>
          get<TrackingCheckpoint[]>("/armada/tracking/history", {
            token,
            query: { kendaraan_id: v.id_kendaraan },
          }),
        enabled: !!token && vehicles.length > 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, token]
  );
  const histories = useQueries({ queries: historyQueries });

  const { data: history, isLoading: loadingHistory } = useTrackingHistory(
    selectedId,
    selectedDate || undefined
  );

  const selectedRitaseId =
    history && history.length > 0
      ? (history[history.length - 1]?.id_ritase ?? history[0]?.id_ritase)
      : undefined;
  const { data: ritaseDetail } = useRitaseDetail(selectedRitaseId);

  if (summary.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[90px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[50vh] w-full rounded-2xl" />
      </div>
    );
  }

  const d = summary.data;
  const bottlenecks = analisis.data?.bottleneck ?? [];
  const alerts = analisis.data?.alerts ?? [];
  const sellers = map.data?.sellers ?? [];
  const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedId) ?? null;

  // Kalau ada query gagal (backend down/401 dll) → tampilkan banner, jangan senyap.
  const dashError =
    summary.error?.message ?? analisis.error?.message ?? map.error?.message ?? null;

  const allHist = histories.map((h) => h.data ?? []);
  const avgOf = (cat: "loading" | "perjalanan" | "tiba" | "selesai") => {
    const vals = allHist.map((evs) => summarizeEvents(evs)[cat]).filter((v) => v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgLoading = avgOf("loading");
  const avgPerjalanan = avgOf("perjalanan");
  const avgUnloading = avgOf("tiba");
  const totalAvg = avgLoading + avgPerjalanan + avgUnloading;
  const pct = (v: number) => (totalAvg > 0 ? Math.round((v / totalAvg) * 100) : 0);
  const lastUpdate =
    vehicles.length > 0
      ? vehicles.reduce((acc, v) => (v.last_update > acc ? v.last_update : acc), "")
      : null;

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const summaryCards = [
    { label: "Total Armada", value: formatNumber(d?.total_kendaraan ?? 0), icon: Truck, tone: "bg-slate-100 text-slate-600" },
    { label: "Selesai", value: formatNumber(d?.armada_selesai ?? 0), icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Berjalan", value: formatNumber(d?.armada_aktif ?? 0), icon: PlayCircle, tone: "bg-sky-100 text-sky-700" },
    { label: "Rata² Loading", value: fmtFull(avgLoading), icon: PackageCheck, tone: "bg-amber-100 text-amber-700" },
    { label: "Rata² Perjalanan", value: fmtFull(avgPerjalanan), icon: RouteIcon, tone: "bg-blue-100 text-blue-700" },
    { label: "Rata² Unloading", value: fmtFull(avgUnloading), icon: PackageOpen, tone: "bg-violet-100 text-violet-700" },
  ];

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#034075] to-[#0a5aa8] p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-24 -bottom-12 h-32 w-32 rounded-full bg-amber-400/20" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Operasional</h1>
            <p className="mt-1 text-sm text-white/80">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
                Update {minutesAgo(lastUpdate)}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              LIVE · auto-refresh 10s
            </span>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {dashError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Gagal mengambil data: <b>{dashError}</b>. Coba refresh, atau cek backend / token.
          </span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((c) => (
          <Card key={c.label} className="transition-shadow hover:shadow-md">
            <CardContent className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", c.tone)}>
                  <c.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PETA KIRI + ARMADA KANAN */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* KIRI: peta live — mengikuti tinggi panel kanan (grid stretch) */}
        <Card className="flex flex-col overflow-hidden rounded-2xl shadow-sm">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="h-4 w-4 text-[#034075]" /> Peta Live
              <span className="ml-auto flex items-center gap-3 text-xs font-normal text-slate-400">
                <span>{vehicles.length} truk</span>
                <span>{sellers.length} seller</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  live 10s
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="h-full min-h-[420px] w-full">
              <LiveMap
                vehicles={vehicles}
                sellers={sellers}
                selectedVehicleId={selectedId}
                onSelectVehicle={setSelectedId}
              />
            </div>
          </CardContent>
        </Card>

        {/* KANAN: panel armada */}
        <div className="space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4 text-[#034075]" /> Armada Aktif
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {vehicles.length} truk
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[300px] space-y-2 overflow-y-auto pt-0">
              {map.isPending ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : vehicles.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Belum ada armada mengirim posisi
                </p>
              ) : (
                vehicles.map((v, idx) => {
                  const sum = summarizeEvents(histories[idx]?.data ?? []);
                  const durasi =
                    sum.total > 0
                      ? `L ${fmtShort(sum.loading)} · J ${fmtShort(sum.perjalanan)} · T ${fmtShort(sum.total)}`
                      : undefined;
                  return (
                    <VehicleItem
                      key={v.id_kendaraan}
                      vehicle={v}
                      selected={selectedId === v.id_kendaraan}
                      onSelect={() =>
                        setSelectedId((cur) =>
                          cur === v.id_kendaraan ? null : v.id_kendaraan
                        )
                      }
                      durasi={durasi}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>

          {selectedVehicle && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  Riwayat · {selectedVehicle.plat_nomor || "-"}
                  <span className="ml-auto text-xs font-normal text-slate-400">
                    {selectedVehicle.nama_driver || "-"}
                  </span>
                </CardTitle>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayLocal()}
                  onChange={(e) => setSelectedDate(e.target.value || "")}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#034075] focus:outline-none focus:ring-2 focus:ring-[#034075]/20"
                />
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-y-auto pt-0">
                {loadingHistory ? (
                  <Skeleton className="h-24 w-full" />
                ) : (history ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Belum ada riwayat status
                  </p>
                ) : (
                  <>
                    <DriverSummary
                      events={history ?? []}
                      stops={ritaseDetail?.stops ?? []}
                      title="Ringkasan Durasi"
                    />
                    <div className="mt-4 border-t pt-3">
                      <StatusTimeline
                        events={history ?? []}
                        stops={ritaseDetail?.stops ?? []}
                        limit={12}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* INFO BAWAH (full-width) */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Durasi proses */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-amber-500" /> Durasi Proses
              <InfoTip text="Rata-rata durasi Loading, Perjalanan & Unloading dari ritase aktif — buat lihat bottleneck." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DurasiBar label="Loading" value={avgLoading} tone="bg-amber-400" pct={pct(avgLoading)} />
            <DurasiBar label="Perjalanan" value={avgPerjalanan} tone="bg-sky-500" pct={pct(avgPerjalanan)} />
            <DurasiBar label="Unloading" value={avgUnloading} tone="bg-violet-400" pct={pct(avgUnloading)} />
          </CardContent>
        </Card>

        {/* Bottleneck */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Bottleneck
              <InfoTip text="Titik potensial hambatan operasional (seller/driver)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottlenecks.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada bottleneck</p>
            ) : (
              <div className="space-y-2">
                {bottlenecks.map((b, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{b.label}</p>
                      <p className="text-xs capitalize text-slate-500">{b.indikator}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatNumber(b.nilai)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BellRing className="h-4 w-4 text-amber-500" /> Alert Anomali
              <InfoTip text="Kondisi abnormal: armada berhenti lama, perjalanan kelamaan, loading kelamaan." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Tidak ada anomali</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((al, i) => (
                  <p
                    key={i}
                    className={cn(
                      "rounded-md px-3 py-2 text-xs",
                      al.tingkat === "critical"
                        ? "bg-rose-50 text-rose-800"
                        : "bg-amber-50 text-amber-800"
                    )}
                  >
                    {al.pesan}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DurasiBar({ label, value, tone, pct }: { label: string; value: number; tone: string; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold tabular-nums text-slate-800">{fmtFull(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  );
}
