const EARTH_RADIUS_KM = 6371.0088;

/**
 * Belirli bir noktadan bearing yönünde verilen mesafe kadar ilerleyen noktayı
 * döndürür. [lat, lng] sırası kullanılır.
 */
export function destination(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const ratio = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ratio) + Math.cos(lat1) * Math.sin(ratio) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(ratio) * Math.cos(lat1),
      Math.cos(ratio) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [(lat2 * 180) / Math.PI, ((lng2 * 180) / Math.PI + 540) % 360 - 180];
}

/**
 * Serpinti bulutu için yaprak biçimli bir poligon üretir. Merkezden rüzgâr
 * yönünde uzanır, ortada genişleyip uçta kapanır.
 */
export function plumePolygon(
  lat: number,
  lng: number,
  bearingDeg: number,
  lengthKm: number,
  widthKm: number,
): Array<[number, number]> {
  const steps = 26;
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const distance = lengthKm * f;
    const halfWidth = (widthKm / 2) * Math.sin(Math.PI * Math.pow(f, 0.62));
    const center = destination(lat, lng, bearingDeg, distance);
    left.push(destination(center[0], center[1], bearingDeg - 90, halfWidth));
    right.push(destination(center[0], center[1], bearingDeg + 90, halfWidth));
  }

  return [...left, ...right.reverse()];
}

export function boundsForPoints(points: Array<[number, number]>): [[number, number], [number, number]] {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
