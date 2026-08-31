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
    // Mobile: scroll horizontal dengan snap, Desktop: flex wrap seperti biasa
    <div className="mb-4 -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-x-visible md:px-0">
      <div className="inline-flex min-w-fit gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 md:flex md:min-w-0 md:flex-wrap">
        {TABS.map((t) => {
          const active =
            t.href === "/armada" ? pathname === "/armada" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                // Mobile: touch target 44px min, Desktop: normal size
                "min-h-[44px] md:min-h-0 md:py-1.5",
                active
                  ? "bg-[#FEA103] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-[#FEA103]"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}