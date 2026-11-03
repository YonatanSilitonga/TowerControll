"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, X, Zap } from "lucide-react";
import { swal } from "@/lib/swal";
import { ApiError } from "@/types/api";
import { useUpdateRitase, type MasterOptions } from "@/hooks/use-admin-ritase";
import type { AdminRitaseItem, AdminRitaseStop } from "@/types/armada";
import { StopsEditor } from "@/components/jadwal/modals/stops-editor";
import { MutationError } from "@/components/jadwal/mutation-error";
import { formatAuditTime } from "@/lib/utils";

type DriverItem = MasterOptions["drivers"][number];
type VehicleItem = MasterOptions["kendaraan"][number];
type ImplantItem = NonNullable<MasterOptions["implant_points"]>[number];

interface EditRitaseModalProps {
  ritase: AdminRitaseItem | null;
  onClose: () => void;
  masterOptions?: MasterOptions;
  implantOptions: ImplantItem[];
  defaultImplantPoint?: ImplantItem;
  activeDrivers: DriverItem[];
  activeVehicles: VehicleItem[];
  isWhisnu: boolean;
  onSuccess: () => void;
}

export function EditRitaseModal({
  ritase,
  onClose,
  masterOptions,
  implantOptions,
  defaultImplantPoint,
  activeDrivers,
  activeVehicles,
  isWhisnu,
  onSuccess,
}: EditRitaseModalProps) {
  const updateMutation = useUpdateRitase();
  const [editingRitase, setEditingRitase] = useState<AdminRitaseItem | null>(
    ritase,
  );
  const editingOriginalRef = useRef<string>("");

  useEffect(() => {
    setEditingRitase(ritase);
    if (ritase) {
      editingOriginalRef.current = JSON.stringify(ritase);
    }
  }, [ritase]);

  const ritaseIsDirty = () => {
    if (!editingRitase || !editingOriginalRef.current) return false;
    const a = editingRitase;
    const b: AdminRitaseItem = JSON.parse(editingOriginalRef.current);
    if (a.id_driver !== b.id_driver) return true;
    if (a.id_kendaraan !== b.id_kendaraan) return true;
    if (a.status !== b.status) return true;
    if (a.ritase_ke !== b.ritase_ke) return true;
    const sa = a.stops ?? [];
    const sb = b.stops ?? [];
    if (sa.length !== sb.length) return true;
    for (let i = 0; i < sa.length; i++) {
      const s = sa[i];
      const t = sb[i];
      if (
        s.jenis_stop !== t.jenis_stop ||
        s.id_seller !== t.id_seller ||
        s.id_implant !== t.id_implant ||
        s.id_gudang !== t.id_gudang ||
        s.id_drop_point !== t.id_drop_point ||
        (s.keterangan || "") !== (t.keterangan || "")
      ) {
        return true;
      }
    }
    return false;
  };

  const closeEditModal = () => {
    setEditingRitase(null);
    onClose();
  };

  const askCancelEdit = async () => {
    if (!ritaseIsDirty()) {
      closeEditModal();
      return;
    }
    const confirmed = await swal.confirm(
      "Batalkan Perubahan?",
      "Perubahan jadwal dan rute yang belum disimpan akan hilang.",
      "Ya, batalkan",
    );
    if (confirmed) closeEditModal();
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
    setEditingRitase((cur) =>
      cur ? { ...cur, stops: [...(cur.stops ?? []), newStop] } : cur,
    );
  };

  const handleRemoveStop = async (index: number) => {
    const name = editingRitase?.stops?.[index]?.nama_lokasi ?? "titik ini";
    const confirmed = await swal.confirm(
      "Hapus Titik Ini?",
      `Titik "${name}" akan dihapus dari rute ${editingRitase?.kode_ritase ?? ""}. Tindakan ini hanya berlaku saat disimpan.`,
      "Ya, hapus!",
    );
    if (confirmed) {
      setEditingRitase((cur) =>
        cur
          ? {
              ...cur,
              stops: (cur.stops ?? []).filter((_, i) => i !== index),
            }
          : cur,
      );
    }
  };

  const handleMoveStop = (index: number, direction: "up" | "down") => {
    const move = (stops: AdminRitaseStop[]) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= stops.length) return stops;
      const arr = [...stops];
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr;
    };
    setEditingRitase((cur) =>
      cur ? { ...cur, stops: move(cur.stops ?? []) } : cur,
    );
  };

  const handleUpdateStopField = (
    index: number,
    field: keyof AdminRitaseStop,
    value: any,
  ) => {
    const upd = (stops: AdminRitaseStop[]) =>
      stops.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    setEditingRitase((cur) =>
      cur ? { ...cur, stops: upd(cur.stops ?? []) } : cur,
    );
  };

  const handleSelectLocationOption = (index: number, selectedId: number) => {
    const resolve = (currentStop: AdminRitaseStop): AdminRitaseStop => {
      let updatedName = "";
      let idSeller: number | undefined;
      let idImplant: number | undefined;
      let idGudang: number | undefined;
      let idDropPoint: number | undefined;

      if (currentStop.jenis_stop === "seller") {
        idSeller = selectedId;
        const found = masterOptions?.sellers.find(
          (s) => s.id_seller === selectedId,
        );
        updatedName = found?.nama_seller ?? `Seller #${selectedId}`;
      } else if (currentStop.jenis_stop === "implant") {
        idImplant = selectedId;
        const found = implantOptions.find(
          (s) => s.id_implant === selectedId,
        );
        updatedName = found?.nama_implant ?? `Implant #${selectedId}`;
      } else if (currentStop.jenis_stop === "gudang") {
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
        ...currentStop,
        id_seller: idSeller,
        id_implant: idImplant,
        id_gudang: idGudang,
        id_drop_point: idDropPoint,
        nama_lokasi: updatedName,
      };
    };

    const upd = (stops: AdminRitaseStop[]) =>
      stops.map((s, i) => (i === index ? resolve(s) : s));

    setEditingRitase((cur) =>
      cur ? { ...cur, stops: upd(cur.stops ?? []) } : cur,
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRitase) return;

    const stops = editingRitase.stops ?? [];
    const reindexedStops = stops.map((s, idx) => ({
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

    const confirmed = await swal.confirm(
      "Simpan Perubahan?",
      `Perubahan rute untuk ${editingRitase.kode_ritase} (${editingRitase.nama_driver}) akan diterapkan.`,
      "Ya, Simpan",
    );
    if (!confirmed) return;

    updateMutation.mutate(
      {
        idRitase: editingRitase.id_ritase,
        data: {
          id_driver: editingRitase.id_driver,
          id_kendaraan: editingRitase.id_kendaraan,
          id_drop_point:
            [...stops]
              .reverse()
              .find((s) => s.jenis_stop === "gateway")?.id_drop_point ??
            masterOptions?.drop_points[0]?.id_drop_point ??
            1,
          status: editingRitase.status,
          ritase_ke: editingRitase.ritase_ke,
          stops: reindexedStops,
        },
      },
      {
        onSuccess: () => {
          closeEditModal();
          swal.success(
            "Tersimpan!",
            `Ritase ${editingRitase.kode_ritase} berhasil diperbarui.`,
          );
          onSuccess();
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Terjadi kesalahan. Coba lagi.";
          swal.error("Gagal menyimpan rute", msg);
        },
      },
    );
  };

  if (!editingRitase) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-lg bg-white p-4 sm:p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              Edit Ritase &amp; Rute Perjalanan - {editingRitase.kode_ritase}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500">
              Ubah status, urutan ritase, atau atur lokasi tempat yang harus
              dikunjungi oleh {editingRitase.nama_driver} hari ini
            </p>
          </div>
          <button
            type="button"
            onClick={askCancelEdit}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSaveEdit}
          className="flex-1 overflow-y-auto mt-4 space-y-5 pr-1"
        >
          {editingRitase.status === "berjalan" && !isWhisnu && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Ritase sedang berjalan. Hanya perhentian (stops) yang bisa
                diubah.
              </p>
            </div>
          )}
          {isWhisnu && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/40">
              <Zap className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                <span className="font-bold">Akses Khusus (Whisnu):</span> Anda
                dapat mengubah status (misal: selesai kembali ke direncanakan),
                driver, armada, dan rute secara leluasa.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Driver
              </label>
              <select
                value={editingRitase.id_driver}
                disabled={!isWhisnu && editingRitase.status === "berjalan"}
                onChange={(e) =>
                  setEditingRitase({
                    ...editingRitase,
                    id_driver: parseInt(e.target.value, 10),
                  })
                }
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {!activeDrivers.some(
                  (d) => d.id_driver === editingRitase.id_driver,
                ) && (
                  <option value={editingRitase.id_driver}>
                    {editingRitase.nama_driver}
                  </option>
                )}
                {activeDrivers.map((d) => (
                  <option key={d.id_driver} value={d.id_driver}>
                    {d.nama_driver} ({d.jabatan})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Kendaraan
              </label>
              <select
                value={editingRitase.id_kendaraan}
                disabled={!isWhisnu && editingRitase.status === "berjalan"}
                onChange={(e) =>
                  setEditingRitase({
                    ...editingRitase,
                    id_kendaraan: parseInt(e.target.value, 10),
                  })
                }
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {!activeVehicles.some(
                  (v) => v.id_kendaraan === editingRitase.id_kendaraan,
                ) && (
                  <option value={editingRitase.id_kendaraan}>
                    {editingRitase.nopol}
                  </option>
                )}
                {activeVehicles.map((v) => (
                  <option key={v.id_kendaraan} value={v.id_kendaraan}>
                    {v.plat_nomor} ({v.jenis_kendaraan})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Status Perjalanan{" "}
                {isWhisnu && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    (Bisa Diedit)
                  </span>
                )}
              </label>
              <select
                value={editingRitase.status}
                disabled={!isWhisnu}
                onChange={(e) =>
                  setEditingRitase({
                    ...editingRitase,
                    status: e.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                disabled={!isWhisnu && editingRitase.status === "berjalan"}
                onChange={(e) =>
                  setEditingRitase({
                    ...editingRitase,
                    ritase_ke: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Stops Editor */}
          <StopsEditor
            stops={editingRitase.stops ?? []}
            onAddStop={handleAddStop}
            onRemoveStop={handleRemoveStop}
            onMoveStop={handleMoveStop}
            onUpdateStopField={handleUpdateStopField}
            onSelectLocationOption={handleSelectLocationOption}
            masterOptions={masterOptions}
            implantOptions={implantOptions}
            defaultImplantPoint={defaultImplantPoint}
          />

          {updateMutation.error && (
            <MutationError error={updateMutation.error} />
          )}

          {/* Audit Fields */}
          {editingRitase.created_at && (
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Riwayat Perubahan
              </p>
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 font-semibold text-slate-400">
                    Dibuat
                  </span>
                  <span>
                    {formatAuditTime(editingRitase.created_at)}
                    {editingRitase.created_by_name && (
                      <span className="ml-1 text-slate-400">
                        oleh {editingRitase.created_by_name}
                      </span>
                    )}
                  </span>
                </div>
                {editingRitase.updated_at && (
                  <div className="flex items-center gap-2">
                    <span className="w-20 shrink-0 font-semibold text-slate-400">
                      Diubah
                    </span>
                    <span>
                      {formatAuditTime(editingRitase.updated_at)}
                      {editingRitase.updated_by_name && (
                        <span className="ml-1 text-slate-400">
                          oleh {editingRitase.updated_by_name}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={askCancelEdit}
              className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FEA103] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E09102] disabled:opacity-50"
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
  );
}
