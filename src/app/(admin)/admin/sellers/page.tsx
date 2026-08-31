"use client";

import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminSeller, SellerAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Store, UserCheck, Phone } from "lucide-react";

const columns: Column<SellerAdmin>[] = [
  {
    header: "Kode",
    accessorKey: "kode_seller",
    render: (r) => (
      <span className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-amber-400">{r.kode_seller}</span>
    ),
  },
  {
    header: "Nama Seller / Toko",
    accessorKey: "nama_seller",
    render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600 dark:bg-purple-500/10">
          <Store className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{r.nama_seller}</p>
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
    header: "PIC & Kontak",
    accessorKey: "pic",
    render: (r) => (
      <div className="text-xs">
        <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
          <UserCheck className="h-3 w-3 text-slate-400" />
          <span>{r.pic || "—"}</span>
        </div>
        {r.no_hp && (
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{r.no_hp}</span>
          </div>
        )}
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
  // ── Section: Info Toko ──
  { key: "sec_info", type: "section-divider", label: "Info Toko" },
  {
    key: "kode_seller",
    label: "Kode Seller",
    placeholder: "cth: SLR-001",
    hint: "Kosongkan untuk generate otomatis",
    colSpan: 1,
  },
  {
    key: "nama_seller",
    label: "Nama Seller / Toko",
    required: true,
    placeholder: "Nama toko pengirim",
    colSpan: 1,
  },

  // ── Section: Lokasi & Area ──
  { key: "sec_lokasi", type: "section-divider", label: "Lokasi & Area" },
  {
    key: "alamat",
    label: "Alamat Lengkap",
    type: "textarea",
    colSpan: 2,
    placeholder: "Alamat gudang / toko seller",
    hint: "Alamat ini digunakan sebagai referensi rute driver",
  },
  { key: "kota", label: "Kota", placeholder: "Tangerang / Jakarta" },
  { key: "area", label: "Area / Kecamatan", placeholder: "Cikupa / Balaraja / Kebon Jeruk" },

  // ── Section: Kontak & Forecast ──
  { key: "sec_kontak", type: "section-divider", label: "Kontak & Forecast" },
  { key: "pic", label: "Nama PIC", placeholder: "Nama penanggung jawab" },
  {
    key: "no_hp",
    label: "No HP PIC",
    placeholder: "081234567890",
    hint: "Nomor yang bisa dihubungi saat pengiriman",
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
    label: "Status Seller",
    type: "select",
    required: true,
    options: [
      { value: "aktif", label: "Aktif (Menerima Pickup)" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
  },
];

export default function AdminSellersPage() {
  return (
    <AdminCrudPage
      title="Seller"
      subtitle="Kelola data seller pengirim & lokasi pickup paket"
      modalIcon={<Store className="h-5 w-5" />}
      modalSize="lg"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data seller"
      idKey="id_seller"
      listFn={adminSeller.list}
      createFn={adminSeller.create}
      updateFn={adminSeller.update}
      deleteFn={adminSeller.delete}
      initialForm={{
        kode_seller: "",
        nama_seller: "",
        alamat: "",
        kota: "Tangerang",
        area: "Banten",
        pic: "",
        no_hp: "",
        forecast_harian: 1000,
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
