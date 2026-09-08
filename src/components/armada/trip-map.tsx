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
import { RitaseEvent, RitaseStop, GpsPoint } from "@/types/armada";
import { AlertAnomali } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Milestone, AlertTriangle } from "lucide-react";

const TANGERANG_BOUNDS: L.LatLngBoundsExpression = [
  [-6.35, 106.45],
  [-6.00, 106.85],
];

// ── Icon factory — same style as live-map ──
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

function createSellerIcon() {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `
      <div class="marker-visual" style="
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

const SELLER_ICON = createSellerIcon();
const OUTGOING_ICON = createGudangIcon("#0ea5e9");
const DC_ICON = createGudangIcon("#7c3aed");
const DROP_ICON = createGudangIcon("#f97316");

const EVENT_ICON = L.divIcon({
  html: `<div style="width:8px;height:8px;border-radius:50%;background:#94a3b8;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>`,
  className: "", iconSize: [12, 12], iconAnchor: [6, 6],
});

const ALERT_CRITICAL_ICON = L.divIcon({
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#f43f5e;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg></div>`,
  className: "", iconSize: [24, 24], iconAnchor: [12, 12],
});

const ALERT_WARNING_ICON = L.divIcon({
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg></div>`,
  className: "", iconSize: [24, 24], iconAnchor: [12, 12],
});

const GPS_START_ICON = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="5,3 19,12 5,21"/></svg></div>`,
  className: "", iconSize: [28, 28], iconAnchor: [14, 14],
});

const GPS_END_ICON = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></div>`,
  className: "", iconSize: [28, 28], iconAnchor: [14, 14],
});

function getStopIcon(stop: RitaseStop) {
  if (stop.jenis_stop === "seller") return SELLER_ICON;
  if (stop.jenis_stop === "drop_point") return DROP_ICON;
  if (stop.tipe_gudang === "outgoing") return OUTGOING_ICON;
  return DC_ICON;
}

// ── Haversine distance (km) ──
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Filter GPS outliers — skip points with unrealistic speed ──
function filterGpsOutliers(points: GpsPoint[], maxSpeedKmh = 120): GpsPoint[] {
  if (points.length <= 2) return points;
  const result: GpsPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const timeDiffMs = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    const timeDiffH = timeDiffMs / (1000 * 60 * 60);
    if (timeDiffH > 0 && dist / timeDiffH > maxSpeedKmh) continue;
    result.push(curr);
  }
  return result;
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

export function TripMap({ stops, events, alerts, gpsHistory }: { stops: RitaseStop[]; events?: RitaseEvent[]; alerts?: AlertAnomali[]; gpsHistory?: GpsPoint[] }) {
  const { routePoints, gpsPoints, filteredGps, bounds } = useMemo(() => {
    const validStops = stops.filter(s => s.latitude && s.longitude);
    const validEvents = (events ?? [])
      .filter(e => e.latitude && e.longitude)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const validAlerts = (alerts ?? [])
      .filter(a => a.latitude != null && a.longitude != null);
    const validGps = (gpsHistory ?? [])
      .filter(p => p.latitude && p.longitude);

    const filtered = filterGpsOutliers(validGps);

    const allPoints: L.LatLng[] = [
      ...validStops.map(s => new L.LatLng(s.latitude!, s.longitude!)),
      ...validEvents.map(e => new L.LatLng(e.latitude!, e.longitude!)),
      ...validAlerts.map(a => new L.LatLng(a.latitude!, a.longitude!)),
      ...filtered.map(p => new L.LatLng(p.latitude, p.longitude)),
    ];

    return {
      routePoints: validEvents,
      gpsPoints: validGps,
      filteredGps: filtered,
      bounds: allPoints.length > 0 ? new L.LatLngBounds(allPoints) : null,
    };
  }, [stops, events, alerts, gpsHistory]);

  const validStops = useMemo(() => stops.filter(s => s.latitude && s.longitude), [stops]);
  const validAlerts = useMemo(() => (alerts ?? []).filter(a => a.latitude != null && a.longitude != null), [alerts]);

  if (!bounds) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 rounded-md">
        <p className="text-sm text-slate-500">Tidak ada data lokasi untuk ditampilkan di peta.</p>
      </div>
    );
  }

  const startPoint = filteredGps.length > 0 ? filteredGps[0] : null;
  const endPoint = filteredGps.length > 1 ? filteredGps[filteredGps.length - 1] : null;

  return (
    <div className="relative h-[300px] w-full rounded-lg overflow-hidden border lg:h-[400px] z-0 isolate">
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
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredGps.length > 1 ? (
          <Polyline
            positions={filteredGps.map(p => [p.latitude, p.longitude])}
            color="#0ea5e9"
            weight={4}
          />
        ) : routePoints.length > 1 ? (
          <Polyline
            positions={routePoints.map(p => [p.latitude!, p.longitude!])}
            color="#0ea5e9"
            weight={4}
          />
        ) : null}

        {startPoint && (
          <Marker
            position={[startPoint.latitude, startPoint.longitude]}
            icon={GPS_START_ICON}
            zIndexOffset={3000}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-emerald-600">Mulai Perjalanan</p>
                <p className="text-slate-500">{new Date(startPoint.created_at).toLocaleString("id-ID")}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {endPoint && startPoint && endPoint !== startPoint && (
          <Marker
            position={[endPoint.latitude, endPoint.longitude]}
            icon={GPS_END_ICON}
            zIndexOffset={3000}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-red-600">Selesai Perjalanan</p>
                <p className="text-slate-500">{new Date(endPoint.created_at).toLocaleString("id-ID")}</p>
              </div>
            </Popup>
          </Marker>
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

        {validAlerts.map((al) => (
            <Marker
                key={`alert-${al.id_alert}`}
                position={[al.latitude!, al.longitude!]}
                icon={al.tingkat === "critical" ? ALERT_CRITICAL_ICON : ALERT_WARNING_ICON}
                zIndexOffset={2000}
            >
                <Popup>
                    <div className="text-xs">
                        <p className="font-bold text-rose-600">Status Tidak Wajar</p>
                        <p>{al.pesan}</p>
                        <p className="text-slate-500">{al.nama_lokasi} · {al.durasi_detik != null ? `${Math.floor(al.durasi_detik / 60)} menit` : ""}</p>
                    </div>
                </Popup>
            </Marker>
        ))}

        <FitBounds bounds={bounds} />
      </MapContainer>

      {(filteredGps.length > 0 || routePoints.length > 0) && (
        <div className="absolute top-2 right-2 z-[401] bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-md border text-xs">
            {filteredGps.length > 0 ? (
              <div className="flex items-center gap-2"><Milestone className="h-4 w-4 text-slate-500"/> <span>{filteredGps.length} Titik GPS</span></div>
            ) : (
              <div className="flex items-center gap-2"><Milestone className="h-4 w-4 text-slate-500"/> <span>{routePoints.length} Titik Tercatat</span></div>
            )}
            {validAlerts.length > 0 && (
              <div className="flex items-center gap-2 mt-1"><AlertTriangle className="h-4 w-4 text-rose-500"/> <span>{validAlerts.length} Alert Anomali</span></div>
            )}
        </div>
      )}
    </div>
  );
}

export function TripMapSkeleton() {
    return <Skeleton className="h-[300px] w-full" />;
}
