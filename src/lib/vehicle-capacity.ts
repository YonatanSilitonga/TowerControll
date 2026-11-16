import type { Metric } from "@/types/utilisasi";

/** Acuan kapasitas per tipe kendaraan.
 *  Max = batas atas (dipakai sebagai penyebut %).
 *  Min = ambang bawah (Under bila % < 50% × min/max). */
export interface CapacityRule {
  metric: Metric;
  minKoli: number;
  maxKoli: number;
  minAWB: number;
  maxAWB: number;
}

export const VEHICLE_CAPACITY_RULES: Record<string, CapacityRule> = {
  CDDL: { metric: "koli", minKoli: 80, maxKoli: 100, minAWB: 0, maxAWB: 7000 },
  CDD: { metric: "koli", minKoli: 69, maxKoli: 86, minAWB: 0, maxAWB: 6000 },
  CDEL: { metric: "koli", minKoli: 57, maxKoli: 71, minAWB: 0, maxAWB: 5000 },
  CDE: { metric: "koli", minKoli: 51, maxKoli: 64, minAWB: 0, maxAWB: 4500 },
  TRAGA: { metric: "awb", minKoli: 0, maxKoli: 0, minAWB: 3000, maxAWB: 3000 },
  BV: { metric: "awb", minKoli: 0, maxKoli: 0, minAWB: 1200, maxAWB: 1500 },
};

export const VEHICLE_TYPE_OPTIONS = Object.keys(VEHICLE_CAPACITY_RULES).map(
  (value) => ({ value, label: value })
);

export function capacityRuleFor(jenis?: string | null): CapacityRule | null {
  if (!jenis) return null;
  return VEHICLE_CAPACITY_RULES[jenis.toUpperCase()] ?? null;
}

/** Ambang Under: 50% dari rasio min/max. */
export function underThreshold(min: number, max: number): number {
  if (max <= 0) return 0;
  return (50 * min) / max;
}
