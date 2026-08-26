"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { adminDriver, adminKendaraan, adminSeller, adminGudang, adminUser } from "@/lib/admin-api";
import {
  Users,
  Car,
  Store,
  Warehouse,
  Shield,
  LogOut,
  LayoutDashboard,
  Truck,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/drivers", label: "Driver", icon: Users },
  { href: "/admin/vehicles", label: "Kendaraan", icon: Car },
  { href: "/admin/sellers", label: "Seller", icon: Store },
  { href: "/admin/gudang", label: "Gudang", icon: Warehouse },
  { href: "/admin/users", label: "Users & Role", icon: Shield },
];

function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  return (
    <div className="hidden w-60 shrink-0 bg-[#0c1e3a] lg:block">
      <aside className="sticky top-0 flex h-screen w-full flex-col border-r border-[#0c1e3a] text-slate-300">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <Image src="/logo-icon.png" alt="Tower Control" width={34} height={34} className="h-8 w-8 shrink-0 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Tower Control</p>
            <p className="text-[10px] tracking-wider text-amber-400/80">Admin Panel</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Pengelolaan</p>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active ? "bg-white text-[#0c1e3a] shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-white/10 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-[#0c1e3a]">
            {user?.name?.charAt(0) ?? "A"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "Admin"}</p>
            <p className="text-[11px] text-slate-400">Administrator</p>
          </div>
          <button onClick={() => { clear(); router.replace("/admin/login"); }} className="rounded p-1 text-slate-400 hover:text-white transition-colors" title="Keluar">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}

import { usePathname } from "next/navigation";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({ drivers: 0, vehicles: 0, sellers: 0, gudang: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, v, s, g, u] = await Promise.all([
          adminDriver.list(), adminKendaraan.list(), adminSeller.list(), adminGudang.list(), adminUser.list()
        ]);
        setCounts({ drivers: d.length, vehicles: v.length, sellers: s.length, gudang: g.length, users: u.length });
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Driver", count: counts.drivers, href: "/admin/drivers", icon: Users, color: "bg-blue-500", light: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
    { label: "Kendaraan", count: counts.vehicles, href: "/admin/vehicles", icon: Car, color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    { label: "Seller", count: counts.sellers, href: "/admin/sellers", icon: Store, color: "bg-purple-500", light: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
    { label: "Gudang", count: counts.gudang, href: "/admin/gudang", icon: Warehouse, color: "bg-amber-500", light: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
    { label: "Users", count: counts.users, href: "/admin/users", icon: Shield, color: "bg-rose-500", light: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Admin</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Ringkasan jumlah data master di seluruh sistem.</p>
        </div>

        <div className="flex-1 p-6 lg:p-8">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", c.light)}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500 dark:text-slate-600" />
                </div>
                <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : c.count.toLocaleString("id-ID")}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
              </Link>
            ))}
          </div>

          {/* Quick info */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0c1e3a]/5">
                <Activity className="h-5 w-5 text-[#0c1e3a] dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Panel Administrasi</p>
                <p className="text-xs text-slate-500">Gunakan menu di samping untuk mengelola data master: driver, kendaraan, seller, gudang, dan user.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
