/**
 * Single-signal app state (SPEC §16.2): the whole Save lives in one signal, every change
 * goes through a reducer, and one subscriber autosaves (250 ms debounce, sync on pagehide).
 */
import { computed, effect, signal } from '@preact/signals';
import type { KeyValueStore, SaveNotice } from '../core/save.ts';
import { loadSave, storeSave } from '../core/save.ts';
import { settingsReducer, type SettingsEvent } from '../core/settings.ts';
import type { Language, Save, Theme } from '../core/types.ts';
import { isLanguage } from '../strings/index.ts';

export type AppEvent = SettingsEvent | { type: 'save/replace'; save: Save };

const AUTOSAVE_DELAY_MS = 250;

function browserStorage(): KeyValueStore {
  try {
    const s = window.localStorage;
    s.getItem('mcr.probe');
    return s;
  } catch {
    // Storage blocked (private mode, permissions): play without persistence.
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  }
}

export const storage: KeyValueStore = browserStorage();

const loaded = loadSave(storage);

export const save = signal<Save>(applyDevOverrides(loaded.save));
export const loadStatus = loaded.status;
export const notice = signal<SaveNotice | null>(loaded.notice);

export const language = computed<Language>(() => save.value.settings.language ?? 'en');
export const languageChosen = computed(() => save.value.settings.language !== null);
export const lastTheme = computed<Theme>(() => save.value.settings.lastTheme);
export const soundOn = computed(() => save.value.settings.sound);

function rootReducer(state: Save, event: AppEvent): Save {
  if (event.type === 'save/replace') return event.save;
  return settingsReducer(state, event);
}

export function dispatch(event: AppEvent): void {
  const next = rootReducer(save.value, event);
  if (next !== save.value) save.value = next;
}

// --- Autosave -----------------------------------------------------------------

let timer: ReturnType<typeof setTimeout> | null = null;
let dirty: Save | null = null;
let lastWritten: Save = loaded.save;

export function flushSave(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (dirty && dirty !== lastWritten) {
    storeSave(storage, dirty);
    lastWritten = dirty;
  }
  dirty = null;
}

effect(() => {
  const current = save.value;
  if (current === lastWritten) return;
  dirty = current;
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
}

// --- Development aids (SPEC §16.4), stripped from production builds -------------

function applyDevOverrides(state: Save): Save {
  if (!import.meta.env.DEV || typeof window === 'undefined') return state;
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  if (isLanguage(lang)) {
    return { ...state, settings: { ...state.settings, language: lang } };
  }
  return state;
}
