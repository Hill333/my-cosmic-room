import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../strings/index.ts';
import { makeTime } from './time.ts';
import type { Language } from './types.ts';
import { formatTimeWords, spokenHour } from './words.ts';

const T = makeTime;

describe('AT-39 times in words (SPEC §7.7)', () => {
  it('reproduces the workbook and reference forms in every language', () => {
    const golden: [number, Record<Language, string>][] = [
      [T(3, 0), { en: "3 o'clock", nl: '3 uur', tr: 'saat üç' }],
      [T(2, 30), { en: 'half past 2', nl: 'half 3', tr: 'iki buçuk' }],
      [T(12, 45), { en: 'quarter to 1', nl: 'kwart voor 1', tr: 'bire çeyrek var' }],
      [T(4, 15), { en: 'quarter past 4', nl: 'kwart over 4', tr: 'dördü çeyrek geçiyor' }],
      [T(3, 20), { en: 'twenty past 3', nl: '10 voor half 4', tr: 'üçü yirmi geçiyor' }],
      [T(3, 35), { en: 'twenty-five to 4', nl: '5 over half 4', tr: 'dörde yirmi beş var' }],
      [T(11, 45), { en: 'quarter to 12', nl: 'kwart voor 12', tr: 'on ikiye çeyrek var' }],
      [T(23, 30), { en: 'half past 11', nl: 'half 12', tr: 'on bir buçuk' }],
      [T(0, 5), { en: 'five past 12', nl: '5 over 12', tr: 'on ikiyi beş geçiyor' }],
      [T(6, 55), { en: 'five to 7', nl: '5 voor 7', tr: 'yediye beş var' }],
    ];
    for (const [time, expected] of golden) {
      for (const lang of LANGUAGES) {
        expect(formatTimeWords(time, lang), `${time} ${lang}`).toBe(expected[lang]);
      }
    }
  });

  it('names the next hour for "to" forms, and in Dutch from twenty past onwards', () => {
    for (let h = 0; h < 24; h++) {
      const next = h % 12 === 11 ? 12 : (h % 12) + 1;
      const current = h % 12 === 0 ? 12 : h % 12;
      for (let m = 0; m < 60; m += 5) {
        expect(spokenHour(T(h, m), 'en')).toBe(m >= 35 ? next : current);
        expect(spokenHour(T(h, m), 'tr')).toBe(m >= 35 ? next : current);
        expect(spokenHour(T(h, m), 'nl')).toBe(m >= 20 ? next : current);
      }
    }
  });

  it('inflects Turkish hours: nominative for whole and half, accusative for past, dative for to', () => {
    expect(formatTimeWords(T(6, 0), 'tr')).toBe('saat altı');
    expect(formatTimeWords(T(6, 30), 'tr')).toBe('altı buçuk');
    expect(formatTimeWords(T(6, 10), 'tr')).toBe('altıyı on geçiyor');
    expect(formatTimeWords(T(6, 50), 'tr')).toBe('yediye on var');
    expect(formatTimeWords(T(9, 25), 'tr')).toBe('dokuzu yirmi beş geçiyor');
    expect(formatTimeWords(T(9, 40), 'tr')).toBe('ona yirmi var');
  });

  it('formats every five-minute face without a stray placeholder', () => {
    for (const lang of LANGUAGES) {
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 5) {
          const words = formatTimeWords(T(h, m), lang);
          expect(words).not.toContain('{');
          expect(words.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('rejects minutes that are not multiples of five', () => {
    expect(() => formatTimeWords(T(3, 7), 'en')).toThrow(RangeError);
  });
});
