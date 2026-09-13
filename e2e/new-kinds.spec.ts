import { expect, test, type Page } from '@playwright/test';
import {
  digitsClicks,
  seedForMission,
  seedSave,
  seededSave,
  solveWithMouse,
  startMission,
  waitForMission,
  wrongValue,
} from './helpers.ts';

/**
 * The DIGITS kind of Activity A and the ARRIVE kind of Activity B (D20): what each shows,
 * its hint, a wrong answer and the correct one, with the mouse. The mission is seeded
 * through the real reducer so the wanted kind is known to be present.
 */

const has = (kind: string) => (ps: { kind: string }[]) => ps.some((p) => p.kind === kind);

/** Plays the seeded mission up to the puzzle of `kind` and returns that puzzle's index. */
async function reachKind(
  page: Page,
  kind: string,
): Promise<{ index: number; mission: Awaited<ReturnType<typeof waitForMission>> }> {
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    if (m.puzzles[i]!.kind === kind) return { index: i, mission: m };
    await solveWithMouse(page, m);
  }
  throw new Error(`No ${kind} puzzle in the mission`);
}

test('DIGITS: build the time with the up/down buttons; a wrong check shakes, the hint is the READ hint', async ({
  page,
}) => {
  const base = seededSave();
  const seed = seedForMission(base, 'space', 'A', has('DIGITS'));
  await seedSave(page, startMission(base, 'space', 'A', seed));
  await page.goto('/');
  await expect(page.getByTestId('s3')).toBeVisible();

  const { mission } = await reachKind(page, 'DIGITS');
  const p = mission.puzzles[mission.index]!;
  await expect(page.getByTestId('question')).toHaveText('Write this time in digits.');
  // Starts at 12:00 or 6:00, never on the target (SPEC §6.4 rule reused).
  const startValue = await page.getByTestId('digits-value').innerText();
  expect(['12:00', '6:00']).toContain(startValue);

  // A wrong check: shake and the SET-style message; the builder stays usable.
  await page.getByTestId('digits-check').click();
  await expect(page.getByTestId('feedback')).toContainText('Not yet. Look at the short hand.');
  await expect(page.getByTestId('digits')).toHaveClass(/digits-wrong/);

  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('read-hint')).toBeVisible();

  const { hours, minutes } = digitsClicks(p.target!, mission.level);
  for (let i = 0; i < hours; i++) await page.getByTestId('digits-hour-up').click();
  for (let i = 0; i < minutes; i++) await page.getByTestId('digits-minute-up').click();
  const h = Math.floor(p.target! / 60) % 12 || 12;
  const m = String(p.target! % 60).padStart(2, '0');
  await expect(page.getByTestId('digits-value')).toHaveText(`${h}:${m}`);
  await page.getByTestId('digits-check').click();
  await expect(page.getByTestId('feedback')).toContainText(/Yes!|That's it!|Great!/);
  await expect(page.getByTestId('digits')).toHaveClass(/digits-correct/);
  await expect(page.getByTestId('digits-check')).toBeDisabled();
  await expect(page.getByTestId('next-button')).toBeFocused();
});

test('DIGITS: the minutes wrap within the hour and the hours wrap on the face', async ({
  page,
}) => {
  const base = seededSave();
  const seed = seedForMission(base, 'space', 'A', has('DIGITS'));
  await seedSave(page, startMission(base, 'space', 'A', seed));
  await page.goto('/');
  await reachKind(page, 'DIGITS');
  const value = page.getByTestId('digits-value');
  const start = await value.innerText();
  const hour = Number(start.split(':')[0]);
  // R2: one minute step is 30; two steps come back to :00 with the same hour.
  await page.getByTestId('digits-minute-up').click();
  await expect(value).toHaveText(`${hour}:30`);
  await page.getByTestId('digits-minute-up').click();
  await expect(value).toHaveText(`${hour}:00`);
  await page.getByTestId('digits-minute-down').click();
  await expect(value).toHaveText(`${hour}:30`);
  // Twelve hour steps come back around.
  for (let i = 0; i < 12; i++) await page.getByTestId('digits-hour-up').click();
  await expect(value).toHaveText(`${hour}:30`);
  await page.getByTestId('digits-hour-down').click();
  await expect(value).toHaveText(`${hour === 1 ? 12 : hour - 1}:30`);
});

test('ARRIVE: leaves + takes → which arrival time; the jump hint hides the times', async ({
  page,
}) => {
  const base = seededSave();
  base.settings.elapsedLevel = 3;
  base.progress.firstE3Done.space = true;
  const seed = seedForMission(base, 'space', 'B', has('ARRIVE'));
  await seedSave(page, startMission(base, 'space', 'B', seed));
  await page.goto('/');
  await expect(page.getByTestId('s4')).toBeVisible();

  const { mission } = await reachKind(page, 'ARRIVE');
  const p = mission.puzzles[mission.index]!;
  const fmt = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  await expect(page.getByTestId('question')).toContainText('When does the parcel land?');
  await expect(page.getByTestId('s4')).toContainText(fmt(p.start!));
  await expect(page.getByTestId('journey-takes')).toBeVisible();
  await expect(page.getByTestId('arrives-unknown')).toContainText('?:??');
  // The end time is not on screen outside the answer buttons before the hint.
  const answers = page.locator('[data-testid="answer"]');
  await expect(answers).toHaveCount(3);
  await expect(page.locator(`[data-testid="answer"][data-value="${p.end}"]`)).toContainText(
    fmt(p.end!),
  );

  // The jump hint shows the jumps but keeps every reached time as "?".
  await page.getByTestId('show-jumps').click();
  const jumps = page.getByTestId('jump-timeline');
  await expect(jumps).toBeVisible();
  await expect(jumps).toHaveAttribute('data-hidden-times', 'true');
  await expect(jumps).toContainText(fmt(p.start!));
  await expect(jumps).not.toContainText(fmt(p.end!));
  await expect(jumps).toContainText('?');

  await page.locator(`[data-testid="answer"][data-value="${wrongValue(p)}"]`).click();
  await expect(page.getByTestId('feedback')).toContainText('✕');
  await page.locator(`[data-testid="answer"][data-value="${p.end}"]`).click();
  await expect(page.getByTestId('feedback')).toContainText(/Yes!|That's it!|Great!/);
  // Solved: the timeline now reveals the times.
  await expect(jumps).toHaveAttribute('data-hidden-times', 'false');
  await expect(jumps).toContainText(fmt(p.end!));
});
