"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, BellRing, Info, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import type { AlertAnomali, Bottleneck } from "@/types/dashboard";

/* ---------- helper label & waktu ---------- */

const KATEGORI_LABEL: Record<string, string> = {
  kendaraan_berhenti: "Kendaraan berhenti",
  perjalanan_terlalu_lama: "Perjalanan terlalu lama",
};

const TINGKAT_LABEL: Record<string, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

const TINGKAT_STYLE: Record<string, { badge: string; bar: string }> = {
  info: {
    badge: "bg-sky-50 text-sky-700",
    bar: "border-sky-400 bg-sky-50/60 text-sky-800",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700",
    bar: "border-amber-400 bg-amber-50/60 text-amber-800",
  },
  critical: {
    badge: "bg-rose-50 text-rose-700",
    bar: "border-rose-400 bg-rose-50/60 text-rose-800",
  },
};

/** Waktu relatif dari ISO → "2 jam lalu". */
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 jam lalu" : `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 hari lalu" : `${d} hari lalu`;
}

function TingkatBadge({ tingkat }: { tingkat: string }) {
  const s = TINGKAT_STYLE[tingkat] ?? TINGKAT_STYLE.info;
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        s.badge
      )}
    >
      {TINGKAT_LABEL[tingkat] ?? tingkat}
    </span>
  );
}

/* ---------- modal detail (shared) ---------- */

function DetailModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function RekomendasiBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
        Rekomendasi
      </p>
      <p className="mt-0.5 text-sm leading-relaxed text-amber-800">{text}</p>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      aria-label="Tutup detail"
    >
      <X className="h-5 w-5" />
    </button>
  );
}

/* ---------- Bottleneck Card (klik → detail) ---------- */

export function BottleneckCard({
  bottlenecks,
  limit = 5,
}: {
  bottlenecks: Bottleneck[];
  limit?: number;
}) {
  const [selected, setSelected] = useState<Bottleneck | null>(null);

  return (
    <Card className="rounded-lg border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-slate-400" /> Titik-titik hambatan
          <InfoTip text="Titik potensial hambatan operasional (seller/driver). Klik item untuk detail & rekomendasi." />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {bottlenecks.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Belum ada Titik hambatan</p>
        ) : (
          <div className="px-3 pb-1 pt-1">
            {bottlenecks.slice(0, limit).map((b, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(b)}
                className="flex w-full items-center justify-between gap-2 border-b border-slate-100 py-2 pr-1 text-left transition-colors last:border-0 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{b.label}</p>
                  <p className="text-[11px] capitalize text-slate-400">{b.indikator}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="text-sm font-bold tabular-nums text-slate-800">
                    {formatNumber(b.nilai)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {selected && (
        <DetailModal onClose={() => setSelected(null)}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Bottleneck · {selected.kategori}
              </p>
              <h3 className="mt-0.5 text-lg font-bold text-slate-900">{selected.label}</h3>
            </div>
            <CloseButton onClick={() => setSelected(null)} />
          </div>

          {/* Stats */}
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Nilai</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-amber-700">{formatNumber(selected.nilai)}</p>
              <p className="text-[10px] text-amber-500">{selected.indikator}</p>
            </div>
          </div>

          {/* Deskripsi */}
          {selected.deskripsi && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              <Info className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
              {selected.deskripsi}
            </p>
          )}

          {/* Detail — daftar ritase + driver + plat */}
          {selected.detail && selected.detail.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Ritase terlibat ({selected.detail.length})
              </p>
              <div className="mt-2 space-y-2">
                {selected.detail.map((d, i) => {
                  // parse "RIT-xxx — driver Name, plat XX YY ZZ"
                  const parts = d.split(" — ");
                  const kode = parts[0] ?? d;
                  const info = parts[1] ?? "";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-[11px] font-bold text-amber-700">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{kode}</p>
                        {info && (
                          <p className="text-[11px] text-slate-500">{info}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <RekomendasiBox text={selected.rekomendasi} />
        </DetailModal>
      )}
    </Card>
  );
}

/* ---------- Alert Card (klik → detail) ---------- */

export function AlertCard({ alerts, limit = 5 }: { alerts: AlertAnomali[]; limit?: number }) {
  const [selected, setSelected] = useState<AlertAnomali | null>(null);

  return (
    <Card className="rounded-lg border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="h-4 w-4 text-slate-400" /> Status tidak wajar
          <InfoTip text="Kondisi abnormal: armada berhenti lama, perjalanan kelamaan. Klik item untuk detail & rekomendasi." />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Tidak ada status tidak wajar</p>
        ) : (
          <div className="space-y-1.5 px-3 pb-3 pt-1">
            {alerts.slice(0, limit).map((al, i) => {
              const s = TINGKAT_STYLE[al.tingkat] ?? TINGKAT_STYLE.info;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(al)}
                  className={cn(
                    "flex w-full items-start gap-2 border-l-4 px-3 py-2 text-left text-xs transition-all hover:brightness-95",
                    s.bar
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{al.pesan}</span>
                    <span className="mt-0.5 block text-[10px] opacity-70">
                      {KATEGORI_LABEL[al.kategori] ?? al.kategori} ·{" "}
                      <span className="tabular-nums">{formatDateTime(al.waktu)}</span> ·{" "}
                      {relTime(al.waktu)}
                    </span>
                  </span>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {selected && (
        <DetailModal onClose={() => setSelected(null)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TingkatBadge tingkat={selected.tingkat} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {KATEGORI_LABEL[selected.kategori] ?? selected.kategori}
              </p>
            </div>
            <CloseButton onClick={() => setSelected(null)} />
          </div>

          <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{selected.pesan}</h3>
          <p className="mt-1 text-xs text-slate-400">
            Terjadi{" "}
            <span className="tabular-nums text-slate-500">
              {formatDateTime(selected.waktu)}
            </span>{" "}
            ({relTime(selected.waktu)})
          </p>

          {selected.deskripsi && (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              <Info className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
              {selected.deskripsi}
            </p>
          )}
          <RekomendasiBox text={selected.rekomendasi} />
        </DetailModal>
      )}
    </Card>
  );
}