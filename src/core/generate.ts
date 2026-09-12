/**
 * Seeded RNG, level tables and mission generators (SPEC §7). Implemented in M1.
 */
import type { ElapsedLevel, ReadingLevel } from './types.ts';

export interface ReadingLevelSpec {
  level: ReadingLevel;
  step: 60 | 30 | 15 | 5;
  allowedMinutes: number[];
  newMinutes: number[];
}

export interface ElapsedLevelSpec {
  level: ElapsedLevel;
  step: 60 | 15;
  minGap: number;
  maxGap: number;
}

const fives = Array.from({ length: 12 }, (_, i) => i * 5);

/** Reading levels R1–R4 (SPEC §7.1, §7.2). */
export const READING_LEVELS: Record<ReadingLevel, ReadingLevelSpec> = {
  1: { level: 1, step: 60, allowedMinutes: [0], newMinutes: [] },
  2: { level: 2, step: 30, allowedMinutes: [0, 30], newMinutes: [30] },
  3: { level: 3, step: 15, allowedMinutes: [0, 15, 30, 45], newMinutes: [15, 45] },
  4: { level: 4, step: 5, allowedMinutes: fives, newMinutes: fives.filter((m) => m % 15 !== 0) },
};

/** Elapsed levels E1–E3 (SPEC §7.1). Gaps in minutes. */
export const ELAPSED_LEVELS: Record<ElapsedLevel, ElapsedLevelSpec> = {
  1: { level: 1, step: 60, minGap: 60, maxGap: 300 },
  2: { level: 2, step: 15, minGap: 15, maxGap: 120 },
  3: { level: 3, step: 15, minGap: 135, maxGap: 360 },
};

/** Small deterministic PRNG (mulberry32) so missions replay identically from their seed (SPEC §7.6). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
