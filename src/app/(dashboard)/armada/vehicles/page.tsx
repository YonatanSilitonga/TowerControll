"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { useVehicles } from "@/hooks/use-armada";
import { formatNumber } from "@/lib/utils";

export default function VehiclesPage() {
  const { data, isLoading } = useVehicles();

  return (
    <div>
      <PageHeader title="Kendaraan" description="Daftar kendaraan dan statusnya" />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plat</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Kapasitas (kg)</TableHead>
              <TableHead>Fleet ID</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Belum ada kendaraan
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono text-xs font-medium">{vehicle.plat}</TableCell>
                  <TableCell>{vehicle.tipe}</TableCell>
                  <TableCell className="text-right">{formatNumber(vehicle.kapasitas_kg)}</TableCell>
                  <TableCell className="text-muted-foreground">{vehicle.fleet_id ?? "-"}</TableCell>
                  <TableCell>
                    <StatusBadge status={vehicle.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
