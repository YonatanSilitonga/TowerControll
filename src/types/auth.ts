export type UserRole = "admin" | "kapten" | "direktur" | "driver";

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