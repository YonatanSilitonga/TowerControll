"use client";

import Link from "next/link";
import { ArrowUpRight, Car, MapPin, Route } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  icon: typeof Car;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:border-[#034075]/40 hover:shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Icon className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{count ?? "-"}</p>
          <CardDescription className="flex items-center gap-1 text-xs">
            {description}
            <ArrowUpRight className="h-3 w-3" />
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Pilihan navigasi armada (ikon lucide yang sama dengan NavCard). */
export const armadaNavIcons = { Car, MapPin, Route };