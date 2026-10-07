export type LatLng = { lat: number; lng: number };

export const haversineKm = (a: LatLng, b: LatLng): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
};

export const interpolate = (a: LatLng, b: LatLng, t: number): LatLng => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

export const bearingDeg = (a: LatLng, b: LatLng): number => {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((b.lat * Math.PI) / 180);
  const x =
    Math.cos((a.lat * Math.PI) / 180) * Math.sin((b.lat * Math.PI) / 180) -
    Math.sin((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
};

export const regionForPoints = (points: LatLng[], padFactor = 1.35): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null => {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return null;
  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max(0.01, (maxLat - minLat) * padFactor);
  const longitudeDelta = Math.max(0.01, (maxLng - minLng) * padFactor);
  return { latitude, longitude, latitudeDelta, longitudeDelta };
};

export const moveToward = (from: LatLng, to: LatLng, stepKm: number): LatLng => {
  const dist = haversineKm(from, to);
  if (dist <= stepKm || dist === 0) return { ...to };
  return interpolate(from, to, stepKm / dist);
};

export const straightRoute = (from: LatLng, to: LatLng, segments = 24): LatLng[] => {
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i += 1) {
    points.push(interpolate(from, to, i / segments));
  }
  return points;
};

export const approxEtaMinutes = (km: number, speedKmh = 22): number => Math.max(1, Math.round((km / speedKmh) * 60));
