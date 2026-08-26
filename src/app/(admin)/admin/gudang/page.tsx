"use client";
import { AdminCrudPage, Column } from "../_components/crud-layout";
import { adminGudang, GudangAdmin } from "@/lib/admin-api";

const columns: Column<GudangAdmin>[] = [
  { header: "ID", className: "w-12", render: (r) => <span className="tabular-nums text-slate-400">{r.id_gudang}</span> },
  { header: "Nama Gudang", render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.nama_gudang}</span> },
  { header: "Kota", render: (r) => r.kota || "—" },
  { header: "Alamat", render: (r) => <span className="truncate max-w-[200px] block">{r.alamat || "—"}</span> },
  { header: "Latitude", className: "text-right", render: (r) => <span className="tabular-nums text-slate-500">{r.latitude ?? "—"}</span> },
  { header: "Longitude", className: "text-right", render: (r) => <span className="tabular-nums text-slate-500">{r.longitude ?? "—"}</span> },
  { header: "Status", className: "w-24", render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
      r.status === "aktif" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}>{r.status}</span>
  )},
];

const fields = [
  { key: "nama_gudang", label: "Nama Gudang", required: true, placeholder: "Contoh: Gudang Tangerang" },
  { key: "alamat", label: "Alamat", type: "textarea" as const, placeholder: "Alamat lengkap" },
  { key: "kota", label: "Kota", placeholder: "Kota/Kabupaten" },
  { key: "latitude", label: "Latitude", type: "number" as const, placeholder: "-6.xxxx" },
  { key: "longitude", label: "Longitude", type: "number" as const, placeholder: "106.xxxx" },
  { key: "status", label: "Status", type: "select" as const, required: true, options: [{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }] },
];

export default function AdminGudangPage() {
  return (
    <AdminCrudPage title="Gudang" subtitle="Kelola data gudang" columns={columns} fields={fields}
      emptyText="Belum ada gudang" idKey="id_gudang" listFn={adminGudang.list}
      createFn={adminGudang.create} updateFn={adminGudang.update} deleteFn={adminGudang.delete}
      initialForm={{ nama_gudang: "", alamat: "", kota: "", latitude: null, longitude: null, status: "aktif" }} />
  );
}
