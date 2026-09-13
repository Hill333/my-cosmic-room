import { expect, test, type Page } from '@playwright/test';
import {
  correctValue,
  digitsClicks,
  readSave,
  setClockKeys,
  waitForCompletedMission,
  waitForMission,
  type StoredMission,
} from './helpers.ts';

/**
 * Smoke flow 3 and AT-28 (SPEC §17.5, §17.8): a full mission of each activity started, solved
 * (including SET via arrow keys) and rewarded without a mouse. Only the keyboard is used from
 * the first launch onwards.
 */

/** Presses Tab until the element with `testId` has focus (bounded, so a broken order fails). */
async function tabTo(page: Page, testId: string, limit = 40): Promise<void> {
  const target = page.getByTestId(testId);
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((el) => el.matches(':focus'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${testId}`);
}

/** Tab into the answer group, arrow to the option with `value`, press Enter. */
async function chooseByKeyboard(page: Page, value: number): Promise<void> {
  const options = page.locator('[data-testid="answer"]:not([disabled])');
  const first = options.first();
  for (let i = 0; i < 40; i++) {
    if (await first.evaluate((el) => el.matches(':focus'))) break;
    await page.keyboard.press('Tab');
  }
  await expect(first).toBeFocused();
  const values = await options.evaluateAll((els) => els.map((el) => el.getAttribute('data-value')));
  const index = values.indexOf(String(value));
  expect(index).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator(`[data-testid="answer"][data-value="${value}"]`)).toBeFocused();
  await page.keyboard.press('Enter');
}

async function solveByKeyboard(page: Page, m: StoredMission): Promise<void> {
  const p = m.puzzles[m.index]!;
  await expect(page.getByTestId('puzzle')).toHaveAttribute('data-kind', p.kind);
  if (p.kind === 'SET') {
    await tabTo(page, 'set-clock-face');
    const { hours, steps } = setClockKeys(p.target!, m.level);
    for (let i = 0; i < hours; i++) await page.keyboard.press('ArrowUp');
    for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
  } else if (p.kind === 'DIGITS') {
    // The digital builder takes the same keys as the SET clock (SPEC §6.4, D20).
    await tabTo(page, 'digits-panel');
    const { hours, minutes } = digitsClicks(p.target!, m.level);
    for (let i = 0; i < hours; i++) await page.keyboard.press('ArrowUp');
    for (let i = 0; i < minutes; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
  } else {
    await chooseByKeyboard(page, correctValue(p));
  }
  await expect(page.getByTestId('feedback')).toContainText(/Yes!|That's it!|Great!/);
  // "Next" appears and receives focus (SPEC §9.1); Enter advances.
  await expect(page.getByTestId('next-button')).toBeFocused();
  await page.keyboard.press('Enter');
}

async function firstLaunchByKeyboard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('lang-en')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('room-card-space')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
}

test('flow 3 / AT-28 A: keyboard-only Rocket launch with a wrong pick, a hint, SET via arrows, Wear it', async ({
  page,
}) => {
  await firstLaunchByKeyboard(page);

  // M opens the mission board; Tab reaches Start.
  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a mission');
  await tabTo(page, 'start-A');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('s3')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();

  let wrongTested = false;
  let hintTested = false;
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    const p = m.puzzles[i]!;
    if (!wrongTested && p.kind !== 'SET' && p.kind !== 'DIGITS') {
      // A wrong pick: the option is disabled with "Try again", focus moves on, nothing is lost.
      const wrong = p.choices!.find((c) => c !== p.target)!;
      await chooseByKeyboard(page, wrong);
      const wrongOption = page.locator(`[data-testid="answer"][data-value="${wrong}"]`);
      await expect(wrongOption).toBeDisabled();
      await expect(wrongOption).toContainText('Try again');
      await expect(page.locator('[data-testid="answer"]:not([disabled])').first()).toBeFocused();
      await expect(page.getByTestId('feedback')).toContainText(/Not yet|Almost|Hmm/);
      wrongTested = true;
    }
    if (!hintTested && p.kind === 'READ') {
      await tabTo(page, 'hint-button');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('read-hint')).toBeVisible();
      await expect(page.getByTestId('hint-button')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('hint-button')).toBeFocused();
      hintTested = true;
    }
    await solveByKeyboard(page, m);
  }
  expect(wrongTested).toBe(true);
  expect(hintTested).toBe(true);

  // S5 by keyboard: select Cloud pyjamas with arrows, then "Wear it".
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await tabTo(page, 'prize-tile-space.moonBed');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('prize-tile-space.cloudPyjamas')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('apply-button')).toHaveText('Wear it');
  await tabTo(page, 'apply-button');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  const heroine = page.locator('.s1 .room-heroine');
  await expect(heroine.locator('.heroine')).toHaveAttribute('data-outfit', 'space.cloudPyjamas');
  await expect(heroine).toHaveClass(/sparkle/);
  await expect.poll(async () => (await readSave(page)).mission).toBeNull();
  const save = await readSave(page);
  expect(save.wardrobe).toContain('space.cloudPyjamas');
  expect(save.heroine.outfit).toBe('space.cloudPyjamas');
  expect(save.mission).toBeNull();
});

test('AT-28 B: keyboard-only Space delivery with the jump hint, prize kept with "Keep playing"', async ({
  page,
}) => {
  await firstLaunchByKeyboard(page);
  await page.keyboard.press('m');
  await tabTo(page, 'start-B');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('s4')).toBeVisible();

  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    await expect(page.getByTestId('journey')).toHaveAttribute('data-solved', String(i));
    if (i === 1) {
      // Hint = the jump timeline; it records hintUsed and stays open until Next.
      await tabTo(page, 'hint-button');
      await page.keyboard.press('Enter');
      const timeline = page.getByTestId('jump-timeline');
      await expect(timeline).toBeVisible();
      const jumps = Number(await timeline.getAttribute('data-jumps'));
      expect(jumps).toBeGreaterThanOrEqual(1);
      expect(jumps).toBeLessThanOrEqual(3);
      await expect(page.getByTestId('jump')).toHaveCount(jumps);
      await expect(page.getByTestId('show-jumps')).toHaveText('Hide the jumps');
      // The hint flag lands in the save after the autosave delay.
      await expect.poll(async () => (await readSave(page)).mission?.current.hintUsed).toBe(true);
    }
    await solveByKeyboard(page, m);
  }

  await expect(page.getByTestId('s5')).toBeVisible();
  const done = await waitForCompletedMission(page);
  expect(done.state).toBe('COMPLETED');
  expect(done.prizePair).toEqual(['space.moonBed', 'space.cloudPyjamas']);
  await tabTo(page, 'keep-button');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  // Kept, not applied: owned but the plain bed stays in the slot.
  await expect(page.locator('.s1').getByTestId('slot-BED')).toHaveAttribute(
    'data-item',
    'space.plainBed',
  );
  await expect(page.getByTestId('collected')).toContainText('1 / 12 collected');
  await expect.poll(async () => (await readSave(page)).mission).toBeNull();
  const save = await readSave(page);
  expect(save.themes.space.owned).toContain('space.moonBed');
});

test('leave dialog: Escape keeps going, confirming discards the mission and returns focus flow to S1', async ({
  page,
}) => {
  await firstLaunchByKeyboard(page);
  await page.keyboard.press('m');
  await tabTo(page, 'start-A');
  await page.keyboard.press('Enter');
  await waitForMission(page, 0);

  await tabTo(page, 'leave-button');
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('leave-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('leave-cancel')).toBeFocused();
  // Focus is trapped: Tab from the last button wraps to the first.
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('leave-confirm')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('leave-cancel')).toBeFocused();
  // Escape closes and returns focus to the opener (SPEC §13.1).
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('leave-button')).toBeFocused();
  expect((await readSave(page)).mission).not.toBeNull();

  await page.keyboard.press('Enter');
  await tabTo(page, 'leave-confirm');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await expect.poll(async () => (await readSave(page)).mission).toBeNull();
  await expect(page.getByTestId('collected')).toContainText('0 / 12 collected');
});
