import { expect, test, type Page } from '@playwright/test';
import {
  completeMission,
  digitsClicks,
  grantSpace,
  seedForFirstKind,
  seedSave,
  seededSave,
  setClockKeys,
  startMission,
  waitForMission,
} from './helpers.ts';

/**
 * Sounds (SPEC §13.3, §15.4): nothing plays before the first user gesture (a reload onto S5
 * mounts the celebration silently), the persisted toggle silences everything, and the hook
 * points play the right clip: tap, wrong (soft), hint, correct, next, the fanfare on the
 * fourth right answer, the theme jingle on S5, place / wear on apply. `Audio` is stubbed so
 * the test records what would have played.
 */

const STUB = `
  window.__plays = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.volume = 1; this.currentTime = 0; this.preload = ''; }
    play() { window.__plays.push(this.src.split('/').pop().replace(/-[^-.]+\\.mp3$/, '')); return Promise.resolve(); }
  }
  window.Audio = FakeAudio;
`;

async function plays(page: Page): Promise<string[]> {
  return page.evaluate('window.__plays');
}

test('sounds wait for a gesture, follow the toggle and match the hook points', async ({ page }) => {
  await page.addInitScript(STUB);
  const save = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  await seedSave(page, completeMission(startMission(save, 'space', 'A', 3)));
  await page.goto('/');
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByTestId('celebration')).toBeAttached();
  // No gesture yet: the jingle on the S5 mount stays silent.
  expect(await plays(page)).toEqual([]);

  // The first click unlocks audio; "Put it in my room" places the prize (a decoration).
  await page.getByTestId('apply-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  expect(await plays(page)).toEqual(['place']);

  // A plain button taps; a slot click in decorate mode is silent; a reaction taps.
  await page.getByTestId('decorate-button').click();
  await page.locator('.s1').getByTestId('slot-WALL').click();
  await page.getByTestId('panel-close').click();
  await page.locator('.s1').getByTestId('slot-WALL').click();
  expect(await plays(page)).toEqual(['place', 'tap', 'tap', 'tap']);

  // Toggle off: silence (the toggle's own click is already off when the tap would play).
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  const silent = await plays(page);
  await page.getByTestId('dressup-button').click();
  await page.getByTestId('tab-shoes').click();
  await page.getByTestId('tile-shared.shoesSneakers').click();
  await page.getByTestId('panel-close').click();
  expect(await plays(page)).toEqual(silent);

  // Toggle on: the toggle taps, wearing a garment plays "wear".
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('dressup-button').click();
  await page.getByTestId('tab-shoes').click();
  await page.getByTestId('tile-shared.shoesMaryJanes').click();
  expect((await plays(page)).slice(silent.length)).toEqual(['tap', 'tap', 'tap', 'wear']);
  await page.keyboard.press('Escape');

  // A mission: wrong (soft), hint, correct, next; the fourth right answer is the fanfare;
  // S5 plays the theme jingle.
  await page.getByTestId('mission-button').click();
  await page.getByTestId('start-A').click();
  await page.evaluate('window.__plays.length = 0');
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    const p = m.puzzles[i]!;
    await page.evaluate('window.__plays.length = 0');
    if (i === 0 && p.kind !== 'SET' && p.kind !== 'DIGITS') {
      const wrong = p.choices!.find((c) => c !== p.target)!;
      await page.locator(`[data-testid="answer"][data-value="${wrong}"]`).click();
      await page.getByTestId('hint-button').click();
      expect(await plays(page)).toEqual(['wrong', 'hint']);
      await page.evaluate('window.__plays.length = 0');
    }
    if (p.kind === 'SET') {
      const { hours, steps } = setClockKeys(p.target!, m.level);
      for (let h = 0; h < hours; h++) await page.getByTestId('set-plus-hour').click();
      for (let s = 0; s < steps; s++) await page.getByTestId('set-plus-step').click();
      await page.evaluate('window.__plays.length = 0');
      await page.getByTestId('set-check').click();
    } else if (p.kind === 'DIGITS') {
      const { hours, minutes } = digitsClicks(p.target!, m.level);
      for (let h = 0; h < hours; h++) await page.getByTestId('digits-hour-up').click();
      for (let s = 0; s < minutes; s++) await page.getByTestId('digits-minute-up').click();
      await page.evaluate('window.__plays.length = 0');
      await page.getByTestId('digits-check').click();
    } else {
      await page.locator(`[data-testid="answer"][data-value="${p.target}"]`).click();
    }
    await expect(page.getByTestId('next-button')).toBeFocused();
    expect(await plays(page)).toEqual([i === 3 ? 'fanfare' : 'correct']);
    await page.evaluate('window.__plays.length = 0');
    await page.getByTestId('next-button').click();
  }
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect.poll(() => plays(page)).toEqual(['next', 'jingle']);
});

test('the wear sound and the tap on S0 cards; the toggle is persisted', async ({ page }) => {
  await page.addInitScript(STUB);
  const base = seededSave();
  base.settings.sound = false;
  const seed = seedForFirstKind(base, 'space', 'MATCH');
  await seedSave(page, startMission(base, 'space', 'A', seed));
  await page.goto('/');
  await expect(page.getByTestId('s3')).toBeVisible();
  const m = await waitForMission(page, 0);
  const p = m.puzzles[0]!;
  await page.locator(`[data-testid="answer"][data-value="${p.target}"]`).click();
  await expect(page.getByTestId('next-button')).toBeFocused();
  expect(await plays(page)).toEqual([]);
  await page.getByTestId('sound-toggle').click();
  await page.getByTestId('next-button').click();
  expect(await plays(page)).toEqual(['tap', 'next']);
  await page.reload();
  await expect(page.getByTestId('s3')).toBeVisible();
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'true');
});
