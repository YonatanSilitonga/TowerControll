"use client";

import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Placeholder konten halaman modul yang belum dikembangkan.
 * (Judul & deskripsi di-handle oleh PageHeader di masing-masing halaman.)
 */
export function UnderConstruction() {
  return (
    <Card className="rounded-lg border-slate-200">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Construction className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold">Modul Sedang Dikembangkan</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Halaman ini belum tersedia. Menunggu endpoint backend &amp; spesifikasi dari tim
          development.
        </p>
      </CardContent>
    </Card>
  );
}
