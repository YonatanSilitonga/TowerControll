/**
 * Utility functions for map operations, especially OSRM routing.
 * Extracted from live-map.tsx to be reusable.
 */

/** Hasil OSRM: titik-titik rute ([[lat,lng],...]) + jarak total meter + durasi detik. */
export type RouteResult = {
  points: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

/** Ambil geometri rute jalan dari OSRM (geojson) → [[lat,lng],...] + jarak + durasi. undefined kalau gagal. */
export async function fetchRoute(
  lat1: number, lon1: number, lat2: number, lon2: number
): Promise<RouteResult | undefined> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const j = await res.json();
    const route = j?.routes?.[0];
    const coords = route?.geometry?.coordinates as [number, number][] | undefined;
    if (!Array.isArray(coords)) return undefined;
    return {
      points: coords.map(([lng, lat]) => [lat, lng] as [number, number]),
      distanceMeters: Math.round(route.distance ?? 0),
      durationSeconds: Math.round(route.duration ?? 0),
    };
  } catch {
    return undefined;
  }
}

/** Jarak haversine (meter) — buat throttle re-route saat truk pindah. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
