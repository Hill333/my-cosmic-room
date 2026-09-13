/**
 * Level tables and mission generators (SPEC §7). Pure and deterministic: every random
 * decision goes through the injected RNG, so a mission replays identically from its seed.
 */
import { arrivalChoices, durationChoices } from './elapsed.ts';
import { chance, pick, randomInt, shuffle, type Rng } from './rng.ts';
import { hour12Of, hoursOf, makeTime, minutesOf, sameFace } from './time.ts';
import {
  EXTRA_KINDS,
  isInputKind,
  type ArrivePuzzle,
  type DigitalMode,
  type ElapsedLevel,
  type ElapsedPuzzle,
  type ExtraKind,
  type LaterPuzzle,
  type Puzzle,
  type ReadingLevel,
  type ReadingPuzzle,
  type SetPuzzle,
  type TimeValue,
} from './types.ts';

export { createRng } from './rng.ts';

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

/**
 * Gaps a LATER puzzle may ask about per reading level ("What time will it be in …?"):
 * multiples of the level step up to two hours, kept to the counts a child says easily.
 */
export const LATER_GAPS: Record<ReadingLevel, readonly number[]> = {
  1: [60, 120],
  2: [30, 60, 90, 120],
  3: [15, 30, 45, 60, 75, 90],
  4: [5, 10, 15, 20, 25, 30, 45, 60],
};

/** Elapsed levels E1–E3 (SPEC §7.1). Gaps in minutes. */
export const ELAPSED_LEVELS: Record<ElapsedLevel, ElapsedLevelSpec> = {
  1: { level: 1, step: 60, minGap: 60, maxGap: 300 },
  2: { level: 2, step: 15, minGap: 15, maxGap: 120 },
  3: { level: 3, step: 15, minGap: 135, maxGap: 360 },
};

/** Elapsed puzzles lie within 06:00–22:00 and never cross midnight (SPEC §7.1). */
export const ELAPSED_WINDOW_START: TimeValue = makeTime(6, 0);
export const ELAPSED_WINDOW_END: TimeValue = makeTime(22, 0);

/** Reading puzzles in 24-hour mode use 06:00–21:59 (SPEC §7.1). */
export const READING_24H_FIRST_HOUR = 6;
export const READING_24H_LAST_HOUR = 21;

/** The required Activity B example: 14:30 → 19:15 (SPEC §7.5, §8.1). */
export const REQUIRED_E3_PAIR: readonly [TimeValue, TimeValue] = [
  makeTime(14, 30),
  makeTime(19, 15),
];

/** Probability that a target's minutes come from the level's new set (SPEC §7.2). */
export const NEW_MINUTES_PROBABILITY = 0.6;
/** Probability of a non-whole-hour gap at E2 and E3 (SPEC §7.2). */
export const NON_WHOLE_GAP_PROBABILITY = 0.75;
/** Probability of a non-zero start minute at E3 (SPEC §7.2). */
export const E3_OFFSET_START_PROBABILITY = 0.5;

const MAX_TRIES = 50;

export interface GeneratedMission {
  activity: 'A' | 'B';
  level: number;
  puzzles: Puzzle[];
}

// ---------------------------------------------------------------------------
// Reading targets

/**
 * A stored time for a face reading. In 12-hour mode the value uses hours 1–12 (12:30 is
 * stored as 750), so distinct values are distinct faces; in 24-hour mode the hour is kept.
 */
function faceTime(hour: number, minute: number, mode: DigitalMode): TimeValue {
  if (mode === '24h') return makeTime(hour, minute);
  const h = ((hour % 12) + 12) % 12;
  return makeTime(h === 0 ? 12 : h, minute);
}

/** True when a candidate reading is allowed at the level and inside the mode's hour range. */
function isAllowedReading(
  hour: number,
  minute: number,
  level: ReadingLevel,
  mode: DigitalMode,
): boolean {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return false;
  if (!READING_LEVELS[level].allowedMinutes.includes(minute)) return false;
  if (mode === '24h') return hour >= READING_24H_FIRST_HOUR && hour <= READING_24H_LAST_HOUR;
  return true;
}

/** Same time for the puzzle's purposes: same face in 12-hour mode, same value in 24-hour mode. */
export function sameReading(a: TimeValue, b: TimeValue, mode: DigitalMode): boolean {
  return mode === '12h' ? sameFace(a, b) : a === b;
}

/**
 * Picks a target weighted toward the level's new minutes (SPEC §7.2): with probability 0.6
 * the minutes come from the new set, otherwise from the level's other allowed minutes, so
 * about 60 % of targets are new (AT-09 requires 50–70 %; drawing the remainder from the full
 * allowed set, as §7.2 literally says, would give about 80 %).
 */
export function pickTarget(level: ReadingLevel, mode: DigitalMode, rng: Rng): TimeValue {
  const spec = READING_LEVELS[level];
  const useNew = spec.newMinutes.length > 0 && chance(rng, NEW_MINUTES_PROBABILITY);
  const oldMinutes = spec.allowedMinutes.filter((m) => !spec.newMinutes.includes(m));
  const minute = pick(rng, useNew ? spec.newMinutes : oldMinutes);
  const hour =
    mode === '24h'
      ? randomInt(rng, READING_24H_FIRST_HOUR, READING_24H_LAST_HOUR)
      : randomInt(rng, 1, 12);
  return faceTime(hour, minute, mode);
}

/**
 * Two distractors from an ordered candidate list of (hour, minute) readings, validated for
 * the level and mode, never the target or each other (by face, so in 24-hour mode a choice
 * never depends on the badge alone), then random allowed times as the fallback.
 */
function pickDistractors(
  target: TimeValue,
  candidates: readonly (readonly [number, number])[],
  level: ReadingLevel,
  mode: DigitalMode,
  rng: Rng,
): TimeValue[] {
  const chosen: TimeValue[] = [];
  const accept = (hour: number, minute: number): boolean => {
    if (!Number.isInteger(hour) || !isAllowedReading(hour, minute, level, mode)) return false;
    const t = faceTime(hour, minute, mode);
    if (sameFace(t, target) || chosen.some((c) => sameFace(c, t))) return false;
    chosen.push(t);
    return true;
  };
  for (const [hour, minute] of candidates) {
    if (chosen.length === 2) break;
    accept(hour, minute);
  }
  while (chosen.length < 2) {
    const t = pickTarget(level, mode, rng);
    accept(hoursOf(t), minutesOf(t));
  }
  return chosen;
}

/**
 * Three reading choices for READ, MATCH and WORDS (SPEC §7.4): the target plus two
 * distractors taken in order from the mistake-modelling candidate list, validated, then
 * shuffled.
 */
export function makeReadingChoices(
  target: TimeValue,
  level: ReadingLevel,
  mode: DigitalMode,
  rng: Rng,
): TimeValue[] {
  const h = hoursOf(target);
  const m = minutesOf(target);
  const faceHour = hour12Of(target);
  const step = READING_LEVELS[level].step;
  // In 24-hour mode a swapped reading keeps the target's half of the day.
  const swappedHour = mode === '24h' && h >= 12 ? m / 5 + 12 : m / 5;
  const candidates: [number, number][] = [
    [swappedHour, faceHour * 5], // 1: hands swapped
    [h + 1, m], // 2: hour hand read as the numeral it approaches
    [h, 60 - m], // 3: mirror minute
    [h, m === 0 ? step : 0], // 4: long hand ignored
    [h - 1, m], // 5: hour hand read as the numeral it passed
  ];
  return shuffle([target, ...pickDistractors(target, candidates, level, mode, rng)], rng);
}

/** The reading `gap` minutes after `start`, stored the way the mode stores faces. */
function laterEnd(start: TimeValue, gap: number, mode: DigitalMode): TimeValue {
  const t = start + gap;
  return faceTime(hoursOf(t), minutesOf(t), mode);
}

/** True when a LATER puzzle from `start` with `gap` stays inside the mode's hour range. */
function laterFits(start: TimeValue, gap: number, level: ReadingLevel, mode: DigitalMode): boolean {
  const end = start + gap;
  return isAllowedReading(hoursOf(end), minutesOf(end), level, mode);
}

/**
 * Three clock faces for a LATER puzzle: the true end plus two distractors modelling the
 * mistakes of moving hands forward: an hour too many, an hour too few, not moving at all,
 * moving backwards, and moving twice.
 */
export function makeLaterChoices(
  start: TimeValue,
  gap: number,
  level: ReadingLevel,
  mode: DigitalMode,
  rng: Rng,
): TimeValue[] {
  const end = start + gap;
  const at = (t: number): [number, number] => [hoursOf(t), minutesOf(t)];
  const candidates = [at(end + 60), at(end - 60), at(start), at(start - gap), at(end + gap)];
  const target = laterEnd(start, gap, mode);
  return shuffle([target, ...pickDistractors(target, candidates, level, mode, rng)], rng);
}

/**
 * Activity A mission (SPEC §7.3, D14): one READ, one MATCH, one SET and one extra kind
 * (WORDS, LATER or DIGITS) chosen per mission, shuffled so that an input puzzle (SET or
 * DIGITS) is never first.
 */
export function makeActivityAMission(
  level: ReadingLevel,
  mode: DigitalMode,
  recentTargets: readonly TimeValue[],
  rng: Rng,
): GeneratedMission {
  const extra: ExtraKind = pick(rng, EXTRA_KINDS);
  const base = ['READ', 'MATCH', 'SET', extra] as const;
  let kinds = shuffle(base, rng);
  while (isInputKind(kinds[0]!)) kinds = shuffle(base, rng);
  // A LATER puzzle's gap is fixed before its start, so the start can be chosen to fit.
  const gap = extra === 'LATER' ? pick(rng, LATER_GAPS[level]) : 0;

  const targets: TimeValue[] = [];
  for (let i = 0; i < 4; i++) {
    let tries = 0;
    for (;;) {
      const t = pickTarget(level, mode, rng);
      tries++;
      const inTargets = targets.some((x) => sameReading(x, t, mode));
      const inRecent = recentTargets.some((x) => sameReading(x, t, mode));
      const fits = kinds[i] !== 'LATER' || laterFits(t, gap, level, mode);
      if (!inTargets && fits && (!inRecent || tries > MAX_TRIES)) {
        targets.push(t);
        break;
      }
    }
  }

  const puzzles: Puzzle[] = kinds.map((kind, i) => {
    const target = targets[i]!;
    if (kind === 'SET' || kind === 'DIGITS') return { kind, target } satisfies SetPuzzle;
    if (kind === 'LATER') {
      return {
        kind,
        start: target,
        gap,
        end: laterEnd(target, gap, mode),
        choices: makeLaterChoices(target, gap, level, mode, rng),
      } satisfies LaterPuzzle;
    }
    return {
      kind,
      target,
      choices: makeReadingChoices(target, level, mode, rng),
    } satisfies ReadingPuzzle;
  });
  return { activity: 'A', level, puzzles };
}

// ---------------------------------------------------------------------------
// Elapsed intervals

/** Allowed gaps of a level split into whole hours and the rest. */
function gapSets(level: ElapsedLevel): { whole: number[]; nonWhole: number[] } {
  const spec = ELAPSED_LEVELS[level];
  const whole: number[] = [];
  const nonWhole: number[] = [];
  for (let g = spec.minGap; g <= spec.maxGap; g += spec.step) {
    (g % 60 === 0 ? whole : nonWhole).push(g);
  }
  return { whole, nonWhole };
}

/** Picks (start, end) for the level's window and gap rules (SPEC §7.1, §7.2). */
export function pickInterval(level: ElapsedLevel, rng: Rng): [TimeValue, TimeValue] {
  const { whole, nonWhole } = gapSets(level);
  const gap =
    level === 1 || nonWhole.length === 0 || !chance(rng, NON_WHOLE_GAP_PROBABILITY)
      ? pick(rng, whole)
      : pick(rng, nonWhole);
  const latestStart = ELAPSED_WINDOW_END - gap;

  let minute: number;
  if (level === 1) minute = 0;
  else if (level === 3)
    minute = chance(rng, E3_OFFSET_START_PROBABILITY) ? pick(rng, [15, 30, 45]) : 0;
  else minute = pick(rng, [0, 15, 30, 45]);

  const firstHour = hoursOf(ELAPSED_WINDOW_START);
  const lastHour = Math.floor((latestStart - minute) / 60);
  const hour = randomInt(rng, firstHour, lastHour);
  const start = makeTime(hour, minute);
  return [start, start + gap];
}

const samePair = (a: readonly [number, number], b: readonly [number, number]) =>
  a[0] === b[0] && a[1] === b[1];

/**
 * Activity B mission (SPEC §7.5, D14): three ELAPSED puzzles and one ARRIVE puzzle in a
 * random order, with distinct pairs, none of the recent pairs, and at most two sharing a
 * duration. The first E3 mission of a theme ends with 14:30 → 19:15 as an ELAPSED puzzle.
 */
export function makeActivityBMission(
  level: ElapsedLevel,
  recentPairs: readonly (readonly [TimeValue, TimeValue])[],
  rng: Rng,
  firstEverAtE3: boolean,
): GeneratedMission {
  const reserved = firstEverAtE3 && level === 3 ? REQUIRED_E3_PAIR : null;
  const pairs: [TimeValue, TimeValue][] = [];
  const taken = (): (readonly [TimeValue, TimeValue])[] =>
    reserved ? [...pairs, reserved] : pairs;
  const gapCount = (gap: number) => taken().filter((p) => p[1] - p[0] === gap).length;

  const wanted = reserved ? 3 : 4;
  for (let i = 0; i < wanted; i++) {
    let tries = 0;
    for (;;) {
      const candidate = pickInterval(level, rng);
      tries++;
      const gap = candidate[1] - candidate[0];
      const duplicate = taken().some((p) => samePair(p, candidate));
      const recent = recentPairs.some((p) => samePair(p, candidate));
      if (!duplicate && gapCount(gap) < 2 && (!recent || tries > MAX_TRIES)) {
        pairs.push(candidate);
        break;
      }
    }
  }
  const kinds = shuffle(['ELAPSED', 'ELAPSED', ...(reserved ? [] : ['ELAPSED']), 'ARRIVE'], rng);
  if (reserved) {
    pairs.push([reserved[0], reserved[1]]);
    kinds.push('ELAPSED');
  }

  const puzzles: Puzzle[] = pairs.map(([start, end], i) => {
    if (kinds[i] === 'ARRIVE') {
      return {
        kind: 'ARRIVE',
        start,
        end,
        choices: arrivalChoices(start, end, level, rng),
      } satisfies ArrivePuzzle;
    }
    return {
      kind: 'ELAPSED',
      start,
      end,
      choices: durationChoices(end - start, level, rng),
    } satisfies ElapsedPuzzle;
  });
  return { activity: 'B', level, puzzles };
}
