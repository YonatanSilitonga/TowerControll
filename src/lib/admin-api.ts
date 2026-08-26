const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

async function adminFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = (() => {
    try {
      const raw = localStorage.getItem("tower-control-auth");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state?.token ?? null;
    } catch { return null; }
  })();

  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

function toQuery(params: Record<string, string | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) s.set(k, v);
  }
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

// ── Driver ──
export type DriverAdmin = { id_driver: number; nama_driver: string; no_hp?: string; no_sim?: string; jenis_sim?: string; status_driver: string };
export const adminDriver = {
  list: () => adminFetch<DriverAdmin[]>("/admin/drivers"),
  create: (data: Partial<DriverAdmin>) => adminFetch<{ id_driver: number }>("/admin/drivers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<DriverAdmin>) => adminFetch<any>(`/admin/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => adminFetch<any>(`/admin/drivers/${id}`, { method: "DELETE" }),
};

// ── Kendaraan ──
export type KendaraanAdmin = { id_kendaraan: number; plat_nomor: string; jenis_kendaraan?: string; kapasitas_kg?: number; status_kendaraan: string };
export const adminKendaraan = {
  list: () => adminFetch<KendaraanAdmin[]>("/admin/vehicles"),
  create: (data: Partial<KendaraanAdmin>) => adminFetch<{ id_kendaraan: number }>("/admin/vehicles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<KendaraanAdmin>) => adminFetch<any>(`/admin/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => adminFetch<any>(`/admin/vehicles/${id}`, { method: "DELETE" }),
};

// ── Seller ──
export type SellerAdmin = { id_seller: number; kode_seller: string; nama_seller: string; alamat?: string; kota?: string; area?: string; pic?: string; no_hp?: string; forecast_harian?: number; status: string; latitude?: number; longitude?: number };
export const adminSeller = {
  list: () => adminFetch<SellerAdmin[]>("/admin/sellers"),
  create: (data: Partial<SellerAdmin>) => adminFetch<{ id_seller: number }>("/admin/sellers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<SellerAdmin>) => adminFetch<any>(`/admin/sellers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => adminFetch<any>(`/admin/sellers/${id}`, { method: "DELETE" }),
};

// ── Gudang ──
export type GudangAdmin = { id_gudang: number; nama_gudang: string; alamat?: string; kota?: string; latitude?: number; longitude?: number; status: string };
export const adminGudang = {
  list: () => adminFetch<GudangAdmin[]>("/admin/gudang"),
  create: (data: Partial<GudangAdmin>) => adminFetch<{ id_gudang: number }>("/admin/gudang", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<GudangAdmin>) => adminFetch<any>(`/admin/gudang/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => adminFetch<any>(`/admin/gudang/${id}`, { method: "DELETE" }),
};

// ── User ──
export type UserAdmin = { id_user: number; username: string; name: string; role: string; karyawan_id?: number; is_active: boolean };
export const adminUser = {
  list: () => adminFetch<UserAdmin[]>("/admin/users"),
  create: (data: { username: string; password: string; name: string; role: string; karyawan_id?: number }) =>
    adminFetch<{ id_user: number }>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateRole: (id: number, role: string) => adminFetch<any>(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  resetPassword: (id: number, newPassword: string) => adminFetch<any>(`/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ new_password: newPassword }) }),
  delete: (id: number) => adminFetch<any>(`/admin/users/${id}`, { method: "DELETE" }),
};

// ── DropPoint ──
export type DropPointAdmin = { id_drop_point: number; nama_drop_point: string; alamat?: string; latitude?: number; longitude?: number; status: string };
export const adminDropPoint = {
  list: () => adminFetch<DropPointAdmin[]>("/admin/drop-points"),
  create: (data: Partial<DropPointAdmin>) => adminFetch<{ id_drop_point: number }>("/admin/drop-points", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<DropPointAdmin>) => adminFetch<any>(`/admin/drop-points/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => adminFetch<any>(`/admin/drop-points/${id}`, { method: "DELETE" }),
};
