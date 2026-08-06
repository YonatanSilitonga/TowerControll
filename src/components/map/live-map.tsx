"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import Cluster from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { SellerLocation, TrackingVehicle } from "@/types/armada";
import { displayTrackingStatus } from "@/lib/constants";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const JAKARTA: [number, number] = [-6.2088, 106.8456];

// Ikon dibuat SEKALI di level modul & DIBAGIKAN antar marker.
// Sebelumnya: `createTruckIcon(...)`/`createSellerIcon()` dipanggil per marker per
// render → tiap poll 10 detik semua marker di-setIcon ulang → keliatan "refresh terus".
// Leaflet icon itu stateless, aman dipakai bareng (shared instance).
const TRUCK_ICON = createTruckIcon(false);
const TRUCK_ICON_SELECTED = createTruckIcon(true);
const SELLER_ICON = createSellerIcon();

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

function FitBounds({ vehicles, sellers }: { vehicles: TrackingVehicle[]; sellers: SellerLocation[] }) {
  const map = useMap();

  const points = useMemo(() => {
    const coords: [number, number][] = [
      ...vehicles.map((v) => [v.latitude, v.longitude] as [number, number]),
      ...sellers.map((s) => [s.latitude, s.longitude] as [number, number]),
    ];
    return coords;
  }, [vehicles, sellers]);

  // FitBounds cuma sekali (atau saat SET marker berubah: truk/seller masuk-keluar).
  // JANGAN ikut posisi — kalau ikut posisi, tiap poll 10 detik view user ke-reset terus.
  const key = useMemo(() => {
    const ids = [
      ...vehicles.map((v) => `v:${v.id_kendaraan}`),
      ...sellers.map((s) => `s:${s.id_seller}`),
    ];
    return ids.sort().join(",");
  }, [vehicles, sellers]);

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
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number | null) => void;
}

/** Satu marker truk. Saat `selected` jadi true → popup langsung dibuka. */
function VehicleMarker({
  vehicle: v,
  selected,
  onSelect,
}: {
  vehicle: TrackingVehicle;
  selected: boolean;
  onSelect: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const lastT = new Date(v.last_update).getTime();
  const stale = !Number.isNaN(lastT) && Date.now() - lastT > 5 * 60 * 1000;

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
          <p className="text-xs">Kecepatan: {v.kecepatan ?? 0} km/h</p>
          <p className={stale ? "text-xs font-medium text-amber-600" : "text-xs text-muted-foreground"}>
            Update: {minutesAgo(v.last_update)}
            {stale ? " (data lama)" : ""}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

function minutesAgo(iso?: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  return `${Math.floor(m / 60)} jam ${m % 60} mnt lalu`;
}

export function LiveMap({ vehicles, sellers, selectedVehicleId, onSelectVehicle }: LiveMapProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={JAKARTA}
        zoom={11}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <FitBounds vehicles={vehicles} sellers={sellers} />
        <FocusSelected vehicles={vehicles} selectedVehicleId={selectedVehicleId} />

        <Cluster>
          {sellers.map((s) => (
            <Marker
              key={`seller-${s.id_seller}`}
              position={[s.latitude, s.longitude]}
              icon={SELLER_ICON}
            >
              <Popup>
                <div className="min-w-[200px] text-sm">
                  <p className="font-semibold text-emerald-700">
                    {s.nama_seller}
                    {s.kode_seller && (
                      <span className="ml-1 text-[10px] font-normal text-slate-400">({s.kode_seller})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.alamat}</p>
                  <p className="text-xs text-muted-foreground">{s.kota}</p>
                  {s.pic && <p className="mt-1 text-xs">PIC: <b>{s.pic}</b></p>}
                  {s.no_hp && <p className="text-xs">No HP: <b>{s.no_hp}</b></p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </Cluster>

        {/* Truk TIDAK dikluster — armada itu yang dipantau tiap detik, harus selalu
            keliatan satu-satu walau posisinya berdekatan (mis. dua truk di hub yang sama).
            Saat terpilih → popup otomatis kebuka. */}
        {vehicles.map((v) => (
          <VehicleMarker
            key={`vehicle-${v.id_kendaraan}`}
            vehicle={v}
            selected={selectedVehicleId === v.id_kendaraan}
            onSelect={() => onSelectVehicle(v.id_kendaraan)}
          />
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg border bg-white/95 px-3 py-2 text-[11px] shadow-sm">
        <p className="mb-1.5 font-semibold text-slate-700">Legenda</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-[#1e3a5f] shadow" />
            <span className="text-slate-600">Truk aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-[#ff8f00] shadow" />
            <span className="text-slate-600">Truk terpilih</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-[#10b981] shadow" />
            <span className="text-slate-600">Seller</span>
          </div>
        </div>
      </div>
    </div>
  );
}
