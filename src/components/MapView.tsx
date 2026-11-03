import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Detonation, MapStyle } from '../types';
import { plumePolygon } from '../lib/geo';
import { createGoogleTileSession } from '../lib/googleTiles';
import { fmtDistance, fmtYield } from '../lib/format';

interface MapViewProps {
  detonations: Detonation[];
  selectedId: string | null;
  showBlast: boolean;
  showThermal: boolean;
  showFallout: boolean;
  showLabels: boolean;
  mapStyle: MapStyle;
  googleApiKey: string;
  onDetonate: (lat: number, lng: number) => void;
  onSelect: (id: string) => void;
  onMapStyleChange: (style: MapStyle) => void;
  flyTarget: { lat: number; lng: number; zoom?: number; nonce: number } | null;
}

const INITIAL_CENTER: [number, number] = [41.0082, 28.9784];
const INITIAL_ZOOM = 12;

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const CARTO_VOYAGER =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const ATTRIBUTION =
  'Harita: Esri, Maxar, Earthstar Geographics, GIS User Community · CARTO · OpenStreetMap katkıcıları';

function hitIcon(selected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'hit-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div class="hit-pin ${selected ? 'is-selected' : ''}">
      <span class="hit-pin__pulse"></span>
      <span class="hit-pin__core">☢</span>
    </div>`,
  });
}

function ringLabelIcon(label: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'ring-label-wrap',
    iconSize: [1, 1],
    html: `<div class="ring-label" style="--ring-color:${color}"><span></span>${label}</div>`,
  });
}

function mushroomMarkup(size: number, seed: string): string {
  const id = `mg-${seed.replace(/[^a-zA-Z0-9]/g, '')}`;
  return `<div class="fx-cloud" style="width:${size}px;height:${Math.round(size * 1.6)}px">
    <svg viewBox="0 0 120 190" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd9a0" />
          <stop offset="0.45" stop-color="#e8804a" />
          <stop offset="1" stop-color="#48231f" />
        </linearGradient>
        <linearGradient id="${id}-stem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#2a1a17" />
          <stop offset="1" stop-color="#d07a4c" />
        </linearGradient>
        <radialGradient id="${id}-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#ffca7a" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ff7a18" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="60" rx="58" ry="52" fill="url(#${id}-glow)" />
      <path d="M50 78 C52 108 44 150 33 188 L87 188 C76 150 68 108 70 78 Z" fill="url(#${id}-stem)" opacity="0.92" />
      <ellipse cx="34" cy="118" rx="16" ry="9" fill="#8a4b34" opacity="0.5" />
      <ellipse cx="86" cy="140" rx="13" ry="7" fill="#8a4b34" opacity="0.4" />
      <g opacity="0.94">
        <ellipse cx="60" cy="52" rx="46" ry="27" fill="url(#${id}-cap)" />
        <circle cx="27" cy="52" r="21" fill="#c96d43" />
        <circle cx="93" cy="52" r="20" fill="#b9603c" />
        <circle cx="45" cy="34" r="19" fill="#f0a465" />
        <circle cx="75" cy="33" r="17" fill="#e29057" />
        <circle cx="60" cy="60" r="23" fill="#f6b87c" opacity="0.8" />
        <circle cx="60" cy="58" r="13" fill="#ffe2b8" opacity="0.65" />
      </g>
      <g opacity="0.35" fill="#f7c499">
        <circle cx="34" cy="26" r="6" />
        <circle cx="66" cy="18" r="8" />
        <circle cx="92" cy="30" r="5" />
      </g>
    </svg>
  </div>`;
}

export function MapView({
  detonations,
  selectedId,
  showBlast,
  showThermal,
  showFallout,
  showLabels,
  mapStyle,
  googleApiKey,
  onDetonate,
  onSelect,
  onMapStyleChange,
  flyTarget,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const ringsRef = useRef<L.LayerGroup | null>(null);
  const plumesRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const labelsRef = useRef<L.LayerGroup | null>(null);
  const fxRef = useRef<L.LayerGroup | null>(null);
  const baseLayerRef = useRef<L.Layer | null>(null);
  const satelliteLabelsRef = useRef<L.Layer | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<Set<number>>(new Set());
  const [tileError, setTileError] = useState<string | null>(null);

  const onDetonateRef = useRef(onDetonate);
  const onSelectRef = useRef(onSelect);
  onDetonateRef.current = onDetonate;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      minZoom: 2,
      maxZoom: 20,
      worldCopyJump: true,
      zoomSnap: 0.5,
    });

    map.createPane('satLabels');
    const satLabelsPane = map.getPane('satLabels');
    if (satLabelsPane) satLabelsPane.style.zIndex = '250';

    const rings = L.layerGroup().addTo(map);
    const plumes = L.layerGroup().addTo(map);
    const markers = L.layerGroup().addTo(map);
    const labels = L.layerGroup().addTo(map);
    const fx = L.layerGroup().addTo(map);

    mapRef.current = map;
    ringsRef.current = rings;
    plumesRef.current = plumes;
    markersRef.current = markers;
    labelsRef.current = labels;
    fxRef.current = fx;

    const clickHandler = (event: L.LeafletMouseEvent) => {
      onDetonateRef.current(event.latlng.lat, event.latlng.lng);
    };
    map.on('click', clickHandler);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      rafRef.current.forEach((id) => cancelAnimationFrame(id));
      rafRef.current.clear();
      seenRef.current.clear();
      map.off('click', clickHandler);
      map.remove();
      mapRef.current = null;
      ringsRef.current = null;
      plumesRef.current = null;
      markersRef.current = null;
      labelsRef.current = null;
      fxRef.current = null;
      baseLayerRef.current = null;
      satelliteLabelsRef.current = null;
    };
  }, []);

  // Harita stilini uygula
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const clearBase = () => {
      if (baseLayerRef.current) {
        map.removeLayer(baseLayerRef.current);
        baseLayerRef.current = null;
      }
      if (satelliteLabelsRef.current) {
        map.removeLayer(satelliteLabelsRef.current);
        satelliteLabelsRef.current = null;
      }
    };

    const applyBase = (layer: L.Layer) => {
      if (cancelled) return;
      baseLayerRef.current = layer;
      layer.addTo(map);
    };

    clearBase();
    setTileError(null);

    if (mapStyle === 'satellite') {
      applyBase(
        L.tileLayer(ESRI_IMAGERY, {
          maxZoom: 20,
          maxNativeZoom: 19,
          attribution: ATTRIBUTION,
        }),
      );
      const labels = L.tileLayer(ESRI_LABELS, {
        maxZoom: 20,
        maxNativeZoom: 18,
        pane: 'satLabels',
        opacity: 0.9,
      });
      satelliteLabelsRef.current = labels;
      labels.addTo(map);
    } else if (mapStyle === 'streets') {
      applyBase(L.tileLayer(CARTO_VOYAGER, { maxZoom: 20, subdomains: 'abcd' }));
    } else if (mapStyle === 'dark') {
      applyBase(L.tileLayer(CARTO_DARK, { maxZoom: 20, subdomains: 'abcd' }));
    } else if (mapStyle === 'google') {
      if (!googleApiKey.trim()) {
        setTileError('Google katmanı için API anahtarı gerekli. Varsayılan uydu görüntüsü kullanılıyor.');
        onMapStyleChange('satellite');
        return;
      }
      createGoogleTileSession(googleApiKey)
        .then((session) => {
          if (cancelled) return;
          applyBase(
            L.tileLayer(session.tileUrl, {
              maxZoom: 22,
              maxNativeZoom: 21,
              tileSize: 256,
              attribution: `© Google · ${session.copyright}`,
            }),
          );
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message =
            error instanceof Error ? error.message : 'Google karoları yüklenemedi.';
          setTileError(`${message} Varsayılan uydu görüntüsüne dönüldü.`);
          onMapStyleChange('satellite');
        });
    }

    return () => {
      cancelled = true;
    };
  }, [mapStyle, googleApiKey, onMapStyleChange]);

  // Patlamaları çiz
  useEffect(() => {
    const map = mapRef.current;
    const rings = ringsRef.current;
    const plumes = plumesRef.current;
    const markers = markersRef.current;
    const labels = labelsRef.current;
    if (!map || !rings || !plumes || !markers || !labels) return;

    rings.clearLayers();
    plumes.clearLayers();
    markers.clearLayers();
    labels.clearLayers();

    detonations.forEach((detonation) => {
      const selected = detonation.id === selectedId;
      const { effects, params } = detonation;

      if (showFallout && effects.fallout) {
        const bands = [
          {
            length: effects.fallout.lengthKm,
            width: effects.fallout.widthKm,
            color: '#5cffb0',
            opacity: 0.1,
          },
          {
            length: effects.fallout.midDoseLengthKm,
            width: effects.fallout.widthKm * 0.82,
            color: '#ffe066',
            opacity: 0.12,
          },
          {
            length: effects.fallout.highDoseLengthKm,
            width: effects.fallout.widthKm * 0.62,
            color: '#ff8c1a',
            opacity: 0.16,
          },
        ];

        bands.forEach((band) => {
          const polygon = L.polygon(
            plumePolygon(
              detonation.lat,
              detonation.lng,
              params.windDirDeg,
              band.length,
              band.width,
            ),
            {
              color: band.color,
              weight: selected ? 1.4 : 1,
              opacity: selected ? 0.7 : 0.35,
              fillColor: band.color,
              fillOpacity: selected ? band.opacity + 0.04 : band.opacity * 0.7,
              interactive: false,
              className: 'fallout-plume',
            },
          );
          polygon.addTo(plumes);
        });
      }

      effects.rings.forEach((ring) => {
        if (ring.group === 'blast' && !showBlast) return;
        if (ring.group === 'thermal' && !showThermal) return;

        const color = ring.color;
        const circle = L.circle([detonation.lat, detonation.lng], {
          radius: ring.radiusKm * 1000,
          color,
          weight: selected ? 1.8 : 1.1,
          opacity: selected ? 0.95 : 0.45,
          fillColor: color,
          fillOpacity: ring.group === 'fireball' ? (selected ? 0.32 : 0.16) : selected ? 0.07 : 0.03,
          dashArray: ring.dash ? '5 7' : undefined,
          interactive: true,
        });
        circle.bindTooltip(
          `<strong>${ring.label}</strong><br/><span>${fmtDistance(ring.radiusKm)} yarıçap</span>`,
          { className: 'nuke-tooltip', sticky: true, direction: 'top', opacity: 1 },
        );
        circle.addTo(rings);
      });

      const marker = L.marker([detonation.lat, detonation.lng], {
        icon: hitIcon(selected),
        zIndexOffset: selected ? 900 : 400,
        keyboard: false,
      });
      marker.on('click', (event) => {
        event.originalEvent.stopPropagation();
        onSelectRef.current(detonation.id);
      });
      marker.bindTooltip(
        `<strong>${fmtYield(detonation.params.yieldKt)}</strong><br/><span>${fmtDistance(
          effects.blast[1].radiusKm,
        )} · 5 psi</span>`,
        { className: 'nuke-tooltip', direction: 'top', offset: [0, -14], opacity: 1 },
      );
      marker.addTo(markers);

      if (showLabels && selected) {
        effects.rings.forEach((ring) => {
          if (ring.group === 'blast' && !showBlast) return;
          if (ring.group === 'thermal' && !showThermal) return;
          if (ring.group === 'fireball') return;
          const point: [number, number] = [
            detonation.lat + (ring.radiusKm * 1000) / 111_320,
            detonation.lng,
          ];
          L.marker(point, {
            icon: ringLabelIcon(ring.label, ring.color),
            interactive: false,
            keyboard: false,
          }).addTo(labels);
        });
      }
    });
  }, [detonations, selectedId, showBlast, showThermal, showFallout, showLabels]);

  // Yeni patlamalar için animasyon
  useEffect(() => {
    const map = mapRef.current;
    const fx = fxRef.current;
    if (!map || !fx) return;

    detonations.forEach((detonation) => {
      if (seenRef.current.has(detonation.id)) return;
      seenRef.current.add(detonation.id);

      const latlng = L.latLng(detonation.lat, detonation.lng);

      const flash = L.marker(latlng, {
        icon: L.divIcon({
          className: 'fx-flash-anchor',
          iconSize: [1, 1],
          html: '<div class="fx-flash"></div>',
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1200,
      }).addTo(fx);
      window.setTimeout(() => {
        if (mapRef.current) fx.removeLayer(flash);
      }, 1800);

      const shock = L.circle(latlng, {
        radius: 0,
        color: detonation.effects.rings[0]?.color ?? '#ffd23f',
        weight: 2,
        opacity: 0.9,
        fill: false,
        interactive: false,
      }).addTo(fx);

      const targetRadius = Math.max(
        detonation.effects.blast[2].radiusKm * 1000,
        detonation.effects.thermal.secondKm * 1000,
      );
      const start = performance.now();
      const duration = 1200;

      const animate = (now: number) => {
        if (!mapRef.current) return;
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        shock.setRadius(targetRadius * eased);
        shock.setStyle({ opacity: 0.85 * (1 - progress), weight: 2 - progress });
        if (progress < 1) {
          const id = requestAnimationFrame(animate);
          rafRef.current.add(id);
        } else {
          fx.removeLayer(shock);
        }
      };
      const raf = requestAnimationFrame(animate);
      rafRef.current.add(raf);

      const size = Math.round(Math.min(150, 52 + Math.log10(detonation.params.yieldKt + 1) * 20));
      const cloud = L.marker(latlng, {
        icon: L.divIcon({
          className: 'fx-cloud-anchor',
          iconSize: [1, 1],
          html: mushroomMarkup(size, detonation.id),
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1300,
      }).addTo(fx);
      window.setTimeout(() => {
        if (mapRef.current) fx.removeLayer(cloud);
      }, 9500);
    });
  }, [detonations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom ?? Math.max(map.getZoom(), 12), {
      duration: 1.5,
    });
  }, [flyTarget]);

  const handleZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (detonations.length > 0) {
      const last = detonations[detonations.length - 1];
      map.flyTo([last.lat, last.lng], Math.max(map.getZoom(), 12), { duration: 1.2 });
    } else {
      map.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { duration: 1.2 });
    }
  };

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-vignette" aria-hidden="true" />
      {tileError && (
        <div className="map-tile-error" role="status">
          {tileError}
        </div>
      )}
      <div className="map-controls">
        <button type="button" onClick={() => handleZoom(1)} aria-label="Yakınlaştır">
          +
        </button>
        <button type="button" onClick={() => handleZoom(-1)} aria-label="Uzaklaştır">
          −
        </button>
        <button type="button" onClick={handleRecenter} aria-label="Son patlamaya git">
          ◎
        </button>
      </div>
      <div className="map-credit">{ATTRIBUTION}</div>
    </div>
  );
}

export default MapView;
