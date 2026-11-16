"use client";

import { ReactNode, useCallback } from "react";
import { AdminCrudPage, Column, FieldConfig } from "./crud-layout";
import { adminKaryawan, KaryawanAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";

const columns: Column<KaryawanAdmin>[] = [
  {
    header: "ID",
    accessorKey: "id_karyawan",
    className: "w-16 tabular-nums text-slate-400 font-mono text-xs",
    render: (r) => <span>#{r.id_karyawan}</span>,
  },
  {
    header: "Nama",
    accessorKey: "nama",
    render: (r) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-white">{r.nama}</p>
        <p className="text-[11px] text-slate-500">{r.jabatan || "—"}</p>
      </div>
    ),
  },
  {
    header: "NIK",
    accessorKey: "nik",
    render: (r) => <span className="font-mono text-xs">{r.nik || "—"}</span>,
  },
  {
    header: "Penempatan",
    accessorKey: "penempatan",
    render: (r) => <span className="text-xs">{r.penempatan || "—"}</span>,
  },
  {
    header: "Shift",
    accessorKey: "shift",
    render: (r) => <span className="text-xs">{r.shift || "—"}</span>,
  },
  {
    header: "Status",
    accessorKey: "status",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

const fields: FieldConfig[] = [
  { key: "sec_info", type: "section-divider", label: "Identitas Karyawan" },
  {
    key: "nama",
    label: "Nama Lengkap",
    required: true,
    placeholder: "Nama lengkap karyawan",
  },
  {
    key: "nik",
    label: "NIK",
    placeholder: "Nomor induk karyawan (opsional)",
  },

  { key: "sec_penempatan", type: "section-divider", label: "Penempatan & Jabatan" },
  {
    key: "jabatan",
    label: "Jabatan",
    placeholder: "cth: Staff Operasional",
  },
  {
    key: "penempatan",
    label: "Penempatan",
    placeholder: "cth: Kantor Pusat",
  },
  {
    key: "tempat_penugasan",
    label: "Tempat Penugasan",
    placeholder: "cth: Tower Control",
  },
  {
    key: "shift",
    label: "Shift",
    type: "select",
    options: [
      { value: "pagi", label: "Pagi" },
      { value: "siang", label: "Siang" },
      { value: "malam", label: "Malam" },
      { value: "non-shift", label: "Non-Shift" },
    ],
  },

  { key: "sec_status", type: "section-divider", label: "Status" },
  {
    key: "status",
    label: "Status Karyawan",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export function KaryawanCrudPage({
  peran,
  title,
  subtitle,
  icon,
}: {
  peran: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  const listFn = useCallback(() => adminKaryawan.list(peran), [peran]);
  const initialForm = {
    nik: "",
    nama: "",
    jabatan: "",
    penempatan: "",
    tempat_penugasan: "",
    shift: "",
    peran,
    status: "aktif",
  };

  return (
    <AdminCrudPage
      title={title}
      subtitle={subtitle}
      modalIcon={icon}
      columns={columns}
      fields={fields}
      emptyText={`Belum ada data ${title.toLowerCase()}`}
      idKey="id_karyawan"
      listFn={listFn}
      createFn={adminKaryawan.create}
      updateFn={adminKaryawan.update}
      deleteFn={adminKaryawan.delete}
      initialForm={initialForm}
      statusFilterKey="status"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
