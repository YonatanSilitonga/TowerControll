"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { swal } from "@/lib/swal";
import { ApiError } from "@/types/api";
import {
  useGenerateDailyRitase,
  usePreviewDailyRitase,
  type MasterOptions,
  type PreviewRoute,
} from "@/hooks/use-admin-ritase";
import { MutationError } from "@/components/jadwal/mutation-error";

type DriverItem = MasterOptions["drivers"][number];
type VehicleItem = MasterOptions["kendaraan"][number];
type ImplantItem = NonNullable<MasterOptions["implant_points"]>[number];

interface GenerateRitaseModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  masterOptions?: MasterOptions;
  implantOptions: ImplantItem[];
  defaultImplantPoint?: ImplantItem;
  activeDrivers: DriverItem[];
  activeVehicles: VehicleItem[];
  onSuccess: () => void;
}

function formatJam(value?: string | null) {
  if (!value) return "-";
  return value.substring(0, 5);
}

export function GenerateRitaseModal({
  open,
  onClose,
  selectedDate,
  masterOptions,
  implantOptions,
  defaultImplantPoint,
  activeDrivers,
  activeVehicles,
  onSuccess,
}: GenerateRitaseModalProps) {
  const {
    data: previewData,
    isFetching: isFetchingPreview,
    refetch: fetchPreview,
  } = usePreviewDailyRitase();

  const generateMutation = useGenerateDailyRitase();
  const [editableRoutes, setEditableRoutes] = useState<PreviewRoute[]>([]);
  const previewSnapshotRef = useRef<string>("");

  useEffect(() => {
    if (open) {
      fetchPreview();
    }
  }, [open, fetchPreview]);

  const getDriverJenis = (idDriver: number) => {
    const driver = masterOptions?.drivers.find((d) => d.id_driver === idDriver);
    const jabatan = (driver?.jabatan ?? "").toLowerCase();
    return jabatan.includes("incoming") ? "incoming" : "outgoing";
  };

  const getRouteJenis = (route: PreviewRoute) => getDriverJenis(route.id_driver);

  useEffect(() => {
    if (previewData?.routes) {
      const routesCopy: PreviewRoute[] = JSON.parse(
        JSON.stringify(previewData.routes),
      );

      if (masterOptions) {
        routesCopy.forEach((r) => {
          r.stops.forEach((s) => {
            if (s.jenis_stop === "gudang") {
              const validG = masterOptions.gudangs.find(
                (g) => g.id_gudang === s.id_lokasi,
              );
              if (!validG && masterOptions.gudangs.length > 0) {
                s.id_lokasi = masterOptions.gudangs[0].id_gudang;
                s.nama_lokasi = masterOptions.gudangs[0].nama_gudang;
              }
            } else if (s.jenis_stop === "seller") {
              const validS = masterOptions.sellers.find(
                (sel) => sel.id_seller === s.id_lokasi,
              );
              if (!validS && masterOptions.sellers.length > 0) {
                s.id_lokasi = masterOptions.sellers[0].id_seller;
                s.nama_lokasi = masterOptions.sellers[0].nama_seller;
              }
            } else if (s.jenis_stop === "implant") {
              const validI = implantOptions.find(
                (sel) =>
                  sel.id_implant === s.id_lokasi && sel.has_coordinate !== false,
              );
              if (!validI && defaultImplantPoint) {
                s.id_lokasi = defaultImplantPoint.id_implant;
                s.nama_lokasi = defaultImplantPoint.nama_implant;
              }
            } else {
              const validDp = masterOptions.drop_points.find(
                (dp) => dp.id_drop_point === s.id_lokasi,
              );
              if (!validDp && masterOptions.drop_points.length > 0) {
                s.id_lokasi = masterOptions.drop_points[0].id_drop_point;
                s.nama_lokasi = masterOptions.drop_points[0].nama_drop_point;
              }
            }
          });
        });

        routesCopy.sort((a, b) => {
          const jenisA = getDriverJenis(a.id_driver);
          const jenisB = getDriverJenis(b.id_driver);
          if (jenisA !== jenisB) return jenisA === "outgoing" ? -1 : 1;
          if (a.ritase_ke !== b.ritase_ke) return a.ritase_ke - b.ritase_ke;
          return (a.nama_driver ?? "").localeCompare(b.nama_driver ?? "");
        });
      }

      setEditableRoutes(routesCopy);
      previewSnapshotRef.current = JSON.stringify(routesCopy);
    }
  }, [previewData, masterOptions, defaultImplantPoint, implantOptions]);

  const generateIsDirty = () => {
    return JSON.stringify(editableRoutes) !== previewSnapshotRef.current;
  };

  const closeGenerateModal = () => {
    if (previewSnapshotRef.current) {
      setEditableRoutes(JSON.parse(previewSnapshotRef.current));
    }
    onClose();
  };

  const askCancelGenerate = async () => {
    if (!generateIsDirty()) {
      closeGenerateModal();
      return;
    }
    const confirmed = await swal.confirm(
      "Batalkan Perubahan?",
      "Perubahan rute, driver, atau jadwal yang belum di-generate akan hilang.",
      "Ya, batalkan",
    );
    if (confirmed) closeGenerateModal();
  };

  const errMsg = (e: unknown) => {
    return e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.";
  };

  const handleGenerate = () => {
    const payload = {
      tanggal: selectedDate,
      routes: editableRoutes.map((r: PreviewRoute) => ({
        id_driver: Number(r.id_driver),
        id_kendaraan: Number(r.id_kendaraan),
        id_drop_point: Number(
          r.stops.find(
            (s) => s.jenis_stop === "drop_point" || s.jenis_stop === "gateway",
          )?.id_lokasi ?? 1,
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
        onClose();
        const count =
          (data as { total_generated?: number })?.total_generated ??
          editableRoutes.length;
        swal.success(
          "Berhasil!",
          `Berhasil menimpa & meng-generate ${count} ritase harian!`,
        );
        onSuccess();
      },
      onError: (e: unknown) => {
        swal.error("Gagal generate", errMsg(e));
      },
    });
  };

  const handleDriverChange = (routeIdx: number, driverId: number) => {
    const driver = masterOptions?.drivers.find((d) => d.id_driver === driverId);
    const updated = [...editableRoutes];
    const current = updated[routeIdx];

    const jenis = getDriverJenis(driverId);
    const maxRitase = jenis === "outgoing" ? 3 : 4;
    const clampedRitase = Math.min(maxRitase, current.ritase_ke);

    const jamConfig = masterOptions?.jam_ritase?.find(
      (j) => j.jenis === jenis && j.ritase_ke === clampedRitase,
    );

    updated[routeIdx] = {
      ...current,
      id_driver: driverId,
      nama_driver: driver?.nama_driver ?? `Driver #${driverId}`,
      ritase_ke: clampedRitase,
      jam_mulai: jamConfig?.jam_mulai ?? current.jam_mulai,
      jam_selesai: jamConfig?.jam_selesai ?? current.jam_selesai,
    };
    setEditableRoutes(updated);
  };

  const handleJenisChange = (routeIdx: number, newJenis: string) => {
    const validDriver = activeDrivers.find(
      (d) => getDriverJenis(d.id_driver) === newJenis,
    );
    if (!validDriver) return;
    handleDriverChange(routeIdx, validDriver.id_driver);
  };

  const handleVehicleChange = (routeIdx: number, vehicleId: number) => {
    const vehicle = masterOptions?.kendaraan.find(
      (v) => v.id_kendaraan === vehicleId,
    );
    const updated = [...editableRoutes];
    updated[routeIdx] = {
      ...updated[routeIdx],
      id_kendaraan: vehicleId,
      plat_nomor: vehicle?.plat_nomor ?? `Kendaraan #${vehicleId}`,
    };
    setEditableRoutes(updated);
  };

  const handleRitaseKeChange = (routeIdx: number, ritaseKe: number) => {
    const updated = [...editableRoutes];
    const current = updated[routeIdx];
    const jenis = getRouteJenis(current);

    const maxRitase = jenis === "outgoing" ? 3 : 4;
    const clamped = Math.min(maxRitase, Math.max(1, ritaseKe || 1));

    const jamConfig = masterOptions?.jam_ritase?.find(
      (j) => j.jenis === jenis && j.ritase_ke === clamped,
    );

    updated[routeIdx] = {
      ...current,
      ritase_ke: clamped,
      jam_mulai: jamConfig?.jam_mulai ?? current.jam_mulai,
      jam_selesai: jamConfig?.jam_selesai ?? current.jam_selesai,
    };
    setEditableRoutes(updated);
  };

  const handleRemoveRoute = async (routeIdx: number) => {
    const confirmed = await swal.confirm(
      "Hapus Rute dari Preview?",
      `Yakin ingin menghapus rute "${editableRoutes[routeIdx]?.nama_driver ?? "Driver"}" Ritase Ke-${editableRoutes[routeIdx]?.ritase_ke ?? "?"} dari daftar generate?`,
      "Ya, hapus!",
    );
    if (confirmed) {
      const newRoutes = editableRoutes.filter((_, idx) => idx !== routeIdx);
      setEditableRoutes(newRoutes);
      previewSnapshotRef.current = JSON.stringify(newRoutes);
      swal.success(
        "Rute Dihapus",
        "Rute berhasil dihapus dari daftar generate.",
      );
    }
  };

  const handleAddRoute = () => {
    const defaultDriver = activeDrivers[0];
    const defaultVehicle = activeVehicles[0];
    const defaultGudang = masterOptions?.gudangs[0];
    const defaultDp = masterOptions?.drop_points[0];
    const jenis = defaultDriver
      ? getDriverJenis(defaultDriver.id_driver)
      : "outgoing";
    const jamConfig = masterOptions?.jam_ritase?.find(
      (j) => j.jenis === jenis && j.ritase_ke === 1,
    );
    const newRoute: PreviewRoute = {
      id_driver: defaultDriver?.id_driver ?? 1,
      nama_driver: defaultDriver?.nama_driver ?? "Driver 1",
      id_kendaraan: defaultVehicle?.id_kendaraan ?? 1,
      plat_nomor: defaultVehicle?.plat_nomor ?? "B 1234 XXX",
      ritase_ke: 1,
      jam_mulai: jamConfig?.jam_mulai,
      jam_selesai: jamConfig?.jam_selesai,
      stops: [
        {
          urutan: 1,
          jenis_stop: "gudang",
          id_lokasi: defaultGudang?.id_gudang ?? 1,
          nama_lokasi: defaultGudang?.nama_gudang ?? "Gudang 1",
          keterangan: "",
        },
        {
          urutan: 2,
          jenis_stop: "drop_point",
          id_lokasi: defaultDp?.id_drop_point ?? 1,
          nama_lokasi: defaultDp?.nama_drop_point ?? "Gateway 1",
          keterangan: "",
        },
      ],
    };
    setEditableRoutes([...editableRoutes, newRoute]);
  };

  const handleStopTypeChange = (
    routeIdx: number,
    stopIdx: number,
    newJenis: string,
  ) => {
    const updated = [...editableRoutes];
    const stop = { ...updated[routeIdx].stops[stopIdx] };
    stop.jenis_stop = newJenis;

    if (newJenis === "gudang") {
      const g = masterOptions?.gudangs[0];
      stop.id_lokasi = g?.id_gudang ?? 1;
      stop.nama_lokasi = g?.nama_gudang ?? "Gudang Outgoing";
    } else if (newJenis === "implant") {
      const s = defaultImplantPoint;
      stop.id_lokasi = s?.id_implant ?? 0;
      stop.nama_lokasi = s?.nama_implant ?? "";
    } else if (newJenis === "seller") {
      const s = masterOptions?.sellers[0];
      stop.id_lokasi = s?.id_seller ?? 1;
      stop.nama_lokasi = s?.nama_seller ?? "Seller 1";
    } else {
      const dp = masterOptions?.drop_points[0];
      stop.id_lokasi = dp?.id_drop_point ?? 2;
      stop.nama_lokasi = dp?.nama_drop_point ?? "Gateway SEG777";
    }

    updated[routeIdx].stops[stopIdx] = stop;
    setEditableRoutes(updated);
  };

  const handleStopLocationChange = (
    routeIdx: number,
    stopIdx: number,
    idLokasi: number,
  ) => {
    const updated = [...editableRoutes];
    const stop = { ...updated[routeIdx].stops[stopIdx] };
    stop.id_lokasi = idLokasi;

    if (stop.jenis_stop === "gudang") {
      const item = masterOptions?.gudangs.find((g) => g.id_gudang === idLokasi);
      stop.nama_lokasi = item?.nama_gudang ?? `Gudang #${idLokasi}`;
    } else if (stop.jenis_stop === "implant") {
      const item = implantOptions.find((s) => s.id_implant === idLokasi);
      stop.nama_lokasi = item?.nama_implant ?? `Implant #${idLokasi}`;
    } else if (stop.jenis_stop === "seller") {
      const item = masterOptions?.sellers.find((s) => s.id_seller === idLokasi);
      stop.nama_lokasi = item?.nama_seller ?? `Seller #${idLokasi}`;
    } else {
      const item = masterOptions?.drop_points.find(
        (dp) => dp.id_drop_point === idLokasi,
      );
      stop.nama_lokasi = item?.nama_drop_point ?? `Gateway #${idLokasi}`;
    }

    updated[routeIdx].stops[stopIdx] = stop;
    setEditableRoutes(updated);
  };

  const handlePreviewAddStop = (routeIdx: number) => {
    const updated = [...editableRoutes];
    const g = masterOptions?.gudangs[0];
    updated[routeIdx].stops.push({
      urutan: updated[routeIdx].stops.length + 1,
      jenis_stop: "gudang",
      id_lokasi: g?.id_gudang ?? 1,
      nama_lokasi: g?.nama_gudang ?? "Gudang 1",
      keterangan: "",
    });
    setEditableRoutes(updated);
  };

  const handlePreviewRemoveStop = (routeIdx: number, stopIdx: number) => {
    const updated = [...editableRoutes];
    updated[routeIdx].stops = updated[routeIdx].stops.filter(
      (_, idx) => idx !== stopIdx,
    );
    setEditableRoutes(updated);
  };

  const handlePreviewMoveStop = (
    routeIdx: number,
    stopIdx: number,
    direction: "up" | "down",
  ) => {
    const targetIdx = direction === "up" ? stopIdx - 1 : stopIdx + 1;
    const stops = editableRoutes[routeIdx].stops;
    if (targetIdx < 0 || targetIdx >= stops.length) return;
    const updated = [...editableRoutes];
    const routeStops = [...updated[routeIdx].stops];
    [routeStops[stopIdx], routeStops[targetIdx]] = [
      routeStops[targetIdx],
      routeStops[stopIdx],
    ];
    updated[routeIdx] = { ...updated[routeIdx], stops: routeStops };
    setEditableRoutes(updated);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div
        className="flex w-11/12 max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0c1e3a] border border-slate-200 dark:border-slate-700/50"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 px-4 py-3 sm:px-6 sm:py-4 bg-[#0c1e3a]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white/10 text-white shadow-md">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-extrabold text-white">
                Preview &amp; Edit Tambah Rute Otomatis
              </h3>
              <p className="text-[10px] sm:text-xs text-blue-200/80 mt-0.5 hidden sm:block">
                Anda dapat mengubah rute, driver, kendaraan, menambah/menghapus
                ritase atau perhentian sebelum disave untuk tanggal{" "}
                <span className="font-bold text-white">{selectedDate}</span>.
              </p>
              <p className="text-[10px] text-blue-200/80 mt-0.5 sm:hidden">
                Tanggal:{" "}
                <span className="font-bold text-white">{selectedDate}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={askCancelGenerate}
            className="rounded-lg p-1.5 text-blue-200/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50 dark:bg-slate-950/80">
          {isFetchingPreview ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="h-10 w-10 animate-spin text-[#0c1e3a] dark:text-blue-400" />
              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                Memuat preview jadwal dari database...
              </p>
            </div>
          ) : editableRoutes.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {editableRoutes.map((route: PreviewRoute, rIdx: number) => (
                  <div
                    key={rIdx}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#0f2847] hover:border-[#0c1e3a] dark:hover:border-blue-500/50 hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Route Header Edit Controls */}
                      <div className="mb-4 border-b border-slate-100 pb-3.5 dark:border-slate-700/50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={getRouteJenis(route)}
                              onChange={(e) =>
                                handleJenisChange(rIdx, e.target.value)
                              }
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <option value="outgoing">Outgoing</option>
                              <option value="incoming">Incoming</option>
                            </select>
                            <div className="flex items-center gap-1.5 font-bold text-xs text-[#0c1e3a] dark:text-blue-300">
                              <span>Ritase</span>
                              <select
                                value={route.ritase_ke}
                                onChange={(e) =>
                                  handleRitaseKeChange(
                                    rIdx,
                                    parseInt(e.target.value),
                                  )
                                }
                                className="rounded border border-[#0c1e3a]/20 bg-[#0c1e3a]/5 px-1.5 py-0.5 text-center font-extrabold outline-none dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                              >
                                {(getRouteJenis(route) === "outgoing"
                                  ? [1, 2, 3]
                                  : [1, 2, 3, 4]
                                ).map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
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

                        {/* Date Badge */}
                        {route.tanggal_label && (
                          <div
                            className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              route.tanggal_label === "Hari Ini"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {route.tanggal_label === "Hari Ini"
                              ? "Hari Ini"
                              : "Besok"}
                            {route.tanggal && (
                              <span className="opacity-60 ml-0.5">
                                ({route.tanggal})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Driver Select */}
                        <div className="mb-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Driver
                          </label>
                          <select
                            value={route.id_driver}
                            onChange={(e) =>
                              handleDriverChange(rIdx, parseInt(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            {activeDrivers
                              .filter(
                                (d) =>
                                  getDriverJenis(d.id_driver) ===
                                  getRouteJenis(route),
                              )
                              .map((d) => (
                                <option key={d.id_driver} value={d.id_driver}>
                                  {d.nama_driver} ({d.jabatan})
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Vehicle Select */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Kendaraan
                          </label>
                          <select
                            value={route.id_kendaraan}
                            onChange={(e) =>
                              handleVehicleChange(
                                rIdx,
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            {activeVehicles.map((v) => (
                              <option
                                key={v.id_kendaraan}
                                value={v.id_kendaraan}
                              >
                                {v.plat_nomor} ({v.jenis_kendaraan})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Jam Mulai & Selesai (read-only) */}
                        {(route.jam_mulai || route.jam_selesai) && (
                          <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 mt-2">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              {formatJam(route.jam_mulai)} –{" "}
                              {formatJam(route.jam_selesai)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stops Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Daftar Perhentian / Stops
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePreviewAddStop(rIdx)}
                            className="text-[11px] font-bold text-[#0c1e3a] dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Tambah Stop
                          </button>
                        </div>

                        {route.stops.map(
                          (
                            stop: PreviewRoute["stops"][0],
                            sIdx: number,
                          ) => (
                            <div
                              key={sIdx}
                              className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-700/50 dark:bg-[#0c1e3a]/40 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] dark:bg-blue-700 text-[10px] font-bold text-white">
                                  {sIdx + 1}
                                </span>

                                {/* Stop Type Select */}
                                <select
                                  value={
                                    stop.jenis_stop === "gateway"
                                      ? "drop_point"
                                      : stop.jenis_stop
                                  }
                                  onChange={(e) =>
                                    handleStopTypeChange(
                                      rIdx,
                                      sIdx,
                                      e.target.value,
                                    )
                                  }
                                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  <option value="gudang">GUDANG</option>
                                  <option value="seller">SELLER</option>
                                  <option value="implant">IMPLANT</option>
                                  <option value="drop_point">GATEWAY</option>
                                </select>

                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewMoveStop(
                                        rIdx,
                                        sIdx,
                                        "up",
                                      )
                                    }
                                    disabled={sIdx === 0}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 disabled:opacity-25 disabled:cursor-not-allowed"
                                    title="Pindah ke atas"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewMoveStop(
                                        rIdx,
                                        sIdx,
                                        "down",
                                      )
                                    }
                                    disabled={sIdx === route.stops.length - 1}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 disabled:opacity-25 disabled:cursor-not-allowed"
                                    title="Pindah ke bawah"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewRemoveStop(rIdx, sIdx)
                                    }
                                    className="text-slate-400 hover:text-rose-500 p-0.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Location Select */}
                              <select
                                value={stop.id_lokasi ?? 1}
                                onChange={(e) =>
                                  handleStopLocationChange(
                                    rIdx,
                                    sIdx,
                                    parseInt(e.target.value),
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                {stop.jenis_stop === "gudang" &&
                                  masterOptions?.gudangs.map((g) => (
                                    <option
                                      key={g.id_gudang}
                                      value={g.id_gudang}
                                    >
                                      {g.nama_gudang}
                                    </option>
                                  ))}
                                {stop.jenis_stop === "seller" &&
                                  masterOptions?.sellers.map((s) => (
                                    <option
                                      key={s.id_seller}
                                      value={s.id_seller}
                                    >
                                      {s.nama_seller}
                                    </option>
                                  ))}
                                {stop.jenis_stop === "implant" &&
                                  implantOptions.map((s) => (
                                    <option
                                      key={s.id_implant}
                                      value={s.id_implant}
                                    >
                                      {s.nama_implant}
                                    </option>
                                  ))}
                                {stop.jenis_stop !== "gudang" &&
                                  stop.jenis_stop !== "seller" &&
                                  stop.jenis_stop !== "implant" &&
                                  masterOptions?.drop_points.map((dp) => (
                                    <option
                                      key={dp.id_drop_point}
                                      value={dp.id_drop_point}
                                    >
                                      {dp.nama_drop_point}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleAddRoute}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-dashed border-[#0c1e3a]/30 bg-[#0c1e3a]/5 px-6 py-3 text-xs font-bold text-[#0c1e3a] hover:bg-[#0c1e3a]/10 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Jadwal Ritase Baru</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500 mb-4">
                Tidak ada preview template ritase.
              </p>
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#0c1e3a] px-4 py-3 sm:px-6 sm:py-4 gap-3">
          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-blue-200/60 font-medium">
            * Total{" "}
            <span className="font-bold text-[#0c1e3a] dark:text-blue-300">
              {editableRoutes.length}
            </span>{" "}
            ritase
            {previewData?.total_hari_ini !== undefined &&
            previewData?.total_besok !== undefined ? (
              <>
                :{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {previewData.total_hari_ini}
                </span>{" "}
                hari ini,{" "}
                <span className="text-amber-600 dark:text-amber-400">
                  {previewData.total_besok}
                </span>{" "}
                besok
              </>
            ) : (
              <> siap disave &amp; dikirim ke HP driver</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={askCancelGenerate}
              className="flex-1 sm:flex-none rounded-lg border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={
                generateMutation.isPending ||
                isFetchingPreview ||
                editableRoutes.length === 0
              }
              onClick={handleGenerate}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-[#0c1e3a] dark:bg-white px-5 sm:px-6 py-2.5 text-xs font-bold text-white dark:text-[#0c1e3a] shadow-md disabled:opacity-50 hover:bg-[#16335a] dark:hover:bg-slate-100 transition-all"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sedang Membuat</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Konfirmasi &amp; Generate Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
