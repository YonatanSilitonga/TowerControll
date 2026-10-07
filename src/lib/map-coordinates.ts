/** Normalize API coordinates before passing them to Leaflet. */
export function normalizeMapPoints<T extends { latitude?: unknown; longitude?: unknown }>(points: T[]): (T & { latitude: number; longitude: number })[] {
  const number = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") return Number(value);
    return NaN;
  };
  return points.flatMap(point => {
    const latitude = number(point.latitude);
    const longitude = number(point.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    return [{ ...point, latitude, longitude }];
  });
}
