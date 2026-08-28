"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminDriver,
  adminKendaraan,
  adminSeller,
  adminDropPoint,
  adminUser,
} from "@/lib/admin-api";
import {
  Car,
  Shield,
  Store,
  Users,
  Navigation,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({
    drivers: 0,
    activeDrivers: 0,
    vehicles: 0,
    activeVehicles: 0,
    sellers: 0,
    activeSellers: 0,
    dropPoints: 0,
    activeDropPoints: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [d, v, s, dp, u] = await Promise.all([
          adminDriver.list(),
          adminKendaraan.list(),
          adminSeller.list(),
          adminDropPoint.list(),
          adminUser.list(),
        ]);

        setCounts({
          drivers: d.length,
          activeDrivers: d.filter((item) => item.status_driver === "aktif").length,
          vehicles: v.length,
          activeVehicles: v.filter((item) => item.status_kendaraan === "aktif").length,
          sellers: s.length,
          activeSellers: s.filter((item) => item.status === "aktif").length,
          dropPoints: dp.length,
          activeDropPoints: dp.filter((item) => item.status === "aktif").length,
          users: u.length,
        });
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);
  const jamWIB = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(now);

  const kpiCards = [
    { label: "Driver", value: counts.drivers, sub: `${counts.activeDrivers} aktif`, icon: Users, href: "/admin/drivers" },
    { label: "Kendaraan", value: counts.vehicles, sub: `${counts.activeVehicles} siap`, icon: Car, href: "/admin/vehicles" },
    { label: "Seller", value: counts.sellers, sub: `${counts.activeSellers} aktif`, icon: Store, href: "/admin/sellers" },
    { label: "Gateway", value: counts.dropPoints, sub: `${counts.activeDropPoints} aktif`, icon: Navigation, href: "/admin/drop-points" },
  ];

  const masterDataCards = [
    {
      title: "Driver",
      total: counts.drivers,
      active: counts.activeDrivers,
      href: "/admin/drivers",
      detail: `${counts.drivers - counts.activeDrivers} nonaktif`,
    },
    {
      title: "Kendaraan",
      total: counts.vehicles,
      active: counts.activeVehicles,
      href: "/admin/vehicles",
      detail: `${counts.vehicles - counts.activeVehicles} maintenance`,
    },
    {
      title: "Seller",
      total: counts.sellers,
      active: counts.activeSellers,
      href: "/admin/sellers",
      detail: `${counts.sellers - counts.activeSellers} nonaktif`,
    },
    {
      title: "Gateway",
      total: counts.dropPoints,
      active: counts.activeDropPoints,
      href: "/admin/drop-points",
      detail: `${counts.dropPoints - counts.activeDropPoints} nonaktif`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-lg bg-[#0c1e3a] p-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-40 -bottom-14 h-36 w-36 rounded-full bg-amber-400/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-xs tabular-nums text-slate-400">
              {today} · <span className="font-semibold text-slate-200">{jamWIB} WIB</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System Online
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpiCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {c.label}
              </p>
              <c.icon className="h-4 w-4 text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {loading ? "—" : c.value.toLocaleString("id-ID")}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{c.sub}</p>
            <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
          </Link>
        ))}
      </div>

      {/* MASTER DATA — full width */}
      <Card className="rounded-lg border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-slate-400" /> Master Data Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {masterDataCards.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.title}</p>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {loading ? "—" : item.total}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.detail}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {loading ? "—" : item.active} aktif
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* USERS */}
      <Card className="rounded-lg border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-slate-400" /> Users & Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href="/admin/users"
            className="group flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div>
              <p className="text-xs text-slate-500">Total Akun</p>
              <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {loading ? "—" : counts.users}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
