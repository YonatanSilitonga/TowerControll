"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, RefreshCw, X } from "lucide-react";
import { swal } from "@/lib/swal";
import { ApiError } from "@/types/api";
import { useCreateRitase, type MasterOptions } from "@/hooks/use-admin-ritase";
import type { AdminRitaseItem, AdminRitaseStop } from "@/types/armada";
import { StopsEditor } from "@/components/jadwal/modals/stops-editor";
import { MutationError } from "@/components/jadwal/mutation-error";

type DriverItem = MasterOptions["drivers"][number];
type VehicleItem = MasterOptions["kendaraan"][number];
type ImplantItem = NonNullable<MasterOptions["implant_points"]>[number];

interface CreateRitaseModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  todayStr: string;
  masterOptions?: MasterOptions;
  implantOptions: ImplantItem[];
  defaultImplantPoint?: ImplantItem;
  activeDrivers: DriverItem[];
  activeVehicles: VehicleItem[];
  existingRitases?: AdminRitaseItem[];
  onSuccess: () => void;
}

function formatJam(value?: string | null) {
  if (!value) return "-";
  return value.substring(0, 5);
}

export function CreateRitaseModal({
  open,
  onClose,
  selectedDate,
  todayStr,
  masterOptions,
  implantOptions,
  defaultImplantPoint,
  activeDrivers,
  activeVehicles,
  existingRitases,
  onSuccess,
}: CreateRitaseModalProps) {
  const createMutation = useCreateRitase();
  const createOriginalRef = useRef<string>("");

  const getDriverJenis = (idDriver: number) => {
    const driver = masterOptions?.drivers.find((d) => d.id_driver === idDriver);
    const jabatan = (driver?.jabatan ?? "").toLowerCase();
    return jabatan.includes("incoming") ? "incoming" : "outgoing";
  };

  const getInitialNewRitase = () => {
    const defaultDriver = activeDrivers[0];
    const defaultVehicle = activeVehicles[0];
    const defaultGudang = masterOptions?.gudangs[0];
    const defaultSeller = masterOptions?.sellers[0];
    const defaultDp = masterOptions?.drop_points[0];

    return {
      tanggal: selectedDate >= todayStr ? selectedDate : todayStr,
      id_driver: defaultDriver?.id_driver ?? 1,
      id_kendaraan: defaultVehicle?.id_kendaraan ?? 1,
      id_drop_point: defaultDp?.id_drop_point ?? 1,
      ritase_ke: 1,
      jenis_ritase: defaultDriver
        ? getDriverJenis(defaultDriver.id_driver)
        : "outgoing",
      stops: [
        {
          id_stop: 1,
          urutan: 1,
          jenis_stop: "gudang",
          id_gudang: defaultGudang?.id_gudang ?? 1,
          nama_lokasi: defaultGudang?.nama_gudang ?? "Gudang 1",
          keterangan: "Loading awal",
        },
        {
          id_stop: 2,
          urutan: 2,
          jenis_stop: "seller",
          id_seller: defaultSeller?.id_seller ?? 1,
          nama_lokasi: defaultSeller?.nama_seller ?? "Seller 1",
          keterangan: "Pickup seller",
        },
        {
          id_stop: 3,
          urutan: 3,
          jenis_stop: "drop_point",
          id_drop_point: defaultDp?.id_drop_point ?? 1,
          nama_lokasi: defaultDp?.nama_drop_point ?? "Gateway 1",
          keterangan: "Bongkar drop point",
        },
      ] as AdminRitaseStop[],
    };
  };

  const [newRitase, setNewRitase] = useState(getInitialNewRitase);

  useEffect(() => {
    if (open) {
      const fresh = getInitialNewRitase();
      setNewRitase(fresh);
      createOriginalRef.current = JSON.stringify(fresh);
    }
  }, [open]);

  const createIsDirty = () => {
    return JSON.stringify(newRitase) !== createOriginalRef.current;
  };

  const askCancelCreate = async () => {
    if (!createIsDirty()) {
      onClose();
      return;
    }
    const confirmed = await swal.confirm(
      "Batalkan Pembuatan?",
      "Data jadwal baru yang sudah diisi akan hilang.",
      "Ya, batalkan",
    );
    if (confirmed) onClose();
  };

  const handleAddStop = () => {
    const defaultSeller = masterOptions?.sellers[0];
    const newStop: AdminRitaseStop = {
      id_stop: Date.now(),
      urutan: 0,
      jenis_stop: "seller",
      id_seller: defaultSeller?.id_seller ?? 1,
      nama_lokasi: defaultSeller?.nama_seller ?? "Seller 1",
      keterangan: "Singgah / Ambil paket",
    };
    setNewRitase((cur) => ({ ...cur, stops: [...cur.stops, newStop] }));
  };

  const handleRemoveStop = async (index: number) => {
    const name = newRitase.stops[index]?.nama_lokasi ?? "titik ini";
    const confirmed = await swal.confirm(
      "Hapus Titik Ini?",
      `Titik "${name}" akan dihapus dari rute jadwal baru.`,
      "Ya, hapus!",
    );
    if (confirmed) {
      setNewRitase((cur) => ({
        ...cur,
        stops: cur.stops.filter((_, i) => i !== index),
      }));
    }
  };

  const handleMoveStop = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRitase.stops.length) return;
    const arr = [...newRitase.stops];
    [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
    setNewRitase((cur) => ({ ...cur, stops: arr }));
  };

  const handleUpdateStopField = (
    index: number,
    field: keyof AdminRitaseStop,
    value: any,
  ) => {
    setNewRitase((cur) => ({
      ...cur,
      stops: cur.stops.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSelectLocationOption = (index: number, selectedId: number) => {
    setNewRitase((cur) => ({
      ...cur,
      stops: cur.stops.map((s, i) => {
        if (i !== index) return s;
        let updatedName = "";
        let idSeller: number | undefined;
        let idImplant: number | undefined;
        let idGudang: number | undefined;
        let idDropPoint: number | undefined;

        if (s.jenis_stop === "seller") {
          idSeller = selectedId;
          const found = masterOptions?.sellers.find(
            (sel) => sel.id_seller === selectedId,
          );
          updatedName = found?.nama_seller ?? `Seller #${selectedId}`;
        } else if (s.jenis_stop === "implant") {
          idImplant = selectedId;
          const found = implantOptions.find(
            (imp) => imp.id_implant === selectedId,
          );
          updatedName = found?.nama_implant ?? `Implant #${selectedId}`;
        } else if (s.jenis_stop === "gudang") {
          idGudang = selectedId;
          const found = masterOptions?.gudangs.find(
            (g) => g.id_gudang === selectedId,
          );
          updatedName = found?.nama_gudang ?? `Gudang #${selectedId}`;
        } else {
          idDropPoint = selectedId;
          const found = masterOptions?.drop_points.find(
            (dp) => dp.id_drop_point === selectedId,
          );
          updatedName = found?.nama_drop_point ?? `Gateway #${selectedId}`;
        }

        return {
          ...s,
          id_seller: idSeller,
          id_implant: idImplant,
          id_gudang: idGudang,
          id_drop_point: idDropPoint,
          nama_lokasi: updatedName,
        };
      }),
    }));
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newRitase.tanggal < todayStr) {
      swal.error(
        "Error",
        "Tidak bisa membuat jadwal untuk tanggal yang sudah berlalu.",
      );
      return;
    }

    const existingRitase = existingRitases?.find(
      (r) =>
        r.id_driver === newRitase.id_driver &&
        r.tanggal === newRitase.tanggal &&
        r.ritase_ke === newRitase.ritase_ke,
    );
    if (existingRitase) {
      const driverName =
        masterOptions?.drivers.find((d) => d.id_driver === newRitase.id_driver)
          ?.nama_driver ?? `Driver #${newRitase.id_driver}`;
      swal.error(
        "Duplikat Ritase",
        `${driverName} sudah memiliki Ritase Ke-${newRitase.ritase_ke} pada tanggal ${newRitase.tanggal} (${existingRitase.kode_ritase}). Pilih driver lain atau ritase ke berbeda.`,
      );
      return;
    }

    const selectedDriver = activeDrivers.find(
      (d) => d.id_driver === newRitase.id_driver,
    );
    if (!selectedDriver) {
      swal.error(
        "Driver Tidak Aktif",
        "Driver yang dipilih sedang tidak aktif. Pilih driver lain yang aktif.",
      );
      return;
    }
    const selectedVehicle = activeVehicles.find(
      (k) => k.id_kendaraan === newRitase.id_kendaraan,
    );
    if (!selectedVehicle) {
      swal.error(
        "Kendaraan Tidak Tersedia",
        "Kendaraan yang dipilih sedang tidak tersedia. Pilih kendaraan lain.",
      );
      return;
    }

    const reindexedStops = newRitase.stops.map((s, idx) => ({
      ...s,
      urutan: idx + 1,
      id_lokasi:
        s.jenis_stop === "gudang"
          ? s.id_gudang
          : s.jenis_stop === "seller"
            ? s.id_seller
            : s.jenis_stop === "implant"
              ? s.id_implant
              : s.id_drop_point,
    }));

    const driverName =
      masterOptions?.drivers.find((d) => d.id_driver === newRitase.id_driver)
        ?.nama_driver ?? "Driver";
    const confirmed = await swal.confirm(
      "Simpan Jadwal Baru?",
      `Jadwal ritase untuk ${driverName} R${newRitase.ritase_ke} akan disimpan ke database.`,
      "Ya, Simpan",
    );
    if (!confirmed) return;

    createMutation.mutate(
      {
        tanggal: newRitase.tanggal,
        id_driver: newRitase.id_driver,
        id_kendaraan: newRitase.id_kendaraan,
        id_drop_point:
          [...newRitase.stops]
            .reverse()
            .find((s) => s.jenis_stop === "gateway")?.id_drop_point ??
          masterOptions?.drop_points[0]?.id_drop_point ??
          newRitase.id_drop_point,
        ritase_ke: newRitase.ritase_ke,
        jenis_ritase: newRitase.jenis_ritase,
        stops: reindexedStops,
      },
      {
        onSuccess: () => {
          onClose();
          swal.success("Berhasil!", "Jadwal ritase baru berhasil dibuat!");
          onSuccess();
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Terjadi kesalahan. Coba lagi.";
          swal.error("Gagal membuat jadwal", msg);
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-lg bg-white p-4 sm:p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Buat Jadwal Ritase Manual
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500">
              Pilih driver &amp; lokasi terdaftar untuk alokasi tugas ritase baru
            </p>
          </div>
          <button
            type="button"
            onClick={askCancelCreate}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSaveCreate}
          className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Tanggal Perjalanan
              </label>
              <input
                type="date"
                min={todayStr}
                value={newRitase.tanggal}
                onChange={(e) =>
                  setNewRitase({ ...newRitase, tanggal: e.target.value })
                }
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Jenis
              </label>
              <select
                value={newRitase.jenis_ritase}
                onChange={(e) => {
                  const newJenis = e.target.value;
                  const validDriver = activeDrivers.find(
                    (d) => getDriverJenis(d.id_driver) === newJenis,
                  );
                  const maxR = newJenis === "incoming" ? 4 : 3;
                  setNewRitase({
                    ...newRitase,
                    jenis_ritase: newJenis,
                    id_driver: validDriver?.id_driver ?? newRitase.id_driver,
                    ritase_ke: Math.min(maxR, newRitase.ritase_ke),
                  });
                }}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Pilih Driver
              </label>
              <select
                value={newRitase.id_driver}
                onChange={(e) => {
                  const newDriverId = parseInt(e.target.value, 10);
                  const driver = masterOptions?.drivers.find(
                    (d) => d.id_driver === newDriverId,
                  );
                  const jabatan = (driver?.jabatan ?? "").toLowerCase();
                  const maxR = jabatan.includes("incoming") ? 4 : 3;
                  setNewRitase({
                    ...newRitase,
                    id_driver: newDriverId,
                    ritase_ke: Math.min(maxR, newRitase.ritase_ke),
                  });
                }}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {activeDrivers
                  .filter(
                    (d) =>
                      getDriverJenis(d.id_driver) === newRitase.jenis_ritase,
                  )
                  .map((d) => (
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
                onChange={(e) =>
                  setNewRitase({
                    ...newRitase,
                    id_kendaraan: parseInt(e.target.value, 10),
                  })
                }
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {activeVehicles.map((k) => (
                  <option key={k.id_kendaraan} value={k.id_kendaraan}>
                    {k.plat_nomor} ({k.jenis_kendaraan})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Ritase Ke-
              </label>
              {(() => {
                const selDriver = masterOptions?.drivers.find(
                  (d) => d.id_driver === newRitase.id_driver,
                );
                const jabatan = (selDriver?.jabatan ?? "").toLowerCase();
                const maxR = jabatan.includes("incoming") ? 4 : 3;
                return (
                  <select
                    value={newRitase.ritase_ke}
                    onChange={(e) =>
                      setNewRitase({
                        ...newRitase,
                        ritase_ke: parseInt(e.target.value, 10),
                      })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {Array.from({ length: maxR }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        R{i + 1}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>

          {/* Auto-fill jam preview */}
          {(() => {
            const selectedDriver = activeDrivers.find(
              (d) => d.id_driver === newRitase.id_driver,
            );
            const jenis = (selectedDriver?.jabatan ?? "")
              .toLowerCase()
              .includes("incoming")
              ? "incoming"
              : "outgoing";
            const jamConfig = masterOptions?.jam_ritase?.find(
              (j) => j.jenis === jenis && j.ritase_ke === newRitase.ritase_ke,
            );
            if (jamConfig) {
              return (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Waktu:{" "}
                    <strong>
                      {formatJam(jamConfig.jam_mulai)} –{" "}
                      {formatJam(jamConfig.jam_selesai)}
                    </strong>{" "}
                    ({jenis === "outgoing" ? "Outgoing" : "Incoming"} R
                    {newRitase.ritase_ke})
                    {selectedDriver && (
                      <span> • {selectedDriver.nama_driver}</span>
                    )}
                  </p>
                </div>
              );
            }
            return null;
          })()}

          {/* Stops Editor */}
          <StopsEditor
            stops={newRitase.stops}
            onAddStop={handleAddStop}
            onRemoveStop={handleRemoveStop}
            onMoveStop={handleMoveStop}
            onUpdateStopField={handleUpdateStopField}
            onSelectLocationOption={handleSelectLocationOption}
            masterOptions={masterOptions}
            implantOptions={implantOptions}
            defaultImplantPoint={defaultImplantPoint}
          />

          {createMutation.error && (
            <MutationError error={createMutation.error} />
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={askCancelCreate}
              className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FEA103] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E09102] disabled:opacity-50"
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
  );
}

