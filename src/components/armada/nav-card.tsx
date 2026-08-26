"use client";

import Link from "next/link";
import { ArrowUpRight, Truck, Users, Store, Route } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ICON_SIZES } from "@/lib/design-tokens";

/** Kartu navigasi armada — ikon + judul + deskripsi + jumlah + klik. */
export function NavCard({
  href,
  title,
  description,
  count,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  count?: number | string;
  icon: typeof Truck;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:border-[#0c1e3a]/40 hover:shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Icon className={`${ICON_SIZES.md} text-slate-500 dark:text-slate-400`} />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{count ?? "-"}</p>
          <CardDescription className="flex items-center gap-1 text-xs">
            {description}
            <ArrowUpRight className={ICON_SIZES.xs} />
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Pilihan navigasi armada (ikon lucide yang sama dengan NavCard). */
export const armadaNavIcons = { 
  Car: Truck,
  MapPin: Users,
  Store: Store,
  Route: Route,
};