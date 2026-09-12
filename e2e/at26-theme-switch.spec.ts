import { expect, test } from '@playwright/test';
import { grantSpace, grantSweet, readSave, seedSave, seededSave } from './helpers.ts';

/**
 * AT-26 and smoke flow 4 (SPEC §17.5, §17.8, §5): decorate Space, switch to Sweet, decorate
 * Sweet, switch back: both layouts intact, counters separate, heroine outfit shared. Also
 * covers the Sweet reactions writing nothing but the lamp (SPEC §4.3) and the star chart
 * poster per theme (SPEC §10.5).
 */
test('AT-26 / flow 4: both rooms keep their layout, counters are separate, the wardrobe is shared', async ({
  page,
}) => {
  const save = grantSweet(
    grantSpace(seededSave(), ['space.rainbowRug'], ['space.spaceBoots']),
    ['sweet.pastelRug', 'sweet.heartLamp'],
    ['sweet.catSlippers'],
  );
  save.themes.sweet.stars = 3;
  await seedSave(page, save);
  await page.goto('/');

  // --- Space: place the Rainbow rug, wear the Space boots.
  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.getByTestId('collected')).toContainText('2 / 12 collected');
  await expect(page.locator('.s1').getByTestId('room-star-chart')).toHaveAttribute(
    'data-stars',
    '0',
  );
  await page.getByTestId('decorate-button').click();
  await page.getByTestId('tile-space.rainbowRug').click();
  await page.locator('.s1').getByTestId('slot-RUG').click();
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'space.rainbowRug',
  );
  await page.getByTestId('panel-close').click();
  await page.getByTestId('dressup-button').click();
  await page.getByTestId('tab-shoes').click();
  // The Sweet garment appears in the Space wardrobe with its heart badge (SPEC §4.4).
  await expect(page.getByTestId('tile-sweet.catSlippers')).toBeVisible();
  await expect(page.getByTestId('tile-sweet.catSlippers').getByRole('img')).toHaveAttribute(
    'aria-label',
    'From the Sweet Playroom',
  );
  await page.getByTestId('tile-space.spaceBoots').click();
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'space.spaceBoots',
  );
  await page.getByTestId('panel-close').click();

  // --- Rooms → Sweet: its own layout and counter; the boots came along.
  await page.getByTestId('rooms-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My Cosmic Room');
  await page.getByTestId('room-card-sweet').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sweet Playroom');
  await expect(page.getByTestId('collected')).toContainText('3 / 12 collected');
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'sweet.plainRug',
  );
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'space.spaceBoots',
  );
  await expect(page.locator('.s1').getByTestId('room-star-chart')).toHaveAttribute(
    'data-stars',
    '3',
  );

  // Sweet reactions (SPEC §4.3): Mimi curls up on the bed, stretches; the letterbox pops an
  // envelope; none of them write to the save; the heart lamp toggles the lighting.
  await expect.poll(async () => (await readSave(page)).heroine.shoes).toBe('space.spaceBoots');
  const before = await readSave(page);
  const companion = page.locator('.s1').getByTestId('room-companion');
  await page.locator('.s1').getByTestId('slot-BED').click();
  await expect(companion).toHaveClass(/react-curl/);
  await companion.click();
  await expect(companion).toHaveClass(/react-stretch/);
  await page.locator('.s1').getByTestId('room-heroine').click();

  // Decorate Sweet: the Pastel rug and the Heart lamp.
  await page.keyboard.press('d');
  await page.getByTestId('tile-sweet.pastelRug').click();
  await page.locator('.s1').getByTestId('slot-RUG').click();
  await page.getByTestId('tile-sweet.heartLamp').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'sweet.pastelRug',
  );
  await expect(page.locator('.s1').getByTestId('slot-LAMP')).toHaveAttribute(
    'data-item',
    'sweet.heartLamp',
  );
  await page.keyboard.press('Escape');
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.getByTestId('room-lighting')).toBeVisible();
  await expect.poll(async () => (await readSave(page)).themes.sweet.lampOn).toBe(true);
  const after = await readSave(page);
  expect(after.themes.space).toEqual(before.themes.space);
  expect(after.heroine).toEqual(before.heroine);
  expect(after.wardrobe).toEqual(before.wardrobe);
  expect(after.themes.sweet.stars).toBe(3);

  // --- Back to Space: nothing changed there; the Sweet lamp state is not Space's.
  await page.getByTestId('rooms-button').click();
  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'space.rainbowRug',
  );
  await expect(page.locator('.s1').getByTestId('slot-LAMP')).toHaveAttribute(
    'data-item',
    'space.plainLamp',
  );
  await expect(page.getByTestId('room-lighting')).toHaveCount(0);
  await expect(page.getByTestId('collected')).toContainText('2 / 12 collected');
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'space.spaceBoots',
  );

  // Reload: both rooms intact.
  await page.reload();
  await page.getByTestId('room-card-sweet').click();
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'sweet.pastelRug',
  );
  await expect(page.getByTestId('room-lighting')).toBeVisible();
  await expect(page.getByTestId('collected')).toContainText('3 / 12 collected');
  const final = await readSave(page);
  expect(final.themes.space.slots['RUG']).toBe('space.rainbowRug');
  expect(final.themes.sweet.slots['RUG']).toBe('sweet.pastelRug');
  expect(final.themes.sweet.slots['LAMP']).toBe('sweet.heartLamp');
  expect(final.heroine.shoes).toBe('space.spaceBoots');
});

test('star chart: a full poster gets the golden frame', async ({ page }) => {
  const save = seededSave();
  save.themes.space.stars = 24;
  await seedSave(page, save);
  await page.goto('/');
  await page.getByTestId('room-card-space').click();
  const chart = page.locator('.s1').getByTestId('room-star-chart');
  await expect(chart).toHaveAttribute('data-stars', '24');
  await expect(chart).toHaveClass(/star-chart-full/);
  await expect(chart).toHaveAttribute('aria-label', 'Star chart: 24 of 24 stars');
});
