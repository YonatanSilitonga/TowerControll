"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  id: number;
  label: string;
  sub?: string;
  disabled?: boolean;
  hint?: string;
}

interface SearchSelectProps {
  value: number | null | undefined;
  onChange: (id: number) => void;
  options: SearchSelectOption[];
  placeholder?: string;
}

/** Dropdown lokasi dengan pencarian — dipakai di editor stop (create & edit ritase). */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const openDropdown = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setQ("");
    setOpen(true);
  };

  // Tutup dropdown kalau klik di luar.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const inside =
        (ref.current && ref.current.contains(t)) ||
        (dropdownRef.current && dropdownRef.current.contains(t));
      if (!inside) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Tutup dropdown saat scroll/resize supaya posisi tidak melenceng.
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      const t = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(t)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter((o) =>
        `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(ql),
      )
    : options;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={openDropdown}
        className="flex w-full items-center justify-between gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <span className="min-w-0">
          <span className="block truncate">
            {selected ? selected.label : placeholder}
          </span>
          {selected?.disabled && selected.hint && (
            <span className="block text-[10px] font-normal text-amber-600">
              {selected.hint}
            </span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 120,
            }}
            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="relative border-b border-slate-100 dark:border-slate-800">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari..."
                className="w-full bg-transparent py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
            </div>
            <ul className="max-h-44 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-slate-400">
                  Tidak ditemukan
                </li>
              ) : (
                filtered.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={o.disabled}
                      onClick={() => {
                        onChange(o.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                        o.disabled
                          ? "cursor-not-allowed opacity-60"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-700 dark:text-slate-200">
                          {o.label}
                        </span>
                        {o.disabled && o.hint && (
                          <span className="block text-[10px] text-amber-600">
                            {o.hint}
                          </span>
                        )}
                      </span>
                      {o.sub && !o.disabled && (
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {o.sub}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

