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
 * AT-24 (SPEC §17.5): "Wear it" on Space boots shows them on the heroine in both rooms. The
 * save is seeded so the Space pool starts at Space boots (all decorations and the earlier
 * garments owned), which also exercises the "first two items of the pool" branch of §10.2.
 */
test('AT-24: Space boots worn show on the heroine in Space and in Sweet', async ({ page }) => {
  const save = grantSpace(
    seededSave(),
    [
      'space.moonBed',
      'space.starLamp',
      'space.astroBunny',
      'space.rainbowRug',
      'space.planetMobile',
      'space.galaxyPoster',
    ],
    ['space.cloudPyjamas', 'space.bunnySlippers', 'space.starClip', 'space.spacesuit'],
  );
  await seedSave(page, save);
  await page.goto('/');
  await page.getByTestId('room-card-space').click();
  await page.getByTestId('mission-button').click();
  await expect(page.getByTestId('prizes-waiting')).toContainText('Space boots');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Rocket backpack');
  await page.getByTestId('start-B').click();
  for (let i = 0; i < 4; i++) await solveWithMouse(page, await waitForMission(page, i));

  await expect(page.getByTestId('s5')).toBeVisible();
  await page.getByTestId('prize-tile-space.spaceBoots').click();
  await expect(page.getByTestId('apply-button')).toHaveText('Wear it');
  await expect(page.getByTestId('room-preview').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'space.spaceBoots',
  );
  await page.getByTestId('apply-button').click();

  // Space room: worn, with the sparkle on the heroine.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  const heroine = page.locator('.s1').getByTestId('room-heroine');
  await expect(heroine.locator('.heroine')).toHaveAttribute('data-shoes', 'space.spaceBoots');
  await expect(heroine).toHaveClass(/sparkle/);
  await expect(page.getByTestId('collected')).toContainText('11 / 12 collected');

  // Sweet room: the same heroine, the same boots; the wardrobe shows the Space badge.
  await page.getByTestId('rooms-button').click();
  await page.getByTestId('room-card-sweet').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sweet Playroom');
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'space.spaceBoots',
  );
  await expect(page.getByTestId('collected')).toContainText('0 / 12 collected');
  await page.getByTestId('dressup-button').click();
  await page.getByTestId('tab-shoes').click();
  const boots = page.getByTestId('tile-space.spaceBoots');
  await expect(boots).toHaveAttribute('aria-pressed', 'true');
  await expect(boots.getByRole('img', { name: 'From the Space Playroom' })).toBeVisible();
  await expect(page.getByTestId('tile-shared.shoesSneakers')).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  const after = await readSave(page);
  expect(after.heroine.shoes).toBe('space.spaceBoots');
  expect(after.wardrobe).toContain('space.spaceBoots');
  expect(after.wardrobe).not.toContain('space.rocketBackpack');
});
