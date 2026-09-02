"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar as CalendarIcon,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Truck,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import {
  useAdminMasterOptions,
  useAdminRitase,
  useCreateRitase,
  useDeleteRitase,
  type PreviewRoute,
  useGenerateDailyRitase,
  usePreviewDailyRitase,
  useUpdateRitase,
} from "@/hooks/use-admin-ritase";
import { cn, formatDur, formatDateDMY, formatAuditTime } from "@/lib/utils";
import { isRitaseExpired, getFullPhotoUrl } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";
import { JenisBadge } from "@/components/ui/jenis-badge";
import { PengaturanTab } from "@/components/jadwal/pengaturan-tab";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { GAPS } from "@/lib/design-tokens";
import { ApiError } from "@/types/api";
import type { AdminRitaseItem, AdminRitaseStop } from "@/types/armada";

export default function JadwalPage() {
  const getNDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    // Memaksa output YYYY-MM-DD menggunakan waktu Jakarta
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [ritaseFilter, setRitaseFilter] = useState<string>("all");
  const [jenisFilter, setJenisFilter] = useState<string>("outgoing");

  // Dynamic ritase options: outgoing cuma 3, incoming/all → 1-4
  const ritaseOptions = useMemo(() => {
    const base = ["all"];
    if (jenisFilter === "outgoing") return [...base, "1", "2", "3"];
    return [...base, "1", "2", "3", "4"];
  }, [jenisFilter]);

  // Auto-reset ritase filter kalau gak valid untuk jenis yang dipilih
  useEffect(() => {
    if (
      jenisFilter === "outgoing" &&
      !["all", "1", "2", "3"].includes(ritaseFilter)
    ) {
      setRitaseFilter("all");
    }
  }, [jenisFilter]);
  const [showPengaturan, setShowPengaturan] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingRitase, setEditingRitase] = useState<AdminRitaseItem | null>(
    null,
  );
  const [editingOriginal, setEditingOriginal] =
    useState<AdminRitaseItem | null>(null);
  const [deletingRitase, setDeletingRitase] = useState<{
    id: number;
    kode: string;
  } | null>(null);
  const [confirmBox, setConfirmBox] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lightbox foto manifest
  const [selectedFoto, setSelectedFoto] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Tutup lightbox via Escape
  useEffect(() => {
    if (!selectedFoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedFoto(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedFoto]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const errMsg = (e: unknown) =>
    e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.";

  // Fetch Master Data Options (Drivers, Vehicles, Sellers, Drop Points, Gudangs)
  const { data: masterOptions } = useAdminMasterOptions();

  // Filter: driver aktif & kendaraan tersedia (dengan case-insensitive & fallback agar opsi tidak pernah kosong)
  const activeDrivers = useMemo(() => {
    if (!masterOptions?.drivers) return [];

    // Fokus dulu ke driver Transporter Outgoing & Incoming saja
    const jenisAllowed = ["transporter outgoing", "transporter incoming"];
    const byJenis = masterOptions.drivers.filter((d) =>
      jenisAllowed.includes((d.jabatan ?? "").toLowerCase().trim()),
    );

    const filtered = byJenis.filter((d) =>
      ["aktif", "bertugas", "on_duty", "standby", "tersedia"].includes(
        (d.status_driver ?? "").toLowerCase().trim(),
      ),
    );

    return filtered.length > 0 ? filtered : byJenis;
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
      {
        id_stop: 1,
        urutan: 1,
        jenis_stop: "gudang",
        id_gudang: 1,
        nama_lokasi: "Gudang 1",
        keterangan: "Mulai dari Gudang 1",
      },
      {
        id_stop: 2,
        urutan: 2,
        jenis_stop: "gateway",
        id_drop_point: 1,
        nama_lokasi: "Gateway 1",
        keterangan: "Tujuan akhir Gateway",
      },
    ],
  });

  // Default ID dari masterOptions — ganti hardcoded ID 1
  useEffect(() => {
    if (!masterOptions) return;
    setNewRitase((cur) => {
      const firstDP = masterOptions.drop_points[0];
      const firstGudang = masterOptions.gudangs[0];
      // Hanya update kalau masih pakai default hardcoded 1
      const needUpdate =
        cur.id_drop_point === 1 ||
        cur.stops.some(
          (s) =>
            (s.jenis_stop === "gudang" && s.id_gudang === 1) ||
            (s.jenis_stop === "gateway" && s.id_drop_point === 1),
        );
      if (!needUpdate) return cur;
      return {
        ...cur,
        id_drop_point: firstDP?.id_drop_point ?? cur.id_drop_point,
        stops: cur.stops.map((s) => {
          if (s.jenis_stop === "gudang" && firstGudang)
            return {
              ...s,
              id_gudang: firstGudang.id_gudang,
              nama_lokasi: firstGudang.nama_gudang,
            };
          if (s.jenis_stop === "gateway" && firstDP)
            return {
              ...s,
              id_drop_point: firstDP.id_drop_point,
              nama_lokasi: firstDP.nama_drop_point,
            };
          return s;
        }),
      };
    });
  }, [masterOptions]);

  const {
    data: previewData,
    isFetching: isFetchingPreview,
    refetch: fetchPreview,
  } = usePreviewDailyRitase();
  // SESUDAH (rapi — satu useEffect, sort di akhir, snapshot disimpan setelahnya)
const [editableRoutes, setEditableRoutes] = useState<PreviewRoute[]>([]);
const previewSnapshotRef = useRef<string>("");

// Jenis driver ditentukan tetap dari jabatan (TRANSPORTER OUTGOING/INCOMING),
// bukan pilihan manual — konsisten dengan Template Rute.
const getDriverJenis = (idDriver: number) => {
  const driver = masterOptions?.drivers.find((d) => d.id_driver === idDriver);
  const jabatan = (driver?.jabatan ?? "").toLowerCase();
  return jabatan.includes("incoming") ? "incoming" : "outgoing";
};

const getRouteJenis = (route: PreviewRoute) => getDriverJenis(route.id_driver);

useEffect(() => {
  if (previewData?.routes) {
    const routesCopy: PreviewRoute[] = JSON.parse(JSON.stringify(previewData.routes));

    if (masterOptions) {
      routesCopy.forEach((r) => {
        r.stops.forEach((s) => {
          if (s.jenis_stop === "gudang") {
            const validG = masterOptions.gudangs.find((g) => g.id_gudang === s.id_lokasi);
            if (!validG && masterOptions.gudangs.length > 0) {
              s.id_lokasi = masterOptions.gudangs[0].id_gudang;
              s.nama_lokasi = masterOptions.gudangs[0].nama_gudang;
            }
          } else if (s.jenis_stop === "seller") {
            const validS = masterOptions.sellers.find((sel) => sel.id_seller === s.id_lokasi);
            if (!validS && masterOptions.sellers.length > 0) {
              s.id_lokasi = masterOptions.sellers[0].id_seller;
              s.nama_lokasi = masterOptions.sellers[0].nama_seller;
            }
          } else {
            const validDp = masterOptions.drop_points.find((dp) => dp.id_drop_point === s.id_lokasi);
            if (!validDp && masterOptions.drop_points.length > 0) {
              s.id_lokasi = masterOptions.drop_points[0].id_drop_point;
              s.nama_lokasi = masterOptions.drop_points[0].nama_drop_point;
            }
          }
        });
      });

      // Urutkan SEKALI saat data awal dimuat: Outgoing (R1→3) dulu, lalu Incoming (R1→4).
      // Urutan ini TIDAK dihitung ulang lagi setelah ini, supaya card tidak lompat
      // posisi saat user mengubah ritase_ke di tengah proses edit.
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
}, [previewData, masterOptions]);

  const {
    data: ritases,
    isLoading,
    isError,
    refetch,
  } = useAdminRitase(selectedDate);
  const generateMutation = useGenerateDailyRitase();
  const createMutation = useCreateRitase();
  const updateMutation = useUpdateRitase();
  const deleteMutation = useDeleteRitase();

  const generateIsDirty = () => {
  return JSON.stringify(editableRoutes) !== previewSnapshotRef.current;
};

const closeGenerateModal = () => {
  setShowGenerateModal(false);
};

const askCancelGenerate = () => {
  if (!generateIsDirty()) {
    closeGenerateModal();
    return;
  }
  setConfirmBox({
    title: "Batalkan Perubahan?",
    message: "Perubahan rute, driver, atau jadwal yang belum di-generate akan hilang.",
    onConfirm: closeGenerateModal,
  });
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
        setShowGenerateModal(false);
        const count =
          (data as { total_generated?: number })?.total_generated ??
          editableRoutes.length;
        showToast(
          "success",
          `Berhasil menimpa & meng-generate ${count} ritase harian!`,
        );
        refetch();
      },
      onError: (e) => {
        showToast("error", `Gagal generate: ${errMsg(e)}`);
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

  const handleRemoveRoute = (routeIdx: number) => {
    setConfirmBox({
      title: "Hapus Rute dari Preview?",
      message: `Yakin ingin menghapus rute "${editableRoutes[routeIdx]?.nama_driver ?? "Driver"}" Ritase Ke-${editableRoutes[routeIdx]?.ritase_ke ?? "?"} dari daftar generate?`,
      onConfirm: () => {
        setEditableRoutes(editableRoutes.filter((_, idx) => idx !== routeIdx));
      },
    });
  };

  const handleAddRoute = () => {
    const defaultDriver = activeDrivers[0];
    const defaultVehicle = activeVehicles[0];
    const defaultGudang = masterOptions?.gudangs[0];
    const defaultDp = masterOptions?.drop_points[0];

    const newRoute: PreviewRoute = {
      id_driver: defaultDriver?.id_driver ?? 1,
      nama_driver: defaultDriver?.nama_driver ?? "Driver 1",
      id_kendaraan: defaultVehicle?.id_kendaraan ?? 1,
      plat_nomor: defaultVehicle?.plat_nomor ?? "B 1234 XXX",
      ritase_ke: editableRoutes.length + 1,
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

  const handleDelete = (idRitase: number, kode: string) => {
    setDeletingRitase({ id: idRitase, kode });
  };

  const confirmDelete = () => {
    if (deletingRitase) {
      deleteMutation.mutate(deletingRitase.id, {
        onSuccess: () => {
          setDeletingRitase(null);
          showToast(
            "success",
            `Ritase ${deletingRitase.kode} berhasil dihapus`,
          );
        },
        onError: (e) => {
          setDeletingRitase(null);
          showToast("error", `Gagal menghapus ritase: ${errMsg(e)}`);
        },
      });
    }
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
          const kode = editingRitase.kode_ritase;
          setEditingRitase(null);
          setEditingOriginal(null);
          showToast("success", `Rute ${kode} berhasil diperbarui!`);
        },
        onError: (e) => {
          showToast("error", `Gagal menyimpan rute: ${errMsg(e)}`);
        },
      },
    );
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validasi tanggal tidak boleh di masa lalu ──
    if (newRitase.tanggal < todayStr) {
      showToast(
        "error",
        "Tidak bisa membuat jadwal untuk tanggal yang sudah berlalu.",
      );
      return;
    }

    // ── Validasi duplikat di frontend ──
    const existingRitase = ritases?.find(
      (r) =>
        r.id_driver === newRitase.id_driver &&
        r.tanggal === newRitase.tanggal &&
        r.ritase_ke === newRitase.ritase_ke,
    );
    if (existingRitase) {
      const driverName =
        masterOptions?.drivers.find((d) => d.id_driver === newRitase.id_driver)
          ?.nama_driver ?? `Driver #${newRitase.id_driver}`;
      showToast(
        "error",
        `${driverName} sudah memiliki Ritase Ke-${newRitase.ritase_ke} pada tanggal ${newRitase.tanggal} (${existingRitase.kode_ritase}). Pilih driver lain atau ritase ke berbeda.`,
      );
      return;
    }

    // ── Validasi driver/kendaraan aktif ──
    const selectedDriver = activeDrivers.find(
      (d) => d.id_driver === newRitase.id_driver,
    );
    if (!selectedDriver) {
      showToast(
        "error",
        "Driver yang dipilih sedang tidak aktif. Pilih driver lain yang aktif.",
      );
      return;
    }
    const selectedVehicle = activeVehicles.find(
      (k) => k.id_kendaraan === newRitase.id_kendaraan,
    );
    if (!selectedVehicle) {
      showToast(
        "error",
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
          showToast("success", "Jadwal ritase baru berhasil dibuat!");
        },
        onError: (e) => {
          showToast("error", `Gagal membuat jadwal: ${errMsg(e)}`);
        },
      },
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
        cur ? { ...cur, stops: [...(cur.stops ?? []), newStop] } : cur,
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: [...cur.stops, newStop] }));
    }
  };

  const handleRemoveStop = (isEdit: boolean, index: number) => {
    if (isEdit) {
      const name = editingRitase?.stops?.[index]?.nama_lokasi ?? "titik ini";
      setConfirmBox({
        title: "Hapus Titik Ini?",
        message: `Titik "${name}" akan dihapus dari rute ${editingRitase?.kode_ritase ?? ""}. Tindakan ini hanya berlaku saat disimpan.`,
        onConfirm: () => {
          setEditingRitase((cur) =>
            cur
              ? {
                  ...cur,
                  stops: (cur.stops ?? []).filter((_, i) => i !== index),
                }
              : cur,
          );
        },
      });
    } else {
      setNewRitase((cur) => ({
        ...cur,
        stops: cur.stops.filter((_, i) => i !== index),
      }));
    }
  };

  const handleMoveStop = (
    isEdit: boolean,
    index: number,
    direction: "up" | "down",
  ) => {
    const move = (stops: AdminRitaseStop[]) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= stops.length) return stops;
      const arr = [...stops];
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr;
    };
    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: move(cur.stops ?? []) } : cur,
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: move(cur.stops) }));
    }
  };

  const handleUpdateStopField = (
    isEdit: boolean,
    index: number,
    field: keyof AdminRitaseStop,
    value: any,
  ) => {
    const upd = (stops: AdminRitaseStop[]) =>
      stops.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: upd(cur.stops ?? []) } : cur,
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: upd(cur.stops) }));
    }
  };

  // Select location from database dropdown — pakai functional updater biar
  // perubahan jenis_stop & lokasi gak saling menimpa (stale closure).
  const handleSelectLocationOption = (
    isEdit: boolean,
    index: number,
    selectedId: number,
  ) => {
    const resolve = (currentStop: AdminRitaseStop): AdminRitaseStop => {
      let updatedName = "";
      let idSeller: number | undefined;
      let idGudang: number | undefined;
      let idDropPoint: number | undefined;

      if (currentStop.jenis_stop === "seller") {
        idSeller = selectedId;
        const found = masterOptions?.sellers.find(
          (s) => s.id_seller === selectedId,
        );
        updatedName = found?.nama_seller ?? `Seller #${selectedId}`;
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
        id_gudang: idGudang,
        id_drop_point: idDropPoint,
        nama_lokasi: updatedName,
      };
    };

    const upd = (stops: AdminRitaseStop[]) =>
      stops.map((s, i) => (i === index ? resolve(s) : s));

    if (isEdit) {
      setEditingRitase((cur) =>
        cur ? { ...cur, stops: upd(cur.stops ?? []) } : cur,
      );
    } else {
      setNewRitase((cur) => ({ ...cur, stops: upd(cur.stops) }));
    }
  };

  // Bandingkan ritase yang sedang diedit dengan snapshot awal.
  const ritaseIsDirty = () => {
    if (!editingRitase || !editingOriginal) return false;
    const a = editingRitase;
    const b = editingOriginal;
    if (
      a.id_driver !== b.id_driver ||
      a.id_kendaraan !== b.id_kendaraan ||
      a.id_drop_point !== b.id_drop_point ||
      a.ritase_ke !== b.ritase_ke ||
      a.status !== b.status
    )
      return true;
    const sa = a.stops ?? [];
    const sb = b.stops ?? [];
    if (sa.length !== sb.length) return true;
    return sa.some((s, i) => {
      const t = sb[i];
      return (
        s.urutan !== t.urutan ||
        s.jenis_stop !== t.jenis_stop ||
        s.id_gudang !== t.id_gudang ||
        s.id_seller !== t.id_seller ||
        s.id_drop_point !== t.id_drop_point ||
        s.nama_lokasi !== t.nama_lokasi
      );
    });
  };

  const closeEditModal = () => {
    setEditingRitase(null);
    setEditingOriginal(null);
  };

  const askCancelEdit = () => {
    if (!ritaseIsDirty()) {
      closeEditModal();
      return;
    }
    setConfirmBox({
      title: "Batalkan Perubahan?",
      message: "Perubahan yang belum disimpan pada rute ini akan hilang.",
      onConfirm: closeEditModal,
    });
  };
  // Filter & sort ritases berdasarkan nama driver (A-Z)
  const filteredRitases = (ritases ?? [])
    .filter((r) => {
      const matchSearch =
        r.nama_driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nopol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.kode_ritase.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRitase =
        ritaseFilter === "all" || r.ritase_ke.toString() === ritaseFilter;

      const matchJenis =
        jenisFilter === "all" || r.jenis_ritase === jenisFilter;

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
      {/* ── HEADER (PageHeader + breadcrumb + actions) ── */}
      <PageHeader
        title="Manajemen Jadwal Ritase"
        description="Kelola penugasan rute armada, pilih driver & lokasi terdaftar database, dan generate rute harian 1 klik."
        crumbs={[{ label: "Jadwal Ritase" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Pengaturan: icon gear */}
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
            {/* Tombol Utama: 1-Klik Generate Otomatis */}
            <button
              type="button"
              disabled={isDatePast}
              onClick={() => {
                if (isDatePast) return;
                setShowGenerateModal(true);
                fetchPreview();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0c1e3a] px-5 py-2 text-xs font-semibold text-white transition-all duration-200 ease-out hover:bg-[#16335a] hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Zap className="h-4 w-4" />
              <span>Generate Otomatis</span>
            </button>
          </div>
        }
      />

      {/* ── PENGATURAN PANEL (inline) ── */}

      {showPengaturan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pengaturan Jadwal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atur jam ritase & template rute yang dipakai saat generate
                  otomatis
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPengaturan(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <PengaturanTab />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT ── */}
      {isDatePast && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Tanggal yang dipilih sudah berlalu. Tidak bisa generate atau membuat
            jadwal baru.
          </p>
        </div>
      )}

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label="Total Ritase" value={totalRitase} icon={Layers} />
        <KPICard
          label="Driver Ditugaskan"
          value={uniqueDrivers}
          icon={UserCheck}
        />
        <KPICard label="Dalam Perjalanan" value={inProgress} icon={Truck} />
        <KPICard label="Ritase Selesai" value={completed} icon={CheckCircle2} />
      </div>

      {/* ── FILTER, TANGGAL, & RITASE FILTER BAR ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end gap-3">
          {/* Tanggal Picker */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tanggal
            </span>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none dark:text-slate-200"
              />
            </div>
          </div>

          {/* Jenis Filter — Outgoing / Incoming, dengan count langsung di label */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Jenis
            </span>
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {[
                { value: "outgoing", label: `Outgoing (${outgoingCount})` },
                { value: "incoming", label: `Incoming (${incomingCount})` },
              ].map((j) => (
                <button
                  key={j.value}
                  type="button"
                  onClick={() => {
                    setJenisFilter(j.value);
                    setRitaseFilter("all");
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all duration-200 ease-out hover:scale-[1.06] active:scale-[0.95]",
                    jenisFilter === j.value
                      ? "bg-[#FEA103] text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  {j.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ritase Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ritase
            </span>
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {ritaseOptions.map((rit) => (
                <button
                  key={rit}
                  type="button"
                  onClick={() => setRitaseFilter(rit)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all duration-200 ease-out hover:scale-[1.06] active:scale-[0.95]",
                    ritaseFilter === rit
                      ? "bg-[#FEA103] text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  {rit === "all" ? "Semua" : rit}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Tombol Buat Jadwal Manual — sendiri di paling kanan */}
        <button
          type="button"
          disabled={isDatePast}
          onClick={() => {
            if (isDatePast) return;
            setNewRitase({
              ...newRitase,
              tanggal: selectedDate,
              id_driver: activeDrivers[0]?.id_driver ?? 1,
              id_kendaraan: activeVehicles[0]?.id_kendaraan ?? 1,
              id_drop_point: masterOptions?.drop_points[0]?.id_drop_point ?? 1,
            });
            setShowCreateModal(true);
          }}
          className="group inline-flex items-center gap-2 rounded-md border border-[#FEA103] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-[#FEA103] hover:text-white hover:scale-[1.03] active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#FEA103] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Plus className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white" />
          <span>Buat Jadwal Manual</span>
        </button>
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
          <p className="text-sm font-medium">
            Gagal memuat jadwal ritase. Silakan coba refresh.
          </p>
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
              ? 'Klik tombol "Generate Otomatis" di atas untuk membuatkan rute tetap untuk seluruh driver hari ini.'
              : "Pilih tanggal lain di bagian filter untuk melihat riwayat rute terdahulu."}
          </p>
          {selectedDate === todayStr && (
            <button
              type="button"
              onClick={() => {
                setShowGenerateModal(true);
                fetchPreview();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#FEA103] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#E09102]"
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
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Ritase ke-{r.ritase_ke}
                      </span>
                      <JenisBadge jenis={r.jenis_ritase} />
                      <StatusBadge
                        status={
                          r.status === "direncanakan" &&
                          isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai)
                            ? "tidak terlaksana"
                            : r.status
                        }
                      />
                    </div>
                    <h4 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                      {r.nama_driver}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">
                          {r.nopol}
                        </span>
                      </span>
                      {r.jam_mulai && (
                        <span
                          className="inline-flex items-center gap-1"
                          title="Jadwal berangkat → tiba"
                        >
                          <Clock className="h-3 w-3" />
                          {r.jam_mulai} – {r.jam_selesai ?? "?"}
                          {r.jam_berangkat && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {" "}
                              → {r.jam_berangkat}
                            </span>
                          )}
                          {r.jam_tiba && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {" "}
                              → {r.jam_tiba}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {((r.total_koli ?? 0) > 0 ||
                      (r.total_eceran ?? 0) > 0 ||
                      (r.total_high_value ?? 0) > 0) && (
                      <div
                        className="mt-2 flex flex-wrap items-center gap-1.5"
                        title="Total muatan ritase ini"
                      >
                        {(r.total_koli ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Package className="h-3 w-3" />
                            {r.total_koli}{" "}
                            <span className="font-normal text-slate-400">
                              Koli
                            </span>
                          </span>
                        )}
                        {(r.total_eceran ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {r.total_eceran}{" "}
                            <span className="font-normal text-slate-400">
                              Ecer
                            </span>
                          </span>
                        )}
                        {(r.total_high_value ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            {r.total_high_value}{" "}
                            <span className="font-normal text-amber-500">
                              HV
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Action Edit — direncanakan (belum expired) & berjalan saja */}
                    {r.status !== "selesai" &&
                      !(
                        r.status === "direncanakan" &&
                        isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai)
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRitase(r);
                            setEditingOriginal(r);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:bg-blue-600 hover:scale-[1.05] active:scale-[0.95] dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                    {/* Delete action — direncanakan saja (belum expired) */}
                    {r.status === "direncanakan" &&
                      !isRitaseExpired(r.jam_selesai, r.tanggal, r.jam_mulai) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(r.id_ritase, r.kode_ritase)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-all duration-200 ease-out hover:bg-rose-50 hover:scale-[1.05] active:scale-[0.95] dark:border-rose-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                  </div>
                </div>

                {/* Timeline Stops — single row per stop */}
                <div className="mt-4 space-y-1.5">
                  <div className="relative pl-4 space-y-2 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {(r.stops ?? []).map((stop) => (
                      <div
                        key={stop.id_stop}
                        className="relative flex items-center justify-between gap-2 text-xs"
                      >
                        {/* Kiri: Nomor + Nama + Jenis + Info inline */}
                        <div className="flex flex-1 min-w-0 items-center gap-1.5">
                          <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c1e3a] text-[10px] font-bold text-white">
                            {stop.urutan}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {stop.nama_lokasi}
                          </span>
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 uppercase dark:bg-slate-800">
                            {stop.jenis_stop}
                          </span>
                          {/* Muatan inline */}
                          {((stop.jumlah_koli ?? 0) > 0 ||
                            (stop.jumlah_ecer ?? 0) > 0 ||
                            (stop.jumlah_high_value ?? 0) > 0) && (
                            <span className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400">
                              📦 {stop.jumlah_koli ?? 0}K
                              {(stop.jumlah_ecer ?? 0) > 0 && (
                                <span>·{stop.jumlah_ecer}E</span>
                              )}
                              {(stop.jumlah_high_value ?? 0) > 0 && (
                                <span>·{stop.jumlah_high_value}HV</span>
                              )}
                            </span>
                          )}
                          {/* Durasi inline */}
                          {stop.durasi_detik != null &&
                            stop.durasi_detik > 0 && (
                              <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                                ⏱️ {formatDur(stop.durasi_detik)}
                              </span>
                            )}
                        </div>
                        {/* Kanan: Foto button */}
                        {stop.foto_manifest_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFoto({
                                url: stop.foto_manifest_url!,
                                title: stop.nama_lokasi,
                              })
                            }
                            title="Lihat foto bukti bongkar muat"
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-[#0c1e3a] hover:text-white hover:border-[#0c1e3a] transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#0c1e3a] cursor-pointer"
                          >
                            📷 Foto
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer: Tanggal + Audit */}
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Tanggal:{" "}
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {formatDateDMY(r.tanggal)}
                    </span>
                  </span>
                  {r.created_at && (
                    <span className="text-slate-400">
                      Dibuat{" "}
                      <span className="font-medium text-slate-500">
                        {formatAuditTime(r.created_at)}
                      </span>
                      {r.created_by && (
                        <span className="ml-0.5">#{r.created_by}</span>
                      )}
                    </span>
                  )}
                </div>
                {r.updated_at && (
                  <div className="mt-0.5 flex items-center justify-end text-[11px] text-slate-400">
                    <span>
                      Diubah{" "}
                      <span className="font-medium text-slate-500">
                        {formatAuditTime(r.updated_at)}
                      </span>
                      {r.updated_by && (
                        <span className="ml-0.5">#{r.updated_by}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL 1-KLIK GENERATE CONFIRMATION & PREVIEW ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div
            className="flex w-11/12 max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0c1e3a] border border-slate-200 dark:border-slate-700/50"
            style={{ maxHeight: "90vh" }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 px-6 py-4 bg-[#0c1e3a]">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white shadow-md">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">
                    Preview & Edit Tambah Rute Otomatis
                  </h3>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    Anda dapat mengubah rute, driver, kendaraan,
                    menambah/menghapus ritase atau perhentian sebelum disave
                    untuk tanggal{" "}
                    <span className="font-bold text-white">{selectedDate}</span>
                    .
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

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/80">
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
                        <div key={rIdx}
                          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#0f2847] hover:border-[#0c1e3a] dark:hover:border-blue-500/50 hover:shadow-md transition-all"
                        >
                          <div>
                            {/* Route Header Edit Controls */}
                            <div className="mb-4 border-b border-slate-100 pb-3.5 dark:border-slate-700/50">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <JenisBadge jenis={getRouteJenis(route)} />
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#0c1e3a] dark:text-blue-300">
                                    <span>R-</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={
                                        getRouteJenis(route) === "outgoing"
                                          ? 3
                                          : 4
                                      }
                                      value={route.ritase_ke}
                                      onChange={(e) =>
                                        handleRitaseKeChange(
                                          rIdx,
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                      className="w-12 rounded border border-[#0c1e3a]/20 bg-[#0c1e3a]/5 px-1.5 py-0.5 text-center font-extrabold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                                    />
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
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Driver</label>
  <select
    value={route.id_driver}
    onChange={(e) => handleDriverChange(rIdx, parseInt(e.target.value))}
    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
  >
    {activeDrivers
      .filter((d) => getDriverJenis(d.id_driver) === getRouteJenis(route))
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
                                <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    {route.jam_mulai?.slice(0, 5) ?? "?"} –{" "}
                                    {route.jam_selesai?.slice(0, 5) ?? "?"}
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
                                    <div className="flex items-center justify-between gap-2">
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
                                        <option value="drop_point">
                                          GATEWAY / DROP POINT
                                        </option>
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
                                          disabled={
                                            sIdx === route.stops.length - 1
                                          }
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
                                      {stop.jenis_stop !== "gudang" &&
                                        stop.jenis_stop !== "seller" &&
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
                      ))}; 
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

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#0c1e3a] px-6 py-4">
              <div className="text-xs text-slate-500 dark:text-blue-200/60 font-medium">
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
  className="rounded-lg border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
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

      {/* ── MODAL BUAT JADWAL MANUAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-lg bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Buat Jadwal Ritase Manual
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih driver & lokasi terdaftar untuk alokasi tugas ritase
                  baru
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

            <form
              onSubmit={handleSaveCreate}
              className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1"
            >
              <div className="grid grid-cols-2 gap-4">
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
                    Pilih Driver
                  </label>
                  <select
                    value={newRitase.id_driver}
                    onChange={(e) =>
                      setNewRitase({
                        ...newRitase,
                        id_driver: parseInt(e.target.value, 10),
                      })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {activeDrivers.map((d) => (
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
                    Gateway Tujuan Akhir
                  </label>
                  <select
                    value={newRitase.id_drop_point}
                    onChange={(e) =>
                      setNewRitase({
                        ...newRitase,
                        id_drop_point: parseInt(e.target.value, 10),
                      })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {masterOptions?.drop_points.map((dp) => (
                      <option key={dp.id_drop_point} value={dp.id_drop_point}>
                        {dp.nama_drop_point} ({dp.kode_dp})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ritase Ke-
                  </label>
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
                    <option value={1}>Ritase 1 </option>
                    <option value={2}>Ritase 2 </option>
                    <option value={3}>Ritase 3 </option>
                    <option value={4}>Ritase 4 </option>
                  </select>
                </div>
              </div>

              {/* Auto-fill jam preview */}
              {(() => {
                const selectedDriver = activeDrivers.find(
                  (d) => d.id_driver === newRitase.id_driver,
                );
                const jenis =
                  masterOptions?.driver_jenis?.find(
                    (dj) =>
                      dj.id_driver === newRitase.id_driver &&
                      dj.ritase_ke === newRitase.ritase_ke,
                  )?.jenis ?? "outgoing";
                const jamConfig = masterOptions?.jam_ritase?.find(
                  (j) =>
                    j.jenis === jenis && j.ritase_ke === newRitase.ritase_ke,
                );
                if (jamConfig) {
                  return (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Waktu:{" "}
                        <strong>
                          {jamConfig.jam_mulai} – {jamConfig.jam_selesai}
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
                        value={
                          stop.jenis_stop === "drop_point"
                            ? "gateway"
                            : stop.jenis_stop
                        }
                        onChange={(e) => {
                          const newType = e.target.value;
                          handleUpdateStopField(
                            false,
                            idx,
                            "jenis_stop",
                            newType,
                          );
                          // Auto set default ID from DB
                          if (
                            newType === "seller" &&
                            masterOptions?.sellers[0]
                          ) {
                            handleSelectLocationOption(
                              false,
                              idx,
                              masterOptions.sellers[0].id_seller,
                            );
                          } else if (
                            newType === "gudang" &&
                            masterOptions?.gudangs[0]
                          ) {
                            handleSelectLocationOption(
                              false,
                              idx,
                              masterOptions.gudangs[0].id_gudang,
                            );
                          } else if (
                            newType === "gateway" &&
                            masterOptions?.drop_points[0]
                          ) {
                            handleSelectLocationOption(
                              false,
                              idx,
                              masterOptions.drop_points[0].id_drop_point,
                            );
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="gudang">Gudang</option>
                        <option value="seller">Seller / Toko</option>
                        <option value="gateway">Gateway</option>
                      </select>

                      {/* Select Option Terhubung Ke Database */}
                      {stop.jenis_stop === "seller" ? (
                        <SearchSelect
                          value={stop.id_seller}
                          onChange={(id) =>
                            handleSelectLocationOption(false, idx, id)
                          }
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
                          onChange={(id) =>
                            handleSelectLocationOption(false, idx, id)
                          }
                          placeholder="Pilih gudang..."
                          options={(masterOptions?.gudangs ?? []).map((g) => ({
                            id: g.id_gudang,
                            label: g.nama_gudang,
                          }))}
                        />
                      ) : (
                        <SearchSelect
                          value={stop.id_drop_point}
                          onChange={(id) =>
                            handleSelectLocationOption(false, idx, id)
                          }
                          placeholder="Pilih gateway..."
                          options={(masterOptions?.drop_points ?? []).map(
                            (dp) => ({
                              id: dp.id_drop_point,
                              label: dp.nama_drop_point,
                              sub: dp.kode_dp,
                            }),
                          )}
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
                  className="inline-flex items-center gap-2 rounded-md bg-[#FEA103] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E09102] disabled:opacity-50"
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
              {editingRitase.status === "berjalan" && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Ritase sedang berjalan. Hanya perhentian (stops) yang bisa
                    diubah.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Driver
                  </label>
                  <select
                    value={editingRitase.id_driver}
                    disabled={editingRitase.status === "berjalan"}
                    onChange={(e) =>
                      setEditingRitase({
                        ...editingRitase,
                        id_driver: parseInt(e.target.value, 10),
                      })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {/* Jaga-jaga: kalau driver saat ini tidak ada di daftar aktif, tetap tampilkan */}
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
                    disabled={editingRitase.status === "berjalan"}
                    onChange={(e) =>
                      setEditingRitase({
                        ...editingRitase,
                        id_kendaraan: parseInt(e.target.value, 10),
                      })
                    }
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {/* Jaga-jaga: kalau kendaraan saat ini tidak ada di daftar aktif, tetap tampilkan */}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status Perjalanan
                  </label>
                  <select
                    value={editingRitase.status}
                    disabled={editingRitase.status === "berjalan"}
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
                    disabled={editingRitase.status === "berjalan"}
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

              {/* ── EDITOR URUTAN RUTE PERJALANAN (STOPS) ── */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Urutan Stop Rute Tempat Perjalanan (
                    {(editingRitase.stops ?? []).length}):
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
                            disabled={
                              idx === (editingRitase.stops ?? []).length - 1
                            }
                            onClick={() => handleMoveStop(true, idx, "down")}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tipe Stop */}
                      <select
                        value={
                          stop.jenis_stop === "drop_point"
                            ? "gateway"
                            : stop.jenis_stop
                        }
                        onChange={(e) => {
                          const newType = e.target.value;
                          handleUpdateStopField(
                            true,
                            idx,
                            "jenis_stop",
                            newType,
                          );
                          if (
                            newType === "seller" &&
                            masterOptions?.sellers[0]
                          ) {
                            handleSelectLocationOption(
                              true,
                              idx,
                              masterOptions.sellers[0].id_seller,
                            );
                          } else if (
                            newType === "gudang" &&
                            masterOptions?.gudangs[0]
                          ) {
                            handleSelectLocationOption(
                              true,
                              idx,
                              masterOptions.gudangs[0].id_gudang,
                            );
                          } else if (
                            newType === "gateway" &&
                            masterOptions?.drop_points[0]
                          ) {
                            handleSelectLocationOption(
                              true,
                              idx,
                              masterOptions.drop_points[0].id_drop_point,
                            );
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="gudang">Gudang</option>
                        <option value="seller">Seller / Toko</option>
                        <option value="gateway">Gateway</option>
                      </select>

                      {/* Select Option Terhubung Ke Database */}
                      {stop.jenis_stop === "seller" ? (
                        <SearchSelect
                          value={stop.id_seller}
                          onChange={(id) =>
                            handleSelectLocationOption(true, idx, id)
                          }
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
                          onChange={(id) =>
                            handleSelectLocationOption(true, idx, id)
                          }
                          placeholder="Pilih gudang..."
                          options={(masterOptions?.gudangs ?? []).map((g) => ({
                            id: g.id_gudang,
                            label: g.nama_gudang,
                          }))}
                        />
                      ) : (
                        <SearchSelect
                          value={stop.id_drop_point}
                          onChange={(id) =>
                            handleSelectLocationOption(true, idx, id)
                          }
                          placeholder="Pilih gateway..."
                          options={(masterOptions?.drop_points ?? []).map(
                            (dp) => ({
                              id: dp.id_drop_point,
                              label: dp.nama_drop_point,
                              sub: dp.kode_dp,
                            }),
                          )}
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

              {/* Audit Fields */}
              {editingRitase.created_at && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Riwayat Perubahan
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 font-semibold text-slate-400">Dibuat</span>
                      <span>
                        {formatAuditTime(editingRitase.created_at)}
                        {editingRitase.created_by && (
                          <span className="ml-1 text-slate-400">oleh #{editingRitase.created_by}</span>
                        )}
                      </span>
                    </div>
                    {editingRitase.updated_at && (
                      <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 font-semibold text-slate-400">Diubah</span>
                        <span>
                          {formatAuditTime(editingRitase.updated_at)}
                          {editingRitase.updated_by && (
                            <span className="ml-1 text-slate-400">oleh #{editingRitase.updated_by}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                  className="inline-flex items-center gap-2 rounded-md bg-[#FEA103] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E09102] disabled:opacity-50"
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

      {/* ── MODAL KONFIRMASI GENERIK ── */}
      {confirmBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {confirmBox.title}
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {confirmBox.message}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmBox(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Tidak
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmBox.onConfirm();
                  setConfirmBox(null);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS ── */}
      {deletingRitase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <Trash2 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              Hapus Ritase?
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Ritase{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {deletingRitase.kode}
              </span>{" "}
              akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingRitase(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFIKASI (POPUP) ── */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[9999] flex items-start gap-3 rounded-2xl px-5 py-4 shadow-2xl ring-1 animate-in slide-in-from-bottom-4 fade-in duration-300",
            toast.type === "success"
              ? "bg-[#0c1e3a] text-white ring-white/10 shadow-slate-900/30"
              : "bg-rose-950 text-white ring-rose-500/20 shadow-rose-950/40",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              toast.type === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-rose-500/20 text-rose-400",
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {toast.type === "success"
                ? "Perubahan Berhasil Disimpan! 🎉"
                : "Gagal Menyimpan"}
            </p>
            <p className="mt-0.5 text-xs text-slate-300">{toast.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Lightbox Foto Manifest ── */}
      {selectedFoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedFoto(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {selectedFoto.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Foto Manifest
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFoto(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-[250px] flex-1 items-center justify-center overflow-auto bg-slate-950 p-2 sm:p-4">
              <img
                src={getFullPhotoUrl(selectedFoto.url)}
                alt="Foto Manifest"
                className="max-h-[70vh] max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Banner error mutation — tampil kalau request backend gagal. */
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const openDropdown = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setQ("");
    setOpen(true);
  };

  // Tutup dropdown kalau klik di luar.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const inside =
        (ref.current && ref.current.contains(t)) ||
        (dropdownRef.current && dropdownRef.current.contains(t));
      if (!inside) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Tutup dropdown saat scroll/resize supaya posisi tidak melenceng.
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      const t = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(t)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter((o) =>
        `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(ql),
      )
    : options;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={openDropdown}
        className="flex w-full items-center justify-between gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0c1e3a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <span className="min-w-0 truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 70,
            }}
            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
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
                <li className="px-3 py-2 text-xs text-slate-400">
                  Tidak ditemukan
                </li>
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
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {o.sub}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
