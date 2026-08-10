"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Phone, Search } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { DropPointPoi, GudangPoint, SellerLocation, TrackingVehicle } from "@/types/armada";
import { displayTrackingStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Tile CARTO (gratis & lebih cepat dari OSM publik) — render area baru jauh lebih responsif.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const JAKARTA: [number, number] = [-6.2088, 106.8456];

// Titik gudang fallback (dipakai kalau backend belum balikin gudang).
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
const OUTGOING_ICON = createGudangIcon("#0ea5e9"); // biru
const DC_ICON = createGudangIcon("#7c3aed"); // ungu
const DROP_ICON = createGudangIcon("#f97316"); // oranye — drop point

function createTruckIcon(selected: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `
      <div style="
        width:34px;height:34px;
        background:${selected ? "#ff8f00" : "#1e3a5f"};
        border:2px solid #fff;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>`,
  });
}

function createSellerIcon() {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `
      <div style="
        width:30px;height:30px;
        background:#10b981;
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
      </div>`,
  });
}

function createGudangIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `
      <div style="
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
}

/** Satu marker truk. Saat `selected` jadi true → popup langsung dibuka. */
function VehicleMarker({
  vehicle: v,
  selected,
  onSelect,
  phones,
}: {
  vehicle: TrackingVehicle;
  selected: boolean;
  onSelect: () => void;
  phones?: Record<string, string>;
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
        <div className="min-w-[210px] text-sm">
          <p className="font-semibold text-[#1e3a5f]">{v.plat_nomor || "-"}</p>
          <p className="text-xs text-muted-foreground">Driver: {v.nama_driver || "-"}</p>
          <p className="text-xs">Status: {displayTrackingStatus(v.status, v.kecepatan, v.last_update)}</p>
          {!stale && <p className="text-xs">Kecepatan: {v.kecepatan ?? 0} km/h</p>}
          <p className={stale ? "text-xs font-medium text-amber-600" : "text-xs text-muted-foreground"}>
            Update: {minutesAgo(v.last_update)}
            {stale ? " (data lama)" : ""}
          </p>
          {v.last_open && (
            <p className="text-xs text-muted-foreground">App dibuka: {minutesAgo(v.last_open)}</p>
          )}
          {phone && (
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
  if (m < 60) return `${m} m lalu`;
  return `${Math.floor(m / 60)} jam ${m % 60} m lalu`;
}

/** Ambil geometri rute jalan dari OSRM (geojson) → [[lat,lng],...]. undefined kalau gagal. */
async function fetchRoute(
  lat1: number, lon1: number, lat2: number, lon2: number
): Promise<[number, number][] | undefined> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const j = await res.json();
    const coords = j?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (!Array.isArray(coords)) return undefined;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return undefined;
  }
}

const typeLabel = (t: string) =>
  ({ truck: "Truk", seller: "Seller", gudang: "Gudang", drop: "Drop" }[t] ?? t);

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
}: LiveMapProps) {
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

  // Filter layer via legenda (klik untuk tampil/sembunyiin kategori marker).
  const [show, setShow] = useState({ trucks: true, sellers: true, gudang: true, drop: true });
  const toggleLayer = (k: keyof typeof show) =>
    setShow((s) => ({ ...s, [k]: !s[k] }));

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
    setRoutes({ targetKey, out, dc });
    setRouteLoading(false);
  };

  const onSelectSeller = (s: SellerLocation) =>
    drawRoute(`seller:${s.id_seller}`, s.latitude, s.longitude);
  const onSelectDrop = (p: DropPointPoi) =>
    drawRoute(`drop:${p.id_drop_point}`, p.latitude, p.longitude);

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
      <div className="absolute left-1/2 top-3 z-20 w-72 max-w-[85%] -translate-x-1/2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Cari truk, seller, gudang, drop..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm shadow-sm outline-none focus:border-[#034075] focus:ring-2 focus:ring-[#034075]/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
        center={JAKARTA}
        zoom={11}
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
                <div className="min-w-[180px] text-sm">
                  <p className={isOutgoing ? "font-semibold text-sky-600" : "font-semibold text-[#7c3aed]"}>
                    {isOutgoing ? "Gudang Outgoing" : "Distribution Center (DC)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isOutgoing
                      ? "Titik muat keberangkatan — acuan jarak \"Outgoing\" tiap seller."
                      : "Gudang DC (Buaran Indah) — acuan jarak \"DC\" tiap seller."}
                  </p>
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
              <div className="min-w-[180px] text-sm">
                <p className="font-semibold text-orange-600">
                  {p.nama_drop_point || `Drop Point ${p.id_drop_point}`}
                </p>
                {p.kode_dp && (
                  <p className="text-xs text-muted-foreground">Kode: {p.kode_dp}</p>
                )}
                <p className="text-xs text-muted-foreground">Drop point / Gateway</p>
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
              <div className="min-w-[200px] text-sm">
                {s.nama_seller && (
                  <p className="font-semibold text-emerald-700">
                    {s.nama_seller}
                    {s.kode_seller && (
                      <span className="ml-1 text-[10px] font-normal text-slate-400">({s.kode_seller})</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{s.alamat}</p>
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
          />
        ))}

        {/* Rute hasil klik seller — biru dari Outgoing, ungu dari DC */}
        {routes?.out && routes.out.length > 1 && (
          <Polyline positions={routes.out} pathOptions={{ color: "#0ea5e9", weight: 4, opacity: 0.75 }} />
        )}
        {routes?.dc && routes.dc.length > 1 && (
          <Polyline positions={routes.dc} pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.75 }} />
        )}

        {/* Fokus hasil pencarian (bukan truk) → zoom; popup dibuka PoiMarker */}
        <FocusPoi focus={focus} />
      </MapContainer>

      {/* Chip info + tutup rute */}
      {(routeLoading || routes) && (
        <div className="absolute bottom-3 left-3 z-10 rounded-lg border bg-white/95 px-3 py-2 text-[11px] shadow-sm">
          {routeLoading ? (
            <p className="text-slate-500">Menggambar rute...</p>
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

      {/* Legend filter — z-10: di atas peta tapi di bawah header sticky (z-30) */}
      <div className="absolute right-3 top-3 z-10 rounded-lg border bg-white/95 px-2.5 py-2 text-[11px] shadow-sm">
        <p className="mb-1.5 flex items-center justify-between font-semibold text-slate-700">
          Legenda <span className="font-normal text-[10px] text-slate-400">klik = filter</span>
        </p>
        <div className="space-y-0.5">
          <LegendToggle label="Truk" color="#1e3a5f" active={show.trucks} onClick={() => toggleLayer("trucks")} />
          <LegendToggle label="Seller" color="#10b981" active={show.sellers} onClick={() => toggleLayer("sellers")} />
          <LegendToggle label="Gudang Outgoing" color="#0ea5e9" active={show.gudang} onClick={() => toggleLayer("gudang")} />
          <LegendToggle label="Gudang DC" color="#7c3aed" active={show.gudang} onClick={() => toggleLayer("gudang")} />
          <LegendToggle label="Drop Point" color="#f97316" active={show.drop} onClick={() => toggleLayer("drop")} />
        </div>
      </div>
    </div>
  );
}

/** Baris legenda yang bisa diklik (filter layer). */
function LegendToggle({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-slate-100",
        !active && "opacity-40"
      )}
      title={active ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
    >
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: active ? color : "#e2e8f0" }}
      />
      <span className={cn("text-slate-600", !active && "line-through")}>{label}</span>
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
        [v.id_kendaraan, v.latitude?.toFixed(5), v.longitude?.toFixed(5), v.offline, v.session_online, v.last_update].join(":")
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
