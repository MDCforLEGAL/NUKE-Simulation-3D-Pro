const formatters = new Map<number, Intl.NumberFormat>();

function numberFormatter(digits: number): Intl.NumberFormat {
  const cached = formatters.get(digits);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
  formatters.set(digits, formatter);
  return formatter;
}

export function fmt(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return numberFormatter(digits).format(value);
}

export function fmtDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '—';
  if (km < 1) return `${fmt(km * 1000, 0)} m`;
  if (km < 10) return `${fmt(km, 2)} km`;
  if (km < 100) return `${fmt(km, 1)} km`;
  return `${fmt(km, 0)} km`;
}

export function fmtYield(kt: number): string {
  if (!Number.isFinite(kt)) return '—';
  if (kt >= 1e9) return `${fmt(kt / 1e9, kt < 1e10 ? 2 : 0)} Tt`;
  if (kt >= 1e6) return `${fmt(kt / 1e6, kt < 1e7 ? 2 : 0)} Gt`;
  if (kt >= 1000) return `${fmt(kt / 1000, kt < 10000 ? 2 : 1)} Mt`;
  if (kt >= 1) return `${fmt(kt, kt < 10 ? 2 : kt < 100 ? 1 : 0)} kt`;
  return `${fmt(kt * 1000, 0)} ton`;
}

export function fmtYieldPlain(kt: number): string {
  if (kt >= 1000) return `${fmt(kt, 0)} kt`;
  return `${fmt(kt, kt < 10 ? 2 : 1)} kt`;
}

export function fmtCoord(lat: number, lng: number, digits = 4): string {
  const ns = lat >= 0 ? 'K' : 'G';
  const ew = lng >= 0 ? 'D' : 'B';
  return `${fmt(Math.abs(lat), digits)}° ${ns}, ${fmt(Math.abs(lng), digits)}° ${ew}`;
}

export function fmtCoordinatePair(lat: number, lng: number): string {
  return `${lat >= 0 ? '+' : ''}${lat.toFixed(5)}, ${lng >= 0 ? '+' : ''}${lng.toFixed(5)}`;
}

export function fmtTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const CARDINALS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];

export function cardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  return CARDINALS[Math.round(normalized / 45) % 8];
}

export function fmtCount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e9) return `${fmt(value / 1e9, 2)} milyar`;
  if (value >= 1e6) return `${fmt(value / 1e6, 2)} mn`;
  if (value >= 1e4) return `${fmt(value / 1000, 0)} bin`;
  return fmt(value, 0);
}

export function fmtArea(km2: number): string {
  if (!Number.isFinite(km2)) return '—';
  if (km2 < 1) return `${fmt(km2 * 1e6, 0)} m²`;
  if (km2 < 1000) return `${fmt(km2, 1)} km²`;
  return `${fmt(km2, 0)} km²`;
}
