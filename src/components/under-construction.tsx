"use client";

import { Construction } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Placeholder halaman modul yang belum dikembangkan.
 * Menampilkan status jelas: masih dalam pengembangan.
 */
export function UnderConstruction({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
          <Construction className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold">Modul Sedang Dikembangkan</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Halaman ini belum tersedia. Menunggu endpoint backend &
          spesifikasi dari tim development.
        </p>
      </CardContent>
    </Card>
  );
}
