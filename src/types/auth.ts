export type UserRole = "admin" | "developer" | "tower_control" | "direktur" | "driver" | "koor_gudang" | "driver_pickup";

export interface User {
  id_user: number;
  username: string;
  name: string;
  role: UserRole;
  karyawan_id?: number | null;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}