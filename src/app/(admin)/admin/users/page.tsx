"use client";
import { AdminCrudPage, Column } from "../_components/crud-layout";
import { adminUser, UserAdmin } from "@/lib/admin-api";

const columns: Column<UserAdmin>[] = [
  { header: "ID", className: "w-12", render: (r) => <span className="tabular-nums text-slate-400">{r.id_user}</span> },
  { header: "Username", render: (r) => <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{r.username}</span> },
  { header: "Nama", render: (r) => r.name },
  { header: "Role", className: "w-24", render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
      r.role === "admin" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : r.role === "direktur" ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
        : r.role === "kapten" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}>{r.role}</span>
  )},
  { header: "Karyawan ID", className: "w-24 text-right", render: (r) => r.karyawan_id ? <span className="tabular-nums">{r.karyawan_id}</span> : "—" },
  { header: "Status", className: "w-24", render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
      r.is_active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
    }`}>{r.is_active ? "Aktif" : "Nonaktif"}</span>
  )},
];

const fields = [
  { key: "username", label: "Username", required: true, placeholder: "username login" },
  { key: "password", label: "Password", type: "text" as const, required: true, placeholder: "Minimal 6 karakter" },
  { key: "name", label: "Nama Lengkap", required: true, placeholder: "Nama tampil" },
  { key: "role", label: "Role", type: "select" as const, required: true, options: [
    { value: "admin", label: "Admin" }, { value: "direktur", label: "Direktur" },
    { value: "kapten", label: "Kapten" }, { value: "cs", label: "CS" },
    { value: "spv", label: "Supervisor" }, { value: "driver", label: "Driver" },
    { value: "coor", label: "Coordinator" },
  ]},
  { key: "karyawan_id", label: "Karyawan ID", type: "number" as const, placeholder: "Opsional" },
];

export default function AdminUsersPage() {
  return (
    <AdminCrudPage title="Users & Role" subtitle="Kelola akun user dan role akses" columns={columns} fields={fields}
      emptyText="Belum ada user" idKey="id_user" listFn={adminUser.list}
      createFn={adminUser.create}
      updateFn={async (id, data) => { const { password, ...rest } = data; return adminUser.updateRole(id, rest.role); }}
      deleteFn={adminUser.delete}
      initialForm={{ username: "", password: "", name: "", role: "cs", karyawan_id: null }} />
  );
}
