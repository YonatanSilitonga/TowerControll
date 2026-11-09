"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Settings, Zap } from "lucide-react";
import {
  useAdminMasterOptions,
  useAdminRitase,
  useDeleteRitase,
} from "@/hooks/use-admin-ritase";
import { useDriver } from "@/hooks/use-armada";
import { useTrackingMap } from "@/hooks/use-tracking";
import { useAuthStore } from "@/stores/auth-store";
import { swal } from "@/lib/swal";
import { cn } from "@/lib/utils";
import { ApiError } from "@/types/api";
import type { AdminRitaseItem } from "@/types/armada";
import { PageHeader } from "@/components/layout/page-header";
import { PengaturanDialog } from "@/components/jadwal/pengaturan-dialog";
import { JadwalStatsCards } from "@/components/jadwal/jadwal-stats-cards";
import { JadwalToolbar } from "@/components/jadwal/jadwal-toolbar";
import { JadwalList } from "@/components/jadwal/jadwal-list";
import { GenerateRitaseModal } from "@/components/jadwal/modals/generate-ritase-modal";
import { CreateRitaseModal } from "@/components/jadwal/modals/create-ritase-modal";
import { EditRitaseModal } from "@/components/jadwal/modals/edit-ritase-modal";
import { ManifestLightbox } from "@/components/jadwal/manifest-lightbox";
import { MutationError } from "@/components/jadwal/mutation-error";

export default function JadwalPage() {
  const trackingMap = useTrackingMap();
  const locationLookup = useMemo(() => {
    const lk = new Map<string, [number, number]>();
    for (const s of trackingMap.data?.sellers ?? []) {
      lk.set("seller_" + s.id_seller, [s.latitude, s.longitude]);
    }
    for (const s of trackingMap.data?.implants ?? []) {
      lk.set("implant_" + s.id_implant, [s.latitude, s.longitude]);
    }
    for (const s of trackingMap.data?.implant_points ?? []) {
      lk.set("implant_" + s.id_implant, [s.latitude, s.longitude]);
    }
    for (const g of trackingMap.data?.gudang ?? []) {
      lk.set("gudang_" + g.id_gudang, [g.latitude, g.longitude]);
    }
    for (const d of trackingMap.data?.drop_points ?? []) {
      lk.set("dp_" + d.id_drop_point, [d.latitude, d.longitude]);
    }
    return lk;
  }, [
    trackingMap.data?.sellers,
    trackingMap.data?.implants,
    trackingMap.data?.implant_points,
    trackingMap.data?.gudang,
    trackingMap.data?.drop_points,
  ]);

  const { data: contactDrivers } = useDriver();
  const currentUser = useAuthStore((s) => s.user);
  const isWhisnu = currentUser?.username?.toLowerCase() === "whisnu";

  const getNDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  const todayStr = getNDaysAgo(0);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const isDatePast = selectedDate < todayStr;
  const [searchQuery] = useState<string>("");
  const [ritaseFilter, setRitaseFilter] = useState<string>("all");
  const [jenisFilter, setJenisFilter] = useState<string>("outgoing");

  const ritaseOptions = useMemo(() => {
    const base = ["all"];
    if (jenisFilter === "outgoing") return [...base, "1", "2", "3"];
    return [...base, "1", "2", "3", "4"];
  }, [jenisFilter]);

  useEffect(() => {
    if (
      jenisFilter === "outgoing" &&
      !["all", "1", "2", "3"].includes(ritaseFilter)
    ) {
      setRitaseFilter("all");
    }
  }, [jenisFilter]);

  // Modal states
  const [showPengaturan, setShowPengaturan] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingRitase, setEditingRitase] = useState<AdminRitaseItem | null>(null);
  const [selectedFoto, setSelectedFoto] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Fetch data
  const { data: masterOptions } = useAdminMasterOptions();
  const {
    data: ritases,
    isLoading,
    isError,
    refetch,
  } = useAdminRitase(selectedDate);
  const deleteMutation = useDeleteRitase();

  const implantOptions = masterOptions?.implant_points ?? [];
  const defaultImplantPoint = implantOptions.find(
    (s) => s.has_coordinate !== false,
  );

  const activeDrivers = useMemo(() => {
    if (!masterOptions?.drivers) return [];
    // Izinkan seluruh driver transporter / linehaul aktif (kecualikan driver pickup & status nonaktif)
    const byRole = masterOptions.drivers.filter((d) => {
      const jab = (d.jabatan ?? "").toLowerCase().trim();
      const st = (d.status_driver ?? "").toLowerCase().trim();
      if (st === "nonaktif" || st === "inactive") return false;
      if (jab.includes("pickup") || jab === "driver_pickup") return false;
      return true;
    });
    const filtered = byRole.filter((d) =>
      ["aktif", "bertugas", "on_duty", "standby", "tersedia", ""].includes(
        (d.status_driver ?? "").toLowerCase().trim(),
      ),
    );
    return filtered.length > 0 ? filtered : byRole.length > 0 ? byRole : masterOptions.drivers;
  }, [masterOptions?.drivers]);

  const activeVehicles = useMemo(() => {
    if (!masterOptions?.kendaraan) return [];
    const filtered = masterOptions.kendaraan.filter((k) =>
      [
        "tersedia",
        "berjalan",
        "available",
        "in_transit",
        "aktif",
        "standby",
      ].includes((k.status_kendaraan ?? "").toLowerCase().trim()),
    );
    return filtered.length > 0 ? filtered : masterOptions.kendaraan;
  }, [masterOptions?.kendaraan]);

  const errMsg = (e: unknown) => {
    const raw = e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.";
    if (/ERROR:|SQLSTATE|violates foreign key|input_kapten/i.test(raw)) {
      return "Ritase tidak bisa dihapus karena masih ada data kapten / penjemputan yang terhubung. Batalkan penautan terlebih dahulu.";
    }
    return raw;
  };

  const handleDelete = async (idRitase: number, kode: string) => {
    const confirmed = await swal.confirm(
      "Hapus Ritase?",
      `Ritase ${kode} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      "Ya, Hapus",
    );
    if (!confirmed) return;

    deleteMutation.mutate(idRitase, {
      onSuccess: () => {
        swal.success("Berhasil!", `Ritase ${kode} berhasil dihapus.`);
        refetch();
      },
      onError: (e) => {
        swal.error("Gagal menghapus", errMsg(e));
      },
    });
  };

  const filteredRitases = (ritases ?? [])
    .filter((r) => {
      const matchSearch =
        searchQuery === "" ||
        r.nama_driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nopol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.kode_ritase.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRitase =
        ritaseFilter === "all" || String(r.ritase_ke) === ritaseFilter;
      const matchJenis =
        jenisFilter === "all" ||
        (jenisFilter === "outgoing" && r.jenis_ritase === "outgoing") ||
        (jenisFilter === "incoming" && r.jenis_ritase === "incoming");
      return matchSearch && matchRitase && matchJenis;
    })
    .sort((a, b) => a.nama_driver.localeCompare(b.nama_driver));

  const totalRitase = ritases?.length ?? 0;
  const uniqueDrivers = new Set(ritases?.map((r) => r.id_driver)).size;
  const inProgress =
    ritases?.filter((r) => r.status === "berjalan" || r.status === "proses")
      .length ?? 0;
  const completed = ritases?.filter((r) => r.status === "selesai").length ?? 0;
  const outgoingCount =
    ritases?.filter((r) => r.jenis_ritase === "outgoing").length ?? 0;
  const incomingCount =
    ritases?.filter((r) => r.jenis_ritase === "incoming").length ?? 0;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <PageHeader
        title="Manajemen Jadwal Ritase"
        description="Kelola penugasan rute armada, pilih driver & lokasi terdaftar database, dan generate rute harian 1 klik."
        crumbs={[{ label: "Jadwal Ritase" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPengaturan(true)}
              className={cn(
                "inline-flex items-center justify-center rounded-md border p-2 transition-all duration-200 ease-out hover:scale-[1.06] active:scale-[0.96]",
                showPengaturan
                  ? "border-[#0c1e3a] bg-[#0c1e3a] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white",
              )}
              title="Pengaturan Jadwal"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isDatePast}
              onClick={() => {
                if (isDatePast) return;
                setShowGenerateModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0c1e3a] px-5 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-[#16335a] hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Zap className="h-4 w-4" />
              <span>Generate Otomatis</span>
            </button>
          </div>
        }
      />

      {/* Warning tanggal lalu */}
      {isDatePast && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Tanggal yang dipilih sudah berlalu. Tidak bisa generate atau membuat
            jadwal baru.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <JadwalStatsCards
        totalRitase={totalRitase}
        uniqueDrivers={uniqueDrivers}
        inProgress={inProgress}
        completed={completed}
      />

      {/* Toolbar Filter */}
      <JadwalToolbar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        jenisFilter={jenisFilter}
        setJenisFilter={setJenisFilter}
        ritaseFilter={ritaseFilter}
        setRitaseFilter={setRitaseFilter}
        outgoingCount={outgoingCount}
        incomingCount={incomingCount}
        ritaseOptions={ritaseOptions}
        isDatePast={isDatePast}
        onOpenCreateModal={() => setShowCreateModal(true)}
      />

      {deleteMutation.error && <MutationError error={deleteMutation.error} />}

      {/* List Ritase */}
      <JadwalList
        isLoading={isLoading}
        isError={isError}
        ritases={filteredRitases}
        selectedDate={selectedDate}
        todayStr={todayStr}
        isWhisnu={isWhisnu}
        contactDrivers={contactDrivers}
        locationLookup={locationLookup}
        onOpenGenerateModal={() => setShowGenerateModal(true)}
        onEditRitase={(r) => setEditingRitase(r)}
        onDeleteRitase={handleDelete}
        onSelectFoto={setSelectedFoto}
      />

      {/* Modals */}
      <PengaturanDialog
        open={showPengaturan}
        onClose={() => setShowPengaturan(false)}
      />

      <GenerateRitaseModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        selectedDate={selectedDate}
        masterOptions={masterOptions}
        implantOptions={implantOptions}
        defaultImplantPoint={defaultImplantPoint}
        activeDrivers={activeDrivers}
        activeVehicles={activeVehicles}
        onSuccess={() => refetch()}
      />

      <CreateRitaseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        selectedDate={selectedDate}
        todayStr={todayStr}
        masterOptions={masterOptions}
        implantOptions={implantOptions}
        defaultImplantPoint={defaultImplantPoint}
        activeDrivers={activeDrivers}
        activeVehicles={activeVehicles}
        existingRitases={ritases}
        onSuccess={() => refetch()}
      />

      <EditRitaseModal
        ritase={editingRitase}
        onClose={() => setEditingRitase(null)}
        masterOptions={masterOptions}
        implantOptions={implantOptions}
        defaultImplantPoint={defaultImplantPoint}
        activeDrivers={activeDrivers}
        activeVehicles={activeVehicles}
        isWhisnu={isWhisnu}
        onSuccess={() => refetch()}
      />

      <ManifestLightbox
        foto={selectedFoto}
        onClose={() => setSelectedFoto(null)}
      />
    </div>
  );
}
