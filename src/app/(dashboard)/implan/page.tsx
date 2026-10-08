"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ShieldCheck,
  Check,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  Store,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useDriverPickups, useSaveDriverPickup, useSaveDriverPickupBatch, useTrackingMap } from "@/hooks/use-tracking";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DriverPickupItem, DriverPickupLog, ImplanBarangLog, SellerLocation } from "@/types/armada";

interface RowEditState {
  jumlah: string;
  koli: string;
  ecer: string;
  high_value: string;
  status: string;
  catatan: string;
}

interface DriverRowEditState {
  jumlah: string;
  koli: string;
  ecer: string;
  high_value: string;
  status: string;
  catatan: string;
  asal_seller: string;
}

interface QuickSellerRow {
  id: string;
  sellerName: string;
  awb: string;
  koli: string;
}

export default function ImplanPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isReadOnly = user?.role === "direktur" || user?.role === "koor_gudang";
  const queryClient = useQueryClient();
  const { data: mapData, isLoading: loadingMap } = useTrackingMap();
  const { data: driverPickups = [], isLoading: loadingDrivers } = useDriverPickups();
  const saveDriverPickupMutation = useSaveDriverPickup();
  const saveDriverPickupBatchMutation = useSaveDriverPickupBatch();

  // Tab: 'implan' (Toko Implan) vs 'driver_pickup' (Muatan Driver Pickup)
  const [activeMainTab, setActiveMainTab] = useState<"implan" | "driver_pickup">("implan");

  /* =========================================================================
   * TAB 1: TOKO IMPLAN
   * ========================================================================= */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "menunggu" | "sudah_diambil" | "kosong">("all");
  const [editValues, setEditValues] = useState<Record<number, RowEditState>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<number | null>(null);

  // Modal Riwayat Implan
  const [activeHistorySeller, setActiveHistorySeller] = useState<SellerLocation | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ImplanBarangLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const sellers = mapData?.sellers ?? [];

  // Summary Metrics Implan
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
      if (q) {
        const matchName = s.nama_seller.toLowerCase().includes(q);
        const matchCode = (s.kode_seller || "").toLowerCase().includes(q);
        const matchKota = (s.kota || "").toLowerCase().includes(q);
        const matchPic = (s.pic || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchKota && !matchPic) return false;
      }

      if (filterStatus === "menunggu") {
        return s.status_pickup !== "sudah_diambil" && ((s.jumlah_barang ?? 0) > 0 || (s.koli ?? 0) > 0);
      }
      if (filterStatus === "sudah_diambil") {
        return s.status_pickup === "sudah_diambil";
      }
      if (filterStatus === "kosong") {
        return !s.jumlah_barang && !s.koli;
      }
      return true;
    });
  }, [sellers, search, filterStatus]);

  // Simpan baris Implan
  const handleSave = async (seller: SellerLocation) => {
    const current = editValues[seller.id_seller] ?? {
      jumlah: seller.jumlah_barang != null ? String(seller.jumlah_barang) : "0",
      koli: seller.koli != null ? String(seller.koli) : "0",
      ecer: seller.ecer != null ? String(seller.ecer) : "0",
      high_value: seller.high_value != null ? String(seller.high_value) : "0",
      status: seller.status_pickup || "menunggu",
      catatan: seller.catatan_pickup || "",
    };

    setSavingId(seller.id_seller);
    try {
      await post(
        "/armada/implan/barang",
        {
          id_seller: seller.id_seller,
          jumlah_barang: parseInt(current.jumlah, 10) || 0,
          koli: parseInt(current.koli, 10) || 0,
          ecer: parseInt(current.ecer, 10) || 0,
          high_value: parseInt(current.high_value, 10) || 0,
          status: current.status,
          catatan: current.catatan,
        },
        { token }
      );

      setSavedSuccessId(seller.id_seller);
      setTimeout(() => setSavedSuccessId(null), 2500);
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
    } catch (err) {
      console.error("Gagal simpan barang implan:", err);
      alert("Gagal menyimpan data implan. Silakan coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  // Buka Modal Riwayat Implan
  const openHistory = async (seller: SellerLocation) => {
    setActiveHistorySeller(seller);
    setLoadingHistory(true);
    try {
      const logs = await get<ImplanBarangLog[]>(`/armada/implan/${seller.id_seller}/history`, { token });
      setHistoryLogs(logs || []);
    } catch (err) {
      console.error("Gagal ambil riwayat implan:", err);
      setHistoryLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  /* =========================================================================
   * TAB 2: DRIVER PICKUP
   * ========================================================================= */
  const [searchDriver, setSearchDriver] = useState("");
  const [filterDriverStatus, setFilterDriverStatus] = useState<"all" | "menuju_gudang" | "menuju_seller" | "selesai" | "standby">("all");
  const [driverEditValues, setDriverEditValues] = useState<Record<number, DriverRowEditState>>({});
  const [savingDriverId, setSavingDriverId] = useState<number | null>(null);
  const [savedDriverSuccessId, setSavedDriverSuccessId] = useState<number | null>(null);

  // Modal Riwayat Driver Pickup
  const [activeHistoryDriver, setActiveHistoryDriver] = useState<DriverPickupItem | null>(null);
  const [driverHistoryLogs, setDriverHistoryLogs] = useState<DriverPickupLog[]>([]);
  const [loadingDriverHistory, setLoadingDriverHistory] = useState(false);

  // Form Input Muatan Multi-Seller Driver Pickup (Operator/Whisnu)
  const [quickDriverId, setQuickDriverId] = useState<string>("");
  const [quickStatus, setQuickStatus] = useState<string>("menuju_gudang");
  const [quickCatatan, setQuickCatatan] = useState<string>("");
  const [sellerRows, setSellerRows] = useState<QuickSellerRow[]>([
    { id: "1", sellerName: "", awb: "", koli: "" },
  ]);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);

  // Helper Tambah / Hapus / Update Baris Seller
  const handleAddSellerRow = () => {
    setSellerRows((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), sellerName: "", awb: "", koli: "" },
    ]);
  };

  const handleRemoveSellerRow = (id: string) => {
    setSellerRows((prev) => {
      if (prev.length <= 1) {
        return [{ id: "1", sellerName: "", awb: "", koli: "" }];
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const handleSellerRowChange = (id: string, field: "sellerName" | "awb" | "koli", value: string) => {
    setSellerRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Ringkasan kalkulasi batch
  const quickTotalAwb = useMemo(() => {
    return sellerRows.reduce((sum, r) => sum + (parseInt(r.awb, 10) || 0), 0);
  }, [sellerRows]);

  const quickTotalKoli = useMemo(() => {
    return sellerRows.reduce((sum, r) => sum + (parseInt(r.koli, 10) || 0), 0);
  }, [sellerRows]);

  const validSellerRowsCount = useMemo(() => {
    return sellerRows.filter((r) => r.sellerName.trim() !== "" && (parseInt(r.awb, 10) || 0) > 0).length;
  }, [sellerRows]);

  // Summary Metrics Driver Pickup
  const driverSummary = useMemo(() => {
    let totalAwbMenujuGudang = 0;
    let totalKoliMenujuGudang = 0;
    let totalHvMenujuGudang = 0;
    let countMenujuGudang = 0;
    let totalAwbMenujuSeller = 0;
    let totalKoliMenujuSeller = 0;
    let countMenujuSeller = 0;
    let countSelesai = 0;
    let countStandby = 0;

    driverPickups.forEach((d) => {
      const jml = d.jumlah_barang ?? 0;
      const koli = d.koli ?? 0;
      const hv = d.high_value ?? 0;

      if (d.status === "menuju_gudang") {
        countMenujuGudang++;
        totalAwbMenujuGudang += jml;
        totalKoliMenujuGudang += koli;
        totalHvMenujuGudang += hv;
      } else if (d.status === "menuju_seller") {
        countMenujuSeller++;
        totalAwbMenujuSeller += jml;
        totalKoliMenujuSeller += koli;
      } else if (d.status === "selesai") {
        countSelesai++;
      } else {
        countStandby++;
      }
    });

    return {
      totalDrivers: driverPickups.length,
      countMenujuGudang,
      totalAwbMenujuGudang,
      totalKoliMenujuGudang,
      totalHvMenujuGudang,
      countMenujuSeller,
      totalAwbMenujuSeller,
      totalKoliMenujuSeller,
      countSelesai,
      countStandby,
    };
  }, [driverPickups]);

  // Filtered Driver Pickups
  const filteredDrivers = useMemo(() => {
    const q = searchDriver.trim().toLowerCase();
    return driverPickups.filter((d) => {
      if (q) {
        const matchName = d.nama_driver.toLowerCase().includes(q);
        const matchUser = d.username.toLowerCase().includes(q);
        const matchAsal = (d.asal_seller || "").toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchAsal) return false;
      }

      if (filterDriverStatus !== "all") {
        return d.status === filterDriverStatus;
      }
      return true;
    });
  }, [driverPickups, searchDriver, filterDriverStatus]);

  // Handler Form Input Muatan Multi-Seller Driver
  const handleQuickInput = async () => {
    const selected = driverPickups.find((d) => String(d.id_user) === quickDriverId);
    if (!selected) {
      alert("Pilih driver terlebih dahulu.");
      return;
    }

    const validItems = sellerRows
      .filter((r) => r.sellerName.trim() !== "" && (parseInt(r.awb, 10) || 0) > 0)
      .map((r) => ({
        asal_seller: r.sellerName.trim(),
        jumlah_barang: parseInt(r.awb, 10) || 0,
        koli: parseInt(r.koli, 10) || 0,
        ecer: 0,
        high_value: 0,
      }));

    if (validItems.length === 0) {
      alert("Mohon isi setidaknya 1 nama seller dan jumlah AWB (> 0).");
      return;
    }

    setQuickSaving(true);
    try {
      await saveDriverPickupBatchMutation.mutateAsync({
        id_user: selected.id_user,
        nama_driver: selected.nama_driver || selected.username,
        status: quickStatus,
        catatan: quickCatatan.trim(),
        items: validItems,
      });
      setQuickSuccess(true);
      setSellerRows([{ id: "1", sellerName: "", awb: "", koli: "" }]);
      setQuickCatatan("");
      setTimeout(() => setQuickSuccess(false), 3000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal menyimpan muatan. Silakan coba lagi.";
      alert(errMsg);
    } finally {
      setQuickSaving(false);
    }
  };

  // Simpan baris Driver Pickup
  const handleSaveDriver = async (driver: DriverPickupItem) => {
    const current = driverEditValues[driver.id_user] ?? {
      jumlah: driver.jumlah_barang != null ? String(driver.jumlah_barang) : "0",
      koli: driver.koli != null ? String(driver.koli) : "0",
      ecer: driver.ecer != null ? String(driver.ecer) : "0",
      high_value: driver.high_value != null ? String(driver.high_value) : "0",
      status: driver.status || "menuju_gudang",
      catatan: driver.catatan || "",
      asal_seller: driver.asal_seller || "",
    };

    setSavingDriverId(driver.id_user);
    try {
      await saveDriverPickupMutation.mutateAsync({
        id_user: driver.id_user,
        nama_driver: driver.nama_driver || driver.username,
        jumlah_barang: parseInt(current.jumlah, 10) || 0,
        koli: parseInt(current.koli, 10) || 0,
        ecer: parseInt(current.ecer, 10) || 0,
        high_value: parseInt(current.high_value, 10) || 0,
        status: current.status,
        catatan: current.catatan,
        asal_seller: current.asal_seller,
      });

      setSavedDriverSuccessId(driver.id_user);
      setTimeout(() => setSavedDriverSuccessId(null), 2500);
    } catch (err) {
      console.error("Gagal simpan muatan driver pickup:", err);
      alert("Gagal menyimpan data muatan driver pickup. Silakan coba lagi.");
    } finally {
      setSavingDriverId(null);
    }
  };

  // Buka Modal Riwayat Driver Pickup
  const openDriverHistory = async (driver: DriverPickupItem) => {
    setActiveHistoryDriver(driver);
    setLoadingDriverHistory(true);
    try {
      const logs = await get<DriverPickupLog[]>(`/armada/pickup/${driver.id_user}/history`, { token });
      setDriverHistoryLogs(logs || []);
    } catch (err) {
      console.error("Gagal ambil riwayat driver pickup:", err);
      setDriverHistoryLogs([]);
    } finally {
      setLoadingDriverHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA */}
      <PageHeader
        title="Kelola AWB Implan & Muatan Driver Pickup"
        description="Pencatatan muatan toko implan dan pembaruan jumlah barang yang diangkut oleh masing-masing Driver Pickup menuju gudang."
      />

      {/* BANNER READ ONLY UNTUK DIREKSI & KOOR GUDANG */}
      {isReadOnly && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 shadow-2xs">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <span className="font-bold">Mode Pemantauan (Read-Only)</span>: Anda login sebagai <span className="font-semibold underline capitalize">{user?.role === "direktur" ? "Direktur" : "Koordinator Gudang"}</span>. Formulir input dan pengeditan muatan dinonaktifkan khusus untuk peran operasional & dispatcher.
          </div>
        </div>
      )}

      {/* TAB SWITCHER UTAMA */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainTab("implan")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
            activeMainTab === "implan"
              ? "bg-[#0c1e3a] text-white shadow-md shadow-[#0c1e3a]/15"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Store className="h-4 w-4 text-sky-400" />
          <span>AWB Toko Implan</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
              activeMainTab === "implan" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}
          >
            {summary.countMenunggu} Menunggu
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("driver_pickup")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
            activeMainTab === "driver_pickup"
              ? "bg-[#0c1e3a] text-white shadow-md shadow-[#0c1e3a]/15"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Truck className="h-4 w-4 text-emerald-400" />
          <span>Muatan Driver Pickup</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
              activeMainTab === "driver_pickup" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800"
            )}
          >
            {driverSummary.countMenujuGudang} Menuju Gudang
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TOKO IMPLAN */}
      {/* ========================================================================= */}
      {activeMainTab === "implan" && (
        <div className="space-y-6">
          {/* STATS CARDS IMPLAN */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-slate-200/80 bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Toko Implan</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Store className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{summary.totalSellers}</span>
                  <span className="text-xs text-slate-500">toko</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Menunggu Dijemput</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-900">{summary.totalAwbMenunggu}</span>
                  <span className="text-xs font-semibold text-amber-700">AWB</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-amber-800 font-medium">
                  <span>{summary.countMenunggu} toko</span>
                  <span>•</span>
                  <span>{summary.totalKoliMenunggu} Koli</span>
                  <span>•</span>
                  <span>{summary.totalHvMenunggu} HV</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Sudah Diambil</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">{summary.totalAwbDiambil}</span>
                  <span className="text-xs font-semibold text-emerald-700">AWB</span>
                </div>
                <p className="mt-1 text-[10px] text-emerald-700 font-medium">{summary.countDiambil} toko telah selesai di-pickup</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Belum Ada Paket</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Boxes className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-700">{summary.countBelumInput}</span>
                  <span className="text-xs text-slate-400">toko (0 AWB)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABEL TOKO IMPLAN */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="flex flex-col gap-3 pb-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-sky-600" />
                  Daftar Toko Implan & Input AWB
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Input jumlah AWB, Koli, Ecer, dan High Value untuk toko implan.</p>
              </div>

              {/* SEARCH & FILTER */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari toko, kota, kode..."
                    className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:bg-white focus:ring-1 focus:ring-[#0c1e3a]/15"
                  />
                </div>

                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterStatus("all")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterStatus === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Semua ({sellers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("menunggu")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterStatus === "menunggu" ? "bg-amber-500 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Menunggu ({summary.countMenunggu})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("sudah_diambil")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterStatus === "sudah_diambil" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Diambil ({summary.countDiambil})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingMap ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
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

                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.jumlah}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [s.id_seller]: { ...rowEdit, jumlah: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.koli}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [s.id_seller]: { ...rowEdit, koli: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.ecer}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [s.id_seller]: { ...rowEdit, ecer: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.high_value}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [s.id_seller]: { ...rowEdit, high_value: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditValues((prev) => ({
                                      ...prev,
                                      [s.id_seller]: { ...rowEdit, status: "menunggu" },
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-all",
                                    rowEdit.status !== "sudah_diambil"
                                      ? "bg-amber-500 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                >
                                  Menunggu
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditValues((prev) => ({
                                      ...prev,
                                      [s.id_seller]: { ...rowEdit, status: "sudah_diambil" },
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-all",
                                    rowEdit.status === "sudah_diambil"
                                      ? "bg-emerald-600 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                >
                                  Diambil
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={rowEdit.catatan}
                                onChange={(e) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [s.id_seller]: { ...rowEdit, catatan: e.target.value },
                                  }))
                                }
                                placeholder="Catatan driver/paket..."
                                disabled={isReadOnly} className={cn("w-full rounded-lg border px-2 py-1 text-xs outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                              />
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleSave(s)}
                                  disabled={isSaving}
                                  className={cn(
                                    "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs",
                                    isSuccess ? "bg-emerald-600" : "bg-[#0c1e3a] hover:bg-[#0c1e3a]/90 disabled:opacity-50"
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
                                )}

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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: DRIVER PICKUP */}
      {/* ========================================================================= */}
      {activeMainTab === "driver_pickup" && (
        <div className="space-y-6">

          {/* ─── FORM INPUT MUATAN MULTI-SELLER DRIVER PICKUP ───────── */}
          {!isReadOnly && (
          <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-sm overflow-hidden">
            {/* Datalist rekomendasi nama toko dari daftar seller implan */}
            <datalist id="registered-sellers-list">
              {sellers.map((s) => (
                <option key={s.id_seller} value={s.nama_seller}>
                  {s.kode_seller ? `[${s.kode_seller}] ` : ""}{s.nama_seller} {s.kota ? `(${s.kota})` : ""}
                </option>
              ))}
            </datalist>

            <CardHeader className="pb-3 border-b border-emerald-100 bg-white/70">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    Input Muatan Driver Pickup (Multi-Seller)
                    <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Batch Input
                    </span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih nama driver, lalu input toko/seller yang dijemput (bisa per seller secara bertahap saat jalan atau sekaligus). Jumlah AWB driver akan otomatis terakumulasi.
                  </p>
                </div>

                {/* Status Ringkasan Cepat */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5 self-start sm:self-auto">
                  <span>Total Input:</span>
                  <span className="text-emerald-700 font-bold">{validSellerRowsCount} Toko</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-900 font-black">{quickTotalAwb.toLocaleString("id-ID")} AWB</span>
                  {quickTotalKoli > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-700 font-bold">{quickTotalKoli} Koli</span>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* BARIS PENGATURAN DRIVER & STATUS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                {/* 1. Pilih Driver */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    1. Pilih Nama Driver <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={quickDriverId}
                    onChange={(e) => setQuickDriverId(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  >
                    <option value="">-- Pilih Driver Pickup --</option>
                    {(driverPickups ?? []).map((d) => (
                      <option key={d.id_user} value={String(d.id_user)}>
                        {d.nama_driver || d.username} ({d.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Status Perjalanan */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    2. Status Perjalanan
                  </label>
                  <select
                    value={quickStatus}
                    onChange={(e) => setQuickStatus(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  >
                    <option value="menuju_gudang">🚚 Menuju Gudang</option>
                    <option value="menuju_seller">🏬 Menuju Seller Selanjutnya</option>
                    <option value="selesai">✅ Selesai (Sampai Gudang)</option>
                    <option value="standby">⏸️ Standby / Menunggu</option>
                  </select>
                </div>

                {/* 3. Catatan Opsional */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    3. Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={quickCatatan}
                    onChange={(e) => setQuickCatatan(e.target.value)}
                    placeholder="Contoh: Rute Barat, jemputan sore..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* DAFTAR BARIS SELLER & JUMLAH AWB */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-emerald-600" />
                    Daftar Seller & Jumlah Barang yang Dijemput:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Tip: Ketik nama toko atau pilih dari rekomendasi
                  </span>
                </div>

                <div className="space-y-2">
                  {sellerRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 sm:p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      {/* Nomor Urut */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-black text-slate-600">
                        {index + 1}
                      </div>

                      {/* Nama Toko / Seller */}
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          list="registered-sellers-list"
                          value={row.sellerName}
                          onChange={(e) => handleSellerRowChange(row.id, "sellerName", e.target.value)}
                          placeholder="Nama toko / seller..."
                          className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>

                      {/* Jumlah AWB */}
                      <div className="w-28 shrink-0">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.awb}
                            onChange={(e) => handleSellerRowChange(row.id, "awb", e.target.value.replace(/[^0-9]/g, ""))}
                            onFocus={(e) => e.target.select()}
                            placeholder="AWB"
                            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-2.5 pr-8 text-right text-xs font-black tabular-nums text-slate-900 outline-none placeholder:text-slate-300 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            AWB
                          </span>
                        </div>
                      </div>

                      {/* Koli (Opsional) */}
                      <div className="w-24 shrink-0">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.koli}
                            onChange={(e) => handleSellerRowChange(row.id, "koli", e.target.value.replace(/[^0-9]/g, ""))}
                            onFocus={(e) => e.target.select()}
                            placeholder="Koli"
                            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-2 pr-7 text-right text-xs font-medium tabular-nums text-slate-800 outline-none placeholder:text-slate-300 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                            Koli
                          </span>
                        </div>
                      </div>

                      {/* Tombol Hapus Baris */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSellerRow(row.id)}
                        disabled={sellerRows.length === 1 && !row.sellerName && !row.awb}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* FOOTER AKSI: TAMBAH BARIS & SIMPAN */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                {/* Tombol Tambah Baris */}
                <button
                  type="button"
                  onClick={handleAddSellerRow}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/60 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100/70 hover:border-emerald-500 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Tambah Toko / Seller Lainnya
                </button>

                {/* Tombol Submit Batch */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={quickSaving || !quickDriverId || validSellerRowsCount === 0}
                    onClick={handleQuickInput}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95",
                      quickSuccess
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-[#0c1e3a] text-white hover:bg-[#1a3358] disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    {quickSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : quickSuccess ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {quickSuccess
                      ? "Berhasil Tersimpan!"
                      : validSellerRowsCount > 0
                      ? `Simpan Muatan (${validSellerRowsCount} Seller • ${quickTotalAwb} AWB)`
                      : "Simpan Muatan Driver"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
          {/* ─────────────────────────────────────────────────────────── */}

          {/* STATS CARDS DRIVER PICKUP */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="border-slate-200/80 bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Driver Pickup</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{driverSummary.totalDrivers}</span>
                  <span className="text-xs text-slate-500">driver</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Menuju Seller</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <Store className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-900">{driverSummary.countMenujuSeller}</span>
                  <span className="text-xs font-semibold text-amber-700">driver</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-amber-800 font-medium">
                  <span>{driverSummary.totalAwbMenujuSeller} AWB</span>
                  <span>•</span>
                  <span>{driverSummary.totalKoliMenujuSeller} Koli</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Menuju Gudang</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Truck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">{driverSummary.totalAwbMenujuGudang}</span>
                  <span className="text-xs font-semibold text-emerald-700">AWB</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-emerald-800 font-medium">
                  <span>{driverSummary.countMenujuGudang} driver meluncur</span>
                  <span>•</span>
                  <span>{driverSummary.totalKoliMenujuGudang} Koli</span>
                  <span>•</span>
                  <span>{driverSummary.totalHvMenujuGudang} HV</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-sky-200 bg-sky-50/50 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Selesai / Tiba</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-sky-900">{driverSummary.countSelesai}</span>
                  <span className="text-xs text-sky-700">driver</span>
                </div>
                <p className="mt-1 text-[10px] text-sky-700 font-medium">Bongkar muat selesai di gudang</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Standby / Belum Jalan</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-700">{driverSummary.countStandby}</span>
                  <span className="text-xs text-slate-400">driver</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABEL DRIVER PICKUP */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="flex flex-col gap-3 pb-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  Input Muatan Driver Pickup Menuju Gudang
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Catat muatan yang dibawa oleh driver pickup (Bambang, Catur, Lalang, Paimin, Robby, Ruslan, Syarifudin).
                </p>
              </div>

              {/* SEARCH & FILTER */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchDriver}
                    onChange={(e) => setSearchDriver(e.target.value)}
                    placeholder="Cari nama driver, seller..."
                    className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs outline-none focus:border-[#0c1e3a] focus:bg-white focus:ring-1"
                  />
                </div>

                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterDriverStatus("all")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterDriverStatus === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Semua ({driverPickups.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDriverStatus("menuju_seller")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterDriverStatus === "menuju_seller" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Menuju Seller ({driverSummary.countMenujuSeller})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDriverStatus("menuju_gudang")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterDriverStatus === "menuju_gudang" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Menuju Gudang ({driverSummary.countMenujuGudang})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDriverStatus("standby")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-semibold transition-colors",
                      filterDriverStatus === "standby" ? "bg-slate-700 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Standby ({driverSummary.countStandby})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingDrivers ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Truck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium">Tidak ada driver pickup yang cocok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200/80 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="py-3 px-4">Nama Driver Pickup</th>
                        <th className="py-3 px-2 w-20 text-center">AWB</th>
                        <th className="py-3 px-2 w-20 text-center">Koli</th>
                        <th className="py-3 px-2 w-20 text-center">Ecer</th>
                        <th className="py-3 px-2 w-20 text-center">HV</th>
                        <th className="py-3 px-3 w-52 text-center">Status Perjalanan</th>
                        <th className="py-3 px-3">Asal Seller / Wilayah</th>
                        <th className="py-3 px-3">Catatan</th>
                        <th className="py-3 px-4 text-right w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrivers.map((d) => {
                        const rowEdit = driverEditValues[d.id_user] ?? {
                          jumlah: d.jumlah_barang != null ? String(d.jumlah_barang) : "0",
                          koli: d.koli != null ? String(d.koli) : "0",
                          ecer: d.ecer != null ? String(d.ecer) : "0",
                          high_value: d.high_value != null ? String(d.high_value) : "0",
                          status: d.status || "standby",
                          catatan: d.catatan || "",
                          asal_seller: d.asal_seller || "",
                        };

                        const isSaving = savingDriverId === d.id_user;
                        const isSuccess = savedDriverSuccessId === d.id_user;

                        return (
                          <tr key={d.id_user} className="hover:bg-slate-50/70 transition-colors">
                            {/* Driver Profile */}
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs uppercase mt-0.5">
                                  {(d.username || d.nama_driver || "DP").slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 capitalize flex items-center gap-1.5">
                                    {d.username || d.nama_driver}
                                  </p>
                                  {d.no_hp ? (
                                    <a
                                      href={`tel:${d.no_hp.replace(/[^+\d]/g, "")}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline mt-0.5"
                                    >
                                      <Phone className="h-3 w-3" /> {d.no_hp}
                                    </a>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 mt-0.5">Driver Pickup</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* AWB */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.jumlah}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setDriverEditValues((prev) => ({
                                    ...prev,
                                    [d.id_user]: { ...rowEdit, jumlah: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            {/* Koli */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.koli}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setDriverEditValues((prev) => ({
                                    ...prev,
                                    [d.id_user]: { ...rowEdit, koli: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            {/* Ecer */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.ecer}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setDriverEditValues((prev) => ({
                                    ...prev,
                                    [d.id_user]: { ...rowEdit, ecer: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            {/* HV */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={rowEdit.high_value}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  setDriverEditValues((prev) => ({
                                    ...prev,
                                    [d.id_user]: { ...rowEdit, high_value: val },
                                  }));
                                }}
                                disabled={isReadOnly} className={cn("w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold tabular-nums outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                                placeholder="0"
                              />
                            </td>

                            {/* Status Perjalanan */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDriverEditValues((prev) => ({
                                      ...prev,
                                      [d.id_user]: { ...rowEdit, status: "menuju_seller" },
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-all flex items-center gap-1",
                                    rowEdit.status === "menuju_seller"
                                      ? "bg-amber-600 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                  title="Menuju Seller Selanjutnya"
                                >
                                  <Store className="h-3 w-3" /> Ke Seller
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDriverEditValues((prev) => ({
                                      ...prev,
                                      [d.id_user]: { ...rowEdit, status: "menuju_gudang" },
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-all flex items-center gap-1",
                                    rowEdit.status === "menuju_gudang"
                                      ? "bg-emerald-600 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                  title="Menuju Gudang"
                                >
                                  <Truck className="h-3 w-3" /> Menuju Gudang
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDriverEditValues((prev) => ({
                                      ...prev,
                                      [d.id_user]: { ...rowEdit, status: "selesai" },
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-all",
                                    rowEdit.status === "selesai"
                                      ? "bg-sky-600 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                  title="Tiba di Gudang"
                                >
                                  Tiba
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDriverEditValues((prev) => ({
                                      ...prev,
                                      [d.id_user]: { ...rowEdit, status: "standby" },
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-1.5 py-1 text-[10px] font-bold uppercase transition-all",
                                    rowEdit.status === "standby"
                                      ? "bg-slate-700 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  )}
                                  title="Standby"
                                >
                                  Standby
                                </button>
                              </div>
                            </td>

                            {/* Asal Seller */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={rowEdit.asal_seller}
                                onChange={(e) =>
                                  setDriverEditValues((prev) => ({
                                    ...prev,
                                    [d.id_user]: { ...rowEdit, asal_seller: e.target.value },
                                  }))
                                }
                                placeholder="Toko/Seller asal..."
                                disabled={isReadOnly} className={cn("w-full rounded-lg border px-2 py-1 text-xs outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                              />
                            </td>

                            {/* Catatan */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={rowEdit.catatan}
                                onChange={(e) =>
                                  setDriverEditValues((prev) => ({
                                    ...prev,
                                    [d.id_user]: { ...rowEdit, catatan: e.target.value },
                                  }))
                                }
                                placeholder="Catatan muatan..."
                                disabled={isReadOnly} className={cn("w-full rounded-lg border px-2 py-1 text-xs outline-none", isReadOnly ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white focus:border-[#0c1e3a] focus:ring-1")}
                              />
                            </td>

                            {/* Aksi */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveDriver(d)}
                                  disabled={isSaving}
                                  className={cn(
                                    "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs",
                                    isSuccess ? "bg-emerald-600" : "bg-[#0c1e3a] hover:bg-[#0c1e3a]/90 disabled:opacity-50"
                                  )}
                                  title="Simpan perubahan muatan driver"
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
                                )}

                                <button
                                  type="button"
                                  onClick={() => openDriverHistory(d)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Lihat riwayat muatan driver"
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
        </div>
      )}

      {/* MODAL RIWAYAT IMPLAN */}
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
                          log.status === "sudah_diambil" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
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

      {/* MODAL RIWAYAT DRIVER PICKUP */}
      {activeHistoryDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-emerald-600" />
                  Riwayat Muatan: {activeHistoryDriver.nama_driver}
                </h3>
                <p className="text-[11px] text-slate-400">@{activeHistoryDriver.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveHistoryDriver(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
              {loadingDriverHistory ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : driverHistoryLogs.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">Belum ada riwayat muatan untuk driver ini.</p>
              ) : (
                driverHistoryLogs.map((log) => (
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
                          log.status === "menuju_gudang"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.status === "menuju_seller"
                            ? "bg-amber-100 text-amber-800"
                            : log.status === "selesai"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {log.status === "menuju_gudang"
                          ? "Menuju Gudang"
                          : log.status === "menuju_seller"
                          ? "Menuju Seller"
                          : log.status === "selesai"
                          ? "Selesai"
                          : "Standby"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Tanggal: <b>{log.tanggal}</b></span>
                      <span>Diinput oleh: <b>{log.created_by || "user"}</b></span>
                    </div>
                    {log.asal_seller && (
                      <p className="mt-1 text-[11px] text-slate-600">
                        Asal Toko/Seller: <span className="font-semibold text-slate-800">{log.asal_seller}</span>
                      </p>
                    )}
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
                onClick={() => setActiveHistoryDriver(null)}
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
