"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { RitaseEvent, RitaseStop } from "@/types/armada";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Milestone } from "lucide-react";

// Icons... (keeping the same icons)
const TANGERANG_BOUNDS: L.LatLngBoundsExpression = [
  [-6.35, 106.45], // titik barat daya (kiri bawah)
  [-6.00, 106.85], // titik timur laut (kanan atas)
];
const GUDANG_ICON = new L.DivIcon({
  html: `<div class="h-5 w-5 rounded-md flex items-center justify-center bg-sky-500 border-2 border-white shadow"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M22 21V7L12 2L2 7v14h20z"/><path d="M6 21V11"/><path d="M18 21V11"/><path d="M12 21V11"/></svg></div>`,
  className: "", iconSize: [20, 20], iconAnchor: [10, 10],
});
const SELLER_ICON = new L.DivIcon({
  html: `<div class="h-5 w-5 rounded-full flex items-center justify-center bg-emerald-500 border-2 border-white shadow"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>`,
  className: "", iconSize: [20, 20], iconAnchor: [10, 10],
});
const DROP_ICON = new L.DivIcon({
  html: `<div class="h-5 w-5 flex items-center justify-center bg-orange-500 border-2 border-white shadow"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg></div>`,
  className: "", iconSize: [20, 20], iconAnchor: [10, 10],
});
const EVENT_ICON = new L.DivIcon({
    html: `<div class="h-2 w-2 rounded-full bg-slate-400"></div>`,
    className: "", iconSize: [8, 8], iconAnchor: [4, 4],
});


function getStopIcon(stop: RitaseStop) {
  if (stop.jenis_stop === "gudang") return GUDANG_ICON;
  if (stop.jenis_stop === "seller") return SELLER_ICON;
  return DROP_ICON;
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

export function TripMap({ stops, events }: { stops: RitaseStop[]; events?: RitaseEvent[] }) {
  const { routePoints, bounds } = useMemo(() => {
    const validStops = stops.filter(s => s.latitude && s.longitude);
    const validEvents = (events ?? [])
      .filter(e => e.latitude && e.longitude)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const allPoints: L.LatLng[] = [
      ...validStops.map(s => new L.LatLng(s.latitude!, s.longitude!)),
      ...validEvents.map(e => new L.LatLng(e.latitude!, e.longitude!))
    ];

    return {
      routePoints: validEvents,
      bounds: allPoints.length > 0 ? new L.LatLngBounds(allPoints) : null,
    };
  }, [stops, events]);

  const validStops = useMemo(() => stops.filter(s => s.latitude && s.longitude), [stops]);

  if (!bounds) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 rounded-md">
        <p className="text-sm text-slate-500">Tidak ada data lokasi untuk ditampilkan di peta.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[300px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        bounds={bounds}
        minZoom={11}
        maxBounds={TANGERANG_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {routePoints.length > 1 && (
          <Polyline 
            positions={routePoints.map(p => [p.latitude!, p.longitude!])} 
            color="#0ea5e9" 
            weight={4} 
          />
        )}

        {validStops.map((stop) => (
          <Marker
            key={`stop-${stop.id_stop}`}
            position={[stop.latitude!, stop.longitude!]}
            icon={getStopIcon(stop)}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{stop.nama_gudang || stop.nama_seller || stop.nama_drop_point}</p>
                <p className="capitalize text-slate-500">{stop.jenis_stop.replace("_", " ")} - Urutan {stop.urutan}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {routePoints.map((event) => (
             <Marker
                key={`evt-${event.id_event}`}
                position={[event.latitude!, event.longitude!]}
                icon={EVENT_ICON}
            >
                <Popup>
                    <div className="text-xs">
                        <p className="font-bold">{event.status}</p>
                        <p className="text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</p>
                    </div>
                </Popup>
            </Marker>
        ))}

        <FitBounds bounds={bounds} />
      </MapContainer>

      {routePoints.length > 0 && (
        <div className="absolute top-2 right-2 z-[401] bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-md border text-xs">
            <div className="flex items-center gap-2"><Milestone className="h-4 w-4 text-slate-500"/> <span>{routePoints.length} Titik Tercatat</span></div>
        </div>
      )}
    </div>
  );
}

export function TripMapSkeleton() {
    return <Skeleton className="h-[300px] w-full" />;
}
