"use client";

import { Briefcase } from "lucide-react";
import { KaryawanCrudPage } from "../_components/karyawan-crud";

export default function AdminKaryawanDirekturPage() {
  return (
    <KaryawanCrudPage
      peran="direktur"
      title="Direktur"
      subtitle="Kelola master data karyawan dengan akses Direktur"
      icon={<Briefcase className="h-5 w-5" />}
    />
  );
}
