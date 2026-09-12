import { expect, test } from '@playwright/test';
import { grantSpace, readSave, seedSave, seededSave } from './helpers.ts';

/**
 * AT-25 (SPEC §17.5): placing the starter rug again works; wearing the starter shoes again
 * works. Also covers the Decorate and Dress-up panels (SPEC §4.2, §4.4) with mouse and
 * keyboard, the D / W keys, Escape returning focus to the opener (AT-38) and the free-play
 * reactions never touching the save except the lamp (SPEC §4.3).
 */
test('AT-25: starter rug placed again, starter shoes worn again, panels by mouse and keyboard', async ({
  page,
}) => {
  const save = grantSpace(seededSave(), ['space.rainbowRug'], ['space.spaceBoots']);
  save.themes.space.slots.RUG = 'space.rainbowRug';
  save.heroine.shoes = 'space.spaceBoots';
  save.newItems = [];
  await seedSave(page, save);
  await page.goto('/');
  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  const rug = page.locator('.s1').getByTestId('slot-RUG');
  await expect(rug).toHaveAttribute('data-item', 'space.rainbowRug');

  // --- Decorate with the mouse: pick the plain rug tile, then click the RUG slot.
  await page.getByTestId('decorate-button').click();
  const panel = page.getByTestId('decorate-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('tile-space.rainbowRug')).toHaveAttribute('data-inroom', 'true');
  await page.getByTestId('tile-space.plainRug').click();
  await expect(page.getByTestId('tile-space.plainRug')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('decorate-hint')).toHaveText('Now choose where it goes.');
  await expect(rug).toHaveClass(/slot-target/);
  await expect(page.locator('.s1').getByTestId('slot-BED')).not.toHaveClass(/slot-target/);
  await rug.click();
  await expect(rug).toHaveAttribute('data-item', 'space.plainRug');
  await expect(page.getByTestId('tile-space.plainRug')).toHaveAttribute('data-inroom', 'true');
  await expect(page.getByTestId('tile-space.rainbowRug')).not.toHaveAttribute('data-inroom');
  await expect(page.getByTestId('tile-space.plainRug')).toHaveAttribute('aria-pressed', 'false');

  // Clicking elsewhere cancels an armed tile without placing.
  await page.getByTestId('tile-space.rainbowRug').click();
  await expect(rug).toHaveClass(/slot-target/);
  await page.locator('.s1').getByTestId('slot-WALL').click();
  await expect(rug).not.toHaveClass(/slot-target/);
  await expect(rug).toHaveAttribute('data-item', 'space.plainRug');

  // --- Decorate with the keyboard: arrows between tiles, Enter places into the RUG slot.
  await page.getByTestId('tile-space.plainRug').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tile-space.rainbowRug')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rug).toHaveAttribute('data-item', 'space.rainbowRug');
  await expect(page.getByTestId('room-announce')).toHaveText('Rainbow rug is in the room.');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(rug).toHaveAttribute('data-item', 'space.plainRug');

  // Escape closes the panel and returns focus to the opener (AT-38).
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.getByTestId('decorate-button')).toBeFocused();
  await expect(page.getByTestId('decorate-button')).toHaveAttribute('aria-pressed', 'false');

  // --- Dress up with W: Shoes tab, wear the starter sneakers again.
  await page.keyboard.press('w');
  const wardrobe = page.getByTestId('dressup-panel');
  await expect(wardrobe).toBeVisible();
  await expect(page.locator('.s1').getByTestId('room-heroine')).toHaveClass(/heroine-turned/);
  // Focus lands on the first tab when the panel opens; arrows move and select.
  await expect(page.getByTestId('tab-outfit')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tab-shoes')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('tile-space.spaceBoots')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('tile-shared.shoesSneakers').click();
  await expect(page.getByTestId('tile-shared.shoesSneakers')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('tile-space.spaceBoots')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'shared.shoesSneakers',
  );
  // Extras: "Nothing" is selected on a fresh heroine; the next pair is shown below the tabs.
  await page.getByTestId('tab-extra').click();
  await expect(page.getByTestId('tile-nothing')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('next-prizes')).toContainText('What will you earn next?');
  await expect(page.getByTestId('next-prizes')).toContainText('Moon bed');
  await expect(page.getByTestId('next-prizes')).toContainText('Cloud pyjamas');
  await page.getByTestId('panel-close').click();
  await expect(wardrobe).toHaveCount(0);
  await expect(page.getByTestId('dressup-button')).toBeFocused();

  // --- D opens Decorate; Escape closes it again.
  await page.keyboard.press('d');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  // --- Free-play reactions: the lamp toggles the lighting and persists; nothing else writes.
  await expect.poll(async () => (await readSave(page)).heroine.shoes).toBe('shared.shoesSneakers');
  const before = await readSave(page);
  await page.locator('.s1').getByTestId('slot-BED').click();
  await page.locator('.s1').getByTestId('room-heroine').click();
  await page.locator('.s1').getByTestId('room-companion').click();
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.getByTestId('room-lighting')).toBeVisible();
  await expect.poll(async () => (await readSave(page)).themes.space.lampOn).toBe(true);
  const lit = await readSave(page);
  const unlit = (save: Awaited<ReturnType<typeof readSave>>) => ({
    ...save,
    updatedAt: null,
    themes: { ...save.themes, space: { ...save.themes.space, lampOn: false } },
  });
  expect(unlit(lit)).toEqual(unlit(before));
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.getByTestId('room-lighting')).toHaveCount(0);

  // Reload keeps the swaps.
  await page.reload();
  await page.getByTestId('room-card-space').click();
  await expect(page.locator('.s1').getByTestId('slot-RUG')).toHaveAttribute(
    'data-item',
    'space.plainRug',
  );
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'shared.shoesSneakers',
  );
});
