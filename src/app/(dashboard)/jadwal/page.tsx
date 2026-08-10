"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Filter,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Truck,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import {
  useAdminRitase,
  useDeleteRitase,
  useGenerateDailyRitase,
  useUpdateRitase,
} from "@/hooks/use-admin-ritase";
import { cn } from "@/lib/utils";
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
  const [editingRitase, setEditingRitase] = useState<AdminRitaseItem | null>(null);

  const { data: ritases, isLoading, isError, refetch } = useAdminRitase(selectedDate);
  const generateMutation = useGenerateDailyRitase();
  const deleteMutation = useDeleteRitase();
  const updateMutation = useUpdateRitase();

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: () => {
        setShowGenerateModal(false);
      },
    });
  };

  const handleDelete = (idRitase: number, kode: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ritase ${kode}?`)) {
      deleteMutation.mutate(idRitase);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRitase) return;

    // Ensure urutan stops are correctly indexed from 1 to N
    const reindexedStops = editingRitase.stops.map((s, idx) => ({
      ...s,
      urutan: idx + 1,
    }));

    updateMutation.mutate(
      {
        idRitase: editingRitase.id_ritase,
        data: {
          ...editingRitase,
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

  // Helper functions for editing stops in modal
  const handleAddStop = () => {
    if (!editingRitase) return;
    const newStop: AdminRitaseStop = {
      id_stop: Date.now(),
      urutan: editingRitase.stops.length + 1,
      jenis_stop: "seller",
      id_seller: 1,
      nama_lokasi: "Seller 1",
      keterangan: "Singgah / Ambil paket",
    };

    setEditingRitase({
      ...editingRitase,
      stops: [...editingRitase.stops, newStop],
    });
  };

  const handleRemoveStop = (index: number) => {
    if (!editingRitase) return;
    const updated = editingRitase.stops.filter((_, idx) => idx !== index);
    setEditingRitase({ ...editingRitase, stops: updated });
  };

  const handleMoveStop = (index: number, direction: "up" | "down") => {
    if (!editingRitase) return;
    const stops = [...editingRitase.stops];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const temp = stops[index];
    stops[index] = stops[targetIndex];
    stops[targetIndex] = temp;

    setEditingRitase({ ...editingRitase, stops });
  };

  const handleUpdateStopField = (index: number, field: keyof AdminRitaseStop, value: any) => {
    if (!editingRitase) return;
    const stops = [...editingRitase.stops];
    stops[index] = { ...stops[index], [field]: value };
    setEditingRitase({ ...editingRitase, stops });
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

  // Calculate statistics
  const totalRitase = ritases?.length ?? 0;
  const uniqueDrivers = new Set(ritases?.map((r) => r.id_driver)).size;
  const inProgress = ritases?.filter((r) => r.status === "berjalan" || r.status === "proses").length ?? 0;
  const completed = ritases?.filter((r) => r.status === "selesai").length ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER TITLE & ACTIONS ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Manajemen Jadwal Ritase
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3 w-3" /> Tower Control Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola penugasan rute armada, ubah urutan stop perjalanan, dan generate rute harian otomatis dalam 1-klik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Utama: 1-Klik Generate Otomatis */}
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 active:scale-[0.98]"
          >
            <Zap className="h-4 w-4 transition-transform group-hover:rotate-12" />
            <span>Generate Otomatis (1-Klik)</span>
          </button>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Ritase ({selectedDate === todayStr ? "Hari Ini" : selectedDate})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{totalRitase}</p>
          <p className="mt-1 text-xs text-slate-500">Tugas ritase terdaftar</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Driver Ditugaskan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{uniqueDrivers}</p>
          <p className="mt-1 text-xs text-slate-500">Driver bertugas aktif</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dalam Perjalanan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{inProgress}</p>
          <p className="mt-1 text-xs text-slate-500">Armada sedang jalan</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ritase Selesai
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{completed}</p>
          <p className="mt-1 text-xs text-slate-500">Rute selesai dikerjakan</p>
        </div>
      </div>

      {/* ── FILTER, QUICK DATE SELECTOR, & SEARCH BAR ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Selector Buttons */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                selectedDate === todayStr
                  ? "bg-amber-500 text-white shadow-sm"
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
                  ? "bg-amber-500 text-white shadow-sm"
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
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              2 Hari Lalu
            </button>
          </div>

          {/* Tanggal Picker Custom */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
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
              className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            {["all", "direncanakan", "berjalan", "selesai"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all",
                  statusFilter === status
                    ? "bg-amber-500 text-white shadow-sm"
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
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── SCHEDULE CARDS LIST ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
            <span className="text-sm font-medium">Memuat jadwal ritase...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
          <p className="text-sm font-medium">Gagal memuat jadwal ritase. Silakan coba refresh.</p>
        </div>
      ) : filteredRitases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/20">
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
              onClick={() => setShowGenerateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600"
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
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-amber-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
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
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold capitalize",
                        r.status === "selesai"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : r.status === "berjalan" || r.status === "proses"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {r.status}
                    </span>

                    {/* Action Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingRitase(r)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-800 dark:hover:text-amber-400"
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
                    Urutan Rute Perjalanan ({r.stops?.length ?? 0} Stop):
                  </p>
                  <div className="relative pl-4 space-y-2.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {r.stops?.map((stop) => (
                      <div key={stop.id_stop} className="relative flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm",
                              stop.jenis_stop === "gudang"
                                ? "bg-blue-500"
                                : stop.jenis_stop === "seller"
                                ? "bg-orange-500"
                                : "bg-emerald-500"
                            )}
                          >
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

      {/* ── MODAL EDIT RITASE & RUTE STOPS ── */}
      {editingRitase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
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
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* ── EDITOR URUTAN RUTE PERJALANAN (STOPS) ── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Urutan Stop Rute Tempat Perjalanan ({editingRitase.stops.length}):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStop}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Stop
                  </button>
                </div>

                <div className="space-y-2">
                  {editingRitase.stops.map((stop, idx) => (
                    <div
                      key={stop.id_stop || idx}
                      className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      {/* Urutan Badge & Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white shadow-sm">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStop(idx, "up")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === editingRitase.stops.length - 1}
                            onClick={() => handleMoveStop(idx, "down")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tipe Stop */}
                      <select
                        value={stop.jenis_stop}
                        onChange={(e) => handleUpdateStopField(idx, "jenis_stop", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="gudang">Gudang</option>
                        <option value="seller">Seller / Toko</option>
                        <option value="drop_point">Drop Point</option>
                      </select>

                      {/* Nama / Ket Lokasi */}
                      <input
                        type="text"
                        placeholder="Nama Lokasi / Tempat..."
                        value={stop.nama_lokasi}
                        onChange={(e) => handleUpdateStopField(idx, "nama_lokasi", e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />

                      {/* Hapus Stop */}
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        className="p-1.5 text-slate-400 transition-colors hover:text-rose-500"
                        title="Hapus Stop Ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRitase(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-50"
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

      {/* ── MODAL 1-KLIK GENERATE CONFIRMATION ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <Zap className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              Generate Rute Harian Otomatis?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Sistem akan membaca **Template Rute Tetap** dan langsung membuatkan 12 jadwal ritase untuk seluruh driver hari ini (<span className="font-semibold text-slate-700 dark:text-slate-200">{todayStr}</span>).
              <br />
              <br />
              <span className="font-medium text-amber-600 dark:text-amber-400">
                ⚡ Seketika tombol ini diklik, rute akan langsung muncul di HP seluruh driver aktif!
              </span>
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={generateMutation.isPending}
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Ya, Generate Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
