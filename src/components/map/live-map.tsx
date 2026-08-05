"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { SellerLocation, TrackingVehicle } from "@/types/armada";
import { formatDateTime } from "@/lib/utils";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const JAKARTA: [number, number] = [-6.2088, 106.8456];

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

  const key = points.map((p) => `${p[0]},${p[1]}`).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

interface LiveMapProps {
  vehicles: TrackingVehicle[];
  sellers: SellerLocation[];
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number | null) => void;
}

export function LiveMap({ vehicles, sellers, selectedVehicleId, onSelectVehicle }: LiveMapProps) {
  return (
    <MapContainer
      center={JAKARTA}
      zoom={11}
      className="h-full w-full"
      style={{ zIndex: 0 }}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <FitBounds vehicles={vehicles} sellers={sellers} />

      {sellers.map((s) => (
        <Marker
          key={`seller-${s.id_seller}`}
          position={[s.latitude, s.longitude]}
          icon={createSellerIcon()}
        >
          <Popup>
            <div className="min-w-[180px] text-sm">
              <p className="font-semibold text-emerald-700">{s.nama_seller}</p>
              <p className="text-xs text-muted-foreground">{s.alamat}</p>
              <p className="text-xs text-muted-foreground">{s.kota}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {vehicles.map((v) => (
        <Marker
          key={`vehicle-${v.id_kendaraan}`}
          position={[v.latitude, v.longitude]}
          icon={createTruckIcon(selectedVehicleId === v.id_kendaraan)}
          eventHandlers={{ click: () => onSelectVehicle(v.id_kendaraan) }}
        >
          <Popup>
            <div className="min-w-[200px] text-sm">
              <p className="font-semibold text-[#1e3a5f]">{v.plat_nomor || "-"}</p>
              <p className="text-xs text-muted-foreground">Driver: {v.nama_driver || "-"}</p>
              <p className="text-xs">Status: {v.status ?? "-"}</p>
              <p className="text-xs">Kecepatan: {v.kecepatan ?? 0} km/h</p>
              <p className="text-xs text-muted-foreground">
                Update: {formatDateTime(v.last_update)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
