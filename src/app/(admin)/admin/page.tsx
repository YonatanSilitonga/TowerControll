"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminDriver, adminKendaraan, adminSeller, adminGudang, adminUser, adminDropPoint } from "@/lib/admin-api";
import { Car, Shield, Store, Warehouse, Users, MapPin, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({ drivers: 0, vehicles: 0, sellers: 0, gudang: 0, dropPoints: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, v, s, g, dp, u] = await Promise.all([
          adminDriver.list(), adminKendaraan.list(), adminSeller.list(), adminGudang.list(), adminDropPoint.list(), adminUser.list()
        ]);
        setCounts({ drivers: d.length, vehicles: v.length, sellers: s.length, gudang: g.length, dropPoints: dp.length, users: u.length });
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Driver", count: counts.drivers, href: "/admin/drivers", icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Kendaraan", count: counts.vehicles, href: "/admin/vehicles", icon: Car, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Seller", count: counts.sellers, href: "/admin/sellers", icon: Store, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { label: "Gudang", count: counts.gudang, href: "/admin/gudang", icon: Warehouse, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Drop Point", count: counts.dropPoints, href: "/admin/drop-points", icon: MapPin, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
    { label: "Users", count: counts.users, href: "/admin/users", icon: Shield, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10" },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0c1e3a]">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Ringkasan jumlah data master di seluruh sistem.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-lg border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", c.bg)}>
              <c.icon className={cn("h-5 w-5", c.color)} />
            </div>
            <p className="mt-4 text-2xl font-bold tabular-nums text-[#0c1e3a]">
              {loading ? "—" : c.count.toLocaleString("id-ID")}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <Activity className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Panel Administrasi</p>
            <p className="text-xs text-slate-500">Gunakan menu di samping untuk mengelola data master: driver, kendaraan, seller, gudang, dan user.</p>
          </div>
        </div>
      </div>
    </>
  );
}
