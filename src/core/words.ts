/**
 * The time in words for WORDS puzzles: the school way of saying a clock time in each
 * language ("half past three", "üç buçuk", "half vier"). Pure; the grammar lives here rather
 * than in the string tables because Turkish declines the hour and Dutch counts to and from
 * the half hour, so the phrase is not a template with placeholders.
 */
import type { Language, TimeValue } from './types.ts';
import { hoursOf, minutesOf } from './time.ts';

/** Hour words indexed by hour on the face, 1–12 (index 0 unused). */
const EN_HOURS = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];
const NL_HOURS = [
  '',
  'één',
  'twee',
  'drie',
  'vier',
  'vijf',
  'zes',
  'zeven',
  'acht',
  'negen',
  'tien',
  'elf',
  'twaalf',
];
const TR_HOURS = [
  '',
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
];
/** Accusative ("üçü beş geçiyor") and dative ("dörde beş var") forms of the Turkish hours. */
const TR_HOURS_ACC = [
  '',
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
];
const TR_HOURS_DAT = [
  '',
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
];

/** Minute words for the five-minute counts up to 25, by minutes / 5. */
const EN_MINUTES = ['', 'five', 'ten', 'quarter', 'twenty', 'twenty-five'];
const NL_MINUTES = ['', 'vijf', 'tien', 'kwart', 'twintig', 'vijfentwintig'];
const TR_MINUTES = ['', 'beş', 'on', 'çeyrek', 'yirmi', 'yirmi beş'];

/** Hour on the face, 1–12, and the following hour (12 → 1). */
function faceHours(t: TimeValue): [number, number] {
  const h = hoursOf(t) % 12 || 12;
  return [h, (h % 12) + 1];
}

function english(t: TimeValue): string {
  const [h, next] = faceHours(t);
  const m = minutesOf(t);
  if (m === 0) return `${EN_HOURS[h]} o'clock`;
  if (m === 30) return `half past ${EN_HOURS[h]}`;
  if (m < 30) return `${EN_MINUTES[m / 5]} past ${EN_HOURS[h]}`;
  return `${EN_MINUTES[(60 - m) / 5]} to ${EN_HOURS[next]}`;
}

/** Dutch counts around the half hour: 3:20 is "tien voor half vier", 3:35 "vijf over half vier". */
function dutch(t: TimeValue): string {
  const [h, next] = faceHours(t);
  const m = minutesOf(t);
  if (m === 0) return `${NL_HOURS[h]} uur`;
  if (m === 15) return `kwart over ${NL_HOURS[h]}`;
  if (m === 30) return `half ${NL_HOURS[next]}`;
  if (m === 45) return `kwart voor ${NL_HOURS[next]}`;
  if (m < 15) return `${NL_MINUTES[m / 5]} over ${NL_HOURS[h]}`;
  if (m < 30) return `${NL_MINUTES[(30 - m) / 5]} voor half ${NL_HOURS[next]}`;
  if (m < 45) return `${NL_MINUTES[(m - 30) / 5]} over half ${NL_HOURS[next]}`;
  return `${NL_MINUTES[(60 - m) / 5]} voor ${NL_HOURS[next]}`;
}

/** Turkish: "saat üç", "üçü çeyrek geçiyor", "üç buçuk" (12:30 is "yarım"), "dörde çeyrek var". */
function turkish(t: TimeValue): string {
  const [h, next] = faceHours(t);
  const m = minutesOf(t);
  if (m === 0) return `saat ${TR_HOURS[h]}`;
  if (m === 30) return h === 12 ? 'yarım' : `${TR_HOURS[h]} buçuk`;
  if (m < 30) return `${TR_HOURS_ACC[h]} ${TR_MINUTES[m / 5]} geçiyor`;
  return `${TR_HOURS_DAT[next]} ${TR_MINUTES[(60 - m) / 5]} var`;
}

/**
 * The time in words, capitalised as a sentence. Only five-minute times have a spoken form;
 * anything else throws, as the generators never produce it (SPEC §7.1: one-minute reading
 * is deferred).
 */
export function formatTimeWords(t: TimeValue, lang: Language): string {
  if (minutesOf(t) % 5 !== 0) {
    throw new RangeError(`No words for a time off the five-minute grid: ${t}`);
  }
  const words = lang === 'tr' ? turkish(t) : lang === 'nl' ? dutch(t) : english(t);
  // Capitalise in the language: Turkish "i" upper-cases to "İ", never "I".
  return words.charAt(0).toLocaleUpperCase(lang) + words.slice(1);
}
