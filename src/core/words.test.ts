import { describe, expect, it } from 'vitest';
import { makeTime } from './time.ts';
import { formatTimeWords } from './words.ts';

const T = makeTime;

describe('formatTimeWords: English', () => {
  it('says whole, half and quarter hours the school way', () => {
    expect(formatTimeWords(T(3, 0), 'en')).toBe("Three o'clock");
    expect(formatTimeWords(T(3, 15), 'en')).toBe('Quarter past three');
    expect(formatTimeWords(T(3, 30), 'en')).toBe('Half past three');
    expect(formatTimeWords(T(3, 45), 'en')).toBe('Quarter to four');
  });
  it('counts past and to on the five-minute grid', () => {
    expect(formatTimeWords(T(3, 5), 'en')).toBe('Five past three');
    expect(formatTimeWords(T(3, 25), 'en')).toBe('Twenty-five past three');
    expect(formatTimeWords(T(3, 35), 'en')).toBe('Twenty-five to four');
    expect(formatTimeWords(T(3, 55), 'en')).toBe('Five to four');
  });
  it('wraps twelve to one and reads 24-hour values on the face', () => {
    expect(formatTimeWords(T(12, 45), 'en')).toBe('Quarter to one');
    expect(formatTimeWords(T(0, 0), 'en')).toBe("Twelve o'clock");
    expect(formatTimeWords(T(15, 30), 'en')).toBe('Half past three');
  });
});

describe('formatTimeWords: Turkish', () => {
  it('declines the hour: accusative for "geçiyor", dative for "var"', () => {
    expect(formatTimeWords(T(3, 0), 'tr')).toBe('Saat üç');
    expect(formatTimeWords(T(3, 15), 'tr')).toBe('Üçü çeyrek geçiyor');
    expect(formatTimeWords(T(3, 30), 'tr')).toBe('Üç buçuk');
    expect(formatTimeWords(T(3, 45), 'tr')).toBe('Dörde çeyrek var');
    expect(formatTimeWords(T(6, 5), 'tr')).toBe('Altıyı beş geçiyor');
    expect(formatTimeWords(T(1, 40), 'tr')).toBe('İkiye yirmi var');
  });
  it('says "yarım" for half past twelve and "on ikiye" before twelve', () => {
    expect(formatTimeWords(T(12, 30), 'tr')).toBe('Yarım');
    expect(formatTimeWords(T(11, 45), 'tr')).toBe('On ikiye çeyrek var');
    expect(formatTimeWords(T(12, 0), 'tr')).toBe('Saat on iki');
  });
  it('capitalises with the Turkish dotted İ', () => {
    expect(formatTimeWords(T(2, 10), 'tr')).toBe('İkiyi on geçiyor');
  });
});

describe('formatTimeWords: Dutch', () => {
  it('counts to and from the half hour', () => {
    expect(formatTimeWords(T(3, 0), 'nl')).toBe('Drie uur');
    expect(formatTimeWords(T(3, 5), 'nl')).toBe('Vijf over drie');
    expect(formatTimeWords(T(3, 15), 'nl')).toBe('Kwart over drie');
    expect(formatTimeWords(T(3, 20), 'nl')).toBe('Tien voor half vier');
    expect(formatTimeWords(T(3, 30), 'nl')).toBe('Half vier');
    expect(formatTimeWords(T(3, 35), 'nl')).toBe('Vijf over half vier');
    expect(formatTimeWords(T(3, 45), 'nl')).toBe('Kwart voor vier');
    expect(formatTimeWords(T(3, 50), 'nl')).toBe('Tien voor vier');
  });
  it('wraps twaalf to één', () => {
    expect(formatTimeWords(T(12, 30), 'nl')).toBe('Half één');
    expect(formatTimeWords(T(1, 0), 'nl')).toBe('Één uur');
  });
});

describe('formatTimeWords: grid', () => {
  it('gives distinct phrases for every five-minute face in every language', () => {
    for (const lang of ['en', 'tr', 'nl'] as const) {
      const seen = new Set<string>();
      for (let h = 1; h <= 12; h++) {
        for (let m = 0; m < 60; m += 5) seen.add(formatTimeWords(T(h, m), lang));
      }
      expect(seen.size).toBe(144);
    }
  });
  it('rejects times off the five-minute grid', () => {
    expect(() => formatTimeWords(T(3, 1), 'en')).toThrow(RangeError);
  });
});
