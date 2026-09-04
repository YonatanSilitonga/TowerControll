"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { ArmadaTabs } from "@/components/armada/armada-tabs";
import { NavCard, armadaNavIcons } from "@/components/armada/nav-card";
import { InfoTip } from "@/components/ui/info-tip";
import { useDriver, useKendaraan, useRitase } from "@/hooks/use-armada";
import { useSeller } from "@/hooks/use-seller";
import { useTrackingMap } from "@/hooks/use-tracking";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { statusLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Lightbulb, Store, Truck, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

/* ── Trend Indicator ────────────────────────────────────────── */
function TrendIndicator({
  today,
  yesterday,
  label = "dari kemarin",
}: {
  today: number;
  yesterday: number;
  label?: string;
}) {
  const diff = today - yesterday;
  if (yesterday === 0 && today === 0) return <span className="text-[10px] text-slate-400">-</span>;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
        <Minus className="h-2.5 w-2.5" /> Sama {label}
      </span>
    );
  }
  const isUp = diff > 0;
  const pct = yesterday > 0 ? Math.abs(Math.round((diff / yesterday) * 100)) : null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
        isUp ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {isUp ? (
        <ArrowUpRight className="h-2.5 w-2.5" />
      ) : (
        <ArrowDownRight className="h-2.5 w-2.5" />
      )}
      {isUp ? "+" : ""}{diff}
      {pct !== null && <span className="text-[9px]">({isUp ? "+" : ""}{pct}%)</span>}
      <span className="font-normal text-slate-400 ml-0.5">{label}</span>
    </span>
  );
}

export default function ArmadaOverviewPage() {
  const { data: kendaraan, isLoading: lK } = useKendaraan();
  const { data: driver, isLoading: lD } = useDriver();
  const { data: ritase, isLoading: lR } = useRitase();
  const { data: seller, isLoading: lS } = useSeller();
  const { data: mapData } = useTrackingMap();
  const { data: summary, isLoading: lSmm } = useDashboardSummary();

  // Kendaraan yang lagi kirim posisi (tidak offline per backend).
  const onlineIds = new Set(
    (mapData?.vehicles ?? []).filter((v) => !v.offline).map((v) => v.id_kendaraan)
  );
  const onlineCount = (kendaraan ?? []).filter((k) =>
    onlineIds.has(k.id_kendaraan)
  ).length;
  const totalKapasitas = (kendaraan ?? []).reduce(
    (acc, k) => acc + (k.kapasitas_kg ?? 0),
    0
  );
  const driverOnline = (driver ?? []).filter((d) => d.tracking_fresh).length;

  // Ritase hari ini: hitung dari data ritase langsung (outgoing/incoming split)
  const todayStr = new Date().toISOString().slice(0, 10);
  const ritaseToday = (ritase ?? []).filter((r) => r.tanggal === todayStr);
  const outgoingToday = ritaseToday.filter((r) => r.jenis_ritase === "outgoing").length;
  const incomingToday = ritaseToday.filter((r) => r.jenis_ritase === "incoming").length;

  return (
    <div>
      <PageHeader
        title="Armada"
        description="Kelola kendaraan, driver, seller, dan ritase (rute perjalanan)"
        crumbs={[{ label: "Armada" }]}
      />
      <ArmadaTabs />

      {/* Navigation cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <NavCard
          href="/armada/vehicles"
          title="Kendaraan"
          description="Plat, jenis & status armada"
          count={lK ? "…" : kendaraan?.length}
          icon={armadaNavIcons.Car}
        />
        <NavCard
          href="/armada/drivers"
          title="Driver"
          description="Driver tetap & kondisional"
          count={lD ? "…" : driver?.length}
          icon={armadaNavIcons.MapPin}
        />
        <NavCard
          href="/armada/sellers"
          title="Seller"
          description="Titik pickup & kontak"
          count={lS ? "…" : seller?.length}
          icon={Store}
        />
        <NavCard
          href="/armada/trips"
          title="Ritase"
          description="Daftar RIT & rute perjalanan"
          count={lR ? "…" : ritase?.length}
          icon={armadaNavIcons.Route}
        />
      </div>

      {/* Breakdown status — 4 kolom */}
      <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Status Kendaraan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Status Kendaraan <InfoTip text="Status di database, bukan GPS" />
              <span className="ml-auto text-xs font-normal text-slate-400">
                {kendaraan?.length ?? 0} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lK ? (
              <Skeleton className="h-20 w-full" />
            ) : (kendaraan ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada kendaraan</p>
            ) : (
              <>
                <Breakdown items={kendaraan ?? []} field="status_kendaraan" />
                <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kapasitas total</span>
                    <span className="font-bold tabular-nums text-slate-800">
                      {formatNumber(totalKapasitas)} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sedang online</span>
                    <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-emerald-700">
                      <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {onlineCount} armada
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Status Driver */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Status Driver <InfoTip text="Status kepegawaian, bukan GPS" />
              <span className="ml-auto text-xs font-normal text-slate-400">
                {driver?.length ?? 0} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lD ? (
              <Skeleton className="h-20 w-full" />
            ) : (driver ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada driver</p>
            ) : (
              <>
                <Breakdown items={driver ?? []} field="status_driver" />
                <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sedang online</span>
                    <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-emerald-700">
                      <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      {driverOnline} driver
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Status Ritase + trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Status Ritase <InfoTip text="Ringkasan ritase per status" align="right" />
              <span className="ml-auto text-xs font-normal text-slate-400">
                {ritase?.length ?? 0} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lR ? (
              <Skeleton className="h-20 w-full" />
            ) : (ritase ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada ritase</p>
            ) : (
              <>
                <Breakdown items={ritase ?? []} field="status" />
                {/* Trend: total ritase hari ini vs kemarin */}
                {!lSmm && summary && (
                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <TrendIndicator
                      today={summary.ritase_hari_ini}
                      yesterday={summary.ritase_kemarin}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Ritase Hari Ini (NEW) */}
        <Card className="border-[#0c1e3a]/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-[#FEA103]" />
              Ritase Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lR ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-[#0c1e3a]">
                    {ritaseToday.length}
                  </span>
                  <span className="text-xs text-slate-400">ritase</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <i className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {outgoingToday} outgoing
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {incomingToday} incoming
                  </span>
                </div>
                {/* Trend: hari ini vs kemarin */}
                {!lSmm && summary && (
                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <TrendIndicator
                      today={summary.ritase_hari_ini}
                      yesterday={summary.ritase_kemarin}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <p className="text-xs">
          Peta live & status armada ada di <b>Dashboard</b>. Detail kendaraan, driver, dan rute ritase ada di menu Armada.
        </p>
      </div>
    </div>
  );
}

function Breakdown<
  T extends Partial<Record<F, string | null | undefined>>,
  F extends keyof T,
>({
  items,
  field,
}: {
  items: T[];
  field: F;
}) {
  const map = new Map<string, number>();
  for (const it of items) {
    const key = String(it[field] ?? "unknown");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = items.length;
  return (
    <div className="space-y-2">
      {sorted.map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">{statusLabel(key)}</span>
              <span className="font-bold tabular-nums text-slate-700">
                {count}
                <span className="ml-1 text-[10px] font-medium text-slate-400">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0c1e3a]"
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-xs">
        <span className="text-slate-400">Total</span>
        <span className="font-bold tabular-nums text-slate-700">{total}</span>
      </div>
    </div>
  );
}
