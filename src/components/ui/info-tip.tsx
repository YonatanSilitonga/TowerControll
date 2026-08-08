"use client";

import { Info } from "lucide-react";

/** Ikon info yang rapi — hover untuk lihat penjelasan judul/card.
 *  Tooltip muncul DI BAWAH ikon (bukan atas) biar gak ke-potong card di atasnya. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors group-hover:bg-sky-100 group-hover:text-sky-700 group-hover:ring-sky-200">
        <Info className="h-3 w-3" strokeWidth={2.5} />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden w-60 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-normal leading-snug text-slate-600 shadow-xl group-hover:block">
        <span className="absolute -top-[3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white" />
        {text}
      </span>
    </span>
  );
}