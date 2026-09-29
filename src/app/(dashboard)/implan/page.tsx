"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Save,
  Search,
  Store,
  X,
} from "lucide-react";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useTrackingMap } from "@/hooks/use-tracking";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ImplanBarangLog, SellerLocation } from "@/types/armada";

interface RowEditState {
  jumlah: string;
  koli: string;
  ecer: string;
  high_value: string;
  status: string;
  catatan: string;
}

export default function ImplanPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { data: mapData, isLoading: loadingMap } = useTrackingMap();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "menunggu" | "sudah_diambil" | "kosong">("all");

  // State untuk form edit di setiap baris (AWB, Koli, Ecer, High Value, Status, Catatan)
  const [editValues, setEditValues] = useState<Record<number, RowEditState>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<number | null>(null);

  // Modal Riwayat
  const [activeHistorySeller, setActiveHistorySeller] = useState<SellerLocation | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ImplanBarangLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const sellers = mapData?.sellers ?? [];

  // Summary Metrics
  const summary = useMemo(() => {
    let totalAwbMenunggu = 0;
    let totalKoliMenunggu = 0;
    let totalHvMenunggu = 0;
    let totalAwbDiambil = 0;
    let countMenunggu = 0;
    let countDiambil = 0;
    let countBelumInput = 0;

    sellers.forEach((s) => {
      const jml = s.jumlah_barang ?? 0;
      const koli = s.koli ?? 0;
      const hv = s.high_value ?? 0;

      if (s.status_pickup === "sudah_diambil") {
        countDiambil++;
        totalAwbDiambil += jml;
      } else if (jml > 0 || koli > 0 || hv > 0) {
        countMenunggu++;
        totalAwbMenunggu += jml;
        totalKoliMenunggu += koli;
        totalHvMenunggu += hv;
      } else {
        countBelumInput++;
      }
    });

    return {
      totalSellers: sellers.length,
      countMenunggu,
      totalAwbMenunggu,
      totalKoliMenunggu,
      totalHvMenunggu,
      countDiambil,
      totalAwbDiambil,
      countBelumInput,
    };
  }, [sellers]);

  // Filtered sellers
  const filteredSellers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellers.filter((s) => {
      const matchQuery =
        !q ||
        s.nama_seller.toLowerCase().includes(q) ||
        (s.kode_seller ?? "").toLowerCase().includes(q) ||
        (s.kota ?? "").toLowerCase().includes(q) ||
        (s.pic ?? "").toLowerCase().includes(q);

      if (!matchQuery) return false;

      const jml = s.jumlah_barang ?? 0;
      const koli = s.koli ?? 0;
      const hv = s.high_value ?? 0;

      if (filterStatus === "menunggu") {
        return (s.status_pickup === "menunggu" || !s.status_pickup) && (jml > 0 || koli > 0 || hv > 0);
      }
      if (filterStatus === "sudah_diambil") {
        return s.status_pickup === "sudah_diambil";
      }
      if (filterStatus === "kosong") {
        return jml === 0 && koli === 0 && hv === 0;
      }
      return true;
    });
  }, [sellers, search, filterStatus]);

  // Handler save row
  const handleSave = async (seller: SellerLocation) => {
    if (!token) return;
    const currentEdit = editValues[seller.id_seller];
    const jumlahNum = currentEdit?.jumlah !== undefined ? parseInt(currentEdit.jumlah, 10) || 0 : (seller.jumlah_barang ?? 0);
    const koliNum = currentEdit?.koli !== undefined ? parseInt(currentEdit.koli, 10) || 0 : (seller.koli ?? 0);
    const ecerNum = currentEdit?.ecer !== undefined ? parseInt(currentEdit.ecer, 10) || 0 : (seller.ecer ?? 0);
    const hvNum = currentEdit?.high_value !== undefined ? parseInt(currentEdit.high_value, 10) || 0 : (seller.high_value ?? 0);
    const statusVal = currentEdit?.status ?? seller.status_pickup ?? "menunggu";
    const catatanVal = currentEdit?.catatan ?? seller.catatan_pickup ?? "";

    setSavingId(seller.id_seller);
    setSavedSuccessId(null);

    try {
      await post(
        "/armada/implan/barang",
        {
          id_seller: seller.id_seller,
          jumlah_barang: jumlahNum,
          koli: koliNum,
          ecer: ecerNum,
          high_value: hvNum,
          status: statusVal,
          catatan: catatanVal,
        },
        { token }
      );

      setSavedSuccessId(seller.id_seller);
      setTimeout(() => setSavedSuccessId(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
    } catch {
      alert("Gagal menyimpan data barang implan.");
    } finally {
      setSavingId(null);
    }
  };

  // Open History modal
  const openHistory = async (seller: SellerLocation) => {
    setActiveHistorySeller(seller);
    setLoadingHistory(true);
    setHistoryLogs([]);
    try {
      const res = await get<ImplanBarangLog[]>(`/armada/implan/${seller.id_seller}/history`, { token });
      setHistoryLogs(res ?? []);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Kelola AWB & Muatan Implan"
        description="Input muatan barang (AWB, Koli, Ecer, High Value) serta status penjemputan di masing-masing titik implan hari ini."
        crumbs={[{ label: "Peta", href: "/" }, { label: "Kelola AWB Implan" }]}
      />

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="rounded-xl border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Titik Implan</span>
              <Store className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{summary.totalSellers}</p>
            <p className="text-[11px] text-slate-400">Titik aktif di sistem</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Menunggu Pickup</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700">{summary.countMenunggu} Implan</p>
            <p className="text-[11px] font-semibold text-amber-600">
              {summary.totalAwbMenunggu.toLocaleString("id-ID")} AWB · {summary.totalKoliMenunggu} Koli · {summary.totalHvMenunggu} HV
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Sudah Diambil</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">{summary.countDiambil} Implan</p>
            <p className="text-[11px] font-semibold text-emerald-600">Total {summary.totalAwbDiambil.toLocaleString("id-ID")} AWB</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Belum Ada Muatan</span>
              <Boxes className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-700">{summary.countBelumInput}</p>
            <p className="text-[11px] text-slate-400">Perlu di-update</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & PENCARIAN */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama implan, kode, kota, atau PIC..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/15"
              />
            </div>

            {/* Filter Status Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  filterStatus === "all" ? "bg-[#0c1e3a] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Semua ({sellers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("menunggu")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  filterStatus === "menunggu" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                )}
              >
                Menunggu ({summary.countMenunggu})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("sudah_diambil")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  filterStatus === "sudah_diambil" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                )}
              >
                Sudah Diambil ({summary.countDiambil})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("kosong")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  filterStatus === "kosong" ? "bg-slate-700 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Nol Muatan ({summary.countBelumInput})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABEL DAFTAR IMPLAN */}
      <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
            <span>Daftar Implan & Input Muatan ({filteredSellers.length})</span>
            <span className="text-xs font-normal text-slate-500">Klik &quot;Simpan&quot; untuk memperbarui informasi di sidebar & peta</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMap ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium">Tidak ada data implan yang cocok dengan filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="py-3 px-4">Nama Implan / Lokasi</th>
                    <th className="py-3 px-4">Kontak PIC</th>
                    <th className="py-3 px-2 w-20 text-center">AWB</th>
                    <th className="py-3 px-2 w-20 text-center">Koli</th>
                    <th className="py-3 px-2 w-20 text-center">Ecer</th>
                    <th className="py-3 px-2 w-20 text-center">HV</th>
                    <th className="py-3 px-3 w-40 text-center">Status</th>
                    <th className="py-3 px-3">Catatan</th>
                    <th className="py-3 px-4 text-right w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSellers.map((s) => {
                    const rowEdit = editValues[s.id_seller] ?? {
                      jumlah: s.jumlah_barang != null ? String(s.jumlah_barang) : "0",
                      koli: s.koli != null ? String(s.koli) : "0",
                      ecer: s.ecer != null ? String(s.ecer) : "0",
                      high_value: s.high_value != null ? String(s.high_value) : "0",
                      status: s.status_pickup || "menunggu",
                      catatan: s.catatan_pickup || "",
                    };

                    const isSaving = savingId === s.id_seller;
                    const isSuccess = savedSuccessId === s.id_seller;

                    return (
                      <tr key={s.id_seller} className="hover:bg-slate-50/70 transition-colors">
                        {/* Nama & Alamat */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold text-xs mt-0.5">
                              <Store className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                {s.nama_seller}
                                {s.kode_seller && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-500">
                                    {s.kode_seller}
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{s.alamat || "-"}</p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                {s.kota || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Kontak PIC */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-700">{s.pic || "-"}</p>
                          {s.no_hp && (
                            <a
                              href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`}
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" /> {s.no_hp}
                            </a>
                          )}
                        </td>

                        {/* Input Jumlah AWB */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={rowEdit.jumlah}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [s.id_seller]: {
                                  ...rowEdit,
                                  jumlah: e.target.value,
                                },
                              }))
                            }
                            className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold tabular-nums outline-none focus:border-[#0c1e3a] focus:ring-1 focus:ring-[#0c1e3a]/15"
                            placeholder="0"
                          />
                        </td>

                        {/* Input Koli */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={rowEdit.koli}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [s.id_seller]: {
                                  ...rowEdit,
                                  koli: e.target.value,
                                },
                              }))
                            }
                            className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold tabular-nums outline-none focus:border-[#0c1e3a] focus:ring-1 focus:ring-[#0c1e3a]/15"
                            placeholder="0"
                          />
                        </td>

                        {/* Input Ecer */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={rowEdit.ecer}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [s.id_seller]: {
                                  ...rowEdit,
                                  ecer: e.target.value,
                                },
                              }))
                            }
                            className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold tabular-nums outline-none focus:border-[#0c1e3a] focus:ring-1 focus:ring-[#0c1e3a]/15"
                            placeholder="0"
                          />
                        </td>

                        {/* Input High Value (HV) */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={rowEdit.high_value}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [s.id_seller]: {
                                  ...rowEdit,
                                  high_value: e.target.value,
                                },
                              }))
                            }
                            className="w-16 text-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-bold tabular-nums outline-none focus:border-[#0c1e3a] focus:ring-1 focus:ring-[#0c1e3a]/15"
                            placeholder="0"
                          />
                        </td>

                        {/* Toggle Status Penjemputan */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [s.id_seller]: {
                                    ...rowEdit,
                                    status: "menunggu",
                                  },
                                }))
                              }
                              className={cn(
                                "rounded-md px-2 py-1 text-[10px] font-bold transition-all border",
                                rowEdit.status === "menunggu"
                                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              Menunggu
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [s.id_seller]: {
                                    ...rowEdit,
                                    status: "sudah_diambil",
                                  },
                                }))
                              }
                              className={cn(
                                "rounded-md px-2 py-1 text-[10px] font-bold transition-all border",
                                rowEdit.status === "sudah_diambil"
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              Diambil
                            </button>
                          </div>
                        </td>

                        {/* Catatan */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={rowEdit.catatan}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [s.id_seller]: {
                                  ...rowEdit,
                                  catatan: e.target.value,
                                },
                              }))
                            }
                            placeholder="Catatan..."
                            className="w-full min-w-[100px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#0c1e3a]"
                          />
                        </td>

                        {/* Aksi: Simpan & Riwayat */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSave(s)}
                              disabled={isSaving}
                              className={cn(
                                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs",
                                isSuccess
                                  ? "bg-emerald-600"
                                  : "bg-[#0c1e3a] hover:bg-[#0c1e3a]/90 disabled:opacity-50"
                              )}
                              title="Simpan perubahan muatan & status"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isSuccess ? (
                                <>
                                  <Check className="h-3 w-3" /> OK
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3" /> Simpan
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => openHistory(s)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="Lihat riwayat log AWB"
                            >
                              <History className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL RIWAYAT LOG */}
      {activeHistorySeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-sky-600" />
                  Riwayat Muatan: {activeHistorySeller.nama_seller}
                </h3>
                <p className="text-[11px] text-slate-400">{activeHistorySeller.alamat}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveHistorySeller(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
              {loadingHistory ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada riwayat log untuk implan ini.</p>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id_log} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.jumlah_barang} AWB</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{log.koli ?? 0} Koli</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{log.ecer ?? 0} Ecer</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-semibold">{log.high_value ?? 0} HV</span>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                          log.status === "sudah_diambil"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {log.status === "sudah_diambil" ? "Sudah Diambil" : "Menunggu"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Tanggal: <b>{log.tanggal}</b></span>
                      <span>Diinput oleh: <b>{log.created_by || "user"}</b></span>
                    </div>
                    {log.catatan && (
                      <p className="mt-1.5 rounded bg-white p-1.5 text-[11px] text-slate-600 italic border border-slate-200/50">
                        {log.catatan}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-right">
              <button
                type="button"
                onClick={() => setActiveHistorySeller(null)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
