import type { Params, StringKey } from '../strings/index.ts';
import { translate } from '../strings/index.ts';
import { language } from '../state/store.ts';

/** Translates with the current language signal; re-renders when the language changes. */
export function t(key: StringKey, params?: Params): string {
  return translate(language.value, key, params);
}
