import { expect, test } from '@playwright/test';
import {
  SAVE_KEY,
  holdGear,
  readSave,
  seedForMission,
  seedSave,
  seededSave,
  solveWithMouse,
  startMission,
  waitForMission,
  wrongValue,
} from './helpers.ts';

/**
 * Smoke flow 6 (SPEC §17.8): the workbook question types. Space → Rocket launch at R3 with a
 * SHIFT and a words puzzle (SPEC §7.3, §7.7): the themed question, word answers, the ghost
 * hint; then Sweet → Toy delivery at E2 with a SCHEDULE (SPEC §8.6): the day-plan bar, its
 * legend, a wrong pick and the jump hint for the asked segment. Finally the parent's
 * "Times in words" switch turns the word forms off for the next mission.
 */
test('flow 6: SHIFT and words at Quarter hours, then a day-plan bar at Quarters', async ({
  page,
}) => {
  const base = seededSave();
  base.settings.readingLevel = 3;
  base.settings.elapsedLevel = 2;
  const seedA = seedForMission(
    base,
    'space',
    'A',
    (ps) =>
      ps.some((p) => p.kind === 'SHIFT') &&
      ps.some((p) => p.kind === 'READ' && p.words === true) &&
      ps.some((p) => p.kind === 'MATCH' && p.words === true),
  );
  await seedSave(page, startMission(base, 'space', 'A', seedA));
  await page.goto('/');
  await expect(page.getByTestId('s3')).toBeVisible();

  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    const p = m.puzzles[i]!;
    const puzzle = page.getByTestId('puzzle');
    if (p.kind === 'SHIFT') {
      // The clock shows the start; the question names the shift in the Space story.
      await expect(puzzle).toHaveAttribute('data-kind', 'SHIFT');
      await expect(page.getByTestId('question')).toHaveText(
        p.delta! > 0
          ? /^The rocket launches in (\d+ minutes|1 hour)\. What time will it be\?$/
          : /^The countdown started (\d+ minutes|1 hour) ago\. What time was it\?$/,
      );
      await expect(page.getByRole('img', { name: 'Clock showing the time now' })).toBeVisible();
      // A wrong pick, then the hint draws the ghost hands and its caption.
      await page.locator(`[data-testid="answer"][data-value="${wrongValue(p)}"]`).click();
      await expect(page.getByTestId('feedback')).toContainText('✕');
      await page.getByTestId('hint-button').click();
      await expect(page.getByTestId('shift-hint')).toHaveText('The faint hands show the new time.');
      await expect(page.locator('.clock-ghost')).toHaveCount(1);
    }
    if (p.kind === 'READ' && p.words) {
      // Word answers: the correct option reads like "quarter past 4", not digits.
      await expect(puzzle).toHaveAttribute('data-words', 'true');
      const correct = page.locator(`[data-testid="answer"][data-value="${p.target}"]`);
      await expect(correct).toContainText(/o'clock|past|to/);
      await expect(correct).not.toContainText(':');
    }
    if (p.kind === 'MATCH' && p.words) {
      await expect(page.getByTestId('words-prompt')).toContainText(/o'clock|past|to/);
      await expect(page.getByTestId('question')).toContainText('Which clock shows this time:');
      await page.getByTestId('hint-button').click();
      await expect(page.getByTestId('words-hint')).toContainText(/= \d{1,2}:\d\d/);
    }
    await solveWithMouse(page, m);
  }
  await expect(page.getByTestId('s5')).toBeVisible();
  await page.getByTestId('keep-button').click();

  // Sweet → Toy delivery at E2 with a schedule puzzle. The autosave is debounced, so wait
  // for the ended mission to land before replacing the save.
  await expect(page.getByTestId('collected')).toContainText('1 / 12 collected');
  await page.waitForFunction((key) => {
    const raw = localStorage.getItem(key);
    return raw !== null && (JSON.parse(raw) as { mission: unknown }).mission === null;
  }, SAVE_KEY);
  const sweet = seededSave();
  sweet.settings.elapsedLevel = 2;
  const seedB = seedForMission(sweet, 'sweet', 'B', (ps) => ps.some((p) => p.kind === 'SCHEDULE'));
  // The init script of the first seed already ran once per session, so the second save goes
  // straight into localStorage before the reload.
  await page.evaluate(([key, json]) => localStorage.setItem(key, json), [
    SAVE_KEY,
    JSON.stringify(startMission(sweet, 'sweet', 'B', seedB)),
  ] as const);
  await page.goto('/');
  await expect(page.getByTestId('s4')).toBeVisible();

  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    const p = m.puzzles[i]!;
    if (p.kind === 'SCHEDULE') {
      await expect(page.getByTestId('puzzle')).toHaveAttribute('data-kind', 'SCHEDULE');
      await expect(page.getByTestId('question')).toContainText(/^How long does .+ take\?$/);
      const bar = page.getByTestId('schedule-bar');
      await expect(bar).toBeVisible();
      const label = await bar.getAttribute('aria-label');
      expect(label).toMatch(/^Day plan: /);
      expect(label!.split(';')).toHaveLength(4);
      await expect(page.getByTestId('schedule-key')).toHaveCount(4);
      await expect(page.locator('.sched-key.sched-asked')).toHaveCount(1);
      // A wrong pick, then the jump hint covers the asked segment.
      await page.locator(`[data-testid="answer"][data-value="${wrongValue(p)}"]`).click();
      await expect(page.getByTestId('feedback')).toContainText('✕');
      await page.getByTestId('show-jumps').click();
      const seg = p.segments![p.ask!]!;
      const pad = (t: number) =>
        `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      await expect(page.getByTestId('jump-timeline')).toContainText(pad(seg.start));
      await expect(page.getByTestId('jump-timeline')).toContainText(pad(seg.end));
    }
    await solveWithMouse(page, m);
  }
  await expect(page.getByTestId('s5')).toBeVisible();
  await page.getByTestId('keep-button').click();

  // Parent corner: "Times in words" off → a fresh Activity A mission has no word puzzles.
  await holdGear(page);
  await expect(page.getByTestId('s6-time-words')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('s6-time-words').click();
  await expect(page.getByTestId('s6-time-words')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('s6-done').click();
  await page.getByTestId('mission-button').click();
  await page.getByTestId('start-A').click();
  const m = await waitForMission(page, 0);
  expect((await readSave(page)).settings.timeWords).toBe(false);
  expect(m.puzzles.every((p) => p.words === undefined)).toBe(true);
});
