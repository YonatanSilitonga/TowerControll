"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { SearchSelect } from "@/components/jadwal/search-select";
import type { AdminRitaseStop } from "@/types/armada";
import type { MasterOptions } from "@/hooks/use-admin-ritase";

type ImplantItem = NonNullable<MasterOptions["implant_points"]>[number];

interface StopsEditorProps {
  stops: AdminRitaseStop[];
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onMoveStop: (index: number, direction: "up" | "down") => void;
  onUpdateStopField: (
    index: number,
    field: keyof AdminRitaseStop,
    value: any,
  ) => void;
  onSelectLocationOption: (index: number, selectedId: number) => void;
  masterOptions?: MasterOptions;
  implantOptions: ImplantItem[];
  defaultImplantPoint?: ImplantItem;
}

export function StopsEditor({
  stops,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onUpdateStopField,
  onSelectLocationOption,
  masterOptions,
  implantOptions,
  defaultImplantPoint,
}: StopsEditorProps) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Urutan Stop Rute Tempat Perjalanan ({stops.length}):
        </label>
        <button
          type="button"
          onClick={onAddStop}
          className="inline-flex items-center gap-1 rounded-lg bg-[#0c1e3a]/10 px-2.5 py-1 text-xs font-bold text-[#0c1e3a] hover:bg-[#0c1e3a]/20 dark:text-slate-400"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah Stop
        </button>
      </div>

      <div className="space-y-2">
        {stops.map((stop, idx) => (
          <div
            key={stop.id_stop || idx}
            className="rounded-md border border-slate-200 bg-slate-50 p-2.5 sm:p-3 dark:border-slate-800 dark:bg-slate-800/50 space-y-2"
          >
            {/* Row 1: Number + Arrows + Type Select + Trash */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0c1e3a] text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveStop(idx, "up")}
                    className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === stops.length - 1}
                    onClick={() => onMoveStop(idx, "down")}
                    className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Tipe Stop */}
              <select
                value={
                  stop.jenis_stop === "drop_point" ? "gateway" : stop.jenis_stop
                }
                onChange={(e) => {
                  const newType = e.target.value;
                  onUpdateStopField(idx, "jenis_stop", newType);
                  if (newType === "seller" && masterOptions?.sellers[0]) {
                    onSelectLocationOption(
                      idx,
                      masterOptions.sellers[0].id_seller,
                    );
                  } else if (newType === "implant" && defaultImplantPoint) {
                    onSelectLocationOption(
                      idx,
                      defaultImplantPoint.id_implant,
                    );
                  } else if (newType === "gudang" && masterOptions?.gudangs[0]) {
                    onSelectLocationOption(
                      idx,
                      masterOptions.gudangs[0].id_gudang,
                    );
                  } else if (
                    newType === "gateway" &&
                    masterOptions?.drop_points[0]
                  ) {
                    onSelectLocationOption(
                      idx,
                      masterOptions.drop_points[0].id_drop_point,
                    );
                  }
                }}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="gudang">Gudang</option>
                <option value="seller">Seller / Toko</option>
                <option value="implant">Implant</option>
                <option value="gateway">Gateway</option>
              </select>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => onRemoveStop(idx)}
                className="p-1.5 text-slate-400 transition-colors hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Row 2: Location Select — full width */}
            {stop.jenis_stop === "seller" ? (
              <SearchSelect
                value={stop.id_seller}
                onChange={(id) => onSelectLocationOption(idx, id)}
                placeholder="Pilih seller..."
                options={(masterOptions?.sellers ?? []).map((s) => ({
                  id: s.id_seller,
                  label: s.nama_seller,
                  sub: s.kode_seller,
                }))}
              />
            ) : stop.jenis_stop === "implant" ? (
              <SearchSelect
                value={stop.id_implant}
                onChange={(id) => onSelectLocationOption(idx, id)}
                placeholder="Pilih implant..."
                options={implantOptions.map((s) => ({
                  id: s.id_implant,
                  label: s.nama_implant,
                  sub: s.kode_implant,
                  disabled: s.has_coordinate === false,
                  hint: "Belum ada koordinat",
                }))}
              />
            ) : stop.jenis_stop === "gudang" ? (
              <SearchSelect
                value={stop.id_gudang}
                onChange={(id) => onSelectLocationOption(idx, id)}
                placeholder="Pilih gudang..."
                options={(masterOptions?.gudangs ?? []).map((g) => ({
                  id: g.id_gudang,
                  label: g.nama_gudang,
                }))}
              />
            ) : (
              <SearchSelect
                value={stop.id_drop_point}
                onChange={(id) => onSelectLocationOption(idx, id)}
                placeholder="Pilih gateway..."
                options={(masterOptions?.drop_points ?? []).map((dp) => ({
                  id: dp.id_drop_point,
                  label: dp.nama_drop_point,
                  sub: dp.kode_dp,
                }))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

