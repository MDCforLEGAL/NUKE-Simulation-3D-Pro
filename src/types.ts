export type BurstType = 'airburst' | 'surface';

export type MapStyle = 'satellite' | 'streets' | 'dark' | 'google';

export interface SimulationSettings {
  yieldKt: number;
  burstType: BurstType;
  windDirDeg: number;
  windSpeedKmh: number;
  populationDensity: number;
  showBlast: boolean;
  showThermal: boolean;
  showFallout: boolean;
  showLabels: boolean;
  mapStyle: MapStyle;
  googleApiKey: string;
}

export interface DetonationParams {
  yieldKt: number;
  burstType: BurstType;
  windDirDeg: number;
  windSpeedKmh: number;
  populationDensity: number;
}

export type RingGroup = 'blast' | 'thermal' | 'fireball';

export interface RingSpec {
  key: string;
  label: string;
  radiusKm: number;
  color: string;
  group: RingGroup;
  dash?: boolean;
}

export interface BlastBand {
  key: 'psi20' | 'psi5' | 'psi1';
  psi: number;
  radiusKm: number;
  fatalities: number;
  injuries: number;
}

export interface Effects {
  yieldKt: number;
  burstType: BurstType;
  fireballRadiusM: number;
  blast: BlastBand[];
  thermal: { firstKm: number; secondKm: number; thirdKm: number };
  crater: { radiusM: number; depthM: number } | null;
  cloud: { topKm: number; baseKm: number; radiusKm: number };
  seismicMb: number | null;
  fallout: {
    lengthKm: number;
    widthKm: number;
    areaKm2: number;
    highDoseLengthKm: number;
    midDoseLengthKm: number;
  } | null;
  casualties: {
    fatalities: number;
    injuries: number;
    affected: number;
    exposed: number;
  };
  rings: RingSpec[];
}

export interface Detonation {
  id: string;
  lat: number;
  lng: number;
  createdAt: number;
  params: DetonationParams;
  effects: Effects;
}

export interface SearchResult {
  label: string;
  lat: number;
  lng: number;
}
