import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Camera,
  Car,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  Store,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_MENU, ROLE_LABEL } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

export interface NavChild {
  label: string;
  href: string;
  key: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, key: "dashboard" },
  { label: "Armada", href: "/armada", icon: Truck, key: "armada" },
  { label: "Live Map", href: "/armada/live-map", icon: MapPin, key: "live-map" },
  { label: "Jadwal Ritase", href: "/jadwal", icon: Calendar, key: "jadwal" },
  { label: "Foto Manifest", href: "/manifest-foto", icon: Camera, key: "manifest-foto" },
  { label: "Analitik", href: "/analitik", icon: BarChart3, key: "analitik" },
  {
    label: "Efektivitas Armada",
    href: "/analitik/efektivitas-armada",
    icon: TrendingUp,
    key: "efektivitas-armada",
  },
  { label: "Gudang", href: "/gudang", icon: Warehouse, key: "gudang" },
  { label: "Absensi", href: "/absensi", icon: ClipboardCheck, key: "absensi" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, key: "admin-dashboard" },
  { label: "Driver", href: "/admin/drivers", icon: Users, key: "admin-drivers" },
  { label: "Kendaraan", href: "/admin/vehicles", icon: Car, key: "admin-vehicles" },
  { label: "Seller", href: "/admin/sellers", icon: Store, key: "admin-sellers" },
  { label: "Gateway", href: "/admin/drop-points", icon: MapPin, key: "admin-drop-points" },
  { label: "Users & Role", href: "/admin/users", icon: Users, key: "admin-users" },
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

  const isAdminRoute = pathname.startsWith("/admin");
  const nav = isAdminRoute ? ADMIN_NAV : filterNav(role);
  const navLabel = isAdminRoute ? "Admin" : "Menu Utama";

  // State untuk melacak dropdown yang terbuka
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    analitik: true,
  });

  useEffect(() => {
    // Auto buka dropdown jika URL aktif ada di dalam submenu
    nav.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
        );
        if (isChildActive) {
          setOpenDropdowns((prev) => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [pathname, nav]);

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="hidden w-60 shrink-0 bg-[#0c1e3a] lg:block">
    <aside className="sticky top-0 flex h-screen w-full flex-col border-r border-[#0c1e3a] text-slate-300">
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
          <p className="text-[10px] tracking-wider text-slate-400">
            Logistics Management
          </p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {navLabel}
        </p>
        {nav.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isDropdownOpen = !!openDropdowns[item.key];

          if (hasChildren) {
            const isAnyChildActive = item.children!.some(
              (c) => pathname === c.href || (c.href !== "/analitik" && pathname.startsWith(`${c.href}/`))
            );

            return (
              <div key={item.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleDropdown(item.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                    isAnyChildActive && !isDropdownOpen
                      ? "bg-white/15 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 text-slate-400",
                      isDropdownOpen && "rotate-180 text-white"
                    )}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="ml-4 space-y-0.5 border-l border-white/15 pl-2 pt-0.5">
                    {item.children!.map((child) => {
                      const isChildExact = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                            isChildExact
                              ? "bg-white text-[#0c1e3a] font-semibold shadow-sm"
                              : "text-slate-400 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              isChildExact ? "bg-amber-400" : "bg-slate-500"
                            )}
                          />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active =
            item.href === "/" || item.href === "/admin" || item.href === "/analitik"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-white text-[#0c1e3a] shadow-sm font-semibold"
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
    </div>
  );
}
