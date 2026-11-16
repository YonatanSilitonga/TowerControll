export type Metric = "koli" | "awb";
export type UtilisasiStatus = "under" | "optimal" | "over" | "no_data";
export type DayCategory = "peak" | "normal" | "low";

export interface UtilisasiCell {
  trips: number;
  trips_with_data: number;
  load: number;
  pct: number | null;
  status: UtilisasiStatus;
}

export interface DailyRit {
  ritase_ke: number;
  cell: UtilisasiCell;
}

export interface DailyVehicle {
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan: string;
  metric: Metric;
  capacity_min: number;
  capacity_max: number;
  rits: DailyRit[];
  avg: UtilisasiCell;
}

export interface DailyGroup {
  tanggal: string;
  day_category: DayCategory;
  vehicles: DailyVehicle[];
}

export interface WeeklyVehicle {
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan: string;
  metric: Metric;
  capacity_min: number;
  capacity_max: number;
  categories: Record<DayCategory, UtilisasiCell>;
  total: UtilisasiCell;
}

export interface WeeklyGroup {
  week_start: string;
  week_end: string;
  vehicles: WeeklyVehicle[];
}

export interface MonthCell {
  weeks: number;
  avg_pct: number | null;
  status: UtilisasiStatus;
}

export interface MonthlyVehicle {
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan: string;
  metric: Metric;
  capacity_min: number;
  capacity_max: number;
  categories: Record<DayCategory, MonthCell>;
}

export interface MonthlyGroup {
  month: string;
  vehicles: MonthlyVehicle[];
}

export interface UtilisasiCoverage {
  total_trips: number;
  trips_with_koli: number;
  trips_with_awb: number;
  koli_pct: number;
  awb_pct: number;
}

export interface CapacityInfo {
  jenis: string;
  metric: Metric;
  min: number;
  max: number;
  awb_max?: number;
}

export interface CalibrationInfo {
  jenis: string;
  metric: Metric;
  trips: number;
  p95: number;
  min: number;
  max: number;
}

export interface UtilisasiMeta {
  coverage: UtilisasiCoverage;
  capacities: CapacityInfo[];
  calibration: CalibrationInfo[];
}

export interface TripDetail {
  id_ritase: number;
  tanggal: string;
  ritase_ke: number;
  week_start: string;
  day_category: DayCategory;
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan: string;
  nama_driver: string;
  metric: Metric;
  capacity_min: number;
  capacity_max: number;
  load: number;
  pct: number | null;
  status: UtilisasiStatus;
  has_data: boolean;
  source: string;
  koli: number;
  awb: number;
}

export interface UtilisasiResponse {
  start_date: string;
  end_date: string;
  meta: UtilisasiMeta;
  daily: DailyGroup[];
  weekly: WeeklyGroup[];
  monthly: MonthlyGroup[];
  trips: TripDetail[];
}

export interface DayCategoryItem {
  tanggal: string;
  kategori: DayCategory;
  source: "default" | "override";
  keterangan?: string;
}

export interface DayCategoryResponse {
  start_date: string;
  end_date: string;
  items: DayCategoryItem[];
}
