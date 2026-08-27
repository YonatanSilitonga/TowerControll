"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPickerModal } from "./map-picker-modal";
import { PageHeader } from "@/components/layout/page-header";

/* ─────────── TOAST NOTIFICATION ─────────── */
type ToastState = { show: boolean; title: string; message?: string; type: "success" | "error" | "info" };

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast.show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#0c1e3a] p-4 pr-5 text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
        {toast.type === "success" ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-[11px] text-white/60">{toast.message}</p>}
      </div>
      <button onClick={onClose} className="ml-2 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
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
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 mb-3">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">
            Batal
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={loading} className="bg-amber-600 text-xs text-white hover:bg-amber-700">
            {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Konfirmasi
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── STANDARD MODAL ─────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-[#0c1e3a] dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
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
  type?: "text" | "select" | "number" | "textarea" | "time" | "date" | "coordinate";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  colSpan?: number;
  createOnly?: boolean;
  validationRegex?: RegExp;
  validationErrorMsg?: string;
};

/* ─────────── MAIN CRUD COMPONENT (Identical to Armada DataTable) ─────────── */
export function AdminCrudPage<T extends Record<string, any>>({
  title,
  subtitle,
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

  // Custom Toast & Confirm Modal
  const [toast, setToast] = useState<ToastState>({ show: false, title: "", type: "success" });
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: number | null; title: string; message: string }>({
    open: false,
    id: null,
    title: "",
    message: "",
  });

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

  // Filtering & Sorting
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

  const openEdit = (row: T) => {
    setEditing(row);
    setForm({ ...row });
    setFormErrors({});
    setModalOpen(true);
  };

  // Pre-submit Validation Engine
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    for (const f of fields) {
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

      // Plate number auto uppercase validation
      if (f.key.includes("plat")) {
        if (val && !/^[A-Za-z]{1,2}\s?\d{1,4}\s?[A-Za-z]{1,3}$/.test(String(val))) {
          errors[f.key] = "Format plat nomor tidak valid (cth: B 1234 SLB)";
        }
      }

      // Phone number validation
      if (f.key.includes("hp") || f.key.includes("telepon")) {
        if (val && !/^08\d{8,11}$/.test(String(val).replace(/[- ]/g, ""))) {
          errors[f.key] = "Nomor HP harus diawali '08' (10-13 digit)";
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
        showToast("Berhasil Disimpan", `Data ${title.toLowerCase()} telah diperbarui.`);
      } else {
        await createFn(form);
        showToast("Berhasil Ditambahkan", `Data ${title.toLowerCase()} baru berhasil dibuat.`);
      }
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      showToast("Gagal Menyimpan", err?.message || "Terjadi kesalahan server", "error");
    }
    setSaving(false);
  };

  const confirmDelete = (id: number) => {
    setConfirmState({
      open: true,
      id,
      title: `Nonaktifkan ${title}?`,
      message: `Apakah Anda yakin ingin mengnonaktifkan data ini?`,
    });
  };

  const executeDelete = async () => {
    if (!confirmState.id) return;
    setSaving(true);
    try {
      await deleteFn(confirmState.id);
      showToast("Data Dinonaktifkan", `Data berhasil dinonaktifkan.`);
      setConfirmState({ open: false, id: null, title: "", message: "" });
      await refresh();
    } catch (err: any) {
      showToast("Gagal", err?.message || "Gagal mengnonaktifkan data", "error");
    }
    setSaving(false);
  };

  // Native Excel (.xls) Export Handler
  const handleExportExcel = () => {
    if (processedData.length === 0) {
      showToast("Ekspor Dibatalkan", "Tidak ada data untuk diekspor", "info");
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
      <html xmlns:o="urn:schemas-microsoft-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Data ${title}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; }
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
    showToast("Ekspor Excel Berhasil", `File Data_${title}.xls telah diunduh.`);
  };

  const setField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <div>
      {/* Header Bar */}
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
            <Button onClick={openCreate} className="bg-[#FEA103] text-xs font-semibold text-white shadow-sm hover:bg-[#E09102]">
              <Plus className="mr-1.5 h-4 w-4 text-white" />
              Tambah {title}
            </Button>
          </>
        }
      />

      {/* Control Bar: Search & Filter Chips */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari ${title.toLowerCase()}...`}
            className="pl-9"
          />
        </div>

        {/* Filter Chips */}
        {statusFilterOptions && (
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <Filter className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
            <button
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
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
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
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

      {/* Table Container */}
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
                    <p className="mt-1 text-xs text-slate-400">Silakan atur filter pencarian atau tambahkan data baru.</p>
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
          Menampilkan <span className="font-semibold text-slate-800 dark:text-white">{processedData.length}</span> dari{" "}
          <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> total item
        </div>
      </div>

      {/* Dynamic Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : `Tambah ${title}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields
            .filter((f) => !f.createOnly || !editing)
            .map((f) => (
              <div key={f.key} className={cn(f.colSpan === 2 ? "sm:col-span-2" : "col-span-1")}>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>

                {f.type === "select" ? (
                  <select
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Pilih {f.label}…</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    rows={3}
                    placeholder={f.placeholder}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                ) : f.type === "coordinate" ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      value={form[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value === "" ? null : Number(e.target.value))}
                      placeholder={f.placeholder || "Koordinat"}
                      className="text-xs font-mono"
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
                ) : (
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
                    className="text-xs"
                  />
                )}

                {formErrors[f.key] && <p className="mt-1 text-[11px] font-medium text-rose-500">{formErrors[f.key]}</p>}
              </div>
            ))}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => setModalOpen(false)} className="text-xs">
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#FEA103] text-xs font-semibold text-white hover:bg-[#E09102]">
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {editing ? "Simpan Perubahan" : "Tambah Data"}
          </Button>
        </div>
      </Modal>

      {/* Map Picker Modal */}
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
          showToast("Koordinat Diperbarui", `Lat: ${selectedLat}, Lng: ${selectedLng}`);
        }}
      />

      {/* Custom Confirm Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ open: false, id: null, title: "", message: "" })}
        loading={saving}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast((prev) => ({ ...prev, show: false }))} />
    </div>
  );
}
