import { expect, test } from '@playwright/test';
import {
  grantSpace,
  readSave,
  seedSave,
  seededSave,
  solveWithMouse,
  waitForMission,
} from './helpers.ts';

/**
 * AT-23 (SPEC §17.5): choosing Rainbow rug with "Put it in my room" shows it in the RUG slot on
 * return; the plain rug is back in the panel; reload keeps it. The Rainbow rug is the fourth
 * Space decoration in pool order, so the save is seeded with the Moon Sleepover collection.
 */
test('AT-23: Rainbow rug applied, plain rug back in the panel, kept after reload', async ({
  page,
}) => {
  const save = grantSpace(
    seededSave(),
    ['space.moonBed', 'space.starLamp', 'space.astroBunny'],
    ['space.cloudPyjamas', 'space.bunnySlippers', 'space.starClip'],
  );
  await seedSave(page, save);
  await page.goto('/');
  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.getByTestId('collected')).toContainText('6 / 12 collected');

  await page.getByTestId('mission-button').click();
  await expect(page.getByTestId('prizes-waiting')).toContainText('Rainbow rug');
  await page.getByTestId('start-A').click();
  for (let i = 0; i < 4; i++) await solveWithMouse(page, await waitForMission(page, i));

  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByTestId('prize-tile-space.rainbowRug')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('apply-button')).toHaveText('Put it in my room');
  await page.getByTestId('apply-button').click();

  // Back in the room: the rug is in its slot with a sparkle; the counter counts it.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  const rug = page.locator('.s1').getByTestId('slot-RUG');
  await expect(rug).toHaveAttribute('data-item', 'space.rainbowRug');
  await expect(rug).toHaveClass(/sparkle/);
  await expect(page.getByTestId('collected')).toContainText('7 / 12 collected');

  // The panel lists the plain rug without "In room" and the rainbow rug with it, not "New".
  await page.getByTestId('decorate-button').click();
  await expect(page.getByTestId('decorate-panel')).toBeVisible();
  await expect(page.getByTestId('tile-space.plainRug')).not.toHaveAttribute('data-inroom');
  await expect(page.getByTestId('tile-space.rainbowRug')).toHaveAttribute('data-inroom', 'true');
  await expect(page.getByTestId('tile-space.rainbowRug')).not.toHaveAttribute('data-new');
  await expect(page.getByTestId('tile-space.rainbowRug')).toContainText('In room');

  // Reload keeps it.
  await expect
    .poll(async () => (await readSave(page)).themes.space.slots['RUG'])
    .toBe('space.rainbowRug');
  await page.reload();
  await page.getByTestId('room-card-space').click();
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'space.rainbowRug',
  );
  const after = await readSave(page);
  expect(after.mission).toBeNull();
  expect(after.themes.space.owned).toContain('space.rainbowRug');
  expect(after.themes.space.owned).toContain('space.plainRug');
  expect(after.newItems).not.toContain('space.rainbowRug');
});
