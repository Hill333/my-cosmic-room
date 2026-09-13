import { expect, type Page } from '@playwright/test';
import {
  correctValue as coreCorrectValue,
  isCorrectAnswer,
  missionReducer,
  PUZZLES_PER_MISSION,
} from '../src/core/mission.ts';
import { createFreshSave } from '../src/core/save.ts';
import type { Activity, PuzzleKind, Save, Theme } from '../src/core/types.ts';

/**
 * Shared helpers for the smoke flows (SPEC §17.8). The tests run against the production
 * build, where the `?seed` aid is stripped, so they read the autosaved mission record from
 * localStorage (SAVE_KEY) to learn the generated puzzles and then act on the real screens.
 */

export const SAVE_KEY = 'mcr.save.v1';

export interface StoredPuzzle {
  kind: PuzzleKind;
  target?: number;
  choices?: number[];
  start?: number;
  end?: number;
  gap?: number;
}

export interface StoredMission {
  theme: 'space' | 'sweet';
  activity: 'A' | 'B';
  level: number;
  puzzles: StoredPuzzle[];
  index: number;
  results: unknown[];
  state: 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED';
  prizePair: string[];
  current: { wrongAttempts: number; hintUsed: boolean; solved: boolean };
}

export interface StoredSave {
  version: number;
  mission: StoredMission | null;
  themes: Record<
    'space' | 'sweet',
    { owned: string[]; slots: Record<string, string>; lampOn: boolean; stars: number }
  >;
  heroine: { outfit: string; shoes: string; extra: string | null };
  wardrobe: string[];
  settings: {
    language: string | null;
    readingLevel: number;
    elapsedLevel: number;
    levelsLocked: boolean;
    hour24Reading: boolean;
    sound: boolean;
  };
  progress: { history: { activity: string; level: number }[] };
  newItems?: string[];
  updatedAt: string | null;
}

/**
 * Writes a valid v1 save into localStorage before the app loads, so a test can start from any
 * inventory state (SPEC §11.3: the save is plain JSON under SAVE_KEY). Build it with
 * `seededSave()` and edit the fields; the app validates it on load, so an inconsistent save
 * would silently start fresh (the language dialog appearing is the tell).
 */
export async function seedSave(page: Page, save: Save): Promise<void> {
  // Init scripts run on every navigation, so the seed is written once per browser session and
  // reloads keep whatever the app saved since.
  await page.addInitScript(
    ([key, json]) => {
      if (sessionStorage.getItem('mcr.e2e.seeded') === '1') return;
      sessionStorage.setItem('mcr.e2e.seeded', '1');
      localStorage.setItem(key, json);
    },
    [SAVE_KEY, JSON.stringify(save)] as const,
  );
}

/** A fresh save with the language already chosen, ready for `seedSave`. */
export function seededSave(language: 'en' | 'tr' | 'nl' = 'en'): Save {
  const save = createFreshSave();
  save.settings.language = language;
  return save;
}

/**
 * Starts a mission in the save through the real reducer (Node side), so a test can open the
 * app straight on S3 / S4 (AT-30 routing) with puzzles it already knows. The seed fixes them.
 */
export function startMission(save: Save, theme: Theme, activity: Activity, seed: number): Save {
  return missionReducer(save, {
    type: 'mission/start',
    theme,
    activity,
    seed,
    now: '2026-09-12T10:00:00.000Z',
  });
}

/** Answers every puzzle of the started mission correctly, so the app opens on S5 (COMPLETED). */
export function completeMission(save: Save): Save {
  let next = save;
  for (let i = 0; i < PUZZLES_PER_MISSION; i++) {
    const m = next.mission!;
    const p = m.puzzles[m.index]!;
    const choice = coreCorrectValue(p);
    if (!isCorrectAnswer(p, choice)) throw new Error('completeMission: wrong answer');
    next = missionReducer(next, { type: 'mission/answer', choice, seconds: 5 });
    next = missionReducer(next, { type: 'mission/next' });
  }
  return next;
}

/**
 * Seed whose Activity A mission starts with the wanted puzzle kind (never SET or DIGITS,
 * which are never first) and, when given, contains the wanted extra kind (D14).
 */
export function seedForFirstKind(
  save: Save,
  theme: Theme,
  kind: 'READ' | 'MATCH' | 'WORDS' | 'LATER',
  extra?: 'WORDS' | 'LATER' | 'DIGITS',
): number {
  for (let seed = 1; seed < 2000; seed++) {
    const m = startMission(save, theme, 'A', seed).mission!;
    const kinds = m.puzzles.map((p) => p.kind);
    if (kinds[0] === kind && (extra === undefined || kinds.includes(extra))) return seed;
  }
  throw new Error(`No seed found for ${kind}${extra ? ` with ${extra}` : ''}`);
}

/** Seed whose Activity A mission contains every extra kind wanted, in any order. */
export function seedWithKinds(
  save: Save,
  theme: Theme,
  activity: Activity,
  kinds: PuzzleKind[],
): number {
  for (let seed = 1; seed < 2000; seed++) {
    const m = startMission(save, theme, activity, seed).mission!;
    const present = m.puzzles.map((p) => p.kind);
    if (kinds.every((k) => present.includes(k))) return seed;
  }
  throw new Error(`No seed found with ${kinds.join(', ')}`);
}

/** Grants earnable Space items so the next pair is the one a test needs (SPEC §10.2). */
export function grantSpace(save: Save, decorations: string[], garments: string[]): Save {
  save.themes.space.owned.push(...decorations);
  save.wardrobe.push(...garments);
  save.newItems.push(...decorations, ...garments);
  return save;
}

/** Grants earnable Sweet items (SPEC §10.2 pool order: Sweet Sleepover, then Sunny Garden). */
export function grantSweet(save: Save, decorations: string[], garments: string[]): Save {
  save.themes.sweet.owned.push(...decorations);
  save.wardrobe.push(...garments);
  save.newItems.push(...decorations, ...garments);
  return save;
}

/** Everything in the save that a level change must leave alone (AT-27): room, inventory, stars. */
export function roomAndInventory(save: StoredSave) {
  return { themes: save.themes, heroine: save.heroine, wardrobe: save.wardrobe };
}

/**
 * Opens the parent corner with the mouse: the gear is held for longer than its 1.5 s gate
 * (SPEC §3.9). A plain click never opens it.
 */
export async function holdGear(page: Page): Promise<void> {
  await page.getByTestId('parent-gear').click({ delay: 1800 });
  await expect(page.getByTestId('s6')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
}

export async function readSave(page: Page): Promise<StoredSave> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  if (!raw) throw new Error('No save in localStorage');
  return JSON.parse(raw) as StoredSave;
}

/** Waits for the autosave (250 ms debounce) to hold the mission at `index`, then returns it. */
export async function waitForMission(page: Page, index: number): Promise<StoredMission> {
  await page.waitForFunction(
    ([key, i]) => {
      const raw = localStorage.getItem(key as string);
      if (!raw) return false;
      const save = JSON.parse(raw) as { mission: StoredMission | null };
      return save.mission !== null && save.mission.index === i;
    },
    [SAVE_KEY, index] as const,
  );
  const save = await readSave(page);
  return save.mission!;
}

/** Same as `waitForMission` but for an ended mission (COMPLETED or CLAIMED). */
export async function waitForCompletedMission(page: Page): Promise<StoredMission> {
  await page.waitForFunction((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const save = JSON.parse(raw) as { mission: StoredMission | null };
    return save.mission !== null && save.mission.state !== 'IN_PROGRESS';
  }, SAVE_KEY);
  return (await readSave(page)).mission!;
}

/** Minute step of a reading level (SPEC §7.1). */
export function stepOf(level: number): number {
  return [60, 30, 15, 5][level - 1]!;
}

/** Start position of the SET clock (SPEC §6.4): 12:00, or 6:00 near 12:00 on the face. */
export function initialSetTime(target: number): number {
  const face = (Math.floor(target / 60) % 12) * 60 + (target % 60);
  const distance = Math.min(face, 720 - face);
  return distance <= 60 ? 6 * 60 : 12 * 60;
}

/** Key presses that move the SET clock from its start position to the target face. */
export function setClockKeys(target: number, level: number): { hours: number; steps: number } {
  const from = initialSetTime(target);
  const hours = (((Math.floor(target / 60) - Math.floor(from / 60)) % 12) + 12) % 12;
  const steps = (target % 60) / stepOf(level);
  return { hours, steps };
}

/** Correct answer value of a puzzle as the option's `data-value` (or the time to build/set). */
export function correctValue(p: StoredPuzzle): number {
  if (p.kind === 'ELAPSED') return p.end! - p.start!;
  if (p.kind === 'LATER' || p.kind === 'ARRIVE') return p.end!;
  return p.target!;
}

/** The time a puzzle shows the child: the target, a LATER puzzle's start, or the arrival. */
export function shownTime(p: StoredPuzzle): number {
  if (p.kind === 'LATER') return p.start!;
  if (p.kind === 'ELAPSED' || p.kind === 'ARRIVE') return p.end!;
  return p.target!;
}

/** A wrong choice of a choice puzzle (every kind but SET and DIGITS). */
export function wrongValue(p: StoredPuzzle): number {
  const right = correctValue(p);
  return p.choices!.find((c) => c !== right)!;
}

/**
 * Button presses that build the target on the DIGITS display from its start position:
 * hours cycle 1–12 (12-hour) or 06–21 (24-hour), minutes cycle the level's steps.
 */
export function digitsClicks(
  target: number,
  level: number,
  mode: '12h' | '24h' = '12h',
): { hours: number; minutes: number } {
  const from = initialSetTime(target);
  const hourOf = (t: number) => Math.floor(t / 60);
  const span = mode === '24h' ? 16 : 12;
  const base = mode === '24h' ? 6 : 0;
  const norm = (h: number) => (((h - base) % span) + span) % span;
  const hours = (norm(hourOf(target)) - norm(hourOf(from)) + span) % span;
  const minutes = (target % 60) / stepOf(level);
  return { hours, minutes };
}

/** First launch: choose English and open the Space room. */
export async function firstLaunchToSpace(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('lang-en').click();
  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
}

/** Solves the current puzzle with the mouse, then presses Next. Returns the puzzle kind. */
export async function solveWithMouse(page: Page, m: StoredMission): Promise<string> {
  const p = m.puzzles[m.index]!;
  const puzzle = page.getByTestId('puzzle');
  await expect(puzzle).toHaveAttribute('data-kind', p.kind);
  if (p.kind === 'SET') {
    const { hours, steps } = setClockKeys(p.target!, m.level);
    for (let i = 0; i < hours; i++) await page.getByTestId('set-plus-hour').click();
    for (let i = 0; i < steps; i++) await page.getByTestId('set-plus-step').click();
    await page.getByTestId('set-check').click();
  } else if (p.kind === 'DIGITS') {
    const { hours, minutes } = digitsClicks(p.target!, m.level);
    for (let i = 0; i < hours; i++) await page.getByTestId('digits-hour-up').click();
    for (let i = 0; i < minutes; i++) await page.getByTestId('digits-minute-up').click();
    await page.getByTestId('digits-check').click();
  } else {
    await page.locator(`[data-testid="answer"][data-value="${correctValue(p)}"]`).click();
  }
  await expect(page.getByTestId('feedback')).toContainText(/Yes!|That's it!|Great!/);
  await expect(page.getByTestId('next-button')).toBeFocused();
  await page.getByTestId('next-button').click();
  return p.kind;
}
