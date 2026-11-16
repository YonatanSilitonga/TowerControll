"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminKoordinatorGudang, KoordinatorGudangAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Warehouse } from "lucide-react";

const columns: Column<KoordinatorGudangAdmin>[] = [
  {
    header: "ID",
    accessorKey: "id_koor_gudang",
    className: "w-16 tabular-nums text-slate-400 font-mono text-xs",
    render: (r) => <span>#{r.id_koor_gudang}</span>,
  },
  {
    header: "Nama Koordinator",
    accessorKey: "nama",
    render: (r) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-white">{r.nama}</p>
        <p className="text-[11px] text-slate-500">
          {r.nama_gudang ? `Gudang: ${r.nama_gudang}` : r.id_gudang ? `Gudang #${r.id_gudang}` : "Belum ditugaskan"}
        </p>
      </div>
    ),
  },
  {
    header: "No HP",
    accessorKey: "no_hp",
    render: (r) => <span className="font-mono text-xs">{r.no_hp || "—"}</span>,
  },
  {
    header: "Status",
    accessorKey: "status",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

const fields: FieldConfig[] = [
  { key: "sec_info", type: "section-divider", label: "Info Koordinator" },
  {
    key: "nama",
    label: "Nama Lengkap",
    required: true,
    colSpan: 2,
    placeholder: "Nama lengkap koordinator gudang",
  },
  {
    key: "no_hp",
    label: "No HP",
    placeholder: "628xxxxxxxxxx",
  },
  {
    key: "id_gudang",
    label: "ID Gudang",
    type: "number",
    placeholder: "Opsional",
    hint: "Boleh dikosongkan jika belum ditugaskan ke gudang tertentu",
  },

  { key: "sec_status", type: "section-divider", label: "Status" },
  {
    key: "status",
    label: "Status Koordinator",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminKoordinatorGudangPage() {
  return (
    <AdminCrudPage
      title="Koordinator Gudang"
      subtitle="Kelola master data koordinator gudang"
      modalIcon={<Warehouse className="h-5 w-5" />}
      columns={columns}
      fields={fields}
      emptyText="Belum ada data koordinator gudang"
      idKey="id_koor_gudang"
      listFn={adminKoordinatorGudang.list}
      createFn={adminKoordinatorGudang.create}
      updateFn={adminKoordinatorGudang.update}
      deleteFn={adminKoordinatorGudang.delete}
      initialForm={{ nama: "", no_hp: "", id_gudang: null, status: "aktif" }}
      statusFilterKey="status"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
