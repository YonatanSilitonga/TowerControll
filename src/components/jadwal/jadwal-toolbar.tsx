"use client";

import { useRef } from "react";
import { Plus, Calendar, Clock, TrendingUp, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface JadwalToolbarProps {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  jenisFilter: string;
  setJenisFilter: (j: string) => void;
  ritaseFilter: string;
  setRitaseFilter: (r: string) => void;
  ritaseOptions: string[];
  outgoingCount: number;
  incomingCount: number;
  isDatePast: boolean;
  onOpenCreateModal: () => void;
}

export function JadwalToolbar({
  selectedDate,
  setSelectedDate,
  jenisFilter,
  setJenisFilter,
  ritaseFilter,
  setRitaseFilter,
  ritaseOptions,
  outgoingCount,
  incomingCount,
  isDatePast,
  onOpenCreateModal,
}: JadwalToolbarProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const getNDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  const todayStr = getNDaysAgo(0);
  const tomorrowStr = getNDaysAgo(-1);
  const yesterdayStr = getNDaysAgo(1);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if ("showPicker" in HTMLInputElement.prototype) {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const activeDateLabel =
    selectedDate === todayStr
      ? `Hari Ini (${selectedDate})`
      : selectedDate === tomorrowStr
      ? `Besok / Rencana (${selectedDate})`
      : selectedDate === yesterdayStr
      ? `Kemarin (${selectedDate})`
      : `Tanggal: ${selectedDate}`;

  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardContent className="p-3.5 space-y-3">
        {/* ── Baris 1: Filter Periode (Kiri) & Indikator Tanggal Aktif (Kanan) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Kiri: Periode Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Periode:
            </span>

            {/* Tombol Hari Ini */}
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                selectedDate === todayStr
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Hari Ini
            </button>

            {/* Tombol Besok */}
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                selectedDate === tomorrowStr
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Besok (Rencana)
            </button>

            {/* Tombol Kemarin */}
            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                selectedDate === yesterdayStr
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Kemarin
            </button>

            {/* Tombol Pilih Tanggal (Pop-up Langsung) */}
            <div className="relative inline-flex items-center">
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
                tabIndex={-1}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={handleOpenDatePicker}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  ![todayStr, tomorrowStr, yesterdayStr].includes(selectedDate)
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
                title="Klik untuk memilih tanggal spesifik"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  {![todayStr, tomorrowStr, yesterdayStr].includes(selectedDate)
                    ? `Tanggal: ${selectedDate}`
                    : "Pilih Tanggal"}
                </span>
              </button>
            </div>
          </div>

          {/* Kanan: Indikator Tanggal Aktif */}
          <div className="flex items-center shrink-0 self-start sm:self-center">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>
                Tanggal Jadwal: <strong className="text-slate-900 dark:text-white font-semibold">{activeDateLabel}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Separator Garis Tipis Halus */}
        <div className="h-px bg-slate-100 dark:bg-slate-800/80" />

        {/* ── Baris 2: Controls Jenis & Ritase (Kiri) & Tombol Aksi (Kanan) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Kiri: Filter Jenis & Ritase */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Jenis Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                Jenis:
              </span>
              <div className="flex items-center gap-1.5">
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
                      "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      jenisFilter === j.value
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {j.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Separator vertikal */}
            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Ritase Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-slate-500" />
                Ritase:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ritaseOptions.map((rit) => (
                  <button
                    key={rit}
                    type="button"
                    onClick={() => setRitaseFilter(rit)}
                    className={cn(
                      "px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      ritaseFilter === rit
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {rit === "all" ? "Semua" : `RIT-${rit}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Kanan: Tombol Buat Jadwal Manual */}
          <div className="flex items-center shrink-0 self-start sm:self-center">
            <button
              type="button"
              disabled={isDatePast}
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FEA103] text-white hover:bg-[#E09102] shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Jadwal Manual</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
