import type { Detonation } from '../types';
import { isExtrapolated } from '../lib/effects';
import {
  fmt,
  fmtArea,
  fmtCoord,
  fmtCount,
  fmtDistance,
  fmtTime,
  fmtYield,
} from '../lib/format';

interface ResultsPanelProps {
  selected: Detonation | null;
  detonations: Detonation[];
  tab: 'effects' | 'log';
  onTabChange: (tab: 'effects' | 'log') => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onLocate: (detonation: Detonation) => void;
  onClearAll: () => void;
  open: boolean;
  onClose: () => void;
}

export function ResultsPanel({
  selected,
  detonations,
  tab,
  onTabChange,
  onSelect,
  onDelete,
  onLocate,
  onClearAll,
  open,
  onClose,
}: ResultsPanelProps) {
  return (
    <aside className={`panel panel-right ${open ? 'is-open' : ''}`} aria-label="Etki analizi paneli">
      <div className="panel__head">
        <div>
          <span className="panel__kicker">Analiz</span>
          <h2 className="panel__title">Etki Raporu</h2>
        </div>
        <button type="button" className="panel__close" onClick={onClose} aria-label="Paneli kapat">
          ✕
        </button>
      </div>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'effects'}
          className={tab === 'effects' ? 'is-active' : ''}
          onClick={() => onTabChange('effects')}
        >
          Etkiler
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'log'}
          className={tab === 'log' ? 'is-active' : ''}
          onClick={() => onTabChange('log')}
        >
          Kayıtlar
          <span className="tab-count">{detonations.length}</span>
        </button>
      </div>

      <div className="panel__scroll">
        {tab === 'effects' &&
          (selected ? (
            <EffectsView
              detonation={selected}
              onLocate={onLocate}
              onDelete={onDelete}
              showDelete={detonations.length > 1}
            />
          ) : (
            <EmptyEffects />
          ))}

        {tab === 'log' &&
          (detonations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">☢</span>
              <h3>Kayıt yok</h3>
              <p>Haritada bir hedef seçtiğinizde patlamalar burada listelenir.</p>
            </div>
          ) : (
            <>
              <div className="log-head">
                <span>{detonations.length} patlama</span>
                <button type="button" onClick={onClearAll}>
                  Tümünü sil
                </button>
              </div>
              <ol className="log-list">
                {[...detonations].reverse().map((detonation, index) => (
                  <li key={detonation.id}>
                    <div
                      className={`log-item ${selected?.id === detonation.id ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="log-item__select"
                        onClick={() => {
                          onSelect(detonation.id);
                          onTabChange('effects');
                        }}
                      >
                        <span className="log-item__index">{detonations.length - index}</span>
                        <span className="log-item__body">
                          <strong>{fmtYield(detonation.params.yieldKt)}</strong>
                          <span>
                            {fmtCoord(detonation.lat, detonation.lng, 3)} ·{' '}
                            {fmtTime(detonation.createdAt)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="log-item__delete"
                        aria-label="Patlamayı sil"
                        onClick={() => onDelete(detonation.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ))}
      </div>
    </aside>
  );
}

function EmptyEffects() {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">☢</span>
      <h3>Hedef bekleniyor</h3>
      <p>
        Harita üzerinde herhangi bir noktaya tıklayın. Seçili güç ve ayarlarla patlama anında
        simüle edilir.
      </p>
      <ol className="empty-steps">
        <li>
          <span>1</span> Patlama gücünü seçin
        </li>
        <li>
          <span>2</span> Haritada hedefe dokunun
        </li>
        <li>
          <span>3</span> Şok, ısı ve serpinti çaplarını okuyun
        </li>
      </ol>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  );
}

function EffectsView({
  detonation,
  onLocate,
  onDelete,
  showDelete,
}: {
  detonation: Detonation;
  onLocate: (detonation: Detonation) => void;
  onDelete: (id: string) => void;
  showDelete: boolean;
}) {
  const { effects, params } = detonation;
  const stormArea = Math.PI * Math.pow(effects.blast[2].radiusKm, 2);
  const extrapolated = isExtrapolated(effects.yieldKt);

  return (
    <div className="effects">
      <div className="target-head">
        <div>
          <span className="target-head__label">Hedef koordinatı</span>
          <strong className="target-head__coords">{fmtCoord(detonation.lat, detonation.lng)}</strong>
          <span className="target-head__time">
            {fmtTime(detonation.createdAt)} ·{' '}
            {params.burstType === 'surface' ? 'Yüzey patlaması' : 'Hava patlaması'}
          </span>
        </div>
        <div className="target-head__yield">
          <strong>{fmtYield(params.yieldKt)}</strong>
          <span>verim</span>
        </div>
      </div>

      {extrapolated && (
        <div className="model-warning">
          Model 0,1 kt – 20 Mt aralığında doğrulanmıştır. Bu verim için sonuçlar
          ekstrapolasyondur.
        </div>
      )}

      <section className="report-section">
        <h3 className="report-title">
          <span className="report-dot" style={{ background: '#ff5a4a' }} />
          Şok dalgası
        </h3>
        <div className="radius-table">
          {effects.blast.map((band) => (
            <div className="radius-row" key={band.key}>
              <span className="radius-row__name">
                <span
                  className="radius-row__dot"
                  style={{
                    background:
                      band.key === 'psi20' ? '#ff3b30' : band.key === 'psi5' ? '#ff8c1a' : '#ffd23f',
                  }}
                />
                {band.psi} psi
                <em>
                  {band.psi === 20
                    ? 'tam yıkım'
                    : band.psi === 5
                      ? 'ağır hasar'
                      : 'hafif hasar'}
                </em>
              </span>
              <span className="radius-row__values">
                <strong>{fmtDistance(band.radiusKm)}</strong>
                <em>{fmtDistance(band.radiusKm * 2)} çap</em>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="report-section">
        <h3 className="report-title">
          <span className="report-dot" style={{ background: '#b06cff' }} />
          Isıl ışınım
        </h3>
        <div className="radius-table">
          {[
            { label: '3. derece yanık', value: effects.thermal.thirdKm, color: '#b06cff' },
            { label: '2. derece yanık', value: effects.thermal.secondKm, color: '#7aa2ff' },
            { label: '1. derece yanık', value: effects.thermal.firstKm, color: '#4f74d8' },
          ].map((row) => (
            <div className="radius-row" key={row.label}>
              <span className="radius-row__name">
                <span className="radius-row__dot" style={{ background: row.color }} />
                {row.label}
              </span>
              <span className="radius-row__values">
                <strong>{fmtDistance(row.value)}</strong>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="report-section">
        <h3 className="report-title">
          <span className="report-dot" style={{ background: '#ffb020' }} />
          Fiziksel etkiler
        </h3>
        <div className="stats-grid">
          <Stat
            label="Ateş topu"
            value={fmtDistance((effects.fireballRadiusM / 1000) * 2)}
            hint="çap"
          />
          <Stat label="Bulut tepesi" value={`${fmt(effects.cloud.topKm, 1)} km`} />
          <Stat
            label="Krater"
            value={effects.crater ? fmtDistance(effects.crater.radiusM / 1000) : 'Yok'}
            hint={effects.crater ? `${fmt(effects.crater.depthM, 0)} m derinlik` : 'hava patlaması'}
          />
          <Stat
            label="Sismik"
            value={effects.seismicMb !== null ? `≈ ${effects.seismicMb.toFixed(1)} mb` : 'Yok'}
            hint={effects.seismicMb !== null ? 'kaba tahmin' : 'hava patlaması'}
          />
          <Stat label="1 psi alanı" value={fmtArea(stormArea)} />
          <Stat
            label="Bulut yarıçapı"
            value={`${fmt(effects.cloud.radiusKm, 1)} km`}
            hint={`taban ${fmt(effects.cloud.baseKm, 1)} km`}
          />
        </div>
      </section>

      {effects.fallout ? (
        <section className="report-section">
          <h3 className="report-title">
            <span className="report-dot" style={{ background: '#5cffb0' }} />
            Yerel serpinti
          </h3>
          <div className="stats-grid">
            <Stat
              label="Serpinti uzunluğu"
              value={fmtDistance(effects.fallout.lengthKm)}
              hint="rüzgâr yönünde"
            />
            <Stat label="Genişlik" value={fmtDistance(effects.fallout.widthKm)} />
            <Stat
              label="Yüksek doz"
              value={fmtDistance(effects.fallout.highDoseLengthKm)}
              hint="1. bant"
            />
            <Stat label="Etkilenen alan" value={fmtArea(effects.fallout.areaKm2)} />
          </div>
          <p className="report-note">
            Serpinti yönü {fmt(params.windDirDeg, 0)}°, rüzgâr {fmt(params.windSpeedKmh, 0)}{' '}
            km/sa. Bantlar yaklaşık doz aralıklarını gösterir; gerçek dağılım tanecik boyutu ve
            yağışa bağlıdır.
          </p>
        </section>
      ) : (
        <section className="report-section">
          <h3 className="report-title">
            <span className="report-dot" style={{ background: '#5cffb0' }} />
            Yerel serpinti
          </h3>
          <p className="report-note">
            Hava patlamasında fisyon ürünleri stratosfere taşınır; yerel serpinti oluşmaz.
          </p>
        </section>
      )}

      <section className="casualty-card">
        <div className="casualty-card__head">
          <span>Tahmini can kaybı</span>
          <span>Yaralı</span>
        </div>
        <div className="casualty-card__values">
          <strong>{fmtCount(effects.casualties.fatalities)}</strong>
          <strong>{fmtCount(effects.casualties.injuries)}</strong>
        </div>
        <div className="casualty-card__foot">
          <span>1 psi içindeki nüfus: {fmtCount(effects.casualties.exposed)}</span>
          <span>Yoğunluk: {fmt(params.populationDensity, 0)} kişi/km²</span>
        </div>
        <p>
          Tahmin yalnızca şok dalgası bantlarına dayanır. Yangın, radyasyon ve serpinti kaynaklı
          kayıplar dahil değildir.
        </p>
      </section>

      <div className="effects-actions">
        <button type="button" className="btn btn--ghost" onClick={() => onLocate(detonation)}>
          Hedefe git
        </button>
        {showDelete && (
          <button
            type="button"
            className="btn btn--ghost btn--muted"
            onClick={() => onDelete(detonation.id)}
          >
            Bu kaydı sil
          </button>
        )}
      </div>
    </div>
  );
}

export default ResultsPanel;
