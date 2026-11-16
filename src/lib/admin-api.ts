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
      "X-Client-Platform": "web",
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * LOCAL STORAGE MOCK FALLBACK (for mock mode or backend offline)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * TYPES & HANDLERS
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

// â”€â”€ Driver â”€â”€
export type DriverAdmin = {
  id_driver: number;
  nama_driver: string;
  no_hp?: string;
  no_sim?: string;
  jenis_sim?: string;
  jabatan?: string;
  tipe_driver?: "reguler" | "pickup";
  status_driver: "aktif" | "nonaktif";
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultDrivers: DriverAdmin[] = [
  { id_driver: 1, nama_driver: "Budi Santoso", no_hp: "6281234567890", no_sim: "810112345678", jenis_sim: "B1", status_driver: "aktif" },
  { id_driver: 2, nama_driver: "Agus Wijaya", no_hp: "6281398765432", no_sim: "810298765432", jenis_sim: "B2", status_driver: "aktif" },
  { id_driver: 3, nama_driver: "Awaludin", no_hp: "628211112222", no_sim: "810312345679", jenis_sim: "A", status_driver: "aktif" },
  { id_driver: 4, nama_driver: "Slamet Riyadi", no_hp: "6285733334444", no_sim: "810498765433", jenis_sim: "B1", status_driver: "nonaktif" },
];

export const adminDriver = {
  list: async (): Promise<DriverAdmin[]> => {
    if (isMock) return getStorage("drivers", defaultDrivers);
    try { return await adminFetch<DriverAdmin[]>("/admin/drivers"); }
    catch { return getStorage("drivers", defaultDrivers); }
  },
  create: async (data: Partial<DriverAdmin>) => {
    const payload = {
      ...data,
      no_sim: data.no_sim && data.no_sim.trim() ? data.no_sim.trim() : null,
      no_hp: data.no_hp ? data.no_hp.replace(/[- ]/g, "").replace(/^\+/, "").trim() || null : null,
      jabatan: data.jabatan && data.jabatan.trim() ? data.jabatan.trim() : null,
      jenis_sim: data.jenis_sim || null,
    };
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
    return await adminFetch<{ id_driver: number }>("/admin/drivers", { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id: number, data: Partial<DriverAdmin>) => {
    const payload = {
      ...data,
      no_sim: data.no_sim && data.no_sim.trim() ? data.no_sim.trim() : null,
      no_hp: data.no_hp ? data.no_hp.replace(/[- ]/g, "").replace(/^\+/, "").trim() || null : null,
      jabatan: data.jabatan && data.jabatan.trim() ? data.jabatan.trim() : null,
      jenis_sim: data.jenis_sim || null,
    };
    if (isMock) {
      const list = getStorage("drivers", defaultDrivers);
      const updated = list.map((item) => item.id_driver === id ? { ...item, ...data } : item);
      setStorage("drivers", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/drivers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
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

// â”€â”€ Kendaraan â”€â”€
export type KendaraanAdmin = {
  id_kendaraan: number;
  plat_nomor: string;
  jenis_kendaraan?: string;
  kapasitas_kg?: number;
  kapasitas_koli?: number;
  status_kendaraan: "aktif" | "maintenance" | "nonaktif";
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultVehicles: KendaraanAdmin[] = [
  { id_kendaraan: 1, plat_nomor: "B 1234 SLB", jenis_kendaraan: "CDDL", kapasitas_kg: 7000, kapasitas_koli: 60, status_kendaraan: "aktif" },
  { id_kendaraan: 2, plat_nomor: "B 5678 SLB", jenis_kendaraan: "CDD", kapasitas_kg: 6000, kapasitas_koli: 50, status_kendaraan: "aktif" },
  { id_kendaraan: 3, plat_nomor: "B 9012 SLB", jenis_kendaraan: "CDE", kapasitas_kg: 4500, kapasitas_koli: 40, status_kendaraan: "maintenance" },
  { id_kendaraan: 4, plat_nomor: "L 1122 SLB", jenis_kendaraan: "BV", kapasitas_kg: 3000, kapasitas_koli: 10, status_kendaraan: "aktif" },
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
        jenis_kendaraan: data.jenis_kendaraan || "CDDL",
        kapasitas_kg: data.kapasitas_kg || 7000,
        kapasitas_koli: data.kapasitas_koli || 0,
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

// â”€â”€ Seller â”€â”€
export type SellerAdmin = {
  id_seller: number;
  kode_seller: string;
  nama_seller: string;
  alamat?: string | null;
  kota?: string | null;
  area?: string | null;
  pic?: string;
  no_hp?: string;
  forecast_harian?: number;
  status: "aktif" | "nonaktif";
  is_dropper?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

const defaultSellers: SellerAdmin[] = [
  { id_seller: 1, kode_seller: "SLR-001", nama_seller: "Gudang Shopee Cikupa", alamat: "Kawasan Industri Cikupa Mas", kota: "Tangerang", area: "Banten", pic: "Hendra", no_hp: "6281299887766", forecast_harian: 1500, status: "aktif", latitude: -6.2402, longitude: 106.5856 },
  { id_seller: 2, kode_seller: "SLR-002", nama_seller: "Tokopedia Hub Balaraja", alamat: "Jl. Raya Serang Km 24", kota: "Tangerang", area: "Banten", pic: "Dian", no_hp: "6281344556677", forecast_harian: 2400, status: "aktif", latitude: -6.1836, longitude: 106.5952 },
  { id_seller: 3, kode_seller: "SLR-003", nama_seller: "Lazada Transit SKI", alamat: "Jl. Daan Mogot Km 11", kota: "Jakarta Barat", area: "DKI Jakarta", pic: "Roni", no_hp: "6281711223344", forecast_harian: 900, status: "aktif", latitude: -6.1616, longitude: 106.6311 },
];

export const adminSeller = {
  list: async (): Promise<SellerAdmin[]> => {
    if (isMock) return getStorage("sellers", defaultSellers);
    try { return await adminFetch<SellerAdmin[]>("/admin/sellers"); }
    catch { return getStorage("sellers", defaultSellers); }
  },
  create: async (data: Partial<SellerAdmin>) => {
    const isDropper = toBool(data.is_dropper);
    const list = getStorage("sellers", defaultSellers);
    const cleanKode =
      (data.kode_seller || "").trim().toUpperCase() ||
      `SLR-${String(list.length + 1).padStart(3, "0")}`;
    const newObj: SellerAdmin = {
      id_seller: Date.now(),
      kode_seller: cleanKode,
      nama_seller: data.nama_seller || "Seller Baru",
      alamat: isDropper ? null : (data.alamat || ""),
      kota: isDropper ? null : (data.kota || "Tangerang"),
      area: isDropper ? null : (data.area || "Banten"),
      pic: data.pic || "",
      no_hp: data.no_hp || "",
      forecast_harian: data.forecast_harian || 500,
      status: data.status || "aktif",
      is_dropper: isDropper,
      latitude: isDropper ? null : (data.latitude ?? -6.2),
      longitude: isDropper ? null : (data.longitude ?? 106.8),
    };
    if (isMock) {
      setStorage("sellers", [newObj, ...list]);
      return { id_seller: newObj.id_seller };
    }
    return await adminFetch<{ id_seller: number }>("/admin/sellers", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        kode_seller: cleanKode,
        is_dropper: isDropper,
        ...(isDropper ? { alamat: null, kota: null, area: null, latitude: null, longitude: null } : {}),
      }),
    });
  },
  update: async (id: number, data: Partial<SellerAdmin>) => {
    const isDropper = data.is_dropper === undefined ? undefined : toBool(data.is_dropper);
    const normalized = {
      ...data,
      ...(isDropper === undefined ? {} : { is_dropper: isDropper }),
      ...(isDropper === true ? { alamat: null, kota: null, area: null, latitude: null, longitude: null } : {}),
    };
    if (isMock) {
      const list = getStorage("sellers", defaultSellers);
      const updated = list.map((item) => item.id_seller === id ? { ...item, ...normalized } : item);
      setStorage("sellers", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/sellers/${id}`, {
      method: "PUT",
      body: JSON.stringify(normalized),
    });
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

// â”€â”€ Implant (master lokasi implant, terpisah dari seller; PIC = kapten) â”€â”€
export type ImplantAdmin = {
  id_implant: number;
  kode_implant: string;
  nama_implant: string;
  alamat?: string;
  kota?: string;
  area?: string;
  no_hp?: string;
  jam_mulai_pickup?: string;
  jam_selesai_pickup?: string;
  forecast_harian?: number;
  status: "aktif" | "nonaktif";
  latitude?: number;
  longitude?: number;
  jarak_tempuh_km?: number;
  jarak_dc_km?: number;
  jumlah_manpower?: number;
  created_at?: string;
  updated_at?: string;
};

export const adminImplant = {
  list: async (): Promise<ImplantAdmin[]> => {
    try { return await adminFetch<ImplantAdmin[]>("/admin/implants"); }
    catch { return []; }
  },
  get: async (id: number): Promise<ImplantAdmin> => {
    return await adminFetch<ImplantAdmin>(`/admin/implants/${id}`);
  },
  create: async (data: Partial<ImplantAdmin>) => {
    const generatedKode = data.kode_implant || `IMP-${Date.now().toString().slice(-6)}`;
    return await adminFetch<{ id_implant: number }>("/admin/implants", { method: "POST", body: JSON.stringify({ ...data, kode_implant: generatedKode }) });
  },
  update: async (id: number, data: Partial<ImplantAdmin>) => {
    return await adminFetch<any>(`/admin/implants/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    return await adminFetch<any>(`/admin/implants/${id}`, { method: "DELETE" });
  },
};

// â”€â”€ DropPoint â”€â”€
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

// â”€â”€ Gudang â”€â”€
export type GudangAdmin = {
  id_gudang: number;
  nama_gudang: string;
  alamat?: string | null;
  kota?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: "aktif" | "nonaktif";
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

const defaultGudang: GudangAdmin[] = [
  { id_gudang: 1, nama_gudang: "Gudang Outgoing", alamat: "Kawasan Industri Bitung", kota: "Tangerang", latitude: -6.2100, longitude: 106.5500, status: "aktif" },
  { id_gudang: 2, nama_gudang: "Gudang Incoming", alamat: "Buaran Indah", kota: "Tangerang", latitude: -6.1900, longitude: 106.6300, status: "aktif" },
];

export const adminGudang = {
  list: async (): Promise<GudangAdmin[]> => {
    if (isMock) return getStorage("gudang", defaultGudang);
    try { return await adminFetch<GudangAdmin[]>("/admin/gudang"); }
    catch { return getStorage("gudang", defaultGudang); }
  },
  create: async (data: Partial<GudangAdmin>) => {
    if (isMock) {
      const list = getStorage("gudang", defaultGudang);
      const newObj: GudangAdmin = {
        id_gudang: Date.now(),
        nama_gudang: data.nama_gudang || "Gudang Baru",
        alamat: data.alamat || "",
        kota: data.kota || "",
        latitude: data.latitude ?? -6.2,
        longitude: data.longitude ?? 106.8,
        status: data.status || "aktif",
      };
      setStorage("gudang", [newObj, ...list]);
      return { id_gudang: newObj.id_gudang };
    }
    return await adminFetch<{ id_gudang: number }>("/admin/gudang", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: Partial<GudangAdmin>) => {
    if (isMock) {
      const list = getStorage("gudang", defaultGudang);
      const updated = list.map((item) => item.id_gudang === id ? { ...item, ...data } : item);
      setStorage("gudang", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/gudang/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("gudang", defaultGudang);
      const updated = list.map((item) => item.id_gudang === id ? { ...item, status: "nonaktif" as const } : item);
      setStorage("gudang", updated);
      return { success: true };
    }
    return await adminFetch<any>(`/admin/gudang/${id}`, { method: "DELETE" });
  },
};

// â”€â”€ User â”€â”€
export type UserAdmin = {
  id_user: number;
  username: string;
  name: string;
  role: string;
  id_driver?: number;
  karyawan_id?: number;
  id_koor_gudang?: number;
  must_set_password?: boolean;
  is_active: boolean;
  status: string;
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

export type LinkableActor = {
  id: number;
  nama: string;
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
  available: async (role: string): Promise<LinkableActor[]> => {
    if (isMock) return [];
    try { return await adminFetch<LinkableActor[]>(`/admin/users/available?role=${encodeURIComponent(role)}`); }
    catch { return []; }
  },
  create: async (data: {
    username: string;
    password: string;
    role: string;
    id_driver?: number;
    karyawan_id?: number;
    id_koor_gudang?: number;
    kapten_user_id?: number;
  }) => {
    const list = getStorage("users", defaultUsers);
    if (isMock) {
      const newObj: UserAdmin = {
        id_user: Date.now(),
        username: data.username,
        name: "",
        role: data.role,
        id_driver: data.id_driver,
        karyawan_id: data.karyawan_id,
        id_koor_gudang: data.id_koor_gudang,
        is_active: true,
        status: "aktif",
      };
      setStorage("users", [newObj, ...list]);
      return { id_user: newObj.id_user, username: data.username };
    }
    return await adminFetch<{ id_user: number; username: string }>("/admin/users", { method: "POST", body: JSON.stringify(data) });
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

// â”€â”€ Kapten (profil kapten implant + akun login) â”€â”€
export type KaptenSellerRef = {
  id_seller: number;
  kode_seller?: string;
  nama_seller: string;
};

export type KaptenImplantRef = {
  id_implant: number;
  kode_implant?: string;
  nama_implant: string;
  peran?: string;
  id_titik_implant?: number;
  nama_titik_implant?: string;
};

export type KaptenAdmin = {
  id_kapten: number;
  id_user?: number | null;
  username?: string;
  nama: string;
  no_hp?: string;
  status: "aktif" | "nonaktif";
  sellers?: KaptenSellerRef[];
  implants?: KaptenImplantRef[];
  created_at?: string;
  created_by?: number;
  created_by_name?: string;
  updated_at?: string;
  updated_by?: number;
  updated_by_name?: string;
};

export type KaptenCreated = {
  id_kapten: number;
  id_user: number;
  username: string;
  password_awal: string;
  seller_count: number;
  implant_count?: number;
};

export const adminKapten = {
  list: async (): Promise<KaptenAdmin[]> => {
    try { return await adminFetch<KaptenAdmin[]>("/admin/kapten"); }
    catch { return []; }
  },
  get: async (id: number): Promise<KaptenAdmin> => {
    return await adminFetch<KaptenAdmin>(`/admin/kapten/${id}`);
  },
  create: async (data: { nama: string; no_hp?: string; status?: string; username?: string; password?: string; seller_ids?: number[]; implant_ids?: number[]; implant_peran?: Record<number, string>; implant_titik?: Record<number, number> }): Promise<KaptenCreated> => {
    return await adminFetch<KaptenCreated>("/admin/kapten", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: { nama: string; no_hp?: string; status?: string; seller_ids?: number[]; implant_ids?: number[]; implant_peran?: Record<number, string>; implant_titik?: Record<number, number> }) => {
    return await adminFetch<any>(`/admin/kapten/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    return await adminFetch<any>(`/admin/kapten/${id}`, { method: "DELETE" });
  },
};

// â”€â”€ Ritase & Jam Operasional â”€â”€
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

// ── Karyawan (master pegawai kantor) ──
export type KaryawanAdmin = {
  id_karyawan: number;
  nik?: string;
  nama: string;
  jabatan?: string;
  penempatan?: string;
  tempat_penugasan?: string;
  shift?: string;
  peran: string;
  status: "aktif" | "nonaktif";
  id_user?: number;
};

export type KaryawanInput = {
  nik?: string;
  nama: string;
  jabatan?: string;
  penempatan?: string;
  tempat_penugasan?: string;
  shift?: string;
  peran: string;
  status: "aktif" | "nonaktif";
};

export const adminKaryawan = {
  list: async (peran?: string): Promise<KaryawanAdmin[]> => {
    if (isMock) return getStorage("karyawan", [] as KaryawanAdmin[]);
    try {
      const qs = peran ? `?peran=${encodeURIComponent(peran)}` : "";
      return await adminFetch<KaryawanAdmin[]>(`/admin/karyawan${qs}`);
    } catch { return []; }
  },
  create: async (data: KaryawanInput) => {
    if (isMock) {
      const list = getStorage("karyawan", [] as KaryawanAdmin[]);
      const newObj: KaryawanAdmin = { id_karyawan: Date.now(), ...data };
      setStorage("karyawan", [newObj, ...list]);
      return { id_karyawan: newObj.id_karyawan };
    }
    return await adminFetch<{ id_karyawan: number }>("/admin/karyawan", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: KaryawanInput) => {
    if (isMock) {
      const list = getStorage("karyawan", [] as KaryawanAdmin[]);
      setStorage("karyawan", list.map((item) => item.id_karyawan === id ? { ...item, ...data } : item));
      return { success: true };
    }
    return await adminFetch<any>(`/admin/karyawan/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("karyawan", [] as KaryawanAdmin[]);
      setStorage("karyawan", list.map((item) => item.id_karyawan === id ? { ...item, status: "nonaktif" as const } : item));
      return { success: true };
    }
    return await adminFetch<any>(`/admin/karyawan/${id}`, { method: "DELETE" });
  },
};

// ── Koordinator Gudang ──
export type KoordinatorGudangAdmin = {
  id_koor_gudang: number;
  nama: string;
  no_hp?: string;
  id_gudang?: number;
  nama_gudang?: string;
  status: "aktif" | "nonaktif";
  id_user?: number;
};

export type KoordinatorGudangInput = {
  nama: string;
  no_hp?: string;
  id_gudang?: number;
  status: "aktif" | "nonaktif";
};

export const adminKoordinatorGudang = {
  list: async (): Promise<KoordinatorGudangAdmin[]> => {
    if (isMock) return getStorage("koorGudang", [] as KoordinatorGudangAdmin[]);
    try { return await adminFetch<KoordinatorGudangAdmin[]>("/admin/koordinator-gudang"); }
    catch { return []; }
  },
  create: async (data: KoordinatorGudangInput) => {
    if (isMock) {
      const list = getStorage("koorGudang", [] as KoordinatorGudangAdmin[]);
      const newObj: KoordinatorGudangAdmin = { id_koor_gudang: Date.now(), ...data };
      setStorage("koorGudang", [newObj, ...list]);
      return { id_koor_gudang: newObj.id_koor_gudang };
    }
    return await adminFetch<{ id_koor_gudang: number }>("/admin/koordinator-gudang", { method: "POST", body: JSON.stringify(data) });
  },
  update: async (id: number, data: KoordinatorGudangInput) => {
    if (isMock) {
      const list = getStorage("koorGudang", [] as KoordinatorGudangAdmin[]);
      setStorage("koorGudang", list.map((item) => item.id_koor_gudang === id ? { ...item, ...data } : item));
      return { success: true };
    }
    return await adminFetch<any>(`/admin/koordinator-gudang/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  delete: async (id: number) => {
    if (isMock) {
      const list = getStorage("koorGudang", [] as KoordinatorGudangAdmin[]);
      setStorage("koorGudang", list.map((item) => item.id_koor_gudang === id ? { ...item, status: "nonaktif" as const } : item));
      return { success: true };
    }
    return await adminFetch<any>(`/admin/koordinator-gudang/${id}`, { method: "DELETE" });
  },
};
