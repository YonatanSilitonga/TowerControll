"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { ChevronDown, ChevronUp, Phone, Search } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type {
  DropPointPoi,
  GudangPoint,
  RitaseEvent,
  RitaseStop,
  SellerLocation,
  TrackingVehicle,
} from "@/types/armada";
import { useRitaseDetail } from "@/hooks/use-armada";
import { displayTrackingStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";


// Tile CARTO (gratis & lebih cepat dari OSM publik) — render area baru jauh lebih responsif.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
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

// Ikon dibuat SEKALI di level modul & DIBAGIKAN antar marker.
// Sebelumnya: `createTruckIcon(...)`/`createSellerIcon()` dipanggil per marker per
// render → tiap poll 10 detik semua marker di-setIcon ulang → keliatan "refresh terus".
// Leaflet icon itu stateless, aman dipakai bareng (shared instance).
const TRUCK_ICON = createTruckIcon(false);
const TRUCK_ICON_SELECTED = createTruckIcon(true);
const SELLER_ICON = createSellerIcon();
const OUTGOING_ICON = createGudangIcon("#0ea5e9", "outgoing");
const DC_ICON = createGudangIcon("#7c3aed", "dc");
const DROP_ICON = createGudangIcon("#f97316", "outgoing");

function createTruckIcon(selected: boolean) {
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: "",
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 5],
    html: `
      <div style="position:relative;width:${size}px;height:${size + 6}px;">
        <svg width="${size}" height="${size + 6}" viewBox="0 0 24 30" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 8.5 12 18 12 18s12-9.5 12-18C24 5.4 18.6 0 12 0z"
                fill="${selected ? "#ff8f00" : "#1e3a5f"}" stroke="#fff" stroke-width="1.5"/>
        </svg>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"
             style="position:absolute;top:${size * 0.24}px;left:50%;transform:translateX(-50%);">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
        ${selected ? `<div style="position:absolute;inset:-3px;border-radius:50%;border:2px solid #ff8f00;opacity:.5;animation:pulseRing 1.6s ease-out infinite;"></div>` : ""}
      </div>`,
  });
}

function createSellerIcon() {
  return L.divIcon({
    className: "",
    iconSize: [22, 28],
    iconAnchor: [11, 27],
    html: `
      <div style="position:relative;width:22px;height:28px;">
        <svg width="22" height="28" viewBox="0 0 22 28" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
          <path d="M11 0C4.9 0 0 4.9 0 11c0 7.7 11 17 11 17s11-9.3 11-17C22 4.9 17.1 0 11 0z"
                fill="#10b981" stroke="#fff" stroke-width="1.5"/>
        </svg>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"
             style="position:absolute;top:6px;left:50%;transform:translateX(-50%);">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
        </svg>
      </div>`,
  });
}

function createGudangIcon(color: string, variant: "outgoing" | "dc") {
  const innerSvg =
    variant === "outgoing"
      ? `<path d="M3 21h18"/><path d="M5 21V7l7-5 7 5v14"/><path d="M9 21v-6h6v6"/>`
      : `<rect x="3" y="7" width="18" height="14" rx="1.5"/><path d="M3 11h18"/><path d="M8 3v4"/><path d="M16 3v4"/>`;
  return L.divIcon({
    className: "",
    iconSize: [24, 30],
    iconAnchor: [12, 29],
    html: `
      <div style="position:relative;width:24px;height:30px;">
        <svg width="24" height="30" viewBox="0 0 24 30" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 8.5 12 18 12 18s12-9.5 12-18C24 5.4 18.6 0 12 0z"
                fill="${color}" stroke="#fff" stroke-width="1.8"/>
        </svg>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round"
             style="position:absolute;top:7px;left:50%;transform:translateX(-50%);">
          ${innerSvg}
        </svg>
      </div>`,
  });
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
  selected,
  onSelect,
  phones,
  compact,
  eta,
}: {
  vehicle: TrackingVehicle;
  selected: boolean;
  onSelect: () => void;
  phones?: Record<string, string>;
  compact?: boolean;
  /** Info estimasi waktu rute live armada ini (kalau terpilih & punya rute aktif). */
  eta?: { label: string; km: string; durationSeconds: number } | null;
}) {
  const markerRef = useRef<L.Marker>(null);
  const lastT = new Date(v.last_update).getTime();
  const stale = !Number.isNaN(lastT) && Date.now() - lastT > 5 * 60 * 1000;
  const phone = v.nama_driver ? phones?.[v.nama_driver.toLowerCase()] : undefined;

  useEffect(() => {
    if (selected) markerRef.current?.openPopup();
    else markerRef.current?.closePopup();
  }, [selected]);

  return (
    <Marker
      ref={markerRef}
      position={[v.latitude, v.longitude]}
      icon={selected ? TRUCK_ICON_SELECTED : TRUCK_ICON}
      eventHandlers={{ click: onSelect }}
    >
      
     
      <Popup>
        <div className={compact ? "min-w-[110px] text-xs" : "min-w-[210px] text-sm"}>
          <p className="font-semibold text-[#1e3a5f]">{v.plat_nomor || "-"}</p>
          <p className="text-xs text-muted-foreground">Driver: {v.nama_driver || "-"}</p>
          {!compact && (
            <p className="text-xs">
              Status: {v.offline ? "Offline" : displayTrackingStatus(v.status, v.kecepatan, v.last_update)}
            </p>
          )}
          {!compact && !stale && <p className="text-xs">Kecepatan: {v.kecepatan ?? 0} km/h</p>}
          <p className={stale ? "text-xs font-medium text-amber-600" : "text-xs text-muted-foreground"}>
            Update: {minutesAgo(v.last_update)}
          </p>
          {!compact && v.last_open && (
            <p className="text-xs text-muted-foreground">App dibuka: {minutesAgo(v.last_open)}</p>
          )}
          {/* Estimasi waktu rute live armada — hanya untuk truk terpilih yang punya rute aktif */}
          {eta && (
            compact ? (
              <p className="mt-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                Next: {eta.label} · {eta.km} · ETA {fmtArrival(eta.durationSeconds)}
              </p>
            ) : (
              <div className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px]">
                <p className="font-medium text-emerald-700">Next: {eta.label}</p>
                <p className="text-emerald-700">
                  Estimasi tiba <b>{fmtArrival(eta.durationSeconds)}</b> · {eta.km} · {fmtDuration(eta.durationSeconds)}
                </p>
                <p className="mt-1 border-t border-emerald-200/70 pt-1 text-[10px] italic leading-snug text-emerald-700/70">
                  Hanya estimasi dari perhitungan rute — kondisi jalan & kecepatan aktual tidak dihitung, jadi bisa berbeda dari kenyataan.
                </p>
              </div>
            )
          )}
          {!compact && phone && (
            <a
              href={`tel:${phone.replace(/[^+\d]/g, "")}`}
              style={{ color: "#fff" }}
              className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Phone className="h-3.5 w-3.5" /> Telpon Driver
            </a>
          )}
        </div>
      </Popup>
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
    <Marker ref={ref} position={position} icon={icon} eventHandlers={onClick ? { click: onClick } : undefined}>
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
  if (stop.jenis_stop === "seller" && stop.id_seller != null) {
    const s = sellers.find((x) => x.id_seller === stop.id_seller);
    if (s)
      return {
        lat: s.latitude, lng: s.longitude,
        label: s.nama_seller || `Seller ${s.id_seller}`,
        icon: SELLER_ICON, kind: "seller",
      };
  }
if ((stop.jenis_stop === "drop_point" || stop.jenis_stop === "gateway") && stop.id_drop_point != null) {
      const p = dropList.find((x) => x.id_drop_point === stop.id_drop_point);
      if (p)
        return {
          lat: p.latitude, lng: p.longitude,
          label: p.nama_drop_point || `Gateway ${p.id_drop_point}`,
          icon: DROP_ICON, kind: "drop",
        };
    }
  if (stop.jenis_stop === "gudang" && stop.id_gudang != null) {
    const g = gudangList.find((x) => x.id_gudang === stop.id_gudang);
    if (g)
      return {
        lat: g.latitude, lng: g.longitude,
        label: g.nama_gudang || `Gudang ${g.id_gudang}`,
        icon: g.tipe === "outgoing" ? OUTGOING_ICON : DC_ICON,
        kind: "gudang",
      };
  }
  return null;
}

/** Tentukan stop berikutnya: stop urutan terkecil yang BELUM dikunjungi.
 *  "Dikunjungi" = ada event kedatangan (sampai_gudang/sampai_seller) yang lokasinya
 *  dekat (< 500m) dengan stop itu. Tanpa event → stop pertama. */
function findNextStop(
  stops: RitaseStop[],
  points: (StopPoint | null)[],
  events: RitaseEvent[]
): { stop: RitaseStop; point: StopPoint } | null {
  const resolved = stops
    .map((s, i) => ({ stop: s, point: points[i], idx: i }))
    .filter((x): x is { stop: RitaseStop; point: StopPoint; idx: number } => !!x.point);
  if (resolved.length === 0) return null;

  const arrivals = [...events]
    .filter(
      (e) =>
        e.latitude != null &&
        e.longitude != null &&
        (e.status === "sampai_gudang" || e.status === "sampai_seller")
    )
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (arrivals.length === 0) {
    return { stop: resolved[0].stop, point: resolved[0].point };
  }

  // Cocokkan event kedatangan TERAKHIR ke stop terdekat → next = stop setelahnya.
  const last = arrivals[0];
  let lastIdx = -1;
  let best = Infinity;
  resolved.forEach((r) => {
    const d = haversineM(r.point.lat, r.point.lng, last.latitude!, last.longitude!);
    if (d < best) {
      best = d;
      lastIdx = r.idx;
    }
  });
  if (lastIdx < 0) return { stop: resolved[0].stop, point: resolved[0].point };

  const next = resolved.find((r) => r.idx === lastIdx + 1);
  return next ? { stop: next.stop, point: next.point } : null;
}

/**
 * Rute live armada terpilih: dari POSISI TRUCK saat ini ke stop berikutnya (ritase aktif).
 * Re-fetch OSRM cuma kalau truk pindah > 150 m atau stop berubah (hemat request).
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
} {
  const idRitase = vehicle?.id_ritase ?? undefined;
  const { data: rit } = useRitaseDetail(idRitase);
  const stops = rit?.stops ?? [];
  const events = rit?.events ?? [];

  const next = useMemo(() => {
    if (!vehicle || !rit || rit.status === "selesai") return null;
    const points = stops.map((s) => resolveStopPoint(s, sellers, dropList, gudangList));
    return findNextStop(stops, points, events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.id_kendaraan, rit, stops, events, sellers, dropList, gudangList]);

  const [route, setRoute] = useState<RouteResult | null>(null);
  const lastKeyRef = useRef("");
  const lastPosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!vehicle || !next) {
      setRoute(null);
      lastKeyRef.current = "";
      lastPosRef.current = null;
      return;
    }
    const key = `${vehicle.id_kendaraan}:${next.stop.id_stop}`;
    const moved =
      !lastPosRef.current ||
      haversineM(
        vehicle.latitude, vehicle.longitude,
        lastPosRef.current[0], lastPosRef.current[1]
      ) > 150;
    if (lastKeyRef.current === key && !moved) return;

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
  }, [vehicle, next]);

  return { next, route, kode: rit?.kode_ritase ?? null };
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
}: LiveMapProps) {
  // Compact OTOMATIS di layar kecil (HP): popup marker, search, dan legenda
  // jadi ramping biar gampang dipakai & gak nutup peta.
  const [isSmall, setIsSmall] = useState(false);

   const [show, setShow] = useState({ trucks: true, sellers: true, gudang: true, drop: true });
  const toggleLayer = (k: keyof typeof show) =>
    setShow((s) => ({ ...s, [k]: !s[k] }));

  const [legendOpen, setLegendOpen] = useState(true);
  
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
  const [routes, setRoutes] = useState<{
    targetKey: string;
    out?: [number, number][];
    dc?: [number, number][];
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const drawRoute = async (targetKey: string, lat: number, lng: number) => {
    // Rute untuk target ini SUDAH ada → biarkan (jangan clear/refetch).
    if (routes?.targetKey === targetKey) return;
    setRouteLoading(true);
    setRoutes(null);
    const [out, dc] = await Promise.all([
      fetchRoute(OUTGOING_LAT, OUTGOING_LON, lat, lng),
      fetchRoute(DC_LAT, DC_LON, lat, lng),
    ]);
    setRoutes({ targetKey, out: out?.points, dc: dc?.points });
    setRouteLoading(false);
  };

  const onSelectSeller = (s: SellerLocation) =>
    drawRoute(`seller:${s.id_seller}`, s.latitude, s.longitude);
  const onSelectDrop = (p: DropPointPoi) =>
    drawRoute(`drop:${p.id_drop_point}`, p.latitude, p.longitude);

  // Rute LIVE armada terpilih: dari posisi truk → stop berikutnya (ritase aktif).
  const selectedVehicle =
    vehicles.find((v) => v.id_kendaraan === selectedVehicleId) ?? null;
  const activeRoute = useActiveRoute(selectedVehicle, sellers, dropList, gudangList);

  // Pencarian semua kategori (truk/seller/gudang/drop) + popup saat klik hasil.
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; ts: number } | null>(null);

  // Fokus awal (dari tabel armada via `initialFocus`) — aktifkan layer & buka popup sekali.
  const initialedRef = useRef(false);
  useEffect(() => {
    if (!initialFocus || initialedRef.current) return;
    const { type, id } = initialFocus;
    const found =
      type === "seller"
        ? sellers.find((s) => s.id_seller === id)
        : type === "drop"
        ? dropList.find((p) => p.id_drop_point === id)
        : type === "gudang"
        ? gudangList.find((g) => g.id_gudang === id)
        : undefined;
    if (!found) return;
    initialedRef.current = true;
    const ts = Date.now();
    setFocusKey(`${type}:${id}:${ts}`);
    setFocus({ lat: found.latitude, lng: found.longitude, ts });
    if (type === "seller") setShow((s) => ({ ...s, sellers: true }));
    else if (type === "drop") setShow((s) => ({ ...s, drop: true }));
    else if (type === "gudang") setShow((s) => ({ ...s, gudang: true }));
  }, [initialFocus, sellers, dropList, gudangList]);

  const searchItems = useMemo(() => {
    const items: { type: string; id: number; label: string; sub: string; lat: number; lng: number }[] = [
      ...vehicles.map((v) => ({
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
    return items;
  }, [vehicles, sellers, dropList, gudangList]);

  const ql = q.trim().toLowerCase();
  const matches = ql
    ? searchItems.filter((i) => `${i.label} ${i.sub}`.toLowerCase().includes(ql))
    : [];

  const onPickSearch = (it: (typeof searchItems)[number]) => {
    setQ("");
    setOpen(false);
    // Aktifkan layer-nya dulu biar marker pasti ada sebelum popup dibuka.
    if (it.type === "truck") {
      setShow((s) => ({ ...s, trucks: true }));
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

  return (
    <div className="relative h-full w-full">
      {/* Pencarian semua kategori → klik hasil buka popup */}
      <div
        className={cn(
          "absolute left-1/2 top-3 z-20 -translate-x-1/2",
          compact ? "w-48 max-w-[80%]" : "w-72 max-w-[85%]"
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
            placeholder={compact ? "Cari di peta..." : "Cari truk, seller, gudang, drop..."}
            className={cn(
              "w-full border border-slate-200 bg-white shadow-sm outline-none focus:border-[#0c1e3a] focus:ring-2 focus:ring-[#0c1e3a]/20",
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
          <div className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
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
        <FitBounds vehicles={vehicles} sellers={sellers} gudang={gudangList} dropPoints={dropList} />
        <FocusSelected vehicles={vehicles} selectedVehicleId={selectedVehicleId} />
        <FitRoutes routes={routes} />

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
              <Popup>
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
            onClick={() => onSelectDrop(p)}
          >
            <Popup>
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

        {/* Seller — bisa difilter; klik → gambar rute dari Outgoing & DC */}
        {show.sellers &&
          sellers.map((s) => (
          <PoiMarker
            key={`seller-${s.id_seller}`}
            poiKey={`seller:${s.id_seller}`}
            position={[s.latitude, s.longitude]}
            icon={SELLER_ICON}
            focusKey={focusKey}
            onClick={() => onSelectSeller(s)}
          >
            <Popup>
              <div className={compact ? "min-w-[140px] text-xs" : "min-w-[200px] text-sm"}>
                {s.nama_seller && (
                  <p className="font-semibold text-emerald-700">
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
                    {s.no_hp && (
                      <a
                        href={`tel:${s.no_hp.replace(/[^+\d]/g, "")}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        <Phone className="h-3 w-3" /> Telpon: {s.no_hp}
                      </a>
                    )}
                  </>
                )}
              </div>
            </Popup>
          </PoiMarker>
        ))}

        {/* Truk TIDAK dikluster — selalu keliatan satu-satu. Bisa difilter. */}
        {show.trucks &&
          vehicles.map((v) => (
          <VehicleMarker
            key={`vehicle-${v.id_kendaraan}`}
            vehicle={v}
            selected={selectedVehicleId === v.id_kendaraan}
            onSelect={() => onSelectVehicle(v.id_kendaraan)}
            phones={phones}
            compact={compact}
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

        {/* Rute hasil klik seller — biru dari Outgoing, ungu dari DC */}
        {routes?.out && routes.out.length > 1 && (
          <Polyline positions={routes.out} pathOptions={{ color: "#0ea5e9", weight: 4, opacity: 0.75 }} />
        )}
        {routes?.dc && routes.dc.length > 1 && (
          <Polyline positions={routes.dc} pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.75 }} />
        )}

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

      {/* Chip info + tutup rute */}
      {(routeLoading || routes) && (
        <div
          className={cn(
            "absolute bottom-3 left-3 z-10 rounded-md border bg-white/95 shadow-sm",
            compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-[11px]"
          )}
        >
          {routeLoading ? (
            <p className="text-slate-500">Menggambar rute...</p>
          ) : compact ? (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Rute dari gudang</span>
              <i className="inline-block h-2 w-2 rounded-full bg-sky-500" />
              <i className="inline-block h-2 w-2 rounded-full bg-violet-500" />
              <button
                type="button"
                onClick={() => setRoutes(null)}
                className="font-semibold text-slate-500 hover:text-rose-600"
                aria-label="Tutup rute"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <p className="mb-1 font-semibold text-slate-700">Rute dari gudang:</p>
              <p className="flex items-center gap-1.5 text-sky-600">
                <i className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Dari Gudang Outgoing
              </p>
              <p className="flex items-center gap-1.5 text-violet-600">
                <i className="inline-block h-2 w-2 rounded-full bg-violet-500" /> Dari Gudang DC
              </p>
              <button
                type="button"
                onClick={() => setRoutes(null)}
                className="mt-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                Tutup rute ✕
              </button>
            </>
          )}
        </div>
      )}

      {/* Chip rute LIVE armada terpilih — posisi truk → tujuan berikutnya */}
      {activeRoute.next && activeRoute.route && (
        <div
          className={cn(
            "absolute z-10 rounded-md border bg-white/95 shadow-sm",
            compact
              ? "left-3 top-3 max-w-[65%] px-2.5 py-1.5 text-[10px]"
              : "bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap px-3 py-1.5 text-[11px]"
          )}
        >
          <span className={cn("flex items-center gap-1.5", compact && "w-full")}>
            <span className="min-w-0 truncate font-semibold text-slate-700">
              {activeRoute.kode ?? "RIT"} → {activeRoute.next.point.label}
            </span>
            <span className="shrink-0 text-slate-400">·</span>
            <span className="shrink-0 font-semibold tabular-nums text-emerald-700">
              {(activeRoute.route.distanceMeters / 1000).toFixed(1)} km
            </span>
            {!compact && (
              <>
                <span className="text-slate-400">·</span>
                <span className="tabular-nums text-slate-600">
                  Estimasi {fmtArrival(activeRoute.route.durationSeconds)}
                  <span className="ml-1 text-[10px] text-slate-400">
                    ({fmtDuration(activeRoute.route.durationSeconds)})
                  </span>
                </span>
              </>
            )}
          </span>
          {!compact && (
            <span className="text-[10px] text-slate-400">
              Estimasi rute — kondisi jalan & kecepatan aktual tidak dihitung
            </span>
          )}
        </div>
      )}

      {/* Legend filter — z-10: di atas peta tapi di bawah header sticky (z-30) */}
      {/* Legend filter — collapsible */}
      <div
        className={cn(
          "absolute z-10 rounded-md border bg-white/95 shadow-sm",
          compact
            ? "right-2.5 top-3 flex flex-col gap-1 p-1"
            : "right-3 top-3 rounded-lg px-2.5 py-2 text-[11px]"
        )}
      >
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between font-semibold text-slate-700",
            !compact && "mb-1.5"
          )}
        >
          {!compact && <span>Filter</span>}
          {legendOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {legendOpen && (
          <div className={compact ? "flex flex-col items-center gap-1" : "space-y-0.5"}>
            <LegendToggle compact={compact} label="Truk" color="#1e3a5f" active={show.trucks} onClick={() => toggleLayer("trucks")} />
            <LegendToggle compact={compact} label="Seller" color="#10b981" active={show.sellers} onClick={() => toggleLayer("sellers")} />
            <LegendToggle compact={compact} label="Gudang Outgoing" color="#0ea5e9" active={show.gudang} onClick={() => toggleLayer("gudang")} />
            <LegendToggle compact={compact} label="Gudang DC" color="#7c3aed" active={show.gudang} onClick={() => toggleLayer("gudang")} />
            <LegendToggle compact={compact} label="Gateway" color="#f97316" active={show.drop} onClick={() => toggleLayer("drop")} />
    </div>
  )}
</div>
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
  if (prev.selectedVehicleId !== next.selectedVehicleId) return false;
  if (prev.initialFocus !== next.initialFocus) return false;
  if (prev.phones !== next.phones) return false;

  const vSig = (arr?: TrackingVehicle[]) =>
    (arr ?? [])
      .map((v) =>
        [v.id_kendaraan, v.latitude?.toFixed(5), v.longitude?.toFixed(5), v.offline, v.session_online, v.id_ritase, v.last_update].join(":")
      )
      .join("|");
  const sSig = (arr?: SellerLocation[]) =>
    (arr ?? []).map((s) => [s.id_seller, s.latitude.toFixed(5), s.longitude.toFixed(5)].join(":")).join("|");
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
