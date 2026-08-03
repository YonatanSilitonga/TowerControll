"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

/** Kartu statistik generik: ikon + judul + nilai (dengan state loading). */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value?: number | string;
  description?: string;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20" />
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {typeof value === "number" ? formatNumber(value) : value ?? "-"}
            </div>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
