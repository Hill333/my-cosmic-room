import { describe, expect, it } from 'vitest';
import { allCollections, allItems } from '../catalog/index.ts';
import { en, type StringKey } from './en.ts';
import { interpolate, LANGUAGES, tables, translate } from './index.ts';

describe('AT-37 (automated part): string table completeness', () => {
  const keys = Object.keys(en) as StringKey[];

  it('every key has a non-empty Turkish and Dutch value', () => {
    for (const lang of LANGUAGES) {
      for (const key of keys) {
        expect(tables[lang][key], `${lang}:${key}`).toBeTypeOf('string');
        expect(tables[lang][key].trim().length, `${lang}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('placeholders match across languages', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of keys) {
      const expected = placeholders(en[key]);
      for (const lang of LANGUAGES) {
        expect(placeholders(tables[lang][key]), `${lang}:${key}`).toEqual(expected);
      }
    }
  });

  it('has a name for every catalogue item and collection', () => {
    for (const item of allItems) {
      expect(keys, item.id).toContain(item.nameKey);
    }
    for (const c of allCollections) {
      expect(keys, c.id).toContain(c.nameKey);
    }
  });

  it('keeps sentence case (no all-caps words, which break Turkish İ/ı)', () => {
    for (const lang of LANGUAGES) {
      for (const key of keys) {
        const value = tables[lang][key];
        // Allow short tokens like "EN" only if they are placeholders; otherwise no ALLCAPS words > 2 letters.
        expect(/\b[A-ZÇĞİÖŞÜ]{3,}\b/.test(value), `${lang}:${key} "${value}"`).toBe(false);
      }
    }
  });
});

describe('translate', () => {
  it('interpolates placeholders', () => {
    expect(translate('en', 's1.collected', { n: 3, total: 12 })).toBe('3 / 12 collected');
    expect(translate('tr', 'a.set.q', { time: '3:30' })).toBe('Saati 3:30 yap.');
    expect(translate('nl', 'q.progress', { k: 2 })).toBe('Vraag 2 van 4');
  });
  it('leaves unknown placeholders visible', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });
  it('falls back to English for a missing translation', () => {
    const backup = tables.tr['q.hint'];
    // @ts-expect-error simulate a missing key at runtime
    delete tables.tr['q.hint'];
    expect(translate('tr', 'q.hint')).toBe('Hint');
    tables.tr['q.hint'] = backup;
  });
});
