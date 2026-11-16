"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminKendaraan, KendaraanAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { VEHICLE_CAPACITY_RULES, VEHICLE_TYPE_OPTIONS } from "@/lib/vehicle-capacity";
import { Boxes, Package, Truck } from "lucide-react";

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
      <span className="font-semibold text-slate-800 dark:text-slate-200">{r.jenis_kendaraan || "—"}</span>
    ),
  },
  {
    header: "Kapasitas Paket (AWB)",
    accessorKey: "kapasitas_kg",
    className: "tabular-nums",
    render: (r) => (
      <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Boxes className="h-3.5 w-3.5 text-slate-400" />
        <span>{r.kapasitas_kg ? `${r.kapasitas_kg.toLocaleString("id-ID")} paket` : "—"}</span>
      </div>
    ),
  },
  {
    header: "Kapasitas Koli",
    accessorKey: "kapasitas_koli",
    className: "tabular-nums",
    render: (r) => (
      <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Package className="h-3.5 w-3.5 text-slate-400" />
        <span>{r.kapasitas_koli ? `${r.kapasitas_koli.toLocaleString("id-ID")} koli` : "—"}</span>
      </div>
    ),
  },
  {
    header: "Status Armada",
    accessorKey: "status_kendaraan",
    render: (r) => (
      <StatusBadge status={r.status_kendaraan === "aktif" ? "available" : r.status_kendaraan} />
    ),
  },
];

const fields: FieldConfig[] = [
  // ── Section: Data Armada ──
  { key: "sec_armada", type: "section-divider", label: "Data Armada" },
  {
    key: "plat_nomor",
    label: "Plat Nomor",
    required: true,
    placeholder: "B 1234 SLB",
    hint: "Format: [Kode Wilayah] [Angka] [Huruf] · Input otomatis UPPERCASE",
  },
  {
    key: "jenis_kendaraan",
    label: "Jenis Kendaraan",
    type: "select",
    required: true,
    options: VEHICLE_TYPE_OPTIONS,
    onSelect: (value) => {
      const rule = VEHICLE_CAPACITY_RULES[value];
      return {
        kapasitas_kg: rule?.maxAWB ?? 0,
        kapasitas_koli: rule?.maxKoli ?? 0,
      };
    },
    hint: "Menentukan kapasitas paket & koli kendaraan (batas atas)",
  },

  // ── Section: Teknis & Status ──
  { key: "sec_teknis", type: "section-divider", label: "Teknis & Status" },
  {
    key: "kapasitas_kg",
    label: "Kapasitas Paket (AWB)",
    type: "number",
    required: true,
    placeholder: "7000",
    hint: "Batas atas muatan dalam jumlah paket/AWB (bisa diubah manual)",
  },
  {
    key: "kapasitas_koli",
    label: "Kapasitas Koli",
    type: "number",
    unit: "koli",
    placeholder: "60",
    hint: "Batas atas muatan dalam jumlah koli — dikosongkan untuk kendaraan pickup (TRAGA/BV)",
  },
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
      modalIcon={<Truck className="h-5 w-5" />}
      modalSize="md"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data kendaraan"
      idKey="id_kendaraan"
      listFn={adminKendaraan.list}
      createFn={adminKendaraan.create}
      updateFn={adminKendaraan.update}
      deleteFn={adminKendaraan.delete}
      initialForm={{
        plat_nomor: "",
        jenis_kendaraan: "",
        kapasitas_kg: 0,
        kapasitas_koli: 0,
        status_kendaraan: "aktif",
      }}
      statusFilterKey="status_kendaraan"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
