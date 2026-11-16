"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  Layers,
  Loader2,
  PackageCheck,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMuatanSummary } from "@/hooks/use-muatan";
import { RITASE_CONFIG, type RitaseType } from "@/lib/ritase";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { MuatanRitSummary } from "@/types/muatan";

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

function number(value: number) {
  return value.toLocaleString("id-ID");
}

function emptyRit(ritaseKe: RitaseType): MuatanRitSummary {
  return {
    ritase_ke: ritaseKe,
    implan_awb: 0,
    implan_hv: 0,
    implan_entries: 0,
    driver_pickup_awb: 0,
    driver_pickup_hv: 0,
    driver_pickup_entries: 0,
    dropper_awb: 0,
    dropper_hv: 0,
    dropper_entries: 0,
    total_awb: 0,
    total_hv: 0,
    total_entries: 0,
  };
}

function SourceCard({
  label,
  awb,
  hv,
  entries,
  icon,
  tone,
}: {
  label: string;
  awb: number;
  hv: number;
  entries: number;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <Card className="rounded-xl border-slate-200/80 shadow-xs">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
            {icon}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black tabular-nums text-slate-900">
            {number(awb)}
          </span>
          <span className="text-xs font-semibold text-slate-500">AWB</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {number(hv)} HV · {number(entries)} transaksi
        </p>
      </CardContent>
    </Card>
  );
}

function RitCard({
  label,
  time,
  data,
  active,
}: {
  label: string;
  time: string;
  data: MuatanRitSummary;
  active?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-xl border-slate-200/80 shadow-xs",
        active && "border-slate-900/20 bg-slate-50/70 ring-1 ring-slate-900/5",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="mt-0.5 text-[10px] font-mono text-slate-400">{time} WIB</p>
          </div>
          <Layers className={cn("h-4 w-4", active ? "text-slate-700" : "text-slate-300")} />
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl font-black tabular-nums text-slate-900">
            {number(data.total_awb)}
          </span>
          <span className="text-xs font-semibold text-slate-500">AWB</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {number(data.total_hv)} HV · {number(data.total_entries)} transaksi
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 text-[10px]">
          <span className="truncate text-slate-500" title="Implan">
            Implan: {number(data.implan_awb)}
          </span>
          <span className="truncate text-slate-500" title="Driver Pickup">
            Pickup: {number(data.driver_pickup_awb)}
          </span>
          <span className="truncate text-slate-500" title="Dropper">
            Dropper: {number(data.dropper_awb)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TotalMuatanPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [tanggal, setTanggal] = useState(todayJakarta);
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useMuatanSummary(tanggal);

  const ritRows = useMemo(
    () =>
      ([1, 2, 3] as RitaseType[]).map(
        (rit) => data?.rits.find((item) => item.ritase_ke === rit) ?? emptyRit(rit),
      ),
    [data],
  );

  const sourceTotals = useMemo(
    () =>
      ritRows.reduce(
        (acc, item) => {
          acc.implan.awb += item.implan_awb;
          acc.implan.hv += item.implan_hv;
          acc.implan.entries += item.implan_entries;
          acc.driverPickup.awb += item.driver_pickup_awb;
          acc.driverPickup.hv += item.driver_pickup_hv;
          acc.driverPickup.entries += item.driver_pickup_entries;
          acc.dropper.awb += item.dropper_awb;
          acc.dropper.hv += item.dropper_hv;
          acc.dropper.entries += item.dropper_entries;
          return acc;
        },
        {
          implan: { awb: 0, hv: 0, entries: 0 },
          driverPickup: { awb: 0, hv: 0, entries: 0 },
          dropper: { awb: 0, hv: 0, entries: 0 },
        },
      ),
    [ritRows],
  );

  const grandTotal = useMemo(
    () =>
      ritRows.reduce(
        (acc, item) => {
          acc.awb += item.total_awb;
          acc.hv += item.total_hv;
          acc.entries += item.total_entries;
          return acc;
        },
        { awb: 0, hv: 0, entries: 0 },
      ),
    [ritRows],
  );

  if (role !== "tower_control" && role !== "developer") {
    return (
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Total Muatan"
          description="Rekap total AWB dari implan, driver pickup, dan dropper."
        />
        <UnderConstruction />
      </div>
    );
  }

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Total Muatan"
        description="Rekap total AWB per Rit dari input kapten/implan, driver pickup, dan dropper."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            Tanggal
          </div>
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="h-9 w-[160px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Terakhir: {lastUpdated}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-9"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {isError ? (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Gagal mengambil Total Muatan</p>
              <p className="mt-0.5 text-xs text-rose-700">
                Periksa koneksi backend lalu coba refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[142px] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RitCard
              label="Total Muatan"
              time="00:00 - 23:59"
              data={{
                ...emptyRit(1),
                total_awb: grandTotal.awb,
                total_hv: grandTotal.hv,
                total_entries: grandTotal.entries,
                implan_awb: sourceTotals.implan.awb,
                driver_pickup_awb: sourceTotals.driverPickup.awb,
                dropper_awb: sourceTotals.dropper.awb,
              }}
              active
            />
            {ritRows.map((item) => {
              const rit = item.ritase_ke as RitaseType;
              return (
                <RitCard
                  key={rit}
                  label={RITASE_CONFIG[rit].label}
                  time={RITASE_CONFIG[rit].shortTime}
                  data={item}
                />
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SourceCard
              label="Implan / Kapten"
              awb={sourceTotals.implan.awb}
              hv={sourceTotals.implan.hv}
              entries={sourceTotals.implan.entries}
              icon={<Store className="h-4 w-4" />}
              tone="bg-sky-100 text-sky-700"
            />
            <SourceCard
              label="Driver Pickup"
              awb={sourceTotals.driverPickup.awb}
              hv={sourceTotals.driverPickup.hv}
              entries={sourceTotals.driverPickup.entries}
              icon={<Truck className="h-4 w-4" />}
              tone="bg-emerald-100 text-emerald-700"
            />
            <SourceCard
              label="Dropper"
              awb={sourceTotals.dropper.awb}
              hv={sourceTotals.dropper.hv}
              entries={sourceTotals.dropper.entries}
              icon={<PackageCheck className="h-4 w-4" />}
              tone="bg-amber-100 text-amber-700"
            />
          </div>

          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Layers className="h-4 w-4 text-slate-500" />
                Rincian Total Muatan per Rit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Rit</th>
                      <th className="px-3 py-3 text-right">Implan</th>
                      <th className="px-3 py-3 text-right">Driver Pickup</th>
                      <th className="px-3 py-3 text-right">Dropper</th>
                      <th className="px-4 py-3 text-right">Total AWB</th>
                      <th className="px-3 py-3 text-right">HV</th>
                      <th className="px-4 py-3 text-right">Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ritRows.map((item) => {
                      const rit = item.ritase_ke as RitaseType;
                      return (
                        <tr key={rit} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">
                              {RITASE_CONFIG[rit].label}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {RITASE_CONFIG[rit].shortTime} WIB
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">
                            {number(item.implan_awb)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">
                            {number(item.driver_pickup_awb)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">
                            {number(item.dropper_awb)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                            {number(item.total_awb)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-500">
                            {number(item.total_hv)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                            {number(item.total_entries)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td className="px-4 py-3">Total</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        {number(sourceTotals.implan.awb)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        {number(sourceTotals.driverPickup.awb)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        {number(sourceTotals.dropper.awb)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {number(grandTotal.awb)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        {number(grandTotal.hv)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {number(grandTotal.entries)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
