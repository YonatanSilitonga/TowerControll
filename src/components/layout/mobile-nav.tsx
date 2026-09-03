"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import { filterNav, ADMIN_NAV } from "@/components/layout/sidebar";

/** Navigasi mobile (hamburger drawer) — sidebar di HP. Hanya muncul < lg. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    analitik: true,
  });
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const isAdminRoute = pathname.startsWith("/admin");
  const nav = isAdminRoute ? ADMIN_NAV : filterNav(role);

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#0c1e3a] text-slate-300 shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-icon.png"
                  alt="Tower Control"
                  width={34}
                  height={34}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <p className="text-sm font-bold text-white">Tower Control</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-slate-300 hover:bg-white/10"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                          "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          isAnyChildActive && !isDropdownOpen
                            ? "bg-white/15 text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" />
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
                        <div className="ml-4 space-y-0.5 border-l border-white/15 pl-3 pt-1">
                          {item.children!.map((child) => {
                            const isChildExact = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                                  isChildExact
                                    ? "bg-white text-[#0c1e3a] font-semibold"
                                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    isChildExact ? "bg-amber-400" : "bg-slate-500"
                                  )}
                                />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active =
                  item.href === "/" || item.href === "/analitik"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-white text-[#0c1e3a] font-semibold"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </Link>
                );
              })}
            </nav>

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
          </div>
        </div>
      )}
    </>
  );
}