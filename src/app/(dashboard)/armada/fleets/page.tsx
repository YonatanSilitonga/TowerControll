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
import { useFleets } from "@/hooks/use-armada";

export default function FleetsPage() {
  const { data, isLoading } = useFleets();

  return (
    <div>
      <PageHeader title="Fleet" description="Daftar fleet / pool kendaraan" />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Belum ada fleet
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((fleet) => (
                <TableRow key={fleet.id}>
                  <TableCell className="font-mono text-xs">{fleet.kode}</TableCell>
                  <TableCell className="font-medium">{fleet.nama}</TableCell>
                  <TableCell>{fleet.lokasi}</TableCell>
                  <TableCell>
                    <StatusBadge status={fleet.status} />
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
