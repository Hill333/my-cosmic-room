import { expect, test } from '@playwright/test';
import {
  grantSpace,
  holdGear,
  readSave,
  roomAndInventory,
  seedSave,
  seededSave,
  waitForMission,
} from './helpers.ts';

/**
 * Smoke flow 5 (SPEC §17.8) with AT-27 and AT-29 (SPEC §17.5): the parent corner behind the
 * hold gate, lock levels, toggle 24-hour, export, import, reset. Level changes in S6 change
 * the generated precision and leave room, inventory and stars unchanged; locked levels show
 * disabled chips with a lock icon on S2.
 */
test('flow 5: hold the gear, lock levels, 24-hour clocks, export and import, reset', async ({
  page,
}) => {
  const save = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  save.themes.space.slots.BED = 'space.moonBed';
  save.heroine.outfit = 'space.cloudPyjamas';
  save.newItems = [];
  save.themes.sweet.stars = 2;
  await seedSave(page, save);
  await page.goto('/');
  await expect(page.getByTestId('room-card-space')).toBeFocused();

  // A plain click on the gear does nothing; holding it for 1.5 s opens S6 (SPEC §3.9).
  await page.getByTestId('parent-gear').click();
  await expect(page.getByTestId('s6')).toHaveCount(0);
  await holdGear(page);
  await expect(page.getByTestId('s6-version')).toContainText(/Version \d+\.\d+\.\d+/);
  await expect(page.getByTestId('s6')).toContainText('Nothing is collected or sent anywhere.');
  await expect(page.getByTestId('s6-history')).toHaveCount(0);

  // Levels by the parent (AT-27): R4 and E2, then the lock.
  await expect(page.getByTestId('s6-level-r2')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('s6-level-r4').click();
  await expect(page.getByTestId('s6-level-r4')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('s6-level-e2').click();
  await expect(page.getByTestId('s6-level-e2')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('s6-lock').click();
  await expect(page.getByTestId('s6-lock')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('s6-lock')).toContainText('On');

  // 24-hour digital clocks in reading puzzles (D11).
  await page.getByTestId('s6-hour24').click();
  await expect(page.getByTestId('s6-hour24')).toHaveAttribute('aria-checked', 'true');

  // Export: the download is the current save as JSON (AT-32 end to end).
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('s6-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('my-cosmic-room-save.json');
  const exportedPath = await download.path();
  const { readFileSync } = await import('node:fs');
  const exported = JSON.parse(readFileSync(exportedPath, 'utf8')) as {
    version: number;
    settings: { readingLevel: number; elapsedLevel: number; levelsLocked: boolean };
    themes: { space: { slots: Record<string, string> }; sweet: { stars: number } };
  };
  expect(exported.version).toBe(1);
  expect(exported.settings).toMatchObject({ readingLevel: 4, elapsedLevel: 2, levelsLocked: true });
  expect(exported.themes.space.slots['BED']).toBe('space.moonBed');
  await expect(page.getByTestId('s6-status')).toHaveText('Save file downloaded.');

  // Import: a broken file is refused; an edited export shows its summary and replaces the
  // save after confirming; the previous save becomes the backup (SPEC §3.9, §11.3).
  await page.getByTestId('s6-import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version": 1, "nonsense": true}'),
  });
  await expect(page.getByTestId('s6-status')).toHaveText('That file is not a My Cosmic Room save.');
  await page.getByTestId('s6-import-file').setInputFiles({
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...exported, version: 99 })),
  });
  await expect(page.getByTestId('s6-status')).toHaveText(
    'That save comes from a newer version of the game.',
  );
  const edited = {
    ...exported,
    themes: { ...exported.themes, sweet: { ...exported.themes.sweet, stars: 7 } },
  };
  await page.getByTestId('s6-import-file').setInputFiles({
    name: 'my-cosmic-room-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(edited)),
  });
  const dialog = page.getByTestId('import-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('This file has 2 Space and 0 Sweet prizes, 7 stars');
  await page.getByTestId('import-cancel').click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await readSave(page)).themes.sweet.stars).toBe(2);
  await page.getByTestId('s6-import-file').setInputFiles({
    name: 'my-cosmic-room-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(edited)),
  });
  await page.getByTestId('import-confirm').click();
  await expect(page.getByTestId('s6-status')).toHaveText('Save imported.');
  await expect.poll(async () => (await readSave(page)).themes.sweet.stars).toBe(7);
  const backup = await page.evaluate(() => localStorage.getItem('mcr.save.backup'));
  expect(JSON.parse(backup!).themes.sweet.stars).toBe(2);

  // Done returns to the screen that opened the corner.
  await page.getByTestId('s6-done').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My Cosmic Room');

  // AT-29: with levels locked, the S2 chips are disabled and a lock icon shows.
  await page.getByTestId('room-card-space').click();
  await page.getByTestId('mission-button').click();
  for (const id of [
    'level-r1',
    'level-r2',
    'level-r3',
    'level-r4',
    'level-e1',
    'level-e2',
    'level-e3',
  ]) {
    await expect(page.getByTestId(id)).toBeDisabled();
  }
  await expect(page.getByTestId('level-r4')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('level-e2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('levels-locked')).toHaveCount(2);
  await expect(page.getByTestId('levels-locked').first()).toContainText(
    'Levels are locked by a grown-up',
  );
  await expect(page.getByTestId('levels-locked').first()).toContainText('🔒');

  // AT-27: a mission at R4 in 24-hour mode; every target is a five-minute time between
  // 06:00 and 21:59; the question shows a 24-hour digital time; leaving changes nothing.
  const before = roomAndInventory(await readSave(page));
  await page.getByTestId('start-A').click();
  const m = await waitForMission(page, 0);
  expect(m.level).toBe(4);
  for (const p of m.puzzles) {
    expect(p.target! % 5).toBe(0);
    expect(p.target!).toBeGreaterThanOrEqual(6 * 60);
    expect(p.target!).toBeLessThan(22 * 60);
  }
  expect(m.puzzles.some((p) => p.target! % 15 !== 0)).toBe(true);
  await expect(page.getByTestId('s3')).toContainText(/(0[6-9]|1\d|2[01]):[0-5]\d/);
  await page.getByTestId('leave-button').click();
  await page.getByTestId('leave-confirm').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect.poll(async () => (await readSave(page)).mission).toBeNull();
  expect(roomAndInventory(await readSave(page))).toEqual(before);

  // Keyboard gate from S1: focus the gear and hold Enter for 1.5 s; a tap does nothing.
  await page.getByTestId('parent-gear').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('s6')).toHaveCount(0);
  await page.keyboard.down('Enter');
  await page.waitForTimeout(1800);
  await page.keyboard.up('Enter');
  await expect(page.getByTestId('s6')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Parent corner');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // The recent missions table lists nothing yet (the mission was left, not ended).
  await expect(page.getByTestId('s6-history')).toHaveCount(0);
  // Escape acts like Done and returns to the room that opened the corner.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');

  // Reset everything: hold the button for 2 s; back to the first-launch language choice with
  // a fresh save and no backup (SPEC §3.9, §11.3).
  await holdGear(page);
  await page.getByTestId('s6-reset').click({ delay: 600 });
  await expect(page.getByTestId('s6')).toBeVisible();
  await page.getByTestId('s6-reset').click({ delay: 2300 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('lang-en')).toBeVisible();
  await expect.poll(async () => (await readSave(page)).settings.language).toBeNull();
  const fresh = await readSave(page);
  expect(fresh.themes.space.owned).not.toContain('space.moonBed');
  expect(fresh.themes.sweet.stars).toBe(0);
  expect(fresh.settings.levelsLocked).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('mcr.save.backup'))).toBeNull();
});
