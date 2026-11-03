import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView';
import TopBar from './components/TopBar';
import ControlPanel from './components/ControlPanel';
import ResultsPanel from './components/ResultsPanel';
import InfoModal from './components/InfoModal';
import { clampYield, computeEffects } from './lib/effects';
import { fmtCoord, fmtYield } from './lib/format';
import type { Detonation, MapStyle, SearchResult, SimulationSettings } from './types';

const STORAGE_KEY = 'nukesim.settings.v1';

const ENV_GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

const DEFAULT_SETTINGS: SimulationSettings = {
  yieldKt: 100,
  burstType: 'airburst',
  windDirDeg: 120,
  windSpeedKmh: 18,
  populationDensity: 2500,
  showBlast: true,
  showThermal: true,
  showFallout: true,
  showLabels: true,
  mapStyle: 'satellite',
  googleApiKey: ENV_GOOGLE_KEY,
};

function loadSettings(): SimulationSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SimulationSettings>;
    const merged: SimulationSettings = { ...DEFAULT_SETTINGS, ...parsed };

    merged.yieldKt = clampYield(Number(merged.yieldKt));
    merged.populationDensity = Math.max(0, Number(merged.populationDensity) || 0);
    merged.windDirDeg = Math.min(355, Math.max(0, Number(merged.windDirDeg) || 0));
    merged.windSpeedKmh = Math.min(90, Math.max(2, Number(merged.windSpeedKmh) || 18));
    merged.burstType = merged.burstType === 'surface' ? 'surface' : 'airburst';
    merged.googleApiKey = String(merged.googleApiKey ?? '').trim() || ENV_GOOGLE_KEY;
    if (merged.mapStyle === 'google' && !merged.googleApiKey) merged.mapStyle = 'satellite';

    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `det-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type MobilePanel = 'none' | 'control' | 'results';

export function App() {
  const [settings, setSettings] = useState<SimulationSettings>(loadSettings);
  const [detonations, setDetonations] = useState<Detonation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'effects' | 'log'>('effects');
  const [infoOpen, setInfoOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('none');
  const [toast, setToast] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* depolama kapalıysa ayarlar yalnızca oturumda kalır */
    }
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobilePanel('none');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateSettings = useCallback((patch: Partial<SimulationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const detonate = useCallback(
    (lat: number, lng: number) => {
      const params = {
        yieldKt: settings.yieldKt,
        burstType: settings.burstType,
        windDirDeg: settings.windDirDeg,
        windSpeedKmh: settings.windSpeedKmh,
        populationDensity: settings.populationDensity,
      };
      const detonation: Detonation = {
        id: newId(),
        lat,
        lng,
        createdAt: Date.now(),
        params,
        effects: computeEffects(params),
      };
      setDetonations((prev) => [...prev, detonation]);
      setSelectedId(detonation.id);
      setTab('effects');
      setToast(`Patlama uygulandı · ${fmtYield(params.yieldKt)} · ${fmtCoord(lat, lng, 3)}`);
    },
    [settings],
  );

  const deleteDetonation = useCallback(
    (id: string) => {
      const remaining = detonations.filter((item) => item.id !== id);
      setDetonations(remaining);
      setSelectedId((current) => {
        if (current !== id) return current;
        return remaining[remaining.length - 1]?.id ?? null;
      });
    },
    [detonations],
  );

  const clearAll = useCallback(() => {
    setDetonations([]);
    setSelectedId(null);
    setTab('effects');
  }, []);

  const handleMapStyleChange = useCallback(
    (style: MapStyle) => {
      setSettings((prev) => ({ ...prev, mapStyle: style }));
    },
    [],
  );

  const handlePickPlace = (result: SearchResult) => {
    setFlyTarget({ lat: result.lat, lng: result.lng, zoom: 12, nonce: Date.now() });
    setToast(`Harita konumu: ${result.label.split(',')[0]}`);
  };

  const locateDetonation = (detonation: Detonation) => {
    setFlyTarget({
      lat: detonation.lat,
      lng: detonation.lng,
      zoom: 13,
      nonce: Date.now(),
    });
  };

  const selected = useMemo(
    () => detonations.find((item) => item.id === selectedId) ?? null,
    [detonations, selectedId],
  );

  return (
    <div className="app">
      <MapView
        detonations={detonations}
        selectedId={selectedId}
        showBlast={settings.showBlast}
        showThermal={settings.showThermal}
        showFallout={settings.showFallout}
        showLabels={settings.showLabels}
        mapStyle={settings.mapStyle}
        googleApiKey={settings.googleApiKey}
        onDetonate={detonate}
        onSelect={setSelectedId}
        onMapStyleChange={handleMapStyleChange}
        flyTarget={flyTarget}
      />

      <TopBar
        onPickPlace={handlePickPlace}
        onOpenInfo={() => setInfoOpen(true)}
        detonationCount={detonations.length}
        onOpenControl={() =>
          setMobilePanel((current) => (current === 'control' ? 'none' : 'control'))
        }
        onOpenResults={() =>
          setMobilePanel((current) => (current === 'results' ? 'none' : 'results'))
        }
        controlOpen={mobilePanel === 'control'}
        resultsOpen={mobilePanel === 'results'}
      />

      <ControlPanel
        settings={settings}
        onChange={updateSettings}
        onClearAll={clearAll}
        burstCount={detonations.length}
        open={mobilePanel === 'control'}
        onClose={() => setMobilePanel('none')}
      />

      <ResultsPanel
        selected={selected}
        detonations={detonations}
        tab={tab}
        onTabChange={setTab}
        onSelect={setSelectedId}
        onDelete={deleteDetonation}
        onLocate={locateDetonation}
        onClearAll={clearAll}
        open={mobilePanel === 'results'}
        onClose={() => setMobilePanel('none')}
      />

      {mobilePanel !== 'none' && (
        <div
          className="panel-scrim"
          aria-hidden="true"
          onClick={() => setMobilePanel('none')}
        />
      )}

      {detonations.length === 0 && (
        <div className="map-hint">
          <span className="map-hint__pulse" aria-hidden="true" />
          Haritada bir hedefe tıkla — patlama anında hesaplanır
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span aria-hidden="true">☢</span>
          {toast}
        </div>
      )}

      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

export default App;
