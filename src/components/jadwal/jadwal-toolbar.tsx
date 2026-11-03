"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface JadwalToolbarProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  jenisFilter: string;
  setJenisFilter: (jenis: string) => void;
  ritaseFilter: string;
  setRitaseFilter: (ritase: string) => void;
  outgoingCount: number;
  incomingCount: number;
  ritaseOptions: string[];
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
  outgoingCount,
  incomingCount,
  ritaseOptions,
  isDatePast,
  onOpenCreateModal,
}: JadwalToolbarProps) {
  return (
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
              onChange={(e) => setSelectedDate(e.target.value)}
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

      {/* Tombol Buat Jadwal Manual */}
      <button
        type="button"
        disabled={isDatePast}
        onClick={onOpenCreateModal}
        className="group inline-flex items-center gap-2 rounded-md border border-[#FEA103] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-[#FEA103] hover:text-white hover:scale-[1.03] active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#FEA103] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Plus className="h-4 w-4 text-slate-400 transition-colors group-hover:text-white" />
        <span>Buat Jadwal Manual</span>
      </button>
    </div>
  );
}

