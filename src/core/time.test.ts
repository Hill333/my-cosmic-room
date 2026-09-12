import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  formatTime,
  hour12Of,
  hourAngle,
  isTimeValue,
  makeTime,
  minuteAngle,
  normalizeTime,
  periodOf,
  sameFace,
  snap,
} from './time.ts';

describe('AT-01 hand angles (SPEC §6.1 table)', () => {
  const rows: [string, number, number, number, number][] = [
    ['12:00', 0, 0, 0, 0],
    ['3:00', 3, 0, 90, 0],
    ['3:30', 3, 30, 105, 180],
    ['6:45', 6, 45, 202.5, 270],
    ['9:15', 9, 15, 277.5, 90],
    ['14:30', 14, 30, 75, 180],
    ['19:15', 19, 15, 217.5, 90],
  ];
  it.each(rows)('%s → hour %i°/minute %i°', (_label, h, m, hourDeg, minuteDeg) => {
    const t = makeTime(h, m);
    expect(hourAngle(t)).toBe(hourDeg);
    expect(minuteAngle(t)).toBe(minuteDeg);
  });
});

describe('AT-02 hour hand is continuous', () => {
  it('advances exactly 0.5° per minute across the whole day', () => {
    for (let t = 0; t < 1440; t++) {
      const next = (t + 1) % 1440;
      const delta = (hourAngle(next) - hourAngle(t) + 360) % 360;
      expect(delta).toBeCloseTo(0.5, 10);
    }
  });
});

describe('AT-03 digital formatting', () => {
  it('12-hour mode has no leading zero and no AM/PM', () => {
    expect(formatTime(0, '12h')).toBe('12:00');
    expect(formatTime(90, '12h')).toBe('1:30');
    expect(formatTime(870, '12h')).toBe('2:30');
    expect(formatTime(720, '12h')).toBe('12:00');
    expect(formatTime(1155, '12h')).toBe('7:15');
  });
  it('24-hour mode has a leading zero', () => {
    expect(formatTime(90, '24h')).toBe('01:30');
    expect(formatTime(870, '24h')).toBe('14:30');
    expect(formatTime(1155, '24h')).toBe('19:15');
    expect(formatTime(0, '24h')).toBe('00:00');
  });
});

describe('AT-04 snapping', () => {
  it('returns the nearest multiple of the step', () => {
    expect(snap(214, 30)).toBe(210);
    expect(snap(226, 30)).toBe(240);
    expect(snap(7, 5)).toBe(5);
    expect(snap(8, 5)).toBe(10);
    expect(snap(870, 15)).toBe(870);
  });
  it('rounds ties up', () => {
    expect(snap(225, 30)).toBe(240);
    expect(snap(37.5, 15)).toBe(45);
    expect(snap(30, 60)).toBe(60);
  });
  it('keeps the result within 0–1439', () => {
    for (const step of [5, 15, 30, 60]) {
      for (let t = 0; t < 1440; t++) {
        const s = snap(t, step);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(1440);
        expect(s % step).toBe(0);
      }
    }
    expect(snap(1439, 60)).toBe(0);
  });
  it('rejects a non-positive step', () => {
    expect(() => snap(10, 0)).toThrow(RangeError);
  });
});

describe('helpers', () => {
  it('normalizes onto the day', () => {
    expect(normalizeTime(1440)).toBe(0);
    expect(normalizeTime(-30)).toBe(1410);
    expect(addMinutes(1430, 20)).toBe(10);
  });
  it('reads the 12-hour hour', () => {
    expect(hour12Of(0)).toBe(12);
    expect(hour12Of(720)).toBe(12);
    expect(hour12Of(780)).toBe(1);
    expect(hour12Of(1155)).toBe(7);
  });
  it('compares faces on 12 hours', () => {
    expect(sameFace(makeTime(3, 30), makeTime(15, 30))).toBe(true);
    expect(sameFace(makeTime(3, 30), makeTime(3, 0))).toBe(false);
  });
  it('validates time values', () => {
    expect(isTimeValue(0)).toBe(true);
    expect(isTimeValue(1439)).toBe(true);
    expect(isTimeValue(1440)).toBe(false);
    expect(isTimeValue(1.5)).toBe(false);
    expect(isTimeValue('3')).toBe(false);
  });
});

describe('AT-10 day-period badge boundaries', () => {
  it('switches at 05:00, 12:00, 18:00 and 22:00', () => {
    expect(periodOf(makeTime(4, 59))).toBe('night');
    expect(periodOf(makeTime(5, 0))).toBe('morning');
    expect(periodOf(makeTime(11, 59))).toBe('morning');
    expect(periodOf(makeTime(12, 0))).toBe('afternoon');
    expect(periodOf(makeTime(17, 59))).toBe('afternoon');
    expect(periodOf(makeTime(18, 0))).toBe('evening');
    expect(periodOf(makeTime(21, 59))).toBe('evening');
    expect(periodOf(makeTime(22, 0))).toBe('night');
  });
});
