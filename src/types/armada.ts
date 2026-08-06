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
  kode_seller?: string;
  nama_seller: string;
  alamat: string;
  kota: string;
  pic?: string;
  no_hp?: string;
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

/* ---------- Tipe sesuai API backend (skema DB) ---------- */

export interface Kendaraan {
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan?: string | null;
  kapasitas_kg?: number | null;
  status_kendaraan: string;
}

export interface DriverArmada {
  id_driver: number;
  nama_driver: string;
  no_hp?: string | null;
  status_driver: string;
  jenis_driver?: string | null; // tetap | kondisional
}

export interface Ritase {
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  id_driver: number;
  nama_driver: string;
  id_kendaraan: number;
  plat_nomor: string;
  // id_seller dihapus: skema DB pindahin relasi seller ke ritase_stop (bisa banyak seller).
  // nama_seller diisi backend (gabungan nama seller dari stops).
  nama_seller: string;
  id_drop_point: number;
  nama_drop_point: string;
  ritase_ke?: number | null;
  total_awb?: number | null;
  total_koli?: number | null;
  paket_tertinggal?: number | null;
  alasan_tertinggal?: string | null;
  jam_berangkat?: string | null;
  jam_tiba?: string | null;
  jam_mulai?: string | null;   // jadwal RIT mulai
  jam_selesai?: string | null; // jadwal RIT selesai
  status: string;
}

export interface RitaseStop {
  id_stop: number;
  id_ritase: number;
  urutan: number;
  jenis_stop: string; // gudang | seller | drop_point
  id_gudang?: number | null;
  nama_gudang?: string | null;
  tipe_gudang?: string | null;
  id_seller?: number | null;
  id_drop_point?: number | null;
  nama_seller?: string | null;
  nama_drop_point?: string | null;
  keterangan?: string | null;
}

export interface RitaseEvent {
  id_event: number;
  id_ritase: number;
  status: string;
  catatan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  durasi_detik?: number | null;
  created_at: string;
}

export interface RitaseDetail extends Ritase {
  events: RitaseEvent[];
  stops: RitaseStop[];
}
