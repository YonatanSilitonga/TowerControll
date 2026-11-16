"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Loader2,
  PackageCheck,
  Plus,
  Save,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useDropperEntries, useInputDropper } from "@/hooks/use-dropper";
import { useSeller } from "@/hooks/use-seller";
import { swal } from "@/lib/swal";
import { cn, formatDateTime } from "@/lib/utils";
import type { DropperEntry, DropperInputItem } from "@/types/dropper";

interface FormRow {
  key: string;
  id_seller: string;
  ritase_ke: string;
  jumlah_awb: string;
  jumlah_awb_hv: string;
  catatan: string;
}

const RITASE_OPTIONS = [1, 2, 3] as const;

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

function newRow(): FormRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id_seller: "",
    ritase_ke: "1",
    jumlah_awb: "",
    jumlah_awb_hv: "",
    catatan: "",
  };
}

function number(value: number) {
  return value.toLocaleString("id-ID");
}

const columns: Column<DropperEntry>[] = [
  {
    header: "Waktu",
    className: "w-36 whitespace-nowrap text-xs text-slate-500",
    render: (e) => formatDateTime(e.created_at),
  },
  {
    header: "Seller",
    render: (e) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-800 dark:text-white">
          {e.nama_seller}
        </p>
        {e.kode_seller && (
          <p className="font-mono text-[11px] text-slate-400">{e.kode_seller}</p>
        )}
      </div>
    ),
  },
  {
    header: "Rit",
    className: "w-20 whitespace-nowrap",
    render: (e) => (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        Rit {e.ritase_ke}
      </span>
    ),
  },
  {
    header: "AWB",
    className: "w-24 text-right font-mono tabular-nums",
    render: (e) => number(e.jumlah_awb),
  },
  {
    header: "AWB HV",
    className: "w-24 text-right font-mono tabular-nums",
    render: (e) => number(e.jumlah_awb_hv),
  },
  {
    header: "Total",
    className: "w-24 text-right font-mono font-semibold tabular-nums",
    render: (e) => number(e.jumlah_awb + e.jumlah_awb_hv),
  },
  {
    header: "Catatan",
    render: (e) => (
      <span className="block max-w-[260px] truncate text-xs text-slate-500" title={e.catatan}>
        {e.catatan || "-"}
      </span>
    ),
  },
];

function SummaryCard({
  label,
  awb,
  hv,
  entries,
  active,
}: {
  label: string;
  awb: number;
  hv: number;
  entries: number;
  active?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-lg border-slate-200",
        active && "border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <Truck className={cn("h-4 w-4", active ? "text-amber-500" : "text-slate-300")} />
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
          {number(awb)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          AWB · {number(hv)} HV · {entries} input
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Total gabungan: {number(awb + hv)}
        </p>
      </CardContent>
    </Card>
  );
}

export function DropperInputPanel() {
  const [tanggal, setTanggal] = useState(todayJakarta);
  const [rows, setRows] = useState<FormRow[]>(() => [newRow()]);
  const [openInput, setOpenInput] = useState(false);

  const { data: sellers = [], isLoading: loadingSellers } = useSeller();
  const { data: entries = [], isLoading: loadingEntries } = useDropperEntries(tanggal);
  const inputDropper = useInputDropper();

  const dropperSellers = useMemo(
    () => sellers.filter((seller) => seller.is_dropper),
    [sellers],
  );

  const summary = useMemo(() => {
    const base = RITASE_OPTIONS.map((ritaseKe) => ({
      ritaseKe,
      awb: 0,
      hv: 0,
      entries: 0,
    }));
    for (const entry of entries) {
      const target = base.find((item) => item.ritaseKe === entry.ritase_ke);
      if (!target) continue;
      target.awb += entry.jumlah_awb;
      target.hv += entry.jumlah_awb_hv;
      target.entries += 1;
    }
    return base;
  }, [entries]);

  const total = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          acc.awb += entry.jumlah_awb;
          acc.hv += entry.jumlah_awb_hv;
          acc.entries += 1;
          return acc;
        },
        { awb: 0, hv: 0, entries: 0 },
      ),
    [entries],
  );

  const updateRow = (key: string, patch: Partial<FormRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, newRow()]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return [newRow()];
      return prev.filter((row) => row.key !== key);
    });
  };

  const isDirty = () =>
    rows.some(
      (row) =>
        row.id_seller ||
        row.jumlah_awb ||
        row.jumlah_awb_hv ||
        row.catatan.trim(),
    );

  const handleClose = async () => {
    if (isDirty()) {
      const confirmed = await swal.confirm(
        "Batalkan Input?",
        "Data yang sudah diisi akan hilang.",
        "Ya, Batalkan",
      );
      if (!confirmed) return;
      setRows([newRow()]);
    }
    setOpenInput(false);
  };

  const handleSubmit = async () => {
    try {
      const items: DropperInputItem[] = rows.map((row, index) => {
        const idSeller = Number(row.id_seller);
        const ritaseKe = Number(row.ritase_ke);
        const jumlahAWB = Number(row.jumlah_awb || 0);
        const jumlahAWBHV = Number(row.jumlah_awb_hv || 0);

        if (!idSeller) {
          throw new Error(`Pilih seller dropper pada baris ${index + 1}.`);
        }
        if (!Number.isInteger(jumlahAWB) || jumlahAWB < 0) {
          throw new Error(`Jumlah AWB baris ${index + 1} tidak valid.`);
        }
        if (!Number.isInteger(jumlahAWBHV) || jumlahAWBHV < 0) {
          throw new Error(`Jumlah AWB HV baris ${index + 1} tidak valid.`);
        }
        if (jumlahAWB + jumlahAWBHV <= 0) {
          throw new Error(`Jumlah AWB baris ${index + 1} harus lebih dari 0.`);
        }

        return {
          id_seller: idSeller,
          ritase_ke: ritaseKe,
          jumlah_awb: jumlahAWB,
          jumlah_awb_hv: jumlahAWBHV,
          catatan: row.catatan.trim(),
        };
      });

      await inputDropper.mutateAsync({
        jenis_ritase: "outgoing",
        items,
      });
      setRows([newRow()]);
      setOpenInput(false);
      swal.success(
        "Input Dropper Tersimpan",
        `${items.length} seller berhasil dicatat untuk hari ini.`,
      );
    } catch (err) {
      swal.error(
        "Gagal Menyimpan",
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan input.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          awb={total.awb}
          hv={total.hv}
          entries={total.entries}
          active
        />
        {summary.map((item) => (
          <SummaryCard
            key={item.ritaseKe}
            label={`Rit ${item.ritaseKe}`}
            awb={item.awb}
            hv={item.hv}
            entries={item.entries}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          onClick={() => setOpenInput(true)}
          className="bg-[#0c1e3a] text-white hover:bg-[#0c1e3a]/90"
        >
          <Plus className="h-4 w-4" />
          Input Dropper
        </Button>
      </div>

      {openInput && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="flex w-full max-w-3xl max-h-[90vh] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-2xl sm:p-5 dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                  <PackageCheck className="h-4 w-4 text-[#0c1e3a] dark:text-amber-400" />
                  Input Manual Dropper
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                  Input selalu dicatat untuk tanggal hari ini (WIB). Satu seller
                  boleh diinput lebih dari sekali bila berbeda rit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {!loadingSellers && dropperSellers.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Belum ada seller dengan status Dropper. Minta admin menandai seller
                di menu Admin → Seller.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Seller Dropper
                    </label>
                    <select
                      value={row.id_seller}
                      onChange={(e) => updateRow(row.key, { id_seller: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="" disabled>
                        Pilih seller…
                      </option>
                      {dropperSellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                          {seller.code ? ` · ${seller.code}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28 space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Rit
                    </label>
                    <select
                      value={row.ritase_ke}
                      onChange={(e) => updateRow(row.key, { ritase_ke: e.target.value })}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#FEA103] focus:ring-2 focus:ring-[#FEA103]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {RITASE_OPTIONS.map((rit) => (
                        <option key={rit} value={rit}>
                          Rit {rit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRow(row.key)}
                      className="h-10 w-10 text-rose-500 hover:text-rose-600"
                      title="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Jumlah AWB
                    </label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.jumlah_awb}
                      onChange={(e) => updateRow(row.key, { jumlah_awb: e.target.value })}
                      placeholder="0"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      AWB HV
                    </label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.jumlah_awb_hv}
                      onChange={(e) =>
                        updateRow(row.key, { jumlah_awb_hv: e.target.value })
                      }
                      placeholder="0"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Catatan
                    </label>
                    <Input
                      value={row.catatan}
                      onChange={(e) => updateRow(row.key, { catatan: e.target.value })}
                      placeholder={`Catatan baris ${index + 1}`}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Tambah Seller
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={inputDropper.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={inputDropper.isPending || dropperSellers.length === 0}
                  className="bg-[#0c1e3a] text-white hover:bg-[#0c1e3a]/90"
                >
                  {inputDropper.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Input
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="rounded-lg border-slate-200">
        <CardHeader className="border-b py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-[#0c1e3a]" />
            Riwayat Input Dropper
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<DropperEntry>
            rows={entries}
            loading={loadingEntries}
            rowKey={(entry) => String(entry.id)}
            columns={columns}
            searchPlaceholder="Cari seller / catatan..."
            searchFilter={(entry, q) =>
              entry.nama_seller.toLowerCase().includes(q.toLowerCase()) ||
              entry.kode_seller.toLowerCase().includes(q.toLowerCase()) ||
              entry.catatan.toLowerCase().includes(q.toLowerCase())
            }
            toolbar={
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
                  Tanggal
                </span>
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="h-9 w-[150px]"
                />
              </div>
            }
            emptyText="Belum ada input dropper pada tanggal ini"
            defaultPageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}
