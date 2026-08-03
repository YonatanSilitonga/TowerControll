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
import { useDrivers } from "@/hooks/use-armada";

export default function DriversPage() {
  const { data, isLoading } = useDrivers();

  return (
    <div>
      <PageHeader title="Driver" description="Daftar driver dan statusnya" />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead>No. SIM</TableHead>
              <TableHead>Telepon</TableHead>
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
                  Belum ada driver
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{driver.nik}</TableCell>
                  <TableCell className="font-mono text-xs">{driver.no_sim}</TableCell>
                  <TableCell>{driver.telepon}</TableCell>
                  <TableCell>
                    <StatusBadge status={driver.status} />
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
