"use client";
import { AdminCrudPage, Column } from "../_components/crud-layout";
import { adminDropPoint, DropPointAdmin } from "@/lib/admin-api";

const columns: Column<DropPointAdmin>[] = [
  { header: "ID", className: "w-12", render: (r) => <span className="tabular-nums text-slate-400">{r.id_drop_point}</span> },
  { header: "Nama Drop Point", render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.nama_drop_point}</span> },
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
  { key: "nama_drop_point", label: "Nama Drop Point", required: true, placeholder: "Contoh: DP Serpong" },
  { key: "alamat", label: "Alamat", type: "textarea" as const, placeholder: "Alamat lengkap" },
  { key: "latitude", label: "Latitude", type: "number" as const, placeholder: "-6.xxxx" },
  { key: "longitude", label: "Longitude", type: "number" as const, placeholder: "106.xxxx" },
  { key: "status", label: "Status", type: "select" as const, required: true, options: [{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }] },
];

export default function AdminDropPointsPage() {
  return (
    <AdminCrudPage title="Drop Point" subtitle="Kelola data drop point" columns={columns} fields={fields}
      emptyText="Belum ada drop point" idKey="id_drop_point" listFn={adminDropPoint.list}
      createFn={adminDropPoint.create} updateFn={adminDropPoint.update} deleteFn={adminDropPoint.delete}
      initialForm={{ nama_drop_point: "", alamat: "", latitude: null, longitude: null, status: "aktif" }} />
  );
}
