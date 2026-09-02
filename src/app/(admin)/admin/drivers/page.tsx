"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Search, X, Loader2, Phone,
  UserCog, CheckCircle2, AlertTriangle, ChevronDown, Check,
  Eye, EyeOff, ArrowUpDown, Filter, UserPlus, ToggleLeft, ToggleRight, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { adminDriver, adminUser, DriverAdmin } from "@/lib/admin-api";

/* ─────────── TOAST ─────────── */
function Toast({ show, title, message, type, onClose }: {
  show: boolean; title: string; message?: string;
  type: "success" | "error" | "info"; onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl bg-[#0c1e3a] p-4 pr-5 text-white shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        type === "success" ? "bg-emerald-500/20 text-emerald-400" : type === "error" ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400"
      )}>
        {type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{title}</p>
        {message && <p className="mt-0.5 text-[11px] text-white/60">{message}</p>}
      </div>
      <button onClick={onClose} className="ml-2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────── CONFIRM MODAL ─────────── */
function ConfirmModal({ open, title, message, onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-rose-400" />
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={onCancel} className="px-4 text-xs font-semibold">Batal</Button>
            <Button size="sm" onClick={onConfirm} disabled={loading} className="bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700">
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Ya, Nonaktifkan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── MODAL ─────────── */
function Modal({ open, onClose, title, description, icon, size = "md", children, footer }: {
  open: boolean; onClose: () => void; title: string; description?: string;
  icon?: ReactNode; size?: "sm" | "md" | "lg"; children: ReactNode; footer: ReactNode;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className={cn("flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200 max-h-[90vh]", maxW)} onClick={(e) => e.stopPropagation()}>
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#0c1e3a] to-[#1a3a5c]" />
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0c1e3a]/8 text-[#0c1e3a] dark:bg-white/10 dark:text-white">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#0c1e3a] dark:text-white">{title}</h3>
              {description && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">{footer}</div>
      </div>
    </div>
  );
}

/* ─────────── SECTION DIVIDER ─────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pb-1 pt-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

/* ─────────── FIELD WRAPPER ─────────── */
function FieldWrapper({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-500">
          <AlertTriangle className="h-3 w-3 shrink-0" />{error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ─────────── CUSTOM SELECT ─────────── */
const STATUS_DOT: Record<string, string> = {
  aktif: "bg-emerald-500", nonaktif: "bg-slate-400",
};
const SIM_OPTIONS = [
  { value: "A",  label: "SIM A — Mobil Pribadi / Pickup" },
  { value: "B1", label: "SIM B1 — Truk Box & Engkel" },
  { value: "B2", label: "SIM B2 — Truk Tronton & Container" },
  { value: "C",  label: "SIM C — Motor Fleksibel" },
];
const STATUS_OPTIONS = [
  { value: "aktif",    label: "Aktif Bertugas" },
  { value: "nonaktif", label: "Nonaktif" },
];

function CustomSelect({ value, onChange, options, placeholder, hasError }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string; hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm text-slate-700 outline-none transition-all dark:bg-slate-800 dark:text-white",
          open ? "border-[#FEA103] ring-2 ring-[#FEA103]/20"
            : hasError ? "border-rose-400 bg-rose-50/50 dark:bg-rose-500/5"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
        )}
      >
        <span className={cn("flex items-center gap-2 truncate", !selected && "text-slate-400")}>
          {selected ? (
            <>
              {STATUS_DOT[selected.value] && <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[selected.value])} />}
              {selected.label}
            </>
          ) : (placeholder ?? "Pilih…")}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    value === opt.value
                      ? "bg-[#FEA103]/10 font-semibold text-[#E09102] dark:text-[#FEA103]"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                  )}
                >
                  {STATUS_DOT[opt.value] && <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[opt.value])} />}
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

/* ─────────── PASSWORD INPUT ─────────── */
function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Minimal 6 karakter"}
        className="h-10 rounded-lg pr-10 text-sm"
      />
      <button type="button" onClick={() => setShow((p) => !p)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" tabIndex={-1}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ─────────── INITIAL FORM STATE ─────────── */
const INIT_FORM = {
  nama_driver: "", no_hp: "", no_sim: "", jenis_sim: "B1", status_driver: "aktif",
};
const INIT_AKUN = { username: "", password: "" };

/* ─────────── PAGE ─────────── */
export default function AdminDriversPage() {
  const [data, setData]           = useState<DriverAdmin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey]     = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<DriverAdmin | null>(null);
  const [form, setFormState]        = useState({ ...INIT_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState(false);

  // Toggle "buat akun sekaligus"
  const [buatAkun, setBuatAkun]   = useState(false);
  const [akunForm, setAkunForm]   = useState({ ...INIT_AKUN });
  const [akunErrors, setAkunErrors] = useState<Record<string, string>>({});

  const [confirmState, setConfirmState] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [toast, setToast] = useState<{ show: boolean; title: string; message?: string; type: "success" | "error" | "info" }>({
    show: false, title: "", type: "success",
  });

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<DriverAdmin | null>(null);

  const showToast = (title: string, message?: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, title, message, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 5000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await adminDriver.list()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Filter + Sort ──
  let processed = data.filter((row) => {
    if (statusFilter !== "ALL" && row.status_driver !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [row.nama_driver, row.no_hp, row.jenis_sim].some((v) => String(v ?? "").toLowerCase().includes(q));
  });
  if (sortKey) {
    processed = [...processed].sort((a, b) => {
      const va = (a as any)[sortKey] ?? ""; const vb = (b as any)[sortKey] ?? "";
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }
  const handleSort = (key: string) => {
    if (sortKey === key) setSortOrder((p) => p === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortOrder("asc"); }
  };

  // ── Export Excel ──
  const handleExportExcel = () => {
    if (processed.length === 0) { showToast("Tidak ada data", "Tidak ada data untuk diekspor.", "error"); return; }
    const headers = ["ID", "Nama Driver", "No HP", "Jenis SIM", "Status"];
    const rows = processed.map((r) => [r.id_driver, r.nama_driver, r.no_hp ?? "-", r.jenis_sim ?? "-", r.status_driver ?? "-"]);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Driver</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1"><thead><tr>${headers.map((h) => `<th style="font-weight:bold;background:#0c1e3a;color:#fff;padding:6px 12px">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="padding:4px 10px">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Data_Driver_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("Export berhasil", `${processed.length} data driver berhasil diekspor.`);
  };

  // ── Open/Close ──
  const openCreate = () => {
    setEditing(null);
    setFormState({ ...INIT_FORM });
    setFormErrors({});
    setBuatAkun(false);
    setAkunForm({ ...INIT_AKUN });
    setAkunErrors({});
    setModalOpen(true);
  };
  const openEdit = (row: DriverAdmin) => {
    setEditing(row);
    setFormState({
      nama_driver: row.nama_driver,
      no_hp: row.no_hp ?? "",
      no_sim: row.no_sim ?? "",
      jenis_sim: row.jenis_sim ?? "B1",
      status_driver: row.status_driver,
    });
    setFormErrors({});
    setBuatAkun(false);
    setAkunForm({ ...INIT_AKUN });
    setAkunErrors({});
    setModalOpen(true);
  };

  // ── Validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nama_driver.trim()) errs.nama_driver = "Nama driver wajib diisi";
    if (!form.no_hp.trim()) errs.no_hp = "No HP wajib diisi";
    else if (!/^08\d{8,11}$/.test(form.no_hp.replace(/[- ]/g, ""))) errs.no_hp = "Nomor HP harus diawali '08' (10–13 digit)";
    if (!editing) {
      if (!form.no_sim.trim()) errs.no_sim = "No SIM wajib diisi";
      if (!form.jenis_sim) errs.jenis_sim = "Jenis SIM wajib dipilih";
    }
    if (!form.status_driver) errs.status_driver = "Status wajib dipilih";
    setFormErrors(errs);

    const akunErrs: Record<string, string> = {};
    if (!editing && buatAkun) {
      if (!akunForm.username.trim()) akunErrs.username = "Username wajib diisi";
      if (!akunForm.password) akunErrs.password = "Password wajib diisi";
      else if (akunForm.password.length < 6) akunErrs.password = "Password minimal 6 karakter";
    }
    setAkunErrors(akunErrs);

    return Object.keys(errs).length === 0 && Object.keys(akunErrs).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await adminDriver.update(editing.id_driver, form as Partial<DriverAdmin>);
        showToast("Driver Diperbarui", `Data ${form.nama_driver} berhasil disimpan.`);
      } else {
        // 1. Buat driver
        const res = await adminDriver.create(form as Partial<DriverAdmin>);
        const driverId = (res as any)?.id_driver;

        // 2. Kalau toggle aktif → buat akun user sekaligus
        if (buatAkun) {
          try {
            await adminUser.create({
              username: akunForm.username,
              password: akunForm.password,
              name: form.nama_driver,
              role: "driver",
              karyawan_id: driverId,
            });
            showToast(
              "Driver + Akun Berhasil Dibuat",
              `Driver "${form.nama_driver}" dan akun login "@${akunForm.username}" sudah aktif.`,
              "success"
            );
          } catch (akunErr: any) {
            // Driver sudah dibuat, akun gagal — informasikan tanpa rollback
            showToast(
              "Driver Dibuat, Akun Gagal",
              `Driver berhasil ditambahkan tapi akun login gagal: ${akunErr?.message ?? "Error tidak diketahui"}. Buat akun manual di halaman Users.`,
              "error"
            );
          }
        } else {
          showToast("Driver Berhasil Ditambahkan", `${form.nama_driver} sudah terdaftar.`);
        }
      }
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      showToast("Gagal Menyimpan", err?.message || "Terjadi kesalahan server", "error");
    }
    setSaving(false);
  };

  const executeDelete = async () => {
    if (!confirmState.id) return;
    setSaving(true);
    try {
      await adminDriver.delete(confirmState.id);
      showToast("Driver Dinonaktifkan", "Data berhasil dinonaktifkan.");
      setConfirmState({ open: false, id: null });
      await refresh();
    } catch (err: any) {
      showToast("Gagal", err?.message || "Gagal mengnonaktifkan data", "error");
    }
    setSaving(false);
  };

  const setField = (key: string, val: string) => {
    setFormState((p) => ({ ...p, [key]: val }));
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: "" }));
  };
  const setAkunField = (key: string, val: string) => {
    setAkunForm((p) => ({ ...p, [key]: val }));
    if (akunErrors[key]) setAkunErrors((p) => ({ ...p, [key]: "" }));
  };

  const totalErrors = Object.keys(formErrors).length + Object.keys(akunErrors).length;
  const modalDesc = editing
    ? `Perbarui data pengemudi`
    : buatAkun
    ? `Isi form berikut · Driver + akun login akan dibuat sekaligus`
    : `Isi form berikut · 4 field wajib diisi`;

  return (
    <>
      <PageHeader
        title={`Driver (${data.length})`}
        description="Kelola master data pengemudi armada logistik"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel} className="border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
              Ekspor Excel
            </Button>
            <Button onClick={openCreate} className="bg-[#FEA103] text-xs font-semibold text-white shadow-sm hover:bg-[#E09102]">
              <Plus className="mr-1.5 h-4 w-4 text-white" />
              Tambah Driver
            </Button>
          </div>
        }
      />

      {/* ── Control Bar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari driver..." className="pl-9" />
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <Filter className="ml-1 h-3.5 w-3.5 text-slate-400" />
          {[{ value: "ALL", label: "Semua" }, { value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }].map((opt) => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                statusFilter === opt.value ? "bg-[#FEA103] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none dark:border-slate-800">
                <th className="w-10 px-4 py-2.5 text-center">#</th>
                {[
                  { key: "id_driver", label: "ID", cls: "w-16" },
                  { key: "nama_driver", label: "Nama Driver" },
                  { key: "no_hp", label: "No HP / Telepon" },
                  { key: "status_driver", label: "Status" },
                ].map((col) => (
                  <th key={col.key} className={cn("px-4 py-2.5 font-semibold select-none", col.cls)}>
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white">
                      {col.label}<ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </button>
                  </th>
                ))}
                <th className="w-24 px-4 py-2.5 text-right font-semibold select-none">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-400">Memuat data...</p>
                </td></tr>
              ) : processed.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-500">Belum ada data driver</p>
                  <p className="mt-1 text-xs text-slate-400">Atur filter pencarian atau tambahkan data baru.</p>
                </td></tr>
              ) : (
                processed.map((row, i) => (
                  <tr key={row.id_driver} className="border-b border-slate-100 text-sm transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">#{row.id_driver}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{row.nama_driver}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-mono text-xs">{row.no_hp || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status_driver === "aktif" ? "aktif" : "off"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setDetailRow(row); setDetailOpen(true); }}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmState({ open: true, id: row.id_driver })} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" title="Nonaktifkan">
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
          Menampilkan <span className="font-semibold text-slate-800 dark:text-white">{processed.length}</span> dari{" "}
          <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> total driver
        </div>
      </div>

      {/* ── Form Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Driver" : "Tambah Driver"}
        description={modalDesc}
        icon={<UserCog className="h-5 w-5" />}
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3">
            {totalErrors > 0 && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-rose-500">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {totalErrors} field belum terisi dengan benar
              </p>
            )}
            <div className="ml-auto flex items-center gap-2.5">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="px-4 text-xs font-semibold">Batal</Button>
              <Button onClick={handleSave} disabled={saving}
                className="min-w-[130px] bg-[#FEA103] px-5 text-xs font-semibold text-white hover:bg-[#E09102] disabled:opacity-70">
                {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Menyimpan…</>
                  : editing ? "Simpan Perubahan"
                  : buatAkun ? "Tambah Driver + Akun"
                  : "Tambah Driver"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ── Identitas Driver ── */}
          <div className="sm:col-span-2"><SectionDivider label="Identitas Driver" /></div>

          <FieldWrapper label="Nama Driver" required error={formErrors.nama_driver} hint="Tampil di dashboard & aplikasi mobile">
            <Input value={form.nama_driver} onChange={(e) => setField("nama_driver", e.target.value)}
              placeholder="Nama lengkap pengemudi"
              className={cn("h-10 rounded-lg text-sm", formErrors.nama_driver && "border-rose-400 bg-rose-50/50 dark:bg-rose-500/5")} />
          </FieldWrapper>

          <FieldWrapper label="No HP" required error={formErrors.no_hp} hint="Untuk verifikasi reset password di aplikasi">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={form.no_hp} onChange={(e) => setField("no_hp", e.target.value)}
                placeholder="081234567890"
                className={cn("h-10 rounded-lg pl-9 font-mono text-sm", formErrors.no_hp && "border-rose-400 bg-rose-50/50 dark:bg-rose-500/5")} />
            </div>
          </FieldWrapper>

          {/* ── Lisensi (create only) ── */}
          {!editing && (
            <>
              <div className="sm:col-span-2"><SectionDivider label="Lisensi (hanya saat tambah baru)" /></div>
              <FieldWrapper label="No SIM" required error={formErrors.no_sim} hint="Nomor SIM resmi yang diterbitkan Satlantas">
                <Input value={form.no_sim} onChange={(e) => setField("no_sim", e.target.value)}
                  placeholder="Nomor Lisensi SIM"
                  className={cn("h-10 rounded-lg text-sm", formErrors.no_sim && "border-rose-400 bg-rose-50/50 dark:bg-rose-500/5")} />
              </FieldWrapper>
              <FieldWrapper label="Jenis SIM" required error={formErrors.jenis_sim} hint="Pastikan sesuai kelas kendaraan yang dikemudikan">
                <CustomSelect value={form.jenis_sim} onChange={(v) => setField("jenis_sim", v)} options={SIM_OPTIONS} hasError={!!formErrors.jenis_sim} />
              </FieldWrapper>
            </>
          )}

          {/* ── Status ── */}
          <div className="sm:col-span-2"><SectionDivider label="Status Operasional" /></div>
          <FieldWrapper label="Status Driver" required error={formErrors.status_driver}>
            <CustomSelect value={form.status_driver} onChange={(v) => setField("status_driver", v)} options={STATUS_OPTIONS} hasError={!!formErrors.status_driver} />
          </FieldWrapper>

          {/* ── Toggle: Buat Akun Login Sekaligus (create only) ── */}
          {!editing && (
            <div className="sm:col-span-2">
              <SectionDivider label="Akun Login Aplikasi (opsional)" />

              {/* Toggle button */}
              <button
                type="button"
                onClick={() => { setBuatAkun((p) => !p); setAkunErrors({}); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all",
                  buatAkun
                    ? "border-[#FEA103]/50 bg-amber-50/60 dark:border-[#FEA103]/30 dark:bg-amber-500/5"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    buatAkun ? "bg-[#FEA103]/15 text-[#E09102]" : "bg-slate-200/80 text-slate-500 dark:bg-slate-700"
                  )}>
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className={cn("text-xs font-semibold", buatAkun ? "text-[#E09102] dark:text-[#FEA103]" : "text-slate-700 dark:text-slate-300")}>
                      Buat akun login sekaligus
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {buatAkun ? "Driver bisa langsung login ke aplikasi mobile" : "Aktifkan untuk buat username & password dalam satu langkah"}
                    </p>
                  </div>
                </div>
                {buatAkun
                  ? <ToggleRight className="h-6 w-6 shrink-0 text-[#FEA103]" />
                  : <ToggleLeft className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-600" />}
              </button>

              {/* Akun fields — collapse/expand dengan animasi */}
              {buatAkun && (
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-[#FEA103]/20 bg-amber-50/40 p-4 dark:border-[#FEA103]/10 dark:bg-amber-500/5 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <FieldWrapper label="Username" required error={akunErrors.username} hint="Digunakan driver untuk login ke aplikasi MUSTGO">
                    <Input
                      value={akunForm.username}
                      onChange={(e) => setAkunField("username", e.target.value)}
                      placeholder="Buat username unik"
                      className={cn("h-10 rounded-lg text-sm", akunErrors.username && "border-rose-400 bg-rose-50/50 dark:bg-rose-500/5")}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Password" required error={akunErrors.password} hint="Minimal 6 karakter">
                    <PasswordInput
                      value={akunForm.password}
                      onChange={(v) => setAkunField("password", v)}
                      placeholder="Minimal 6 karakter"
                    />
                  </FieldWrapper>
                  {/* Info: role otomatis driver */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Role akun akan otomatis diset sebagai <span className="font-bold mx-1">Driver</span> — sesuai akses aplikasi mobile.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Confirm Delete ── */}
      <ConfirmModal
        open={confirmState.open}
        title="Nonaktifkan Driver?"
        message="Data driver akan dinonaktifkan dan tidak lagi tampil di operasional aktif. Tindakan ini dapat diaktifkan kembali oleh admin."
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
        loading={saving}
      />

      {/* ── Detail Modal ── */}
      {detailRow && (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Detail Driver"
          description="Informasi lengkap driver"
          icon={<Eye className="h-5 w-5" />}
          footer={
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setDetailOpen(false)} className="px-4 text-xs font-semibold">
                Tutup
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {[
              { label: "ID Driver", value: `#${detailRow.id_driver}` },
              { label: "Nama Driver", value: detailRow.nama_driver },
              { label: "No HP", value: detailRow.no_hp || "—" },
              { label: "No SIM", value: detailRow.no_sim || "—" },
              { label: "Jenis SIM", value: detailRow.jenis_sim || "—" },
              {
                label: "Status",
                value: (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    detailRow.status_driver === "aktif" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", detailRow.status_driver === "aktif" ? "bg-emerald-500" : "bg-slate-400")} />
                    {detailRow.status_driver === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="w-32 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="text-sm text-slate-800 dark:text-white">{item.value}</span>
              </div>
            ))}
            {/* Audit fields */}
            {detailRow.created_at && (
              <>
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <div className="flex items-start gap-3">
                  <span className="w-32 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Dibuat</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {new Date(detailRow.created_at).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    {detailRow.created_by && ` oleh #${detailRow.created_by}`}
                  </span>
                </div>
                {detailRow.updated_at && (
                  <div className="flex items-start gap-3">
                    <span className="w-32 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Diubah</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {new Date(detailRow.updated_at).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      {detailRow.updated_by && ` oleh #${detailRow.updated_by}`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Toast ── */}
      <Toast
        show={toast.show}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, show: false }))}
      />
    </>
  );
}
