/** Tipe data untuk Dashboard Keseluruhan (sesuai desain aktual). */

export interface ManpowerEfektivitas {
  lokasi: string;
  total_awb: number;
  manpower: number;
  efektivitas: string; // contoh: "1116,1 AWB/pcs"
}

export interface PopKarungEfektivitas {
  lokasi: string;
  total_awb: number;
  total_koli: number;
  efektivitas: string; // contoh: "70 AWB/Karung"
}

export type DeliveryStatus =
  | "in_transit"
  | "loading"
  | "weather_delay"
  | "delivered";

export interface StatusPengiriman {
  id_kendaraan: string;
  driver: string;
  asal_gudang: string;
  tujuan: string;
  status: DeliveryStatus;
}

export interface TopGudang {
  nama: string;
  area: string;
  total: number;
}

export interface DashboardSummary {
  total_awb: number;
  total_seller: number;
  armada_aktif: number;
  armada_total: number;
  implant_aktif: number;
  implant_total: number;
  total_manpower: number;
  manpower_efektivitas: ManpowerEfektivitas[];
  pop_karung_efektivitas: PopKarungEfektivitas[];
  status_pengiriman: StatusPengiriman[];
  top_gudang: TopGudang[];
}
