import { expect, test, type Page } from '@playwright/test';
import {
  completeMission,
  grantSpace,
  seedForFirstKind,
  seedSave,
  seededSave,
  solveWithMouse,
  startMission,
  waitForMission,
} from './helpers.ts';

/**
 * AT-36 (SPEC §17.7, §13.3): with the OS setting on (`prefers-reduced-motion`) or the S6
 * setting "Reduced", there is no confetti and no hint sweep (the counter and the hour caption
 * appear immediately, the jump timeline is fully revealed at once), the celebration is a
 * static scene with a sparkle icon on the card, and every state change is still visible:
 * feedback, disabled wrong picks, the tracker, the panels, placements and the lighting.
 */

/** Chrome reports 0.01ms as "1e-05s"; anything under a frame counts as instant. */
const INSTANT = '1e-05s';

/** Computed animation duration / name of the first element matching `selector`. */
async function animationOf(
  page: Page,
  selector: string,
): Promise<{ name: string; duration: string }> {
  return page.evaluate(
    `(() => { const cs = getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return { name: cs.animationName, duration: cs.animationDuration }; })()`,
  );
}

/** The animated `--mins` counter of the READ hint (SPEC §9.3); registered, so it computes. */
async function minutesCounter(page: Page): Promise<string> {
  return page.evaluate(
    `getComputedStyle(document.querySelector('.hint-count')).getPropertyValue('--mins').trim()`,
  );
}

async function transitionOf(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).transitionDuration`,
  );
}

for (const mode of ['system', 'setting'] as const) {
  test(`AT-36 (${mode === 'system' ? 'OS setting' : 'S6 "Reduced"'}): no confetti or sweep, every state change visible`, async ({
    page,
  }) => {
    if (mode === 'system') await page.emulateMedia({ reducedMotion: 'reduce' });
    const base = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
    if (mode === 'setting') base.settings.motion = 'reduced';
    const seed = seedForFirstKind(base, 'space', 'READ');
    await seedSave(page, startMission(base, 'space', 'A', seed));
    await page.goto('/');
    await expect(page.getByTestId('s3')).toBeVisible();
    await expect(page.locator('.stage')).toHaveAttribute(
      'data-motion',
      mode === 'system' ? 'system' : 'reduced',
    );

    // READ hint: the sweep and the counter end at once; the hour caption is visible at once.
    const m0 = await waitForMission(page, 0);
    const p0 = m0.puzzles[0]!;
    expect(p0.kind).toBe('READ');
    await page.getByTestId('hint-button').click();
    await expect(page.getByTestId('read-hint')).toBeVisible();
    expect((await animationOf(page, '.clock-minute-wrap')).duration).toBe(INSTANT);
    expect(await minutesCounter(page)).toBe(String(p0.target! % 60));
    // Fully visible within a frame or two: with motion on, the caption waits 1.2 s + 300 ms.
    await expect(page.locator('.hint-hour')).toHaveCSS('opacity', '1', { timeout: 500 });

    // A wrong pick: still ✕ "Try again", the option disabled; then the right one: ✓, the
    // tracker lights up and Next takes focus.
    const wrong = p0.choices!.find((c) => c !== p0.target)!;
    await page.locator(`[data-testid="answer"][data-value="${wrong}"]`).click();
    await expect(page.getByTestId('feedback')).toContainText('✕');
    await expect(page.locator(`[data-testid="answer"][data-value="${wrong}"]`)).toBeDisabled();
    await expect(page.locator(`[data-testid="answer"][data-value="${wrong}"]`)).toContainText(
      'Try again',
    );
    await page.locator(`[data-testid="answer"][data-value="${p0.target}"]`).click();
    await expect(page.getByTestId('feedback')).toContainText('✓');
    await expect(page.getByTestId('tracker')).toHaveAttribute('data-solved', '1');
    await expect(page.locator('.tracker-lit')).toHaveCount(1);
    await expect(page.getByTestId('next-button')).toBeFocused();
    await page.getByTestId('next-button').click();
    for (let i = 1; i < 4; i++) await solveWithMouse(page, await waitForMission(page, i));

    // S5: no confetti, the rocket stays on its pad without a flame, the sparkle icon shows,
    // the prize tiles and preview are there.
    await expect(page.getByTestId('s5')).toBeVisible();
    await expect(page.locator('.confetti')).toBeHidden();
    await expect(page.getByTestId('s5-sparkle')).toBeVisible();
    await expect(page.locator('.celebration-flame')).toBeHidden();
    expect((await animationOf(page, '.celebration-rocket')).name).toBe('none');
    await expect(page.locator('.celebration-rocket')).toBeInViewport();
    const tile = page.locator('.prize-tile').first();
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(tile.locator('.prize-tile-check')).toHaveText('✓');
    await expect(page.getByTestId('room-preview')).toBeVisible();
    await page.getByTestId('apply-button').click();

    // S1: the placed item is in place with its sparkle; panels open and close at once; a
    // placement shows immediately; the lamp lighting appears.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
    const placed = page.locator('.s1 .room-slots .sparkle');
    await expect(placed).toHaveCount(1);
    await page.getByTestId('decorate-button').click();
    await expect(page.getByTestId('decorate-panel')).toBeVisible();
    expect((await animationOf(page, '.side-panel')).duration).toBe(INSTANT);
    await page.getByTestId('tile-space.moonBed').click();
    await page.locator('.s1').getByTestId('slot-BED').click();
    await expect(page.locator('.s1').getByTestId('slot-BED')).toHaveAttribute(
      'data-item',
      'space.moonBed',
    );
    await expect(page.getByTestId('tile-space.moonBed')).toHaveAttribute('data-inroom', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('decorate-panel')).toHaveCount(0);
    await expect(page.getByTestId('decorate-button')).toBeFocused();
    await page.locator('.s1').getByTestId('slot-LAMP').click();
    await expect(page.getByTestId('room-lighting')).toBeVisible();
    expect((await animationOf(page, '.room-lighting')).duration).toBe(INSTANT);

    // S4: the jump timeline is fully revealed the moment it opens.
    await page.getByTestId('mission-button').click();
    await page.getByTestId('level-e3').click();
    await page.getByTestId('start-B').click();
    await waitForMission(page, 0);
    await page.getByTestId('show-jumps').click();
    await expect(page.getByTestId('jump-timeline')).toBeVisible();
    const jumps = await page.getByTestId('jump').count();
    expect(jumps).toBeGreaterThan(0);
    // With motion on, even a single jump takes 300 ms to appear; later ones wait longer.
    await expect(page.getByTestId('jump').last()).toHaveCSS('opacity', '1', { timeout: 250 });
  });
}

test('AT-36: the S6 setting is exposed on the stage and "Full" plays confetti again', async ({
  page,
}) => {
  const save = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  save.settings.motion = 'reduced';
  await seedSave(page, completeMission(startMission(save, 'space', 'A', 3)));
  await page.goto('/');
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.locator('.stage')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.confetti')).toBeHidden();
  await page.getByTestId('keep-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await page.getByTestId('parent-gear').click({ delay: 1800 });
  await expect(page.getByTestId('s6')).toBeVisible();
  await expect(page.getByTestId('s6-motion-reduced')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('s6-motion-full').click();
  await expect(page.locator('.stage')).toHaveAttribute('data-motion', 'full');
  // "Full" ignores the OS preference (the S6 setting wins, SPEC §13.3): the switch keeps its
  // 150 ms transition; back on "Follow system" it drops to the reduced value.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await transitionOf(page, '.switch-track')).toBe('0.15s');
  await page.getByTestId('s6-motion-system').click();
  await expect(page.locator('.stage')).toHaveAttribute('data-motion', 'system');
  expect(await transitionOf(page, '.switch-track')).toBe(INSTANT);
});
