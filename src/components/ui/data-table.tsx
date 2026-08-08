"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, q: string) => boolean;
  loading?: boolean;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  pageSizes?: number[];
  defaultPageSize?: number;
}

/** Tabel reusable: search + pagination + skeleton + empty state. Tahan banyak data. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder,
  searchFilter,
  loading,
  skeletonRows = 5,
  onRowClick,
  emptyText = "Belum ada data",
  pageSizes = [10, 20, 50],
  defaultPageSize = 10,
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = useMemo(() => {
    if (!q.trim() || !searchFilter) return rows;
    return rows.filter((r) => searchFilter(r, q.trim()));
  }, [rows, q, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const shown = filtered.slice(start, start + pageSize);

  return (
    <div>
      {searchFilter && (
        <div className="mb-4 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder ?? "Cari..."}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Tabel normal (layar >= md) */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.header} className={cn("px-4 py-2.5 font-semibold", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {columns.map((c, j) => (
                    <td key={j} className={cn("px-4 py-3", c.className)}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {q ? "Tidak ada data yang cocok" : emptyText}
                </td>
              </tr>
            ) : (
              shown.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    onRowClick && "cursor-pointer transition-colors hover:bg-slate-50"
                  )}
                >
                  {columns.map((c, j) => (
                    <td key={j} className={cn("px-4 py-3", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Kartu bertumpuk (mobile < md) — pakai kolom yang sama otomatis */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: Math.min(3, skeletonRows) }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card py-8 text-center text-sm text-slate-400">
            {q ? "Tidak ada data yang cocok" : emptyText}
          </p>
        ) : (
          shown.map((row) => (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "rounded-xl border bg-card p-3",
                onRowClick && "cursor-pointer transition-colors hover:bg-slate-50"
              )}
            >
              {columns.map((c, j) => (
                <div
                  key={j}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0"
                >
                  <span className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {c.header}
                  </span>
                  <span className="min-w-0 text-right text-sm text-slate-800">{c.render(row)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              {start + 1}–{Math.min(start + pageSize, filtered.length)} dari {filtered.length}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}/hal
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 tabular-nums">
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}