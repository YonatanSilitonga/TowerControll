"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { swal } from "@/lib/swal";
import {
  Plus,
  Search,
  X,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Store,
  AlertTriangle,
  Check,
  ChevronDown,
  Filter,
  UserPlus,
  FileSpreadsheet,
  ArrowUpDown,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { adminKapten, adminImplant, KaptenAdmin, ImplantAdmin } from "@/lib/admin-api";
import { WhatsAppContact } from "@/components/armada/whatsapp-contact";

/* ─────────── MODAL (with scroll lock) ─────────── */
function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 animate-in duration-200 rounded-t-2xl sm:rounded-xl sm:border sm:border-slate-200 sm:dark:border-slate-800 slide-in-from-bottom-4 sm:zoom-in-95 max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#0c1e3a] to-[#1a3a5c]" />
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
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
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
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
    <div className="-mx-5 border-y border-slate-100 bg-slate-50/80 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
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

/* ─────────── STATUS SELECT ─────────── */
function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const opts = [
    { value: "aktif", label: "Aktif", dot: "bg-emerald-500" },
    { value: "nonaktif", label: "Nonaktif", dot: "bg-slate-400" },
  ];
  const selected = opts.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm text-slate-700 outline-none transition-all dark:bg-slate-800 dark:text-white",
          open ? "border-[#FEA103] ring-2 ring-[#FEA103]/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
        )}
      >
        <span className="flex items-center gap-2">
          {selected && <span className={cn("h-2 w-2 shrink-0 rounded-full", selected.dot)} />}
          <span>{selected?.label ?? "Pilih status…"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1">
              {opts.map((opt) => (
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
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", opt.dot)} />
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

/* ─────────── IMPLANT MULTI-SELECT ─────────── */
function ImplantMultiSelect({
  implants,
  selected,
  onChange,
}: {
  implants: ImplantAdmin[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  if (implants.length === 0) {
    return <p className="text-xs text-slate-400">Tidak ada implant aktif.</p>;
  }
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
      {implants.map((s) => {
        const checked = selected.includes(s.id_implant);
        return (
          <button
            key={s.id_implant}
            type="button"
            onClick={() => toggle(s.id_implant)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              checked ? "bg-[#FEA103]/10 font-semibold text-[#E09102] dark:text-[#FEA103]" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
            )}
          >
            <span className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
              checked ? "border-[#FEA103] bg-[#FEA103] text-white" : "border-slate-300 text-transparent dark:border-slate-600"
            )}>
              <Check className="h-3 w-3" />
            </span>
            <span className="flex-1 truncate">{s.nama_implant}</span>
            <span className="shrink-0 font-mono text-[10px] text-slate-400">{s.kode_implant}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── ATUR TITIK PENJEMPUTAN ─────────── */
function ImplantPointPicker({
  implants,
  selected,
  titik,
  onChange,
}: {
  implants: ImplantAdmin[];
  selected: number[];
  titik: Record<number, number>;
  onChange: (id: number, host: number) => void;
}) {
  const selectedImplants = implants.filter((s) => selected.includes(s.id_implant));
  if (selectedImplants.length === 0) return null;
  const hosts = new Set(selectedImplants.map((s) => titik[s.id_implant] || s.id_implant));
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {hosts.size} titik penjemputan
      </p>
      {selectedImplants.map((s) => (
        <div key={s.id_implant} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 truncate">{s.nama_implant}</span>
          <span className="text-xs text-slate-400">diambil di</span>
          <select
            value={titik[s.id_implant] || s.id_implant}
            onChange={(e) => onChange(s.id_implant, Number(e.target.value))}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-800"
          >
            {selectedImplants.map((h) => (
              <option key={h.id_implant} value={h.id_implant}>{h.nama_implant}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

/* ─────────── PAGE ─────────── */
export default function AdminKaptenPage() {
  const queryClient = useQueryClient();
  const [data, setData] = useState<KaptenAdmin[]>([]);
  const [implants, setImplants] = useState<ImplantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      swal.info("Ekspor Dibatalkan", "Tidak ada data untuk diekspor");
      return;
    }
    const headersHTML = "<th>#</th><th>Nama Kapten</th><th>Username</th><th>No HP</th><th>Implant</th><th>Status</th>";
    const rowsHTML = filtered
      .map((row, idx) => {
        const imp = (row.implants ?? []).map((s) => s.nama_implant).join(", ") || "-";
        return `<tr><td>${idx + 1}</td><td>${row.nama}</td><td>${row.username || "-"}</td><td>${row.no_hp || "-"}</td><td>${imp}</td><td>${row.status}</td></tr>`;
      })
      .join("");
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;}table{border-collapse:collapse;width:100%;}th{background-color:#0c1e3a;color:#ffffff;font-weight:bold;padding:8px 12px;text-align:left;}td{border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;}</style></head>
      <body><h2>Data Kapten — Tower Control System</h2><p>Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")}</p><table><thead><tr>${headersHTML}</tr></thead><tbody>${rowsHTML}</tbody></table></body></html>
    `;
    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Data_Kapten_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    swal.success("Ekspor Excel Berhasil", "File Data_Kapten.xls telah diunduh.");
  };
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<KaptenAdmin | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<KaptenAdmin | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdCred, setCreatedCred] = useState<{ username: string; password: string } | null>(null);

  const [form, setFormState] = useState({
    nama: "", no_hp: "", status: "aktif",
    implant_ids: [] as number[],
    implant_peran: {} as Record<number, string>,
    implant_titik: {} as Record<number, number>,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [kapten, implantList] = await Promise.all([
        adminKapten.list(),
        adminImplant.list().catch(() => [] as ImplantAdmin[]),
      ]);
      setData(kapten);
      setImplants(implantList.filter((s) => s.status === "aktif"));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = data.filter((row) => {
    if (statusFilter === "aktif" && row.status !== "aktif") return false;
    if (statusFilter === "nonaktif" && row.status !== "nonaktif") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const inImplants = (row.implants ?? []).some((s) => s.nama_implant.toLowerCase().includes(q));
    return inImplants || [row.nama, row.username ?? "", row.no_hp ?? ""].some((v) => String(v).toLowerCase().includes(q));
  }).sort((a, b) => {
    let va = (a as any)[sortKey] ?? "";
    let vb = (b as any)[sortKey] ?? "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const setField = (key: string, val: any) => {
    setFormState((p) => ({ ...p, [key]: val }));
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: "" }));
  };

  const setImplantIds = (ids: number[]) => {
    setFormState((p) => {
      const titik: Record<number, number> = {};
      ids.forEach((id) => { titik[id] = p.implant_titik[id] || id; });
      return { ...p, implant_ids: ids, implant_titik: titik };
    });
    if (formErrors.implant_ids) setFormErrors((p) => ({ ...p, implant_ids: "" }));
  };

  const setImplantTitik = (id: number, host: number) => {
    setFormState((p) => {
      const titik: Record<number, number> = {};
      p.implant_ids.forEach((sid) => {
        const cur = p.implant_titik[sid] || sid;
        titik[sid] = cur === id && sid !== id ? host : cur;
      });
      titik[id] = host;
      if (host !== id) titik[host] = host;
      return { ...p, implant_titik: titik };
    });
  };

  const openCreate = () => {
    setEditTarget(null);
    setFormState({ nama: "", no_hp: "", status: "aktif", implant_ids: [], implant_peran: {}, implant_titik: {} });
    setFormErrors({});
    setCreatedCred(null);
    setFormOpen(true);
  };

  const openEdit = (row: KaptenAdmin) => {
    setEditTarget(row);
    const peran: Record<number, string> = {};
    const titik: Record<number, number> = {};
    (row.implants ?? []).forEach((s) => {
      peran[s.id_implant] = s.peran || "utama";
      titik[s.id_implant] = s.id_titik_implant || s.id_implant;
    });
    setFormState({
      nama: row.nama,
      no_hp: row.no_hp ?? "",
      status: row.status,
      implant_ids: (row.implants ?? []).map((s) => s.id_implant),
      implant_peran: peran,
      implant_titik: titik,
    });
    setFormErrors({});
    setCreatedCred(null);
    setFormOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.nama.trim()) errors.nama = "Nama kapten wajib diisi";
    if (form.no_hp.trim()) {
      let clean = form.no_hp.replace(/[- ]/g, "").replace(/^\+/, "");
      if (clean.startsWith("0")) {
        clean = "62" + clean.slice(1);
        form.no_hp = clean;
      }
      if (!/^628\d{8,11}$/.test(clean)) {
        errors.no_hp = "Nomor HP harus berformat '628...' (11–14 digit)";
      }
    }
    if (form.status === "aktif" && form.implant_ids.length === 0) {
      errors.implant_ids = "Kapten aktif wajib memegang minimal 1 implant";
    }
    if (form.implant_ids.some((id) => !form.implant_titik[id])) {
      errors.implant_ids = "Titik penjemputan wajib ditentukan untuk setiap implant";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        nama: form.nama.trim(),
        no_hp: (() => {
          let h = form.no_hp.replace(/[- ]/g, "").replace(/^\+/, "").trim();
          if (h.startsWith("0")) h = "62" + h.slice(1);
          return h || undefined;
        })(),
        status: form.status,
        implant_ids: form.implant_ids,
        implant_peran: form.implant_ids.length > 0 ? form.implant_peran : undefined,
        implant_titik: form.implant_ids.length > 0 ? form.implant_titik : undefined,
      };
      if (editTarget) {
        await adminKapten.update(editTarget.id_kapten, payload);
        swal.success("Kapten Diperbarui", `Data ${form.nama} berhasil disimpan.`);
        setFormOpen(false);
      } else {
        const res = await adminKapten.create(payload);
        setCreatedCred({ username: res.username, password: res.password_awal });
      }
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["admin-master-options"] });
      await queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
    } catch (err: any) { swal.error(err?.message || "Gagal menyimpan kapten"); }
    setSaving(false);
  };

  const handleDelete = async (row: KaptenAdmin) => {
    const confirmed = await swal.confirm(
      "Hapus Kapten?",
      `${row.nama} akan dihapus dari daftar dan akun loginnya dinonaktifkan. Riwayat input tetap aman.`
    );
    if (!confirmed) return;
    try {
      await adminKapten.delete(row.id_kapten);
      swal.success("Kapten Dihapus", "Master + mapping dihapus, akun dinonaktifkan.");
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["admin-master-options"] });
      await queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
    } catch (err: any) { swal.error(err?.message || "Gagal menghapus kapten"); }
  };

  const hasErrors = Object.keys(formErrors).length > 0;

  return (
    <>
      <PageHeader
        title={`Kapten (${data.length})`}
        description="Kelola master data kapten seller implant beserta akun loginnya."
        actions={
          <div className="flex items-center gap-2">
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
              Tambah Kapten
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kapten..."
            className="min-h-[36px] h-9 pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800 sm:flex-none">
            <Filter className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {[
              { value: "ALL", label: "Semua" },
              { value: "aktif", label: "Aktif" },
              { value: "nonaktif", label: "Nonaktif" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  statusFilter === opt.value
                    ? "bg-[#FEA103] text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)] min-h-[350px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 dark:bg-slate-800/95 dark:border-slate-700">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                <th className="w-12 px-4 py-2.5 text-center font-bold select-none">#</th>
                <th className="px-4 py-2.5 font-bold select-none">
                  <button onClick={() => handleSort("nama")} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white">
                    Nama Kapten <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-2.5 font-bold select-none">
                  <button onClick={() => handleSort("no_hp")} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white">
                    No HP <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-2.5 font-bold select-none">Implant</th>
                <th className="w-24 px-4 py-2.5 font-bold select-none">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-white">
                    Status <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
                <th className="w-28 px-4 py-2.5 text-right font-bold select-none">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-400">Memuat data kapten...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-500">Tidak ada data kapten</p>
                    <p className="mt-1 text-xs text-slate-400">Tambahkan kapten baru untuk memulai.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id_kapten}
                    className="border-b border-slate-100 text-sm transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {row.nama}
                      {row.username && (
                        <span className="ml-2 font-mono text-[10px] font-medium text-slate-400">@{row.username}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {row.no_hp ? (
                        <div className="flex items-center gap-1.5">
                          <span>{row.no_hp}</span>
                          <WhatsAppContact phone={row.no_hp} name={row.nama} compact />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(row.implants ?? []).length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <div className="flex max-w-64 flex-wrap gap-1">
                          {(row.implants ?? []).slice(0, 3).map((s) => (
                            <span key={s.id_implant} className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              <Store className="mr-1 h-2.5 w-2.5" />
                              {s.nama_implant}
                            </span>
                          ))}
                          {(row.implants ?? []).length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                              +{(row.implants ?? []).length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setDetailRow(row); setDetailOpen(true); }}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          title="Ubah"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                          title="Hapus"
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
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
          Menampilkan <span className="font-semibold text-slate-800 dark:text-white">{filtered.length}</span> dari{" "}
          <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> total kapten
          {(statusFilter !== "ALL" || search) && (
            <span className="ml-1 text-[#FEA103] font-semibold">(difilter)</span>
          )}
        </div>
      </div>

      {/* ── Tambah/Ubah Modal ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Ubah Kapten" : "Tambah Kapten"}
        description={editTarget ? "Ubah data kapten" : "Isi form berikut · nama wajib diisi"}
        icon={<UserPlus className="h-5 w-5" />}
        footer={
          createdCred ? (
            <Button onClick={() => setFormOpen(false)} className="w-full bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90">
              Selesai
            </Button>
          ) : (
            <div className="space-y-3">
              {hasErrors && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    {Object.keys(formErrors).length} field belum terisi dengan benar
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setFormOpen(false)} className="flex-1 font-semibold">
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90 disabled:opacity-70"
                >
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan…</> : editTarget ? "Simpan Perubahan" : "Tambah Kapten"}
                </Button>
              </div>
            </div>
          )
        }
      >
        {createdCred ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Akun login berhasil dibuat</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kredensial awal (catat & sampaikan ke kapten)</p>
              <div className="space-y-1.5 font-mono text-sm">
                <p className="text-slate-700 dark:text-slate-200">Username: <span className="font-bold">{createdCred.username}</span></p>
                <p className="text-slate-700 dark:text-slate-200">Password: <span className="font-bold">{createdCred.password}</span></p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <SectionDivider label="Identitas Kapten" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldWrapper label="Nama Kapten" required error={formErrors.nama}>
                <Input
                  value={form.nama}
                  onChange={(e) => setField("nama", e.target.value)}
                  placeholder="Nama lengkap kapten"
                  className={cn("h-11 rounded-lg text-sm", formErrors.nama && "border-rose-400 bg-rose-50/50 focus:border-rose-500 dark:bg-rose-500/5")}
                />
              </FieldWrapper>
              <FieldWrapper label="No HP" error={formErrors.no_hp} hint="Format 628... (11–14 digit) untuk verifikasi reset password">
                <Input
                  value={form.no_hp}
                  onChange={(e) => {
                    let val = e.target.value;
                    let digits = val.replace(/[- ]/g, "").replace(/^\+/, "");
                    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
                    setField("no_hp", digits);
                  }}
                  placeholder="6281234567890"
                  className="h-11 rounded-lg text-sm"
                />
              </FieldWrapper>
            </div>

            <SectionDivider label="Implant Aktif (Kawasan Kerja)" />
            <FieldWrapper label="Implant yang Dipegang" required={form.status === "aktif"} error={formErrors.implant_ids} hint="Pilih implant yang jadi kawasan kerja kapten ini">
              <ImplantMultiSelect
                implants={implants}
                selected={form.implant_ids}
                onChange={setImplantIds}
              />
            </FieldWrapper>
            <FieldWrapper label="Titik Penjemputan" hint="Implant yang menunjuk ke titik yang sama akan dijemput dalam satu form">
              <ImplantPointPicker
                implants={implants}
                selected={form.implant_ids}
                titik={form.implant_titik}
                onChange={setImplantTitik}
              />
            </FieldWrapper>

            <SectionDivider label="Status" />
            <FieldWrapper label="Status Kapten" hint="Nonaktif ikut menonaktifkan akun login">
              <StatusSelect value={form.status} onChange={(v) => setField("status", v)} />
            </FieldWrapper>
          </div>
        )}
      </Modal>

      {/* ── Detail Modal ── */}
      {detailRow && (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Detail Kapten"
          description="Informasi lengkap kapten + akun login"
          icon={<Eye className="h-5 w-5" />}
          footer={
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1 font-semibold">
                Tutup
              </Button>
              <Button
                onClick={() => { setDetailOpen(false); openEdit(detailRow); }}
                className="flex-1 bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90"
              >
                Ubah Data
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Nama", value: <span className="font-bold">{detailRow.nama}</span> },
              {
                label: "No HP",
                value: detailRow.no_hp ? (
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>{detailRow.no_hp}</span>
                    <WhatsAppContact phone={detailRow.no_hp} name={detailRow.nama} compact />
                  </div>
                ) : (
                  "—"
                ),
              },
              { label: "Akun Login", value: <span className="font-mono font-bold">{detailRow.username || "—"}</span> },
              {
                label: "Status",
                value: (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    detailRow.status === "aktif" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", detailRow.status === "aktif" ? "bg-emerald-500" : "bg-slate-400")} />
                    {detailRow.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                <div className="text-sm font-medium text-slate-800 dark:text-white">{item.value}</div>
              </div>
            ))}
            <div className="col-span-full rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Implant Aktif ({(detailRow.implants ?? []).length} implant)
              </p>
              {(detailRow.implants ?? []).length === 0 ? (
                <p className="text-xs text-slate-400">Belum memegang implant mana pun.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(detailRow.implants ?? []).map((s) => (
                    <span key={s.id_implant} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      <Store className="h-3 w-3" />
                      {s.nama_implant}
                      {s.nama_titik_implant && s.nama_titik_implant !== s.nama_implant && (
                        <span className="rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          {s.nama_titik_implant}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
