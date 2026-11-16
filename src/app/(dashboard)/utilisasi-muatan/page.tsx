"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Download, Gauge, RefreshCw, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoverageBanner } from "@/components/utilisasi/coverage-banner";
import {
  DailyMatrix,
  type DrillTarget,
  type VehicleTarget,
} from "@/components/utilisasi/daily-matrix";
import { DayCategoryEditor } from "@/components/utilisasi/day-category-editor";
import { DrilldownModal } from "@/components/utilisasi/drilldown-modal";
import { MonthlyMatrix } from "@/components/utilisasi/monthly-matrix";
import { TripTable } from "@/components/utilisasi/trip-table";
import { VehicleDailyModal } from "@/components/utilisasi/vehicle-daily-modal";
import { WeeklyMatrix } from "@/components/utilisasi/weekly-matrix";
import {
  useDayCategories,
  useDeleteDayCategory,
  useUpsertDayCategory,
  useUtilisasi,
} from "@/hooks/use-utilisasi";
import { addDays, todayWIB } from "@/lib/day-category";
import { cn, exportCsv, formatNumber } from "@/lib/utils";

function presetRange(days: number, today: string): { start: string; end: string } {
  return { start: addDays(today, -(days - 1)), end: today };
}

export default function UtilisasiMuatanPage() {
  // Tanggal dihitung setelah mount supaya tidak ada mismatch hidrasi pada
  // halaman yang di-prerender (build time vs waktu kunjungan).
  const [today, setToday] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tab, setTab] = useState("harian");
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [vehicleDrill, setVehicleDrill] = useState<VehicleTarget | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } = useUtilisasi(start, end);
  const categoriesQuery = useDayCategories(start, end);
  const upsertCategory = useUpsertDayCategory();
  const deleteCategory = useDeleteDayCategory();

  useEffect(() => {
    const t = todayWIB();
    setToday(t);
    const r = presetRange(30, t);
    setStart(r.start);
    setEnd(r.end);
  }, []);

  const activePreset = useMemo(() => {
    if (!today) return null;
    const r30 = presetRange(30, today);
    const r7 = presetRange(7, today);
    const r90 = presetRange(90, today);
    if (start === r30.start && end === r30.end) return 30;
    if (start === r7.start && end === r7.end) return 7;
    if (start === r90.start && end === r90.end) return 90;
    return null;
  }, [start, end, today]);

  const handleStart = (value: string) => {
    setStart(value);
    if (value > end) setEnd(value);
  };

  const handleEnd = (value: string) => {
    setEnd(value);
    if (value < start) setStart(value);
  };

  const handleExport = () => {
    if (!data) return;
    exportCsv(
      `utilisasi-muatan_${start}_${end}`,
      [
        "Tanggal",
        "Kategori Hari",
        "Plat",
        "Jenis",
        "Driver",
        "Ritase Ke",
        "Metrik",
        "Muatan",
        "Kapasitas Min",
        "Kapasitas Max",
        "Utilisasi %",
        "Status",
        "Sumber",
        "Koli",
        "AWB",
      ],
      data.trips.map((t) => [
        t.tanggal,
        t.day_category,
        t.plat_nomor,
        t.jenis_kendaraan,
        t.nama_driver,
        t.ritase_ke,
        t.metric,
        t.has_data ? t.load : "",
        t.capacity_min,
        t.capacity_max,
        t.pct === null ? "" : t.pct.toFixed(1),
        t.status,
        t.source,
        t.koli,
        t.awb,
      ])
    );
  };

  const vehicleCount = useMemo(() => {
    if (!data) return 0;
    const ids = new Set<number>();
    for (const g of data.daily) for (const v of g.vehicles) ids.add(v.id_kendaraan);
    return ids.size;
  }, [data]);

  const tripCount = data?.trips.length ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Utilisasi Muatan"
        description="Rata-rata keterisian muatan per kendaraan — harian, mingguan per kategori hari, dan bulanan."
        crumbs={[{ label: "Utilisasi Muatan" }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              <span className="hidden sm:inline">Muat ulang</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || tripCount === 0}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-500">
              Dari
              <Input
                type="date"
                value={start}
                max={end}
                onChange={(e) => handleStart(e.target.value)}
                className="h-9 w-[145px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-500">
              Sampai
              <Input
                type="date"
                value={end}
                min={start}
                max={today || undefined}
                onChange={(e) => handleEnd(e.target.value)}
                className="h-9 w-[145px]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[7, 30, 90].map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={activePreset === n ? "default" : "outline"}
                disabled={!today}
                onClick={() => {
                  const r = presetRange(n, today);
                  setStart(r.start);
                  setEnd(r.end);
                }}
              >
                {n} hari
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!today}
              onClick={() => {
                setStart(`${today.slice(0, 7)}-01`);
                setEnd(today);
              }}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Bulan ini
            </Button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span>
              <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {formatNumber(tripCount)}
              </span>{" "}
              ritase
            </span>
            <span>
              <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {formatNumber(vehicleCount)}
              </span>{" "}
              kendaraan
            </span>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <AlertBanner
          type="error"
          message={
            error instanceof Error
              ? error.message
              : "Gagal memuat data utilisasi muatan. Coba muat ulang."
          }
        />
      ) : null}

      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <CoverageBanner coverage={data.meta.coverage} />

          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="harian">Harian</TabsTrigger>
                <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                <TabsTrigger value="detail">Detail Ritase</TabsTrigger>
              </TabsList>

              {tab === "harian" && (
                <Button
                  type="button"
                  size="sm"
                  variant={showEditor ? "default" : "outline"}
                  onClick={() => setShowEditor((v) => !v)}
                >
                  <Settings2 className="h-4 w-4" />
                  Atur kategori hari
                </Button>
              )}
            </div>

            <TabsContent value="harian" className="mt-3 space-y-4">
              <p className="text-xs text-slate-400">
                Klik nama kendaraan untuk melihat card muatan per hari. Klik sel tanggal untuk rincian Rit 1/2/3.
              </p>
              <DailyMatrix
                groups={data.daily}
                onDrill={setDrill}
                onVehicleClick={setVehicleDrill}
              />
              {showEditor && (
                <DayCategoryEditor
                  items={categoriesQuery.data?.items ?? []}
                  loading={categoriesQuery.isLoading}
                  saving={upsertCategory.isPending || deleteCategory.isPending}
                  onSave={(tanggal, kategori) =>
                    upsertCategory.mutate({ tanggal, kategori })
                  }
                  onReset={(tanggal) => deleteCategory.mutate(tanggal)}
                />
              )}
            </TabsContent>

            <TabsContent value="mingguan" className="mt-3 space-y-4">
              <p className="text-xs text-slate-400">
                Rata-rata per kategori hari: hanya ritase yang punya data metrik yang masuk penyebut.
              </p>
              <WeeklyMatrix groups={data.weekly} onDrill={setDrill} />
            </TabsContent>

            <TabsContent value="bulanan" className="mt-3 space-y-4">
              <p className="text-xs text-slate-400">
                Rata-rata dari nilai mingguan yang berdata (minggu tanpa data tidak dihitung).
              </p>
              <MonthlyMatrix groups={data.monthly} onDrill={setDrill} />
            </TabsContent>

            <TabsContent value="detail" className="mt-3">
              <TripTable trips={data.trips} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <VehicleDailyModal
        vehicle={vehicleDrill}
        groups={data?.daily ?? []}
        onClose={() => setVehicleDrill(null)}
      />
      <DrilldownModal target={drill} trips={data?.trips ?? []} onClose={() => setDrill(null)} />

      <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Gauge className="h-3 w-3" />
        Persentase = total muatan ÷ (kapasitas maks × jumlah ritase berdata) × 100.
      </p>
    </div>
  );
}
