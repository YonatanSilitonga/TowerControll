"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Package,
  RefreshCw,
  Search,
  Store,
  Truck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useManifestPenjemputan, useManifestPhotos } from "@/hooks/use-manifest-photos";
import { getFullPhotoUrl } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ManifestPhotoItem,
  PenjemputanRingkasan,
  RiwayatPenjemputan,
} from "@/types/armada";

interface Muatan {
  awb: number;
  koli: number;
  ecer: number;
  hv: number;
}

interface ReportGroup {
  key: string;
  id_seller: number;
  nama_lokasi: string;
  jenis_ritase: string;
  ritase_ke: number;
  kaptenNames: Set<string>;
  photos: ManifestPhotoItem[];
  handovers: RiwayatPenjemputan[];
  input: Muatan;
  taken: Muatan;
  sisa: Muatan;
  hasUnlinked: boolean;
}

interface PhotoViewer {
  url: string;
  title: string;
  subtitle?: string;
}

const RITASE_OPTIONS = [1, 2, 3] as const;

const emptyMuatan = (): Muatan => ({ awb: 0, koli: 0, ecer: 0, hv: 0 });

function summaryKeys(
  id?: number | null,
  name?: string,
  jenis?: string,
  ritaseKe?: number | null,
) {
  const suffix = `__${(jenis || "outgoing").toLowerCase()}__${ritaseKe ?? 0}`;
  const keys: string[] = [];
  if (id && id > 0) keys.push(`id:${id}${suffix}`);
  const normalizedName = (name ?? "").trim().toLowerCase();
  if (normalizedName) keys.push(`name:${normalizedName}${suffix}`);
  return keys;
}

function summaryKey(
  id?: number | null,
  name?: string,
  jenis?: string,
  ritaseKe?: number | null,
) {
  return summaryKeys(id, name, jenis, ritaseKe)[0] ?? `name:__${(jenis || "outgoing").toLowerCase()}__${ritaseKe ?? 0}`;
}

function implantKeys(
  id?: number | null,
  jenis?: string,
  ritaseKe?: number | null,
) {
  if (!id || id <= 0) return [];
  return [
    `implant:${id}__${(jenis || "outgoing").toLowerCase()}__${ritaseKe ?? 0}`,
  ];
}

function firstFromMap<T>(map: Map<string, T>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (map.has(key)) return map.get(key);
  }
  return undefined;
}

function addMuatan(target: Muatan, source: Muatan) {
  target.awb += source.awb;
  target.koli += source.koli;
  target.ecer += source.ecer;
  target.hv += source.hv;
}

function photoMuatan(photo: ManifestPhotoItem): Muatan {
  return {
    awb: photo.jumlah_awb || 0,
    koli: photo.total_koli || 0,
    ecer: photo.total_ecer || 0,
    hv: photo.total_hv || 0,
  };
}

function handoverMuatan(item: RiwayatPenjemputan): Muatan {
  return {
    awb: item.jumlah_awb || 0,
    koli: item.total_koli || 0,
    ecer: item.total_ecer || 0,
    hv: item.total_hv || 0,
  };
}

function ringkasanMuatan(item?: PenjemputanRingkasan) {
  if (!item) {
    return {
      input: emptyMuatan(),
      taken: emptyMuatan(),
      sisa: emptyMuatan(),
    };
  }
  return {
    input: {
      awb: item.input_awb || 0,
      koli: item.input_koli || 0,
      ecer: item.input_ecer || 0,
      hv: item.input_hv || 0,
    },
    taken: {
      awb: item.diambil_awb || 0,
      koli: item.diambil_koli || 0,
      ecer: item.diambil_ecer || 0,
      hv: item.diambil_hv || 0,
    },
    sisa: {
      awb: item.sisa_awb || 0,
      koli: item.sisa_koli || 0,
      ecer: item.sisa_ecer || 0,
      hv: item.sisa_hv || 0,
    },
  };
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}

function yesterdayJakarta() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    date,
  );
}

function displayDate(value: string) {
  if (value === "all") return "Semua tanggal";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function timeOf(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function number(value: number) {
  return value.toLocaleString("id-ID");
}

export default function RiwayatImplanPage() {
  const role = useAuthStore((state) => state.user?.role);

  if (role !== "tower_control") {
    return (
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Riwayat Implan"
          description="Laporan muatan dan serah terima dari kapten implant."
          crumbs={[{ label: "Riwayat Implan" }]}
        />
        <UnderConstruction />
      </div>
    );
  }

  return <RiwayatImplanContent />;
}

function RiwayatImplanContent() {
  const today = useMemo(todayJakarta, []);
  const yesterday = useMemo(yesterdayJakarta, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [ritaseKe, setRitaseKe] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<PhotoViewer | null>(null);

  const filter = useMemo(
    () => ({
      tanggal: selectedDate === "all" ? undefined : selectedDate,
      ritase_ke: ritaseKe,
      input_by: "kapten",
    }),
    [selectedDate, ritaseKe],
  );

  const {
    data: rawPhotos = [],
    isLoading: loadingPhotos,
    isFetching: fetchingPhotos,
    isError: errorPhotos,
    refetch: refetchPhotos,
  } = useManifestPhotos(filter);

  const {
    data: penjemputan,
    isLoading: loadingPenjemputan,
    isFetching: fetchingPenjemputan,
    isError: errorPenjemputan,
    refetch: refetchPenjemputan,
  } = useManifestPenjemputan({
    tanggal: filter.tanggal,
    ritase_ke: ritaseKe,
  });

  const ringkasanByKey = useMemo(() => {
    const map = new Map<string, PenjemputanRingkasan>();
    for (const item of penjemputan?.ringkasan ?? []) {
      for (const key of summaryKeys(
        item.id_seller,
        item.nama_lokasi,
        item.jenis_ritase,
        item.ritase_ke,
      )) {
        map.set(key, item);
      }
    }
    return map;
  }, [penjemputan]);

  const riwayatByKey = useMemo(() => {
    const map = new Map<string, RiwayatPenjemputan[]>();
    for (const item of penjemputan?.riwayat ?? []) {
      for (const key of summaryKeys(
        item.id_seller,
        item.nama_lokasi,
        item.jenis_ritase,
        item.ritase_ke,
      )) {
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
      }
    }
    return map;
  }, [penjemputan]);

  const ringkasanByImplant = useMemo(() => {
    const map = new Map<string, PenjemputanRingkasan>();
    for (const item of penjemputan?.ringkasan ?? []) {
      for (const key of implantKeys(
        item.id_implant,
        item.jenis_ritase,
        item.ritase_ke,
      )) {
        map.set(key, item);
      }
    }
    return map;
  }, [penjemputan]);

  const riwayatByImplant = useMemo(() => {
    const map = new Map<string, RiwayatPenjemputan[]>();
    for (const item of penjemputan?.riwayat ?? []) {
      for (const key of implantKeys(
        item.id_implant,
        item.jenis_ritase,
        item.ritase_ke,
      )) {
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
      }
    }
    return map;
  }, [penjemputan]);

  const groups = useMemo<ReportGroup[]>(() => {
    const map = new Map<string, ReportGroup>();

    for (const photo of rawPhotos) {
      if (photo.input_by !== "kapten") continue;
      const key = summaryKey(
        photo.id_seller,
        photo.nama_lokasi,
        photo.jenis_ritase,
        photo.ritase_ke,
      );
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          id_seller: photo.id_seller ?? 0,
          nama_lokasi: photo.nama_lokasi || "Implan",
          jenis_ritase: (photo.jenis_ritase || "outgoing").toLowerCase(),
          ritase_ke: photo.ritase_ke,
          kaptenNames: new Set<string>(),
          photos: [],
          handovers: [],
          input: emptyMuatan(),
          taken: emptyMuatan(),
          sisa: emptyMuatan(),
          hasUnlinked: false,
        };
        map.set(key, group);
      }
      group.kaptenNames.add(photo.input_by_name?.trim() || "Kapten");
      group.photos.push(photo);
      if (!photo.id_ritase) group.hasUnlinked = true;
    }

    for (const group of map.values()) {
      group.photos.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const groupKeys = summaryKeys(
        group.id_seller,
        group.nama_lokasi,
        group.jenis_ritase,
        group.ritase_ke,
      );
      const groupImplantKeys = new Set<string>();
      for (const photo of group.photos) {
        for (const key of implantKeys(
          photo.id_implant,
          group.jenis_ritase,
          group.ritase_ke,
        )) {
          groupImplantKeys.add(key);
        }
      }

      const handoversById = new Map<number, RiwayatPenjemputan>();
      if (groupImplantKeys.size > 0) {
        for (const key of groupImplantKeys) {
          for (const item of riwayatByImplant.get(key) ?? []) {
            handoversById.set(item.id, item);
          }
        }
        for (const item of firstFromMap(riwayatByKey, groupKeys) ?? []) {
          if (!item.id_implant) handoversById.set(item.id, item);
        }
      } else {
        for (const item of firstFromMap(riwayatByKey, groupKeys) ?? []) {
          handoversById.set(item.id, item);
        }
      }
      group.handovers = Array.from(handoversById.values()).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      const ringkasanRows = new Map<string, PenjemputanRingkasan>();
      if (groupImplantKeys.size > 0) {
        for (const key of groupImplantKeys) {
          const item = ringkasanByImplant.get(key);
          if (item) ringkasanRows.set(key, item);
        }
      } else {
        const item = firstFromMap(ringkasanByKey, groupKeys);
        if (item) ringkasanRows.set(groupKeys[0] ?? "fallback", item);
      }

      const fallbackInput = group.photos.reduce((total, photo) => {
        addMuatan(total, photoMuatan(photo));
        return total;
      }, emptyMuatan());
      const ringkasanInput = Array.from(ringkasanRows.values()).reduce(
        (total, item) => {
          addMuatan(total, ringkasanMuatan(item).input);
          return total;
        },
        emptyMuatan(),
      );
      const input = ringkasanRows.size > 0 ? ringkasanInput : fallbackInput;
      const taken = group.handovers.reduce((total, item) => {
        addMuatan(total, handoverMuatan(item));
        return total;
      }, emptyMuatan());

      group.input = input;
      group.taken = taken;
      group.sisa = {
        awb: Math.max(0, input.awb - taken.awb),
        koli: Math.max(0, input.koli - taken.koli),
        ecer: Math.max(0, input.ecer - taken.ecer),
        hv: Math.max(0, input.hv - taken.hv),
      };
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        a.nama_lokasi.localeCompare(b.nama_lokasi, "id", {
          sensitivity: "base",
        }) || a.ritase_ke - b.ritase_ke,
    );
  }, [
    rawPhotos,
    ringkasanByKey,
    riwayatByKey,
    ringkasanByImplant,
    riwayatByImplant,
  ]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => {
      const haystack = [
        group.nama_lokasi,
        group.jenis_ritase,
        ...group.kaptenNames,
        ...group.photos.map((photo) => photo.kode_ritase),
        ...group.handovers.map((item) => item.nama_driver),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [groups, search]);

  const stats = useMemo(() => {
    const total = {
      reports: filteredGroups.length,
      input: emptyMuatan(),
      taken: emptyMuatan(),
      sisa: emptyMuatan(),
      photos: 0,
    };
    for (const group of filteredGroups) {
      addMuatan(total.input, group.input);
      addMuatan(total.taken, group.taken);
      addMuatan(total.sisa, group.sisa);
      total.photos +=
        group.photos.filter((photo) => photo.foto_manifest_url).length +
        group.handovers.filter((item) => item.foto_penjemputan_url).length;
    }
    return total;
  }, [filteredGroups]);

  const loading = loadingPhotos || loadingPenjemputan;
  const fetching = fetchingPhotos || fetchingPenjemputan;
  const hasError = errorPhotos || errorPenjemputan;
  const isCustomDate =
    selectedDate !== today && selectedDate !== yesterday && selectedDate !== "all";

  const refetch = () => {
    void refetchPhotos();
    void refetchPenjemputan();
  };

  const toggleGroup = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(filteredGroups.map((group) => group.key)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Riwayat Implan"
        description="Laporan muatan, serah terima, dan foto dari kapten implant."
        crumbs={[{ label: "Riwayat Implan" }]}
        actions={
          <button
            type="button"
            onClick={refetch}
            disabled={fetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", fetching && "animate-spin")}
            />
            {fetching ? "Menyinkronkan..." : "Segarkan"}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Laporan" value={number(stats.reports)} />
        <StatCard label="AWB" value={number(stats.input.awb)} tone="blue" />
        <StatCard label="Koli" value={number(stats.input.koli)} tone="amber" />
        <StatCard label="Ecer" value={number(stats.input.ecer)} tone="cyan" />
        <StatCard label="High Value" value={number(stats.input.hv)} tone="rose" />
        <StatCard label="Foto" value={number(stats.photos)} tone="emerald" />
      </div>

      <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="space-y-3 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Tanggal
              </span>
              <DateButton
                active={selectedDate === today}
                onClick={() => setSelectedDate(today)}
              >
                Hari ini
              </DateButton>
              <DateButton
                active={selectedDate === yesterday}
                onClick={() => setSelectedDate(yesterday)}
              >
                Kemarin
              </DateButton>
              <DateButton
                active={selectedDate === "all"}
                onClick={() => setSelectedDate("all")}
              >
                Semua
              </DateButton>
              <div className="relative inline-flex items-center">
                <span
                  className={cn(
                    "pointer-events-none inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs",
                    isCustomDate
                      ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {isCustomDate
                    ? displayDate(selectedDate)
                    : "Pilih tanggal"}
                </span>
                <input
                  type="date"
                  value={selectedDate === "all" ? "" : selectedDate}
                  max={today}
                  onChange={(event) => {
                    if (event.target.value) setSelectedDate(event.target.value);
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  title="Pilih tanggal"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Truck className="h-3.5 w-3.5" />
                Ritase
              </span>
              {RITASE_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRitaseKe(value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    ritaseKe === value
                      ? "bg-[#0c1e3a] text-white shadow-sm dark:bg-white dark:text-slate-900"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
                >
                  Rit {value}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari implant, kapten, driver, atau kode ritase..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0c1e3a] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                  title="Hapus pencarian"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              Buka Semua
            </button>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              Tutup Semua
            </button>
          </div>
        </CardContent>
      </Card>

      {hasError && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                {errorPenjemputan
                  ? "Data serah terima gagal dimuat"
                  : "Data laporan gagal dimuat"}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">
                {errorPenjemputan
                  ? 'Angka "Diambil Driver" dan "Sisa" belum final. Coba segarkan kembali.'
                  : "Daftar laporan dan foto belum bisa ditampilkan. Coba segarkan kembali."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refetch}
            disabled={fetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-900/50"
          >
            <RefreshCw className={cn("h-3 w-3", fetching && "animate-spin")} />
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Store className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              Belum ada laporan Kapten
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Tidak ada laporan untuk Rit {ritaseKe} pada tanggal{" "}
              {displayDate(selectedDate)}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <ReportCard
              key={group.key}
              group={group}
              expanded={expanded.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onPhoto={setViewer}
              dataIncomplete={Boolean(errorPenjemputan)}
            />
          ))}
        </div>
      )}

      {viewer && <PhotoModal photo={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "amber" | "cyan" | "rose" | "emerald";
}) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white",
    blue: "border-blue-100 bg-blue-50/60 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
    amber:
      "border-amber-100 bg-amber-50/60 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
    cyan: "border-cyan-100 bg-cyan-50/60 text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300",
    rose: "border-rose-100 bg-rose-50/60 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300",
    emerald:
      "border-emerald-100 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  }[tone];

  return (
    <div className={cn("rounded-xl border p-3.5 shadow-2xs", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function DateButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
      )}
    >
      {children}
    </button>
  );
}

function ReportCard({
  group,
  expanded,
  onToggle,
  onPhoto,
  dataIncomplete = false,
}: {
  group: ReportGroup;
  expanded: boolean;
  onToggle: () => void;
  onPhoto: (photo: PhotoViewer) => void;
  dataIncomplete?: boolean;
}) {
  const inputPhotos = group.photos.filter((photo) => photo.foto_manifest_url);
  const handoverPhotos = group.handovers.filter(
    (item) => item.foto_penjemputan_url,
  );
  const hasSisa =
    group.sisa.awb > 0 ||
    group.sisa.koli > 0 ||
    group.sisa.ecer > 0 ||
    group.sisa.hv > 0;
  const needsAttention = dataIncomplete || hasSisa;
  const kaptenLabel = Array.from(group.kaptenNames).join(", ") || "Kapten";
  const firstTime = group.photos[0]?.created_at;

  let running = emptyMuatan();
  const handoverRows = group.handovers.map((item) => {
    addMuatan(running, handoverMuatan(item));
    return {
      item,
      sisa: {
        awb: Math.max(0, group.input.awb - running.awb),
        koli: Math.max(0, group.input.koli - running.koli),
        ecer: Math.max(0, group.input.ecer - running.ecer),
        hv: Math.max(0, group.input.hv - running.hv),
      },
    };
  });

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
      >
        <div className="flex min-w-0 items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            <Store className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {group.nama_lokasi}
              </p>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Rit {group.ritase_ke}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {group.jenis_ritase}
              </span>
              {group.hasUnlinked && (
                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Belum dikonfirmasi
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              Kapten: {kaptenLabel}
              {firstTime && (
                <>
                  <span className="mx-1.5 text-slate-300 dark:text-slate-700">
                    ·
                  </span>
                  <Clock className="mr-0.5 inline h-3 w-3" />
                  {timeOf(firstTime)}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Camera className="h-3 w-3" />
            {inputPhotos.length + handoverPhotos.length} foto
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <Truck className="h-3 w-3" />
            {group.handovers.length} serah terima
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold",
              needsAttention
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
            )}
          >
            {dataIncomplete
              ? "Data belum lengkap"
              : hasSisa
                ? "Ada sisa"
                : "Selesai"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          <div className="grid gap-2 sm:grid-cols-3">
            <MuatanBox
              label="Muatan Saat Ini"
              values={group.input}
              tone="slate"
            />
            <MuatanBox label="Diambil Driver" values={group.taken} tone="blue" />
            <MuatanBox
              label="Sisa"
              values={group.sisa}
              tone={needsAttention ? "amber" : "emerald"}
            />
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Laporan Kapten
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {group.photos.length} input · {inputPhotos.length} foto
              </span>
            </div>
            {group.photos.map((photo) => (
              <div
                key={`input-${photo.id_event}-${photo.created_at}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <Clock className="h-3 w-3" />
                  {timeOf(photo.created_at)}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <Package className="h-3 w-3" />
                  {number(photo.jumlah_awb || 0)} AWB
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {number(photo.total_koli || 0)} koli ·{" "}
                  {number(photo.total_ecer || 0)} ecer ·{" "}
                  {number(photo.total_hv || 0)} HV
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-slate-400">
                  {photo.kode_ritase || "-"}
                </span>
                {photo.foto_manifest_url ? (
                  <button
                    type="button"
                    onClick={() =>
                      onPhoto({
                        url: photo.foto_manifest_url,
                        title: group.nama_lokasi,
                        subtitle: `Laporan Kapten · ${formatDateTime(photo.created_at)}`,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#0c1e3a] hover:bg-[#0c1e3a] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Camera className="h-3 w-3" />
                    Foto
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
                    <Camera className="h-3 w-3" />
                    Tanpa foto
                  </span>
                )}
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Serah Terima Driver
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {group.handovers.length} kejadian · {handoverPhotos.length} foto
              </span>
            </div>
            {handoverRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
                Belum ada serah terima driver untuk laporan ini.
              </div>
            ) : (
              [...handoverRows].reverse().map(({ item, sisa }) => {
                const hasRowSisa =
                  sisa.awb > 0 ||
                  sisa.koli > 0 ||
                  sisa.ecer > 0 ||
                  sisa.hv > 0;
                return (
                  <div
                    key={`handover-${item.id}`}
                    className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        <Truck className="h-3 w-3" />
                        {item.nama_driver || "Driver"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {timeOf(item.created_at)}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {number(item.jumlah_awb || 0)} AWB ·{" "}
                        {number(item.total_koli || 0)} koli ·{" "}
                        {number(item.total_ecer || 0)} ecer ·{" "}
                        {number(item.total_hv || 0)} HV
                      </span>
                      <span className="min-w-0 flex-1" />
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold",
                          hasRowSisa
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                        )}
                      >
                        {hasRowSisa
                          ? `Sisa ${number(sisa.awb)} AWB`
                          : "Habis"}
                      </span>
                      {item.foto_penjemputan_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            onPhoto({
                              url: item.foto_penjemputan_url,
                              title: group.nama_lokasi,
                              subtitle: `Serah terima ${item.nama_driver || "Driver"} · ${formatDateTime(item.created_at)}`,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#0c1e3a] hover:bg-[#0c1e3a] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Camera className="h-3 w-3" />
                          Foto
                        </button>
                      ) : null}
                    </div>
                    {item.catatan && (
                      <p className="mt-1 text-[11px] italic text-slate-500 dark:text-slate-400">
                        {item.catatan}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      )}
    </Card>
  );
}

function MuatanBox({
  label,
  values,
  tone,
}: {
  label: string;
  values: Muatan;
  tone: "slate" | "blue" | "amber" | "emerald";
}) {
  const toneClass = {
    slate:
      "border-slate-200 bg-slate-50/70 text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200",
    blue: "border-blue-200 bg-blue-50/60 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    amber:
      "border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    emerald:
      "border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  }[tone];

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-black tabular-nums">
          {number(values.awb)} AWB
        </span>
        <span className="text-[11px] font-semibold tabular-nums">
          {number(values.koli)} koli · {number(values.ecer)} ecer ·{" "}
          {number(values.hv)} HV
        </span>
      </div>
    </div>
  );
}

function PhotoModal({
  photo,
  onClose,
}: {
  photo: PhotoViewer;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {photo.title}
            </h3>
            {photo.subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                {photo.subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={getFullPhotoUrl(photo.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2 dark:bg-slate-950 sm:p-4">
          <img
            src={getFullPhotoUrl(photo.url)}
            alt={photo.title}
            className="m-auto block max-h-[76vh] max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
