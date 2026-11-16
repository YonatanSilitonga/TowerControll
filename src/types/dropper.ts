export interface DropperEntry {
  id: number;
  id_seller: number;
  kode_seller: string;
  nama_seller: string;
  jenis_ritase: string;
  ritase_ke: number;
  jumlah_awb: number;
  jumlah_awb_hv: number;
  catatan: string;
  tanggal: string;
  created_at: string;
}

export interface DropperInputItem {
  id_seller: number;
  ritase_ke: number;
  jumlah_awb: number;
  jumlah_awb_hv: number;
  catatan: string;
}

export interface DropperInputPayload {
  jenis_ritase: string;
  items: DropperInputItem[];
}
