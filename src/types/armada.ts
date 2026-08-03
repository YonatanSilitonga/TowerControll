export type FleetStatus = "active" | "inactive";
export type VehicleStatus = "available" | "in_transit" | "maintenance" | "off";
export type DriverStatus = "on_duty" | "off";
export type TripStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface Fleet {
  id: string;
  kode: string;
  nama: string;
  lokasi: string;
  status: FleetStatus;
  deskripsi?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  plat: string;
  tipe: string;
  kapasitas_kg: number;
  fleet_id?: string;
  status: VehicleStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  nama: string;
  nik: string;
  no_sim: string;
  telepon: string;
  fleet_id?: string;
  status: DriverStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Trip {
  id: string;
  kode: string;
  vehicle_id?: string;
  driver_id?: string;
  asal: string;
  tujuan: string;
  jarak_km: number;
  status: TripStatus;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
