"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminDropPoint, DropPointAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { MapPin, Navigation } from "lucide-react";

const columns: Column<DropPointAdmin>[] = [
  {
    header: "ID",
    accessorKey: "id_drop_point",
    className: "w-16 tabular-nums text-slate-400 font-mono text-xs",
    render: (r) => <span>#{r.id_drop_point}</span>,
  },
  {
    header: "Nama Gateway",
    accessorKey: "nama_drop_point",
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10">
          <Navigation className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{r.nama_drop_point}</p>
          <p className="text-[11px] text-slate-500">{r.alamat || "—"}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Koordinat Lokasi",
    render: (r) =>
      r.latitude && r.longitude ? (
        <a
          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          <MapPin className="h-3 w-3 text-rose-500" />
          {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
        </a>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    header: "Status",
    accessorKey: "status",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

const fields: FieldConfig[] = [
  { key: "nama_drop_point", label: "Nama Gateway", required: true, placeholder: "Contoh: TITIP AJA Gateway Tangerang" },
  { key: "alamat", label: "Alamat Lengkap", type: "textarea", colSpan: 2, placeholder: "Alamat lengkap lokasi gateway" },
  { key: "latitude", label: "Latitude", type: "coordinate", placeholder: "-6.2100" },
  { key: "longitude", label: "Longitude", type: "coordinate", placeholder: "106.5500" },
  {
    key: "status",
    label: "Status Gateway",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif (Menerima Bongkaran)" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminDropPointsPage() {
  return (
    <AdminCrudPage
      title="Gateway"
      subtitle="Kelola master data titik bongkar paket / gateway"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data gateway"
      idKey="id_drop_point"
      listFn={adminDropPoint.list}
      createFn={adminDropPoint.create}
      updateFn={adminDropPoint.update}
      deleteFn={adminDropPoint.delete}
      initialForm={{ nama_drop_point: "", alamat: "", latitude: -6.21, longitude: 106.55, status: "aktif" }}
      statusFilterKey="status"
      statusFilterOptions={[
        { label: "Aktif", value: "aktif" },
        { label: "Nonaktif", value: "nonaktif" },
      ]}
    />
  );
}
