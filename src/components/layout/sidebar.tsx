"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  RadioTower,
  Truck,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_MENU, ROLE_LABEL } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, key: "dashboard" },
  { label: "Armada", href: "/armada", icon: Truck, key: "armada" },
  { label: "Live Map", href: "/armada/live-map", icon: MapPin, key: "live-map" },
  { label: "Gudang", href: "/gudang", icon: Warehouse, key: "gudang" },
  { label: "Absensi", href: "/absensi", icon: ClipboardCheck, key: "absensi" },
  { label: "Laporan", href: "/laporan", icon: BarChart3, key: "laporan" },
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);

  const allowed = role ? ROLE_MENU[role] : [];
  const nav = NAV.filter((item) => allowed.includes(item.key));

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#034075] text-slate-200 lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-[#101c2c]">
          <RadioTower className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Tower Control</p>
          <p className="text-[11px] text-slate-400">Logistics Management</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-400 text-[#101c2c]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-[#101c2c]">
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
