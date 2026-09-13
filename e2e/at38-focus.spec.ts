import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  completeMission,
  grantSpace,
  holdGear,
  seedForFirstKind,
  seedSave,
  seededSave,
  solveWithMouse,
  startMission,
  waitForMission,
} from './helpers.ts';

/**
 * AT-38 (SPEC §17.7, §13.1): walking every screen with Tab, every control that receives focus
 * shows the focus ring (a solid outline of at least 4 px); Escape closes the side panels and
 * every dialog (leave, import, suggestion) and S6 itself, and focus returns to the opener
 * (or, for a screen change, lands on the new heading).
 */

const PROBE = readFileSync(new URL('./browser/focus.js', import.meta.url), 'utf8');

interface FocusInfo {
  id: string;
  text?: string;
  focusVisible: boolean;
  outlineStyle?: string;
  outlineWidth?: string;
  boxShadow?: string;
  visible?: boolean;
  inDialog?: boolean;
}

async function focused(page: Page): Promise<FocusInfo> {
  return (await page.evaluate(PROBE)) as FocusInfo;
}

/**
 * Presses Tab round the whole cycle (through the document end and back to the first control,
 * or round a dialog's trap) until a control repeats, asserting the ring on every stop. The
 * walk can start anywhere, so it covers controls before the current focus too. Returns the
 * ids visited in order.
 */
async function walk(page: Page, screen: string, limit = 120): Promise<string[]> {
  const visited: string[] = [];
  const keys = new Set<string>();
  let leftDocument = false;
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const info = await focused(page);
    if (info.id === 'body') {
      // The end of the document: one more Tab wraps to the first control.
      if (leftDocument) break;
      leftDocument = true;
      continue;
    }
    const key = `${info.id}|${info.text}`;
    if (keys.has(key)) break;
    keys.add(key);
    visited.push(info.id);
    expect(info.visible, `${screen}: ${info.id} focused while invisible`).toBe(true);
    expect(info.focusVisible, `${screen}: ${info.id} focused without :focus-visible`).toBe(true);
    expect(info.outlineStyle, `${screen}: ${info.id} has no outline`).toBe('solid');
    expect(
      parseFloat(info.outlineWidth ?? '0'),
      `${screen}: ${info.id} outline thinner than 4 px`,
    ).toBeGreaterThanOrEqual(4);
    expect(info.boxShadow, `${screen}: ${info.id} has no halo`).not.toBe('none');
  }
  return visited;
}

test('AT-38: S0, S1 with both panels, S2 and S6 (walk, Escape, focus return)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const lang = await walk(page, 'S0 language dialog');
  expect(lang).toEqual(['lang-en', 'lang-tr', 'lang-nl']);
  await page.getByTestId('lang-en').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('room-card-space')).toBeFocused();
  const s0 = await walk(page, 'S0');
  expect(s0).toEqual(
    expect.arrayContaining([
      'room-card-space',
      'room-card-sweet',
      'switch-en',
      'switch-nl',
      'sound-toggle',
      'parent-gear',
    ]),
  );

  await page.getByTestId('room-card-space').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const s1 = await walk(page, 'S1');
  expect(s1).toEqual(
    expect.arrayContaining([
      'rooms-button',
      'slot-BED',
      'slot-HANGING',
      'room-heroine',
      'room-companion',
      'entry-object',
      'decorate-button',
      'dressup-button',
      'mission-button',
      'sound-toggle',
      'parent-gear',
    ]),
  );

  // Decorate panel: focus moves in, Escape closes it and returns focus to its button.
  await page.getByTestId('decorate-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('decorate-panel')).toBeVisible();
  await expect(page.locator('.tile').first()).toBeFocused();
  const decorate = await walk(page, 'S1 decorate panel');
  expect(decorate).toEqual(expect.arrayContaining(['panel-close']));
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('decorate-panel')).toHaveCount(0);
  await expect(page.getByTestId('decorate-button')).toBeFocused();

  // Dress-up panel: the same through the close button.
  await page.keyboard.press('w');
  await expect(page.getByTestId('dressup-panel')).toBeVisible();
  await expect(page.getByTestId('tab-outfit')).toBeFocused();
  const dressup = await walk(page, 'S1 dress-up panel');
  expect(dressup).toEqual(expect.arrayContaining(['tab-outfit', 'panel-close']));
  await page.getByTestId('panel-close').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('dressup-panel')).toHaveCount(0);
  await expect(page.getByTestId('dressup-button')).toBeFocused();
  await page.keyboard.press('Escape'); // nothing open: no effect
  await expect(page.getByTestId('dressup-button')).toBeFocused();

  // S2.
  await page.keyboard.press('m');
  await expect(page.getByTestId('s2')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const s2 = await walk(page, 'S2');
  expect(s2).toEqual(
    expect.arrayContaining(['back-button', 'level-r1', 'start-A', 'level-e3', 'start-B']),
  );
  await page.getByTestId('back-button').focus();
  await page.keyboard.press('Enter');

  // S6: every control, the import dialog (Escape returns to the Import button), Escape closes
  // the corner and focus lands on the room heading.
  await holdGear(page);
  const s6 = await walk(page, 'S6');
  expect(s6).toEqual(
    expect.arrayContaining([
      's6-done',
      's6-lang-tr',
      's6-level-r1',
      's6-level-e3',
      's6-lock',
      's6-hour24',
      's6-sound',
      's6-motion-full',
      's6-export',
      's6-import',
      's6-reset',
    ]),
  );
  await page.getByTestId('s6-import').focus();
  await page.getByTestId('s6-import-file').setInputFiles({
    name: 'tick-tock-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(seededSave('nl'))),
  });
  await expect(page.getByTestId('import-dialog')).toBeVisible();
  await expect(page.getByTestId('import-cancel')).toBeFocused();
  const importDialog = await walk(page, 'S6 import dialog');
  expect(importDialog).toEqual(['import-confirm', 'import-cancel']);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('import-dialog')).toHaveCount(0);
  await expect(page.getByTestId('s6-import')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('s6')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('AT-38: S3 with the SET clock and the leave dialog, S4, S5', async ({ page }) => {
  const base = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  const seed = seedForFirstKind(base, 'space', 'READ');
  await seedSave(page, startMission(base, 'space', 'A', seed));
  await page.goto('/');
  await expect(page.getByTestId('s3')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const s3 = await walk(page, 'S3 READ');
  expect(s3).toEqual(
    expect.arrayContaining(['leave-button', 'sound-toggle', 'answer', 'hint-button']),
  );
  expect(s3.filter((id) => id === 'answer')).toHaveLength(3);

  await page.getByTestId('leave-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('leave-dialog')).toBeVisible();
  await expect(page.getByTestId('leave-cancel')).toBeFocused();
  const dialog = await walk(page, 'S3 leave dialog');
  expect(dialog).toEqual(['leave-confirm', 'leave-cancel']);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('leave-dialog')).toHaveCount(0);
  await expect(page.getByTestId('leave-button')).toBeFocused();

  // Solve up to the SET puzzle so the clock face is walked too.
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    if (m.puzzles[i]!.kind === 'SET') {
      const set = await walk(page, 'S3 SET');
      expect(set).toEqual(
        expect.arrayContaining(['set-clock-face', 'set-plus-hour', 'set-check', 'hint-button']),
      );
    }
    await solveWithMouse(page, m);
  }

  // S5.
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const s5 = await walk(page, 'S5');
  expect(s5.filter((id) => id.startsWith('prize-tile-'))).toHaveLength(2);
  expect(s5).toEqual(expect.arrayContaining(['apply-button', 'keep-button']));
  await page.getByTestId('keep-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  // S4 (the board focuses its heading on mount; wait for that before moving focus).
  await page.keyboard.press('m');
  await expect(page.getByTestId('s2')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByTestId('start-B').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('s4')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  const s4 = await walk(page, 'S4');
  expect(s4).toEqual(
    expect.arrayContaining(['leave-button', 'answer', 'show-jumps', 'hint-button']),
  );
  await page.getByTestId('show-jumps').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('jump-timeline')).toBeVisible();
  await expect(page.getByTestId('show-jumps')).toBeFocused();
});

test('AT-38: the suggestion dialog traps focus, Escape means "Not yet" and focuses the heading', async ({
  page,
}) => {
  const save = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  const summary = {
    theme: 'space' as const,
    activity: 'A' as const,
    level: 2,
    hints: 0,
    wrong: 0,
    seconds: 40,
    endedAt: '2026-09-12T09:00:00.000Z',
    claimed: null,
  };
  save.progress.history.push(summary, { ...summary, endedAt: '2026-09-12T09:30:00.000Z' });
  save.progress.suggestion.A = { streak: 2, declinedAt: null };
  await seedSave(page, completeMission(startMission(save, 'space', 'A', 5)));
  await page.goto('/');
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByTestId('keep-button').focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('suggest-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('suggest-try')).toBeFocused();
  const walked = await walk(page, 'S1 suggestion dialog');
  expect(walked).toEqual(['suggest-notyet', 'suggest-try']);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
