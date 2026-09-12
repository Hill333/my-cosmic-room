import { describe, expect, it } from 'vitest';
import { decomposeJumps, durationChoices, formatDuration, formatJump } from './elapsed.ts';
import { createRng } from './rng.ts';
import { formatTime, makeTime } from './time.ts';

const T = makeTime;

describe('AT-11 required example 14:30 → 19:15', () => {
  const start = T(14, 30);
  const end = T(19, 15);
  const d = end - start;
  it('has the correct duration 285 = "4 hours 45 minutes"', () => {
    expect(d).toBe(285);
    expect(formatDuration(d, 'en')).toBe('4 hours 45 minutes');
    expect(formatDuration(d, 'tr')).toBe('4 saat 45 dakika');
    expect(formatDuration(d, 'nl')).toBe('4 uur 45 minuten');
  });
  it('offers the distractors 255 and 300 and accepts only 285', () => {
    for (let seed = 0; seed < 20; seed++) {
      const choices = durationChoices(d, 3, createRng(seed));
      expect([...choices].sort((a, b) => a - b)).toEqual([255, 285, 300]);
      expect(choices.filter((c) => c === d)).toHaveLength(1);
    }
    expect(formatDuration(255, 'en')).toBe('4 hours 15 minutes');
    expect(formatDuration(300, 'en')).toBe('5 hours');
  });
});

describe('AT-12 jumps for the example', () => {
  it('is +4 h → 18:30, +30 min → 19:00, +15 min → 19:15, summing to 285', () => {
    const jumps = decomposeJumps(T(14, 30), T(19, 15));
    expect(jumps).toEqual([
      { minutes: 240, to: T(18, 30) },
      { minutes: 30, to: T(19, 0) },
      { minutes: 15, to: T(19, 15) },
    ]);
    expect(jumps.reduce((sum, j) => sum + j.minutes, 0)).toBe(285);
    expect(jumps.map((j) => formatJump(j.minutes, 'en'))).toEqual(['+4 h', '+30 min', '+15 min']);
    expect(jumps.map((j) => formatJump(j.minutes, 'tr'))).toEqual(['+4 sa', '+30 dk', '+15 dk']);
    expect(jumps.map((j) => formatJump(j.minutes, 'nl'))).toEqual(['+4 u', '+30 min', '+15 min']);
  });
});

describe('AT-13 jump invariants', () => {
  it('hold for every S < E on quarter hours within 06:00–22:00', () => {
    const lo = T(6, 0);
    const hi = T(22, 0);
    let count = 0;
    for (let s = lo; s < hi; s += 15) {
      for (let e = s + 15; e <= hi; e += 15) {
        const jumps = decomposeJumps(s, e);
        count++;
        expect(jumps.length).toBeGreaterThanOrEqual(1);
        expect(jumps.length).toBeLessThanOrEqual(3);
        expect(jumps.reduce((sum, j) => sum + j.minutes, 0)).toBe(e - s);
        expect(jumps[jumps.length - 1]!.to).toBe(e);
        let t = s;
        for (const j of jumps) {
          expect(j.minutes).toBeGreaterThan(0);
          expect(j.minutes % 15).toBe(0);
          t += j.minutes;
          expect(j.to).toBe(t);
        }
      }
    }
    expect(count).toBe((64 * 65) / 2);
  });
  it('rejects a non-positive interval', () => {
    expect(() => decomposeJumps(T(9, 0), T(9, 0))).toThrow(RangeError);
    expect(() => decomposeJumps(T(9, 0), T(8, 0))).toThrow(RangeError);
  });
});

describe('AT-14 worked examples of SPEC §8.4', () => {
  const rows: [string, string, string[]][] = [
    ['14:30', '19:15', ['+4 h → 18:30', '+30 min → 19:00', '+15 min → 19:15']],
    ['14:00', '17:00', ['+3 h → 17:00']],
    ['14:30', '15:15', ['+30 min → 15:00', '+15 min → 15:15']],
    ['14:15', '14:45', ['+30 min → 14:45']],
    ['14:45', '15:15', ['+15 min → 15:00', '+15 min → 15:15']],
    ['09:30', '10:00', ['+30 min → 10:00']],
  ];
  const parse = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return T(h!, m!);
  };
  it.each(rows)('%s → %s', (s, e, expected) => {
    const jumps = decomposeJumps(parse(s), parse(e));
    const rendered = jumps.map(
      (j) => `${formatJump(j.minutes, 'en')} → ${formatTime(j.to, '24h')}`,
    );
    expect(rendered).toEqual(expected);
  });
});

describe('AT-16 duration formatting', () => {
  it('handles singular hours, mixed, whole and minute-only cases in three languages', () => {
    expect(formatDuration(60, 'en')).toBe('1 hour');
    expect(formatDuration(60, 'tr')).toBe('1 saat');
    expect(formatDuration(60, 'nl')).toBe('1 uur');
    expect(formatDuration(75, 'en')).toBe('1 hour 15 minutes');
    expect(formatDuration(75, 'tr')).toBe('1 saat 15 dakika');
    expect(formatDuration(75, 'nl')).toBe('1 uur 15 minuten');
    expect(formatDuration(300, 'en')).toBe('5 hours');
    expect(formatDuration(300, 'tr')).toBe('5 saat');
    expect(formatDuration(300, 'nl')).toBe('5 uur');
    expect(formatDuration(30, 'en')).toBe('30 minutes');
    expect(formatDuration(30, 'tr')).toBe('30 dakika');
    expect(formatDuration(30, 'nl')).toBe('30 minuten');
  });
});

describe('duration choices (SPEC §8.3)', () => {
  it('are three distinct positive multiples of 15 with exactly one correct, at every level', () => {
    const windows: [1 | 2 | 3, number, number, number][] = [
      [1, 60, 300, 60],
      [2, 15, 120, 15],
      [3, 135, 360, 15],
    ];
    for (const [level, lo, hi, step] of windows) {
      for (let d = lo; d <= hi; d += step) {
        const choices = durationChoices(d, level, createRng(d));
        expect(choices).toHaveLength(3);
        expect(new Set(choices).size).toBe(3);
        expect(choices.filter((c) => c === d)).toHaveLength(1);
        for (const c of choices) {
          expect(c).toBeGreaterThan(0);
          expect(c % 15).toBe(0);
        }
      }
    }
  });
  it('follows the E1 list in order: D − 60 and D + 60 when both are valid', () => {
    expect([...durationChoices(120, 1, createRng(1))].sort((a, b) => a - b)).toEqual([
      60, 120, 180,
    ]);
    // 60 − 60 is invalid, so the next candidates are used.
    expect([...durationChoices(60, 1, createRng(1))].sort((a, b) => a - b)).toEqual([60, 120, 180]);
  });
  it('uses the next whole hour above D at E2', () => {
    expect([...durationChoices(75, 2, createRng(1))].sort((a, b) => a - b)).toEqual([45, 75, 120]);
    expect([...durationChoices(15, 2, createRng(1))].sort((a, b) => a - b)).toEqual([15, 30, 60]);
  });
  it('shuffles by seed', () => {
    const orders = new Set<string>();
    for (let seed = 0; seed < 30; seed++)
      orders.add(durationChoices(285, 3, createRng(seed)).join(','));
    expect(orders.size).toBeGreaterThan(1);
  });
});
