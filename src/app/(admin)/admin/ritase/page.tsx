"use client";

import { useEffect, useState } from "react";
import { AdminCrudPage, Column, FieldConfig } from "../_components/crud-layout";
import { adminRitase, adminDriver, adminKendaraan, RitaseAdmin, DriverAdmin, KendaraanAdmin } from "@/lib/admin-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Clock, Truck, UserCheck, Calendar } from "lucide-react";

export default function AdminRitasePage() {
  const [drivers, setDrivers] = useState<DriverAdmin[]>([]);
  const [vehicles, setVehicles] = useState<KendaraanAdmin[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [dList, vList] = await Promise.all([adminDriver.list(), adminKendaraan.list()]);
        setDrivers(dList.filter((d) => d.status_driver === "aktif"));
        setVehicles(vList.filter((v) => v.status_kendaraan === "aktif"));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const columns: Column<RitaseAdmin>[] = [
    {
      header: "Kode Ritase",
      accessorKey: "kode_ritase",
      render: (r) => (
        <span className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-amber-400">
          {r.kode_ritase}
        </span>
      ),
    },
    {
      header: "Tanggal Penugasan",
      accessorKey: "tanggal",
      render: (r) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{r.tanggal}</span>
        </div>
      ),
    },
    {
      header: "Driver Assigned",
      accessorKey: "nama_driver",
      render: (r) => (
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white">
          <UserCheck className="h-3.5 w-3.5 text-blue-500" />
          <span>{r.nama_driver}</span>
        </div>
      ),
    },
    {
      header: "Armada Kendaraan",
      accessorKey: "plat_nomor",
      render: (r) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 dark:text-slate-300">
          <Truck className="h-3.5 w-3.5 text-slate-400" />
          <span>{r.plat_nomor}</span>
        </div>
      ),
    },
    {
      header: "Rit ke-",
      accessorKey: "ritase_ke",
      className: "text-center font-mono font-bold text-xs",
      render: (r) => (
        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Rit #{r.ritase_ke || 1}
        </span>
      ),
    },
    {
      header: "Jadwal Jam Operasional",
      render: (r) => (
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>{r.jam_mulai}</span>
          <span className="text-slate-400">s/d</span>
          <span>{r.jam_selesai}</span>
        </div>
      ),
    },
    {
      header: "Status Ritase",
      accessorKey: "status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  const fields: FieldConfig[] = [
    { key: "kode_ritase", label: "Kode Ritase (Auto-Generate)", placeholder: "RIT-20260827-001 (Kosongkan untuk otomatis)" },
    { key: "tanggal", label: "Tanggal Penugasan", type: "date", required: true },
    {
      key: "nama_driver",
      label: "Pilih Driver Aktif",
      type: "select",
      required: true,
      options: drivers.map((d) => ({ value: d.nama_driver, label: `${d.nama_driver} (${d.jenis_sim || "SIM"})` })),
    },
    {
      key: "plat_nomor",
      label: "Pilih Armada Kendaraan",
      type: "select",
      required: true,
      options: vehicles.map((v) => ({ value: v.plat_nomor, label: `${v.plat_nomor} - ${v.jenis_kendaraan || "Truk"}` })),
    },
    {
      key: "ritase_ke",
      label: "Ritase Ke-N",
      type: "number",
      required: true,
      placeholder: "1",
    },
    { key: "jam_mulai", label: "Jam Mulai Operasional", type: "text", required: true, placeholder: "08:00" },
    { key: "jam_selesai", label: "Jam Estimasi Selesai", type: "text", required: true, placeholder: "14:00" },
    {
      key: "status",
      label: "Status Ritase",
      type: "select",
      required: true,
      options: [
        { value: "Draf", label: "Draf (Belum Berangkat)" },
        { value: "Berjalan", label: "Berjalan (Sedang Penugasan)" },
        { value: "Selesai", label: "Selesai (Sampai Tujuan)" },
        { value: "Batal", label: "Batal" },
      ],
    },
  ];

  return (
    <AdminCrudPage
      title="Ritase & Jam Operasional"
      subtitle="Kelola penugasan perjalanan armada, driver, dan jadwal jam keberangkatan/selesai"
      columns={columns}
      fields={fields}
      emptyText="Belum ada data penugasan ritase"
      idKey="id_ritase"
      listFn={adminRitase.list}
      createFn={adminRitase.create}
      updateFn={adminRitase.update}
      deleteFn={adminRitase.delete}
      initialForm={{
        kode_ritase: "",
        tanggal: new Date().toISOString().slice(0, 10),
        nama_driver: drivers[0]?.nama_driver || "Budi Santoso",
        plat_nomor: vehicles[0]?.plat_nomor || "B 1234 SLB",
        ritase_ke: 1,
        jam_mulai: "08:00",
        jam_selesai: "14:00",
        status: "Berjalan",
      }}
      statusFilterKey="status"
      statusFilterOptions={[
        { label: "Draf", value: "Draf" },
        { label: "Berjalan", value: "Berjalan" },
        { label: "Selesai", value: "Selesai" },
        { label: "Batal", value: "Batal" },
      ]}
    />
  );
}
