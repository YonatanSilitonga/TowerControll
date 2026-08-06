// Tipe Seller — dari endpoint /sellers (master data pickup).
export interface Seller {
  id: number;
  code: string;
  name: string;
  address?: string;
  city?: string;
  pic?: string;
  no_hp?: string;
  latitude?: number;
  longitude?: number;
}