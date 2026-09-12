import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the smoke flows (SPEC §17.8). The tests run against the production
 * build, where the `?seed` aid is stripped, so they read the autosaved mission record from
 * localStorage (SAVE_KEY) to learn the generated puzzles and then act on the real screens.
 */

export const SAVE_KEY = 'mcr.save.v1';

export interface StoredPuzzle {
  kind: 'READ' | 'MATCH' | 'SET' | 'ELAPSED';
  target?: number;
  choices?: number[];
  start?: number;
  end?: number;
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
  mission: StoredMission | null;
  themes: Record<'space' | 'sweet', { owned: string[]; slots: Record<string, string> }>;
  heroine: { outfit: string; shoes: string; extra: string | null };
  wardrobe: string[];
  settings: { readingLevel: number; elapsedLevel: number };
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

/** Correct answer value of a puzzle as the option's `data-value`. */
export function correctValue(p: StoredPuzzle): number {
  if (p.kind === 'ELAPSED') return p.end! - p.start!;
  return p.target!;
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
  } else {
    await page.locator(`[data-testid="answer"][data-value="${correctValue(p)}"]`).click();
  }
  await expect(page.getByTestId('feedback')).toContainText(/Yes!|That's it!|Great!/);
  await expect(page.getByTestId('next-button')).toBeFocused();
  await page.getByTestId('next-button').click();
  return p.kind;
}
