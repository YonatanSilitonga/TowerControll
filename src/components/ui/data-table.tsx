"use client";

import { useMemo, useRef, useState } from "react";
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
  /** Kontrol tambahan yang tampil SEJAJAR dengan search (mis. filter tanggal). */
  toolbar?: React.ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  pageSizes?: number[];
  defaultPageSize?: number;
  /** "fixed" = table-layout fixed (lebar kolom dihormati — cegah overflow), default "auto". */
  tableLayout?: "auto" | "fixed";
  /** Tampilkan kolom nomor urut (#) di kiri tabel. */
  showRowIndex?: boolean;
}

/** Tabel reusable: search + pagination + skeleton + empty state. Tahan banyak data. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder,
  searchFilter,
  toolbar,
  loading,
  skeletonRows = 5,
  onRowClick,
  emptyText = "Belum ada data",
  pageSizes = [10, 20, 50],
  defaultPageSize = 10,
  tableLayout = "auto",
  showRowIndex = false,
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Lebar kolom (drag header untuk resize).
  const [widths, setWidths] = useState<Record<number, number>>({});
  const resizing = useRef<{ idx: number; startX: number; startW: number } | null>(null);

  const startResize = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    resizing.current = { idx, startX: e.clientX, startW: widths[idx] ?? 0 };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = ev.clientX - resizing.current.startX;
      const w = Math.max(80, resizing.current.startW + delta);
      const i = resizing.current.idx;
      setWidths((prev) => ({ ...prev, [i]: w }));
    };
    const onUp = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

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
      {(searchFilter || toolbar) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {searchFilter && (
            <div className="relative max-w-sm flex-1 basis-56">
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
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Tabel — selalu overflow-x-auto agar bisa digeser di mobile */}
      <div className="overflow-x-auto border bg-card">
        <table
          className={cn(
            "w-full text-sm",
            tableLayout === "fixed" ? "table-fixed min-w-full" : "table-auto min-w-[640px]"
          )}
        >
          <thead>
            <tr className="border-b-2 border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
              {showRowIndex && (
                <th className="px-4 py-2.5 font-semibold select-none w-10">#</th>
              )}
              {columns.map((c, idx) => (
                <th
                  key={c.header}
                  className={cn("relative px-4 py-2.5 font-semibold select-none", c.className)}
                  style={{ width: widths[idx] ?? undefined }}
                >
                  {c.header}
                  <span
                    onMouseDown={(e) => startResize(e, idx)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-[#0c1e3a]/30"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {showRowIndex && (
                    <td className="px-4 py-3"><Skeleton className="h-4 w-6" /></td>
                  )}
                  {columns.map((c, j) => (
                    <td key={j} className={cn("px-4 py-3", c.className)}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={showRowIndex ? columns.length + 1 : columns.length} className="px-4 py-10 text-center text-slate-400">
                  {q ? "Tidak ada data yang cocok" : emptyText}
                </td>
              </tr>
            ) : (
              shown.map((row, rowIdx) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    onRowClick && "cursor-pointer transition-colors hover:bg-slate-50"
                  )}
                >
                  {showRowIndex && (
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 tabular-nums">
                      {start + rowIdx + 1}
                    </td>
                  )}
                  {columns.map((c, j) => (
                    <td key={j} className={cn("px-4 py-3", c.className)} style={{ width: widths[j] ?? undefined }}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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