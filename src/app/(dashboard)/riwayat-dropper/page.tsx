"use client";

import { PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DropperInputPanel } from "@/components/dropper/dropper-input-panel";
import { useAuthStore } from "@/stores/auth-store";

export default function RiwayatDropperPage() {
  const role = useAuthStore((s) => s.user?.role);

  if (role !== "tower_control" && role !== "developer") {
    return (
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Dropper"
          description="Input dan riwayat muatan seller dropper langsung ke gudang."
        />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-sm font-semibold text-slate-800">Akses Ditolak</h2>
          <p className="mt-1 text-xs text-slate-500">
            Hanya Tower Control dan Developer yang dapat mengelola data dropper.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Dropper"
        description="Input muatan seller dropper langsung ke gudang, lengkap dengan rekap per Rit dan riwayat harian."
      />
      <DropperInputPanel />
    </div>
  );
}
