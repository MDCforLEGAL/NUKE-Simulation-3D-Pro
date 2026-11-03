import { useEffect, useState } from 'react';
import type { MapStyle, SimulationSettings } from '../types';
import { MAX_YIELD_KT, MIN_YIELD_KT, clampYield } from '../lib/effects';
import { cardinal, fmt, fmtYield, fmtYieldPlain } from '../lib/format';

interface ControlPanelProps {
  settings: SimulationSettings;
  onChange: (patch: Partial<SimulationSettings>) => void;
  onClearAll: () => void;
  burstCount: number;
  open: boolean;
  onClose: () => void;
}

const PRESETS: Array<{ kt: number; label: string; sub: string }> = [
  { kt: 0.1, label: '0,1 kt', sub: 'Mikro' },
  { kt: 1, label: '1 kt', sub: 'Taktik' },
  { kt: 15, label: '15 kt', sub: 'Hiroşima' },
  { kt: 21, label: '21 kt', sub: 'Nagazaki' },
  { kt: 100, label: '100 kt', sub: 'Stratejik' },
  { kt: 1000, label: '1 Mt', sub: 'Termonükleer' },
  { kt: 15000, label: '15 Mt', sub: 'Castle Bravo' },
  { kt: 50000, label: '50 Mt', sub: 'Tsar Bomba' },
  { kt: 1e6, label: '1 Gt', sub: 'Ekstrem' },
];

const DENSITIES: Array<{ value: number; label: string }> = [
  { value: 50, label: 'Kırsal' },
  { value: 500, label: 'Kasaba' },
  { value: 2500, label: 'Şehir' },
  { value: 10000, label: 'Metropol' },
  { value: 25000, label: 'Mega kent' },
];

const UNITS: Array<{ label: string; multiplier: number }> = [
  { label: 'kt', multiplier: 1 },
  { label: 'Mt', multiplier: 1e3 },
  { label: 'Gt', multiplier: 1e6 },
  { label: 'Tt', multiplier: 1e9 },
];

const MAP_STYLES: Array<{ value: MapStyle; label: string }> = [
  { value: 'satellite', label: 'Uydu' },
  { value: 'streets', label: 'Sokak' },
  { value: 'dark', label: 'Karanlık' },
];

const SLIDER_MIN_LOG = Math.log10(0.01);
const SLIDER_MAX_LOG = Math.log10(100000);

function yieldToSlider(value: number): number {
  const clamped = Math.min(100000, Math.max(0.01, value));
  return ((Math.log10(clamped) - SLIDER_MIN_LOG) / (SLIDER_MAX_LOG - SLIDER_MIN_LOG)) * 1000;
}

function sliderToYield(value: number): number {
  return Math.pow(10, SLIDER_MIN_LOG + (SLIDER_MAX_LOG - SLIDER_MIN_LOG) * (value / 1000));
}

function roundYield(value: number): number {
  if (value >= 1000) return Math.round(value);
  if (value >= 100) return Math.round(value * 10) / 10;
  if (value >= 10) return Math.round(value * 100) / 100;
  return Math.round(value * 1000) / 1000;
}

function rawYield(value: number): string {
  return String(Number(value.toFixed(6)));
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle">
      <span className="toggle__label">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </label>
  );
}

export function ControlPanel({
  settings,
  onChange,
  onClearAll,
  burstCount,
  open,
  onClose,
}: ControlPanelProps) {
  const [customValue, setCustomValue] = useState(() => rawYield(settings.yieldKt));
  const [customUnit, setCustomUnit] = useState(0);
  const [customError, setCustomError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setCustomValue(rawYield(settings.yieldKt));
    setCustomError(null);
  }, [settings.yieldKt]);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const applyCustomYield = () => {
    const normalized = customValue.trim().replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCustomError('Geçerli bir pozitif sayı girin.');
      return;
    }
    const kt = parsed * UNITS[customUnit].multiplier;
    if (kt < MIN_YIELD_KT) {
      setCustomError(`En küçük değer ${fmtYield(MIN_YIELD_KT)}.`);
      return;
    }
    if (kt > MAX_YIELD_KT) {
      setCustomError(`Üst sınır ${fmtYield(MAX_YIELD_KT)}.`);
      return;
    }
    setCustomError(null);
    onChange({ yieldKt: clampYield(kt) });
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    onClearAll();
  };

  return (
    <aside className={`panel panel-left ${open ? 'is-open' : ''}`} aria-label="Patlama kontrol paneli">
      <div className="panel__head">
        <div>
          <span className="panel__kicker">Simülasyon</span>
          <h2 className="panel__title">Patlama Kontrolü</h2>
        </div>
        <button type="button" className="panel__close" onClick={onClose} aria-label="Paneli kapat">
          ✕
        </button>
      </div>

      <div className="panel__scroll">
        <div className="arm-status">
          <span className="arm-status__dot" aria-hidden="true" />
          <span>Silah hazır · haritaya tıkla</span>
          <strong>{fmtYield(settings.yieldKt)}</strong>
        </div>

        <section className="panel-section">
          <div className="section-head">
            <h3>Patlama gücü</h3>
            <span className="section-note">Sınırsız verim</span>
          </div>

          <div className="yield-display">
            <span className="yield-display__value">{fmtYieldPlain(settings.yieldKt)}</span>
            <span className="yield-display__hint">TNT eşdeğeri</span>
          </div>

          <input
            type="range"
            className="range range--yield"
            min={0}
            max={1000}
            step={1}
            value={yieldToSlider(settings.yieldKt)}
            onChange={(event) =>
              onChange({ yieldKt: roundYield(sliderToYield(Number(event.target.value))) })
            }
            aria-label="Patlama gücü (logaritmik)"
          />
          <div className="range-scale">
            <span>0,01 kt</span>
            <span>1 kt</span>
            <span>100 kt</span>
            <span>100.000 kt</span>
          </div>

          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.kt}
                className={`preset ${settings.yieldKt === preset.kt ? 'is-active' : ''}`}
                onClick={() => onChange({ yieldKt: preset.kt })}
              >
                <strong>{preset.label}</strong>
                <span>{preset.sub}</span>
              </button>
            ))}
          </div>

          <div className="custom-yield">
            <label className="sr-only" htmlFor="custom-yield">
              Özel patlama gücü
            </label>
            <input
              id="custom-yield"
              type="text"
              inputMode="decimal"
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyCustomYield();
              }}
              placeholder="Özel değer"
            />
            <select
              value={customUnit}
              onChange={(event) => setCustomUnit(Number(event.target.value))}
              aria-label="Birim"
            >
              {UNITS.map((unit, index) => (
                <option key={unit.label} value={index}>
                  {unit.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={applyCustomYield}>
              Uygula
            </button>
          </div>
          {customError && <p className="field-error">{customError}</p>}
        </section>

        <section className="panel-section">
          <div className="section-head">
            <h3>Patlama tipi</h3>
          </div>
          <div className="segmented segmented--stack">
            <button
              type="button"
              className={settings.burstType === 'airburst' ? 'is-active' : ''}
              onClick={() => onChange({ burstType: 'airburst' })}
            >
              <strong>Hava patlaması</strong>
              <span>Maksimum alan etkisi · krater yok</span>
            </button>
            <button
              type="button"
              className={settings.burstType === 'surface' ? 'is-active' : ''}
              onClick={() => onChange({ burstType: 'surface' })}
            >
              <strong>Yüzey patlaması</strong>
              <span>Krater · yoğun yerel serpinti</span>
            </button>
          </div>
        </section>

        <section className="panel-section">
          <div className="section-head">
            <h3>Rüzgâr & serpinti</h3>
            <span className="section-note">{cardinal(settings.windDirDeg)}</span>
          </div>

          <div className="wind-row">
            <div className="compass" aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="39" className="compass__ring" />
                <circle cx="50" cy="50" r="30" className="compass__inner" />
                {Array.from({ length: 12 }).map((_, index) => (
                  <line
                    key={index}
                    x1="50"
                    y1="13"
                    x2="50"
                    y2={index % 3 === 0 ? '21' : '17'}
                    className="compass__tick"
                    transform={`rotate(${index * 30} 50 50)`}
                  />
                ))}
                <g transform={`rotate(${settings.windDirDeg} 50 50)`} className="compass__arrow">
                  <path d="M50 24 L57 44 L50 39 L43 44 Z" />
                  <line x1="50" y1="39" x2="50" y2="76" />
                </g>
                <text x="50" y="10" className="compass__letter" textAnchor="middle">
                  K
                </text>
              </svg>
            </div>
            <div className="wind-controls">
              <label className="field-label" htmlFor="wind-dir">
                Serpinti yönü
                <span>
                  {fmt(settings.windDirDeg, 0)}° {cardinal(settings.windDirDeg)}
                </span>
              </label>
              <input
                id="wind-dir"
                type="range"
                className="range"
                min={0}
                max={355}
                step={5}
                value={settings.windDirDeg}
                onChange={(event) => onChange({ windDirDeg: Number(event.target.value) })}
              />
              <label className="field-label" htmlFor="wind-speed">
                Rüzgâr hızı
                <span>{fmt(settings.windSpeedKmh, 0)} km/sa</span>
              </label>
              <input
                id="wind-speed"
                type="range"
                className="range"
                min={2}
                max={90}
                step={1}
                value={settings.windSpeedKmh}
                onChange={(event) => onChange({ windSpeedKmh: Number(event.target.value) })}
              />
            </div>
          </div>
          <p className="field-help">
            Hava patlamalarında yerel serpinti oluşmaz; serpinti yalnızca yüzey patlamalarında
            görüntülenir.
          </p>
        </section>

        <section className="panel-section">
          <div className="section-head">
            <h3>Nüfus yoğunluğu</h3>
            <span className="section-note">kişi/km²</span>
          </div>
          <div className="density-input">
            <input
              type="number"
              min={0}
              max={200000}
              step={50}
              value={settings.populationDensity}
              onChange={(event) =>
                onChange({ populationDensity: Math.max(0, Number(event.target.value) || 0) })
              }
              aria-label="Nüfus yoğunluğu"
            />
            <span>kişi / km²</span>
          </div>
          <div className="chip-row">
            {DENSITIES.map((density) => (
              <button
                type="button"
                key={density.value}
                className={`chip ${settings.populationDensity === density.value ? 'is-active' : ''}`}
                onClick={() => onChange({ populationDensity: density.value })}
              >
                {density.label}
              </button>
            ))}
          </div>
          <p className="field-help">
            Gerçek nüfus verisi kullanılmaz; can kaybı tahmini seçilen sabit yoğunluğa göre yapılır.
          </p>
        </section>

        <section className="panel-section">
          <div className="section-head">
            <h3>Katmanlar</h3>
          </div>
          <div className="toggle-list">
            <Toggle
              label="Şok dalgası (psi)"
              checked={settings.showBlast}
              onChange={(value) => onChange({ showBlast: value })}
            />
            <Toggle
              label="Isıl ışınım (yanık)"
              checked={settings.showThermal}
              onChange={(value) => onChange({ showThermal: value })}
            />
            <Toggle
              label="Yerel serpinti"
              checked={settings.showFallout}
              onChange={(value) => onChange({ showFallout: value })}
            />
            <Toggle
              label="Yarıçap etiketleri"
              checked={settings.showLabels}
              onChange={(value) => onChange({ showLabels: value })}
            />
          </div>
        </section>

        <section className="panel-section">
          <div className="section-head">
            <h3>Harita</h3>
          </div>
          <div className="segmented segmented--equal">
            {MAP_STYLES.map((style) => (
              <button
                type="button"
                key={style.value}
                className={settings.mapStyle === style.value ? 'is-active' : ''}
                onClick={() => onChange({ mapStyle: style.value })}
              >
                {style.label}
              </button>
            ))}
            <button
              type="button"
              className={settings.mapStyle === 'google' ? 'is-active' : ''}
              disabled={!settings.googleApiKey.trim()}
              title={
                settings.googleApiKey.trim()
                  ? 'Google uydu görüntüsü'
                  : 'Önce aşağıya bir Google Map Tiles API anahtarı girin'
              }
              onClick={() => onChange({ mapStyle: 'google' })}
            >
              Google
            </button>
          </div>

          <details className="google-key">
            <summary>Google Harita API anahtarı</summary>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={settings.googleApiKey}
              placeholder="AIza..."
              onChange={(event) => onChange({ googleApiKey: event.target.value })}
              aria-label="Google Map Tiles API anahtarı"
            />
            <p>
              Google Maps Platform &gt; Map Tiles API etkin ve faturalandırma açık olmalıdır.
              Anahtar yalnızca bu tarayıcıda saklanır. EEA faturalandırma adreslerinde 2D uydu
              karoları kullanılamaz.
            </p>
          </details>
        </section>

        <div className="panel-actions">
          <button
            type="button"
            className={`btn btn--danger ${confirmClear ? 'is-confirming' : ''}`}
            onClick={handleClear}
            disabled={burstCount === 0}
          >
            {confirmClear ? 'Emin misin? Tümünü sil' : `Tüm patlamaları temizle (${burstCount})`}
          </button>
          <p className="panel-disclaimer">
            Bu araç yalnızca eğitim ve görselleştirme amaçlıdır. Gerçek silah etkileri; arazi, hava
            durumu, bina yapısı ve yüksekliğe göre değişir.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default ControlPanel;
