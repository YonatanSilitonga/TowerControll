"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Edit2,
  Info,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JenisBadge } from "@/components/ui/jenis-badge";
import { useAdminMasterOptions } from "@/hooks/use-admin-ritase";
import { useAuthStore } from "@/stores/auth-store";
import { swal } from "@/lib/swal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

// ── Types ──
interface JamRitase {
  id: number;
  jenis: string;
  ritase_ke: number;
  jam_mulai: string;
  jam_selesai: string;
}

interface DriverJenis {
  id: number;
  id_driver: number;
  nama_driver: string;
  ritase_ke: number;
  jenis: string;
}

interface StopTemplate {
  id?: number;
  urutan: number;
  jenis_stop: string;
  id_lokasi: number;
  kolom_lokasi: string;
  keterangan: string;
  nama_lokasi?: string;
}

interface RouteTemplate {
  id: number;
  id_driver: number;
  nama_driver: string;
  id_kendaraan: number;
  plat_nomor: string;
  id_drop_point: number;
  nama_drop_point: string;
  ritase_ke: number;
  jenis_ritase: string;
  aktif: boolean;
  stops: StopTemplate[];
}

interface ConfigData {
  jam_ritase: JamRitase[];
  driver_jenis: DriverJenis[];
  route_templates: RouteTemplate[];
}

// ── Helper ──
async function apiFetch<T>(
  path: string,
  token: string | null,
  opts?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return (json.data ?? json) as T;
}

// ── Main Component ──
export function PengaturanTab() {
  const token = useAuthStore((s) => s.token);
  const [activeSubTab, setActiveSubTab] = useState<"jam" | "route">("jam");
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    if (type === "success") {
      swal.success(text);
    } else {
      swal.error(text);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ConfigData>("/jadwal-config", token);
      setConfig(data);
    } catch (e: any) {
      showToast("error", e.message || "Gagal memuat config");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
        {[
          { key: "jam" as const, label: "Jam Ritase", icon: Clock },
          { key: "route" as const, label: "Template Rute", icon: MapPin },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
              activeSubTab === tab.key
                ? "bg-[#0c1e3a] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={fetchConfig}
          className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Sub-tab content */}
      {activeSubTab === "jam" && config && (
        <JamRitaseTab
          data={config.jam_ritase}
          onChanged={fetchConfig}
          showToast={showToast}
        />
      )}
      {activeSubTab === "route" && config && (
        <RouteTemplateTab
          data={config.route_templates}
          onChanged={fetchConfig}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUB-TAB 1: JAM RITASE
// ══════════════════════════════════════════════════════════════
function JamRitaseTab({
  data,
  onChanged,
  showToast,
}: {
  data: JamRitase[];
  onChanged: () => void;
  showToast: (t: "success" | "error", m: string) => void;
}) {
  const token = useAuthStore((s) => s.token);
  const [editing, setEditing] = useState<JamRitase | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    jenis: "outgoing",
    ritase_ke: 1,
    jam_mulai: "16:00",
    jam_selesai: "20:00",
  });

  const handleSave = async () => {
    try {
      if (editing) {
        await apiFetch(`/jadwal-config/jam/${editing.id}`, token, {
          method: "PUT",
          body: JSON.stringify({
            jam_mulai: form.jam_mulai,
            jam_selesai: form.jam_selesai,
          }),
        });
        showToast("success", "Jam ritase berhasil diupdate");
      } else {
        await apiFetch("/jadwal-config/jam", token, {
          method: "POST",
          body: JSON.stringify(form),
        });
        showToast("success", "Jam ritase berhasil ditambahkan");
      }
      setEditing(null);
      setAdding(false);
      onChanged();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

    const handleDelete = async (id: number) => {
    const confirmed = await swal.confirm("Apakah Anda yakin?", "Jam ritase ini akan dihapus!", "Ya, hapus!");
    if (!confirmed) return;
    try {
      await apiFetch(`/jadwal-config/jam/${id}`, token, { method: "DELETE" });
      showToast("success", "Jam ritase dihapus");
      onChanged();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Jam Ritase
        </h3>
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditing(null);
            setForm({
              jenis: "outgoing",
              ritase_ke: 1,
              jam_mulai: "16:00",
              jam_selesai: "20:00",
            });
          }}
          className="flex items-center gap-1.5 rounded-md bg-[#FEA103] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#E09102]"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300">
          Jam ini dipakai otomatis saat Generate Ritase. Kalau jam mulai &lt;
          07:00, tanggal ritase otomatis ke besok.
        </p>
      </div>

      {/* Form tambah/edit */}
      {(adding || editing) && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-3 text-xs font-bold text-slate-700 dark:text-slate-300">
            {editing ? "Edit Jam Ritase" : "Tambah Jam Ritase"}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Jenis
              </label>
              <select
                value={form.jenis}
                onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                disabled={!!editing}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Ritase Ke
              </label>
              <select
                value={form.ritase_ke}
                onChange={(e) =>
                  setForm({ ...form, ritase_ke: parseInt(e.target.value) })
                }
                disabled={!!editing}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {[1, 2, 3, 4].map((r) => (
                  <option key={r} value={r}>
                    R{r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Jam Mulai
              </label>
              <input
                type="time"
                value={form.jam_mulai}
                onChange={(e) =>
                  setForm({ ...form, jam_mulai: e.target.value })
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Jam Selesai
              </label>
              <input
                type="time"
                value={form.jam_selesai}
                onChange={(e) =>
                  setForm({ ...form, jam_selesai: e.target.value })
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-[#0c1e3a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16335a]"
            >
              <Save className="h-3.5 w-3.5" /> Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setEditing(null);
              }}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Jenis
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Ritase Ke
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Jam Mulai
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Jam Selesai
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-400">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((j) => (
              <tr
                key={j.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <td className="px-3 py-2">
                  <JenisBadge jenis={j.jenis} />
                </td>
                <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
                  R{j.ritase_ke}
                </td>
                <td className="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {j.jam_mulai}
                </td>
                <td className="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {j.jam_selesai}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(j);
                        setAdding(false);
                        setForm({
                          jenis: j.jenis,
                          ritase_ke: j.ritase_ke,
                          jam_mulai: j.jam_mulai,
                          jam_selesai: j.jam_selesai,
                        });
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(j.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  Belum ada jam ritase
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUB-TAB 2: TEMPLATE RUTE
// ══════════════════════════════════════════════════════════════
function RouteTemplateTab({
  data,
  onChanged,
  showToast,
}: {
  data: RouteTemplate[];
  onChanged: () => void;
  showToast: (t: "success" | "error", m: string) => void;
}) {
  const token = useAuthStore((s) => s.token);
  const { data: masterOptions } = useAdminMasterOptions();
  const [editing, setEditing] = useState<RouteTemplate | null>(null);
  const [adding, setAdding] = useState(false);

  const drivers = masterOptions?.drivers ?? [];
  const vehicles = masterOptions?.kendaraan ?? [];
  const gudangs = masterOptions?.gudangs ?? [];
  const sellers = masterOptions?.sellers ?? [];
  const dropPoints = masterOptions?.drop_points ?? [];

  // Fokus dulu ke driver Transporter Outgoing & Incoming saja — konsisten dengan JadwalPage.
  const activeDrivers = drivers.filter((d) =>
    ["transporter outgoing", "transporter incoming"].includes(
      (d.jabatan ?? "").toLowerCase().trim(),
    ),
  );

  // Jenis driver ditentukan tetap dari jabatan (TRANSPORTER OUTGOING/INCOMING).
  const getDriverJenis = (idDriver: number) => {
    const driver = drivers.find((d) => d.id_driver === idDriver);
    const jabatan = (driver?.jabatan ?? "").toLowerCase();
    return jabatan.includes("incoming") ? "incoming" : "outgoing";
  };

  const driversForJenis = (jenis: string) =>
    activeDrivers.filter((d) => getDriverJenis(d.id_driver) === jenis);

  const emptyRoute = {
    id_driver: driversForJenis("outgoing")[0]?.id_driver ?? 1,
    id_kendaraan: vehicles[0]?.id_kendaraan ?? 1,
    id_drop_point: dropPoints[0]?.id_drop_point ?? 1,
    ritase_ke: 1,
    jenis_ritase: "outgoing",
    aktif: true,
    stops: [] as StopTemplate[],
  };

  const [form, setForm] = useState(emptyRoute);

  const startAdd = () => {
    setAdding(true);
    setEditing(null);
    setForm({ ...emptyRoute, stops: [] });
  };

  const startEdit = (rt: RouteTemplate) => {
    setEditing(rt);
    setAdding(false);
    setForm({
      id_driver: rt.id_driver,
      id_kendaraan: rt.id_kendaraan,
      id_drop_point: rt.id_drop_point,
      ritase_ke: rt.ritase_ke,
      jenis_ritase: rt.jenis_ritase,
      aktif: rt.aktif,
            stops: JSON.parse(JSON.stringify(rt.stops ?? [])),
    });
  };

  const addStop = () => {
    setForm({
      ...form,
      stops: [
        ...form.stops,
        {
          urutan: form.stops.length + 1,
          jenis_stop: "gudang",
          id_lokasi: gudangs[0]?.id_gudang ?? 1,
          kolom_lokasi: "id_gudang",
          nama_lokasi: gudangs[0]?.nama_gudang ?? "",
          keterangan: "",
        },
      ],
    });
  };

  const updateStop = (idx: number, field: string, value: any) => {
    const newStops = [...form.stops];
    (newStops[idx] as any)[field] = value;
    // Auto-set kolom_lokasi & id_lokasi based on jenis_stop
    if (field === "jenis_stop") {
      if (value === "gudang") {
        newStops[idx].kolom_lokasi = "id_gudang";
        newStops[idx].id_lokasi = gudangs[0]?.id_gudang ?? 1;
        newStops[idx].nama_lokasi = gudangs[0]?.nama_gudang ?? "";
      } else if (value === "seller") {
        newStops[idx].kolom_lokasi = "id_seller";
        newStops[idx].id_lokasi = sellers[0]?.id_seller ?? 1;
        newStops[idx].nama_lokasi = sellers[0]?.nama_seller ?? "";
      } else {
        newStops[idx].kolom_lokasi = "id_drop_point";
        newStops[idx].id_lokasi = dropPoints[0]?.id_drop_point ?? 1;
        newStops[idx].nama_lokasi = dropPoints[0]?.nama_drop_point ?? "";
      }
    }
    setForm({ ...form, stops: newStops });
  };

  const moveStop = (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= form.stops.length) return;
    const newStops = [...form.stops];
    [newStops[idx], newStops[target]] = [newStops[target], newStops[idx]];
    setForm({ ...form, stops: newStops.map((s, i) => ({ ...s, urutan: i + 1 })) });
  };

    const removeStop = async (idx: number) => {
        const confirmed = await swal.confirm("Apakah Anda yakin?", "Hapus titik ini dari rute?", "Ya, hapus!");
    if (!confirmed) return;
    const newStops = form.stops
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, urutan: i + 1 }));
    setForm({ ...form, stops: newStops });
  };

  const isFormDirty = () => {
    if (!editing) return !!form.stops.length || form.id_driver !== emptyRoute.id_driver || form.id_kendaraan !== emptyRoute.id_kendaraan || form.ritase_ke !== emptyRoute.ritase_ke;
    return (
      form.id_driver !== editing.id_driver ||
      form.id_kendaraan !== editing.id_kendaraan ||
      form.ritase_ke !== editing.ritase_ke ||
      form.jenis_ritase !== editing.jenis_ritase ||
      JSON.stringify(form.stops) !== JSON.stringify(editing.stops ?? [])
    );
  };

  const handleCloseForm = async () => {
    if (isFormDirty()) {
      const confirmed = await swal.confirm(
        "Apakah Anda yakin?",
        "Batalkan perubahan pada form rute ini?",
        "Ya, batalkan",
      );
      if (!confirmed) return;
    }
    setAdding(false);
    setEditing(null);
  };

        const handleSave = async () => {
        if (form.stops.length < 2) {
      showToast("error", "Rute harus memiliki minimal 2 stop (titik awal & tujuan akhir).");
      return;
    }
        const confirmed = await swal.confirmQuestion(
      "Apakah Anda yakin?",
      editing ? "Simpan perubahan pada rute ini?" : "Simpan rute baru ini?",
      "Ya, simpan",
    );
    if (!confirmed) return;
    try {
      const lastGateway = [...form.stops].reverse().find((s) => s.jenis_stop === "gateway");
      const body = {
        ...form,
        id_drop_point: lastGateway?.id_lokasi ?? dropPoints[0]?.id_drop_point ?? form.id_drop_point,
        stops: form.stops.map((s, i) => ({ ...s, urutan: i + 1 })),
      };
      if (editing) {
        await apiFetch(`/jadwal-config/template/${editing.id}`, token, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        showToast("success", "Route template diupdate");
      } else {
        await apiFetch("/jadwal-config/template", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
        showToast("success", "Route template ditambahkan");
      }
      setEditing(null);
      setAdding(false);
      onChanged();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await swal.confirm("Hapus route template ini?", "Template yang dihapus tidak dapat dikembalikan.", "Ya, hapus!");
    if (!confirmed) return;
    try {
      await apiFetch(`/jadwal-config/template/${id}`, token, {
        method: "DELETE",
      });
      showToast("success", "Route template dihapus");
      onChanged();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const getLokasiOptions = (jenis: string) => {
    if (jenis === "gudang")
      return gudangs.map((g) => ({ id: g.id_gudang, name: g.nama_gudang }));
    if (jenis === "seller")
      return sellers.map((s) => ({ id: s.id_seller, name: s.nama_seller }));
    return dropPoints.map((d) => ({
      id: d.id_drop_point,
      name: d.nama_drop_point,
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Template Rute
        </h3>
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center gap-1.5 rounded-md bg-[#FEA103] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#E09102]"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah Rute
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300">
          Template ini digunakan saat ingin mengubah jadwal yang sudah ada di
          button generate otomatis.
        </p>
      </div>

            {/* Form tambah/edit — modal overlay */}
      {(adding || editing) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {editing
                  ? `Edit Rute: ${editing.nama_driver} → ${editing.jenis_ritase} R${editing.ritase_ke}`
                  : "Tambah Rute Baru"}
              </h4>
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Route fields */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Driver
              </label>
              <select
                value={form.id_driver}
                onChange={(e) =>
                  setForm({ ...form, id_driver: parseInt(e.target.value) })
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {driversForJenis(form.jenis_ritase).map((d) => (
                  <option key={d.id_driver} value={d.id_driver}>
                    {d.nama_driver} ({d.jabatan})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Kendaraan
              </label>
              <select
                value={form.id_kendaraan}
                onChange={(e) =>
                  setForm({ ...form, id_kendaraan: parseInt(e.target.value) })
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {vehicles.map((v) => (
                  <option key={v.id_kendaraan} value={v.id_kendaraan}>
                    {v.plat_nomor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Ritase Ke
              </label>
              <select
                value={form.ritase_ke}
                onChange={(e) =>
                  setForm({ ...form, ritase_ke: parseInt(e.target.value) })
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {(form.jenis_ritase === "outgoing"
                  ? [1, 2, 3]
                  : [1, 2, 3, 4]
                ).map((r) => (
                  <option key={r} value={r}>
                    R{r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                Jenis
              </label>
              <select
                value={form.jenis_ritase}
                onChange={(e) => {
                  const newJenis = e.target.value;
                  const validDrivers = driversForJenis(newJenis);
                  const maxRitase = newJenis === "outgoing" ? 3 : 4;
                  setForm({
                    ...form,
                    jenis_ritase: newJenis,
                    ritase_ke: Math.min(form.ritase_ke, maxRitase),
                    id_driver: validDrivers.some(
                      (d) => d.id_driver === form.id_driver,
                    )
                      ? form.id_driver
                      : (validDrivers[0]?.id_driver ?? form.id_driver),
                  });
                }}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#FEA103] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
            </div>
          </div>

          {/* Stops */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Stops ({form.stops.length})
              </h5>
              <button
                type="button"
                onClick={addStop}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
              >
                <Plus className="h-3 w-3" /> Tambah Stop
              </button>
            </div>
            <div className="space-y-2">
              {form.stops.map((stop, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStop(idx, "up")}
                      className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === form.stops.length - 1}
                      onClick={() => moveStop(idx, "down")}
                      className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <select
                    value={stop.jenis_stop}
                    onChange={(e) =>
                      updateStop(idx, "jenis_stop", e.target.value)
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="gudang">Gudang</option>
                    <option value="seller">Seller</option>
                    <option value="gateway">Gateway</option>
                  </select>
                  <select
                    value={stop.id_lokasi}
                    onChange={(e) =>
                      updateStop(idx, "id_lokasi", parseInt(e.target.value))
                    }
                    className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {getLokasiOptions(stop.jenis_stop).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeStop(idx)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {form.stops.length === 0 && (
                <p className="py-4 text-center text-[11px] text-slate-400">
                  Belum ada stop. Klik "Tambah Stop" untuk menambah.
                </p>
              )}
            </div>
          </div>

                      </div>
            <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-md bg-[#0c1e3a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16335a]"
              >
                <Save className="h-3.5 w-3.5" /> Simpan
              </button>
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Driver
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Kendaraan
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Tujuan Akhir
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Ritase
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Jenis
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">
                Stops
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-400">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((rt) => (
              <tr
                key={rt.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {rt.nama_driver}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {rt.plat_nomor}
                </td>
                <td className="px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {rt.stops?.[rt.stops.length - 1]?.nama_lokasi ?? "-"}
                </td>
                <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
                  R{rt.ritase_ke}
                </td>
                <td className="px-3 py-2">
                  <JenisBadge jenis={rt.jenis_ritase} />
                </td>
                                <td className="px-3 py-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {(rt.stops ?? []).length} stop{(rt.stops ?? []).length !== 1 ? "s" : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(rt)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rt.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  Belum ada template rute
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
