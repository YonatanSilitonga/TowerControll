"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminGudang, GudangAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Warehouse } from "lucide-react";

const columns: Column<GudangAdmin>[] = [
  {
    header: "ID",
    accessorKey: "id_gudang",
    className: "w-16 tabular-nums text-slate-400 font-mono text-xs",
    render: (r) => <span>#{r.id_gudang}</span>,
  },
  {
    header: "Nama Gudang",
    accessorKey: "nama_gudang",
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 dark:bg-amber-500/10">
          <Warehouse className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{r.nama_gudang}</p>
          <p className="text-[11px] text-slate-500">{r.alamat || "—"}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Kota",
    accessorKey: "kota",
    render: (r) => (
      <span className="text-slate-700 dark:text-slate-300">
        {r.kota || "—"}
      </span>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

const fields: FieldConfig[] = [
  // ── Section: Info Gudang ──
  { key: "sec_info", type: "section-divider", label: "Info Gudang" },
  {
    key: "nama_gudang",
    label: "Nama Gudang",
    required: true,
    placeholder: "cth: Gudang Hub Cikupa",
    colSpan: 1,
  },
  {
    key: "kota",
    label: "Kota",
    placeholder: "cth: Tangerang / Jakarta",
    colSpan: 1,
  },
  {
    key: "alamat",
    label: "Alamat Lengkap",
    type: "textarea",
    colSpan: 2,
    placeholder: "Alamat lengkap lokasi gudang",
  },

  // ── Section: Koordinat ──
  { key: "sec_koordinat", type: "section-divider", label: "Koordinat Lokasi Peta" },
  {
    key: "lokasi",
    label: "Titik Lokasi di Peta",
    type: "coordinates",
    latKey: "latitude",
    lngKey: "longitude",
    colSpan: 2,
    hint: "Koordinat digunakan untuk monitoring dan rute armada",
  },

  // ── Section: Status ──
  { key: "sec_status", type: "section-divider", label: "Status" },
  {
    key: "status",
    label: "Status Gudang",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif (Operasional)" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminGudangPage() {
  return (
    <AdminCrudPage
      title="Gudang"
      subtitle="Kelola master data lokasi gudang & hub operasional"
      modalIcon={<Warehouse className="h-5 w-5" />}
      modalSize="md"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data gudang"
      idKey="id_gudang"
      listFn={adminGudang.list}
      createFn={adminGudang.create}
      updateFn={adminGudang.update}
      deleteFn={adminGudang.delete}
      initialForm={{
        nama_gudang: "",
        kota: "Tangerang",
        alamat: "",
        latitude: -6.21,
        longitude: 106.55,
        status: "aktif",
      }}
      statusFilterKey="status"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
