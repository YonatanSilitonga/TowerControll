"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { adminDriver, adminKendaraan, adminSeller, adminGudang, adminUser } from "@/lib/admin-api";
import { Car, MapPin, Package, Shield, Store, Truck, Users, Warehouse, LogOut } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: Shield },
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
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
        <Shield className="h-5 w-5 text-amber-500" />
        <span className="text-sm font-bold text-slate-800 dark:text-white">Admin Panel</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="mb-2 text-xs text-slate-500 truncate">{user?.name || user?.username}</div>
        <button
          onClick={() => { clear(); router.replace("/admin/login"); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}

// ── Admin dashboard page ──
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

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="ml-60 flex-1 p-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan jumlah data master di sistem.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { label: "Driver", count: counts.drivers, href: "/admin/drivers", icon: Users, color: "text-blue-600" },
            { label: "Kendaraan", count: counts.vehicles, href: "/admin/vehicles", icon: Car, color: "text-emerald-600" },
            { label: "Seller", count: counts.sellers, href: "/admin/sellers", icon: Store, color: "text-purple-600" },
            { label: "Gudang", count: counts.gudang, href: "/admin/gudang", icon: Warehouse, color: "text-amber-600" },
            { label: "Users", count: counts.users, href: "/admin/users", icon: Shield, color: "text-rose-600" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
                {loading ? "…" : c.count}
              </p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
