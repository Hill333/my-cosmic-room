import { expect, test, type Page } from '@playwright/test';
import { readSave, seedSave, seededSave } from './helpers.ts';

/**
 * Free-play walking (SPEC §4.3 "walk, bed, sit"): click the heroine to pick her, then click
 * the floor, the bed, the nook or another item; she walks there, lies down, sits, or lets
 * the item react once she arrives; the companion follows; arrow keys walk her too; nothing
 * of it reaches the save; under reduced motion every change lands at once.
 */

const heroine = (page: Page) => page.locator('.s1').getByTestId('room-heroine');
const companion = (page: Page) => page.locator('.s1').getByTestId('room-companion');

/** An inline style property of a room button (the e2e project has no DOM types: strings). */
async function styleOf(page: Page, testId: string, prop: string): Promise<string> {
  return page.evaluate(
    `document.querySelector('.s1 [data-testid="${testId}"]').style.getPropertyValue('${prop}')`,
  );
}

/** The walker's inline `left` in stage px (the feet point moves it). */
async function leftOf(page: Page, testId: string): Promise<number> {
  return parseFloat(await styleOf(page, testId, 'left'));
}

/** A click on the painted floor at stage coordinates (SPEC §4.3), via the scene's own box. */
async function clickFloor(page: Page, x: number, y: number): Promise<void> {
  const scene = page.locator('.s1 .room-scene');
  const box = (await scene.boundingBox())!;
  const k = box.width / 1536;
  await page.mouse.click(box.x + x * k, box.y + y * k);
}

test('walk: pick the heroine, walk to the floor, the bed and the nook; the save stays put', async ({
  page,
}) => {
  await seedSave(page, seededSave());
  await page.goto('/');
  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  const before = await readSave(page);
  const her = heroine(page);
  const pip = companion(page);
  const homeLeft = await leftOf(page, 'room-heroine');
  const pipHome = await leftOf(page, 'room-companion');

  // Unpicked, the floor does nothing; picking her waves and marks the button pressed.
  await clickFloor(page, 900, 800);
  expect(await leftOf(page, 'room-heroine')).toBe(homeLeft);
  await her.click();
  await expect(her).toHaveAttribute('aria-pressed', 'true');
  await expect(her).toHaveClass(/heroine-selected/);
  await expect(her).toHaveClass(/react-wave/);

  // The floor click sends her (and Pip after her) there; arrival drops the pick.
  await clickFloor(page, 900, 800);
  await expect(her).toHaveAttribute('data-walking', 'true');
  await expect(her).toHaveAttribute('aria-pressed', 'false');
  await expect(pip).toHaveAttribute('data-walking', 'true');
  await expect(her).not.toHaveAttribute('data-walking', 'true', { timeout: 5000 });
  await expect(pip).not.toHaveAttribute('data-walking', 'true', { timeout: 5000 });
  expect(await leftOf(page, 'room-heroine')).toBeGreaterThan(homeLeft + 200);
  expect(await leftOf(page, 'room-companion')).not.toBe(pipHome);

  // Picked + bed: she walks over and lies down over the bed; the room goes dark without a
  // lamp change in the save; her click gets her up again.
  await her.click();
  await page.locator('.s1').getByTestId('slot-BED').click();
  await expect(her).toHaveAttribute('data-pose', 'bed', { timeout: 6000 });
  await expect(her).toHaveClass(/heroine-pose-bed/);
  await expect(page.getByTestId('room-lighting')).toBeVisible();
  await expect(her).toHaveCSS('z-index', '51');
  await her.click();
  await expect(her).toHaveAttribute('data-pose', 'stand');
  await expect(page.getByTestId('room-lighting')).toHaveCount(0);

  // Picked + nook: she sits in the beanbag; a floor click stands her up and walks her off.
  await her.click();
  await page.locator('.s1').getByTestId('slot-NOOK').click();
  await expect(her).toHaveAttribute('data-pose', 'sit', { timeout: 6000 });
  await clickFloor(page, 820, 700);
  await expect(her).toHaveAttribute('data-pose', 'stand');
  await expect(her).not.toHaveAttribute('data-walking', 'true', { timeout: 6000 });

  // Picked + lamp: she walks to it, then it toggles the lighting (the one saved reaction).
  await her.click();
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.getByTestId('room-lighting')).toHaveCount(0);
  await expect(page.getByTestId('room-lighting')).toBeVisible({ timeout: 6000 });
  await expect.poll(async () => (await readSave(page)).themes.space.lampOn).toBe(true);
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.getByTestId('room-lighting')).toHaveCount(0);

  // Arrow keys walk her while picked; Escape drops the pick; a panel stands her down.
  await her.click();
  const beforeKeys = await leftOf(page, 'room-heroine');
  await page.keyboard.press('ArrowLeft');
  await expect(her).not.toHaveAttribute('data-walking', 'true', { timeout: 5000 });
  expect(await leftOf(page, 'room-heroine')).toBeLessThan(beforeKeys);
  await expect(her).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(her).toHaveAttribute('aria-pressed', 'false');

  // Nothing but the lamp toggle (undone) touched the save.
  const after = await readSave(page);
  expect(after).toEqual({ ...before, updatedAt: after.updatedAt });
});

test('walk: with reduced motion every move lands at once', async ({ page }) => {
  const save = seededSave();
  save.settings.motion = 'reduced';
  await seedSave(page, save);
  await page.goto('/');
  await page.getByTestId('room-card-sweet').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sweet Playroom');
  const her = heroine(page);
  await her.click();
  await page.locator('.s1').getByTestId('slot-BED').click();
  await expect(her).toHaveAttribute('data-pose', 'bed', { timeout: 1000 });
  await expect(her).not.toHaveAttribute('data-walking', 'true');
  expect(await styleOf(page, 'room-heroine', '--walk-ms')).toBe('0ms');
  // The "z z z" stays put instead of floating.
  const zzz = await page.evaluate(
    `(() => { const cs = getComputedStyle(document.querySelector('.s1 [data-testid="room-heroine"]'), '::after'); return { content: cs.content, animation: cs.animationName, opacity: cs.opacity }; })()`,
  );
  expect(zzz).toEqual({ content: '"z z z"', animation: 'none', opacity: '1' });
});
