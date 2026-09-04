"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { swal } from "@/lib/swal";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  FileSpreadsheet,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Phone,
  ChevronDown,
  Check,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPickerModal } from "./map-picker-modal";
import { PageHeader } from "@/components/layout/page-header";

// Dynamic mini map for coordinate preview
const MiniMapPreview = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-32 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">
      Memuat peta…
    </div>
  ),
});

/* ─────────── TOAST NOTIFICATION ─────────── */
type ToastState = { show: boolean; title: string; message?: string; type: "success" | "error" | "info" };

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast.show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl bg-[#0c1e3a] p-4 pr-5 text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}
      >
        {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-[11px] text-white/60">{toast.message}</p>}
      </div>
      <button
        onClick={onClose}
        className="ml-2 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────── CONFIRM MODAL ─────────── */
function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  confirmLabel = "Ya, Nonaktifkan",
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmLabel?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
          </div>
          {/* Text */}
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>
          </div>
          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-rose-600 font-semibold text-white hover:bg-rose-700"
            >
              {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── STATUS DOT COLORS ─────────── */
const STATUS_DOT: Record<string, string> = {
  aktif: "bg-emerald-500",
  nonaktif: "bg-slate-400",
  maintenance: "bg-amber-500",
  available: "bg-emerald-500",
  off: "bg-slate-400",
};

/* ─────────── CUSTOM SELECT FIELD ─────────── */
function SelectField({
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && dropdownRef.current) {
      requestAnimationFrame(() => {
        dropdownRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm text-slate-700 outline-none transition-all",
          "dark:bg-slate-800 dark:text-white",
          open
            ? "border-[#FEA103] ring-2 ring-[#FEA103]/20"
            : hasError
            ? "border-rose-400 bg-rose-50/50 dark:bg-rose-500/5"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
        )}
      >
        <span className={cn("flex items-center gap-2 truncate", !selected && "text-slate-400 text-sm")}>
          {selected ? (
            <>
              {STATUS_DOT[selected.value] && (
                <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[selected.value])} />
              )}
              {selected.label}
            </>
          ) : (
            placeholder ?? "Pilih…"
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div ref={dropdownRef} className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    value === opt.value
                      ? "bg-[#FEA103]/10 text-[#E09102] font-semibold dark:bg-[#FEA103]/10 dark:text-[#FEA103]"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                  )}
                >
                  {STATUS_DOT[opt.value] && (
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[opt.value])} />
                  )}
                  <span className="flex-1 text-left">{opt.label}</span>
                  {value === opt.value && <Check className="h-3.5 w-3.5 shrink-0 text-[#FEA103]" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────── STANDARD MODAL ─────────── */
function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const maxW = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 animate-in duration-200",
          "rounded-t-2xl sm:rounded-xl sm:border sm:border-slate-200 sm:dark:border-slate-800",
          "slide-in-from-bottom-4 sm:zoom-in-95",
          maxW,
          "max-h-[92vh] sm:max-h-[90vh]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#0c1e3a] to-[#1a3a5c]" />

        {/* Drag handle (mobile) */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0c1e3a] text-white dark:bg-white/10">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              {description && (
                <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ─────────── SECTION DIVIDER ─────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="col-span-full -mx-6 border-y border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

/* ─────────── FIELD WRAPPER ─────────── */
function FieldWrapper({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ─────────── TYPES ─────────── */
export type Column<T> = {
  header: string;
  accessorKey?: keyof T;
  className?: string;
  render: (row: T) => ReactNode;
};

export type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "select" | "number" | "textarea" | "time" | "date" | "coordinate" | "coordinates" | "section-divider";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  /** Suffix unit shown inside number input (e.g. "kg", "koli/hari") */
  unit?: string;
  colSpan?: number;
  createOnly?: boolean;
  validationRegex?: RegExp;
  validationErrorMsg?: string;
  /** For type="coordinates": keys for lat/lng in form state */
  latKey?: string;
  lngKey?: string;
};

/* ─────────── INPUT CLASS HELPERS ─────────── */
const inputBase =
  "h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-700 outline-none transition-all dark:bg-slate-800 dark:text-white";
const inputNormal =
  "border-slate-200 hover:border-slate-300 focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-[#FEA103]";
const inputError =
  "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:bg-rose-500/5 dark:border-rose-500";

/* ─────────── MAIN CRUD COMPONENT ─────────── */
export function AdminCrudPage<T extends Record<string, any>>({
  title,
  subtitle,
  modalIcon,
  modalSize = "md",
  columns,
  fields,
  emptyText,
  idKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  initialForm,
  statusFilterOptions,
  statusFilterKey = "status",
}: {
  title: string;
  subtitle?: string;
  /** Icon ReactNode shown in the modal header */
  modalIcon?: ReactNode;
  /** Modal width: "sm" | "md" (default) | "lg" */
  modalSize?: "sm" | "md" | "lg";
  columns: Column<T>[];
  fields: FieldConfig[];
  emptyText?: string;
  idKey: string;
  listFn: () => Promise<T[]>;
  createFn: (data: any) => Promise<any>;
  updateFn: (id: number, data: any) => Promise<any>;
  deleteFn: (id: number) => Promise<any>;
  initialForm: Record<string, any>;
  statusFilterOptions?: { label: string; value: string }[];
  statusFilterKey?: string;
}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any>>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Map Picker State
  const [mapOpen, setMapOpen] = useState(false);
  const [activeLatKey, setActiveLatKey] = useState<string>("latitude");
  const [activeLngKey, setActiveLngKey] = useState<string>("longitude");

  // Confirm state for delete
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  // Toast & Confirm Modal
  const [toast, setToast] = useState<ToastState>({ show: false, title: "", type: "success" });
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    id: number | null;
    title: string;
    message: string;
  }>({ open: false, id: null, title: "", message: "" });

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<T | null>(null);

  const showToast = (title: string, message?: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, title, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listFn());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [listFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Filtering & Sorting ──
  let processedData = data.filter((row) => {
    if (statusFilter !== "ALL") {
      const val = row[statusFilterKey] ?? row["status_driver"] ?? row["status_kendaraan"] ?? row["status"];
      if (String(val).toLowerCase() !== statusFilter.toLowerCase()) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  if (sortKey) {
    processedData = [...processedData].sort((a, b) => {
      const valA = a[sortKey] ?? "";
      const valB = b[sortKey] ?? "";
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openDetail = (row: T) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setForm({ ...row });
    setFormErrors({});
    setModalOpen(true);
  };

  // ── Validation ──
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "section-divider") continue;
      if (f.createOnly && editing) continue;
      const val = form[f.key];

      if (f.required && (val === undefined || val === null || String(val).trim() === "")) {
        errors[f.key] = `${f.label} wajib diisi`;
        continue;
      }

      if (f.validationRegex && val) {
        if (!f.validationRegex.test(String(val))) {
          errors[f.key] = f.validationErrorMsg || `Format ${f.label} tidak valid`;
        }
      }

      if (f.key.includes("plat")) {
        if (val && !/^[A-Za-z]{1,2}\s?\d{1,4}\s?[A-Za-z]{1,3}$/.test(String(val))) {
          errors[f.key] = "Format plat nomor tidak valid (cth: B 1234 SLB)";
        }
      }

      if (f.key.includes("hp") || f.key.includes("telepon")) {
        if (val && !/^08\d{8,11}$/.test(String(val).replace(/[- ]/g, ""))) {
          errors[f.key] = "Nomor HP harus diawali '08' (10–13 digit)";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateFn(Number(editing[idKey]), form);
        swal.success("Berhasil Disimpan", `Data ${title.toLowerCase()} telah diperbarui.`);
      } else {
        await createFn(form);
        swal.success("Berhasil Ditambahkan", `Data ${title.toLowerCase()} baru berhasil dibuat.`);
      }
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      swal.error("Gagal Menyimpan", err?.message || "Terjadi kesalahan server");
    }
    setSaving(false);
  };

  const confirmDelete = async (id: number) => {
    const confirmed = await swal.confirm(
      `Nonaktifkan ${title}?`,
      "Data ini akan dinonaktifkan dan tidak lagi tampil di operasional aktif. Tindakan ini dapat diaktifkan kembali oleh admin.",
      "Ya, Nonaktifkan",
    );
    if (!confirmed) return;
    setDeleteTargetId(id);
    setSaving(true);
    try {
      await deleteFn(id);
      swal.success("Data Dinonaktifkan", "Data berhasil dinonaktifkan.");
      await refresh();
    } catch (err: any) {
      swal.error("Gagal", err?.message || "Gagal mengnonaktifkan data");
    }
    setSaving(false);
    setDeleteTargetId(null);
  };

  // ── Excel Export ──
  const handleExportExcel = () => {
    if (processedData.length === 0) {
      swal.info("Ekspor Dibatalkan", "Tidak ada data untuk diekspor");
      return;
    }

    const headersHTML = `<th>#</th>` + columns.map((c) => `<th>${c.header}</th>`).join("");
    const rowsHTML = processedData
      .map((row, idx) => {
        const cells = columns
          .map((c) => {
            const val = c.accessorKey ? row[c.accessorKey] : "";
            return `<td>${String(val ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
          })
          .join("");
        return `<tr><td>${idx + 1}</td>${cells}</tr>`;
      })
      .join("");

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #0c1e3a; color: #ffffff; font-weight: bold; padding: 8px 12px; border: 1px solid #0c1e3a; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h2>Data ${title} — Tower Control System</h2>
        <p>Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")}</p>
        <table>
          <thead><tr>${headersHTML}</tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Data_${title}_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    swal.success("Ekspor Excel Berhasil", `File Data_${title}.xls telah diunduh.`);
  };

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // ── Required field count (for modal subtitle) ──
  const requiredCount = fields.filter((f) => f.required && f.type !== "section-divider" && (!f.createOnly || !editing)).length;

  // ── Format date for detail modal ──
  const formatDate = (val?: string | null) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleString("id-ID", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
      });
    } catch { return val; }
  };

  // ── Modal description ──
  const modalDescription = editing
    ? `Perbarui data ${title.toLowerCase()} yang sudah ada`
    : `Isi form berikut · ${requiredCount} field wajib diisi`;

  return (
    <div>
      {/* ── Header Bar ── */}
      <PageHeader
        title={`${title} (${data.length})`}
        description={subtitle}
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Ekspor Excel
            </Button>
            <Button
              onClick={openCreate}
              className="bg-[#FEA103] text-xs font-semibold text-white shadow-sm hover:bg-[#E09102]"
            >
              <Plus className="mr-1.5 h-4 w-4 text-white" />
              Tambah {title}
            </Button>
          </>
        }
      />

      {/* ── Control Bar ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari ${title.toLowerCase()}...`}
            className="min-h-[44px] pl-9 sm:min-h-[32px]"
          />
        </div>

        {statusFilterOptions && (
          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800 sm:flex-none">
            <Filter className="ml-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <button
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                statusFilter === "ALL"
                  ? "bg-[#FEA103] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              Semua
            </button>
            {statusFilterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  statusFilter === opt.value
                    ? "bg-[#FEA103] text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none dark:border-slate-800">
                <th className="w-10 px-4 py-2.5 text-center font-semibold select-none">#</th>
                {columns.map((col) => (
                  <th key={col.header} className={cn("px-4 py-2.5 font-semibold select-none", col.className)}>
                    {col.accessorKey ? (
                      <button
                        onClick={() => handleSort(String(col.accessorKey))}
                        className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white"
                      >
                        {col.header}
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
                <th className="w-24 px-4 py-2.5 text-right font-semibold select-none">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-400">Memuat data...</p>
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-500">{emptyText || "Tidak ada data"}</p>
                    <p className="mt-1 text-xs text-slate-400">Atur filter pencarian atau tambahkan data baru.</p>
                  </td>
                </tr>
              ) : (
                processedData.map((row, i) => (
                  <tr
                    key={String(row[idKey])}
                    className="border-b border-slate-100 text-sm transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 tabular-nums">{i + 1}</td>
                    {columns.map((col) => (
                      <td key={col.header} className={cn("px-4 py-3", col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetail(row)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(Number(row[idKey]))}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                          title="Nonaktifkan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
          Menampilkan{" "}
          <span className="font-semibold text-slate-800 dark:text-white">{processedData.length}</span> dari{" "}
          <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> total item
        </div>
      </div>

      {/* ── Dynamic Form Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title}` : `Tambah ${title}`}
        description={modalDescription}
        icon={modalIcon}
        size={modalSize}
        footer={
          <div className="space-y-3">
            {/* Error banner */}
            {Object.keys(formErrors).length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {Object.keys(formErrors).length} field belum terisi dengan benar — periksa kembali sebelum menyimpan
                </p>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 font-semibold"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan…
                  </>
                ) : editing ? (
                  "Simpan Perubahan"
                ) : (
                  `Tambah ${title}`
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {fields
            .filter((f) => !f.createOnly || !editing)
            .map((f) => {
              // ── Section divider ──
              if (f.type === "section-divider") {
                return <SectionDivider key={f.key} label={f.label} />;
              }

              const hasError = !!formErrors[f.key];
              const colClass = f.colSpan === 2 ? "sm:col-span-2" : "col-span-1";

              return (
                <div key={f.key} className={colClass}>
                  <FieldWrapper
                    label={f.label}
                    required={f.required}
                    hint={f.hint}
                    error={formErrors[f.key]}
                  >
                    {/* ── SELECT ── */}
                    {f.type === "select" ? (
                      <SelectField
                        value={form[f.key] ?? ""}
                        onChange={(v) => setField(f.key, v)}
                        options={f.options ?? []}
                        placeholder={`Pilih ${f.label}…`}
                        hasError={hasError}
                      />
                    ) : /* ── TEXTAREA ── */ f.type === "textarea" ? (
                      <textarea
                        value={form[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        rows={3}
                        placeholder={f.placeholder}
                        className={cn(
                          "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all",
                          "bg-white text-slate-700 dark:bg-slate-800 dark:text-white",
                          hasError
                            ? inputError
                            : "border-slate-200 hover:border-slate-300 focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-[#FEA103]"
                        )}
                      />
                    ) : /* ── SINGLE COORDINATE ── */ f.type === "coordinate" ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="any"
                          value={form[f.key] ?? ""}
                          onChange={(e) =>
                            setField(f.key, e.target.value === "" ? null : Number(e.target.value))
                          }
                          placeholder={f.placeholder || "Koordinat"}
                          className={cn("h-11 rounded-lg text-sm font-mono", hasError && inputError)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setActiveLatKey("latitude");
                            setActiveLngKey("longitude");
                            setMapOpen(true);
                          }}
                          className="shrink-0 text-xs font-semibold"
                        >
                          <MapPin className="mr-1 h-3.5 w-3.5 text-amber-500" />
                          Peta
                        </Button>
                      </div>
                    ) : /* ── COORDINATES (lat+lng) ── */ f.type === "coordinates" ? (
                      <div className="space-y-2.5">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Latitude
                            </label>
                            <Input
                              type="number"
                              step="any"
                              value={form[f.latKey || "latitude"] ?? ""}
                              onChange={(e) =>
                                setField(
                                  f.latKey || "latitude",
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                              placeholder="-6.2100"
                              className="h-11 rounded-lg text-sm font-mono"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              Longitude
                            </label>
                            <Input
                              type="number"
                              step="any"
                              value={form[f.lngKey || "longitude"] ?? ""}
                              onChange={(e) =>
                                setField(
                                  f.lngKey || "longitude",
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                              placeholder="106.5500"
                              className="h-11 rounded-lg text-sm font-mono"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setActiveLatKey(f.latKey || "latitude");
                              setActiveLngKey(f.lngKey || "longitude");
                              setMapOpen(true);
                            }}
                            className="mt-5 shrink-0 gap-1.5 text-xs font-semibold border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Peta
                          </Button>
                        </div>

                        {/* Mini map preview jika sudah ada koordinat */}
                        {form[f.latKey || "latitude"] && form[f.lngKey || "longitude"] ? (
                          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm dark:border-slate-700">
                            <MiniMapPreview
                              lat={form[f.latKey || "latitude"]}
                              lng={form[f.lngKey || "longitude"]}
                              onChange={(newLat, newLng) => {
                                setForm((prev) => ({
                                  ...prev,
                                  [f.latKey || "latitude"]: newLat,
                                  [f.lngKey || "longitude"]: newLng,
                                }));
                              }}
                            />
                          </div>
                        ) : (
                          /* Empty coordinate placeholder */
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLatKey(f.latKey || "latitude");
                              setActiveLngKey(f.lngKey || "longitude");
                              setMapOpen(true);
                            }}
                            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-slate-400 transition-colors hover:border-[#FEA103]/50 hover:bg-amber-50/50 hover:text-[#E09102] dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-[#FEA103]/40 dark:hover:bg-amber-500/5"
                          >
                            <MapPin className="h-8 w-8 opacity-40" />
                            <div className="text-center">
                              <p className="text-xs font-semibold">Belum ada koordinat</p>
                              <p className="text-[11px] opacity-70">Klik untuk pilih lokasi dari peta interaktif</p>
                            </div>
                          </button>
                        )}
                      </div>
                    ) : /* ── NUMBER WITH UNIT SUFFIX ── */ f.type === "number" && f.unit ? (
                      <div className="relative">
                        <Input
                          type="number"
                          value={form[f.key] ?? ""}
                          onChange={(e) =>
                            setField(f.key, e.target.value === "" ? null : Number(e.target.value))
                          }
                          placeholder={f.placeholder}
                          className={cn(
                            "h-11 rounded-lg pr-14 text-sm",
                            hasError ? inputError : ""
                          )}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          {f.unit}
                        </span>
                      </div>
                    ) : /* ── PHONE INPUT ── */ f.key.includes("no_hp") || f.key.includes("telepon") ? (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          value={form[f.key] ?? ""}
                          onChange={(e) => setField(f.key, e.target.value)}
                          placeholder={f.placeholder ?? "08xxxxxxxxxx"}
                          className={cn(
                            "h-11 rounded-lg pl-9 font-mono text-sm",
                            hasError ? inputError : ""
                          )}
                        />
                      </div>
                    ) : /* ── DEFAULT INPUT ── */ (
                      <Input
                        type={f.type ?? "text"}
                        value={form[f.key] ?? ""}
                        onChange={(e) =>
                          setField(
                            f.key,
                            f.type === "number"
                              ? e.target.value === ""
                                ? null
                                : Number(e.target.value)
                              : f.key.includes("plat")
                              ? e.target.value.toUpperCase()
                              : e.target.value
                          )
                        }
                        placeholder={f.placeholder}
                        className={cn(
                          "h-11 rounded-lg text-sm",
                          hasError ? inputError : ""
                        )}
                      />
                    )}
                  </FieldWrapper>
                </div>
              );
            })}
        </div>
      </Modal>

      {/* ── Detail Modal ── */}
      {detailRow && (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={`Detail ${title}`}
          description={`Informasi lengkap ${title.toLowerCase()}`}
          icon={<Eye className="h-5 w-5" />}
          size="md"
          footer={
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDetailOpen(false)}
                className="flex-1 font-semibold"
              >
                Tutup
              </Button>
              <Button
                onClick={() => {
                  setDetailOpen(false);
                  openEdit(detailRow);
                }}
                className="flex-1 bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Data
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Data rows dalam grid 2 kolom */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {columns.map((col) => (
                <div
                  key={col.header}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {col.header}
                  </p>
                  <div className="text-sm font-medium text-slate-800 dark:text-white">
                    {col.render(detailRow)}
                  </div>
                </div>
              ))}
            </div>

            {/* Audit fields */}
            {(detailRow as any).created_at && (
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Audit Log
                </p>
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-20 shrink-0 font-semibold text-slate-400">Dibuat</span>
                    <span>
                      {formatDate((detailRow as any).created_at)}
                      {(detailRow as any).created_by && (
                        <span className="ml-1 text-slate-400">oleh {(detailRow as any).created_by_name || ""}</span>
                      )}
                    </span>
                  </div>
                  {(detailRow as any).updated_at && (
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 font-semibold text-slate-400">Diubah</span>
                      <span>
                        {formatDate((detailRow as any).updated_at)}
                        {(detailRow as any).updated_by && (
                          <span className="ml-1 text-slate-400">oleh {(detailRow as any).updated_by_name || ""}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Map Picker Modal ── */}
      <MapPickerModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        initialLat={form[activeLatKey] ?? -6.21}
        initialLng={form[activeLngKey] ?? 106.845}
        onSelectLocation={(selectedLat, selectedLng) => {
          setForm((prev) => ({
            ...prev,
            [activeLatKey]: selectedLat,
            [activeLngKey]: selectedLng,
          }));
          swal.success("Koordinat Diperbarui", `Lat: ${selectedLat}, Lng: ${selectedLng}`);
        }}
      />
    </div>
  );
}
