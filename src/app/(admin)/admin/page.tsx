"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  adminDriver,
  adminKendaraan,
  adminSeller,
  adminImplant,
  adminKapten,
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
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  UserCheck,
  MapPin,
  ChevronRight,
  UserCog,
  Truck,
  Warehouse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({
    drivers: 0,
    activeDrivers: 0,
    pickupDrivers: 0,
    vehicles: 0,
    activeVehicles: 0,
    maintVehicles: 0,
    sellers: 0,
    activeSellers: 0,
    implants: 0,
    activeImplants: 0,
    kapten: 0,
    activeKapten: 0,
    dropPoints: 0,
    activeDropPoints: 0,
    users: 0,
    activeUsers: 0,
    roleCounts: {
      admin: 0,
      koor_gudang: 0,
      kapten: 0,
      driver: 0,
      tower_control: 0,
      direktur: 0,
      other: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, v, s, imp, k, dp, u] = await Promise.all([
        adminDriver.list().catch(() => []),
        adminKendaraan.list().catch(() => []),
        adminSeller.list().catch(() => []),
        adminImplant.list().catch(() => []),
        adminKapten.list().catch(() => []),
        adminDropPoint.list().catch(() => []),
        adminUser.list().catch(() => []),
      ]);

      const roleMap: Record<string, number> = {
        admin: 0,
        koor_gudang: 0,
        kapten: 0,
        driver: 0,
        tower_control: 0,
        direktur: 0,
        other: 0,
      };

      u.forEach((user) => {
        const r = (user.role || "").toLowerCase();
        if (r in roleMap) {
          roleMap[r]++;
        } else if (r === "driver_pickup") {
          roleMap.driver++;
        } else {
          roleMap.other++;
        }
      });

      const pickupDriversCount = d.filter((item) => {
        const j = (item.jabatan || "").toLowerCase();
        return j.includes("pickup");
      }).length;

      setCounts({
        drivers: d.length,
        activeDrivers: d.filter((item) => item.status_driver === "aktif").length,
        pickupDrivers: pickupDriversCount,
        vehicles: v.length,
        activeVehicles: v.filter((item) => item.status_kendaraan === "aktif").length,
        maintVehicles: v.filter((item) => item.status_kendaraan === "maintenance").length,
        sellers: s.length,
        activeSellers: s.filter((item) => item.status === "aktif").length,
        implants: imp.length,
        activeImplants: imp.filter((item) => item.status === "aktif").length,
        kapten: k.length,
        activeKapten: k.filter((item) => item.status === "aktif").length,
        dropPoints: dp.length,
        activeDropPoints: dp.filter((item) => item.status === "aktif").length,
        users: u.length,
        activeUsers: u.filter((item) => item.status === "aktif" || item.is_active).length,
        roleCounts: roleMap as any,
      });
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data dashboard.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
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

  // 6 Kartu Utama (Sesuai dengan Menu Sidebar Master Data)
  const kpiCards = [
    {
      label: "DRIVER",
      value: counts.drivers,
      sub: `${counts.activeDrivers} aktif ${counts.pickupDrivers > 0 ? `(${counts.pickupDrivers} pickup)` : ""}`,
      icon: Users,
      href: "/admin/drivers",
      color: "from-blue-500/10 to-indigo-500/5",
    },
    {
      label: "KENDARAAN",
      value: counts.vehicles,
      sub: `${counts.activeVehicles} siap · ${counts.maintVehicles} maint`,
      icon: Car,
      href: "/admin/vehicles",
      color: "from-slate-500/10 to-slate-500/5",
    },
    {
      label: "SELLER",
      value: counts.sellers,
      sub: `${counts.activeSellers} aktif reguler`,
      icon: Store,
      href: "/admin/sellers",
      color: "from-emerald-500/10 to-teal-500/5",
    },
    {
      label: "IMPLANT",
      value: counts.implants,
      sub: `${counts.activeImplants} lokasi aktif`,
      icon: Building2,
      href: "/admin/implants",
      color: "from-amber-500/10 to-orange-500/5",
    },
    {
      label: "KAPTEN",
      value: counts.kapten,
      sub: `${counts.activeKapten} aktif bertugas`,
      icon: UserCheck,
      href: "/admin/kapten",
      color: "from-violet-500/10 to-purple-500/5",
    },
    {
      label: "GATEWAY",
      value: counts.dropPoints,
      sub: `${counts.activeDropPoints} aktif hub`,
      icon: Navigation,
      href: "/admin/drop-points",
      color: "from-cyan-500/10 to-sky-500/5",
    },
  ];

  // Overview status rincian master data
  const masterDataList = [
    {
      title: "Driver",
      total: counts.drivers,
      active: counts.activeDrivers,
      inactive: counts.drivers - counts.activeDrivers,
      inactiveLabel: "nonaktif",
      href: "/admin/drivers",
      icon: Users,
    },
    {
      title: "Kendaraan",
      total: counts.vehicles,
      active: counts.activeVehicles,
      inactive: counts.maintVehicles,
      inactiveLabel: "maintenance",
      href: "/admin/vehicles",
      icon: Car,
    },
    {
      title: "Seller",
      total: counts.sellers,
      active: counts.activeSellers,
      inactive: counts.sellers - counts.activeSellers,
      inactiveLabel: "nonaktif",
      href: "/admin/sellers",
      icon: Store,
    },
    {
      title: "Implant",
      total: counts.implants,
      active: counts.activeImplants,
      inactive: counts.implants - counts.activeImplants,
      inactiveLabel: "nonaktif",
      href: "/admin/implants",
      icon: Building2,
    },
    {
      title: "Kapten",
      total: counts.kapten,
      active: counts.activeKapten,
      inactive: counts.kapten - counts.activeKapten,
      inactiveLabel: "nonaktif",
      href: "/admin/kapten",
      icon: UserCheck,
    },
    {
      title: "Gateway",
      total: counts.dropPoints,
      active: counts.activeDropPoints,
      inactive: counts.dropPoints - counts.activeDropPoints,
      inactiveLabel: "nonaktif",
      href: "/admin/drop-points",
      icon: Navigation,
    },
  ];

  // Role Breakdown Cards
  const roleBadges = [
    { label: "Admin & Dev", count: counts.roleCounts.admin, icon: Shield, desc: "Hak akses penuh sistem" },
    { label: "Koor Gudang", count: counts.roleCounts.koor_gudang, icon: Warehouse, desc: "Logistik & muatan gudang" },
    { label: "Kapten Implant", count: counts.roleCounts.kapten, icon: UserCheck, desc: "Input serah terima implant" },
    { label: "Driver", count: counts.roleCounts.driver, icon: Truck, desc: "Pickup & gateway delivery" },
    { label: "Tower Control", count: counts.roleCounts.tower_control, icon: UserCog, desc: "Monitoring & dispatching" },
    { label: "Direktur", count: counts.roleCounts.direktur, icon: CheckCircle2, desc: "Eksekutif & reporting" },
  ];

  return (
    <div className="space-y-4">
      {/* ─── HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0c1e3a] via-[#12284b] to-[#1a3a5c] p-5 sm:p-6 text-white shadow-sm">
        {/* Dekorasi Wave / Ambient Glow */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="pointer-events-none absolute right-48 -bottom-14 h-40 w-40 rounded-full bg-amber-400/10 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Online
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-300">
              {today} · <span className="font-semibold text-white tabular-nums">{jamWIB} WIB</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95 border border-white/15 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── ERROR BANNER ─── */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/30 dark:bg-rose-950/20">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <p className="flex-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            <RefreshCw className="h-3 w-3" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* ─── 6 KPI CARDS (SINKRON DENGAN MENU MASTER DATA ADMIN) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {kpiCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {c.label}
                </p>
                <div className="rounded-md bg-slate-50 p-1 text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100 transition-colors dark:bg-slate-800 dark:group-hover:text-slate-200">
                  <c.icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="mt-2.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {loading ? "—" : c.value.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between pt-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{c.sub}</p>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
            </div>
          </Link>
        ))}
      </div>

      {/* ─── MASTER DATA OVERVIEW ─── */}
      <Card className="rounded-xl border-slate-200 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Master Data Status
            </CardTitle>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              6 Entitas Terintegrasi
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {masterDataList.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-2xs dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.title}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {loading ? "—" : item.total}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    ({item.inactive} {item.inactiveLabel})
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{loading ? "—" : item.active} aktif</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── USERS & RBAC ROLE DISTRIBUTION (MENGISI RUANG KOSONG) ─── */}
      <Card className="rounded-xl border-slate-200 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Shield className="h-4 w-4 text-[#0c1e3a] dark:text-blue-400" />
                Hak Akses & Akun Pengguna
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rincian distribusi role pengguna di sistem Tower Control
              </CardDescription>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0c1e3a] hover:underline dark:text-blue-400"
            >
              <span>Kelola User</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
            {/* Total Akun Tile */}
            <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 p-4 border border-slate-200/80 dark:from-slate-800/60 dark:to-slate-800/30 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Akun
                </p>
                <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : counts.users}
                </p>
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {counts.activeUsers} akun status aktif
                </p>
              </div>

              <Link
                href="/admin/users"
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0c1e3a] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#12284b] active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Lihat Semua Akun</span>
              </Link>
            </div>

            {/* Grid 6 Distribusi Role */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {roleBadges.map((r) => (
                <div
                  key={r.label}
                  className="flex flex-col justify-between rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200 transition-colors dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {r.label}
                    </span>
                    <r.icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>

                  <div className="my-2">
                    <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {loading ? "—" : r.count}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">akun</span>
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {r.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
