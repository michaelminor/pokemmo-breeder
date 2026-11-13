import { BaseStats, IVRange, IVResult, NatureData, StatName, STAT_ORDER } from '@/types';
import { getNatureMultiplier } from '@/data/natures';

/**
 * Calculate the actual stat value given all parameters.
 * Uses standard Gen 3-5 formula.
 */
export function calcStat(
  stat: StatName,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: NatureData,
): number {
  const evFloor = Math.floor(ev / 4);
  if (stat === 'hp') {
    // Shedinja special case
    if (base === 1) return 1;
    return Math.floor(((2 * base + iv + evFloor) * level) / 100) + level + 10;
  }
  const raw = Math.floor(((2 * base + iv + evFloor) * level) / 100) + 5;
  return Math.floor(raw * getNatureMultiplier(nature, stat));
}

/**
 * Given an observed stat value, return the range of possible IVs (0–31).
 */
export function calcIVRange(
  stat: StatName,
  base: number,
  observed: number,
  ev: number,
  level: number,
  nature: NatureData,
): IVRange {
  const possible: number[] = [];
  for (let iv = 0; iv <= 31; iv++) {
    if (calcStat(stat, base, iv, ev, level, nature) === observed) {
      possible.push(iv);
    }
  }
  return {
    min: possible.length ? possible[0] : -1,
    max: possible.length ? possible[possible.length - 1] : -1,
    possible,
  };
}

/**
 * Calculate IV ranges for all 6 stats at once.
 */
export function calcAllIVRanges(
  baseStats: BaseStats,
  observedStats: BaseStats,
  evs: BaseStats,
  level: number,
  nature: NatureData,
): IVResult {
  return Object.fromEntries(
    STAT_ORDER.map(stat => [
      stat,
      calcIVRange(stat, baseStats[stat], observedStats[stat], evs[stat], level, nature),
    ]),
  ) as IVResult;
}

/** Returns a human-readable label for an IV range */
export function ivRangeLabel(range: IVRange): string {
  if (range.possible.length === 0) return 'Invalid';
  if (range.min === range.max) return `${range.min}`;
  return `${range.min}–${range.max}`;
}

/** Returns a quality label for the best-case IV */
export function ivQuality(range: IVRange): 'perfect' | 'great' | 'good' | 'poor' | 'unknown' {
  if (range.possible.length === 0) return 'unknown';
  const best = range.max;
  if (best === 31) return 'perfect';
  if (best >= 28) return 'great';
  if (best >= 20) return 'good';
  return 'poor';
}
