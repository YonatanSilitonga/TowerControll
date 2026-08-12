"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/armada", label: "Overview" },
  { href: "/armada/vehicles", label: "Kendaraan" },
  { href: "/armada/drivers", label: "Driver" },
  { href: "/armada/sellers", label: "Seller" },
  { href: "/armada/trips", label: "Ritase" },
];

/** Navigasi sub-menu Armada (tabs). Dipakai di semua halaman armada. */
export function ArmadaTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {TABS.map((t) => {
        const active =
          t.href === "/armada" ? pathname === "/armada" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[#0c1e3a] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-[#0c1e3a]"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}