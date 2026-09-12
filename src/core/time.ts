/**
 * Time values, formatting, hand angles and snapping (SPEC §6.1–§6.3).
 * A time value is an integer number of minutes since midnight, 0–1439.
 */
import type { DigitalMode, TimeValue } from './types.ts';

export const MINUTES_PER_DAY = 1440;

export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/** Wraps any integer onto the 0–1439 circle. */
export function normalizeTime(t: number): TimeValue {
  const n = Math.round(t) % MINUTES_PER_DAY;
  return n < 0 ? n + MINUTES_PER_DAY : n;
}

/** Builds a time value from a 24-hour clock reading. */
export function makeTime(hour: number, minute: number): TimeValue {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new RangeError(`makeTime expects integers, got ${hour}:${minute}`);
  }
  return normalizeTime(hour * 60 + minute);
}

export function isTimeValue(t: unknown): t is TimeValue {
  return typeof t === 'number' && Number.isInteger(t) && t >= 0 && t < MINUTES_PER_DAY;
}

/** Hour 0–23. */
export function hoursOf(t: TimeValue): number {
  return Math.floor(normalizeTime(t) / 60);
}

/** Minute 0–59. */
export function minutesOf(t: TimeValue): number {
  return normalizeTime(t) % 60;
}

/** Hour on a 12-hour face, 1–12 (0 and 12 both show as 12). */
export function hour12Of(t: TimeValue): number {
  const h = hoursOf(t) % 12;
  return h === 0 ? 12 : h;
}

/** Degrees clockwise from 12 for the minute hand: m × 6. */
export function minuteAngle(t: TimeValue): number {
  return minutesOf(t) * 6;
}

/** Degrees clockwise from 12 for the hour hand: (h mod 12) × 30 + m × 0.5. Moves continuously. */
export function hourAngle(t: TimeValue): number {
  return (hoursOf(t) % 12) * 30 + minutesOf(t) * 0.5;
}

/**
 * Digital text (SPEC §6.2). 12-hour: "3:30" (no leading zero, no AM/PM).
 * 24-hour: "09:15" (leading zero).
 */
export function formatTime(t: TimeValue, mode: DigitalMode): string {
  const m = minutesOf(t).toString().padStart(2, '0');
  if (mode === '12h') {
    return `${hour12Of(t)}:${m}`;
  }
  return `${hoursOf(t).toString().padStart(2, '0')}:${m}`;
}

/**
 * Snaps to the nearest multiple of `step` minutes; ties round up.
 * The result is wrapped onto 0–1439, so snapping 23:59 to the hour gives 00:00.
 */
export function snap(t: number, step: number): TimeValue {
  if (!Number.isInteger(step) || step <= 0) {
    throw new RangeError(`snap step must be a positive integer, got ${step}`);
  }
  return normalizeTime(Math.floor(t / step + 0.5) * step);
}

/** True when two times look the same on a 12-hour face: (h mod 12, m) equal. */
export function sameFace(a: TimeValue, b: TimeValue): boolean {
  return hoursOf(a) % 12 === hoursOf(b) % 12 && minutesOf(a) === minutesOf(b);
}

/** Day period for the badge in 24-hour reading mode (SPEC §6.1). */
export function periodOf(t: TimeValue): DayPeriod {
  const h = hoursOf(t);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

/** Adds minutes and wraps onto the day. */
export function addMinutes(t: TimeValue, minutes: number): TimeValue {
  return normalizeTime(t + minutes);
}
