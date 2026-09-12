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

// ---------------------------------------------------------------------------
// SET puzzles (SPEC §6.4): pure maths behind dragging, buttons and keyboard.

/** Pointer angle in degrees clockwise from 12 around the centre, normalised to [0, 360). */
export function pointerAngle(x: number, y: number, cx: number, cy: number): number {
  const deg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * Minute-hand drag: `m = round((θ / 6) / step) * step mod 60`. Crossing 12 clockwise
 * (previous θ > 270, new θ < 90) adds an hour; crossing anticlockwise subtracts one.
 */
export function dragMinuteHand(
  time: TimeValue,
  theta: number,
  previousTheta: number,
  step: number,
): TimeValue {
  const m = (Math.round(theta / 6 / step) * step) % 60;
  let h = hoursOf(time);
  if (previousTheta > 270 && theta < 90) h += 1;
  else if (previousTheta < 90 && theta > 270) h -= 1;
  return makeTime(((h % 24) + 24) % 24, m);
}

/** Hour-hand drag: `h = round((θ − m × 0.5) / 30) mod 12`, minutes unchanged. */
export function dragHourHand(time: TimeValue, theta: number): TimeValue {
  const m = minutesOf(time);
  const h = ((Math.round((theta - m * 0.5) / 30) % 12) + 12) % 12;
  return makeTime(h, m);
}

/** Applies one button or key step (± 60 or ± the level step) with the same coupling rules. */
export function stepSetTime(time: TimeValue, deltaMinutes: number): TimeValue {
  return addMinutes(time, deltaMinutes);
}

/**
 * Start position of the SET clock: 12:00, or 6:00 when the target is within one hour of
 * 12:00 on the face, so it never starts on or next to the target.
 */
export function initialSetTime(target: TimeValue): TimeValue {
  const face = (hoursOf(target) % 12) * 60 + minutesOf(target);
  const distance = Math.min(face, 720 - face);
  return distance <= 60 ? makeTime(6, 0) : makeTime(12, 0);
}
