import { describe, expect, it } from 'vitest';
import { arrivalChoices } from './elapsed.ts';
import {
  ELAPSED_LEVELS,
  ELAPSED_WINDOW_END,
  ELAPSED_WINDOW_START,
  LATER_GAPS,
  READING_LEVELS,
  REQUIRED_E3_PAIR,
  makeActivityAMission,
  makeActivityBMission,
  makeLaterChoices,
  makeReadingChoices,
  pickInterval,
  pickTarget,
  sameReading,
} from './generate.ts';
import { correctValue, shownTime } from './mission.ts';
import { createRng } from './rng.ts';
import { hoursOf, makeTime, minutesOf, periodOf, sameFace } from './time.ts';
import {
  EXTRA_KINDS,
  isInputKind,
  type DigitalMode,
  type ElapsedLevel,
  type Puzzle,
  type ReadingLevel,
  type ReadingPuzzle,
} from './types.ts';

const T = makeTime;
const MISSIONS = 5000;
const READING: ReadingLevel[] = [1, 2, 3, 4];
const ELAPSED: ElapsedLevel[] = [1, 2, 3];
const MODES: DigitalMode[] = ['12h', '24h'];

const sortedFaces = (choices: number[]) =>
  [...choices].map((t) => `${hoursOf(t) % 12}:${minutesOf(t)}`).sort();
/** Distinct readings: by face in 12-hour mode, by value in 24-hour mode (SPEC §6.3). */
const distinct = (times: number[], mode: DigitalMode) =>
  new Set<string | number>(mode === '12h' ? sortedFaces(times) : times).size;
/** Reading target of an Activity A puzzle: the face it shows (a LATER puzzle's start). */
const targetOf = (p: Puzzle): number => {
  if (p.kind === 'ELAPSED' || p.kind === 'ARRIVE') throw new Error('not a reading puzzle');
  return shownTime(p);
};
/** The time choices of a choice puzzle in Activity A (READ, MATCH, WORDS, LATER), else null. */
const timeChoices = (p: Puzzle): number[] | null =>
  p.kind === 'READ' || p.kind === 'MATCH' || p.kind === 'WORDS' || p.kind === 'LATER'
    ? p.choices
    : null;

describe('AT-05 precision per level (5,000 seeded missions per level)', () => {
  for (const level of READING) {
    for (const mode of MODES) {
      it(`R${level} ${mode}: every target and choice is in the allowed set`, () => {
        const allowed = new Set(READING_LEVELS[level].allowedMinutes);
        for (let seed = 0; seed < MISSIONS; seed++) {
          const m = makeActivityAMission(level, mode, [], createRng(seed));
          for (const p of m.puzzles) {
            expect(allowed.has(minutesOf(targetOf(p)))).toBe(true);
            expect(allowed.has(minutesOf(correctValue(p)))).toBe(true);
            for (const c of timeChoices(p) ?? []) expect(allowed.has(minutesOf(c))).toBe(true);
          }
        }
      });
    }
  }
});

describe('AT-06 choices', () => {
  for (const level of READING) {
    it(`R${level}: exactly three, distinct, exactly one equals the target`, () => {
      for (const mode of MODES) {
        for (let seed = 0; seed < MISSIONS; seed++) {
          const m = makeActivityAMission(level, mode, [], createRng(seed));
          for (const p of m.puzzles) {
            const choices = timeChoices(p);
            if (!choices) continue;
            expect(choices).toHaveLength(3);
            expect(new Set(sortedFaces(choices)).size).toBe(3);
            expect(choices.filter((c) => c === correctValue(p))).toHaveLength(1);
            if (mode === '24h') {
              for (const c of choices) {
                expect(hoursOf(c)).toBeGreaterThanOrEqual(6);
                expect(hoursOf(c)).toBeLessThanOrEqual(21);
              }
            }
          }
        }
      }
    });
  }
});

describe('AT-07 concept examples', () => {
  it('3:30 at R2 gives {3:00, 3:30, 4:30}', () => {
    for (let seed = 0; seed < 10; seed++) {
      const choices = makeReadingChoices(T(3, 30), 2, '12h', createRng(seed));
      expect(sortedFaces(choices)).toEqual(sortedFaces([T(3, 0), T(3, 30), T(4, 30)]));
    }
  });
  it('3:00 at R1 gives {2:00, 3:00, 4:00}', () => {
    for (let seed = 0; seed < 10; seed++) {
      const choices = makeReadingChoices(T(3, 0), 1, '12h', createRng(seed));
      expect(sortedFaces(choices)).toEqual(sortedFaces([T(2, 0), T(3, 0), T(4, 0)]));
    }
  });
  it('models the listed mistakes in order: 3:15 at R3 gives hands swapped and hour + 1', () => {
    // Hands swapped: hour = 15 / 5 = 3, minute = 3 × 5 = 15 → equals the target, skipped.
    // Hour + 1 → 4:15; mirror minute → 3:45.
    const choices = makeReadingChoices(T(3, 15), 3, '12h', createRng(1));
    expect(sortedFaces(choices)).toEqual(sortedFaces([T(3, 15), T(4, 15), T(3, 45)]));
    // 9:30 at R2: 6:45 invalid (skipped), 10:30, 9:30 (target), 9:00.
    expect(sortedFaces(makeReadingChoices(T(9, 30), 2, '12h', createRng(1)))).toEqual(
      sortedFaces([T(9, 30), T(10, 30), T(9, 0)]),
    );
    // 12:00 at R1 wraps to 1:00 and 11:00 on the 12-hour face.
    expect(sortedFaces(makeReadingChoices(T(12, 0), 1, '12h', createRng(1)))).toEqual(
      sortedFaces([T(12, 0), T(1, 0), T(11, 0)]),
    );
    // 21:00 at R1 in 24-hour mode cannot use 22:00, so 20:00 comes next; then a random fallback.
    const late = makeReadingChoices(T(21, 0), 1, '24h', createRng(1));
    expect(late).toContain(T(20, 0));
    expect(late).toContain(T(21, 0));
  });
});

describe('AT-08 mission shape', () => {
  for (const level of READING) {
    it(`R${level}: READ, MATCH, SET and one extra kind, no input puzzle first, distinct targets, no recent`, () => {
      for (const mode of MODES) {
        for (let seed = 0; seed < MISSIONS; seed++) {
          const rng = createRng(seed);
          const recent = Array.from({ length: 8 }, () => pickTarget(level, mode, rng));
          const m = makeActivityAMission(level, mode, recent, rng);
          expect(m.activity).toBe('A');
          expect(m.level).toBe(level);
          expect(m.puzzles).toHaveLength(4);
          const kinds = m.puzzles.map((p) => p.kind);
          expect(kinds.filter((k) => k === 'READ')).toHaveLength(1);
          expect(kinds.filter((k) => k === 'MATCH')).toHaveLength(1);
          expect(kinds.filter((k) => k === 'SET')).toHaveLength(1);
          expect(kinds.filter((k) => EXTRA_KINDS.includes(k as never))).toHaveLength(1);
          expect(isInputKind(kinds[0]!)).toBe(false);
          const targets = m.puzzles.map(targetOf);
          expect(distinct(targets, mode)).toBe(4);
          // Recent targets are avoided whenever the level leaves room for it; R1 in 12-hour
          // mode has only twelve faces, so there the 50-try fallback of §7.3 may kick in.
          const faces = (mode === '12h' ? 12 : 16) * READING_LEVELS[level].allowedMinutes.length;
          if (faces - distinct(recent, mode) >= 8) {
            for (const t of targets) {
              expect(recent.some((r) => sameReading(r, t, mode))).toBe(false);
            }
          }
        }
      }
    });
  }
  it('falls back to ignoring recent targets when they exhaust the level', () => {
    // R1 in 12-hour mode has only twelve faces; ten recent ones leave too few.
    const recent = Array.from({ length: 10 }, (_, i) => T(i + 1, 0));
    const m = makeActivityAMission(1, '12h', recent, createRng(3));
    expect(new Set(sortedFaces(m.puzzles.map(targetOf))).size).toBe(4);
  });
});

describe('AT-09 new-minutes weighting', () => {
  for (const level of [2, 3, 4] as const) {
    it(`R${level}: between 50 % and 70 % of targets use the new minutes`, () => {
      const isNew = new Set(READING_LEVELS[level].newMinutes);
      let total = 0;
      let fresh = 0;
      for (let seed = 0; seed < MISSIONS; seed++) {
        const m = makeActivityAMission(level, '12h', [], createRng(seed));
        for (const p of m.puzzles) {
          total++;
          if (isNew.has(minutesOf(targetOf(p)))) fresh++;
        }
      }
      const share = fresh / total;
      expect(share).toBeGreaterThan(0.5);
      expect(share).toBeLessThan(0.7);
    });
  }
  it('R1 has no new minutes: every target is a whole hour', () => {
    for (let seed = 0; seed < 500; seed++) {
      expect(minutesOf(pickTarget(1, '12h', createRng(seed)))).toBe(0);
    }
  });
});

describe('AT-10 24-hour mode', () => {
  it('keeps targets within 06:00–21:59 and 12-hour targets on hours 1–12', () => {
    for (const level of READING) {
      for (let seed = 0; seed < MISSIONS; seed++) {
        const m = makeActivityAMission(level, '24h', [], createRng(seed));
        for (const p of m.puzzles) {
          for (const t of [targetOf(p), correctValue(p)]) {
            expect(hoursOf(t)).toBeGreaterThanOrEqual(6);
            expect(hoursOf(t)).toBeLessThanOrEqual(21);
          }
        }
        const m12 = makeActivityAMission(level, '12h', [], createRng(seed));
        for (const p of m12.puzzles) {
          for (const t of [targetOf(p), correctValue(p)]) {
            expect(hoursOf(t)).toBeGreaterThanOrEqual(1);
            expect(hoursOf(t)).toBeLessThanOrEqual(12);
          }
        }
      }
    }
  });
  it('computes the badge period at the boundaries', () => {
    expect(periodOf(T(5, 0))).toBe('morning');
    expect(periodOf(T(12, 0))).toBe('afternoon');
    expect(periodOf(T(18, 0))).toBe('evening');
    expect(periodOf(T(22, 0))).toBe('night');
    expect(periodOf(T(4, 59))).toBe('night');
  });
});

describe('AT-15 level windows (5,000 seeded missions per level)', () => {
  for (const level of ELAPSED) {
    const spec = ELAPSED_LEVELS[level];
    it(`E${level}: gaps ${spec.minGap}–${spec.maxGap}, inside 06:00–22:00, same day`, () => {
      for (let seed = 0; seed < MISSIONS; seed++) {
        const m = makeActivityBMission(level, [], createRng(seed), false);
        expect(m.activity).toBe('B');
        expect(m.puzzles).toHaveLength(4);
        const kinds = m.puzzles.map((p) => p.kind);
        expect(kinds.filter((k) => k === 'ELAPSED')).toHaveLength(3);
        expect(kinds.filter((k) => k === 'ARRIVE')).toHaveLength(1);
        for (const p of m.puzzles) {
          if (p.kind !== 'ELAPSED' && p.kind !== 'ARRIVE') throw new Error(p.kind);
          const gap = p.end - p.start;
          expect(p.start).toBeGreaterThanOrEqual(ELAPSED_WINDOW_START);
          expect(p.end).toBeLessThanOrEqual(ELAPSED_WINDOW_END);
          expect(p.end).toBeGreaterThan(p.start);
          expect(gap).toBeGreaterThanOrEqual(spec.minGap);
          expect(gap).toBeLessThanOrEqual(spec.maxGap);
          expect(gap % spec.step).toBe(0);
          expect(p.start % spec.step).toBe(0);
          expect(p.choices).toHaveLength(3);
          expect(new Set(p.choices).size).toBe(3);
          expect(p.choices.filter((c) => c === correctValue(p))).toHaveLength(1);
          if (p.kind === 'ARRIVE') {
            for (const c of p.choices) {
              expect(c).toBeGreaterThan(p.start);
              expect(c).toBeLessThan(24 * 60);
            }
          }
        }
        // Distinct pairs; at most two share a duration.
        const keys = m.puzzles.map((p) =>
          p.kind !== 'ELAPSED' && p.kind !== 'ARRIVE' ? '' : `${p.start}-${p.end}`,
        );
        expect(new Set(keys).size).toBe(4);
        const gaps = m.puzzles.map((p) =>
          p.kind === 'ELAPSED' || p.kind === 'ARRIVE' ? p.end - p.start : 0,
        );
        for (const g of gaps) expect(gaps.filter((x) => x === g).length).toBeLessThanOrEqual(2);
      }
    });
  }
  it('E1 starts and ends on whole hours', () => {
    for (let seed = 0; seed < MISSIONS; seed++) {
      const [s, e] = pickInterval(1, createRng(seed));
      expect(s % 60).toBe(0);
      expect(e % 60).toBe(0);
    }
  });
  it('E2 and E3 use non-whole-hour gaps about 75 % of the time; E3 offsets the start about half the time', () => {
    for (const level of [2, 3] as const) {
      let nonWhole = 0;
      let offset = 0;
      for (let seed = 0; seed < MISSIONS; seed++) {
        const [s, e] = pickInterval(level, createRng(seed));
        if ((e - s) % 60 !== 0) nonWhole++;
        if (s % 60 !== 0) offset++;
      }
      expect(nonWhole / MISSIONS).toBeGreaterThan(0.68);
      expect(nonWhole / MISSIONS).toBeLessThan(0.82);
      if (level === 3) {
        expect(offset / MISSIONS).toBeGreaterThan(0.43);
        expect(offset / MISSIONS).toBeLessThan(0.57);
      }
    }
  });
  it('avoids recent pairs when possible', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = createRng(seed);
      const recent = Array.from({ length: 8 }, () => pickInterval(3, rng));
      const m = makeActivityBMission(3, recent, rng, false);
      for (const p of m.puzzles) {
        if (p.kind !== 'ELAPSED' && p.kind !== 'ARRIVE') continue;
        expect(recent.some(([s, e]) => s === p.start && e === p.end)).toBe(false);
      }
    }
  });
});

describe('AT-17 first E3 mission (generator part)', () => {
  it('puts 14:30 → 19:15 as puzzle 4 when firstEverAtE3, and keeps the other rules', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const m = makeActivityBMission(3, [], createRng(seed), true);
      const last = m.puzzles[3]!;
      expect(last.kind).toBe('ELAPSED');
      if (last.kind !== 'ELAPSED') continue;
      expect([last.start, last.end]).toEqual([...REQUIRED_E3_PAIR]);
      expect([...last.choices].sort((a, b) => a - b)).toEqual([255, 285, 300]);
      const pairs = m.puzzles.map((p) => (p.kind === 'ELAPSED' || p.kind === 'ARRIVE' ? p : null));
      const keys = pairs.map((p) => (p ? `${p.start}-${p.end}` : ''));
      expect(new Set(keys).size).toBe(4);
      const gaps = pairs.map((p) => (p ? p.end - p.start : 0));
      expect(gaps.filter((g) => g === 285).length).toBeLessThanOrEqual(2);
      // The ARRIVE puzzle sits among the first three.
      expect(m.puzzles.slice(0, 3).filter((p) => p.kind === 'ARRIVE')).toHaveLength(1);
    }
  });
  it('ignores the flag at E1 and E2', () => {
    const m = makeActivityBMission(1, [], createRng(1), true);
    const last = m.puzzles[3]!;
    expect(last.kind === 'ELAPSED' && last.end - last.start).not.toBe(285);
  });
});

describe('determinism (SPEC §7.6)', () => {
  it('replays identically from the same seed', () => {
    for (const level of READING) {
      expect(makeActivityAMission(level, '12h', [T(3, 0)], createRng(42))).toEqual(
        makeActivityAMission(level, '12h', [T(3, 0)], createRng(42)),
      );
    }
    for (const level of ELAPSED) {
      expect(makeActivityBMission(level, [], createRng(42), true)).toEqual(
        makeActivityBMission(level, [], createRng(42), true),
      );
    }
  });
  it('differs across seeds', () => {
    const a = JSON.stringify(makeActivityAMission(2, '12h', [], createRng(1)));
    const b = JSON.stringify(makeActivityAMission(2, '12h', [], createRng(2)));
    expect(a).not.toBe(b);
  });
  it('matches the SPEC §19.1 shape for Space, Activity A, R2', () => {
    const m = makeActivityAMission(2, '12h', [], createRng(7));
    const kinds = m.puzzles.map((p) => p.kind).sort();
    expect(kinds.filter((k) => ['MATCH', 'READ', 'SET'].includes(k))).toEqual([
      'MATCH',
      'READ',
      'SET',
    ]);
    const read = m.puzzles.find((p) => p.kind === 'READ') as ReadingPuzzle;
    expect(read.choices).toContain(read.target);
  });
});

describe('extra kinds in Activity A (D14 revised)', () => {
  it('uses each extra kind about a third of the time', () => {
    const counts: Record<string, number> = {};
    for (let seed = 0; seed < MISSIONS; seed++) {
      const m = makeActivityAMission(2, '12h', [], createRng(seed));
      const extra = m.puzzles.find((p) => EXTRA_KINDS.includes(p.kind as never))!;
      counts[extra.kind] = (counts[extra.kind] ?? 0) + 1;
    }
    for (const kind of EXTRA_KINDS) {
      expect(counts[kind]! / MISSIONS).toBeGreaterThan(0.25);
      expect(counts[kind]! / MISSIONS).toBeLessThan(0.42);
    }
  });
  it('WORDS choices are on the five-minute grid so every one has a spoken form', () => {
    for (let seed = 0; seed < 500; seed++) {
      const m = makeActivityAMission(4, '12h', [], createRng(seed));
      for (const p of m.puzzles) {
        if (p.kind !== 'WORDS') continue;
        for (const c of p.choices) expect(minutesOf(c) % 5).toBe(0);
      }
    }
  });
  for (const level of READING) {
    for (const mode of MODES) {
      it(`LATER at R${level} ${mode}: a level gap, end = start + gap, in range, one clock right`, () => {
        let seen = 0;
        for (let seed = 0; seed < MISSIONS && seen < 400; seed++) {
          const m = makeActivityAMission(level, mode, [], createRng(seed));
          for (const p of m.puzzles) {
            if (p.kind !== 'LATER') continue;
            seen++;
            expect(LATER_GAPS[level]).toContain(p.gap);
            expect(sameFace(p.end, p.start + p.gap)).toBe(true);
            if (mode === '24h') {
              expect(p.end).toBe(p.start + p.gap);
              expect(hoursOf(p.end)).toBeLessThanOrEqual(21);
            } else {
              expect(hoursOf(p.end)).toBeGreaterThanOrEqual(1);
              expect(hoursOf(p.end)).toBeLessThanOrEqual(12);
            }
            expect(p.choices).toHaveLength(3);
            expect(new Set(sortedFaces(p.choices)).size).toBe(3);
            expect(p.choices.filter((c) => c === p.end)).toHaveLength(1);
          }
        }
        expect(seen).toBeGreaterThan(0);
      });
    }
  }
  it('LATER distractors model an hour too many, an hour too few and not moving', () => {
    // 3:30 + 1 hour = 4:30; the first two candidates are 5:30 and 3:30 (an hour too few is
    // the unchanged start here, so "not moving" merges with it).
    const choices = makeLaterChoices(T(3, 30), 60, 2, '12h', createRng(1));
    expect(sortedFaces(choices)).toEqual(sortedFaces([T(4, 30), T(5, 30), T(3, 30)]));
    // 9:15 + 45 min = 10:00; candidates 11:00 and 9:00.
    expect(sortedFaces(makeLaterChoices(T(9, 15), 45, 3, '12h', createRng(1)))).toEqual(
      sortedFaces([T(10, 0), T(11, 0), T(9, 0)]),
    );
    // 21:00 + 1 hour in 24-hour mode: 23:00 is out of range, so 21:00 and 20:00 follow.
    expect(makeLaterChoices(T(20, 0), 60, 1, '24h', createRng(1)).sort((a, b) => a - b)).toEqual(
      [T(20, 0), T(21, 0), T(19, 0)].sort((a, b) => a - b),
    );
  });
});

describe('ARRIVE choices (SPEC §8.3 applied to the start)', () => {
  it('14:30 → 19:15 at E3 offers 18:45 and 19:30 (the 255 and 300 minute mistakes)', () => {
    const choices = arrivalChoices(T(14, 30), T(19, 15), 3, createRng(1));
    expect([...choices].sort((a, b) => a - b)).toEqual([T(18, 45), T(19, 15), T(19, 30)]);
  });
  it('never offers a time before the start or past midnight, at every level and window corner', () => {
    for (const level of ELAPSED) {
      for (let seed = 0; seed < 2000; seed++) {
        const [s, e] = pickInterval(level, createRng(seed));
        const choices = arrivalChoices(s, e, level, createRng(seed));
        expect(choices).toHaveLength(3);
        expect(new Set(choices).size).toBe(3);
        expect(choices.filter((c) => c === e)).toHaveLength(1);
        for (const c of choices) {
          expect(c).toBeGreaterThan(s);
          expect(c).toBeLessThan(24 * 60);
          expect(c % 15).toBe(0);
        }
      }
    }
    // The tightest corner: a one-hour journey ending at 22:00 at E1.
    const late = arrivalChoices(T(21, 0), T(22, 0), 1, createRng(1));
    expect(late).toContain(T(22, 0));
    expect(late).toContain(T(23, 0));
    expect(late).toContain(T(22, 30));
  });
});
