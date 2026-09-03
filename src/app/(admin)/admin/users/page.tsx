"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { swal } from "@/lib/swal";
import {
  Plus,
  Search,
  X,
  Loader2,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  LockKeyhole,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Filter,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { adminUser, UserAdmin } from "@/lib/admin-api";

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
  }, [open]);

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
        {/* Accent bar */}
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#0c1e3a] to-[#1a3a5c]" />
        {/* Drag handle mobile */}
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

/* ─────────── ROLE CONFIG ─────────── */
const ROLE_OPTIONS = [
  { value: "admin",         label: "Admin",         color: "bg-amber-500" },
  { value: "direktur",      label: "Direktur",       color: "bg-purple-500" },
  { value: "tower_control", label: "Tower Control",   color: "bg-blue-500" },
  { value: "driver",        label: "Driver",          color: "bg-emerald-500" },
];

const ROLE_COLORS: Record<string, string> = {
  admin:         "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  direktur:      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  tower_control: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  driver:        "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

/* ─────────── ROLE SELECT DROPDOWN ─────────── */
function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = ROLE_OPTIONS.find((o) => o.value === value);
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
          "flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm text-slate-700 outline-none transition-all dark:bg-slate-800 dark:text-white",
          open
            ? "border-[#FEA103] ring-2 ring-[#FEA103]/20"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
        )}
      >
        <span className="flex items-center gap-2">
          {selected && <span className={cn("h-2 w-2 shrink-0 rounded-full", selected.color)} />}
          <span>{selected?.label ?? "Pilih Role…"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div ref={dropdownRef} className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1">
              {ROLE_OPTIONS.map((opt) => (
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
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", opt.color)} />
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
        className="h-11 rounded-lg pr-10 text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ─────────── PAGE ─────────── */
export default function AdminUsersPage() {
  const [data, setData]           = useState<UserAdmin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  // Filter: "ALL" | role value | "aktif" | "nonaktif"
  const [roleFilter, setRoleFilter]     = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [createOpen, setCreateOpen]   = useState(false);
  const [resetOpen, setResetOpen]     = useState(false);
  const [resetTarget, setResetTarget] = useState<UserAdmin | null>(null);
  const [togglingId, setTogglingId]   = useState<number | null>(null);
  const [saving, setSaving]           = useState(false);

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<UserAdmin | null>(null);

  const [form, setFormState] = useState({ username: "", password: "", name: "", role: "driver", id_driver: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [newPw, setNewPw] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await adminUser.list()); } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Filtering ──
  const filtered = data.filter((row) => {
    if (roleFilter !== "ALL" && row.role !== roleFilter) return false;
    if (statusFilter === "aktif" && row.status !== "aktif") return false;
    if (statusFilter === "nonaktif" && row.status !== "nonaktif") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [row.username, row.name, row.role].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  // ── Validate & Save ──
  const validateCreate = () => {
    const errors: Record<string, string> = {};
    if (!form.username.trim()) errors.username = "Username wajib diisi";
    if (!form.password) errors.password = "Password wajib diisi";
    else if (form.password.length < 6) errors.password = "Password minimal 6 karakter";
    if (!form.name.trim()) errors.name = "Nama lengkap wajib diisi";
    if (!form.role) errors.role = "Role wajib dipilih";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      await adminUser.create({ ...form, id_driver: form.id_driver ? Number(form.id_driver) : undefined });
      swal.success("User Baru Berhasil Dibuat");
      setCreateOpen(false);
      setFormState({ username: "", password: "", name: "", role: "driver", id_driver: "" });
      setFormErrors({});
      await refresh();
    } catch (err: any) { swal.error(err?.message || "Gagal membuat user"); }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPw) return;
    if (newPw.length < 6) { swal.error("Password minimal 6 karakter"); return; }
    setSaving(true);
    try {
      await adminUser.resetPassword(resetTarget.id_user, newPw);
      swal.success(`Password ${resetTarget.username} berhasil direset`);
      setResetOpen(false); setNewPw(""); setResetTarget(null);
    } catch (err: any) { swal.error(err?.message || "Gagal reset password"); }
    setSaving(false);
  };

  const handleToggleStatus = async (row: UserAdmin) => {
    const newStatus = row.status === "aktif" ? "nonaktif" : "aktif";
    setTogglingId(row.id_user);
    try {
      await adminUser.updateStatus(row.id_user, newStatus);
      swal.success(`User ${newStatus === "aktif" ? "diaktifkan" : "dinonaktifkan"}`);
      await refresh();
    } catch (err: any) { swal.error(err?.message || "Gagal update status"); }
    setTogglingId(null);
  };

  const setField = (key: string, val: string) => {
    setFormState((p) => ({ ...p, [key]: val }));
    if (formErrors[key]) setFormErrors((p) => ({ ...p, [key]: "" }));
  };

  const hasErrors = Object.keys(formErrors).length > 0;

  return (
    <>
      <PageHeader
        title={`Users & Roles (${data.length})`}
        description="Kelola akun pengguna sistem dan hak akses jabatan."
        actions={
          <Button
            onClick={() => {
              setFormState({ username: "", password: "", name: "", role: "driver", id_driver: "" });
              setFormErrors({});
              setCreateOpen(true);
            }}
            className="bg-[#FEA103] text-xs font-semibold text-white shadow-sm hover:bg-[#E09102]"
          >
            <Plus className="mr-1.5 h-4 w-4 text-white" />
            Tambah User
          </Button>
        }
      />

      {/* ── Control Bar: Search + Filter chips ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari username, nama..."
            className="pl-9"
          />
        </div>

        {/* Filter Role chips */}
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <Filter className="ml-1 h-3.5 w-3.5 text-slate-400" />
          <button
            onClick={() => setRoleFilter("ALL")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              roleFilter === "ALL"
                ? "bg-[#FEA103] text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            )}
          >
            Semua Role
          </button>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(roleFilter === opt.value ? "ALL" : opt.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                roleFilter === opt.value
                  ? "bg-[#FEA103] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", opt.color)} />
              {opt.label.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Filter Status chips */}
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          {[
            { value: "ALL", label: "Semua Status" },
            { value: "aktif", label: "Aktif" },
            { value: "nonaktif", label: "Nonaktif" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                statusFilter === opt.value
                  ? "bg-[#FEA103] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Active filter count badge */}
        {(roleFilter !== "ALL" || statusFilter !== "ALL") && (
          <button
            onClick={() => { setRoleFilter("ALL"); setStatusFilter("ALL"); }}
            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
          >
            <X className="h-3 w-3" />
            Reset filter
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none dark:border-slate-800">
                <th className="w-12 px-4 py-2.5 text-center">#</th>
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5">Nama Lengkap</th>
                <th className="w-44 px-4 py-2.5">Role</th>
                <th className="w-28 px-4 py-2.5 text-right">Driver ID</th>
                <th className="w-24 px-4 py-2.5">Status</th>
                <th className="w-28 px-4 py-2.5 text-right">Aksi</th>
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
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-slate-500">Tidak ada data user</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {roleFilter !== "ALL" || statusFilter !== "ALL"
                        ? "Tidak ada user yang cocok dengan filter aktif."
                        : "Tambahkan user baru untuk memulai."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id_user}
                    className="border-b border-slate-100 text-sm transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-white">{row.username}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
                        ROLE_COLORS[row.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                        <Shield className="h-3 w-3" />
                        {ROLE_OPTIONS.find((o) => o.value === row.role)?.label ?? row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-500">{row.id_driver ?? "—"}</td>
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
                          onClick={() => handleToggleStatus(row)}
                          disabled={togglingId === row.id_user}
                          className={cn(
                            "rounded-md p-1.5 transition-colors disabled:opacity-50",
                            row.status === "aktif"
                              ? "text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                              : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                          )}
                          title={row.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {togglingId === row.id_user
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : row.status === "aktif" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setResetTarget(row); setNewPw(""); setResetOpen(true); }}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
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
          <span className="font-semibold text-slate-800 dark:text-white">{filtered.length}</span> dari{" "}
          <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> total user
          {(roleFilter !== "ALL" || statusFilter !== "ALL") && (
            <span className="ml-1 text-[#FEA103] font-semibold">(difilter)</span>
          )}
        </div>
      </div>

      {/* ── Create User Modal ── */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Akun User Baru"
        description="Isi form berikut · 4 field wajib diisi"
        icon={<UserPlus className="h-5 w-5" />}
        footer={
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
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1 font-semibold">
                Batal
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="flex-[2] bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90 disabled:opacity-70"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan…</> : "Tambah User"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <SectionDivider label="Kredensial Login" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldWrapper label="Username" required error={formErrors.username} hint="Digunakan untuk login ke sistem">
              <Input
                value={form.username}
                onChange={(e) => setField("username", e.target.value)}
                placeholder="Username untuk login"
                className={cn("h-11 rounded-lg text-sm", formErrors.username && "border-rose-400 bg-rose-50/50 focus:border-rose-500 dark:bg-rose-500/5")}
              />
            </FieldWrapper>
            <FieldWrapper label="Password" required error={formErrors.password} hint="Minimal 6 karakter">
              <PasswordInput value={form.password} onChange={(v) => setField("password", v)} placeholder="Minimal 6 karakter" />
            </FieldWrapper>
          </div>

          <SectionDivider label="Data Pengguna" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldWrapper label="Nama Lengkap" required error={formErrors.name}>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Nama lengkap pengoperasi"
                className={cn("h-11 rounded-lg text-sm", formErrors.name && "border-rose-400 bg-rose-50/50 focus:border-rose-500 dark:bg-rose-500/5")}
              />
            </FieldWrapper>
            <FieldWrapper label="Driver ID" hint="Opsional — hubungkan ke ID driver">
              <Input
                type="number"
                value={form.id_driver}
                onChange={(e) => setField("id_driver", e.target.value)}
                placeholder="cth: 1"
                className="h-11 rounded-lg text-sm"
              />
            </FieldWrapper>
          </div>

          <SectionDivider label="Hak Akses" />
          <FieldWrapper label="Role Hak Akses" required error={formErrors.role} hint="Menentukan menu dan fitur yang bisa diakses user">
            <RoleSelect value={form.role} onChange={(v) => setField("role", v)} />
          </FieldWrapper>
        </div>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password"
        description={`Atur ulang password untuk ${resetTarget?.username ?? "—"}`}
        icon={<LockKeyhole className="h-5 w-5" />}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setResetOpen(false)} className="flex-1 font-semibold">
              Batal
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={saving || !newPw}
              className="flex-[2] bg-[#0c1e3a] font-semibold text-white hover:bg-[#0c1e3a]/90 disabled:opacity-70"
            >
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan…</> : "Reset Password"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* User info card */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a]/8 dark:bg-white/10">
              <Shield className="h-4 w-4 text-[#0c1e3a] dark:text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{resetTarget?.name}</p>
              <p className="font-mono text-[11px] text-slate-500">
                @{resetTarget?.username} ·{" "}
                <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize", ROLE_COLORS[resetTarget?.role ?? ""] ?? "bg-slate-100 text-slate-600")}>
                  {resetTarget?.role}
                </span>
              </p>
            </div>
          </div>
          <FieldWrapper label="Password Baru" required hint="Minimal 6 karakter · User harus login ulang setelah direset">
            <PasswordInput value={newPw} onChange={(v) => setNewPw(v)} placeholder="Masukkan password baru" />
          </FieldWrapper>
        </div>
      </Modal>

      {/* ── Detail Modal ── */}
      {detailRow && (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Detail User"
          description="Informasi lengkap akun user"
          icon={<Eye className="h-5 w-5" />}
          footer={
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1 font-semibold">
                Tutup
              </Button>
              <Button
                onClick={() => { setDetailOpen(false); handleToggleStatus(detailRow); }}
                className={cn(
                  "flex-1 font-semibold",
                  detailRow.status === "aktif"
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {detailRow.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Username", value: <span className="font-mono font-bold">{detailRow.username}</span> },
              { label: "Nama", value: detailRow.name },
              {
                label: "Role",
                value: (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
                    ROLE_COLORS[detailRow.role] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  )}>
                    <Shield className="h-3 w-3" />
                    {ROLE_OPTIONS.find((o) => o.value === detailRow.role)?.label ?? detailRow.role}
                  </span>
                ),
              },
              { label: "ID Driver", value: detailRow.id_driver ?? "—" },
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

            {/* Audit fields */}
            {detailRow.created_at && (
              <div className="col-span-full rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Log</p>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex gap-2">
                    <span className="w-16 shrink-0 font-semibold text-slate-400">Dibuat</span>
                    <span>
                      {new Date(detailRow.created_at).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      {detailRow.created_by && ` · #${detailRow.created_by}`}
                    </span>
                  </div>
                  {detailRow.updated_at && (
                    <div className="flex gap-2">
                      <span className="w-16 shrink-0 font-semibold text-slate-400">Diubah</span>
                      <span>
                        {new Date(detailRow.updated_at).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                        {detailRow.updated_by && ` · #${detailRow.updated_by}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
