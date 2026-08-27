"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminDriver, DriverAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Phone } from "lucide-react";

const columns: Column<DriverAdmin>[] = [
  {
    header: "ID",
    accessorKey: "id_driver",
    className: "w-16 tabular-nums text-slate-400 font-mono text-xs",
    render: (r) => <span>#{r.id_driver}</span>,
  },
  {
    header: "Nama Driver",
    accessorKey: "nama_driver",
    render: (r) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-white">{r.nama_driver}</p>
      </div>
    ),
  },
  {
    header: "No HP / Telepon",
    accessorKey: "no_hp",
    render: (r) => (
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        <Phone className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-mono text-xs">{r.no_hp || "—"}</span>
      </div>
    ),
  },
  {
    header: "Status Driver",
    accessorKey: "status_driver",
    render: (r) => <StatusBadge status={r.status_driver === "aktif" ? "aktif" : "off"} />,
  },
];

const fields: FieldConfig[] = [
  { key: "nama_driver", label: "Nama Driver", required: true, placeholder: "Nama lengkap pengemudi" },
  { key: "no_hp", label: "No HP", required: true, placeholder: "081234567890" },
  { key: "no_sim", label: "No SIM", required: true, placeholder: "Nomor Lisensi SIM", createOnly: true },
  {
    key: "jenis_sim",
    label: "Jenis SIM",
    type: "select",
    required: true,
    options: [
      { value: "A", label: "SIM A (Mobil Pribadi/Pickup)" },
      { value: "B1", label: "SIM B1 (Truk Box & Engkel)" },
      { value: "B2", label: "SIM B2 (Truk Tronton & Container)" },
      { value: "C", label: "SIM C (Motor Fleksibel)" },
    ],
    createOnly: true,
  },
  {
    key: "status_driver",
    label: "Status Driver",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif Bertugas" },
      { value: "nonaktif", label: "Nonaktif / Libur" },
    ],
  },
];

export default function AdminDriversPage() {
  return (
    <AdminCrudPage
      title="Driver"
      subtitle="Kelola master data pengemudi armada logistik"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data driver"
      idKey="id_driver"
      listFn={adminDriver.list}
      createFn={adminDriver.create}
      updateFn={adminDriver.update}
      deleteFn={adminDriver.delete}
      initialForm={{ nama_driver: "", no_hp: "", no_sim: "", jenis_sim: "B1", status_driver: "aktif" }}
      statusFilterKey="status_driver"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
