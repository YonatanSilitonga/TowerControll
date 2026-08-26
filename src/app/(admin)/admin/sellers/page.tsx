"use client";
import { AdminCrudPage, Column } from "../_components/crud-layout";
import { adminSeller, SellerAdmin } from "@/lib/admin-api";

const columns: Column<SellerAdmin>[] = [
  { header: "Kode", render: (r) => <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{r.kode_seller}</span> },
  { header: "Nama Seller", render: (r) => r.nama_seller },
  { header: "Kota", render: (r) => r.kota || "—" },
  { header: "Area", render: (r) => r.area || "—" },
  { header: "PIC", render: (r) => r.pic || "—" },
  { header: "No HP", render: (r) => r.no_hp || "—" },
  { header: "Forecast", className: "text-right", render: (r) => <span className="tabular-nums">{r.forecast_harian ?? "—"}</span> },
  { header: "Status", className: "w-24", render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
      r.status === "aktif" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    }`}>{r.status}</span>
  )},
];

const fields = [
  { key: "kode_seller", label: "Kode Seller", required: true, placeholder: "S001" },
  { key: "nama_seller", label: "Nama Seller", required: true, placeholder: "Nama toko" },
  { key: "alamat", label: "Alamat", type: "textarea" as const, placeholder: "Alamat lengkap" },
  { key: "kota", label: "Kota", placeholder: "Kota/Kabupaten" },
  { key: "area", label: "Area", placeholder: "Nama area" },
  { key: "pic", label: "PIC", placeholder: "Nama PIC" },
  { key: "no_hp", label: "No HP", placeholder: "08123456789" },
  { key: "forecast_harian", label: "Forecast Harian", type: "number" as const, placeholder: "Estimasi koli/hari" },
  { key: "latitude", label: "Latitude", type: "number" as const, placeholder: "-6.xxxx" },
  { key: "longitude", label: "Longitude", type: "number" as const, placeholder: "106.xxxx" },
  { key: "status", label: "Status", type: "select" as const, required: true, options: [{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }] },
];

export default function AdminSellersPage() {
  return (
    <AdminCrudPage title="Seller" subtitle="Kelola data seller/toko" columns={columns} fields={fields}
      emptyText="Belum ada seller" idKey="id_seller" listFn={adminSeller.list}
      createFn={adminSeller.create} updateFn={adminSeller.update} deleteFn={adminSeller.delete}
      initialForm={{ kode_seller: "", nama_seller: "", alamat: "", kota: "", area: "", pic: "", no_hp: "", forecast_harian: null, latitude: null, longitude: null, status: "aktif" }} />
  );
}
