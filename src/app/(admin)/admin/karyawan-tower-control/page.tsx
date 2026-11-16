"use client";

import { RadioTower } from "lucide-react";
import { KaryawanCrudPage } from "../_components/karyawan-crud";

export default function AdminKaryawanTowerControlPage() {
  return (
    <KaryawanCrudPage
      peran="tower_control"
      title="Tower Control"
      subtitle="Kelola master data karyawan dengan akses Tower Control"
      icon={<RadioTower className="h-5 w-5" />}
    />
  );
}
