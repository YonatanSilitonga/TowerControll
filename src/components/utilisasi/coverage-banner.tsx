"use client";

import { AlertBanner } from "@/components/ui/alert-banner";
import { formatNumber } from "@/lib/utils";
import type { UtilisasiCoverage } from "@/types/utilisasi";

export function CoverageBanner({ coverage }: { coverage: UtilisasiCoverage }) {
  if (coverage.total_trips === 0) {
    return (
      <AlertBanner
        type="info"
        message="Belum ada ritase outgoing pada rentang tanggal ini."
      />
    );
  }

  const koliPct = Math.round(coverage.koli_pct);
  const awbPct = Math.round(coverage.awb_pct);

  if (koliPct >= 80 && awbPct >= 80) {
    return (
      <AlertBanner
        type="success"
        message={`Coverage data muatan baik: ${formatNumber(coverage.trips_with_koli)}/${formatNumber(
          coverage.total_trips
        )} ritase punya data koli (${koliPct}%).`}
      />
    );
  }

  return (
    <AlertBanner
      type="warning"
      message={`Coverage data muatan masih rendah — koli ${formatNumber(
        coverage.trips_with_koli
      )}/${formatNumber(coverage.total_trips)} ritase (${koliPct}%), AWB ${formatNumber(
        coverage.trips_with_awb
      )}/${formatNumber(coverage.total_trips)} (${awbPct}%). Sel tanpa data ditampilkan "–", bukan 0%.`}
    />
  );
}
