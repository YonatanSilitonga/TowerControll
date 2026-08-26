"use client";
import { AdminCrudPage, Column } from "../_components/crud-layout";
import { adminDriver, DriverAdmin } from "@/lib/admin-api";

const columns: Column<DriverAdmin>[] = [
  { header: "ID", className: "w-12", render: (r) => <span className="tabular-nums text-slate-400">{r.id_driver}</span> },
  { header: "Nama Driver", render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.nama_driver}</span> },
  { header: "No HP", render: (r) => r.no_hp || "—" },
  { header: "No SIM", render: (r) => r.no_sim || "—" },
  { header: "Jenis SIM", render: (r) => r.jenis_sim || "—" },
  { header: "Status", className: "w-24", render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
      r.status_driver === "aktif" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}>{r.status_driver}</span>
  )},
];

const fields = [
  { key: "nama_driver", label: "Nama Driver", required: true, placeholder: "Nama lengkap" },
  { key: "no_hp", label: "No HP", placeholder: "08123456789" },
  { key: "no_sim", label: "No SIM", placeholder: "Nomor SIM" },
  { key: "jenis_sim", label: "Jenis SIM", type: "select" as const, options: [{ value: "A", label: "A" }, { value: "B1", label: "B1" }, { value: "B2", label: "B2" }, { value: "C", label: "C" }, { value: "D", label: "D" }] },
  { key: "status_driver", label: "Status", type: "select" as const, required: true, options: [{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }] },
];

export default function AdminDriversPage() {
  return (
    <AdminCrudPage title="Driver" subtitle="Kelola data driver" columns={columns} fields={fields}
      emptyText="Belum ada driver" idKey="id_driver" listFn={adminDriver.list}
      createFn={adminDriver.create} updateFn={adminDriver.update} deleteFn={adminDriver.delete}
      initialForm={{ nama_driver: "", no_hp: "", no_sim: "", jenis_sim: "", status_driver: "aktif" }} />
  );
}
