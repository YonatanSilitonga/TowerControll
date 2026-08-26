"use client";
import { AdminCrudPage, Column } from "../_components/crud-layout";
import { adminKendaraan, KendaraanAdmin } from "@/lib/admin-api";

const columns: Column<KendaraanAdmin>[] = [
  { header: "ID", className: "w-12", render: (r) => <span className="tabular-nums text-slate-400">{r.id_kendaraan}</span> },
  { header: "Plat Nomor", render: (r) => <span className="font-mono font-bold text-slate-900 dark:text-white">{r.plat_nomor}</span> },
  { header: "Jenis", render: (r) => r.jenis_kendaraan || "—" },
  { header: "Kapasitas (kg)", className: "text-right", render: (r) => <span className="tabular-nums">{r.kapasitas_kg ? r.kapasitas_kg.toLocaleString("id-ID") : "—"}</span> },
  { header: "Status", className: "w-28", render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
      r.status_kendaraan === "aktif" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
        : r.status_kendaraan === "perlu_perbaikan" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}>{r.status_kendaraan}</span>
  )},
];

const fields = [
  { key: "plat_nomor", label: "Plat Nomor", required: true, placeholder: "B 1234 ABC" },
  { key: "jenis_kendaraan", label: "Jenis Kendaraan", type: "select" as const, options: [{ value: "Box", label: "Box" }, { value: "CDD", label: "CDD" }, { value: "CDE", label: "CDE" }, { value: "Tronton", label: "Tronton" }, { value: "Fuso", label: "Fuso" }, { value: "Pickup", label: "Pickup" }, { value: "Blind Van", label: "Blind Van" }] },
  { key: "kapasitas_kg", label: "Kapasitas (kg)", type: "number" as const, placeholder: "Contoh: 5000" },
  { key: "status_kendaraan", label: "Status", type: "select" as const, required: true, options: [{ value: "aktif", label: "Aktif" }, { value: "tidak_aktif", label: "Tidak Aktif" }, { value: "perlu_perbaikan", label: "Perlu Perbaikan" }] },
];

export default function AdminVehiclesPage() {
  return (
    <AdminCrudPage title="Kendaraan" subtitle="Kelola data kendaraan" columns={columns} fields={fields}
      emptyText="Belum ada kendaraan" idKey="id_kendaraan" listFn={adminKendaraan.list}
      createFn={adminKendaraan.create} updateFn={adminKendaraan.update} deleteFn={adminKendaraan.delete}
      initialForm={{ plat_nomor: "", jenis_kendaraan: "", kapasitas_kg: null, status_kendaraan: "aktif" }} />
  );
}
