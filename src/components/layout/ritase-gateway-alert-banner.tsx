"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAdminRitase } from "@/hooks/use-admin-ritase";
import { useDriver } from "@/hooks/use-armada";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  MapPin,
  MessageCircle,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface GatewayAlertItem {
  idRitase: number;
  kodeRitase: string;
  ritaseKe: number;
  namaDriver: string;
  nopol: string;
  idKendaraan: number;
  namaGateway: string;
  jamSelesai: string;
  diffMinutes: number; // positif = sisa menit, negatif = terlambat
  isOverdue: boolean;
  phone: string;
  waUrl: string | null;
}

function getWibMinutesNow(): number {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.getUTCHours() * 60 + wib.getUTCMinutes();
}

function calculateDiffMinutes(jamSelesai: string, jamMulai?: string | null): number {
  const parts = jamSelesai.split(":");
  if (parts.length < 2) return 999;
  const sJam = parseInt(parts[0], 10);
  const sMin = parseInt(parts[1], 10);
  let deadlineMin = sJam * 60 + sMin;

  const nowMin = getWibMinutesNow();

  // Cross-midnight detection
  if (jamMulai) {
    const mParts = jamMulai.split(":");
    if (mParts.length >= 2) {
      const mJam = parseInt(mParts[0], 10);
      const mMin = parseInt(mParts[1], 10);
      const mulaiMin = mJam * 60 + mMin;
      if (mulaiMin > deadlineMin && nowMin >= mulaiMin) {
        deadlineMin += 24 * 60;
      }
    }
  }

  return deadlineMin - nowMin;
}

function playBeep(isOverdue: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = isOverdue ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isOverdue ? 880 : 620, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Abaikan jika browser memblokir autoplay audio
  }
}

export function RitaseGatewayAlertBanner({ compact = false }: { compact?: boolean }) {
  // Tanggal WIB hari ini YYYY-MM-DD
  const todayWIB = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const { data: ritases } = useAdminRitase(todayWIB);
  const { data: drivers } = useDriver();

  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ticker, setTicker] = useState(0);
  const lastAlertedCountRef = useRef(0);

  // Update timer setiap 15 detik agar menit mundur selalu akurat
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Filter ritase reguler yang memenuhi kondisi peringatan (<= 20 menit ke deadline atau overdue)
  const alertItems: GatewayAlertItem[] = useMemo(() => {
    if (!ritases || !Array.isArray(ritases)) return [];

    const phoneMap = new Map<number, string>();
    if (drivers && Array.isArray(drivers)) {
      for (const d of drivers) {
        if (d.id_driver && d.no_hp) {
          phoneMap.set(d.id_driver, d.no_hp);
        }
      }
    }

    const items: GatewayAlertItem[] = [];

    for (const r of ritases) {
      // 1. Lewati jika sudah selesai atau sudah di-dismiss oleh user
      if (r.status === "selesai" || dismissedIds.has(r.id_ritase)) continue;

      // 2. Wajib ada batas jam selesai
      if (!r.jam_selesai) continue;

      // 3. Hitung selisih waktu
      const diff = calculateDiffMinutes(r.jam_selesai, r.jam_mulai);

      // Peringatan aktif jika waktu tersisa <= 20 menit (atau sudah minus / overdue)
      // Dan jangan muncul jika sudah lewat lebih dari 4 jam (ritase lama yang basi)
      if (diff <= 20 && diff >= -240) {
        const phone = phoneMap.get(r.id_driver) || "";
        const wa = whatsappUrl(phone);

        // Cari nama lokasi tujuan akhir (gateway / drop point)
        const gatewayStop = r.stops && r.stops.length > 0 ? r.stops[r.stops.length - 1] : null;
        const namaGateway = gatewayStop?.nama_lokasi || r.nama_drop_point || "Gateway";

        items.push({
          idRitase: r.id_ritase,
          kodeRitase: r.kode_ritase || `RIT-${r.id_ritase}`,
          ritaseKe: r.ritase_ke || 1,
          namaDriver: r.nama_driver || "Driver",
          nopol: r.nopol || "-",
          idKendaraan: r.id_kendaraan,
          namaGateway,
          jamSelesai: r.jam_selesai.slice(0, 5),
          diffMinutes: diff,
          isOverdue: diff < 0,
          phone,
          waUrl: wa,
        });
      }
    }

    // Urutkan: yang paling terlambat / paling mendesak di urutan teratas
    items.sort((a, b) => a.diffMinutes - b.diffMinutes);

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ritases, drivers, dismissedIds, ticker]);

  // Bunyikan beep audio halus saat ada peringatan baru yang masuk
  useEffect(() => {
    if (alertItems.length > 0 && alertItems.length > lastAlertedCountRef.current && soundEnabled) {
      const hasOverdue = alertItems.some((i) => i.isOverdue);
      playBeep(hasOverdue);
    }
    lastAlertedCountRef.current = alertItems.length;
  }, [alertItems, soundEnabled]);

  if (alertItems.length === 0) return null;

  const hasCritical = alertItems.some((i) => i.isOverdue);

  return (
    <aside
      aria-label="Peringatan Keterlambatan Gateway"
      className={cn(
        "transition-all duration-300",
        compact ? "w-full max-w-3xl mx-auto" : "w-full px-4 pt-3 pb-1"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border shadow-lg transition-all",
          hasCritical
            ? "border-rose-300 bg-rose-50/95 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/80 dark:text-rose-100"
            : "border-amber-300 bg-amber-50/95 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-100"
        )}
      >
        {/* Header alert */}
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg shadow-sm",
                hasCritical ? "bg-rose-600 text-white animate-pulse" : "bg-amber-600 text-white"
              )}
            >
              {hasCritical ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  {hasCritical ? "Peringatan Kritis: Terlambat Sampai Gateway" : "Peringatan SLA: Waktu Menuju Gateway Mau Habis"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    hasCritical ? "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200" : "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  )}
                >
                  {alertItems.length} Driver
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Driver reguler belum update status sampai ke gateway dan batas waktu segera berakhir. Segera hubungi driver!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Matikan suara notifikasi" : "Nyalakan suara notifikasi"}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-50" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const allIds = new Set(dismissedIds);
                alertItems.forEach((i) => allIds.add(i.idRitase));
                setDismissedIds(allIds);
              }}
              title="Tutup semua peringatan"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List card driver yang bermasalah */}
        <div className="divide-y divide-black/5 p-2 dark:divide-white/10 space-y-1.5">
          {alertItems.map((item) => (
            <div
              key={item.idRitase}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/80 p-3 shadow-xs dark:bg-slate-900/80 transition-all",
                item.isOverdue
                  ? "border border-rose-200 hover:border-rose-300 dark:border-rose-900"
                  : "border border-amber-200 hover:border-amber-300 dark:border-amber-900"
              )}
            >
              {/* Info driver & ritase */}
              <div className="flex items-start gap-3 min-w-[240px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                      {item.namaDriver}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.nopol}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Rit {item.ritaseKe}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      Tujuan: <strong className="text-slate-800 dark:text-slate-200">{item.namaGateway}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Batas Waktu: <strong>{item.jamSelesai} WIB</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Countdown / Status keterlambatan */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-2xs",
                      item.isOverdue
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-amber-500 text-white"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {item.isOverdue
                      ? `Terlambat ${Math.abs(item.diffMinutes)} Menit!`
                      : `Sisa ${item.diffMinutes} Menit Lagi`}
                  </span>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                    {item.isOverdue ? "Segera hubungi driver" : "Menuju batas waktu"}
                  </p>
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center gap-2">
                  {item.waUrl ? (
                    <a
                      href={item.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Hubungi Driver
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No HP tidak tersedia</span>
                  )}

                  {item.idKendaraan > 0 && (
                    <Link
                      href={`/armada/live-map?kendaraan=${item.idKendaraan}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Pantau di Peta
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDismissedIds((prev) => new Set(prev).add(item.idRitase));
                    }}
                    title="Abaikan untuk sesi ini"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

