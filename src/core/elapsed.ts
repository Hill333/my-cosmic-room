/**
 * Elapsed-time maths and hints (SPEC §8): duration formatting, answer choices and the
 * jump decomposition behind "Show the jumps". Pure; durations are minutes.
 */
import { translate } from '../strings/index.ts';
import { shuffle } from './rng.ts';
import { MINUTES_PER_DAY } from './time.ts';
import type { ElapsedLevel, Language, TimeValue } from './types.ts';

export interface Jump {
  /** Jump length in minutes, a positive multiple of 15. */
  minutes: number;
  /** Time reached after this jump. */
  to: TimeValue;
}

export interface DurationParts {
  hours: number;
  /** A quarter of an hour for elapsed puzzles; any five-minute count for a LATER gap. */
  minutes: number;
}

/** Splits a duration in minutes into hours and the remainder (SPEC §8.1). */
export function durationParts(minutes: number): DurationParts {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/**
 * Full form for answer buttons and questions: "4 hours 45 minutes", "1 hour", "30 minutes"
 * (SPEC §8.2). Also names the gap of a LATER puzzle ("in 1 hour 30 minutes").
 */
export function formatDuration(minutes: number, lang: Language): string {
  const { hours: h, minutes: m } = durationParts(minutes);
  if (h >= 1 && m > 0) {
    return h === 1 ? translate(lang, 'dur.h1m', { m }) : translate(lang, 'dur.hm', { h, m });
  }
  if (h >= 1) return h === 1 ? translate(lang, 'dur.h1') : translate(lang, 'dur.h', { h });
  return translate(lang, 'dur.m', { m });
}

/** Short form for timeline arcs: "+4 h", "+30 min" (SPEC §8.2). Whole hours are labelled in hours. */
export function formatJump(minutes: number, lang: Language): string {
  if (minutes % 60 === 0) return translate(lang, 'dur.short.h', { h: minutes / 60 });
  return translate(lang, 'dur.short.m', { m: minutes });
}

/** Distractor candidates per level (SPEC §8.3), as offsets from the correct duration D. */
function distractorCandidates(d: number, level: ElapsedLevel): number[] {
  if (level === 1) return [d - 60, d + 60, d + 120, d - 120];
  const nextWholeHour = d % 60 === 0 ? d + 60 : Math.ceil(d / 60) * 60;
  return [d - 30, nextWholeHour, d + 15, d - 15, d + 30, d - 60, d + 60];
}

/**
 * Three duration choices: exactly one equals `correct`, all distinct, positive multiples of 15,
 * shuffled (SPEC §8.3). For 285 at E3 the distractors are 255 and 300.
 */
export function durationChoices(correct: number, level: ElapsedLevel, rng: () => number): number[] {
  const chosen: number[] = [];
  for (const c of distractorCandidates(correct, level)) {
    if (chosen.length === 2) break;
    if (c <= 0 || c % 15 !== 0 || c === correct || chosen.includes(c)) continue;
    chosen.push(c);
  }
  // The candidate lists always yield two valid distractors for the level windows of §7.1;
  // a shorter list would mean an out-of-window duration, which is a caller bug.
  if (chosen.length < 2) throw new RangeError(`No distractors for duration ${correct}`);
  return shuffle([correct, ...chosen], rng);
}

/**
 * Jump decomposition (SPEC §8.4): whole hours first, then to the next hour boundary if the
 * remainder crosses one, then the rest. At most three jumps, each a positive multiple of 15.
 */
export function decomposeJumps(start: TimeValue, end: TimeValue): Jump[] {
  if (end <= start) throw new RangeError(`decomposeJumps needs start < end, got ${start}→${end}`);
  const jumps: Jump[] = [];
  let t = start;
  const hours = Math.floor((end - start) / 60);
  if (hours >= 1) {
    t += 60 * hours;
    jumps.push({ minutes: 60 * hours, to: t });
  }
  if (t < end && t % 60 !== 0 && (t % 60) + (end - t) > 60) {
    const boundary = 60 - (t % 60);
    t += boundary;
    jumps.push({ minutes: boundary, to: t });
  }
  if (t < end) jumps.push({ minutes: end - t, to: end });
  return jumps;
}

/**
 * Three arrival times for an ARRIVE puzzle: the true end plus two wrong ones that model the
 * same duration mistakes as §8.3, applied to the start ("forgot the minutes", "an hour too
 * many"). Every choice lies after the start and before midnight. Extra candidates a quarter
 * or half hour either side cover the corners where the level's own list runs out (a 1-hour
 * journey ending at 22:00 cannot go two hours later).
 */
export function arrivalChoices(
  start: TimeValue,
  end: TimeValue,
  level: ElapsedLevel,
  rng: () => number,
): TimeValue[] {
  const d = end - start;
  const candidates = [...distractorCandidates(d, level), d + 30, d - 30, d + 15, d - 15];
  const chosen: TimeValue[] = [];
  for (const c of candidates) {
    if (chosen.length === 2) break;
    const t = start + c;
    if (c <= 0 || c % 15 !== 0 || t === end || t >= MINUTES_PER_DAY || chosen.includes(t)) continue;
    chosen.push(t);
  }
  if (chosen.length < 2) throw new RangeError(`No arrival distractors for ${start}→${end}`);
  return shuffle([end, ...chosen], rng);
}
