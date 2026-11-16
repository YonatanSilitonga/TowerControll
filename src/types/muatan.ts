export interface MuatanRitSummary {
  ritase_ke: number;
  implan_awb: number;
  implan_hv: number;
  implan_entries: number;
  driver_pickup_awb: number;
  driver_pickup_hv: number;
  driver_pickup_entries: number;
  dropper_awb: number;
  dropper_hv: number;
  dropper_entries: number;
  total_awb: number;
  total_hv: number;
  total_entries: number;
}

export interface MuatanSummary {
  tanggal: string;
  rits: MuatanRitSummary[];
  total_awb: number;
  total_hv: number;
  total_entries: number;
}
