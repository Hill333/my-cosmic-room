/**
 * Level tables and mission generators (SPEC §7). Pure and deterministic: every random
 * decision goes through the injected RNG, so a mission replays identically from its seed.
 */
import { arrivalChoices, durationChoices } from './elapsed.ts';
import { chance, pick, randomInt, shuffle, type Rng } from './rng.ts';
import { hour12Of, hoursOf, makeTime, minutesOf, sameFace } from './time.ts';
import type {
  ArrivePuzzle,
  DigitalMode,
  ElapsedLevel,
  ElapsedPuzzle,
  Puzzle,
  ReadingLevel,
  ReadingPuzzle,
  SchedulePuzzle,
  ScheduleSegment,
  SetPuzzle,
  ShiftPuzzle,
  TimeValue,
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

/** Probability that the second READ of an Activity A mission becomes a SHIFT at R2+ (SPEC §7.3). */
export const SHIFT_PROBABILITY = 0.5;
/** Probability that the MATCH of an Activity A mission becomes a DIGITS (SPEC §7.3, D20). */
export const DIGITS_PROBABILITY = 0.5;
/** Probability that a READ, MATCH or SET puzzle uses words when the setting is on (SPEC §7.7). */
export const WORDS_PROBABILITY = 0.5;
/** Probability that puzzle 2 or 3 of an Activity B mission becomes a SCHEDULE (SPEC §7.5). */
export const SCHEDULE_PROBABILITY = 0.5;

/** Signed shifts per reading level (SPEC §7.3); R1 has no SHIFT puzzles. */
export const SHIFT_DELTAS: Record<ReadingLevel, readonly number[]> = {
  1: [],
  2: [-60, -30, 30, 60],
  3: [-60, -45, -30, -15, 15, 30, 45, 60],
  4: [-60, -45, -30, -15, 15, 30, 45, 60],
};

/** Segment lengths of a schedule bar per elapsed level (SPEC §8.6). */
export const SCHEDULE_DURATIONS: Record<ElapsedLevel, readonly number[]> = {
  1: [60, 120],
  2: [15, 30, 45, 60, 75, 90],
  3: [45, 60, 75, 90, 105, 120, 135, 150, 165, 180],
};
export const SCHEDULE_SEGMENTS = 4;
/** Number of activity names per theme (`sched.<theme>.1` … `.6`). */
export const SCHEDULE_LABELS = 6;
/** A schedule bar starts on a whole hour in this range and spans at most six hours. */
export const SCHEDULE_FIRST_HOUR = 7;
export const SCHEDULE_LAST_HOUR = 14;
export const SCHEDULE_MAX_SPAN = 360;

const MAX_TRIES = 50;

export interface GeneratedMission {
  activity: 'A' | 'B';
  level: number;
  puzzles: Puzzle[];
}

export interface ActivityAOptions {
  /** Word-form presentation allowed (the parent's "Times in words" switch, SPEC §7.7). */
  words: boolean;
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
 * Three reading choices for READ and MATCH (SPEC §7.4): the target plus two distractors taken
 * in order from the mistake-modelling candidate list, validated, then shuffled.
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
  const chosen: TimeValue[] = [];
  const accept = (hour: number, minute: number): boolean => {
    if (!Number.isInteger(hour) || !isAllowedReading(hour, minute, level, mode)) return false;
    const t = faceTime(hour, minute, mode);
    // Never the target or another distractor; in 24-hour mode also never the same face
    // twelve hours apart, which would make the choice depend on the badge alone.
    if (sameFace(t, target) || chosen.some((c) => sameFace(c, t))) return false;
    chosen.push(t);
    return true;
  };
  for (const [hour, minute] of candidates) {
    if (chosen.length === 2) break;
    accept(hour, minute);
  }
  // 6: random allowed time as the fallback.
  while (chosen.length < 2) {
    const t = pickTarget(level, mode, rng);
    accept(hoursOf(t), minutesOf(t));
  }
  return shuffle([target, ...chosen], rng);
}

/** True when a full-day value lies in the 24-hour reading window (SPEC §7.1). */
function inReadingWindow(t: number): boolean {
  return t >= READING_24H_FIRST_HOUR * 60 && t < (READING_24H_LAST_HOUR + 1) * 60;
}

/**
 * A SHIFT puzzle (SPEC §7.3): a start at the level's precision, a signed quarter-step delta,
 * and the face of start + delta as the target. In 24-hour mode both ends stay within the
 * reading window; when the draws keep failing, the delta falls back to the hour that fits.
 */
export function makeShiftPuzzle(
  level: ReadingLevel,
  mode: DigitalMode,
  rng: Rng,
  targetOk: (target: TimeValue) => boolean = () => true,
): ShiftPuzzle {
  const deltas = SHIFT_DELTAS[level];
  if (deltas.length === 0) throw new RangeError(`No SHIFT puzzles at R${level}`);
  let start = pickTarget(level, mode, rng);
  let delta = pick(rng, deltas);
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    start = pickTarget(level, mode, rng);
    delta = pick(rng, deltas);
    const raw = start + delta;
    if (mode === '24h' && !inReadingWindow(raw)) continue;
    if (targetOk(shiftTarget(start, delta, mode))) break;
  }
  if (mode === '24h' && !inReadingWindow(start + delta)) {
    delta = hoursOf(start) >= READING_24H_LAST_HOUR ? -60 : 60;
  }
  const target = shiftTarget(start, delta, mode);
  return {
    kind: 'SHIFT',
    start,
    delta,
    target,
    choices: makeShiftChoices(start, delta, level, mode, rng),
  };
}

/** The answer of a shift: the face of start + delta, stored like a reading target (§6.3). */
export function shiftTarget(start: TimeValue, delta: number, mode: DigitalMode): TimeValue {
  const raw = start + delta;
  return faceTime(hoursOf(raw), minutesOf(raw), mode);
}

/**
 * Three choices for a SHIFT (SPEC §7.3): the target plus two distractors modelling, in order,
 * moving the wrong way, not moving, being an hour off, and mirroring the minutes.
 */
export function makeShiftChoices(
  start: TimeValue,
  delta: number,
  level: ReadingLevel,
  mode: DigitalMode,
  rng: Rng,
): TimeValue[] {
  const target = shiftTarget(start, delta, mode);
  const sign = Math.sign(delta);
  const candidates = [
    start - delta, // 1: moved the wrong way
    start, // 2: did not move
    start + delta + sign * 60, // 3: an hour too far
    start + sign * (60 - Math.abs(delta)), // 4: mirror minute (a quarter for three quarters)
  ];
  const chosen: TimeValue[] = [];
  const accept = (raw: number): boolean => {
    const hour = hoursOf(raw);
    const minute = minutesOf(raw);
    if (mode === '24h' && !inReadingWindow(raw)) return false;
    if (!isAllowedReading(hour, minute, level, mode)) return false;
    const t = faceTime(hour, minute, mode);
    if (sameFace(t, target) || chosen.some((c) => sameFace(c, t))) return false;
    chosen.push(t);
    return true;
  };
  for (const raw of candidates) {
    if (chosen.length === 2) break;
    accept(raw);
  }
  while (chosen.length < 2) accept(pickTarget(level, mode, rng));
  return shuffle([target, ...chosen], rng);
}

/**
 * Activity A mission: two READ, one MATCH, one SET; SET never first (SPEC §7.3). At R2 and
 * above the later of the two READs becomes a SHIFT with probability 0.5 (so a mission never
 * opens with one); the MATCH becomes a DIGITS with probability 0.5 (D20; an input puzzle is
 * never first, so a MATCH in the first slot trades places with a READ before it turns); and
 * with the words option each READ, MATCH and SET puzzle reads in words with probability 0.5
 * (SPEC §7.7).
 */
export function makeActivityAMission(
  level: ReadingLevel,
  mode: DigitalMode,
  recentTargets: readonly TimeValue[],
  rng: Rng,
  options: ActivityAOptions = { words: false },
): GeneratedMission {
  const base: ('READ' | 'MATCH' | 'SET')[] = ['READ', 'READ', 'MATCH', 'SET'];
  let kinds: ('READ' | 'MATCH' | 'SET' | 'DIGITS' | 'SHIFT')[] = shuffle(base, rng);
  while (kinds[0] === 'SET') kinds = shuffle(base, rng);
  if (SHIFT_DELTAS[level].length > 0 && chance(rng, SHIFT_PROBABILITY)) {
    kinds[kinds.lastIndexOf('READ')] = 'SHIFT';
  }
  if (chance(rng, DIGITS_PROBABILITY)) {
    let at = kinds.indexOf('MATCH');
    if (at === 0) {
      const read = kinds.indexOf('READ');
      [kinds[0], kinds[read]] = ['READ', 'MATCH'];
      at = read;
    }
    kinds[at] = 'DIGITS';
  }

  const targets: TimeValue[] = [];
  const fresh = (t: TimeValue, tries: number): boolean => {
    const inTargets = targets.some((x) => sameReading(x, t, mode));
    const inRecent = recentTargets.some((x) => sameReading(x, t, mode));
    return !inTargets && (!inRecent || tries > MAX_TRIES);
  };
  const puzzles: Puzzle[] = [];
  for (const kind of kinds) {
    if (kind === 'SHIFT') {
      let tries = 0;
      const shift = makeShiftPuzzle(level, mode, rng, (t) => fresh(t, ++tries));
      // The fallback delta can still land on a used face; that is rarer than the recent-target
      // fallback of §7.3 and equally harmless.
      targets.push(shift.target);
      puzzles.push(shift);
      continue;
    }
    let target: TimeValue;
    for (let tries = 1; ; tries++) {
      target = pickTarget(level, mode, rng);
      if (fresh(target, tries)) break;
    }
    targets.push(target);
    if (kind === 'DIGITS') {
      // Digits are the answer, so the word form never applies.
      puzzles.push({ kind, target });
      continue;
    }
    const words = options.words && chance(rng, WORDS_PROBABILITY);
    const puzzle: ReadingPuzzle | SetPuzzle =
      kind === 'SET'
        ? { kind, target }
        : { kind, target, choices: makeReadingChoices(target, level, mode, rng) };
    if (words) puzzle.words = true;
    puzzles.push(puzzle);
  }
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
 * A schedule bar (SPEC §8.6): four contiguous segments from a whole hour between 07:00 and
 * 14:00, lengths from the level's set, spanning at most six hours, with distinct activity
 * names and one segment asked about.
 */
export function makeSchedulePuzzle(level: ElapsedLevel, rng: Rng): SchedulePuzzle {
  const lengths = SCHEDULE_DURATIONS[level];
  let picked: number[];
  do {
    picked = Array.from({ length: SCHEDULE_SEGMENTS }, () => pick(rng, lengths));
  } while (picked.reduce((a, b) => a + b, 0) > SCHEDULE_MAX_SPAN);
  const labels = shuffle(
    Array.from({ length: SCHEDULE_LABELS }, (_, i) => i + 1),
    rng,
  ).slice(0, SCHEDULE_SEGMENTS);
  let t = makeTime(randomInt(rng, SCHEDULE_FIRST_HOUR, SCHEDULE_LAST_HOUR), 0);
  const segments: ScheduleSegment[] = picked.map((len, i) => {
    const segment = { label: labels[i]!, start: t, end: t + len };
    t += len;
    return segment;
  });
  const ask = randomInt(rng, 0, SCHEDULE_SEGMENTS - 1);
  const asked = segments[ask]!;
  return {
    kind: 'SCHEDULE',
    segments,
    ask,
    choices: durationChoices(asked.end - asked.start, level, rng),
  };
}

/**
 * Activity B mission: four ELAPSED puzzles with distinct pairs, none of the recent pairs, and
 * at most two sharing a duration (SPEC §7.5). The first E3 mission of a theme ends with
 * 14:30 → 19:15. With probability 0.5 puzzle 2 or 3 is a SCHEDULE instead (SPEC §8.6), and
 * one of the remaining ELAPSED puzzles (never the reserved 14:30 → 19:15) is an ARRIVE (D20).
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
  if (reserved) pairs.push([reserved[0], reserved[1]]);

  const puzzles: Puzzle[] = pairs.map(
    ([start, end]) =>
      ({
        kind: 'ELAPSED',
        start,
        end,
        choices: durationChoices(end - start, level, rng),
      }) satisfies ElapsedPuzzle,
  );
  if (chance(rng, SCHEDULE_PROBABILITY)) {
    puzzles[randomInt(rng, 1, 2)] = makeSchedulePuzzle(level, rng);
  }
  const elapsedSlots = puzzles.flatMap((p, i) =>
    p.kind === 'ELAPSED' && !(reserved && i === 3) ? [i] : [],
  );
  const at = pick(rng, elapsedSlots);
  const [start, end] = pairs[at]!;
  puzzles[at] = {
    kind: 'ARRIVE',
    start,
    end,
    choices: arrivalChoices(start, end, level, rng),
  } satisfies ArrivePuzzle;
  return { activity: 'B', level, puzzles };
}
