"use client";

import { Info } from "lucide-react";

interface InfoTipProps {
  text: string;
  position?: "top" | "bottom";
  align?: "left" | "right";
}

/** Ikon info yang rapi — hover untuk lihat penjelasan.
 *  Tooltip muncul DI BAWAH ikon (default) atau ATAS.
 *  `align` = arah horizontal tooltip (default "left" = buka ke kanan). */
export function InfoTip({ text, position = "bottom", align = "left" }: InfoTipProps) {
  const posClasses =
    position === "top" ? "bottom-full mb-2" : "top-full mt-2";

  const alignClasses =
    align === "right" ? "right-0 left-auto" : "left-0 right-auto";

  return (
    <span className="group relative inline-flex items-center">
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors group-hover:bg-sky-100 group-hover:text-sky-700 group-hover:ring-sky-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600 dark:group-hover:bg-sky-900/50 dark:group-hover:text-sky-400 dark:group-hover:ring-sky-600">
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span
        className={`pointer-events-none absolute ${alignClasses} ${posClasses} z-50 hidden max-w-[220px] whitespace-normal rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:block group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}
      >
        {text}
      </span>
    </span>
  );
}
