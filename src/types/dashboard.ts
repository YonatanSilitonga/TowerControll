/** Tipe data Dashboard — mengikuti bentuk API backend Go (skema DB). */

export interface DashboardSummary {
  // Armada
  total_kendaraan: number;
  armada_aktif: number;
  armada_selesai: number;
  armada_idle: number;
  /** Jumlah armada dengan GPS terbaru ≤ 5 menit. */
  armada_online: number;
  // Driver
  total_driver: number;
  driver_aktif: number;
  driver_libur: number;
  driver_telat: number;
  // Operasional
  total_ritase: number;
  ritase_aktif: number;
  ritase_selesai: number;
  ritase_hari_ini: number;
  total_awb: number;
  total_awb_hari_ini: number;
  total_koli: number;
  paket_tertinggal: number;
  // Lainnya
  total_seller: number;
  seller_terlayani: number;
  total_drop_point: number;
  total_karyawan: number;
  total_manpower: number;
  total_absensi: number;
  total_implant: number;
  total_tracking: number;
}

export interface DurasiAnalisis {
  rata_rata_loading: string;
  rata_rata_perjalanan: string;
  rata_rata_unloading: string;
  total_ritase_dihitung: number;
}

export interface Bottleneck {
  kategori: string;
  label: string;
  indikator: string;
  nilai: number;
}

export interface AlertAnomali {
  tingkat: "info" | "warning" | "critical";
  pesan: string;
  kategori: string;
  waktu: string;
}

export interface DashboardAnalisis {
  durasi: DurasiAnalisis | null;
  bottleneck: Bottleneck[] | null;
  alerts: AlertAnomali[] | null;
}