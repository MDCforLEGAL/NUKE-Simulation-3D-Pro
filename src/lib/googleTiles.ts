export interface GoogleTileSession {
  tileUrl: string;
  expiry: number;
  copyright: string;
}

interface CachedSession {
  session: string;
  expiry: number;
  copyright: string;
}

const CACHE_PREFIX = 'nukesim.google.session.';

function readCache(key: string): CachedSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed.session || !parsed.expiry) return null;
    if (parsed.expiry * 1000 < Date.now() + 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: CachedSession): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage kapalı olabilir; oturum bellekte kalır */
  }
}

/**
 * Google Maps Platform Map Tiles API için 2 haftalık bir oturum açar.
 * Resmî 2D karo uç noktası Leaflet ile kullanılabilir.
 * https://developers.google.com/maps/documentation/tile/session_tokens
 */
export async function createGoogleTileSession(apiKey: string): Promise<GoogleTileSession> {
  const key = apiKey.trim();
  if (!key) throw new Error('Google API anahtarı boş.');

  const cacheKey = `${CACHE_PREFIX}${key.slice(-8)}`;
  let cached = readCache(cacheKey);

  if (!cached) {
    const response = await fetch(
      `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapType: 'satellite',
          language: 'tr-TR',
          region: 'TR',
          imageFormat: 'png',
          layerTypes: ['layerRoadmap'],
        }),
      },
    );

    if (!response.ok) {
      let detail = `${response.status}`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) detail = body.error.message;
      } catch {
        /* yanıt JSON değilse durum kodu yeterli */
      }
      throw new Error(`Google oturumu açılamadı (${detail}).`);
    }

    const body = (await response.json()) as {
      session?: string;
      expiry?: string | number;
      copyright?: string;
    };

    if (!body.session) throw new Error('Google yanıtında oturum bilgisi yok.');

    cached = {
      session: body.session,
      expiry: Number(body.expiry ?? Math.floor(Date.now() / 1000) + 3600),
      copyright: body.copyright || '© Google',
    };
    writeCache(cacheKey, cached);
  }

  return {
    expiry: cached.expiry,
    copyright: cached.copyright,
    tileUrl: `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(
      cached.session,
    )}&key=${encodeURIComponent(key)}`,
  };
}
