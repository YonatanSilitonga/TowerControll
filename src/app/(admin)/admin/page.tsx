"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminDriver,
  adminKendaraan,
  adminSeller,
  adminDropPoint,
  adminUser,
  adminRitase,
} from "@/lib/admin-api";
import {
  Car,
  Shield,
  Store,
  Users,
  MapPin,
  Clock,
  ArrowUpRight,
  Plus,
  Zap,
  Database,
  Server,
  RefreshCw,
  Navigation,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

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
    ritase: 0,
    activeRitase: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, v, s, dp, u, r] = await Promise.all([
          adminDriver.list(),
          adminKendaraan.list(),
          adminSeller.list(),
          adminDropPoint.list(),
          adminUser.list(),
          adminRitase.list(),
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
          ritase: r.length,
          activeRitase: r.filter((item) => item.status === "Berjalan").length,
        });
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const summaryCards = [
    { label: "Driver", count: counts.drivers, sub: `${counts.activeDrivers} aktif`, href: "/admin/drivers", icon: Users },
    { label: "Kendaraan", count: counts.vehicles, sub: `${counts.activeVehicles} siap`, href: "/admin/vehicles", icon: Car },
    { label: "Seller", count: counts.sellers, sub: `${counts.activeSellers} aktif`, href: "/admin/sellers", icon: Store },
    { label: "Gateway", count: counts.dropPoints, sub: `${counts.activeDropPoints} aktif`, href: "/admin/drop-points", icon: Navigation },
    { label: "Ritase", count: counts.ritase, sub: `${counts.activeRitase} berjalan`, href: "/admin/ritase", icon: Clock },
    { label: "Users", count: counts.users, sub: "Akun sistem", href: "/admin/users", icon: Shield },
  ];

  const quickActions = [
    { label: "Tambah Driver", href: "/admin/drivers", icon: Users, color: "text-slate-500" },
    { label: "Tambah Kendaraan", href: "/admin/vehicles", icon: Car, color: "text-slate-500" },
    { label: "Tambah Seller", href: "/admin/sellers", icon: Store, color: "text-slate-500" },
    { label: "Generate Ritase", href: "/jadwal", icon: Zap, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Dashboard"
        description="Pusat kontrol data master operasional logistik."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </span>
        }
      />

      {/* ── KPI Cards — clean, no colored bg ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {c.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : c.count.toLocaleString("id-ID")}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{c.sub}</p>
              </div>
              <c.icon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </div>
            <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
          </Link>
        ))}
      </div>

      {/* ── Quick Actions + System Status ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Aksi Cepat</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              >
                <a.icon className={`h-4 w-4 ${a.color}`} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Status Sistem</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Backend API</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Database</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Supabase PG</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Total Data Master</span>
              </div>
              <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                {loading ? "—" : (counts.drivers + counts.vehicles + counts.sellers + counts.dropPoints).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
