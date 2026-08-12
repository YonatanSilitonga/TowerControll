/**
 * Router mock — meniru perilaku backend Tower Control.
 * Dipanggil dari api-client saat NEXT_PUBLIC_USE_MOCK=true.
 */

import { ApiError } from "@/types/api";
import type { AuthResponse, User } from "@/types/auth";
import {
  mockDashboard,
  mockDrivers,
  mockFleets,
  mockTrackingHistory,
  mockTrackingMap,
  mockTrips,
  mockVehicles,
  mockMasterOptions,
  mockAdminRitases,
} from "./data";

/** Simulasi latency jaringan. */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const simulateLatency = () => delay(250 + Math.random() * 350);

const MOCK_USER: User = {
  id_user: 1,
  username: "direktur",
  name: "Direktur Operasional",
  role: "direktur",
};

const MOCK_TOKEN = "mock-token-1|abcdef0123456789";

export async function mockRequest<T>(
  method: string,
  path: string,
  query?: Record<string, string | number | undefined>,
  body?: unknown
): Promise<T> {
  await simulateLatency();

  /* ---------- Auth ---------- */
  if (method === "POST" && path === "/auth/login") {
    const { username, password } = (body ?? {}) as { username?: string; password?: string };
    if (!username || !password) {
      throw new ApiError(422, "Username dan password wajib diisi.");
    }
    const res: AuthResponse = { user: { ...MOCK_USER, username }, token: MOCK_TOKEN };
    return res as T;
  }

  if (method === "GET" && path === "/auth/me") {
    return MOCK_USER as T;
  }

  if (method === "POST" && path === "/auth/logout") {
    return undefined as T;
  }

  /* ---------- Dashboard ---------- */
  if (method === "GET" && path === "/dashboard/summary") {
    return mockDashboard as T;
  }

  if (method === "GET" && path === "/dashboard/analisis") {
    return {
      durasi: {
        rata_rata_loading: "40 menit",
        rata_rata_perjalanan: "3.2 jam",
        rata_rata_unloading: "25 menit",
        total_ritase_dihitung: 8,
      },
      bottleneck: [
        { kategori: "seller", label: "Kacamata Group", indikator: "ritase terbanyak", nilai: 3 },
      ],
      alerts: [
        {
          tingkat: "warning",
          pesan: "Ritase RTS-0001 berhenti lebih dari 3 jam tanpa update",
          kategori: "kendaraan_berhenti",
          waktu: new Date().toISOString(),
        },
      ],
    } as T;
  }

  /* ---------- Armada ---------- */
  if (method === "GET" && path === "/armada/fleets") return mockFleets as T;
  if (method === "POST" && path === "/armada/fleets") return (body ?? {}) as T;
  if (method === "GET" && path === "/armada/vehicles") return mockVehicles as T;
  if (method === "POST" && path === "/armada/vehicles") return (body ?? {}) as T;
  if (method === "GET" && path === "/armada/drivers") return mockDrivers as T;
  if (method === "POST" && path === "/armada/drivers") return (body ?? {}) as T;
  if (method === "GET" && path === "/armada/trips") return mockTrips as T;
  if (method === "POST" && path === "/armada/trips") return (body ?? {}) as T;

  const vehicleStatus = path.match(/^\/armada\/vehicles\/([^/]+)\/status$/);
  if (method === "PATCH" && vehicleStatus) {
    const v = mockVehicles.find((x) => x.id === vehicleStatus[1]);
    if (v) v.status = ((body as { status?: string })?.status as typeof v.status) ?? v.status;
    return v as T;
  }
  const tripStatus = path.match(/^\/armada\/trips\/([^/]+)\/status$/);
  if (method === "PATCH" && tripStatus) {
    const t = mockTrips.find((x) => x.id === tripStatus[1]);
    if (t) t.status = ((body as { status?: string })?.status as typeof t.status) ?? t.status;
    return t as T;
  }

  /* ---------- Live Tracking ---------- */
  if (method === "GET" && path === "/armada/tracking/map") return mockTrackingMap as T;

  if (method === "GET" && path === "/armada/tracking/history") {
    const tanggal = query?.tanggal as string | undefined;
    if (tanggal) {
      return mockTrackingHistory.filter((h) => h.created_at.slice(0, 10) === tanggal) as T;
    }
    return mockTrackingHistory as T;
  }

  /* ---------- Admin Jadwal Ritase (CRUD) ---------- */
  if (method === "GET" && path === "/admin/master-options") {
    return mockMasterOptions as T;
  }

  if (method === "GET" && path === "/admin/ritases") {
    const tanggal = (query?.tanggal as string) || new Date().toISOString().slice(0, 10);
    return mockAdminRitases.filter((r) => r.tanggal === tanggal) as T;
  }

  if (method === "POST" && path === "/admin/ritase/generate") {
    const total = mockAdminRitases.length;
    return {
      total_generated: total,
      message: `Berhasil menimpa & meng-generate ${total} ritase harian!`,
    } as T;
  }

  if (method === "POST" && path === "/admin/ritase") {
    const b = (body ?? {}) as { id_driver?: number; id_kendaraan?: number; id_drop_point?: number };
    if (!b.id_driver || !b.id_kendaraan || !b.id_drop_point) {
      throw new ApiError(422, "Driver, Kendaraan, dan Drop Point wajib dipilih");
    }
    return { id_ritase: 999, message: "Jadwal ritase baru berhasil dibuat!" } as T;
  }

  const ritaseParam = path.match(/^\/admin\/ritase\/(\d+)$/);
  if (ritaseParam) {
    if (method === "PUT") {
      return { message: "Jadwal ritase berhasil diperbarui" } as T;
    }
    if (method === "DELETE") {
      return { message: "Ritase berhasil dihapus" } as T;
    }
  }

  /* ---------- Fallback ---------- */
  throw new ApiError(404, `Mock: endpoint tidak dikenali ${method} ${path}`);
}
