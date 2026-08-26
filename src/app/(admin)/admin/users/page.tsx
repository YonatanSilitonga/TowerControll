"use client";
import { useState, useEffect, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, X, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminUser, UserAdmin } from "@/lib/admin-api";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" }, { value: "direktur", label: "Direktur" },
  { value: "kapten", label: "Kapten" }, { value: "cs", label: "CS" },
  { value: "spv", label: "Supervisor" }, { value: "driver", label: "Driver" },
  { value: "coor", label: "Coordinator" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  direktur: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  kapten: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
};

export default function AdminUsersPage() {
  const [data, setData] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserAdmin | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "cs", karyawan_id: "" });
  // Reset password form
  const [newPw, setNewPw] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await adminUser.list()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [row.username, row.name, row.role].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.name || !form.role) { alert("Semua field wajib diisi"); return; }
    setSaving(true);
    try {
      await adminUser.create({ ...form, karyawan_id: form.karyawan_id ? Number(form.karyawan_id) : undefined });
      setCreateOpen(false);
      setForm({ username: "", password: "", name: "", role: "cs", karyawan_id: "" });
      await refresh();
    } catch (err: any) { alert(err?.message || "Gagal membuat user"); }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPw) return;
    if (newPw.length < 6) { alert("Password minimal 6 karakter"); return; }
    setSaving(true);
    try {
      await adminUser.resetPassword(resetTarget.id_user, newPw);
      setResetOpen(false);
      setNewPw("");
      setResetTarget(null);
    } catch (err: any) { alert(err?.message || "Gagal reset password"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Nonaktifkan user ini?")) return;
    setDeletingId(id);
    try { await adminUser.delete(id); await refresh(); }
    catch (err: any) { alert(err?.message || "Gagal menghapus"); }
    setDeletingId(null);
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0c1e3a]">Users & Role</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kelola akun user dan role akses</p>
        </div>
        <Button onClick={() => { setForm({ username: "", password: "", name: "", role: "cs", karyawan_id: "" }); setCreateOpen(true); }} className="bg-[#0c1e3a] text-white hover:bg-[#16335a]">
          <Plus className="mr-1.5 h-4 w-4" /> Tambah User
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user…" className="pl-9" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="w-12 px-4 py-3 text-center text-[10px]">#</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3 w-24">Role</th>
                <th className="px-4 py-3 w-24">Karyawan ID</th>
                <th className="px-4 py-3 w-24">Status</th>
                <th className="w-32 px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" /><p className="mt-2 text-xs text-slate-400">Memuat…</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500">Tidak ada data</td></tr>
              ) : filtered.map((row, i) => (
                <tr key={row.id_user} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-center text-xs text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-white">{row.username}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", ROLE_COLORS[row.role] ?? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>{row.role}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{row.karyawan_id ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                      row.is_active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                    )}>{row.is_active ? "Aktif" : "Nonaktif"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setResetTarget(row); setNewPw(""); setResetOpen(true); }} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Reset Password">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(row.id_user)} disabled={deletingId === row.id_user} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 transition-colors" title="Nonaktifkan">
                        {deletingId === row.id_user ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Menampilkan {filtered.length} dari {data.length} data</p>

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah User">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Username <span className="text-rose-500">*</span></label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username login" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Password <span className="text-rose-500">*</span></label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 6 karakter" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap <span className="text-rose-500">*</span></label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama tampil" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Role <span className="text-rose-500">*</span></label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Karyawan ID</label>
            <Input type="number" value={form.karyawan_id} onChange={(e) => setForm({ ...form, karyawan_id: e.target.value })} placeholder="Opsional" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-[#0c1e3a] text-white hover:bg-[#16335a]">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Tambah User
          </Button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={`Reset Password — ${resetTarget?.username ?? ""}`}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Masukkan password baru untuk user <strong>{resetTarget?.username}</strong>.</p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Password Baru <span className="text-rose-500">*</span></label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Minimal 6 karakter" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => setResetOpen(false)}>Batal</Button>
          <Button onClick={handleResetPassword} disabled={saving || !newPw} className="bg-amber-500 text-[#0c1e3a] hover:bg-amber-400">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Reset Password
          </Button>
        </div>
      </Modal>
    </>
  );
}
