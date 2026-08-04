/**
 * Mock data — sesuai desain aktual dashboard.
 * Data contoh realistis domain ekspedisi/logistik Indonesia.
 */

import type { Driver, Fleet, Trip, Vehicle } from "@/types/armada";
import type { DashboardSummary } from "@/types/dashboard";

const NOW = Date.now();
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

/* ------------------------------------------------------------------ */
/* Armada                                                              */
/* ------------------------------------------------------------------ */

export const mockFleets: Fleet[] = [
  { id: "flt-001", kode: "PL-1", nama: "Gudang Jakarta", lokasi: "Jakarta Timur", status: "active", created_at: ago(60 * 24 * 90), updated_at: ago(60 * 24) },
  { id: "flt-002", kode: "PL-2", nama: "Gudang Surabaya", lokasi: "Surabaya", status: "active", created_at: ago(60 * 24 * 85), updated_at: ago(60 * 24) },
  { id: "flt-003", kode: "PL-3", nama: "Gudang Medan", lokasi: "Medan", status: "inactive", created_at: ago(60 * 24 * 70), updated_at: ago(60 * 24) },
];

export const mockVehicles: Vehicle[] = [
  { id: "veh-001", plat: "B 1234 SLB", tipe: "Truk Box 6m", kapasitas_kg: 8000, fleet_id: "flt-001", status: "in_transit" },
  { id: "veh-002", plat: "B 5678 SLB", tipe: "Truk Box 6m", kapasitas_kg: 8000, fleet_id: "flt-001", status: "available" },
  { id: "veh-003", plat: "B 9012 SLB", tipe: "Pickup Double", kapasitas_kg: 1500, fleet_id: "flt-001", status: "maintenance" },
  { id: "veh-004", plat: "B 3456 SLB", tipe: "Truk Wingbox 8m", kapasitas_kg: 12000, fleet_id: "flt-001", status: "available" },
  { id: "veh-005", plat: "L 1122 SLB", tipe: "Truk Box 6m", kapasitas_kg: 8000, fleet_id: "flt-002", status: "in_transit" },
  { id: "veh-006", plat: "L 3344 SLB", tipe: "Pickup Double", kapasitas_kg: 1500, fleet_id: "flt-002", status: "available" },
  { id: "veh-007", plat: "L 5566 SLB", tipe: "Truk Tronton", kapasitas_kg: 20000, fleet_id: "flt-002", status: "off" },
  { id: "veh-008", plat: "BK 7788 SLB", tipe: "Truk Box 6m", kapasitas_kg: 8000, fleet_id: "flt-003", status: "available" },
];

export const mockDrivers: Driver[] = [
  { id: "drv-001", nama: "Budi Santoso", nik: "3171010101900001", no_sim: "810112345678", telepon: "0812-3456-7890", fleet_id: "flt-001", status: "on_duty" },
  { id: "drv-002", nama: "Agus Wijaya", nik: "3171010202900002", no_sim: "810298765432", telepon: "0813-9876-5432", fleet_id: "flt-001", status: "on_duty" },
  { id: "drv-003", nama: "Rudi Hartono", nik: "3171010303910003", no_sim: "810312345679", telepon: "0821-1111-2222", fleet_id: "flt-001", status: "off" },
  { id: "drv-004", nama: "Slamet Riyadi", nik: "3578010404920004", no_sim: "810498765433", telepon: "0857-3333-4444", fleet_id: "flt-002", status: "on_duty" },
  { id: "drv-005", nama: "Dedi Kurniawan", nik: "3578010505930005", no_sim: "810512345680", telepon: "0811-5555-6666", fleet_id: "flt-002", status: "on_duty" },
  { id: "drv-006", nama: "Hendra Gunawan", nik: "1271010606940006", no_sim: "810698765434", telepon: "0822-7777-8888", fleet_id: "flt-003", status: "off" },
];

export const mockTrips: Trip[] = [
  { id: "trp-001", kode: "TRP-0001", vehicle_id: "veh-001", driver_id: "drv-001", asal: "Jakarta", tujuan: "Surabaya", jarak_km: 780, status: "in_progress", started_at: ago(60 * 5), completed_at: null },
  { id: "trp-002", kode: "TRP-0002", vehicle_id: "veh-002", driver_id: "drv-002", asal: "Jakarta", tujuan: "Bandung", jarak_km: 150, status: "completed", started_at: ago(60 * 26), completed_at: ago(60 * 22) },
  { id: "trp-003", kode: "TRP-0003", vehicle_id: "veh-005", driver_id: "drv-004", asal: "Surabaya", tujuan: "Malang", jarak_km: 90, status: "in_progress", started_at: ago(60 * 2), completed_at: null },
  { id: "trp-004", kode: "TRP-0004", vehicle_id: "veh-006", driver_id: "drv-005", asal: "Surabaya", tujuan: "Semarang", jarak_km: 320, status: "planned", started_at: null, completed_at: null },
  { id: "trp-005", kode: "TRP-0005", vehicle_id: "veh-004", driver_id: "drv-003", asal: "Jakarta", tujuan: "Yogyakarta", jarak_km: 540, status: "cancelled", started_at: null, completed_at: null },
  { id: "trp-006", kode: "TRP-0006", vehicle_id: "veh-008", driver_id: "drv-006", asal: "Medan", tujuan: "Pekanbaru", jarak_km: 560, status: "completed", started_at: ago(60 * 50), completed_at: ago(60 * 30) },
];

/* ------------------------------------------------------------------ */
/* Dashboard Keseluruhan (sesuai desain aktual)                        */
/* ------------------------------------------------------------------ */

export const mockDashboard: DashboardSummary = {
  // Armada
  total_kendaraan: 15,
  armada_aktif: 11,
  armada_selesai: 2,
  armada_idle: 2,
  // Driver
  total_driver: 16,
  driver_aktif: 10,
  driver_libur: 6,
  driver_telat: 1,
  // Operasional
  total_ritase: 24,
  ritase_aktif: 11,
  ritase_selesai: 13,
  ritase_hari_ini: 8,
  total_awb: 54058,
  total_awb_hari_ini: 12000,
  total_koli: 475,
  paket_tertinggal: 12,
  // Lainnya
  total_seller: 20,
  seller_terlayani: 18,
  total_drop_point: 3,
  total_karyawan: 400,
  total_manpower: 400,
  total_absensi: 15,
  total_implant: 40,
  total_tracking: 11,
};
