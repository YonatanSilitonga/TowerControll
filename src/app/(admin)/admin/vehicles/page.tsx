"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminKendaraan, KendaraanAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Weight } from "lucide-react";

const columns: Column<KendaraanAdmin>[] = [
  {
    header: "ID",
    accessorKey: "id_kendaraan",
    className: "w-16 tabular-nums text-slate-400 font-mono text-xs",
    render: (r) => <span>#{r.id_kendaraan}</span>,
  },
  {
    header: "Plat Nomor",
    accessorKey: "plat_nomor",
    render: (r) => (
      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0c1e3a] dark:text-white">
        <Truck className="h-4 w-4 text-slate-400" />
        <span>{r.plat_nomor}</span>
      </div>
    ),
  },
  {
    header: "Jenis Kendaraan",
    accessorKey: "jenis_kendaraan",
    render: (r) => (
      <span className="font-semibold text-slate-800 dark:text-slate-200">
        {r.jenis_kendaraan || "—"}
      </span>
    ),
  },
  {
    header: "Kapasitas (kg)",
    accessorKey: "kapasitas_kg",
    className: "tabular-nums",
    render: (r) => (
      <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Weight className="h-3.5 w-3.5 text-slate-400" />
        <span>{r.kapasitas_kg ? `${r.kapasitas_kg.toLocaleString("id-ID")} kg` : "—"}</span>
      </div>
    ),
  },
  {
    header: "Status Armada",
    accessorKey: "status_kendaraan",
    render: (r) => <StatusBadge status={r.status_kendaraan === "aktif" ? "available" : r.status_kendaraan} />,
  },
];

const fields: FieldConfig[] = [
  { key: "plat_nomor", label: "Plat Nomor", required: true, placeholder: "B 1234 SLB" },
  {
    key: "jenis_kendaraan",
    label: "Jenis Kendaraan",
    type: "select",
    required: true,
    options: [
      { value: "Truk Box 6m", label: "Truk Box 6m" },
      { value: "Truk Wingbox 8m", label: "Truk Wingbox 8m" },
      { value: "Truk Tronton", label: "Truk Tronton" },
      { value: "Pickup Double", label: "Pickup Double" },
      { value: "Blind Van", label: "Blind Van" },
    ],
  },
  { key: "kapasitas_kg", label: "Kapasitas Maksimal (kg)", type: "number", required: true, placeholder: "Contoh: 8000" },
  {
    key: "status_kendaraan",
    label: "Status Kendaraan",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif / Ready Jalan" },
      { value: "maintenance", label: "Maintenance / Bengkel" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminVehiclesPage() {
  return (
    <AdminCrudPage
      title="Kendaraan"
      subtitle="Kelola master data armada kendaraan operasional"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data kendaraan"
      idKey="id_kendaraan"
      listFn={adminKendaraan.list}
      createFn={adminKendaraan.create}
      updateFn={adminKendaraan.update}
      deleteFn={adminKendaraan.delete}
      initialForm={{ plat_nomor: "", jenis_kendaraan: "Truk Box 6m", kapasitas_kg: 8000, status_kendaraan: "aktif" }}
      statusFilterKey="status_kendaraan"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
