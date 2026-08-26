"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { ArrowLeft, Plus, Pencil, Trash2, Search, X, Check, Shield, LogOut, Loader2 } from "lucide-react";

// ── Reusable sidebar (same for all admin pages) ──
const NAV = [
  { href: "/admin", label: "Dashboard", icon: Shield },
  { href: "/admin/drivers", label: "Driver", icon: () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/admin/vehicles", label: "Kendaraan", icon: () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4l3 5v5"/></svg> },
  { href: "/admin/sellers", label: "Seller", icon: () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
  { href: "/admin/gudang", label: "Gudang", icon: () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 21V7L12 2 2 7v14h20z"/><path d="M6 21V11"/><path d="M18 21V11"/><path d="M12 21V11"/></svg> },
  { href: "/admin/users", label: "Users & Role", icon: () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
];

function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-12 items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
        <Shield className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-bold text-slate-800 dark:text-white">Admin Panel</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${active ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            >
              <item.icon />{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2 dark:border-slate-800">
        <div className="mb-1 truncate px-2 text-[10px] text-slate-400">{user?.name || user?.username}</div>
        <button onClick={() => { clear(); router.replace("/admin/login"); }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
          <LogOut className="h-3.5 w-3.5" /> Keluar
        </button>
      </div>
    </aside>
  );
}

// ── Modal ──
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ── Main CRUD Layout ──
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
};

export function AdminCrudPage<T extends Record<string, any>>({
  title,
  description,
  columns,
  fields,
  emptyText,
  idKey,
  listFn,
  createFn,
  updateFn,
  deleteFn,
  initialForm,
}: {
  title: string;
  description: string;
  columns: Column<T>[];
  fields: FieldConfig[];
  emptyText?: string;
  idKey: string;
  listFn: () => Promise<T[]>;
  createFn: (data: any) => Promise<any>;
  updateFn: (id: number, data: any) => Promise<any>;
  deleteFn: (id: number) => Promise<any>;
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
      if (editing) {
        await updateFn(Number(editing[idKey]), form);
      } else {
        await createFn(form);
      }
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      alert(err?.message || "Gagal menyimpan");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Nonaktifkan item ini?")) return;
    setDeletingId(id);
    try {
      await deleteFn(id);
      await refresh();
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus");
    }
    setDeletingId(null);
  };

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="ml-56 flex-1 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Link>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h1>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-[#0c1e3a] hover:bg-amber-400 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Tambah
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-3 py-2.5 w-8">#</th>
                  {columns.map((col) => (
                    <th key={col.header} className={`px-3 py-2.5 ${col.className ?? ""}`}>{col.header}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length + 2} className="px-3 py-12 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={columns.length + 2} className="px-3 py-12 text-center text-slate-400">{emptyText || "Tidak ada data"}</td></tr>
                ) : filtered.map((row, i) => (
                  <tr key={String(row[idKey])} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                    {columns.map((col) => (
                      <td key={col.header} className={`px-3 py-2 ${col.className ?? ""}`}>{col.render(row)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(row)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(Number(row[idKey]))} disabled={deletingId === Number(row[idKey])}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" title="Nonaktifkan">
                          {deletingId === Number(row[idKey]) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-400">{filtered.length} dari {data.length} data</p>
      </div>

      {/* Modal Form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : `Tambah ${title}`}>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className={f.colSpan === 2 ? "col-span-2" : ""}>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{f.label}</label>
              {f.type === "select" ? (
                <select value={form[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">Pilih…</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={form[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                  rows={3} placeholder={f.placeholder}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              ) : (
                <input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setField(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                  placeholder={f.placeholder} required={f.required}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Batal</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#0c1e3a] hover:bg-amber-400 disabled:opacity-50">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {editing ? "Simpan" : "Tambah"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
