const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

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

/* ─────────────────────────────────────────────────────────────
 * LOCAL STORAGE MOCK FALLBACK (for mock mode or backend offline)
 * ───────────────────────────────────────────────────────────── */
function getStorage<T>(key: string, defaultData: T[]): T[] {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(`tc_admin_${key}`);
    if (!raw) {
      localStorage.setItem(`tc_admin_${key}`, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return defaultData;
  }
}

function setStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`tc_admin_${key}`, JSON.stringify(data));
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────────
 * TYPES & HANDLERS
 * ───────────────────────────────────────────────────────────── */

// ── Driver ──
export type DriverAdmin = {
  id_driver: number;
  nama_driver: string;
  no_hp?: string;
  no_sim?: string;
  jenis_sim?: string;
  jabatan?: string;
  status_driver: "aktif" | "nonaktif";
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultDrivers: DriverAdmin[] = [
  { id_driver: 1, nama_driver: "Budi Santoso", no_hp: "081234567890", no_sim: "810112345678", jenis_sim: "B1", status_driver: "aktif" },
  { id_driver: 2, nama_driver: "Agus Wijaya", no_hp: "081398765432", no_sim: "810298765432", jenis_sim: "B2", status_driver: "aktif" },
  { id_driver: 3, nama_driver: "Awaludin", no_hp: "082111112222", no_sim: "810312345679", jenis_sim: "A", status_driver: "aktif" },
  { id_driver: 4, nama_driver: "Slamet Riyadi", no_hp: "085733334444", no_sim: "810498765433", jenis_sim: "B1", status_driver: "nonaktif" },
];

export const adminDriver = {
  list: async (): Promise<DriverAdmin[]> => {
    if (isMock) return getStorage("drivers", defaultDrivers);
    try { return await adminFetch<DriverAdmin[]>("/admin/drivers"); }
    catch { return getStorage("drivers", defaultDrivers); }
  },
  create: async (data: Partial<DriverAdmin>) => {
    if (isMock) {
      const list = getStorage("drivers", defaultDrivers);
      const newObj: DriverAdmin = {
        id_driver: Date.now(),
        nama_driver: data.nama_driver || "Driver Baru",
        no_hp: data.no_hp || "",
        no_sim: data.no_sim || "",
        jenis_sim: data.jenis_sim || "A",
        status_driver: data.status_driver || "aktif",
      };
      setStorage("drivers", [newObj, ...list]);
      return { id_driver: newObj.id_driver };
    }
    return await adminFetch<{ id_driver: number }>("/admin/drivers", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: Partial<DriverAdmin>) => {
    if (isMock) {
      const list = getStorage("drivers", defaultDrivers);
      const updated = list.map((item) => item.id_driver === id ? { ...item, ...data } : item);
      setStorage("drivers", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("drivers", defaultDrivers);
      const updated = list.map((item) => item.id_driver === id ? { ...item, status_driver: "nonaktif" as const } : item);
      setStorage("drivers", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/drivers/${id}`, { method: "DELETE" });
  },
};

// ── Kendaraan ──
export type KendaraanAdmin = {
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan?: string;
  kapasitas_kg?: number;
  status_kendaraan: "aktif" | "maintenance" | "nonaktif";
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultVehicles: KendaraanAdmin[] = [
  { id_kendaraan: 1, plat_nomor: "B 1234 SLB", jenis_kendaraan: "Truk Box 6m", kapasitas_kg: 8000, status_kendaraan: "aktif" },
  { id_kendaraan: 2, plat_nomor: "B 5678 SLB", jenis_kendaraan: "Truk Box 6m", kapasitas_kg: 8000, status_kendaraan: "aktif" },
  { id_kendaraan: 3, plat_nomor: "B 9012 SLB", jenis_kendaraan: "Pickup Double", kapasitas_kg: 1500, status_kendaraan: "maintenance" },
  { id_kendaraan: 4, plat_nomor: "L 1122 SLB", jenis_kendaraan: "Truk Wingbox 8m", kapasitas_kg: 12000, status_kendaraan: "aktif" },
];

export const adminKendaraan = {
  list: async (): Promise<KendaraanAdmin[]> => {
    if (isMock) return getStorage("vehicles", defaultVehicles);
    try { return await adminFetch<KendaraanAdmin[]>("/admin/vehicles"); }
    catch { return getStorage("vehicles", defaultVehicles); }
  },
  create: async (data: Partial<KendaraanAdmin>) => {
    if (isMock) {
      const list = getStorage("vehicles", defaultVehicles);
      const newObj: KendaraanAdmin = {
        id_kendaraan: Date.now(),
        plat_nomor: (data.plat_nomor || "B 0000 XX").toUpperCase(),
        jenis_kendaraan: data.jenis_kendaraan || "Truk Box 6m",
        kapasitas_kg: data.kapasitas_kg || 5000,
        status_kendaraan: data.status_kendaraan || "aktif",
      };
      setStorage("vehicles", [newObj, ...list]);
      return { id_kendaraan: newObj.id_kendaraan };
    }
    return await adminFetch<{ id_kendaraan: number }>("/admin/vehicles", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: Partial<KendaraanAdmin>) => {
    if (isMock) {
      const list = getStorage("vehicles", defaultVehicles);
      const updated = list.map((item) => item.id_kendaraan === id ? { ...item, ...data } : item);
      setStorage("vehicles", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("vehicles", defaultVehicles);
      const updated = list.map((item) => item.id_kendaraan === id ? { ...item, status_kendaraan: "nonaktif" as const } : item);
      setStorage("vehicles", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/vehicles/${id}`, { method: "DELETE" });
  },
};

// ── Seller ──
export type SellerAdmin = {
  id_seller: number;
  kode_seller: string;
  nama_seller: string;
  alamat?: string;
  kota?: string;
  area?: string;
  pic?: string;
  no_hp?: string;
  forecast_harian?: number;
  status: "aktif" | "nonaktif";
  latitude?: number;
  longitude?: number;
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultSellers: SellerAdmin[] = [
  { id_seller: 1, kode_seller: "SLR-001", nama_seller: "Gudang Shopee Cikupa", alamat: "Kawasan Industri Cikupa Mas", kota: "Tangerang", area: "Banten", pic: "Hendra", no_hp: "081299887766", forecast_harian: 1500, status: "aktif", latitude: -6.2402, longitude: 106.5856 },
  { id_seller: 2, kode_seller: "SLR-002", nama_seller: "Tokopedia Hub Balaraja", alamat: "Jl. Raya Serang Km 24", kota: "Tangerang", area: "Banten", pic: "Dian", no_hp: "081344556677", forecast_harian: 2400, status: "aktif", latitude: -6.1836, longitude: 106.5952 },
  { id_seller: 3, kode_seller: "SLR-003", nama_seller: "Lazada Transit SKI", alamat: "Jl. Daan Mogot Km 11", kota: "Jakarta Barat", area: "DKI Jakarta", pic: "Roni", no_hp: "081711223344", forecast_harian: 900, status: "aktif", latitude: -6.1616, longitude: 106.6311 },
];

export const adminSeller = {
  list: async (): Promise<SellerAdmin[]> => {
    if (isMock) return getStorage("sellers", defaultSellers);
    try { return await adminFetch<SellerAdmin[]>("/admin/sellers"); }
    catch { return getStorage("sellers", defaultSellers); }
  },
  create: async (data: Partial<SellerAdmin>) => {
    const list = getStorage("sellers", defaultSellers);
    const generatedKode = data.kode_seller || `SLR-${String(list.length + 1).padStart(3, "0")}`;
    const newObj: SellerAdmin = {
      id_seller: Date.now(),
      kode_seller: generatedKode,
      nama_seller: data.nama_seller || "Seller Baru",
      alamat: data.alamat || "",
      kota: data.kota || "Tangerang",
      area: data.area || "Banten",
      pic: data.pic || "",
      no_hp: data.no_hp || "",
      forecast_harian: data.forecast_harian || 500,
      status: data.status || "aktif",
      latitude: data.latitude ?? -6.2,
      longitude: data.longitude ?? 106.8,
    };
    if (isMock) {
      setStorage("sellers", [newObj, ...list]);
      return { id_seller: newObj.id_seller };
    }
    return await adminFetch<{ id_seller: number }>("/admin/sellers", { method: "POST", body: JSON.stringify({ ...data, kode_seller: generatedKode }) });
  },
  update: async (id: number, data: Partial<SellerAdmin>) => {
    if (isMock) {
      const list = getStorage("sellers", defaultSellers);
      const updated = list.map((item) => item.id_seller === id ? { ...item, ...data } : item);
      setStorage("sellers", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/sellers/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("sellers", defaultSellers);
      const updated = list.map((item) => item.id_seller === id ? { ...item, status: "nonaktif" as const } : item);
      setStorage("sellers", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/sellers/${id}`, { method: "DELETE" });
  },
};

// ── DropPoint ──
export type DropPointAdmin = {
  id_drop_point: number;
  nama_drop_point: string;
  alamat?: string;
  latitude?: number;
  longitude?: number;
  status: "aktif" | "nonaktif";
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultDropPoints: DropPointAdmin[] = [
  { id_drop_point: 1, nama_drop_point: "TITIP AJA Gateway", alamat: "Kawasan Industri Bitung", latitude: -6.2100, longitude: 106.5500, status: "aktif" },
  { id_drop_point: 2, nama_drop_point: "SKI Hub Jakarta", alamat: "Jl. Raya Kebon Jeruk", latitude: -6.1900, longitude: 106.7700, status: "aktif" },
  { id_drop_point: 3, nama_drop_point: "Drop Point Serang Central", alamat: "Jl. Jendral Sudirman No 45", latitude: -6.1200, longitude: 106.1500, status: "aktif" },
];

export const adminDropPoint = {
  list: async (): Promise<DropPointAdmin[]> => {
    if (isMock) return getStorage("dropPoints", defaultDropPoints);
    try { return await adminFetch<DropPointAdmin[]>("/admin/drop-points"); }
    catch { return getStorage("dropPoints", defaultDropPoints); }
  },
  create: async (data: Partial<DropPointAdmin>) => {
    const list = getStorage("dropPoints", defaultDropPoints);
    const newObj: DropPointAdmin = {
      id_drop_point: Date.now(),
      nama_drop_point: data.nama_drop_point || "Drop Point Baru",
      alamat: data.alamat || "",
      latitude: data.latitude ?? -6.2,
      longitude: data.longitude ?? 106.8,
      status: data.status || "aktif",
    };
    if (isMock) {
      setStorage("dropPoints", [newObj, ...list]);
      return { id_drop_point: newObj.id_drop_point };
    }
    return await adminFetch<{ id_drop_point: number }>("/admin/drop-points", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: Partial<DropPointAdmin>) => {
    if (isMock) {
      const list = getStorage("dropPoints", defaultDropPoints);
      const updated = list.map((item) => item.id_drop_point === id ? { ...item, ...data } : item);
      setStorage("dropPoints", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/drop-points/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("dropPoints", defaultDropPoints);
      const updated = list.map((item) => item.id_drop_point === id ? { ...item, status: "nonaktif" as const } : item);
      setStorage("dropPoints", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/drop-points/${id}`, { method: "DELETE" });
  },
};

// ── User ──
export type UserAdmin = {
  id_user: number;
  username: string;
  name: string;
  role: string;
  id_driver?: number;
  is_active: boolean;
  status: string;
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultUsers: UserAdmin[] = [
  { id_user: 1, username: "admin", name: "Administrator System", role: "admin", is_active: true, status: "aktif" },
  { id_user: 2, username: "direktur", name: "Bapak Direktur", role: "direktur", is_active: true, status: "aktif" },
  { id_user: 3, username: "tower_control", name: "Tower Control", role: "tower_control", is_active: true, status: "aktif" },
  { id_user: 4, username: "driver1", name: "Budi Santoso", role: "driver", is_active: true, status: "aktif" },
];

export const adminUser = {
  list: async (): Promise<UserAdmin[]> => {
    if (isMock) return getStorage("users", defaultUsers);
    try { return await adminFetch<UserAdmin[]>("/admin/users"); }
    catch { return getStorage("users", defaultUsers); }
  },
  create: async (data: { username: string; password: string; name: string; role: string; id_driver?: number }) => {
    const list = getStorage("users", defaultUsers);
    const newObj: UserAdmin = {
      id_user: Date.now(),
      username: data.username,
      name: data.name,
      role: data.role,
      id_driver: data.id_driver,
      is_active: true,
      status: "aktif",
    };
    if (isMock) {
      setStorage("users", [newObj, ...list]);
      return { id_user: newObj.id_user };
    }
    return await adminFetch<{ id_user: number }>("/admin/users", { method: "POST", body: JSON.stringify(data) });
  },
  updateRole: async (id: number, role: string) => {
    if (isMock) {
      const list = getStorage("users", defaultUsers);
      const updated = list.map((item) => item.id_user === id ? { ...item, role } : item);
      setStorage("users", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
  },
  updateStatus: async (id: number, status: string) => {
    if (isMock) {
      const list = getStorage("users", defaultUsers);
      const updated = list.map((item) => item.id_user === id ? { ...item, status } : item);
      setStorage("users", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/users/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
  },
  resetPassword: async (id: number, newPassword: string) => {
    if (isMock) return { success: true };
    return await adminFetch<any>(`/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ new_password: newPassword }) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("users", defaultUsers);
      const updated = list.map((item) => item.id_user === id ? { ...item, is_active: false } : item);
      setStorage("users", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/users/${id}`, { method: "DELETE" });
  },
};

// ── Ritase & Jam Operasional ──
export type RitaseAdmin = {
  id_ritase: number;
  kode_ritase: string;
  tanggal: string;
  id_driver: number;
  nama_driver: string;
  id_kendaraan: number;
  plat_nomor: string;
  ritase_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  total_awb?: number;
  total_koli?: number;
  status: "Draf" | "Berjalan" | "Selesai" | "Batal";
};

const defaultRitase: RitaseAdmin[] = [
  { id_ritase: 101, kode_ritase: "RIT-20260827-001", tanggal: "2026-08-27", id_driver: 1, nama_driver: "Budi Santoso", id_kendaraan: 1, plat_nomor: "B 1234 SLB", ritase_ke: 1, jam_mulai: "07:30", jam_selesai: "12:00", total_awb: 340, total_koli: 520, status: "Berjalan" },
  { id_ritase: 102, kode_ritase: "RIT-20260827-002", tanggal: "2026-08-27", id_driver: 2, nama_driver: "Agus Wijaya", id_kendaraan: 2, plat_nomor: "B 5678 SLB", ritase_ke: 1, jam_mulai: "08:00", jam_selesai: "13:30", total_awb: 410, total_koli: 680, status: "Draf" },
  { id_ritase: 103, kode_ritase: "RIT-20260826-003", tanggal: "2026-08-26", id_driver: 3, nama_driver: "Awaludin", id_kendaraan: 4, plat_nomor: "L 1122 SLB", ritase_ke: 2, jam_mulai: "13:00", jam_selesai: "18:15", total_awb: 590, total_koli: 920, status: "Selesai" },
];

export const adminRitase = {
  list: async (): Promise<RitaseAdmin[]> => {
    if (isMock) return getStorage("ritase", defaultRitase);
    try { return await adminFetch<RitaseAdmin[]>("/admin/ritase"); }
    catch { return getStorage("ritase", defaultRitase); }
  },
  create: async (data: Partial<RitaseAdmin>) => {
    const list = getStorage("ritase", defaultRitase);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const generatedKode = data.kode_ritase || `RIT-${today}-${String(list.length + 1).padStart(3, "0")}`;
    
    const newObj: RitaseAdmin = {
      id_ritase: Date.now(),
      kode_ritase: generatedKode,
      tanggal: data.tanggal || new Date().toISOString().slice(0, 10),
      id_driver: data.id_driver || 1,
      nama_driver: data.nama_driver || "Driver",
      id_kendaraan: data.id_kendaraan || 1,
      plat_nomor: data.plat_nomor || "B 0000 XX",
      ritase_ke: data.ritase_ke || 1,
      jam_mulai: data.jam_mulai || "08:00",
      jam_selesai: data.jam_selesai || "14:00",
      total_awb: data.total_awb || 0,
      total_koli: data.total_koli || 0,
      status: data.status || "Draf",
    };

    if (isMock) {
      setStorage("ritase", [newObj, ...list]);
      return { id_ritase: newObj.id_ritase };
    }
    return await adminFetch<{ id_ritase: number }>("/admin/ritase", { method: "POST", body: JSON.stringify({ ...data, kode_ritase: generatedKode }) });
  },
  update: async (id: number, data: Partial<RitaseAdmin>) => {
    if (isMock) {
      const list = getStorage("ritase", defaultRitase);
      const updated = list.map((item) => item.id_ritase === id ? { ...item, ...data } : item);
      setStorage("ritase", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/ritase/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("ritase", defaultRitase);
      const updated = list.map((item) => item.id_ritase === id ? { ...item, status: "Batal" as const } : item);
      setStorage("ritase", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/ritase/${id}`, { method: "DELETE" });
  },
};
