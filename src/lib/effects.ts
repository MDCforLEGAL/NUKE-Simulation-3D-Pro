import type {
  BlastBand,
  BurstType,
  DetonationParams,
  Effects,
  RingSpec,
} from '../types';

/**
 * Eğitim amaçlı nükleer etki modeli.
 *
 * Kaynaklar:
 *  - Glasstone & Dolan, "The Effects of Nuclear Weapons" (1977), böl. 2, 3, 6, 9
 *  - Carey Sublette, Nuclear Weapons FAQ §5 (thermal scaling, blast scaling)
 *  - Fletcher et al., CEX-62.2 (1963) — NUKEMAP'in de temel aldığı eğri uyarlamaları
 *
 * Formüller 1 kt – 20 Mt aralığında kalibre edilmiştir. Bu aralığın dışında
 * sonuçlar ekstrapolasyondur ve arayüzde bu açıkça belirtilir.
 */

export const MIN_YIELD_KT = 1e-6;
export const MAX_YIELD_KT = 1e10;
export const MODEL_VALID_MIN_KT = 0.1;
export const MODEL_VALID_MAX_KT = 20000;

const PSI_KNOTS: Record<BlastBand['key'], Array<[number, number]>> = {
  // [verim (kt), yarıçap (km)] — optimum hava patlaması
  psi20: [
    [1, 0.2],
    [20, 0.6],
    [1000, 2.4],
    [20000, 6.4],
  ],
  psi5: [
    [1, 0.6],
    [20, 1.7],
    [1000, 6.2],
    [20000, 17],
  ],
  psi1: [
    [1, 1.7],
    [20, 4.7],
    [1000, 17],
    [20000, 47],
  ],
};

const CLOUD_KNOTS: Array<[number, number]> = [
  [0.1, 1.6],
  [1, 4],
  [10, 9.2],
  [20, 11.2],
  [100, 14.5],
  [1000, 19.3],
  [10000, 30],
  [100000, 52],
];

const FATALITY_FRACTION = { psi20: 0.97, psi5: 0.45, psi1: 0.04 } as const;
const INJURY_FRACTION = { psi20: 0.03, psi5: 0.35, psi1: 0.18 } as const;

export function clampYield(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(MAX_YIELD_KT, Math.max(MIN_YIELD_KT, value));
}

function logLogInterpolate(knots: Array<[number, number]>, value: number): number {
  const first = knots[0];
  const second = knots[1];
  const last = knots[knots.length - 1];
  const beforeLast = knots[knots.length - 2];

  let a = first;
  let b = second;

  if (value >= last[0]) {
    a = beforeLast;
    b = last;
  } else if (value > first[0]) {
    for (let i = 0; i < knots.length - 1; i += 1) {
      if (value >= knots[i][0] && value <= knots[i + 1][0]) {
        a = knots[i];
        b = knots[i + 1];
        break;
      }
    }
  }

  const lx = Math.log10(Math.max(value, 1e-12));
  const ax = Math.log10(a[0]);
  const bx = Math.log10(b[0]);
  const t = bx === ax ? 0 : (lx - ax) / (bx - ax);
  return Math.pow(10, Math.log10(a[1]) + t * (Math.log10(b[1]) - Math.log10(a[1])));
}

function annularArea(outerKm: number, innerKm: number): number {
  return Math.max(0, Math.PI * (outerKm * outerKm - innerKm * innerKm));
}

function buildRings(effects: Omit<Effects, 'rings'>): RingSpec[] {
  const rings: RingSpec[] = [
    {
      key: 'psi1',
      label: '1 psi · hafif hasar',
      radiusKm: effects.blast[2].radiusKm,
      color: '#ffd23f',
      group: 'blast',
    },
    {
      key: 'burn2',
      label: '2. derece yanık',
      radiusKm: effects.thermal.secondKm,
      color: '#7aa2ff',
      group: 'thermal',
      dash: true,
    },
    {
      key: 'burn3',
      label: '3. derece yanık',
      radiusKm: effects.thermal.thirdKm,
      color: '#b06cff',
      group: 'thermal',
    },
    {
      key: 'psi5',
      label: '5 psi · ağır hasar',
      radiusKm: effects.blast[1].radiusKm,
      color: '#ff8c1a',
      group: 'blast',
    },
    {
      key: 'psi20',
      label: '20 psi · tam yıkım',
      radiusKm: effects.blast[0].radiusKm,
      color: '#ff3b30',
      group: 'blast',
    },
    {
      key: 'fireball',
      label: 'Ateş topu',
      radiusKm: effects.fireballRadiusM / 1000,
      color: '#fff3c4',
      group: 'fireball',
    },
  ];

  return rings.sort((a, b) => b.radiusKm - a.radiusKm);
}

export function computeEffects(params: DetonationParams): Effects {
  const yieldKt = clampYield(params.yieldKt);
  const surface: BurstType = params.burstType;
  const isSurface = surface === 'surface';

  const fireballRadiusM = 61 * Math.pow(yieldKt, 0.4) * (isSurface ? 1.13 : 1);

  const thermalFactor = isSurface ? 0.8 : 1;
  const thermal = {
    firstKm: 1.2 * Math.pow(yieldKt, 0.38) * thermalFactor,
    secondKm: 0.87 * Math.pow(yieldKt, 0.4) * thermalFactor,
    thirdKm: 0.67 * Math.pow(yieldKt, 0.41) * thermalFactor,
  };

  const psi20 = logLogInterpolate(PSI_KNOTS.psi20, yieldKt);
  const psi5 = logLogInterpolate(PSI_KNOTS.psi5, yieldKt);
  const psi1 = logLogInterpolate(PSI_KNOTS.psi1, yieldKt);

  const density = Math.max(0, Number.isFinite(params.populationDensity) ? params.populationDensity : 0);

  const area20 = Math.PI * psi20 * psi20;
  const area5 = annularArea(psi5, psi20);
  const area1 = annularArea(psi1, psi5);

  const fatalities =
    density *
    (area20 * FATALITY_FRACTION.psi20 +
      area5 * FATALITY_FRACTION.psi5 +
      area1 * FATALITY_FRACTION.psi1);

  const injuries =
    density *
    (area20 * INJURY_FRACTION.psi20 +
      area5 * INJURY_FRACTION.psi5 +
      area1 * INJURY_FRACTION.psi1);

  const blast: BlastBand[] = [
    {
      key: 'psi20',
      psi: 20,
      radiusKm: psi20,
      fatalities: density * area20 * FATALITY_FRACTION.psi20,
      injuries: density * area20 * INJURY_FRACTION.psi20,
    },
    {
      key: 'psi5',
      psi: 5,
      radiusKm: psi5,
      fatalities: density * area5 * FATALITY_FRACTION.psi5,
      injuries: density * area5 * INJURY_FRACTION.psi5,
    },
    {
      key: 'psi1',
      psi: 1,
      radiusKm: psi1,
      fatalities: density * area1 * FATALITY_FRACTION.psi1,
      injuries: density * area1 * INJURY_FRACTION.psi1,
    },
  ];

  const cloudTopKm = Math.min(75, logLogInterpolate(CLOUD_KNOTS, yieldKt) * (isSurface ? 0.92 : 1));
  const cloud = {
    topKm: cloudTopKm,
    baseKm: cloudTopKm > 12 ? cloudTopKm * 0.55 : cloudTopKm * 0.5,
    radiusKm: cloudTopKm * 0.3,
  };

  const crater = isSurface
    ? {
        radiusM: 18.3 * Math.pow(yieldKt, 0.3),
        depthM: 9.1 * Math.pow(yieldKt, 0.3),
      }
    : null;

  const seismicMb = isSurface ? 4.75 + 0.75 * Math.log10(yieldKt / 20) : null;

  const wind = Math.max(2, params.windSpeedKmh);
  const fallout = isSurface
    ? (() => {
        const lengthKm = Math.min(6000, 28 * Math.sqrt(yieldKt) * (15 / wind));
        const widthKm = lengthKm * 0.32;
        return {
          lengthKm,
          widthKm,
          areaKm2: lengthKm * widthKm * 0.72,
          highDoseLengthKm: lengthKm * 0.38,
          midDoseLengthKm: lengthKm * 0.68,
        };
      })()
    : null;

  const base = {
    yieldKt,
    burstType: surface,
    fireballRadiusM,
    blast,
    thermal,
    crater,
    cloud,
    seismicMb,
    fallout,
    casualties: {
      fatalities,
      injuries,
      affected: fatalities + injuries,
      exposed: density * Math.PI * psi1 * psi1,
    },
  };

  return { ...base, rings: buildRings(base) };
}

export function isExtrapolated(yieldKt: number): boolean {
  return yieldKt < MODEL_VALID_MIN_KT || yieldKt > MODEL_VALID_MAX_KT;
}
