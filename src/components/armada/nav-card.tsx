// SESUDAH
"use client";

import Link from "next/link";
import { ChevronRight, Truck, Users, Store, Route } from "lucide-react";
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
    <Link href={href} className="group block">
      <Card className="h-full origin-center border-l-[3px] border-l-[#FEA103]/70 cursor-pointer transition-all duration-200 ease-out hover:scale-[1.02] hover:border-l-[#FEA103] hover:bg-[#FEA103]/[0.04] hover:shadow-md dark:hover:bg-[#FEA103]/[0.06]">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors duration-200 group-hover:bg-[#FEA103]/15 group-hover:text-[#FEA103] dark:bg-slate-800 dark:text-slate-400">
            <Icon className={ICON_SIZES.md} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{count ?? "-"}</p>
          <CardDescription className="flex items-center gap-1 text-xs">
            <span>{description}</span>
            <ChevronRight className={`${ICON_SIZES.xs} shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#FEA103] dark:text-slate-600`} />
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