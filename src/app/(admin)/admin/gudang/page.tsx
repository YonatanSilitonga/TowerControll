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
        <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
          <Warehouse className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{r.nama_gudang}</p>
          <p className="text-[11px] text-slate-500">
            {[r.alamat, r.kota].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>
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
    placeholder: "cth: Gudang Outgoing",
    colSpan: 2,
    hint: "Nama ini akan tampil saat pemilihan titik gudang di penjadwalan",
  },
  {
    key: "alamat",
    label: "Alamat Lengkap",
    type: "textarea",
    colSpan: 2,
    placeholder: "Alamat lengkap lokasi gudang",
  },
  {
    key: "kota",
    label: "Kota",
    placeholder: "cth: Tangerang",
    colSpan: 2,
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
    hint: "Koordinat digunakan untuk navigasi otomatis di aplikasi driver",
  },

  // ── Section: Status ──
  { key: "sec_status", type: "section-divider", label: "Status" },
  {
    key: "status",
    label: "Status Gudang",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminGudangPage() {
  return (
    <AdminCrudPage
      title="Gudang"
      subtitle="Kelola master data gudang (outgoing / incoming)"
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
        alamat: "",
        kota: "",
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
