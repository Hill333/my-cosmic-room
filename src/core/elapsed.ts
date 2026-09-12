/**
 * Elapsed-time maths and hints (SPEC §8). Implemented in M1.
 * Planned exports: formatDuration, durationChoices, decomposeJumps.
 */
import type { TimeValue } from './types.ts';

export interface Jump {
  /** Jump length in minutes, a positive multiple of 15. */
  minutes: number;
  /** Time reached after this jump. */
  to: TimeValue;
}

export interface DurationParts {
  hours: number;
  minutes: 0 | 15 | 30 | 45;
}

/** Splits a duration in minutes into hours and a quarter-hour remainder (SPEC §8.1). */
export function durationParts(minutes: number): DurationParts {
  return { hours: Math.floor(minutes / 60), minutes: (minutes % 60) as DurationParts['minutes'] };
}
