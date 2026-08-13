"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import {
  type PreviewRoute,
  useAdminMasterOptions,
  useAdminRitase,
  useCreateRitase,
  useDeleteRitase,
  useGenerateDailyRitase,
  usePreviewDailyRitase,
  useUpdateRitase,
} from "@/hooks/use-admin-ritase";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { ApiError } from "@/types/api";
import type { AdminRitaseItem, AdminRitaseStop } from "@/types/armada";

export default function JadwalPage() {
  const getNDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };

  const todayStr = getNDaysAgo(0);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingRitase, setEditingRitase] = useState<AdminRitaseItem | null>(null);
  const [successToast, setSuccessToast] = useState<{ show: boolean; message: string; count?: number }>({ show: false, message: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; idRitase: number | null; kode: string }>({ show: false, idRitase: null, kode: "" });

  const showSuccessToast = (message: string, count?: number) => {
    setSuccessToast({ show: true, message, count });
    setTimeout(() => setSuccessToast({ show: false, message: "" }), 4500);
  };

  // Fetch Master Data Options (Drivers, Vehicles, Sellers, Drop Points, Gudangs)
  const { data: masterOptions } = useAdminMasterOptions();

  // New manual ritase state
  const [newRitase, setNewRitase] = useState<{
    tanggal: string;
    id_driver: number;
    id_kendaraan: number;
    id_drop_point: number;
    ritase_ke: number;
    stops: AdminRitaseStop[];
  }>({
    tanggal: todayStr,
    id_driver: 1,
    id_kendaraan: 1,
    id_drop_point: 1,
    ritase_ke: 1,
    stops: [
      { id_stop: 1, urutan: 1, jenis_stop: "gudang", id_gudang: 1, nama_lokasi: "Gudang 1", keterangan: "Mulai dari Gudang 1" },
      { id_stop: 2, urutan: 2, jenis_stop: "drop_point", id_drop_point: 1, nama_lokasi: "Drop Point 1", keterangan: "Tujuan akhir Drop Point" },
    ],
  });

  const { data: ritases, isLoading, isError, refetch } = useAdminRitase(selectedDate);
  const { data: previewData, isFetching: isFetchingPreview, refetch: fetchPreview } = usePreviewDailyRitase();
  const generateMutation = useGenerateDailyRitase();
  const createMutation = useCreateRitase();
  const updateMutation = useUpdateRitase();
  const deleteMutation = useDeleteRitase();

  const [editableRoutes, setEditableRoutes] = useState<PreviewRoute[]>([]);

  useEffect(() => {
    if (previewData?.routes) {
      setEditableRoutes(JSON.parse(JSON.stringify(previewData.routes)));
    }
  }, [previewData]);

  const handleDriverChange = (routeIdx: number, driverId: number) => {
    const updated = [...editableRoutes];
    const driver = masterOptions?.drivers.find((d) => d.id_driver === driverId);
    updated[routeIdx].id_driver = driverId;
    updated[routeIdx].nama_driver = driver?.nama_driver || `Driver #${driverId}`;
    setEditableRoutes(updated);
  };

  const handleVehicleChange = (routeIdx: number, vehicleId: number) => {
    const updated = [...editableRoutes];
    const vehicle = masterOptions?.kendaraan.find((v) => v.id_kendaraan === vehicleId);
    updated[routeIdx].id_kendaraan = vehicleId;
    updated[routeIdx].plat_nomor = vehicle?.plat_nomor || `Plat #${vehicleId}`;
    setEditableRoutes(updated);
  };

  const handleRitaseKeChange = (routeIdx: number, ritaseKe: number) => {
    const updated = [...editableRoutes];
    updated[routeIdx].ritase_ke = ritaseKe;
    setEditableRoutes(updated);
  };

  const handleRemoveRoute = (routeIdx: number) => {
    setEditableRoutes(editableRoutes.filter((_, idx) => idx !== routeIdx));
  };

  const handleAddRoute = () => {
    const defaultDriver = masterOptions?.drivers[0];
    const defaultVehicle = masterOptions?.kendaraan[0];
    const defaultGudang = masterOptions?.gudangs[0];
    const defaultDp = masterOptions?.drop_points[0];

    const newRoute: PreviewRoute = {
      id_driver: defaultDriver?.id_driver ?? 1,
      nama_driver: defaultDriver?.nama_driver ?? "Driver #1",
      id_kendaraan: defaultVehicle?.id_kendaraan ?? 1,
      plat_nomor: defaultVehicle?.plat_nomor ?? "B 1234 ABC",
      ritase_ke: 1,
      stops: [
        {
          urutan: 1,
          jenis_stop: "gudang",
          id_lokasi: defaultGudang?.id_gudang ?? 1,
          nama_lokasi: defaultGudang?.nama_gudang ?? "Gudang Utama",
          keterangan: "Muat barang",
        },
        {
          urutan: 2,
          jenis_stop: "drop_point",
          id_lokasi: defaultDp?.id_drop_point ?? 1,
          nama_lokasi: defaultDp?.nama_drop_point ?? "Drop Point 1",
          keterangan: "Bongkar barang",
        },
      ],
    };
    setEditableRoutes([...editableRoutes, newRoute]);
  };

  const handleStopTypeChange = (routeIdx: number, stopIdx: number, newJenis: string) => {
    const updated = [...editableRoutes];
    const stop = updated[routeIdx].stops[stopIdx];
    stop.jenis_stop = newJenis;

    if (newJenis === "gudang") {
      const g = masterOptions?.gudangs[0];
      stop.id_lokasi = g?.id_gudang ?? 1;
      stop.nama_lokasi = g?.nama_gudang ?? "Gudang";
    } else if (newJenis === "seller") {
      const s = masterOptions?.sellers[0];
      stop.id_lokasi = s?.id_seller ?? 1;
      stop.nama_lokasi = s?.nama_seller ?? "Seller";
    } else {
      const dp = masterOptions?.drop_points[0];
      stop.id_lokasi = dp?.id_drop_point ?? 1;
      stop.nama_lokasi = dp?.nama_drop_point ?? "Drop Point";
    }
    setEditableRoutes(updated);
  };

  const handleStopLocationChange = (routeIdx: number, stopIdx: number, idLokasi: number) => {
    const updated = [...editableRoutes];
    const stop = updated[routeIdx].stops[stopIdx];
    stop.id_lokasi = idLokasi;

    if (stop.jenis_stop === "gudang") {
      const item = masterOptions?.gudangs.find((g) => g.id_gudang === idLokasi);
      stop.nama_lokasi = item?.nama_gudang || "Gudang";
    } else if (stop.jenis_stop === "seller") {
      const item = masterOptions?.sellers.find((s) => s.id_seller === idLokasi);
      stop.nama_lokasi = item?.nama_seller || "Seller";
    } else {
      const item = masterOptions?.drop_points.find((dp) => dp.id_drop_point === idLokasi);
      stop.nama_lokasi = item?.nama_drop_point || "Drop Point";
    }
    setEditableRoutes(updated);
  };

  const handleStopKeteranganChange = (routeIdx: number, stopIdx: number, ket: string) => {
    const updated = [...editableRoutes];
    updated[routeIdx].stops[stopIdx].keterangan = ket;
    setEditableRoutes(updated);
  };

  const handlePreviewAddStop = (routeIdx: number) => {
    const updated = [...editableRoutes];
    const route = updated[routeIdx];
    const defaultGudang = masterOptions?.gudangs[0];
    route.stops.push({
      urutan: route.stops.length + 1,
      jenis_stop: "gudang",
      id_lokasi: defaultGudang?.id_gudang ?? 1,
      nama_lokasi: defaultGudang?.nama_gudang ?? "Gudang",
      keterangan: "Stop tambahan",
    });
    setEditableRoutes(updated);
  };

  const handlePreviewRemoveStop = (routeIdx: number, stopIdx: number) => {
    const updated = [...editableRoutes];
    updated[routeIdx].stops = updated[routeIdx].stops
      .filter((_: unknown, idx: number) => idx !== stopIdx)
      .map((s: PreviewRoute["stops"][0], idx: number) => ({ ...s, urutan: idx + 1 }));
    setEditableRoutes(updated);
  };

  const handleGenerate = () => {
    const payload = {
      routes: editableRoutes.map((r: PreviewRoute) => ({
        id_driver: Number(r.id_driver),
        id_kendaraan: Number(r.id_kendaraan),
        id_drop_point: Number(
          r.stops.find((s) => s.jenis_stop === "drop_point" || s.jenis_stop === "gateway")?.id_lokasi ?? 1
        ),
        ritase_ke: Number(r.ritase_ke),
        stops: r.stops.map((s, idx: number) => ({
          urutan: idx + 1,
          jenis_stop: s.jenis_stop,
          id_lokasi: Number(s.id_lokasi ?? 1),
          keterangan: s.keterangan || "",
        })),
      })),
    };

    generateMutation.mutate(payload, {
      onSuccess: (data) => {
        setShowGenerateModal(false);
        const count = (data as { generated?: number })?.generated ?? editableRoutes.length;
        showSuccessToast("Jadwal berhasil dibuat!", count);
        refetch();
      },
    });
  };

  const handleDelete = (idRitase: number, kode: string) => {
    setDeleteConfirm({ show: true, idRitase, kode });
  };

  const confirmDelete = () => {
    if (deleteConfirm.idRitase !== null) {
      deleteMutation.mutate(deleteConfirm.idRitase);
    }
    setDeleteConfirm({ show: false, idRitase: null, kode: "" });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRitase) return;

    const reindexedStops = (editingRitase.stops ?? []).map((s, idx) => ({
      ...s,
      urutan: idx + 1,
      // Wajib: backend baca id_lokasi per stop (gudang→id_gudang, seller→id_seller, else→id_drop_point).
      id_lokasi:
        s.jenis_stop === "gudang"
          ? s.id_gudang
          : s.jenis_stop === "seller"
            ? s.id_seller
            : s.id_drop_point,
    }));

    updateMutation.mutate(
      {
        idRitase: editingRitase.id_ritase,
        data: {
          id_driver: editingRitase.id_driver,
          id_kendaraan: editingRitase.id_kendaraan,
          id_drop_point: editingRitase.id_drop_point,
          ritase_ke: editingRitase.ritase_ke,
          status: editingRitase.status,
          stops: reindexedStops,
        },
      },
      {
        onSuccess: () => {
          setEditingRitase(null);
        },
      }
    );
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const reindexedStops = newRitase.stops.map((s, idx) => ({
      ...s,
      urutan: idx + 1,
      id_lokasi:
        s.jenis_stop === "gudang"
          ? s.id_gudang
          : s.jenis_stop === "seller"
            ? s.id_seller
            : s.id_drop_point,
    }));

    createMutation.mutate(
      {
        tanggal: newRitase.tanggal,
        id_driver: newRitase.id_driver,
        id_kendaraan: newRitase.id_kendaraan,
        id_drop_point: newRitase.id_drop_point,
        ritase_ke: newRitase.ritase_ke,
        stops: reindexedStops,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
        },
      }
    );
  };

  // Helper functions for Editing Stops
  const handleAddStop = (isEdit: boolean) => {
    const defaultSeller = masterOptions?.sellers[0];
    const newStop: AdminRitaseStop = {
      id_stop: Date.now(),
      urutan: 0, // dihitung ulang saat submit
      jenis_stop: "seller",
      id_seller: defaultSeller?.id_seller ?? 1,
      nama_lokasi: defaultSeller?.nama_seller ?? "Seller 1",
      keterangan: "Singgah / Ambil paket",
    };

    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: [...(cur.stops ?? []), newStop] } : cur
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: [...cur.stops, newStop] }));
    }
  };

  const handleRemoveStop = (isEdit: boolean, index: number) => {
    if (isEdit) {
      setEditingRitase((cur) =>
        cur
          ? { ...cur, stops: (cur.stops ?? []).filter((_, i) => i !== index) }
          : cur
      );
    } else {
      setNewRitase((cur) => ({
        ...cur,
        stops: cur.stops.filter((_, i) => i !== index),
      }));
    }
  };

  const handleMoveStop = (isEdit: boolean, index: number, direction: "up" | "down") => {
    const move = (stops: AdminRitaseStop[]) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= stops.length) return stops;
      const arr = [...stops];
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr;
    };
    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: move(cur.stops ?? []) } : cur
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: move(cur.stops) }));
    }
  };

  const handleUpdateStopField = (isEdit: boolean, index: number, field: keyof AdminRitaseStop, value: any) => {
    const upd = (stops: AdminRitaseStop[]) =>
      stops.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: upd(cur.stops ?? []) } : cur
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: upd(cur.stops) }));
    }
  };

  // Select location from database dropdown — pakai functional updater biar
  // perubahan jenis_stop & lokasi gak saling menimpa (stale closure).
  const handleSelectLocationOption = (isEdit: boolean, index: number, selectedId: number) => {
    const resolve = (currentStop: AdminRitaseStop): AdminRitaseStop => {
      let updatedName = "";
      let idSeller: number | undefined;
      let idGudang: number | undefined;
      let idDropPoint: number | undefined;

      if (currentStop.jenis_stop === "seller") {
        idSeller = selectedId;
        const found = masterOptions?.sellers.find((s) => s.id_seller === selectedId);
        updatedName = found?.nama_seller ?? `Seller #${selectedId}`;
      } else if (currentStop.jenis_stop === "gudang") {
        idGudang = selectedId;
        const found = masterOptions?.gudangs.find((g) => g.id_gudang === selectedId);
        updatedName = found?.nama_gudang ?? `Gudang #${selectedId}`;
      } else {
        idDropPoint = selectedId;
        const found = masterOptions?.drop_points.find((dp) => dp.id_drop_point === selectedId);
        updatedName = found?.nama_drop_point ?? `Drop Point #${selectedId}`;
      }

      return {
        ...currentStop,
        id_seller: idSeller,
        id_gudang: idGudang,
        id_drop_point: idDropPoint,
        nama_lokasi: updatedName,
      };
    };

    const upd = (stops: AdminRitaseStop[]) =>
      stops.map((s, i) => (i === index ? resolve(s) : s));

    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: upd(cur.stops ?? []) } : cur
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: upd(cur.stops) }));
    }
  };

  // Filter ritases
  const filteredRitases = (ritases ?? []).filter((r) => {
    const matchSearch =
      r.nama_driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nopol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.kode_ritase.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === "all" || r.status.toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  const totalRitase = ritases?.length ?? 0;
  const uniqueDrivers = new Set(ritases?.map((r) => r.id_driver)).size;
  const inProgress = ritases?.filter((r) => r.status === "berjalan" || r.status === "proses").length ?? 0;
  const completed = ritases?.filter((r) => r.status === "selesai").length ?? 0;

  return (
    <div className="space-y-4 pb-8">
      {/* ── HEADER (PageHeader + breadcrumb + actions) ── */}
      <PageHeader
        title="Manajemen Jadwal Ritase"
        description="Kelola penugasan rute armada, pilih driver & lokasi terdaftar database, dan generate rute harian 1-klik."
        crumbs={[{ label: "Jadwal Ritase" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Buat Jadwal Manual */}
            <button
              type="button"
              onClick={() => {
                setNewRitase({
                  ...newRitase,
                  tanggal: selectedDate,
                  id_driver: masterOptions?.drivers[0]?.id_driver ?? 1,
                  id_kendaraan: masterOptions?.kendaraan[0]?.id_kendaraan ?? 1,
                  id_drop_point: masterOptions?.drop_points[0]?.id_drop_point ?? 1,
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 text-slate-400" />
              <span>Buat Jadwal Manual</span>
            </button>

            {/* Tombol Utama: 1-Klik Generate Otomatis */}
            <button
              type="button"
              onClick={() => {
                setShowGenerateModal(true);
                fetchPreview();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0c1e3a] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16335a]"
            >
              <Zap className="h-4 w-4" />
              <span>Buat Otomatis Seluruh Jadwal</span>
            </button>
          </div>
        }
      />

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Ritase ({selectedDate === todayStr ? "Hari Ini" : selectedDate})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{totalRitase}</p>
          <p className="mt-1 text-xs text-slate-500">Tugas ritase terdaftar</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Driver Ditugaskan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{uniqueDrivers}</p>
          <p className="mt-1 text-xs text-slate-500">Driver bertugas aktif</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dalam Perjalanan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{inProgress}</p>
          <p className="mt-1 text-xs text-slate-500">Armada sedang jalan</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ritase Selesai
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{completed}</p>
          <p className="mt-1 text-xs text-slate-500">Rute selesai dikerjakan</p>
        </div>
      </div>

      {/* ── FILTER, QUICK DATE SELECTOR, & SEARCH BAR ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Selector Buttons */}
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                selectedDate === todayStr
                  ? "bg-[#0c1e3a] text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getNDaysAgo(1))}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                selectedDate === getNDaysAgo(1)
                  ? "bg-[#0c1e3a] text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getNDaysAgo(2))}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                selectedDate === getNDaysAgo(2)
                  ? "bg-[#0c1e3a] text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              2 Hari Lalu
            </button>
          </div>

          {/* Tanggal Picker Custom */}
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
            <CalendarIcon className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-200"
            />
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari driver, nopol, kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            {["all", "direncanakan", "berjalan", "selesai"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all",
                  statusFilter === status
                    ? "bg-[#0c1e3a] text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                {status === "all" ? "Semua" : status}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── ERROR DELETE (page-level) ── */}
      {deleteMutation.error && <MutationError error={deleteMutation.error} />}

      {/* ── SCHEDULE CARDS LIST ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            <span className="text-sm font-medium">Memuat jadwal ritase...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
          <p className="text-sm font-medium">Gagal memuat jadwal ritase. Silakan coba refresh.</p>
        </div>
      ) : filteredRitases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            Tidak Ada Jadwal Ritase Untuk Tanggal Ini ({selectedDate})
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {selectedDate === todayStr
              ? 'Klik tombol "Generate Otomatis (1-Klik)" di atas untuk membuatkan rute tetap untuk seluruh driver hari ini.'
              : "Pilih tanggal lain di bagian filter untuk melihat riwayat rute terdahulu."}
          </p>
          {selectedDate === todayStr && (
            <button
              type="button"
              onClick={() => {
                setShowGenerateModal(true);
                fetchPreview();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0c1e3a] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#16335a]"
            >
              <Zap className="h-3.5 w-3.5" /> Generate Sekarang (1-Klik)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRitases.map((r) => (
            <div
              key={r.id_ritase}
              className="group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0c1e3a] dark:text-slate-400">
                        {r.kode_ritase}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Ritase ke-{r.ritase_ke}
                      </span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {r.nama_driver}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.jabatan_driver} • Nopol: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.nopol}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <StatusBadge status={r.status} />

                    {/* Action Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingRitase(r)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Edit Rute & Status"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* Delete action */}
                    {r.status !== "selesai" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id_ritase, r.kode_ritase)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                        title="Hapus Ritase"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Stops */}
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Urutan Rute Perjalanan ({(r.stops ?? []).length} Stop):
                  </p>
                  <div className="relative pl-4 space-y-2.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {(r.stops ?? []).map((stop) => (
                      <div key={stop.id_stop} className="relative flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#0c1e3a] text-[10px] font-bold text-white">
                            {stop.urutan}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {stop.nama_lokasi}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 uppercase dark:bg-slate-800">
                            {stop.jenis_stop}
                          </span>
                        </div>
                        {stop.keterangan && (
                          <span className="text-[11px] text-slate-400 italic">
                            {stop.keterangan}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
                <span>Tujuan Akhir: <strong className="text-slate-600 dark:text-slate-300">{r.nama_drop_point}</strong></span>
                <span>Tanggal: {r.tanggal}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL BUAT JADWAL MANUAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-lg bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  + Buat Jadwal Ritase Manual
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih driver & lokasi terdaftar di database untuk alokasi tugas ritase baru
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tanggal Perjalanan
                  </label>
                  <input
                    type="date"
                    value={newRitase.tanggal}
                    onChange={(e) => setNewRitase({ ...newRitase, tanggal: e.target.value })}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pilih Driver
                  </label>
                  <select
                    value={newRitase.id_driver}
                    onChange={(e) => setNewRitase({ ...newRitase, id_driver: parseInt(e.target.value, 10) })}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {masterOptions?.drivers.map((d) => (
                      <option key={d.id_driver} value={d.id_driver}>
                        {d.nama_driver} ({d.jabatan})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pilih Kendaraan Armada
                  </label>
                  <select
                    value={newRitase.id_kendaraan}
                    onChange={(e) => setNewRitase({ ...newRitase, id_kendaraan: parseInt(e.target.value, 10) })}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {masterOptions?.kendaraan.map((k) => (
                      <option key={k.id_kendaraan} value={k.id_kendaraan}>
                        {k.plat_nomor} ({k.jenis_kendaraan})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Drop Point Tujuan Akhir
                  </label>
                  <select
                    value={newRitase.id_drop_point}
                    onChange={(e) => setNewRitase({ ...newRitase, id_drop_point: parseInt(e.target.value, 10) })}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {masterOptions?.drop_points.map((dp) => (
                      <option key={dp.id_drop_point} value={dp.id_drop_point}>
                        {dp.nama_drop_point} ({dp.kode_dp})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stops Editor for Create Modal */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Urutan Stop Tempat Perjalanan ({newRitase.stops.length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddStop(false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0c1e3a]/10 px-2.5 py-1 text-xs font-bold text-[#0c1e3a] hover:bg-[#0c1e3a]/20 dark:text-slate-400"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Stop
                  </button>
                </div>

                <div className="space-y-2">
                  {newRitase.stops.map((stop, idx) => (
                    <div
                      key={stop.id_stop || idx}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-1">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0c1e3a] text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStop(false, idx, "up")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === newRitase.stops.length - 1}
                            onClick={() => handleMoveStop(false, idx, "down")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tipe Stop */}
                      <select
                        value={stop.jenis_stop}
                        onChange={(e) => {
                          const newType = e.target.value;
                          handleUpdateStopField(false, idx, "jenis_stop", newType);
                          // Auto set default ID from DB
                          if (newType === "seller" && masterOptions?.sellers[0]) {
                            handleSelectLocationOption(false, idx, masterOptions.sellers[0].id_seller);
                          } else if (newType === "gudang" && masterOptions?.gudangs[0]) {
                            handleSelectLocationOption(false, idx, masterOptions.gudangs[0].id_gudang);
                          } else if (newType === "drop_point" && masterOptions?.drop_points[0]) {
                            handleSelectLocationOption(false, idx, masterOptions.drop_points[0].id_drop_point);
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="gudang">Gudang</option>
                        <option value="seller">Seller / Toko</option>
                        <option value="drop_point">Drop Point</option>
                      </select>

                      {/* Select Option Terhubung Ke Database */}
                      {stop.jenis_stop === "seller" ? (
                        <SearchSelect
                          value={stop.id_seller}
                          onChange={(id) => handleSelectLocationOption(false, idx, id)}
                          placeholder="Pilih seller..."
                          options={(masterOptions?.sellers ?? []).map((s) => ({
                            id: s.id_seller,
                            label: s.nama_seller,
                            sub: s.kode_seller,
                          }))}
                        />
                      ) : stop.jenis_stop === "gudang" ? (
                        <SearchSelect
                          value={stop.id_gudang}
                          onChange={(id) => handleSelectLocationOption(false, idx, id)}
                          placeholder="Pilih gudang..."
                          options={(masterOptions?.gudangs ?? []).map((g) => ({
                            id: g.id_gudang,
                            label: g.nama_gudang,
                          }))}
                        />
                      ) : (
                        <SearchSelect
                          value={stop.id_drop_point}
                          onChange={(id) => handleSelectLocationOption(false, idx, id)}
                          placeholder="Pilih drop point..."
                          options={(masterOptions?.drop_points ?? []).map((dp) => ({
                            id: dp.id_drop_point,
                            label: dp.nama_drop_point,
                            sub: dp.kode_dp,
                          }))}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveStop(false, idx)}
                        className="p-1.5 text-slate-400 transition-colors hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {createMutation.error && (
                <MutationError error={createMutation.error} />
              )}

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0c1e3a] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#16335a] disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Membuat Jadwal...</span>
                    </>
                  ) : (
                    <span>Simpan Jadwal Baru</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT RITASE & RUTE STOPS ── */}
      {editingRitase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-lg bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Ritase & Rute Perjalanan - {editingRitase.kode_ritase}
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah status, urutan ritase, atau atur lokasi tempat yang harus dikunjungi oleh {editingRitase.nama_driver}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRitase(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto mt-4 space-y-5 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status Perjalanan
                  </label>
                  <select
                    value={editingRitase.status}
                    onChange={(e) =>
                      setEditingRitase({ ...editingRitase, status: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="direncanakan">direncanakan</option>
                    <option value="berjalan">berjalan</option>
                    <option value="selesai">selesai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ritase Ke-
                  </label>
                  <input
                    type="number"
                    value={editingRitase.ritase_ke}
                    onChange={(e) =>
                      setEditingRitase({ ...editingRitase, ritase_ke: parseInt(e.target.value, 10) || 1 })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* ── EDITOR URUTAN RUTE PERJALANAN (STOPS) ── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Urutan Stop Rute Tempat Perjalanan ({(editingRitase.stops ?? []).length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddStop(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0c1e3a]/10 px-2.5 py-1 text-xs font-bold text-[#0c1e3a] hover:bg-[#0c1e3a]/20 dark:text-slate-400"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Stop
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingRitase.stops ?? []).map((stop, idx) => (
                    <div
                      key={stop.id_stop || idx}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-1">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0c1e3a] text-xs font-bold text-white">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStop(true, idx, "up")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (editingRitase.stops ?? []).length - 1}
                            onClick={() => handleMoveStop(true, idx, "down")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tipe Stop */}
                      <select
                        value={stop.jenis_stop}
                        onChange={(e) => {
                          const newType = e.target.value;
                          handleUpdateStopField(true, idx, "jenis_stop", newType);
                          if (newType === "seller" && masterOptions?.sellers[0]) {
                            handleSelectLocationOption(true, idx, masterOptions.sellers[0].id_seller);
                          } else if (newType === "gudang" && masterOptions?.gudangs[0]) {
                            handleSelectLocationOption(true, idx, masterOptions.gudangs[0].id_gudang);
                          } else if (newType === "drop_point" && masterOptions?.drop_points[0]) {
                            handleSelectLocationOption(true, idx, masterOptions.drop_points[0].id_drop_point);
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="gudang">Gudang</option>
                        <option value="seller">Seller / Toko</option>
                        <option value="drop_point">Drop Point</option>
                      </select>

                      {/* Select Option Terhubung Ke Database */}
                      {stop.jenis_stop === "seller" ? (
                        <SearchSelect
                          value={stop.id_seller}
                          onChange={(id) => handleSelectLocationOption(true, idx, id)}
                          placeholder="Pilih seller..."
                          options={(masterOptions?.sellers ?? []).map((s) => ({
                            id: s.id_seller,
                            label: s.nama_seller,
                          }))}
                        />
                      ) : stop.jenis_stop === "gudang" ? (
                        <SearchSelect
                          value={stop.id_gudang}
                          onChange={(id) => handleSelectLocationOption(true, idx, id)}
                          placeholder="Pilih gudang..."
                          options={(masterOptions?.gudangs ?? []).map((g) => ({
                            id: g.id_gudang,
                            label: g.nama_gudang,
                          }))}
                        />
                      ) : (
                        <SearchSelect
                          value={stop.id_drop_point}
                          onChange={(id) => handleSelectLocationOption(true, idx, id)}
                          placeholder="Pilih drop point..."
                          options={(masterOptions?.drop_points ?? []).map((dp) => ({
                            id: dp.id_drop_point,
                            label: dp.nama_drop_point,
                          }))}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveStop(true, idx)}
                        className="p-1.5 text-slate-400 transition-colors hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {updateMutation.error && (
                <MutationError error={updateMutation.error} />
              )}

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRitase(null)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0c1e3a] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#16335a] disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan Rute...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan Rute</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUCCESS TOAST NOTIFICATION ── */}
      {successToast.show && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-start gap-3 rounded-2xl bg-[#0c1e3a] px-5 py-4 shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Jadwal Berhasil Dibuat! 🎉</p>
            {successToast.count !== undefined && (
              <p className="mt-0.5 text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">{successToast.count} ritase</span> telah digenerate &amp; dikirim ke HP driver.
              </p>
            )}
          </div>
          <button
            onClick={() => setSuccessToast({ show: false, message: "" })}
            className="ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0c1e3a] border border-slate-200 dark:border-slate-700/50">
            <div className="bg-[#0c1e3a] px-6 py-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/20">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Ritase</h3>
                <p className="text-xs text-blue-200/70">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Apakah Anda yakin ingin menghapus ritase{" "}
                <span className="font-bold text-[#0c1e3a] dark:text-white">{deleteConfirm.kode}</span>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-[#0c1e3a]/80 px-6 py-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ show: false, idRitase: null, kode: "" })}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1-KLIK GENERATE CONFIRMATION & PREVIEW ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="flex w-11/12 max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0c1e3a] border border-slate-200 dark:border-slate-700/50" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 px-6 py-4 bg-[#0c1e3a]">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white shadow-md">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">
                    Preview &amp; Edit Tambah Rute Otomatis
                  </h3>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    Anda dapat mengubah rute, driver, kendaraan, menambah/menghapus ritase atau perhentian sebelum disave untuk tanggal <span className="font-bold text-white">{todayStr}</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="rounded-lg p-1.5 text-blue-200/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/80">
              {isFetchingPreview ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="h-10 w-10 animate-spin text-[#0c1e3a] dark:text-blue-400" />
                  <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Memuat preview jadwal dari database...</p>
                </div>
              ) : editableRoutes.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {editableRoutes.map((route: PreviewRoute, rIdx: number) => (
                      <div key={rIdx} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#0f2847] hover:border-[#0c1e3a] dark:hover:border-blue-500/50 hover:shadow-md transition-all">
                        <div>
                          {/* Route Header Edit Controls */}
                          <div className="mb-4 border-b border-slate-100 pb-3.5 dark:border-slate-700/50">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-[#0c1e3a] dark:text-blue-300">
                                <span>Ritase Ke-</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={route.ritase_ke}
                                  onChange={(e) => handleRitaseKeChange(rIdx, parseInt(e.target.value) || 1)}
                                  className="w-12 rounded border border-[#0c1e3a]/20 bg-[#0c1e3a]/5 px-1.5 py-0.5 text-center font-extrabold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoute(rIdx)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2 py-1 rounded transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>

                            {/* Driver Select */}
                            <div className="mb-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Driver</label>
                              <select
                                value={route.id_driver}
                                onChange={(e) => handleDriverChange(rIdx, parseInt(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                {masterOptions?.drivers.map((d) => (
                                  <option key={d.id_driver} value={d.id_driver}>
                                    {d.nama_driver} ({d.jabatan})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Vehicle Select */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kendaraan</label>
                              <select
                                value={route.id_kendaraan}
                                onChange={(e) => handleVehicleChange(rIdx, parseInt(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                {masterOptions?.kendaraan.map((v) => (
                                  <option key={v.id_kendaraan} value={v.id_kendaraan}>
                                    {v.plat_nomor} ({v.jenis_kendaraan})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Stops Section */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Daftar Perhentian / Stops</span>
                              <button
                                type="button"
                                onClick={() => handlePreviewAddStop(rIdx)}
                                className="text-[11px] font-bold text-[#0c1e3a] dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> Tambah Stop
                              </button>
                            </div>

                            {route.stops.map((stop: PreviewRoute["stops"][0], sIdx: number) => (
                              <div key={sIdx} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-700/50 dark:bg-[#0c1e3a]/40 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] dark:bg-blue-700 text-[10px] font-bold text-white">
                                    {sIdx + 1}
                                  </span>

                                  {/* Stop Type Select */}
                                  <select
                                    value={stop.jenis_stop}
                                    onChange={(e) => handleStopTypeChange(rIdx, sIdx, e.target.value)}
                                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  >
                                    <option value="gudang">GUDANG</option>
                                    <option value="seller">SELLER</option>
                                    <option value="drop_point">DROP POINT</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handlePreviewRemoveStop(rIdx, sIdx)}
                                    className="text-slate-400 hover:text-rose-500 p-0.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Location Select */}
                                <select
                                  value={stop.id_lokasi ?? 1}
                                  onChange={(e) => handleStopLocationChange(rIdx, sIdx, parseInt(e.target.value))}
                                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                  {stop.jenis_stop === "gudang" &&
                                    masterOptions?.gudangs.map((g) => (
                                      <option key={g.id_gudang} value={g.id_gudang}>
                                        {g.nama_gudang}
                                      </option>
                                    ))}
                                  {stop.jenis_stop === "seller" &&
                                    masterOptions?.sellers.map((s) => (
                                      <option key={s.id_seller} value={s.id_seller}>
                                        {s.nama_seller}
                                      </option>
                                    ))}
                                  {stop.jenis_stop !== "gudang" && stop.jenis_stop !== "seller" &&
                                    masterOptions?.drop_points.map((dp) => (
                                      <option key={dp.id_drop_point} value={dp.id_drop_point}>
                                        {dp.nama_drop_point}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleAddRoute}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#0c1e3a]/30 bg-[#0c1e3a]/5 px-6 py-3 text-xs font-bold text-[#0c1e3a] hover:bg-[#0c1e3a]/10 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Jadwal Ritase Baru</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Layers className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500 mb-4">Tidak ada preview template ritase.</p>
                  <button
                    type="button"
                    onClick={handleAddRoute}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0c1e3a] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#16335a]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Buat Jadwal Pertama</span>
                  </button>
                </div>
              )}

              {generateMutation.error && (
                <div className="mt-4">
                  <MutationError error={generateMutation.error} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#0c1e3a] px-6 py-4">
              <div className="text-xs text-slate-500 dark:text-blue-200/60 font-medium">
                * Total <span className="font-bold text-[#0c1e3a] dark:text-blue-300">{editableRoutes.length}</span> ritase siap disave &amp; dikirim ke HP driver
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={generateMutation.isPending || isFetchingPreview || editableRoutes.length === 0}
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0c1e3a] dark:bg-white px-6 py-2.5 text-xs font-bold text-white dark:text-[#0c1e3a] shadow-md disabled:opacity-50 hover:bg-[#16335a] dark:hover:bg-slate-100 transition-all"
                >
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sedang Membuat</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Konfirmasi & Generate Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  const msg =
    error instanceof ApiError ? error.message : "Terjadi kesalahan. Coba lagi.";
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
      {msg}
    </p>
  );
}

/** Dropdown lokasi dengan pencarian — dipakai di editor stop (create & edit ritase). */
function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
}: {
  value: number | null | undefined;
  onChange: (id: number) => void;
  options: { id: number; label: string; sub?: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Tutup dropdown kalau klik di luar.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter((o) =>
      `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(ql)
    )
    : options;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQ("");
        }}
        className="flex w-full items-center justify-between gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-slate-100 dark:border-slate-800">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari..."
              className="w-full bg-transparent py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">Tidak ditemukan</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                      {o.label}
                    </span>
                    {o.sub && (
                      <span className="shrink-0 text-[10px] text-slate-400">{o.sub}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
