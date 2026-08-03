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
import { useTrips } from "@/hooks/use-armada";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default function TripsPage() {
  const { data, isLoading } = useTrips();

  return (
    <div>
      <PageHeader title="Trip" description="Daftar perjalanan armada" />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Rute</TableHead>
              <TableHead className="text-right">Jarak (km)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada trip
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-mono text-xs font-medium">{trip.kode}</TableCell>
                  <TableCell>
                    {trip.asal} → {trip.tujuan}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(trip.jarak_km)}</TableCell>
                  <TableCell>
                    <StatusBadge status={trip.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(trip.started_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(trip.completed_at)}
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
