"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Search, X, Loader2, KeyRound, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { adminUser, UserAdmin } from "@/lib/admin-api";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="h-1 w-full bg-gradient-to-r from-[#0c1e3a] to-[#1a3a5c]" />
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-[#0c1e3a] dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin System" },
  { value: "direktur", label: "Direktur" },
  { value: "kapten", label: "Kapten Operasional" },
  { value: "cs", label: "Customer Service (CS)" },
  { value: "spv", label: "Supervisor (SPV)" },
  { value: "driver", label: "Driver App Access" },
  { value: "coor", label: "Coordinator" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  direktur: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  kapten: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  driver: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
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

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ show: boolean; title: string; type: "success" | "error" }>({
    show: false,
    title: "",
    type: "success",
  });

  const showToast = (title: string, type: "success" | "error" = "success") => {
    setToastMsg({ show: true, title, type });
    setTimeout(() => setToastMsg((prev) => ({ ...prev, show: false })), 4000);
  };

  // Create form
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "cs", karyawan_id: "" });
  // Reset password form
  const [newPw, setNewPw] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminUser.list());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [row.username, row.name, row.role].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.name || !form.role) {
      showToast("Semua field wajib diisi", "error");
      return;
    }
    if (form.password.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }
    setSaving(true);
    try {
      await adminUser.create({ ...form, karyawan_id: form.karyawan_id ? Number(form.karyawan_id) : undefined });
      showToast("User Baru Berhasil Dibuat");
      setCreateOpen(false);
      setForm({ username: "", password: "", name: "", role: "cs", karyawan_id: "" });
      await refresh();
    } catch (err: any) {
      showToast(err?.message || "Gagal membuat user", "error");
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPw) return;
    if (newPw.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }
    setSaving(true);
    try {
      await adminUser.resetPassword(resetTarget.id_user, newPw);
      showToast(`Password ${resetTarget.username} berhasil direset`);
      setResetOpen(false);
      setNewPw("");
      setResetTarget(null);
    } catch (err: any) {
      showToast(err?.message || "Gagal reset password", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await adminUser.delete(id);
      showToast("User telah dinonaktifkan");
      await refresh();
    } catch (err: any) {
      showToast(err?.message || "Gagal mengnonaktifkan", "error");
    }
    setDeletingId(null);
  };

  const inputClass = "h-10 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-[#FEA103]";
  const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-[#FEA103]";

  return (
    <>
      <PageHeader
        title={`Users & Roles (${data.length})`}
        description="Kelola akun pengguna sistem dan hak akses jabatan."
        actions={
          <Button
            onClick={() => {
              setForm({ username: "", password: "", name: "", role: "cs", karyawan_id: "" });
              setCreateOpen(true);
            }}
            className="bg-[#FEA103] text-xs font-semibold text-white shadow-sm hover:bg-[#E09102]"
          >
            <Plus className="mr-1.5 h-4 w-4 text-white" /> Tambah User
          </Button>
        }
      />

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari username, nama..."
          className="pl-9"
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none dark:border-slate-800">
                <th className="w-12 px-4 py-2.5 text-center font-semibold select-none">#</th>
                <th className="px-4 py-2.5 font-semibold select-none">Username</th>
                <th className="px-4 py-2.5 font-semibold select-none">Nama Lengkap</th>
                <th className="w-32 px-4 py-2.5 font-semibold select-none">Role</th>
                <th className="w-28 px-4 py-2.5 text-right font-semibold select-none">Karyawan ID</th>
                <th className="w-24 px-4 py-2.5 font-semibold select-none">Status</th>
                <th className="w-28 px-4 py-2.5 text-right font-semibold select-none">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-400">Memuat data user...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm font-semibold text-slate-500">
                    Tidak ada data user
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id_user}
                    className="border-b border-slate-100 text-sm transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {row.username}
                    </td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
                          ROLE_COLORS[row.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        <Shield className="h-3 w-3" />
                        {row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-500">
                      {row.karyawan_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.is_active ? "aktif" : "off"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setResetTarget(row);
                            setNewPw("");
                            setResetOpen(true);
                          }}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id_user)}
                          disabled={deletingId === row.id_user}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
                          title="Nonaktifkan"
                        >
                          {deletingId === row.id_user ? (
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
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
          Menampilkan {filtered.length} dari {data.length} total user
        </div>
      </div>

      {/* Create User Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah Akun User Baru">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Username <span className="text-rose-500">*</span>
            </label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Username untuk login"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password <span className="text-rose-500">*</span>
            </label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimal 6 karakter"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap pengoperasi"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Role Hak Akses <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={selectClass}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Karyawan ID</label>
            <Input
              type="number"
              value={form.karyawan_id}
              onChange={(e) => setForm({ ...form, karyawan_id: e.target.value })}
              placeholder="Opsional (cth: 101)"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => setCreateOpen(false)} className="px-4 text-xs font-semibold">
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-[#FEA103] px-5 text-xs font-semibold text-white hover:bg-[#E09102]">
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Tambah User
          </Button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={`Reset Password — ${resetTarget?.username ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Masukkan password baru untuk user <strong className="text-slate-700 dark:text-slate-300">{resetTarget?.username}</strong> ({resetTarget?.name}).
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Minimal 6 karakter"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <Button variant="outline" onClick={() => setResetOpen(false)} className="px-4 text-xs font-semibold">
            Batal
          </Button>
          <Button
            onClick={handleResetPassword}
            disabled={saving || !newPw}
            className="bg-[#FEA103] px-5 text-xs font-semibold text-white hover:bg-[#E09102]"
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Reset Password
          </Button>
        </div>
      </Modal>

      {/* Floating Toast Notification */}
      {toastMsg.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#0c1e3a] p-4 pr-5 text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toastMsg.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <p className="text-xs font-bold text-white">{toastMsg.title}</p>
        </div>
      )}
    </>
  );
}
