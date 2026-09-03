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

export interface CheckpointAggregated {
  waktu: string;
  lat: number;
  lng: number;
  durasi_berhenti_detik: number;
  tipe_checkpoint: "seller" | "gudang" | "drop_point" | "lintas_wilayah" | "persinggahan";
  label: string;
  keterangan?: string;
  total_koli_sampai?: number;
  total_ecer_sampai?: number;
}

export interface AdminRitaseStop {
  id_stop: number;
  urutan: number;
  jenis_stop: string;
  id_seller?: number | null;
  id_drop_point?: number | null;
  id_gudang?: number | null;
  keterangan?: string | null;
  nama_lokasi: string;
  jumlah_koli?: number | null;
  jumlah_ecer?: number | null;
  jumlah_high_value?: number | null;
  durasi_detik?: number | null;
  foto_manifest_url?: string | null;
}

export interface AdminRitaseItem {
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  id_driver: number;
  nama_driver: string;
  jabatan_driver: string;
  id_kendaraan: number;
  nopol: string;
  id_drop_point: number;
  nama_drop_point: string;
  ritase_ke: number;
  status: string;
  jenis_ritase?: string; // "outgoing" | "incoming"
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  jam_berangkat?: string | null;
  jam_tiba?: string | null;
  total_koli?: number | null;
  total_eceran?: number | null;
  total_high_value?: number | null;
  stops: AdminRitaseStop[];
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_by_name?: string;
  updated_by_name?: string;
}

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
  /** Nama lokasi terakhir dari app driver (mis. "Gateway SEG"). */
  nama_lokasi?: string | null;
  /** Ritase yang sedang berjalan (kalau ada) — buat rute live armada. */
  id_ritase?: number | null;
  /** Status ritase dari tabel ritase (direncanakan/berjalan/selesai). */
  /** Tanggal ritase (YYYY-MM-DD) � perlu untuk cek expired yang benar. */
  tanggal?: string | null;
  status_ritase?: string | null;
  /** Jam mulai & selesai ritase (HH:MM:SS) dari backend. */
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  /** Kode & muatan ritase aktif (kalau ada) — dari backend tracking live. */
  kode_ritase?: string;
  total_awb?: number | null;
  total_koli?: number | null;
  total_high_value?: number | null;
  total_eceran?: number | null;
  last_update: string;
  /** Backend: true kalau last_update > ambang offline (default 15 mnt). */
  offline?: boolean;
  /** Backend: true kalau driver belum logout (session aktif) — background/screen-off tetap Online. */
  session_online?: boolean;
  /** Backend: kapan terakhir driver login ke app (telemetry). */
  last_login?: string | null;
  /** Backend: kapan terakhir app mobile dibuka (telemetry). */
  last_open?: string | null;
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
  /** Jarak tempuh (jalan) dari GUDANG OUTGOING ke seller, km. Diisi backend sekali. */
  jarak_tempuh_km?: number | null;
  /** Jarak tempuh (jalan) dari GUDANG DC (Buaran Indah) ke seller, km. */
  jarak_dc_km?: number | null;
}

export interface TrackingMap {
  vehicles: TrackingVehicle[];
  sellers: SellerLocation[];
  /** Posisi gudang (Outgoing/Incoming=DC) — dinamis dari backend. */
  gudang?: GudangPoint[];
  /** Posisi drop point (Gateway JKT/SEG) — dinamis dari backend. */
  drop_points?: DropPointPoi[];
}

export interface DropPointPoi {
  id_drop_point: number;
  kode_dp?: string;
  nama_drop_point?: string;
  latitude: number;
  longitude: number;
  /** Jarak tempuh (jalan) dari GUDANG OUTGOING ke drop point, km. */
  jarak_tempuh_km?: number | null;
  /** Jarak tempuh (jalan) dari GUDANG DC ke drop point, km. */
  jarak_dc_km?: number | null;
}

export interface GudangPoint {
  id_gudang: number;
  nama_gudang: string;
  /** outgoing | incoming (incoming = DC) */
  tipe: string;
  latitude: number;
  longitude: number;
}

export interface TrackingCheckpoint {
  id_event: number;
  id_ritase: number;
  kode_ritase: string;
  status: string;
  catatan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nama_lokasi?: string | null;
  durasi_detik?: number | null;
  jumlah_koli?: number | null;
  jumlah_ecer?: number | null;
  jumlah_high_value?: number | null;
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
  /** Kendaraan terakhir yang dia track (lagi nyetir apa). */
  plat_nomor?: string | null;
  /** id kendaraan terakhir yang dia track. */
  id_kendaraan?: number | null;
  /** true kalau posisi terakhir masih segar (≤ ambang offline) — sedang aktif. */
  tracking_fresh?: boolean;
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
  jenis_ritase?: string; // "outgoing" | "incoming"
  total_awb?: number | null;
  total_koli?: number | null;
  /** Muatan dari ritase_event: high value & eceran (pcs). */
  total_high_value?: number | null;
  total_eceran?: number | null;
  paket_tertinggal?: number | null;
  alasan_tertinggal?: string | null;
  jam_berangkat?: string | null;
  jam_tiba?: string | null;
  jam_mulai?: string | null;   // jadwal RIT mulai
  jam_selesai?: string | null; // jadwal RIT selesai
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
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
  latitude?: number | null;
  longitude?: number | null;
  jumlah_koli?: number | null;
  jumlah_ecer?: number | null;
  jumlah_high_value?: number | null;
  durasi_detik?: number | null;
  foto_manifest_url?: string | null;
}

export interface RitaseEvent {
  id_event: number;
  id_ritase: number;
  status: string;
  catatan?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nama_lokasi?: string | null;
  durasi_detik?: number | null;
  jumlah_koli?: number | null;
  jumlah_ecer?: number | null;
  jumlah_high_value?: number | null;
  created_at: string;
}

export interface RitaseDetail extends Ritase {
  events: RitaseEvent[];
  stops: RitaseStop[];
}

export interface ManifestPhotoItem {
  id_event: number;
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  ritase_ke: number;
  id_driver: number;
  nama_driver: string;
  jabatan_driver: string;
  id_kendaraan: number;
  nopol: string;
  jenis_kendaraan: string;
  nama_lokasi: string;
  status: string;
  jumlah_koli: number;
  jumlah_ecer: number;
  jumlah_high_value: number;
  durasi_detik: number;
  foto_manifest_url: string;
  created_at: string;
}
