"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RitDefinition {
  id: number;
  name: string;
  timeRange: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  crossesMidnight?: boolean;
}

export const RIT_SCHEDULES: RitDefinition[] = [
  {
    id: 1,
    name: "Rit 1",
    timeRange: "00:05–19:59",
    startHour: 0,
    startMinute: 5,
    endHour: 19,
    endMinute: 59,
  },
  {
    id: 2,
    name: "Rit 2",
    timeRange: "16:05–23:59",
    startHour: 16,
    startMinute: 5,
    endHour: 23,
    endMinute: 59,
  },
  {
    id: 3,
    name: "Rit 3",
    timeRange: "20:05–02:59",
    startHour: 20,
    startMinute: 5,
    endHour: 2,
    endMinute: 59,
    crossesMidnight: true,
  },
];

export type AlertLevel = "normal" | "warning" | "critical" | "expired";

export interface ActiveRitStatus {
  definition: RitDefinition;
  targetEndTime: Date;
  remainingMs: number;
  formattedRemaining: string;
  alertLevel: AlertLevel;
  alertMessage: string | null;
}

export function calculateRitStatus(
  rit: RitDefinition,
  now: Date
): {
  isActive: boolean;
  targetEndTime: Date;
  remainingMs: number;
  alertLevel: AlertLevel;
  alertMessage: string | null;
} {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const currMinuteOfDay = h * 60 + m + s / 60;

  const startMin = rit.startHour * 60 + rit.startMinute;
  const endMin = rit.endHour * 60 + rit.endMinute;

  let isActive = false;
  let targetEndTime = new Date(now);

  if (!rit.crossesMidnight) {
    if (currMinuteOfDay >= startMin && currMinuteOfDay <= endMin + 59 / 60) {
      isActive = true;
      targetEndTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        rit.endHour,
        rit.endMinute,
        59,
        999
      );
    }
  } else {
    if (currMinuteOfDay >= startMin) {
      isActive = true;
      targetEndTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        rit.endHour,
        rit.endMinute,
        59,
        999
      );
    } else if (currMinuteOfDay <= endMin + 59 / 60) {
      isActive = true;
      targetEndTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        rit.endHour,
        rit.endMinute,
        59,
        999
      );
    }
  }

  const remainingMs = targetEndTime.getTime() - now.getTime();

  let alertLevel: AlertLevel = "normal";
  let alertMessage: string | null = null;

  if (isActive) {
    if (remainingMs <= 0) {
      alertLevel = "expired";
      alertMessage = "Waktu ritase telah berakhir!";
    } else {
      const minutesLeft = remainingMs / (1000 * 60);
      if (minutesLeft <= 60) {
        alertLevel = "critical";
        alertMessage = "Selesaikan waktu pengiriman secepatnya!";
      } else if (minutesLeft <= 90) {
        alertLevel = "warning";
        alertMessage = "Waktu ritase akan habis, segera percepat pengerjaan!";
      }
    }
  }

  return { isActive, targetEndTime, remainingMs, alertLevel, alertMessage };
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "00j 00m";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${String(hours).padStart(2, "0")}j ${String(mins).padStart(2, "0")}m`;
}

/** Chip ritase dengan visual executive badge */
function RitChip({ rit }: { rit: ActiveRitStatus }) {
  const isCritical = rit.alertLevel === "critical";
  const isWarning = rit.alertLevel === "warning";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all select-none shrink-0",
        isCritical
          ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          : isWarning
          ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
          : "bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200"
      )}
    >
      {/* Indicator Pulse Dot */}
      <span className="relative flex h-2 w-2 items-center justify-center">
        {isCritical ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
          </>
        ) : isWarning ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </>
        ) : (
          <>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </>
        )}
      </span>

      {/* Nama Rit */}
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
        {rit.definition.name}
      </span>

      {/* Countdown Timer */}
      <span
        className={cn(
          "font-mono text-[11px] font-bold tabular-nums",
          isCritical
            ? "text-rose-600 dark:text-rose-400"
            : isWarning
            ? "text-amber-700 dark:text-amber-400"
            : "text-emerald-700 dark:text-emerald-400"
        )}
      >
        {rit.formattedRemaining}
      </span>

      {/* Alert Pill Tag */}
      {isCritical && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-600 text-[9px] font-black text-white uppercase tracking-wider animate-pulse">
          <AlertCircle className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Percepat!</span>
        </span>
      )}
      {isWarning && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500 text-[9px] font-black text-white uppercase tracking-wider">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">Segera</span>
        </span>
      )}
    </div>
  );
}

export function HeaderRitaseTimer() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeRits = useMemo<ActiveRitStatus[]>(() => {
    return RIT_SCHEDULES.flatMap((rit) => {
      const res = calculateRitStatus(rit, now);
      if (!res.isActive) return [];
      return [
        {
          definition: rit,
          targetEndTime: res.targetEndTime,
          remainingMs: res.remainingMs,
          formattedRemaining: formatDuration(res.remainingMs),
          alertLevel: res.alertLevel,
          alertMessage: res.alertMessage,
        } satisfies ActiveRitStatus,
      ];
    });
  }, [now]);

  // Jam HH:MM
  const hoursStr = useMemo(() => String(now.getHours()).padStart(2, "0"), [now]);
  const minutesStr = useMemo(() => String(now.getMinutes()).padStart(2, "0"), [now]);

  // Tanggal
  const dateShort = useMemo(
    () => now.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    [now]
  );
  const dateLong = useMemo(
    () =>
      now.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [now]
  );

  const hasCritical = activeRits.some((r) => r.alertLevel === "critical");
  const hasWarning = activeRits.some((r) => r.alertLevel === "warning");

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 transition-all duration-300 shadow-xs",
        "overflow-x-auto max-w-full whitespace-nowrap text-xs shrink min-w-0 backdrop-blur-md",
        hasCritical
          ? "border-rose-300 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 ring-1 ring-rose-500/20"
          : hasWarning
          ? "border-amber-300 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/40 ring-1 ring-amber-500/20"
          : "border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90"
      )}
    >
      {/* ── SEKSI 1: JAM & TANGGAL (PROFESSIONAL EXECUTIVE STYLE) ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
        </div>

        <div className="flex items-baseline gap-1.5">
          {/* Jam Digital */}
          <span className="font-mono text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {hoursStr}
            <span className="animate-pulse text-slate-400 dark:text-slate-500">:</span>
            {minutesStr}
          </span>

          {/* Tanggal */}
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline md:hidden">
            {dateShort}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden md:inline">
            {dateLong}
          </span>
        </div>
      </div>

      {/* ── SEPARATOR DIVIDER ── */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* ── SEKSI 2: STATUS RITASE ── */}
      {activeRits.length === 0 ? (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="hidden xs:inline">Jeda Ritase</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          {activeRits.map((rit) => (
            <RitChip key={rit.definition.id} rit={rit} />
          ))}
        </div>
      )}
    </div>
  );
}

