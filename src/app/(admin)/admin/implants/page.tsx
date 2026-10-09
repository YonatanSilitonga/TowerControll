"use client";

import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminImplant, ImplantAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Building2, Phone, Users } from "lucide-react";

const columns: Column<ImplantAdmin>[] = [
  {
    header: "Kode",
    accessorKey: "kode_implant",
    render: (r) => (
      <span className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-amber-400">{r.kode_implant}</span>
    ),
  },
  {
    header: "Nama Implant",
    accessorKey: "nama_implant",
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600 dark:bg-amber-500/10">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{r.nama_implant}</p>
          <p className="text-[11px] text-slate-500">{r.alamat || r.kota || "—"}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Kota & Area",
    accessorKey: "kota",
    render: (r) => (
      <span className="text-slate-700 dark:text-slate-300">
        {r.kota ? `${r.kota}${r.area ? `, ${r.area}` : ""}` : "—"}
      </span>
    ),
  },
  {
    header: "Kontak",
    accessorKey: "no_hp",
    render: (r) => (
      <div className="text-xs">
        {r.no_hp ? (
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{r.no_hp}</span><WhatsAppContact phone={r.no_hp} name={r.nama_implant} compact />
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
          <Users className="h-3 w-3" /> PIC: kapten (atur via menu Kapten)
        </p>
      </div>
    ),
  },
  {
    header: "Forecast (koli/hari)",
    accessorKey: "forecast_harian",
    className: "text-right tabular-nums font-mono text-xs font-semibold",
    render: (r) => (r.forecast_harian ? `${r.forecast_harian.toLocaleString("id-ID")}` : "—"),
  },
  {
    header: "Status",
    accessorKey: "status",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

const fields: FieldConfig[] = [
  // ── Section: Info Implant ──
  { key: "sec_info", type: "section-divider", label: "Info Implant" },
  {
    key: "kode_implant",
    label: "Kode Implant",
    placeholder: "cth: IMP-001",
    hint: "Kosongkan untuk generate otomatis",
    colSpan: 1,
  },
  {
    key: "nama_implant",
    label: "Nama Implant",
    required: true,
    placeholder: "Nama lokasi implant",
    colSpan: 1,
  },

  // ── Section: Lokasi & Area ──
  { key: "sec_lokasi", type: "section-divider", label: "Lokasi & Area" },
  {
    key: "alamat",
    label: "Alamat Lengkap",
    type: "textarea",
    colSpan: 2,
    placeholder: "Alamat lokasi implant",
    hint: "Alamat ini digunakan sebagai referensi rute driver",
  },
  { key: "kota", label: "Kota", placeholder: "Tangerang / Jakarta" },
  { key: "area", label: "Area / Kecamatan", placeholder: "Cikupa / Balaraja / Kebon Jeruk" },

  // ── Section: Kontak & Operasional ──
  { key: "sec_kontak", type: "section-divider", label: "Kontak & Operasional" },
  {
    key: "no_hp",
    label: "No HP Lokasi",
    placeholder: "081234567890",
    hint: "Nomor yang bisa dihubungi saat penjemputan",
  },
  {
    key: "forecast_harian",
    label: "Estimasi Forecast Harian",
    type: "number",
    unit: "koli/hari",
    placeholder: "cth: 1500",
    hint: "Estimasi volume paket keluar per hari untuk perencanaan ritase",
    colSpan: 2,
  },
  {
    key: "jumlah_manpower",
    label: "Jumlah Manpower",
    type: "number",
    placeholder: "cth: 4",
    hint: "Jumlah personil di lokasi implant (masuk agregat dashboard)",
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
    hint: "Digunakan untuk navigasi driver dan visualisasi di dashboard peta",
  },

  // ── Section: Status ──
  { key: "sec_status", type: "section-divider", label: "Status" },
  {
    key: "status",
    label: "Status Implant",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif (Menerima Pickup)" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminImplantsPage() {
  return (
    <AdminCrudPage
      title="Implant"
      subtitle="Kelola data lokasi implant & penanggung jawab kapten"
      modalIcon={<Building2 className="h-5 w-5" />}
      modalSize="lg"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data implant"
      idKey="id_implant"
      listFn={adminImplant.list}
      createFn={adminImplant.create}
      updateFn={adminImplant.update}
      deleteFn={adminImplant.delete}
      initialForm={{
        kode_implant: "",
        nama_implant: "",
        alamat: "",
        kota: "Tangerang",
        area: "Banten",
        no_hp: "",
        forecast_harian: 1000,
        jumlah_manpower: 0,
        latitude: -6.2402,
        longitude: 106.5856,
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
