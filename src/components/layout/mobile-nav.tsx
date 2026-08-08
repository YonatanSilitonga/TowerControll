"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, RadioTower, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import { filterNav } from "@/components/layout/sidebar";

/** Navigasi mobile (hamburger drawer) — sidebar di HP. Hanya muncul < lg. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const nav = filterNav(role);

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
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#034075] text-slate-200 shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-[#101c2c]">
                  <RadioTower className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-white">Tower Control</p>
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
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
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
          </div>
        </div>
      )}
    </>
  );
}