"use client";

import Link from "next/link";
import { Car, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useDrivers, useTrips, useVehicles } from "@/hooks/use-armada";
import { statusLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export default function ArmadaOverviewPage() {
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const { data: drivers, isLoading: loadingDrivers } = useDrivers();
  const { data: trips, isLoading: loadingTrips } = useTrips();

  return (
    <div>
      <PageHeader
        title="Armada"
        description="Overview status kendaraan, driver, dan trip"
        actions={
          <div className="flex gap-2">
            <Link href="/armada/vehicles" className="text-sm text-primary hover:underline">
              Kendaraan →
            </Link>
            <Link href="/armada/trips" className="text-sm text-primary hover:underline">
              Trip →
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Kendaraan" value={vehicles?.length} icon={Car} loading={loadingVehicles} />
        <StatCard title="Total Driver" value={drivers?.length} icon={Users} loading={loadingDrivers} />
        <StatCard title="Total Trip" value={trips?.length} icon={MapPin} loading={loadingTrips} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Status Kendaraan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingVehicles ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              countByStatus(vehicles ?? [], "status").map(([key, total]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{statusLabel(key)}</span>
                  <span className="text-sm font-medium">{total}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingDrivers ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              countByStatus(drivers ?? [], "status").map(([key, total]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{statusLabel(key)}</span>
                  <span className="text-sm font-medium">{total}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Trip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingTrips ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              countByStatus(trips ?? [], "status").map(([key, total]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{statusLabel(key)}</span>
                  <span className="text-sm font-medium">{total}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function countByStatus<T>(items: T[], field: keyof T): [string, number][] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = String(item[field] ?? "unknown");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
