"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

interface InfoTipProps {
  text: string;
  position?: "top" | "bottom";
  align?: "left" | "right";
}

/** Ikon info yang rapi — hover untuk lihat penjelasan.
 *  Tooltip di-portal ke <body> supaya gak pernah kepotong oleh parent manapun. */
export function InfoTip({ text, position = "bottom", align = "left" }: InfoTipProps) {
  const [hovered, setHovered] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = position === "top" ? rect.top + scrollY - 8 : rect.bottom + scrollY + 8;
    let left = align === "right" ? rect.right + scrollX : rect.left + scrollX;

    // Clamp: pastikan tooltip gak keluar layar kanan
    const estimatedWidth = Math.min(text.length * 7 + 24, 220);
    if (left + estimatedWidth > window.innerWidth - 16) {
      left = window.innerWidth - estimatedWidth - 16;
    }
    // Clamp kiri
    if (left < 16) left = 16;

    // Clamp: pastikan gak keluar layar bawah
    if (top + 60 > window.innerHeight + scrollY) {
      top = rect.top + scrollY - 60;
    }

    setPos({ top, left });
  }, [position, align, text]);

  useEffect(() => {
    if (hovered) calcPos();
  }, [hovered, calcPos]);

  // Recalc on scroll/resize saat tooltip aktif
  useEffect(() => {
    if (!hovered) return;
    const onMove = () => calcPos();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [hovered, calcPos]);

  const tooltip = hovered
    ? createPortal(
        <span
          className="pointer-events-none z-[9999] w-max max-w-[220px] whitespace-normal rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            transform: position === "top" ? "translateY(-100%)" : undefined,
          }}
        >
          {text}
        </span>,
        document.body
      )
    : null;

  return (
    <span
      ref={triggerRef}
      className="group inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors group-hover:bg-sky-100 group-hover:text-sky-700 group-hover:ring-sky-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600 dark:group-hover:bg-sky-900/50 dark:group-hover:text-sky-400 dark:group-hover:ring-sky-600">
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      {tooltip}
    </span>
  );
}
