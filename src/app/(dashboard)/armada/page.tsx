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
import { statusLabel } from "@/lib/constants";
import { Store } from "lucide-react";

export default function ArmadaOverviewPage() {
  const { data: kendaraan, isLoading: lK } = useKendaraan();
  const { data: driver, isLoading: lD } = useDriver();
  const { data: ritase, isLoading: lR } = useRitase();
  const { data: seller, isLoading: lS } = useSeller();

  return (
    <div>
      <PageHeader
        title="Armada"
        description="Kelola kendaraan, driver, seller, dan ritase (rute perjalanan)"
      />
      <ArmadaTabs />

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* Breakdown status */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Status Kendaraan <InfoTip text="Ringkasan jumlah kendaraan per status (aktif, tersedia, maintenance, dst)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lK ? (
              <Skeleton className="h-20 w-full" />
            ) : (kendaraan ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada kendaraan</p>
            ) : (
              <Breakdown items={kendaraan ?? []} field="status_kendaraan" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Status Driver <InfoTip text="Ringkasan jumlah driver per status (bertugas, libur, dst)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lD ? (
              <Skeleton className="h-20 w-full" />
            ) : (driver ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada driver</p>
            ) : (
              <Breakdown items={driver ?? []} field="status_driver" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Status Ritase <InfoTip text="Ringkasan jumlah ritase per status (direncanakan, berjalan, selesai)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lR ? (
              <Skeleton className="h-20 w-full" />
            ) : (ritase ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Belum ada ritase</p>
            ) : (
              <Breakdown items={ritase ?? []} field="status" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-medium text-slate-800">💡 Tips</p>
        <p className="text-xs">
          Peta live & status armada ada di <b>Dashboard</b>. Detail kendaraan, driver, dan rute ritase
          ada di menu Armada.
        </p>
      </div>
    </div>
  );
}

function Breakdown<T extends { [K in F]: string }, F extends keyof T>({
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
  return (
    <div className="space-y-2">
      {sorted.map(([key, total]) => (
        <div key={key} className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
          <span className="text-sm text-slate-600">{statusLabel(key)}</span>
          <span className="text-sm font-bold tabular-nums">{total}</span>
        </div>
      ))}
    </div>
  );
}