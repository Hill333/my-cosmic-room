/**
 * Save schema, validation, migration, load, store, export and import (SPEC §11.3, D6).
 * Pure: storage is injected through the KeyValueStore interface, so tests use memory.
 */
import {
  defaultHeroine,
  starterDecorations,
  starterSlots,
  starterWardrobe,
} from '../catalog/index.ts';
import { checkInvariants } from './inventory.ts';
import { isTimeValue } from './time.ts';
import type {
  Activity,
  Language,
  Mission,
  MissionSummary,
  MotionSetting,
  Progress,
  Save,
  Settings,
  Theme,
  ThemeState,
} from './types.ts';
import { SLOT_TYPES } from './types.ts';

export const SAVE_VERSION = 1 as const;
// "mcr" is the legacy storage prefix from the working title "My Cosmic Room". The game was
// renamed to Tick-Tock (D9) but the keys stay, since changing them would orphan every
// existing save in players' browsers.
export const SAVE_KEY = 'mcr.save.v1';
export const BACKUP_KEY = 'mcr.save.backup';
export const QUARANTINE_KEY = 'mcr.save.quarantine';
export const NOTICE_KEY = 'mcr.save.notice';
export const EXPORT_FILENAME = 'tick-tock-save.json';

/** Structural subset of the DOM Storage interface, so core stays DOM-free. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
}

// ---------------------------------------------------------------------------
// Fresh save

export function freshThemeState(theme: Theme): ThemeState {
  return {
    owned: starterDecorations(theme).map((i) => i.id),
    slots: starterSlots(theme),
    lampOn: false,
    stars: 0,
  };
}

export function freshProgress(): Progress {
  return {
    recentReadingTargets: [],
    recentElapsedPairs: [],
    firstE3Done: { space: false, sweet: false },
    suggestion: { A: { streak: 0, declinedAt: null }, B: { streak: 0, declinedAt: null } },
    history: [],
  };
}

export function freshSettings(): Settings {
  return {
    language: null,
    sound: true,
    motion: 'system',
    readingLevel: 2,
    elapsedLevel: 1,
    levelsLocked: false,
    hour24Reading: false,
    timeWords: true,
    lastTheme: 'space',
  };
}

export function createFreshSave(now: Date = new Date()): Save {
  const iso = now.toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: iso,
    updatedAt: iso,
    settings: freshSettings(),
    heroine: { ...defaultHeroine },
    wardrobe: starterWardrobe().map((i) => i.id),
    themes: { space: freshThemeState('space'), sweet: freshThemeState('sweet') },
    progress: freshProgress(),
    mission: null,
    newItems: [],
  };
}

// ---------------------------------------------------------------------------
// Validation

export type ValidationResult =
  { ok: true; save: Save } | { ok: false; reason: 'newer-version' | 'invalid'; detail: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isLanguage = (v: unknown): v is Language => v === 'en' || v === 'tr' || v === 'nl';
const isTheme = (v: unknown): v is Theme => v === 'space' || v === 'sweet';
const isMotion = (v: unknown): v is MotionSetting =>
  v === 'system' || v === 'reduced' || v === 'full';
const isIntIn = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

function fail(detail: string): ValidationResult {
  return { ok: false, reason: 'invalid', detail };
}

function validateSettings(v: unknown): Settings | string {
  if (!isRecord(v)) return 'settings is not an object';
  if (!(v['language'] === null || isLanguage(v['language']))) return 'settings.language';
  if (!isBool(v['sound'])) return 'settings.sound';
  if (!isMotion(v['motion'])) return 'settings.motion';
  if (!isIntIn(v['readingLevel'], 1, 4)) return 'settings.readingLevel';
  if (!isIntIn(v['elapsedLevel'], 1, 3)) return 'settings.elapsedLevel';
  if (!isBool(v['levelsLocked'])) return 'settings.levelsLocked';
  if (!isBool(v['hour24Reading'])) return 'settings.hour24Reading';
  // Additive field (SPEC §7.7): a save written before it exists loads with words on.
  if (!(v['timeWords'] === undefined || isBool(v['timeWords']))) return 'settings.timeWords';
  if (!isTheme(v['lastTheme'])) return 'settings.lastTheme';
  return {
    language: v['language'],
    sound: v['sound'],
    motion: v['motion'],
    readingLevel: v['readingLevel'] as Settings['readingLevel'],
    elapsedLevel: v['elapsedLevel'] as Settings['elapsedLevel'],
    levelsLocked: v['levelsLocked'],
    hour24Reading: v['hour24Reading'],
    timeWords: v['timeWords'] ?? true,
    lastTheme: v['lastTheme'],
  };
}

function validateThemeState(v: unknown, path: string): ThemeState | string {
  if (!isRecord(v)) return `${path} is not an object`;
  if (!isStringArray(v['owned'])) return `${path}.owned`;
  if (!isRecord(v['slots'])) return `${path}.slots`;
  const slots = {} as ThemeState['slots'];
  for (const slot of SLOT_TYPES) {
    const id = v['slots'][slot];
    if (typeof id !== 'string') return `${path}.slots.${slot}`;
    slots[slot] = id;
  }
  if (!isBool(v['lampOn'])) return `${path}.lampOn`;
  if (!isIntIn(v['stars'], 0, 24)) return `${path}.stars`;
  return { owned: [...v['owned']], slots, lampOn: v['lampOn'], stars: v['stars'] };
}

function validateSummary(v: unknown): MissionSummary | null {
  if (!isRecord(v)) return null;
  if (!isTheme(v['theme'])) return null;
  if (!(v['activity'] === 'A' || v['activity'] === 'B')) return null;
  if (!isIntIn(v['level'], 1, 4)) return null;
  if (!isIntIn(v['hints'], 0, 1e6) || !isIntIn(v['wrong'], 0, 1e6)) return null;
  if (typeof v['seconds'] !== 'number') return null;
  if (!isIso(v['endedAt'])) return null;
  if (!(v['claimed'] === null || typeof v['claimed'] === 'string')) return null;
  return {
    theme: v['theme'],
    activity: v['activity'] as Activity,
    level: v['level'],
    hints: v['hints'],
    wrong: v['wrong'],
    seconds: v['seconds'],
    endedAt: v['endedAt'],
    claimed: v['claimed'] as MissionSummary['claimed'],
  };
}

function validateProgress(v: unknown): Progress | string {
  if (!isRecord(v)) return 'progress is not an object';
  const targets = v['recentReadingTargets'];
  if (!Array.isArray(targets) || !targets.every(isTimeValue))
    return 'progress.recentReadingTargets';
  const pairs = v['recentElapsedPairs'];
  if (
    !Array.isArray(pairs) ||
    !pairs.every((p) => Array.isArray(p) && p.length === 2 && p.every(isTimeValue))
  ) {
    return 'progress.recentElapsedPairs';
  }
  const f = v['firstE3Done'];
  if (!isRecord(f) || !isBool(f['space']) || !isBool(f['sweet'])) return 'progress.firstE3Done';
  const s = v['suggestion'];
  if (!isRecord(s)) return 'progress.suggestion';
  const sug = {} as Progress['suggestion'];
  for (const a of ['A', 'B'] as const) {
    const e = s[a];
    if (!isRecord(e) || !isIntIn(e['streak'], 0, 1e6)) return `progress.suggestion.${a}`;
    if (!(e['declinedAt'] === null || typeof e['declinedAt'] === 'number')) {
      return `progress.suggestion.${a}.declinedAt`;
    }
    sug[a] = { streak: e['streak'], declinedAt: e['declinedAt'] as number | null };
  }
  const hist = v['history'];
  if (!Array.isArray(hist)) return 'progress.history';
  const history: MissionSummary[] = [];
  for (const h of hist) {
    const ok = validateSummary(h);
    if (!ok) return 'progress.history entry';
    history.push(ok);
  }
  return {
    recentReadingTargets: [...(targets as number[])],
    recentElapsedPairs: (pairs as [number, number][]).map((p) => [p[0], p[1]]),
    firstE3Done: { space: f['space'], sweet: f['sweet'] },
    suggestion: sug,
    history: history.slice(-20),
  };
}

function validateMission(v: unknown): Mission | null | string {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) return 'mission is not an object';
  if (typeof v['id'] !== 'string') return 'mission.id';
  if (!isTheme(v['theme'])) return 'mission.theme';
  if (!(v['activity'] === 'A' || v['activity'] === 'B')) return 'mission.activity';
  if (!isIntIn(v['level'], 1, 4)) return 'mission.level';
  if (typeof v['seed'] !== 'number') return 'mission.seed';
  if (!Array.isArray(v['puzzles']) || v['puzzles'].length !== 4) return 'mission.puzzles';
  if (!isIntIn(v['index'], 0, 4)) return 'mission.index';
  if (!Array.isArray(v['results'])) return 'mission.results';
  if (!isStringArray(v['prizePair']) || v['prizePair'].length > 2) return 'mission.prizePair';
  const state = v['state'];
  if (!(state === 'IN_PROGRESS' || state === 'COMPLETED' || state === 'CLAIMED'))
    return 'mission.state';
  if (!isIso(v['startedAt'])) return 'mission.startedAt';
  const current = v['current'];
  if (
    !isRecord(current) ||
    !isIntIn(current['wrongAttempts'], 0, 1e6) ||
    !isBool(current['hintUsed']) ||
    !isBool(current['solved'])
  ) {
    return 'mission.current';
  }
  const mission: Mission = {
    id: v['id'],
    theme: v['theme'],
    activity: v['activity'] as Activity,
    level: v['level'],
    seed: v['seed'],
    puzzles: v['puzzles'] as Mission['puzzles'],
    index: v['index'],
    results: v['results'] as Mission['results'],
    prizePair: [...v['prizePair']],
    state,
    startedAt: v['startedAt'],
    current: {
      wrongAttempts: current['wrongAttempts'],
      hintUsed: current['hintUsed'],
      solved: current['solved'],
    },
  };
  const claimed = v['claimed'];
  if (typeof claimed === 'string') mission.claimed = claimed;
  return mission;
}

/**
 * Validates an unknown value as a Save of the current version, checking structure and
 * the §11.4 invariants. Returns a fresh, normalised copy on success.
 */
export function validateSave(value: unknown): ValidationResult {
  if (!isRecord(value)) return fail('not an object');
  const version = value['version'];
  if (typeof version !== 'number' || !Number.isInteger(version)) return fail('version missing');
  if (version > SAVE_VERSION) {
    return { ok: false, reason: 'newer-version', detail: `version ${version} > ${SAVE_VERSION}` };
  }
  const migrated = migrate(value, version);
  if (typeof migrated === 'string') return fail(migrated);

  if (!isIso(migrated['createdAt'])) return fail('createdAt');
  if (!isIso(migrated['updatedAt'])) return fail('updatedAt');
  const settings = validateSettings(migrated['settings']);
  if (typeof settings === 'string') return fail(settings);
  const heroine = migrated['heroine'];
  if (
    !isRecord(heroine) ||
    typeof heroine['hair'] !== 'string' ||
    typeof heroine['outfit'] !== 'string' ||
    typeof heroine['shoes'] !== 'string' ||
    !(heroine['extra'] === null || typeof heroine['extra'] === 'string')
  ) {
    return fail('heroine');
  }
  if (!isStringArray(migrated['wardrobe'])) return fail('wardrobe');
  const themes = migrated['themes'];
  if (!isRecord(themes)) return fail('themes');
  const space = validateThemeState(themes['space'], 'themes.space');
  if (typeof space === 'string') return fail(space);
  const sweet = validateThemeState(themes['sweet'], 'themes.sweet');
  if (typeof sweet === 'string') return fail(sweet);
  const progress = validateProgress(migrated['progress']);
  if (typeof progress === 'string') return fail(progress);
  const mission = validateMission(migrated['mission']);
  if (typeof mission === 'string') return fail(mission);
  // Additive M3 field: absent in saves written before it existed.
  const newItems = migrated['newItems'] === undefined ? [] : migrated['newItems'];
  if (!isStringArray(newItems)) return fail('newItems');

  const save: Save = {
    version: SAVE_VERSION,
    createdAt: migrated['createdAt'],
    updatedAt: migrated['updatedAt'],
    settings,
    heroine: {
      hair: heroine['hair'],
      outfit: heroine['outfit'],
      shoes: heroine['shoes'],
      extra: heroine['extra'] as string | null,
    },
    wardrobe: [...migrated['wardrobe']],
    themes: { space, sweet },
    progress,
    mission,
    newItems: [...newItems],
  };
  const problems = checkInvariants(save);
  if (problems.length > 0) return fail(`invariants: ${problems.join('; ')}`);
  return { ok: true, save };
}

/** Migrations run in order by version; v1 has none (SPEC §11.3). */
export function migrate(
  value: Record<string, unknown>,
  fromVersion: number,
): Record<string, unknown> | string {
  if (fromVersion < 1) return `unsupported version ${fromVersion}`;
  return value;
}

// ---------------------------------------------------------------------------
// Load

export interface SaveNotice {
  kind: 'damaged' | 'newer-version';
  at: string;
}

export type LoadStatus =
  'fresh' | 'loaded' | 'restored-backup' | 'fresh-after-damage' | 'fresh-after-newer';

export interface LoadResult {
  save: Save;
  status: LoadStatus;
  notice: SaveNotice | null;
}

function parseJson(text: string | null): unknown | undefined {
  if (text === null) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function tryLoad(store: KeyValueStore, key: string): ValidationResult | undefined {
  const raw = store.getItem(key);
  if (raw === null) return undefined;
  const parsed = parseJson(raw);
  if (parsed === undefined) return fail('unparsable JSON');
  return validateSave(parsed);
}

/**
 * Loads the save following SPEC §11.3: main, then backup, then fresh.
 * An unreadable or newer main save is copied to the quarantine key, never deleted.
 */
export function loadSave(store: KeyValueStore, now: Date = new Date()): LoadResult {
  const main = tryLoad(store, SAVE_KEY);
  if (main === undefined) {
    return { save: createFreshSave(now), status: 'fresh', notice: readNotice(store) };
  }
  if (main.ok) {
    return { save: main.save, status: 'loaded', notice: readNotice(store) };
  }
  // Main exists but is unusable: keep it for later inspection.
  const rawMain = store.getItem(SAVE_KEY);
  if (rawMain !== null) store.setItem(QUARANTINE_KEY, rawMain);

  const kind: SaveNotice['kind'] = main.reason === 'newer-version' ? 'newer-version' : 'damaged';
  const notice: SaveNotice = { kind, at: now.toISOString() };
  writeNotice(store, notice);

  if (main.reason !== 'newer-version') {
    const backup = tryLoad(store, BACKUP_KEY);
    if (backup?.ok) {
      store.setItem(SAVE_KEY, JSON.stringify(backup.save));
      return { save: backup.save, status: 'restored-backup', notice };
    }
  }
  const fresh = createFreshSave(now);
  store.removeItem(SAVE_KEY);
  store.removeItem(BACKUP_KEY);
  return {
    save: fresh,
    status: main.reason === 'newer-version' ? 'fresh-after-newer' : 'fresh-after-damage',
    notice,
  };
}

export function readNotice(store: KeyValueStore): SaveNotice | null {
  const parsed = parseJson(store.getItem(NOTICE_KEY));
  if (!isRecord(parsed)) return null;
  if (!(parsed['kind'] === 'damaged' || parsed['kind'] === 'newer-version')) return null;
  if (!isIso(parsed['at'])) return null;
  return { kind: parsed['kind'], at: parsed['at'] };
}

export function writeNotice(store: KeyValueStore, notice: SaveNotice | null): void {
  if (notice === null) store.removeItem(NOTICE_KEY);
  else store.setItem(NOTICE_KEY, JSON.stringify(notice));
}

// ---------------------------------------------------------------------------
// Store

/**
 * Writes the save. The previously written main save becomes the backup, so the backup is
 * always the last good save this app wrote. Returns false when the storage refused the write.
 */
export function storeSave(store: KeyValueStore, save: Save, now: Date = new Date()): boolean {
  const text = JSON.stringify({ ...save, updatedAt: now.toISOString() });
  try {
    const previous = store.getItem(SAVE_KEY);
    if (previous !== null && previous !== text && parseJson(previous) !== undefined) {
      store.setItem(BACKUP_KEY, previous);
    }
    store.setItem(SAVE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

/** Removes the current save and backup (SPEC §11.3 Reset). The quarantine copy is kept. */
export function resetSave(store: KeyValueStore): void {
  store.removeItem(SAVE_KEY);
  store.removeItem(BACKUP_KEY);
  store.removeItem(NOTICE_KEY);
}

// ---------------------------------------------------------------------------
// Export / import

export function exportSave(save: Save): string {
  return JSON.stringify(save, null, 2);
}

export interface ImportSummary {
  collected: Record<Theme, number>;
  stars: Record<Theme, number>;
  language: Language | null;
  updatedAt: string;
}

export type ImportResult =
  | { ok: true; save: Save; summary: ImportSummary }
  | { ok: false; reason: 'newer-version' | 'invalid'; detail: string };

/** Parses and validates an exported file; a higher version is refused (AT-32). */
export function importSave(text: string): ImportResult {
  const parsed = parseJson(text);
  if (parsed === undefined) return { ok: false, reason: 'invalid', detail: 'unparsable JSON' };
  const result = validateSave(parsed);
  if (!result.ok) return result;
  const save = result.save;
  return {
    ok: true,
    save,
    summary: {
      collected: { space: collected(save, 'space'), sweet: collected(save, 'sweet') },
      stars: { space: save.themes.space.stars, sweet: save.themes.sweet.stars },
      language: save.settings.language,
      updatedAt: save.updatedAt,
    },
  };
}

function collected(save: Save, theme: Theme): number {
  // Local import to avoid a cycle at module-evaluation time in some bundlers.
  const ownedIds = new Set(save.themes[theme].owned.concat(save.wardrobe));
  let n = 0;
  for (const id of ownedIds) {
    const prefix = `${theme}.`;
    if (id.startsWith(prefix) && !isStarterId(id)) n++;
  }
  return n;
}

function isStarterId(id: string): boolean {
  return starterDecorations('space')
    .concat(starterDecorations('sweet'))
    .some((i) => i.id === id);
}
