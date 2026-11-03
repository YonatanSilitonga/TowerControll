"use client";

import { CheckCircle2, Layers, Truck, UserCheck } from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";

interface JadwalStatsCardsProps {
  totalRitase: number;
  uniqueDrivers: number;
  inProgress: number;
  completed: number;
}

export function JadwalStatsCards({
  totalRitase,
  uniqueDrivers,
  inProgress,
  completed,
}: JadwalStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KPICard label="Total Ritase" value={totalRitase} icon={Layers} />
      <KPICard
        label="Driver Ditugaskan"
        value={uniqueDrivers}
        icon={UserCheck}
      />
      <KPICard label="Dalam Perjalanan" value={inProgress} icon={Truck} />
      <KPICard label="Ritase Selesai" value={completed} icon={CheckCircle2} />
    </div>
  );
}

