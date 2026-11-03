import { useEffect, useRef, useState } from 'react';
import type { SearchResult } from '../types';

interface TopBarProps {
  onPickPlace: (result: SearchResult) => void;
  onOpenInfo: () => void;
  detonationCount: number;
  onOpenControl: () => void;
  onOpenResults: () => void;
  controlOpen: boolean;
  resultsOpen: boolean;
}

function SearchBox({ onPick }: { onPick: (result: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=tr,en&q=${encodeURIComponent(
            trimmed,
          )}`,
          { signal: controller.signal, headers: { Accept: 'application/json' } },
        );
        if (!response.ok) throw new Error('search failed');
        const data = (await response.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
        }>;
        const mapped = data
          .map((item) => ({
            label: item.display_name,
            lat: Number(item.lat),
            lng: Number(item.lon),
          }))
          .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
        setResults(mapped);
        setStatus(mapped.length === 0 ? 'empty' : 'idle');
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    }, 500);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choose = (result: SearchResult) => {
    onPick(result);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search" ref={containerRef}>
      <span className="search__icon" aria-hidden="true">
        ⌖
      </span>
      <input
        type="search"
        value={query}
        placeholder="Şehir, ülke veya koordinat ara…"
        aria-label="Haritada yer ara"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results.length > 0) {
            event.preventDefault();
            choose(results[0]);
          }
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      <span className="search__hint">↵</span>

      {open && query.trim().length >= 3 && (
        <div className="search__panel">
          {status === 'loading' && <div className="search__status">Aranıyor…</div>}
          {status === 'error' && (
            <div className="search__status">Arama servisine ulaşılamadı. Haritayı kullanın.</div>
          )}
          {status === 'empty' && <div className="search__status">Sonuç bulunamadı.</div>}
          {results.map((result) => (
            <button
              type="button"
              key={`${result.lat}-${result.lng}-${result.label}`}
              className="search__result"
              onClick={() => choose(result)}
            >
              <span className="search__pin" aria-hidden="true">
                ●
              </span>
              <span>
                <strong>{result.label.split(',')[0]}</strong>
                <em>{result.label}</em>
              </span>
            </button>
          ))}
          <div className="search__credit">Arama: OpenStreetMap Nominatim</div>
        </div>
      )}
    </div>
  );
}

export function TopBar({
  onPickPlace,
  onOpenInfo,
  detonationCount,
  onOpenControl,
  onOpenResults,
  controlOpen,
  resultsOpen,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          ☢
        </span>
        <div className="brand__text">
          <h1>
            Nuke<span>Sim</span> <em>3D</em> <b>Pro</b>
          </h1>
          <p>Nükleer etki simülatörü</p>
        </div>
      </div>

      <SearchBox onPick={onPickPlace} />

      <div className="topbar__actions">
        <span className="edu-badge">
          <span aria-hidden="true">!</span> Eğitim amaçlı
        </span>
        <span className="burst-counter" title="Haritadaki patlama sayısı">
          {detonationCount} patlama
        </span>
        <button type="button" className="icon-btn" onClick={onOpenInfo} aria-label="Yöntem ve bilgi">
          ?
        </button>
      </div>

      <div className="topbar__mobile">
        <button
          type="button"
          className={`mobile-tab ${controlOpen ? 'is-active' : ''}`}
          onClick={onOpenControl}
        >
          Kontrol
        </button>
        <button
          type="button"
          className={`mobile-tab ${resultsOpen ? 'is-active' : ''}`}
          onClick={onOpenResults}
        >
          Sonuç
        </button>
      </div>
    </header>
  );
}

export default TopBar;
