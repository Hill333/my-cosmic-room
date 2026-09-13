import { describe, expect, it } from 'vitest';
import {
  ELAPSED_LEVELS,
  ELAPSED_WINDOW_END,
  ELAPSED_WINDOW_START,
  READING_LEVELS,
  REQUIRED_E3_PAIR,
  SCHEDULE_DURATIONS,
  SCHEDULE_SEGMENTS,
  SHIFT_DELTAS,
  makeActivityAMission,
  makeActivityBMission,
  makeReadingChoices,
  makeShiftChoices,
  pickInterval,
  pickTarget,
  sameReading,
  shiftTarget,
} from './generate.ts';
import { createRng } from './rng.ts';
import { hoursOf, makeTime, minutesOf, periodOf } from './time.ts';
import type {
  DigitalMode,
  ElapsedLevel,
  Puzzle,
  ReadingLevel,
  ReadingPuzzle,
  SetPuzzle,
  ShiftPuzzle,
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
/** Reading target of an Activity A puzzle (a SHIFT's target is its answer). */
const targetOf = (p: Puzzle): number => {
  if (p.kind === 'ELAPSED' || p.kind === 'SCHEDULE') throw new Error('not a reading puzzle');
  return p.target;
};
const isReading = (p: Puzzle): p is ReadingPuzzle | SetPuzzle | ShiftPuzzle =>
  p.kind !== 'ELAPSED' && p.kind !== 'SCHEDULE';

describe('AT-05 precision per level (5,000 seeded missions per level)', () => {
  for (const level of READING) {
    for (const mode of MODES) {
      it(`R${level} ${mode}: every target and choice is in the allowed set`, () => {
        const allowed = new Set(READING_LEVELS[level].allowedMinutes);
        for (let seed = 0; seed < MISSIONS; seed++) {
          const m = makeActivityAMission(level, mode, [], createRng(seed));
          for (const p of m.puzzles) {
            expect(allowed.has(minutesOf(targetOf(p)))).toBe(true);
            if (p.kind !== 'SET' && p.kind !== 'ELAPSED') {
              for (const c of p.choices) expect(allowed.has(minutesOf(c))).toBe(true);
            }
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
            if (!isReading(p) || p.kind === 'SET') continue;
            expect(p.choices).toHaveLength(3);
            expect(new Set(sortedFaces(p.choices)).size).toBe(3);
            expect(p.choices.filter((c) => c === p.target)).toHaveLength(1);
            if (mode === '24h') {
              for (const c of p.choices) {
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
    it(`R${level}: READ, READ or SHIFT, MATCH, SET; SET never first, distinct targets, no recent`, () => {
      for (const mode of MODES) {
        for (let seed = 0; seed < MISSIONS; seed++) {
          const rng = createRng(seed);
          const recent = Array.from({ length: 8 }, () => pickTarget(level, mode, rng));
          const m = makeActivityAMission(level, mode, recent, rng);
          expect(m.activity).toBe('A');
          expect(m.level).toBe(level);
          expect(m.puzzles).toHaveLength(4);
          const kinds = m.puzzles.map((p) => p.kind);
          const shifts = kinds.filter((k) => k === 'SHIFT').length;
          expect(shifts).toBeLessThanOrEqual(level === 1 ? 0 : 1);
          expect(kinds.filter((k) => k === 'READ')).toHaveLength(2 - shifts);
          expect(kinds.filter((k) => k === 'MATCH')).toHaveLength(1);
          expect(kinds.filter((k) => k === 'SET')).toHaveLength(1);
          expect(kinds[0]).not.toBe('SET');
          expect(kinds[0]).not.toBe('SHIFT');
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
          // A SHIFT's answer is start + delta rather than a drawn target; its start is one.
          const t = p.kind === 'SHIFT' ? p.start : targetOf(p);
          total++;
          if (isNew.has(minutesOf(t))) fresh++;
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
          expect(hoursOf(targetOf(p))).toBeGreaterThanOrEqual(6);
          expect(hoursOf(targetOf(p))).toBeLessThanOrEqual(21);
        }
        const m12 = makeActivityAMission(level, '12h', [], createRng(seed));
        for (const p of m12.puzzles) {
          expect(hoursOf(targetOf(p))).toBeGreaterThanOrEqual(1);
          expect(hoursOf(targetOf(p))).toBeLessThanOrEqual(12);
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
        for (const p of m.puzzles) {
          if (p.kind !== 'ELAPSED') continue;
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
          expect(p.choices.filter((c) => c === gap)).toHaveLength(1);
        }
        // Distinct pairs; at most two share a duration. A SCHEDULE (SPEC §8.6) may replace
        // puzzle 2 or 3; the ELAPSED rules hold among the rest.
        const elapsed = m.puzzles.filter((p) => p.kind === 'ELAPSED');
        expect(elapsed.length).toBeGreaterThanOrEqual(3);
        expect(m.puzzles[0]!.kind).toBe('ELAPSED');
        expect(m.puzzles[3]!.kind).toBe('ELAPSED');
        const keys = elapsed.map((p) => `${p.start}-${p.end}`);
        expect(new Set(keys).size).toBe(elapsed.length);
        const gaps = elapsed.map((p) => p.end - p.start);
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
        if (p.kind !== 'ELAPSED') continue;
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
      const elapsed = m.puzzles.filter((p) => p.kind === 'ELAPSED');
      const keys = elapsed.map((p) => `${p.start}-${p.end}`);
      expect(new Set(keys).size).toBe(elapsed.length);
      const gaps = elapsed.map((p) => p.end - p.start);
      expect(gaps.filter((g) => g === 285).length).toBeLessThanOrEqual(2);
    }
  });
  it('ignores the flag at E1 and E2', () => {
    const m = makeActivityBMission(1, [], createRng(1), true);
    const last = m.puzzles[3]!;
    expect(last.kind === 'ELAPSED' && last.end - last.start).not.toBe(285);
  });
});

describe('AT-40 SHIFT puzzles (SPEC §7.3, 5,000 seeded missions per level and mode)', () => {
  for (const level of READING) {
    it(`R${level}: delta from the level set, start and target at level precision and in window, three distinct choices`, () => {
      const allowed = READING_LEVELS[level].allowedMinutes;
      let shifts = 0;
      for (const mode of MODES) {
        for (let seed = 0; seed < MISSIONS; seed++) {
          const m = makeActivityAMission(level, mode, [], createRng(seed));
          for (const p of m.puzzles) {
            if (p.kind !== 'SHIFT') continue;
            shifts++;
            expect(SHIFT_DELTAS[level]).toContain(p.delta);
            expect(allowed).toContain(minutesOf(p.start));
            expect(allowed).toContain(minutesOf(p.target));
            expect(sameReading(shiftTarget(p.start, p.delta, mode), p.target, mode)).toBe(true);
            expect(p.choices).toHaveLength(3);
            expect(new Set(sortedFaces(p.choices)).size).toBe(3);
            expect(p.choices.filter((c) => c === p.target)).toHaveLength(1);
            for (const c of p.choices) expect(allowed).toContain(minutesOf(c));
            if (mode === '24h') {
              for (const t of [p.start, p.target, ...p.choices]) {
                expect(hoursOf(t)).toBeGreaterThanOrEqual(6);
                expect(hoursOf(t)).toBeLessThanOrEqual(21);
              }
            } else {
              expect(hoursOf(p.start)).toBeGreaterThanOrEqual(1);
              expect(hoursOf(p.target)).toBeGreaterThanOrEqual(1);
            }
          }
        }
      }
      // Half of the missions at R2+ carry one SHIFT; R1 never does.
      const share = shifts / (MISSIONS * MODES.length);
      if (level === 1) expect(shifts).toBe(0);
      else {
        expect(share).toBeGreaterThan(0.45);
        expect(share).toBeLessThan(0.55);
      }
    });
  }
  it('models the mistakes in order: 3:15 + 30 min at R3 gives the wrong way and not moving', () => {
    const choices = makeShiftChoices(T(3, 15), 30, 3, '12h', createRng(1));
    expect(sortedFaces(choices)).toEqual(sortedFaces([T(3, 45), T(2, 45), T(3, 15)]));
  });
  it('wraps the face at 12 in 12-hour mode: 12:45 + 30 min is 1:15', () => {
    expect(shiftTarget(T(12, 45), 30, '12h')).toBe(T(1, 15));
    expect(shiftTarget(T(1, 0), -30, '12h')).toBe(T(12, 30));
  });
});

describe('AT-41 words (SPEC §7.7)', () => {
  it('marks about half of READ, MATCH and SET puzzles when enabled, none when disabled', () => {
    let marked = 0;
    let total = 0;
    for (let seed = 0; seed < MISSIONS; seed++) {
      const on = makeActivityAMission(3, '12h', [], createRng(seed), { words: true });
      for (const p of on.puzzles) {
        if (p.kind === 'SHIFT') continue;
        total++;
        if (isReading(p) && p.words) marked++;
      }
      const off = makeActivityAMission(3, '12h', [], createRng(seed), { words: false });
      for (const p of off.puzzles) {
        if (isReading(p) && p.kind !== 'SHIFT') expect(p.words).toBeUndefined();
      }
    }
    expect(marked / total).toBeGreaterThan(0.45);
    expect(marked / total).toBeLessThan(0.55);
  });
});

describe('AT-42 SCHEDULE puzzles (SPEC §8.6, 5,000 seeded missions per level)', () => {
  for (const level of ELAPSED) {
    it(`E${level}: four contiguous segments from a whole hour, level lengths, span ≤ 6 h, at puzzle 2 or 3`, () => {
      let schedules = 0;
      for (let seed = 0; seed < MISSIONS; seed++) {
        const m = makeActivityBMission(level, [], createRng(seed), false);
        m.puzzles.forEach((p, i) => {
          if (p.kind !== 'SCHEDULE') return;
          schedules++;
          expect([1, 2]).toContain(i);
          expect(p.segments).toHaveLength(SCHEDULE_SEGMENTS);
          const first = p.segments[0]!;
          expect(first.start % 60).toBe(0);
          expect(hoursOf(first.start)).toBeGreaterThanOrEqual(7);
          expect(hoursOf(first.start)).toBeLessThanOrEqual(14);
          let t = first.start;
          for (const s of p.segments) {
            expect(s.start).toBe(t);
            expect(SCHEDULE_DURATIONS[level]).toContain(s.end - s.start);
            expect(s.label).toBeGreaterThanOrEqual(1);
            expect(s.label).toBeLessThanOrEqual(6);
            t = s.end;
          }
          expect(t - first.start).toBeLessThanOrEqual(360);
          expect(new Set(p.segments.map((s) => s.label)).size).toBe(SCHEDULE_SEGMENTS);
          expect(p.ask).toBeGreaterThanOrEqual(0);
          expect(p.ask).toBeLessThan(SCHEDULE_SEGMENTS);
          const asked = p.segments[p.ask]!;
          expect(p.choices).toHaveLength(3);
          expect(new Set(p.choices).size).toBe(3);
          expect(p.choices.filter((c) => c === asked.end - asked.start)).toHaveLength(1);
        });
      }
      expect(schedules / MISSIONS).toBeGreaterThan(0.45);
      expect(schedules / MISSIONS).toBeLessThan(0.55);
    });
  }
  it('never replaces the reserved 14:30 → 19:15 slot of a first E3 mission', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const m = makeActivityBMission(3, [], createRng(seed), true);
      expect(m.puzzles[3]!.kind).toBe('ELAPSED');
    }
  });
});

describe('determinism (SPEC §7.6)', () => {
  it('replays identically from the same seed', () => {
    for (const level of READING) {
      expect(makeActivityAMission(level, '12h', [T(3, 0)], createRng(42), { words: true })).toEqual(
        makeActivityAMission(level, '12h', [T(3, 0)], createRng(42), { words: true }),
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
    expect(m.puzzles.map((p) => (p.kind === 'SHIFT' ? 'READ' : p.kind)).sort()).toEqual([
      'MATCH',
      'READ',
      'READ',
      'SET',
    ]);
    const read = m.puzzles.find((p) => p.kind === 'READ') as ReadingPuzzle;
    expect(read.choices).toContain(read.target);
  });
});
