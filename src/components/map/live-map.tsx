"use client";
import { WhatsAppContact } from "@/components/armada/whatsapp-contact";
import { createPortal } from "react-dom";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Check, ChevronDown, ChevronUp, Clock, Gauge, History, Loader2, MapPin, Package, Phone, Save, Search, Truck } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  DropPointPoi,
  GudangPoint,
  ImplanBarangLog,
  RitaseEvent,
  RitaseStop,
  SellerLocation,
  TrackingVehicle,
} from "@/types/armada";
import { useRitaseDetail, useDriver } from "@/hooks/use-armada";
import { displayTrackingStatus, ritaseStatusLabel } from "@/lib/constants";
import { cn, hasActiveSession } from "@/lib/utils";

// Tile CARTO (gratis & lebih cepat dari OSM publik) — render area baru jauh lebih responsif.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const JAKARTA: [number, number] = [-6.2088, 106.8456];

// Titik gudang fallback (dipakai kalau backend belum balikin gudang).
const TANGERANG_BOUNDS: L.LatLngBoundsExpression = [
  [-6.35, 106.45], // titik barat daya (kiri bawah)
  [-6.00, 106.85], // titik timur laut (kanan atas)
];
const OUTGOING_LAT = -6.171496373990977;
const OUTGOING_LON = 106.65715503860062;
const DC_LAT = -6.1848;
const DC_LON = 106.6511;

const OUTGOING_ICON = createGudangIcon("#0ea5e9"); // biru
const DC_ICON = createGudangIcon("#7c3aed"); // ungu
const DROP_ICON = createGudangIcon("#ef4444"); // MERAH — gateway / drop point

// Cache icon agar Leaflet tidak me-recreate DOM element setiap render
const truckIconCache = new Map<string, L.DivIcon>();
const sellerIconCache = new Map<string, L.DivIcon>();

/** Ikon Truk/Driver:
 *  - Driver Pickup: Oranye (#ea580c) saat LIVE, gelap saat offline
 *  - Driver Reguler: Hijau (#10b981) saat LIVE, gelap saat offline
 *  - Bubble chat: Angka AWB di atas icon jika > 0
 */
function getTruckIcon(
  selected: boolean,
  roleDriver?: string | null,
  isLive?: boolean,
  totalAwb?: number | null
): L.DivIcon {
  const isPickup = roleDriver === "driver_pickup";
  const awbVal = totalAwb != null && totalAwb >= 0 ? totalAwb : 0;
  const key = `${selected}:${isPickup}:${!!isLive}:${awbVal}`;

  const cached = truckIconCache.get(key);
  if (cached) return cached;

  let bg = "#10b981";
  let border = "#fff";

  if (selected) {
    bg = "#ff8f00";
    border = "#fff";
  } else if (!isLive) {
    bg = "#334155"; // gelap saat offline/logout
    border = isPickup ? "#f59e0b" : "#10b981";
  } else if (isPickup) {
    bg = "#ea580c"; // oranye cerah saat live pickup
    border = "#fff";
  } else {
    bg = "#10b981"; // hijau saat live reguler
    border = "#fff";
  }

  const bubbleBg = awbVal > 0 ? (isPickup ? "#c2410c" : "#047857") : (isPickup ? "#ea580c" : "#475569");

  const icon = L.divIcon({
    className: "",
    iconSize: [34, 54],
    iconAnchor: [17, 37],
    html: `
      <div style="position:relative;width:34px;height:54px;">
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:10;white-space:nowrap;background:${bubbleBg};color:#fff;border:1.5px solid #fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:800;box-shadow:0 2px 5px rgba(0,0,0,0.35);display:flex;align-items:center;gap:2px;">
          <span>${awbVal}</span>
          <span style="font-size:8px;opacity:0.85;">AWB</span>
          <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid ${bubbleBg};"></div>
        </div>
        ${selected ? `<span class="truck-pulse-ring" style="top:20px;"></span>` : ""}
        <div class="marker-visual" style="
          position:absolute;bottom:0;left:0;z-index:1;
          width:34px;height:34px;
          background:${bg};
          border:2.5px solid ${border};
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,.45);
          display:flex;align-items:center;justify-content:center;
        ">
          ${isPickup ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 17h4V5H2v12h3"/>
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
              <circle cx="7.5" cy="17.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          `}
        </div>
      </div>`,
  });

  truckIconCache.set(key, icon);
  return icon;
}

/** Ikon Seller / Implan:
 *  - Memiliki bubble chat di atasnya jika ada input jumlah barang
 *  - Warna bubble: Amber/Kuning jika menunggu, Hijau jika sudah diambil
 */
function getSellerIcon(jumlahBarang?: number | null, statusPickup?: string | null): L.DivIcon {
  const count = jumlahBarang != null && jumlahBarang >= 0 ? jumlahBarang : 0;
  const status = statusPickup || "menunggu";
  const key = `${count}:${status}`;

  const cached = sellerIconCache.get(key);
  if (cached) return cached;

  const isSelesai = status === "sudah_diambil";
  let badgeBg = "#475569"; // default netral slate saat 0
  let badgeText = `${count}`;

  if (isSelesai) {
    badgeBg = "#059669"; // hijau selesai
    badgeText = "✓ 0";
  } else if (count > 0) {
    badgeBg = "#d97706"; // amber jika ada barang menunggu
    badgeText = `${count}`;
  }

  const icon = L.divIcon({
    className: "",
    iconSize: [30, 50],
    iconAnchor: [15, 35],
    html: `
      <div style="position:relative;width:30px;height:50px;">
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:10;white-space:nowrap;background:${badgeBg};color:#fff;border:1.5px solid #fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:800;box-shadow:0 2px 5px rgba(0,0,0,0.35);display:flex;align-items:center;gap:2px;">
          <span>${badgeText}</span>
          <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid ${badgeBg};"></div>
        </div>
        <div class="marker-visual" style="
          position:absolute;bottom:0;left:0;
          width:30px;height:30px;
          background:${isSelesai ? "#10b981" : "#0284c7"};
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>
      </div>`,
  });

  sellerIconCache.set(key, icon);
  return icon;
}

const SELLER_ICON = getSellerIcon(0, "menunggu");

function createGudangIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `
      <div class="marker-visual" style="
        width:38px;height:38px;
        background:${color};
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 3px ${color}55, 0 2px 6px rgba(0,0,0,.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18"/>
          <path d="M5 21V7l7-5 7 5v14"/>
          <path d="M9 21v-6h6v6"/>
        </svg>
      </div>`,
  });
}

/** Restart animasi "pop" di elemen dalam marker (dipanggil tiap klik). */
function playPopAnimation(marker: L.Marker | null) {
  const el = marker?.getElement()?.querySelector<HTMLElement>(".marker-visual");
  if (!el) return;
  el.classList.remove("marker-pop");
  void el.offsetWidth; // paksa reflow biar animasi bisa diulang walau class-nya sama
  el.classList.add("marker-pop");
}

function FitBounds({
  vehicles,
  sellers,
  gudang,
  dropPoints,
}: {
  vehicles: TrackingVehicle[];
  sellers: SellerLocation[];
  gudang: GudangPoint[];
  dropPoints: DropPointPoi[];
}) {
  const map = useMap();

  const points = useMemo(() => {
    const coords: [number, number][] = [
      ...gudang.map((g) => [g.latitude, g.longitude] as [number, number]),
      ...dropPoints.map((p) => [p.latitude, p.longitude] as [number, number]),
      ...vehicles.map((v) => [v.latitude, v.longitude] as [number, number]),
      ...sellers.map((s) => [s.latitude, s.longitude] as [number, number]),
    ];
    return coords;
  }, [vehicles, sellers, gudang, dropPoints]);

  // FitBounds cuma sekali (atau saat SET marker berubah: gudang/dp/truk/seller masuk-keluar).
  // JANGAN ikut posisi — kalau ikut posisi, tiap poll 10 detik view user ke-reset terus.
  const key = useMemo(() => {
    const ids = [
      ...gudang.map((g) => `g:${g.id_gudang}`),
      ...dropPoints.map((p) => `d:${p.id_drop_point}`),
      ...vehicles.map((v) => `v:${v.id_kendaraan}`),
      ...sellers.map((s) => `s:${s.id_seller}`),
    ];
    return ids.sort().join(",");
  }, [vehicles, sellers, gudang, dropPoints]);

  const fit = () => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
  };

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/** Fit ke seluruh titik rute (dari Outgoing & DC ke seller) → ZOOM OUT biar
 *  kelihatan rutenya + posisi 2 gudang + sellernya. Dipanggil saat seller diklik. */
function FitRoutes({
  routes,
}: {
  routes: { targetKey: string; out?: [number, number][]; dc?: [number, number][] } | null;
}) {
  const map = useMap();
  const key = useMemo(() => {
    if (!routes) return "";
    const pts = [...(routes.out ?? []), ...(routes.dc ?? [])];
    return pts.length ? pts.map((p) => p.join(",")).join("|") : "";
  }, [routes]);

  useEffect(() => {
    if (!key) return;
    const pts = [...(routes?.out ?? []), ...(routes?.dc ?? [])];
    if (!pts.length) return;
    // Tutup popup marker biar garis rute & chip info kelihatan bersih
    // (popup Leaflet z-index tinggi, gampang nutup chip di layar kecil).
    map.closePopup();
    map.fitBounds(L.latLngBounds(pts), { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/** Saat kendaraan dipilih (klik di panel armada / peta) → zoom IN ke truknya
 *  biar detail; popup-nya dibuka otomatis oleh VehicleMarker. */
function FocusSelected({
  vehicles,
  selectedVehicleId,
}: {
  vehicles: TrackingVehicle[];
  selectedVehicleId: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    const v = vehicles.find((x) => x.id_kendaraan === selectedVehicleId);
    if (!v) return;
    // Zoom 14 = perbesaran detail truk (lebih deket dari skala kota).
    map.setView([v.latitude, v.longitude], 14, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);
  return null;
}

interface LiveMapProps {
  fullscreen?: boolean;
  controlsContainer?: HTMLElement | null;
  onFilterOpenChange?: (open: boolean) => void;
  vehicles: TrackingVehicle[];
  sellers: SellerLocation[];
  /** Posisi gudang (Outgoing/DC) dari backend. Opsional — fallback konstanta. */
  gudang?: GudangPoint[];
  /** Posisi drop point (Gateway JKT/SEG) dari backend. */
  dropPoints?: DropPointPoi[];
  /** No HP per nama driver (lowercase) — buat tombol "Telpon Driver" di popup truk. */
  phones?: Record<string, string>;
  /** Fokus POI saat map dibuka (mis. dari tabel armada: `{ type: "seller", id }`). */
  initialFocus?: { type: string; id: number };
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number | null) => void;
  /** Mode mini map (panel kecil): search & legenda dikecilin biar proporsional. */
  compact?: boolean;
}

/** Satu marker truk. Saat `selected` jadi true → popup langsung dibuka. */
function VehicleMarker({
  vehicle: v,
  hidePopup = false,
  onPopupChange,
  selected,
  onSelect,
  phones,
  compact,
  eta,
  isCompleted,
  kode,
}: {
  vehicle: TrackingVehicle;
  hidePopup?: boolean;
  onPopupChange?: (open: boolean) => void;
  selected: boolean;
  onSelect: () => void;
  phones?: Record<string, string>;
  compact?: boolean;
  eta?: { label: string; km: string; durationSeconds: number } | null;
  isCompleted?: boolean;
  kode?: string | null;
}) {
  const markerRef = useRef<L.Marker>(null);
  const lastT = new Date(v.last_update).getTime();
  const stale = !Number.isNaN(lastT) && Date.now() - lastT > 5 * 60 * 1000;
  const phone = phones?.[String(v.id_driver)];

  useEffect(() => {
    if (selected && !hidePopup) markerRef.current?.openPopup();
    else markerRef.current?.closePopup();
  }, [selected, hidePopup]);

  const isLive = !v.offline && hasActiveSession(v.last_login);
  const awbCount = v.total_awb ?? v.total_koli ?? 0;
  const truckIcon = getTruckIcon(selected, v.role_driver, isLive, awbCount);

  return (
    <Marker
      ref={markerRef}
      position={[v.latitude, v.longitude]}
      icon={truckIcon}
      zIndexOffset={selected ? 3000 : 1500}
      eventHandlers={{
        popupopen: () => onPopupChange?.(true),
        popupclose: () => onPopupChange?.(false),
        click: (e) => {
          playPopAnimation(e.target as L.Marker);
          onSelect();
        },
      }}
    >
      {!hidePopup && <Popup maxWidth={340} minWidth={200} className="vehicle-compact-popup [&_.leaflet-popup-content]:!m-4 [&_.leaflet-popup-content-wrapper]:!rounded-2xl [&_.leaflet-popup-close-button]:!right-2 [&_.leaflet-popup-close-button]:!top-2 [&_.leaflet-popup-close-button]:!h-8 [&_.leaflet-popup-close-button]:!w-8">
        <div className="w-[304px] max-w-[calc(100vw-80px)] space-y-3 text-xs leading-snug text-slate-700 [&_p]:!m-0">
          <div className="flex items-start gap-3 pr-7">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Truck className="h-6 w-6" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="break-words text-base font-bold tracking-tight text-[#0c1e3a]">{v.plat_nomor || "—"}</div>
              <p className="break-words text-xs text-slate-600">{v.nama_driver || "Driver belum tersedia"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {(kode || v.kode_ritase) && <span className="min-w-0 break-all font-mono text-[10px] text-slate-500">{kode || v.kode_ritase}</span>}
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", v.offline || stale ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700")}><i className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{!hasActiveSession(v.last_login) ? "Logout" : v.offline ? "Offline" : displayTrackingStatus(v.status, v.kecepatan, v.last_update)}</span>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-100 bg-slate-50/70 py-3 [&>div]:min-w-0 [&>div]:px-2.5 [&>div>p]:min-h-[28px] [&>div>div]:leading-snug">
              <div><Gauge className="mb-1.5 h-4 w-4 text-blue-600" aria-hidden="true" /><p className="text-[10px] text-slate-500">Kecepatan</p><div className="mt-1 break-words font-semibold text-[#0c1e3a]">{!stale && !v.offline && hasActiveSession(v.last_login) ? (v.kecepatan ?? 0) + " km/h" : "—"}</div></div>
              <div><MapPin className="mb-1.5 h-4 w-4 text-emerald-600" aria-hidden="true" /><p className="text-[10px] text-slate-500">Update GPS</p><div className="mt-1 break-words font-semibold text-[#0c1e3a]">{minutesAgo(v.last_update)}</div></div>
              <div><Clock className="mb-1.5 h-4 w-4 text-blue-600" aria-hidden="true" /><p className="text-[10px] text-slate-500">App dibuka</p><div className="mt-1 break-words font-semibold text-[#0c1e3a]">{v.last_open ? minutesAgo(v.last_open) : "—"}</div></div>
            </div>
            {v.session_online !== false && ((v.total_koli ?? 0) > 0 || (v.total_eceran ?? 0) > 0 || (v.total_high_value ?? 0) > 0) && <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">📦 {[(v.total_koli ?? 0) > 0 ? v.total_koli + " koli" : null, (v.total_eceran ?? 0) > 0 ? v.total_eceran + " ecer" : null, (v.total_high_value ?? 0) > 0 ? v.total_high_value + " HV" : null].filter(Boolean).join(" · ")}</div>}
          </div>
          {isCompleted ? <div className="border-t border-slate-100 pt-3 text-emerald-700">Rute selesai</div> : eta && !v.offline && hasActiveSession(v.last_login) && <div className="flex items-start gap-2.5 border-t border-slate-100 pt-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><MapPin className="h-4 w-4" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-[10px] text-slate-500">Tujuan berikutnya</div>
              <p className="break-words text-xs font-semibold leading-snug text-[#0c1e3a]">{eta.label}</p>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500"><span>{eta.km}</span><span>· ±{fmtDuration(eta.durationSeconds)}</span></div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600"><Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /><span>Estimasi tiba</span><span className="font-semibold text-[#0c1e3a]">{fmtArrival(eta.durationSeconds)} WIB</span></div>
            </div>
          </div>}
          {phone && <div className="[&>a]:w-full [&>a]:min-h-11 [&>a]:border [&>a]:border-emerald-600 [&>a]:bg-emerald-600 [&>a]:!text-white [&>a:hover]:bg-emerald-700"><WhatsAppContact phone={phone} name={v.nama_driver} /></div>}
        </div>
      </Popup>}
    </Marker>
  );
}

/** Marker POI (seller/gudang/drop). Saat `focusKey` cocok → popup otomatis dibuka
 *  (dijamin muncul walau marker baru di-mount karena layer baru diaktifkan). */
function PoiMarker({
  poiKey,
  position,
  icon,
  onClick,
  focusKey,
  children,
}: {
  poiKey: string;
  position: [number, number];
  icon: L.DivIcon;
  onClick?: () => void;
  focusKey?: string | null;

  children: React.ReactNode;
}) {
  const ref = useRef<L.Marker>(null);

  useEffect(() => {
    if (focusKey && focusKey.startsWith(`${poiKey}:`)) {
      ref.current?.openPopup();
    }
  }, [focusKey, poiKey]);
  return (
    <Marker
      ref={ref}
      position={position}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          playPopAnimation(e.target as L.Marker);
          onClick?.();
        },
      }}
    >
      {children}
    </Marker>
  );
}

/** Zoom ke titik hasil pencarian (non-truk). Popup-nya dibuka oleh PoiMarker. */
function FocusPoi({ focus }: { focus: { lat: number; lng: number; ts: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.setView([focus.lat, focus.lng], 13, { animate: true });
  }, [focus, map]);
  return null;
}

/** Auto-resize: saat container map membesar (mis. panel Detail Armada muncul),
 *  beri tahu Leaflet supaya re-render area baru cepat (tile langsung keisi). */
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function minutesAgo(iso?: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 jam lalu" : `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 hari lalu" : `${d} hari lalu`;
}

/** Durasi ringkas dari detik → "45 mnt" / "1 jam 20 mnt". */
function fmtDuration(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm === 0 ? `${h} jam` : `${h} jam ${rm} mnt`;
}

/** Jam tiba (WIB, HH:MM) = sekarang + durasi (detik). */
function fmtArrival(sec: number): string {
  if (!sec || sec <= 0) return "-";
  const t = new Date(Date.now() + sec * 1000);
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(t);
}

import { fetchRoute, haversineM, RouteResult } from "@/lib/map-utils";

/** Titik stop yang sudah di-resolve ke koordinat peta (dari data sellers/drop/gudang). */
type StopPoint = { lat: number; lng: number; label: string; icon: L.DivIcon; kind: string };

function resolveStopPoint(
  stop: RitaseStop,
  sellers: SellerLocation[],
  dropList: DropPointPoi[],
  gudangList: GudangPoint[]
): StopPoint | null {
  // 1. Koordinat langsung dari backend
  if (
    stop.latitude != null &&
    stop.longitude != null &&
    stop.latitude !== 0 &&
    stop.longitude !== 0
  ) {
    const isSeller = stop.jenis_stop === "seller";
    const isGudang = stop.jenis_stop === "gudang";
    const label =
      stop.nama_seller ||
      stop.nama_gudang ||
      stop.nama_drop_point ||
      `Stop #${stop.urutan}`;
    return {
      lat: stop.latitude,
      lng: stop.longitude,
      label,
      icon: isSeller ? SELLER_ICON : isGudang ? DC_ICON : DROP_ICON,
      kind: isSeller ? "seller" : isGudang ? "gudang" : "drop",
    };
  }

  // 2. Lookup seller
  if (stop.jenis_stop === "seller" && stop.id_seller != null) {
    const s = sellers.find((x) => x.id_seller === stop.id_seller);
    if (s)
      return {
        lat: s.latitude,
        lng: s.longitude,
        label: s.nama_seller || `Seller ${s.id_seller}`,
        icon: SELLER_ICON,
        kind: "seller",
      };
  }

  // 3. Lookup Gateway / Drop Point (support id_drop_point & fallback id_lokasi)
  const idDp =
    stop.id_drop_point ??
    (stop as unknown as { id_lokasi?: number }).id_lokasi;
  if (
    (stop.jenis_stop === "drop_point" || stop.jenis_stop === "gateway") &&
    idDp != null
  ) {
    const p = dropList.find((x) => x.id_drop_point === idDp);
    if (p)
      return {
        lat: p.latitude,
        lng: p.longitude,
        label: p.nama_drop_point || `Gateway ${idDp}`,
        icon: DROP_ICON,
        kind: "drop",
      };
  }

  // 4. Lookup Gudang
  const idGudang =
    stop.id_gudang ??
    (stop as unknown as { id_lokasi?: number }).id_lokasi;
  if (stop.jenis_stop === "gudang" && idGudang != null) {
    const g = gudangList.find((x) => x.id_gudang === idGudang);
    if (g)
      return {
        lat: g.latitude,
        lng: g.longitude,
        label: g.nama_gudang || `Gudang ${idGudang}`,
        icon: g.tipe === "outgoing" ? OUTGOING_ICON : DC_ICON,
        kind: "gudang",
      };
  }

  return null;
}

/** Tentukan stop berikutnya:
 *  - Jika status terakhir = "Bongkar Muat Barang" / "Tiba" → Driver masih di stop tersebut (target = stop saat ini).
 *  - Jika status terakhir = "Sedang Menuju" / "Keluar Gudang" → Driver meluncur ke stop berikutnya (target = stop + 1).
 */
function findNextStop(
  stops: RitaseStop[],
  points: (StopPoint | null)[],
  events: RitaseEvent[]
): { stop: RitaseStop; point: StopPoint } | null {
  const resolved = stops
    .map((s, i) => ({ stop: s, point: points[i], idx: i }))
    .filter((x): x is { stop: RitaseStop; point: StopPoint; idx: number } => !!x.point);
  if (resolved.length === 0) return null;

  if (events.length === 0) {
    // Belum mulai — gak ada next stop, gak ada ETA
    return null;
  }

  const chronologicalEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Dedup: buang consecutive same-status (driver spam tombol)
  const deduped = chronologicalEvents.filter((ev, i, arr) => {
    if (i === 0) return true;
    return ev.status !== arr[i - 1].status;
  });

  let arrivalCount = 0;
  for (let i = 0; i < deduped.length; i++) {
    const st = (deduped[i].status || "").toLowerCase();
    if ((st.includes("tiba") || st.includes("sampai")) && i > 0) {
      arrivalCount++;
    }
  }
  // Cap: gak boleh lebih dari jumlah stops - 1
  arrivalCount = Math.min(arrivalCount, resolved.length - 1);

  const lastEvent = deduped[deduped.length - 1];
  const lastStatus = (lastEvent?.status || "").toLowerCase();

  // CASE 1: Trip selesai → gak ada next stop
  if (lastStatus.includes("selesai") || lastStatus.includes("done") || lastStatus.includes("completed")) {
    return null;
  }

  const isEnRoute =
    lastStatus.includes("menuju") ||
    lastStatus.includes("keluar") ||
    lastStatus.includes("berangkat") ||
    lastStatus.includes("kembali");
  const isUnloading =
    lastStatus.includes("bongkar") ||
    lastStatus.includes("muat") ||
    lastStatus.includes("loading");

  // CASE 2: Semua stops udah dikunjungi & gak en route & gak bongkar → trip done
  if (arrivalCount >= resolved.length - 1 && !isEnRoute && !isUnloading) {
    return null;
  }

  let targetIdx = arrivalCount;
  if (isEnRoute || isUnloading) {
    targetIdx = Math.min(arrivalCount + 1, resolved.length - 1);
  }

  targetIdx = Math.max(0, Math.min(targetIdx, resolved.length - 1));
  const target = resolved.find((r) => r.idx === targetIdx) ?? resolved[resolved.length - 1];
  return { stop: target.stop, point: target.point };
}

/**
 * Rute live armada terpilih: dari POSISI TRUCK saat ini ke stop berikutnya (ritase aktif).
 * Jika ritase_stop kosong, fallback cari titik koordinat dari nama_lokasi armada (misal: Gateway SEG).
 */
function useActiveRoute(
  vehicle: TrackingVehicle | null,
  sellers: SellerLocation[],
  dropList: DropPointPoi[],
  gudangList: GudangPoint[]
): {
  next: { stop: RitaseStop; point: StopPoint } | null;
  route: RouteResult | null;
  kode: string | null;
  isCompleted: boolean;
} {
  const idRitase = vehicle?.id_ritase ?? undefined;
  const { data: rit } = useRitaseDetail(idRitase);
  const stops = rit?.stops ?? [];
  const events = rit?.events ?? [];

  const next = useMemo(() => {
    if (!vehicle || !hasActiveSession(vehicle.last_login) || vehicle.offline) return null;
    const points = stops.map((s) => resolveStopPoint(s, sellers, dropList, gudangList));
    const found = findNextStop(stops, points, events);
    if (found) return found;

    // Fallback: Jika ritase_stop kosong, cari koordinat target dari nama_lokasi armada (misal: Gateway SEG)
    const targetLocName = (vehicle.nama_lokasi || "").toLowerCase();
    if (targetLocName) {
      // 1. Match Drop Point / Gateway
      const dpMatch = dropList.find((dp) =>
        targetLocName.includes((dp.nama_drop_point || "").toLowerCase()) ||
        (dp.nama_drop_point || "").toLowerCase().includes(targetLocName.replace(/j&t|express|gateway/gi, "").trim())
      );
      if (dpMatch && dpMatch.latitude && dpMatch.longitude) {
        const dummyStop: RitaseStop = { id_ritase: rit?.id_ritase ?? 0, id_stop: 999, urutan: 1, jenis_stop: "drop_point", id_drop_point: dpMatch.id_drop_point, nama_drop_point: dpMatch.nama_drop_point };
        return { stop: dummyStop, point: { lat: dpMatch.latitude, lng: dpMatch.longitude, label: dpMatch.nama_drop_point ?? "Gateway", icon: DROP_ICON, kind: "drop" } };
      }
      // 2. Match Seller
      const sellerMatch = sellers.find((sel) =>
        targetLocName.includes((sel.nama_seller || "").toLowerCase()) ||
        (sel.nama_seller || "").toLowerCase().includes(targetLocName.replace(/seller/gi, "").trim())
      );
      if (sellerMatch && sellerMatch.latitude && sellerMatch.longitude) {
        const dummyStop: RitaseStop = { id_ritase: rit?.id_ritase ?? 0, id_stop: 998, urutan: 1, jenis_stop: "seller", id_seller: sellerMatch.id_seller, nama_seller: sellerMatch.nama_seller };
        return { stop: dummyStop, point: { lat: sellerMatch.latitude, lng: sellerMatch.longitude, label: sellerMatch.nama_seller ?? "Seller", icon: SELLER_ICON, kind: "seller" } };
      }
      // 3. Match Gudang
      const gudangMatch = gudangList.find((g) =>
        targetLocName.includes((g.nama_gudang || "").toLowerCase()) ||
        (g.nama_gudang || "").toLowerCase().includes(targetLocName.replace(/gudang/gi, "").trim())
      );
      if (gudangMatch && gudangMatch.latitude && gudangMatch.longitude) {
        const dummyStop: RitaseStop = { id_ritase: rit?.id_ritase ?? 0, id_stop: 997, urutan: 1, jenis_stop: "gudang", id_gudang: gudangMatch.id_gudang, nama_gudang: gudangMatch.nama_gudang };
        return { stop: dummyStop, point: { lat: gudangMatch.latitude, lng: gudangMatch.longitude, label: gudangMatch.nama_gudang ?? "Gudang", icon: DC_ICON, kind: "gudang" } };
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, rit, stops, events, sellers, dropList, gudangList]);

  const [route, setRoute] = useState<RouteResult | null>(null);
  const lastKeyRef = useRef("");
  const lastPosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!vehicle || !hasActiveSession(vehicle.last_login) || !next) {
      setRoute(null);
      lastKeyRef.current = "";
      lastPosRef.current = null;
      return;
    }
    const key = `${vehicle.id_kendaraan}:${vehicle.id_ritase}:${next.stop.id_stop}:${next.point.lat}:${next.point.lng}`;
    const moved =
      !lastPosRef.current ||
      haversineM(
        vehicle.latitude, vehicle.longitude,
        lastPosRef.current[0], lastPosRef.current[1]
      ) > 15;
    if (lastKeyRef.current === key && !moved) return;

    setRoute(null);
    let cancelled = false;
    (async () => {
      const r = await fetchRoute(
        vehicle.latitude, vehicle.longitude,
        next.point.lat, next.point.lng
      );
      if (cancelled || !r) return;
      setRoute({ points: r.points, distanceMeters: r.distanceMeters, durationSeconds: r.durationSeconds });
      lastKeyRef.current = key;
      lastPosRef.current = [vehicle.latitude, vehicle.longitude];
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicle?.id_kendaraan, vehicle?.id_ritase, vehicle?.latitude, vehicle?.longitude, vehicle?.last_login, next?.stop.id_stop, next?.point.lat, next?.point.lng]);

  // Detect trip completed: last event = "Selesai" atau ritase status = "completed"
  const isCompleted = useMemo(() => {
    if (rit?.status === "completed") return true;
    if (events.length === 0) return false;
    const sorted = [...events].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const last = (sorted[sorted.length - 1]?.status || "").toLowerCase();
    return last.includes("selesai") || last.includes("done") || last.includes("completed");
  }, [events, rit?.status]);

  return { next, route, kode: rit?.kode_ritase ?? null, isCompleted };
}

const typeLabel = (t: string) =>
  ({ truck: "Truk", seller: "Seller", gudang: "Gudang", drop: "Gateway" }[t] ?? t);


const typeColor = (t: string) =>
  t === "truck"
    ? "bg-slate-100 text-slate-600"
    : t === "seller"
      ? "bg-emerald-100 text-emerald-700"
      : t === "gudang"
        ? "bg-sky-100 text-sky-700"
        : "bg-orange-100 text-orange-700";

function LiveMapView({
  vehicles,
  sellers,
  gudang,
  dropPoints,
  phones,
  initialFocus,
  selectedVehicleId,
  onSelectVehicle,
  compact: compactProp,
  fullscreen = false,
  controlsContainer,
  onFilterOpenChange,
}: LiveMapProps) {
  const { data: contactDrivers } = useDriver();
  const contactPhones = Object.fromEntries((contactDrivers ?? []).map((d) => [String(d.id_driver), d.no_hp ?? ""]));

  // Compact OTOMATIS di layar kecil (HP): popup marker, search, dan legenda
  // jadi ramping biar gampang dipakai & gak nutup peta.
  const [isSmall, setIsSmall] = useState(false);

  const [show, setShow] = useState({ trucks: true, sellers: true, gudang: true, drop: true });
  const toggleLayer = (k: keyof typeof show) =>
    setShow((s) => ({ ...s, [k]: !s[k] }));

  const [legendOpen, setLegendOpen] = useState(!fullscreen);

  const uniqueVehicles = useMemo(() => {
    const seen = new Set<number>();
    return (vehicles ?? []).filter((v) => {
      if (!v || v.id_kendaraan == null) return false;
      if (seen.has(v.id_kendaraan)) return false;
      seen.add(v.id_kendaraan);
      return true;
    });
  }, [vehicles]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const fn = () => setIsSmall(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  const compact = isSmall || compactProp;

  // Gudang DINAMIS dari backend (tabel gudang). Fallback konstanta kalau kosong
  // (mis. mock) biar marker tetap tampil.
  const gudangList = useMemo<GudangPoint[]>(() => {
    if (gudang && gudang.length > 0) return gudang;
    return [
      { id_gudang: 98, nama_gudang: "Gudang Outgoing", tipe: "outgoing", latitude: OUTGOING_LAT, longitude: OUTGOING_LON },
      { id_gudang: 99, nama_gudang: "Gudang DC", tipe: "incoming", latitude: DC_LAT, longitude: DC_LON },
    ];
  }, [gudang]);

  const dropList = dropPoints ?? [];


  // Rute yang digambar saat seller/gateway diklik (dari Outgoing & DC).


  // Hanya tampilkan kendaraan yang AKTIF (online & sesi driver aktif atau ada update GPS fresh).
  // Kendaraan yang offline explicit / driver logout dihilangkan dari peta.
  const activeVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (!v.latitude || !v.longitude) return false;
      if (v.offline) return false;
      if (hasActiveSession(v.last_login)) return true;
      // Fallback untuk driver pickup / armada dengan GPS fresh (< 30 menit)
      const t = new Date(v.last_update).getTime();
      if (!Number.isNaN(t) && Date.now() - t < 30 * 60 * 1000) {
        return true;
      }
      return false;
    });
  }, [vehicles]);

  // Rute LIVE armada terpilih: dari posisi truk → stop berikutnya (ritase aktif).
  const selectedVehicle =
    activeVehicles.find((v) => v.id_kendaraan === selectedVehicleId) ??
    vehicles.find((v) => v.id_kendaraan === selectedVehicleId) ??
    null;
  const [vehiclePopupOpen, setVehiclePopupOpen] = useState(false);
  const activeRoute = useActiveRoute(selectedVehicle, sellers, dropList, gudangList);

  // Pencarian semua kategori (truk/seller/gudang/drop) + popup saat klik hasil.
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; ts: number } | null>(null);

  // Fokus dinamis (dari sidebar/tabel/pencarian) — aktifkan layer & buka popup
  useEffect(() => {
    if (!initialFocus) return;
    const { type, id } = initialFocus;
    if (type === "truck") {
      setShow((s) => ({ ...s, trucks: true }));
      onSelectVehicle(id);
      return;
    }
    const found =
      type === "seller"
        ? sellers.find((s) => s.id_seller === id)
        : type === "drop"
          ? dropList.find((p) => p.id_drop_point === id)
          : type === "gudang"
            ? gudangList.find((g) => g.id_gudang === id)
            : undefined;
    if (!found) return;
    const ts = Date.now();
    setFocusKey(`${type}:${id}:${ts}`);
    setFocus({ lat: found.latitude, lng: found.longitude, ts });
    if (type === "seller") setShow((s) => ({ ...s, sellers: true }));
    else if (type === "drop") setShow((s) => ({ ...s, drop: true }));
    else if (type === "gudang") setShow((s) => ({ ...s, gudang: true }));
  }, [initialFocus, sellers, dropList, gudangList, onSelectVehicle]);

  const searchItems = useMemo(() => {
    const items: { type: string; id: number; label: string; sub: string; lat: number; lng: number }[] = [
      ...activeVehicles.map((v) => ({
        type: "truck", id: v.id_kendaraan,
        label: v.plat_nomor || `Kend ${v.id_kendaraan}`,
        sub: v.nama_driver || "",
        lat: v.latitude, lng: v.longitude,
      })),
      ...sellers.map((s) => ({
        type: "seller", id: s.id_seller,
        label: s.nama_seller || `Seller ${s.id_seller}`,
        sub: [s.kode_seller, s.kota].filter(Boolean).join(" · "),
        lat: s.latitude, lng: s.longitude,
      })),
      ...dropList.map((p) => ({
        type: "drop", id: p.id_drop_point,
        label: p.nama_drop_point || `DP ${p.id_drop_point}`,
        sub: p.kode_dp || "",
        lat: p.latitude, lng: p.longitude,
      })),
      ...gudangList.map((g) => ({
        type: "gudang", id: g.id_gudang,
        label: g.nama_gudang || `Gudang ${g.id_gudang}`,
        sub: g.tipe,
        lat: g.latitude, lng: g.longitude,
      })),
    ];
    return items.filter(i => Number.isFinite(Number(i.lat)) && Number.isFinite(Number(i.lng)) && i.lat != null && i.lng != null && Math.abs(Number(i.lat)) <= 90 && Math.abs(Number(i.lng)) <= 180);
  }, [vehicles, sellers, dropList, gudangList]);

  const ql = q.trim().toLowerCase();
  const matches = ql
    ? searchItems.filter((i) => `${i.label} ${i.sub} ${typeLabel(i.type)}`.toLowerCase().replace(/[^a-z0-9]/g, "").includes(ql.replace(/[^a-z0-9]/g, "")))
    : [];

  const onPickSearch = (it: (typeof searchItems)[number]) => {
    setQ("");
    setOpen(false);
    // Aktifkan layer-nya dulu biar marker pasti ada sebelum popup dibuka.
    if (it.type === "truck") {
      setShow((s) => ({ ...s, trucks: true }));
      setFocus({ lat: Number(it.lat), lng: Number(it.lng), ts: Date.now() });
      onSelectVehicle(it.id);
      return;
    }
    if (it.type === "seller") setShow((s) => ({ ...s, sellers: true }));
    else if (it.type === "drop") setShow((s) => ({ ...s, drop: true }));
    else if (it.type === "gudang") setShow((s) => ({ ...s, gudang: true }));
    // ts = nonce biar klik berulang (item sama) tetap nge-trigger popup.
    const ts = Date.now();
    setFocus({ lat: it.lat, lng: it.lng, ts });
    setFocusKey(`${it.type}:${it.id}:${ts}`);
  };

  const layerControl = (
      <div data-map-control="layers"
        className={cn(
          controlsContainer ? "relative rounded-md border bg-white text-xs" : "absolute z-10 rounded-md border bg-white/95 shadow-sm",
          fullscreen ? "px-3 py-2" : compact
            ? "right-2.5 top-3 flex flex-col gap-1 p-1"
            : "right-3 top-3 rounded-lg px-2.5 py-2 text-[11px]"
        )}
      >
        <button
          type="button"
          aria-expanded={legendOpen}
          onClick={() => { setLegendOpen(!legendOpen); onFilterOpenChange?.(!legendOpen); }}
          className={cn(
            "flex w-full items-center justify-between gap-2 font-semibold text-slate-700",
            !compact && !fullscreen && "mb-1.5"
          )}
        >
          {(fullscreen || !compact) && <span>Filter</span>}
          {legendOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {legendOpen && (
          <div className={fullscreen ? "absolute right-0 bottom-full mb-3 w-60 max-w-[calc(100vw-32px)] space-y-1 rounded-xl border bg-white p-3 shadow-lg lg:bottom-auto lg:top-full lg:mb-0 lg:mt-3" : compact ? "flex flex-col items-center gap-1" : "space-y-0.5"}>
            <LegendToggle compact={fullscreen ? false : compact} label="Truk" color="#1e3a5f" active={show.trucks} onClick={() => toggleLayer("trucks")} />
            <LegendToggle compact={fullscreen ? false : compact} label="Seller" color="#10b981" active={show.sellers} onClick={() => toggleLayer("sellers")} />
            <LegendToggle compact={fullscreen ? false : compact} label="Gudang Outgoing" color="#0ea5e9" active={show.gudang} onClick={() => toggleLayer("gudang")} />
            <LegendToggle compact={fullscreen ? false : compact} label="Gudang DC" color="#7c3aed" active={show.gudang} onClick={() => toggleLayer("gudang")} />
            <LegendToggle compact={fullscreen ? false : compact} label="Gateway" color="#f97316" active={show.drop} onClick={() => toggleLayer("drop")} />
          </div>
        )}
      </div>
  );

  return (
    <div className="relative h-full w-full">
      {/* Pencarian semua kategori → klik hasil buka popup */}
      <div
        className={cn(
          fullscreen ? "absolute left-3 bottom-20 z-20 lg:bottom-3" : "absolute left-3 bottom-3 z-20",
          compact ? "w-40 max-w-[75%]" : "w-56 max-w-[75%]"
        )}
      >
        <div className="relative">
          <Search
            className={cn(
              "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400",
              compact ? "h-3.5 w-3.5" : "h-4 w-4"
            )}
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={compact ? "Cari di peta..." : "Cari truk, seller, gudang, gateway..."}
            className={cn(
              "w-full border border-slate-200 bg-white shadow-sm outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/20 font-semibold placeholder:font-semibold placeholder:text-slate-500",
              compact
                ? "h-8 rounded-md pl-7 pr-7 text-xs"
                : "h-9 rounded-lg pl-8 pr-8 text-sm"
            )}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setOpen(false);
              }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600",
                compact ? "right-2 text-xs" : "right-2 text-sm"
              )}
              aria-label="Bersihkan pencarian"
            >
              ✕
            </button>
          )}
        </div>
        {open && ql && (
          <div className="absolute bottom-full mb-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Tidak ditemukan</p>
            ) : (
              matches.slice(0, 30).map((it, i) => (
                <button
                  key={`${it.type}-${it.id}-${i}`}
                  type="button"
                  onClick={() => onPickSearch(it)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", typeColor(it.type))}>
                    {typeLabel(it.type)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-700">{it.label}</span>
                    {it.sub && <span className="block truncate text-[10px] text-slate-400">{it.sub}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <MapContainer
        key="live-map"
        center={JAKARTA}
        zoom={12}
        minZoom={11}
        maxBounds={TANGERANG_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapAutoResize />
        <FitBounds vehicles={activeVehicles} sellers={sellers} gudang={gudangList} dropPoints={dropList} />
        <FocusSelected vehicles={activeVehicles} selectedVehicleId={selectedVehicleId} />

        {/* Gudang (Outgoing biru / DC ungu) — dinamis, bisa difilter */}
        {show.gudang &&
          gudangList.map((g) => {
            const isOutgoing = g.tipe === "outgoing";
            return (

              <PoiMarker
                key={`gudang-${g.id_gudang}`}
                poiKey={`gudang:${g.id_gudang}`}
                position={[g.latitude, g.longitude]}
                icon={isOutgoing ? OUTGOING_ICON : DC_ICON}
                focusKey={focusKey}
              >
                <Popup autoPan={false}>   {/* ⬅️ INI — tambahkan autoPan={false} di sini */}
                  <div className={compact ? "min-w-[110px] text-xs" : "min-w-[180px] text-sm"}>
                    <p className={isOutgoing ? "font-semibold text-sky-600" : "font-semibold text-[#7c3aed]"}>
                      {isOutgoing ? "Gudang Outgoing" : "Distribution Center (DC)"}
                    </p>
                    {!compact && (
                      <p className="text-xs text-muted-foreground">
                        {isOutgoing
                          ? "Titik muat keberangkatan — acuan jarak \"Outgoing\" tiap seller."
                          : "Gudang DC (Buaran Indah) — acuan jarak \"DC\" tiap seller."}
                      </p>
                    )}
                  </div>
                </Popup>
              </PoiMarker>
            );
          })}

        {/* Drop points (Gateway JKT / SEG) — dinamis, oranye, bisa difilter; klik → rute */}
        {show.drop &&
          dropList.map((p) => (
            <PoiMarker
              key={`dp-${p.id_drop_point}`}
              poiKey={`drop:${p.id_drop_point}`}
              position={[p.latitude, p.longitude]}
              icon={DROP_ICON}
              focusKey={focusKey}
            >
              <Popup autoPan={false}>   {/* ⬅️ INI — tambahkan autoPan={false} di sini */}
                <div className={compact ? "min-w-[120px] text-xs" : "min-w-[180px] text-sm"}>
                  <p className="font-semibold text-orange-600">
                    {p.nama_drop_point || `Gateway ${p.id_drop_point}`}
                  </p>
                  {p.kode_dp && (
                    <p className="text-xs text-muted-foreground">Kode: {p.kode_dp}</p>
                  )}
                  {!compact && (
                    <>
                      <p className="text-xs text-muted-foreground">Gateway</p>
                      {(p.jarak_tempuh_km != null || p.jarak_dc_km != null) && (
                        <div className="mt-1 space-y-0.5">
                          {p.jarak_tempuh_km != null && (
                            <p className="text-xs font-medium text-sky-600">
                              Outgoing: <b>{p.jarak_tempuh_km.toFixed(1)} km</b>
                            </p>
                          )}
                          {p.jarak_dc_km != null && (
                            <p className="text-xs font-medium text-violet-600">
                              DC: <b>{p.jarak_dc_km.toFixed(1)} km</b>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Popup>
            </PoiMarker>
          ))}

        {/* Seller / Implan — bisa difilter; ada bubble AWB & form update barang */}
        {show.sellers &&
          sellers.map((s) => (
            <PoiMarker
              key={`seller-${s.id_seller}`}
              poiKey={`seller:${s.id_seller}`}
              position={[s.latitude, s.longitude]}
              icon={getSellerIcon(s.jumlah_barang, s.status_pickup)}
              focusKey={focusKey}
            >
              <Popup autoPan={false}>    {/* ⬅️ INI — tambahkan autoPan={false} di sini */}
                <div className={compact ? "min-w-[140px] text-xs" : "min-w-[200px] text-sm"}>
                  {s.nama_seller && (
                    <p className="w-full break-words font-semibold text-emerald-700">
                      {s.nama_seller}
                      {s.kode_seller && (
                        <span className="ml-1 text-[10px] font-normal text-slate-400">({s.kode_seller})</span>
                      )}
                    </p>
                  )}
                  {s.alamat && (
                    <p className={compact ? "max-w-[150px] truncate text-xs text-muted-foreground" : "text-xs text-muted-foreground"}>
                      {s.alamat}
                    </p>
                  )}
                  {!compact && (
                    <>
                      <p className="text-xs text-muted-foreground">{s.kota}</p>
                      {(s.jarak_tempuh_km != null || s.jarak_dc_km != null) && (
                        <div className="mt-1 space-y-0.5">
                          {s.jarak_tempuh_km != null && (
                            <p className="text-xs font-medium text-sky-600">
                              Outgoing: <b>{s.jarak_tempuh_km.toFixed(1)} km</b>
                            </p>
                          )}
                          {s.jarak_dc_km != null && (
                            <p className="text-xs font-medium text-violet-600">
                              DC: <b>{s.jarak_dc_km.toFixed(1)} km</b>
                            </p>
                          )}
                        </div>
                      )}
                      {s.pic && <p className="mt-1 text-xs">PIC: <b>{s.pic}</b></p>}
                      {(s.total_koli != null && s.total_koli! > 0) || (s.total_ecer != null && s.total_ecer! > 0) || (s.total_high_value != null && s.total_high_value! > 0) ? (
                        <p className="mt-1 text-xs font-medium text-amber-600">
                          Muatan: <b>{s.total_koli ?? 0} koli</b>
                          {(s.total_ecer != null && s.total_ecer! > 0) && ` • ${s.total_ecer} ecer`}
                          {(s.total_high_value != null && s.total_high_value! > 0) && ` • ${s.total_high_value} HV`}
                        </p>
                      ) : null}
                      {s.no_hp && (
                        <WhatsAppContact phone={s.no_hp} />
                      )}
                    </>
                  )}
                </div>
              </Popup>
            </PoiMarker>
          ))}

        {/* Truk TIDAK dikluster — selalu keliatan satu-satu. Hanya armada aktif yang online. */}
        {show.trucks &&
          activeVehicles.map((v) => (
            <VehicleMarker
              onPopupChange={setVehiclePopupOpen}
              hidePopup={fullscreen}
              key={`vehicle-${v.id_kendaraan}`}
              vehicle={v}
              selected={selectedVehicleId === v.id_kendaraan}
              onSelect={() => onSelectVehicle(v.id_kendaraan)}
              phones={contactPhones}
              compact={compact}
              isCompleted={
                selectedVehicleId === v.id_kendaraan
                  ? v.role_driver === "driver_pickup"
                    ? v.status === "Selesai"
                    : activeRoute.isCompleted
                  : false
              }
              kode={selectedVehicleId === v.id_kendaraan ? activeRoute.kode : null}
              eta={
                selectedVehicleId === v.id_kendaraan && activeRoute.next && activeRoute.route
                  ? {
                    label: activeRoute.next.point.label,
                    km: `${(activeRoute.route.distanceMeters / 1000).toFixed(1)} km`,
                    durationSeconds: activeRoute.route.durationSeconds,
                  }
                  : null
              }
            />
          ))}


        {/* Rute LIVE armada terpilih — emerald, dari posisi truk ke tujuan berikutnya */}
        {activeRoute.route && activeRoute.route.points.length > 1 && activeRoute.next && (
          <>
            <Polyline
              positions={activeRoute.route.points}
              pathOptions={{ color: "#10b981", weight: 5, opacity: 0.85 }}
            />
            <Marker
              position={[activeRoute.next.point.lat, activeRoute.next.point.lng]}
              icon={activeRoute.next.point.icon}
            >
              <Popup>
                <p className="text-xs font-semibold text-emerald-700">
                  {activeRoute.next.point.label}
                </p>
                <p className="text-[11px] text-slate-500">Tujuan berikutnya</p>
              </Popup>
            </Marker>
          </>
        )}

        {/* Fokus hasil pencarian (bukan truk) → zoom; popup dibuka PoiMarker */}
        <FocusPoi focus={focus} />
      </MapContainer>

      {/* Route chip — fullscreen: top center sejajar filter; non-fullscreen: bottom di atas search bar */}
      {!compact && !open && !vehiclePopupOpen && !activeRoute.isCompleted && activeRoute.next && activeRoute.route && (
        <div className={cn(
          "pointer-events-auto z-20 overflow-hidden rounded-lg border border-emerald-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm",
          fullscreen
            ? "absolute left-1/2 top-3 -translate-x-1/2"
            : "absolute bottom-20 left-3 right-3 sm:right-auto sm:max-w-[calc(100%-24px)]"
        )}>
          <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
            <span className="truncate font-semibold text-emerald-700">
              {activeRoute.kode ?? "RIT"} → {activeRoute.next.point.label}
            </span>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-emerald-700">
              {(activeRoute.route.distanceMeters / 1000).toFixed(1)} km
            </span>
            <span className="shrink-0 whitespace-nowrap tabular-nums text-emerald-600">
              Estimasi {fmtArrival(activeRoute.route.durationSeconds)} WIB
              <span className="ml-1 text-[10px] text-emerald-400">
                ({fmtDuration(activeRoute.route.durationSeconds)})
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Legend filter — z-10: di atas peta tapi di bawah header sticky (z-30) */}
      {/* Legend filter — collapsible */}
      {controlsContainer ? createPortal(layerControl, controlsContainer) : layerControl}
    </div>

  );
}

/** Popup info untuk titik Implan (Seller): informasi toko, jarak, & status muatan AWB (read-only) */
function SellerPopupContent({
  seller,
  compact,
}: {
  seller: SellerLocation;
  compact?: boolean;
}) {
  const isDiambil = seller.status_pickup === "sudah_diambil";
  const hasMuatan = (seller.jumlah_barang != null && seller.jumlah_barang > 0) || (seller.koli != null && seller.koli > 0);

  return (
    <div className={compact ? "min-w-[140px] text-xs" : "min-w-[200px] max-w-[260px] text-xs"}>
      {/* Header Info Toko */}
      <div>
        <p className="font-bold text-sky-800 text-sm">
          {seller.nama_seller}
          {seller.kode_seller && (
            <span className="ml-1 text-[10px] font-normal text-slate-400">({seller.kode_seller})</span>
          )}
        </p>
        {seller.alamat && (
          <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{seller.alamat}</p>
        )}
        {seller.kota && (
          <p className="text-[10px] text-slate-400">{seller.kota}</p>
        )}
        {seller.no_hp && (
          <a
            href={`tel:${seller.no_hp.replace(/[^+\d]/g, "")}`}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline"
          >
            <Phone className="h-3 w-3" /> Telpon: {seller.no_hp}
          </a>
        )}
      </div>

      {/* Info Muatan / AWB Hari Ini (Read-only) */}
      {hasMuatan && (
        <div className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/80 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-bold text-slate-800 text-xs">
              <Package className="h-3.5 w-3.5 text-amber-500" />
              {seller.jumlah_barang ?? 0} AWB
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                isDiambil ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              )}
            >
              {isDiambil ? "✓ Sudah Diambil" : "⏳ Menunggu"}
            </span>
          </div>
          {(seller.koli != null && seller.koli > 0) && (
            <p className="mt-0.5 text-[10px] text-slate-500 font-medium">
              {seller.koli} Koli {seller.ecer ? `• ${seller.ecer} Ecer` : ""} {seller.high_value ? `• ${seller.high_value} HV` : ""}
            </p>
          )}
          {seller.catatan_pickup && (
            <p className="mt-1 text-[10px] italic text-slate-600">"{seller.catatan_pickup}"</p>
          )}
        </div>
      )}

      {/* Jarak dari Gudang Outgoing & DC */}
      {(seller.jarak_tempuh_km != null || seller.jarak_dc_km != null) && (
        <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-1.5 text-[11px]">
          {seller.jarak_tempuh_km != null && (
            <p className="font-medium text-sky-700">
              Outgoing: <span className="font-bold">{seller.jarak_tempuh_km.toFixed(1)} km</span>
            </p>
          )}
          {seller.jarak_dc_km != null && (
            <p className="font-medium text-violet-700">
              DC: <span className="font-bold">{seller.jarak_dc_km.toFixed(1)} km</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Baris legenda yang bisa diklik (filter layer). Mode compact = dot-only + tooltip. */
function LegendToggle({
  label,
  color,
  active,
  onClick,
  compact,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded transition-colors hover:bg-slate-100",
        compact ? "justify-center p-0.5" : "gap-2 px-1.5 py-1 text-left",
        !active && "opacity-40"
      )}
      title={active ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
    >
      <span
        className={cn(
          "inline-block shrink-0 rounded-full border-2 border-white shadow",
          compact ? "h-2.5 w-2.5" : "h-3 w-3"
        )}
        style={{ backgroundColor: active ? color : "#e2e8f0" }}
      />
      {!compact && (
        <span className={cn("text-slate-600", !active && "line-through")}>{label}</span>
      )}
    </button>
  );
}

/** Comparator: hanya render ulang kalau ada yang BERUBAH (posisi/status/id), bukan tiap poll. */
function liveMapPropsEqual(prev: LiveMapProps, next: LiveMapProps): boolean {
  if (prev.controlsContainer !== next.controlsContainer || prev.onFilterOpenChange !== next.onFilterOpenChange) return false;
  if (prev.fullscreen !== next.fullscreen || prev.onSelectVehicle !== next.onSelectVehicle) return false;
  if (prev.selectedVehicleId !== next.selectedVehicleId) return false;
  if (prev.initialFocus !== next.initialFocus) return false;
  if (prev.phones !== next.phones) return false;

  const vSig = (arr?: TrackingVehicle[]) =>
    (arr ?? [])
      .map((v) =>
        [v.id_kendaraan, v.latitude?.toFixed(5), v.longitude?.toFixed(5), v.offline, v.last_login, v.id_ritase, v.last_update, v.total_awb, v.role_driver].join(":")
      )
      .join("|");
  const sSig = (arr?: SellerLocation[]) =>
    (arr ?? []).map((s) => [s.id_seller, s.latitude.toFixed(5), s.longitude.toFixed(5), s.jumlah_barang, s.status_pickup].join(":")).join("|");
  const gSig = (arr?: GudangPoint[]) =>
    (arr ?? []).map((g) => [g.id_gudang, g.latitude.toFixed(5), g.longitude.toFixed(5)].join(":")).join("|");
  const dSig = (arr?: DropPointPoi[]) =>
    (arr ?? []).map((p) => [p.id_drop_point, p.latitude.toFixed(5), p.longitude.toFixed(5)].join(":")).join("|");

  return (
    vSig(prev.vehicles) === vSig(next.vehicles) &&
    sSig(prev.sellers) === sSig(next.sellers) &&
    gSig(prev.gudang) === gSig(next.gudang) &&
    dSig(prev.dropPoints) === dSig(next.dropPoints)
  );
}

export const LiveMap = memo(LiveMapView, liveMapPropsEqual);

