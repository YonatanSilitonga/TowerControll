"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ─────────── MODAL ─────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ─────────── TYPES ─────────── */
export type Column<T> = {
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "select" | "number" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  colSpan?: number;
  createOnly?: boolean; // only show in create form, not edit
};

/* ─────────── MAIN CRUD COMPONENT ─────────── */
export function AdminCrudPage<T extends Record<string, any>>({
  title, subtitle, columns, fields, emptyText, idKey,
  listFn, createFn, updateFn, deleteFn, initialForm,
}: {
  title: string; subtitle?: string; columns: Column<T>[]; fields: FieldConfig[];
  emptyText?: string; idKey: string;
  listFn: () => Promise<T[]>; createFn: (data: any) => Promise<any>;
  updateFn: (id: number, data: any) => Promise<any>; deleteFn: (id: number) => Promise<any>;
  initialForm: Record<string, any>;
}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any>>(initialForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await listFn()); } catch { /* ignore */ }
    setLoading(false);
  }, [listFn]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const openCreate = () => { setEditing(null); setForm(initialForm); setModalOpen(true); };
  const openEdit = (row: T) => { setEditing(row); setForm({ ...row }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await updateFn(Number(editing[idKey]), form); }
      else { await createFn(form); }
      setModalOpen(false);
      await refresh();
    } catch (err: any) { alert(err?.message || "Gagal menyimpan"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Nonaktifkan item ini?")) return;
    setDeletingId(id);
    try { await deleteFn(id); await refresh(); }
    catch (err: any) { alert(err?.message || "Gagal menghapus"); }
    setDeletingId(null);
  };

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      {/* Header — matches dashboard page style */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0c1e3a]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button onClick={openCreate} className="bg-[#0c1e3a] text-white hover:bg-[#16335a]">
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah {title}
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Cari ${title.toLowerCase()}…`} className="pl-9" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="w-12 px-4 py-3 text-center text-[10px]">#</th>
                {columns.map((col) => (
                  <th key={col.header} className={cn("px-4 py-3", col.className)}>{col.header}</th>
                ))}
                <th className="w-24 px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />
                    <p className="mt-2 text-xs text-slate-400">Memuat data…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-16 text-center">
                    <p className="text-sm text-slate-500">{emptyText || "Tidak ada data"}</p>
                    <p className="mt-1 text-xs text-slate-400">Coba tambah data baru atau ubah kata kunci pencarian.</p>
                  </td>
                </tr>
              ) : filtered.map((row, i) => (
                <tr key={String(row[idKey])} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-center text-xs text-slate-400 tabular-nums">{i + 1}</td>
                  {columns.map((col) => (
                    <td key={col.header} className={cn("px-4 py-3", col.className)}>{col.render(row)}</td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(Number(row[idKey]))} disabled={deletingId === Number(row[idKey])} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" title="Nonaktifkan">
                        {deletingId === Number(row[idKey]) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Menampilkan {filtered.length} dari {data.length} data
      </p>

      {/* Modal Form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : `Tambah ${title}`}>
        <div className="space-y-4">
          {fields.filter(f => !f.createOnly || !editing).map((f) => (
            <div key={f.key} className={cn(f.colSpan === 2 && "col-span-2")}>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {f.label}{f.required && <span className="ml-0.5 text-rose-500">*</span>}
              </label>
              {f.type === "select" ? (
                <select value={form[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">Pilih…</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={form[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                  rows={3} placeholder={f.placeholder}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              ) : (
                <Input type={f.type ?? "text"} value={form[f.key] ?? ""}
                  onChange={(e) => setField(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                  placeholder={f.placeholder} required={f.required} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0c1e3a] text-white hover:bg-[#16335a]">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? "Simpan" : "Tambah"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
