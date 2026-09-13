/**
 * Times in words (SPEC §7.7): "quarter past 4" / "kwart over 4" / "dördü çeyrek geçiyor".
 * Pure. The twelve minute forms are string-table templates with a single `{h}`; this module
 * decides which hour fills it (the current one or the next) and, for Turkish, in which case.
 */
import { translate } from '../strings/index.ts';
import type { StringKey } from '../strings/index.ts';
import { hour12Of, minutesOf } from './time.ts';
import type { Language, TimeValue } from './types.ts';

/** Minute forms that name the *next* hour, per language. */
const NEXT_HOUR: Record<Language, readonly number[]> = {
  // "quarter to 4", "twenty-five to 4", …
  en: [35, 40, 45, 50, 55],
  // "half 4" is 3:30, and the forms built on it: "10 voor half 4" (3:20), "5 over half 4" (3:35).
  nl: [20, 25, 30, 35, 40, 45, 50, 55],
  // "dörde çeyrek var" (3:45), "dörde yirmi beş var" (3:35).
  tr: [35, 40, 45, 50, 55],
};

/** Turkish hour words: nominative ("saat üç", "üç buçuk"), accusative ("üçü … geçiyor"), dative ("dörde … var"). */
const TR_HOURS = {
  nominative: [
    'bir',
    'iki',
    'üç',
    'dört',
    'beş',
    'altı',
    'yedi',
    'sekiz',
    'dokuz',
    'on',
    'on bir',
    'on iki',
  ],
  accusative: [
    'biri',
    'ikiyi',
    'üçü',
    'dördü',
    'beşi',
    'altıyı',
    'yediyi',
    'sekizi',
    'dokuzu',
    'onu',
    'on biri',
    'on ikiyi',
  ],
  dative: [
    'bire',
    'ikiye',
    'üçe',
    'dörde',
    'beşe',
    'altıya',
    'yediye',
    'sekize',
    'dokuza',
    'ona',
    'on bire',
    'on ikiye',
  ],
} as const;

function turkishHour(hour12: number, minute: number): string {
  const form = minute === 0 || minute === 30 ? 'nominative' : minute < 30 ? 'accusative' : 'dative';
  return TR_HOURS[form][hour12 - 1]!;
}

/** The hour spoken in the phrase: 1–12, the current one or the next depending on language and minute. */
export function spokenHour(t: TimeValue, lang: Language): number {
  const m = minutesOf(t);
  const h = hour12Of(t);
  if (!NEXT_HOUR[lang].includes(m)) return h;
  return h === 12 ? 1 : h + 1;
}

/**
 * Formats a time in words. Only multiples of five minutes are allowed (reading precision R4);
 * anything else is a caller bug.
 */
export function formatTimeWords(t: TimeValue, lang: Language): string {
  const m = minutesOf(t);
  if (m % 5 !== 0) throw new RangeError(`formatTimeWords needs a multiple of 5 minutes, got ${m}`);
  const hour = spokenHour(t, lang);
  const h = lang === 'tr' ? turkishHour(hour, m) : String(hour);
  return translate(lang, `words.m${m}` as StringKey, { h });
}
