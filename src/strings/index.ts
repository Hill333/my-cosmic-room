/**
 * String table access (SPEC §13.4). Pure: the language is passed in.
 * Missing keys fall back to English with a development warning.
 */
import type { Language } from '../core/types.ts';
import { en, type StringKey } from './en.ts';
import { nl } from './nl.ts';
import { tr } from './tr.ts';

export type { StringKey } from './en.ts';

export const LANGUAGES: readonly Language[] = ['en', 'tr', 'nl'];

export const tables: Record<Language, Record<StringKey, string>> = { en, tr, nl };

export type Params = Record<string, string | number>;

const warned = new Set<string>();

function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  if (typeof console !== 'undefined') console.warn(message);
}

/** Replaces {placeholders}; unknown placeholders are left visible so they get noticed. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Looks up a key in the given language, falling back to English. */
export function translate(lang: Language, key: StringKey, params?: Params): string {
  const table = tables[lang];
  let value: string | undefined = table[key];
  if (value === undefined) {
    warnOnce(`Missing ${lang} string for "${key}", using English`);
    value = en[key];
  }
  if (value === undefined) {
    warnOnce(`Missing string key "${key}"`);
    return key;
  }
  return interpolate(value, params);
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'tr' || value === 'nl';
}

/** Native names of the languages, used on the first-launch choice and language switches. */
export const languageNames: Record<Language, string> = {
  en: 'English',
  tr: 'Türkçe',
  nl: 'Nederlands',
};
