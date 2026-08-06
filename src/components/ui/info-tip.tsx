"use client";

import { Info } from "lucide-react";

/** Ikon info kecil — hover untuk lihat penjelasan card. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <Info className="h-3.5 w-3.5 cursor-help text-slate-400 hover:text-slate-600" />
      <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 hidden w-56 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-normal leading-snug text-slate-600 shadow-md group-hover:block">
        {text}
      </span>
    </span>
  );
}