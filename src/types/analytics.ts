/**
 * Modul Analitik — tipe response dari endpoint /dashboard/analytics/*.
 * Hari = tanggal JADWAL ritase (ritase.tanggal), bukan tanggal event aktual.
 */

export interface TrendPoint {
  tanggal: string; // YYYY-MM-DD
  ritase_total: number;
  ritase_selesai: number;
  ritase_batal: number;
  total_awb: number;
  total_koli: number;
  seller_terlayani: number;
  /** Ritase yang drop point/gateway-nya JKT (outgoing). */
  outgoing: number;
  /** Ritase yang drop point/gateway-nya SEG (incoming). */
  incoming: number;
}

export interface DriverPerformance {
  id_driver: number;
  nama_driver: string;
  ritase_total: number;
  ritase_selesai: number;
  total_awb: number;
  total_koli: number;
  paket_tertinggal: number;
  outgoing: number;
  incoming: number;
  /** Detik; null = belum ada data event. */
  rata_loading?: number | null;
  rata_perjalanan?: number | null;
  rata_unloading?: number | null;
}

export interface SellerAnalytics {
  id_seller: number;
  kode_seller: string;
  nama_seller: string;
  kota: string;
  jarak_tempuh_km?: number | null;
  jarak_dc_km?: number | null;
  kunjungan: number;
  ritase_selesai: number;
  total_awb: number;
  total_koli: number;
  /** Detik (sampai_seller → berangkat_seller); null = belum ada data. */
  rata_bongkar?: number | null;
}
