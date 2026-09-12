import { expect, test } from '@playwright/test';
import { readSave, seedSave, seededSave, solveWithMouse, waitForMission } from './helpers.ts';

/**
 * Progression suggestion (SPEC §7.1): after the second clean mission at a level the room
 * shows "Ready for a bigger challenge?" once; "Try Quarter hours" raises the reading level,
 * "Not yet" keeps it. The save is seeded with one clean Rocket launch already behind it.
 */
test('progression suggestion after two clean missions: Not yet, then Try Quarter hours', async ({
  page,
}) => {
  const save = seededSave();
  const clean = {
    theme: 'space' as const,
    activity: 'A' as const,
    level: 2,
    hints: 0,
    wrong: 0,
    seconds: 40,
    endedAt: '2026-09-12T09:00:00.000Z',
    claimed: 'space.moonBed',
  };
  save.progress.history = [clean];
  save.progress.suggestion.A = { streak: 1, declinedAt: null };
  save.themes.space.owned.push('space.moonBed');
  await seedSave(page, save);
  await page.goto('/');
  await page.getByTestId('room-card-space').click();
  await expect(page.getByTestId('suggest-dialog')).toHaveCount(0);

  const playClean = async () => {
    await page.getByTestId('mission-button').click();
    await page.getByTestId('start-A').click();
    for (let i = 0; i < 4; i++) await solveWithMouse(page, await waitForMission(page, i));
    await expect(page.getByTestId('s5')).toBeVisible();
    await page.getByTestId('keep-button').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  };

  // Second clean mission: the card shows; "Not yet" keeps R2 and suppresses it.
  await playClean();
  const dialog = page.getByTestId('suggest-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Ready for a bigger challenge?');
  await expect(page.getByTestId('suggest-try')).toHaveText('Try Quarter hours');
  await expect(page.getByTestId('suggest-try')).toBeFocused();
  await page.getByTestId('suggest-notyet').click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await readSave(page)).progress.history.length).toBe(2);
  expect((await readSave(page)).settings.readingLevel).toBe(2);

  // Third clean mission: still suppressed (two more are needed).
  await playClean();
  await expect(dialog).toHaveCount(0);

  // Fourth: the card returns; "Try Quarter hours" sets R3 without touching the room.
  await playClean();
  await expect(dialog).toBeVisible();
  await page.getByTestId('suggest-try').click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await readSave(page)).settings.readingLevel).toBe(3);
  await page.getByTestId('mission-button').click();
  await expect(page.getByTestId('level-r3')).toHaveAttribute('aria-pressed', 'true');
});
