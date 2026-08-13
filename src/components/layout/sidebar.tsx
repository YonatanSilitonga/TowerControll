"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  Truck,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_MENU, ROLE_LABEL } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

const NAV: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; key: string }[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, key: "dashboard" },
  { label: "Armada", href: "/armada", icon: Truck, key: "armada" },
  { label: "Live Map", href: "/armada/live-map", icon: MapPin, key: "live-map" },
  { label: "Jadwal Ritase", href: "/jadwal", icon: Calendar, key: "jadwal" },
  { label: "Analitik", href: "/analitik", icon: BarChart3, key: "analitik" },
  { label: "Gudang", href: "/gudang", icon: Warehouse, key: "gudang" },
  { label: "Absensi", href: "/absensi", icon: ClipboardCheck, key: "absensi" },
  // { label: "Laporan", href: "/laporan", icon: FileText, key: "laporan" }, // di-hide sementara (masih pengembangan), aktifkan saat modul siap
];

/** Item menu sesuai role — dipakai sidebar desktop & drawer mobile. */
export function filterNav(role?: string) {
  const allowed = role ? ROLE_MENU[role as keyof typeof ROLE_MENU] ?? [] : [];
  return NAV.filter((item) => allowed.includes(item.key));
}

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);

  const nav = filterNav(role);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#0c1e3a] bg-[#0c1e3a] text-slate-300 lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <Image
          src="/logo-icon.png"
          alt="Tower Control"
          width={34}
          height={34}
          className="h-8 w-8 shrink-0 object-contain"
        />
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Tower Control</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            Logistics Management
          </p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Menu Utama
        </p>
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-white text-[#0c1e3a] shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-[#0c1e3a]">
          {user?.name?.charAt(0) ?? "A"}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-white">
            {user?.name ?? "Admin Operator"}
          </p>
          <p className="text-[11px] text-slate-400">
            {role ? ROLE_LABEL[role] : "-"}
          </p>
        </div>
      </div>
    </aside>
  );
}
