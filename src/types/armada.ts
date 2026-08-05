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

/* ---------- Live Tracking ---------- */

export interface TrackingVehicle {
  id_tracking: number;
  id_kendaraan: number;
  plat_nomor: string;
  id_driver: number;
  nama_driver: string;
  latitude: number;
  longitude: number;
  kecepatan?: number | null;
  arah?: number | null;
  status?: string | null;
  last_update: string;
}

export interface SellerLocation {
  id_seller: number;
  nama_seller: string;
  alamat: string;
  kota: string;
  latitude: number;
  longitude: number;
}

export interface TrackingMap {
  vehicles: TrackingVehicle[];
  sellers: SellerLocation[];
}

export interface TrackingCheckpoint {
  id_event: number;
  id_ritase: number;
  kode_ritase: string;
  status: string;
  catatan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  durasi_detik?: number | null;
  created_at: string;
}
