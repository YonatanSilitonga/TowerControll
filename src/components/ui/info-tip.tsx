"use client";

import { Info } from "lucide-react";

interface InfoTipProps {
  text: string;
  position?: "top" | "bottom";
}

/** Ikon info yang rapi — hover untuk lihat penjelasan.
 *  Tooltip muncul DI BAWAH ikon (default) atau ATAS. */
export function InfoTip({ text, position = "bottom" }: InfoTipProps) {
  const posClasses =
    position === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span className="group relative inline-flex items-center">
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors group-hover:bg-sky-100 group-hover:text-sky-700 group-hover:ring-sky-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600 dark:group-hover:bg-sky-900/50 dark:group-hover:text-sky-400 dark:group-hover:ring-sky-600">
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 ${posClasses} z-50 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-normal leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:block group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}
      >
        {text}
      </span>
    </span>
  );
}
