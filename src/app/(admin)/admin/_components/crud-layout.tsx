"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  LayoutDashboard,
  Users,
  Car,
  Store,
  Warehouse,
  Shield,
  LogOut,
  ChevronRight,
} from "lucide-react";

/* ─────────── NAV ─────────── */
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/drivers", label: "Driver", icon: Users },
  { href: "/admin/vehicles", label: "Kendaraan", icon: Car },
  { href: "/admin/sellers", label: "Seller", icon: Store },
  { href: "/admin/gudang", label: "Gudang", icon: Warehouse },
  { href: "/admin/users", label: "Users & Role", icon: Shield },
];

/* ─────────── SIDEBAR ─────────── */
function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  return (
    <div className="hidden w-60 shrink-0 bg-[#0c1e3a] lg:block">
      <aside className="sticky top-0 flex h-screen w-full flex-col border-r border-[#0c1e3a] text-slate-300">
        {/* Logo — identik sidebar utama */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <Image src="/logo-icon.png" alt="Tower Control" width={34} height={34} className="h-8 w-8 shrink-0 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Tower Control</p>
            <p className="text-[10px] tracking-wider text-amber-400/80">Admin Panel</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Pengelolaan
          </p>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-white text-[#0c1e3a] shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 border-t border-white/10 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-[#0c1e3a]">
            {user?.name?.charAt(0) ?? "A"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "Admin"}</p>
            <p className="text-[11px] text-slate-400">Administrator</p>
          </div>
          <button
            onClick={() => { clear(); router.replace("/admin/login"); }}
            className="rounded p-1 text-slate-400 hover:text-white transition-colors"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ─────────── PAGE HEADER ─────────── */
function PageHeader({ title, subtitle, breadcrumbs }: { title: string; subtitle?: string; breadcrumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {bc.href ? (
                <Link href={bc.href} className="hover:text-slate-600 transition-colors">{bc.label}</Link>
              ) : (
                <span className="text-slate-600 font-medium">{bc.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
}

/* ─────────── MODAL ─────────── */
function Modal({ open, onClose, title, children, width }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn("w-full rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900", width ?? "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
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
};

/* ─────────── MAIN CRUD PAGE ─────────── */
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
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Page Header */}
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: title },
          ]}
        />

        {/* Content */}
        <div className="flex-1 p-6 lg:p-8">
          {/* Toolbar: search + add button */}
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Cari ${title.toLowerCase()}…`}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0c1e3a] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#152d4f]"
            >
              <Plus className="h-4 w-4" />
              Tambah {title}
            </button>
          </div>

          {/* Table Card */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
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
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                          <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">{emptyText || "Tidak ada data"}</p>
                        <p className="mt-1 text-xs text-slate-400">Coba tambah data baru atau ubah kata kunci pencarian.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, i) => (
                      <tr
                        key={String(row[idKey])}
                        className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3 text-center text-xs text-slate-400 tabular-nums">{i + 1}</td>
                        {columns.map((col) => (
                          <td key={col.header} className={cn("px-4 py-3", col.className)}>{col.render(row)}</td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(row)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(Number(row[idKey]))}
                              disabled={deletingId === Number(row[idKey])}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
                              title="Nonaktifkan"
                            >
                              {deletingId === Number(row[idKey]) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/30">
              <p className="text-xs text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-300">{data.length}</span> data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal Form ─── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : `Tambah ${title}`}>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className={cn(f.colSpan === 2 && "col-span-2")}>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {f.label}
                {f.required && <span className="ml-0.5 text-rose-500">*</span>}
              </label>
              {f.type === "select" ? (
                <select
                  value={form[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Pilih…</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  rows={3}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              ) : (
                <input
                  type={f.type ?? "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setField(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            onClick={() => setModalOpen(false)}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0c1e3a] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#152d4f] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Simpan Perubahan" : "Tambah Data"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
