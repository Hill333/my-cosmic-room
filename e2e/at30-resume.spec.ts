import { expect, test } from '@playwright/test';
import {
  firstLaunchToSpace,
  readSave,
  solveWithMouse,
  waitForCompletedMission,
  waitForMission,
} from './helpers.ts';

/**
 * AT-30 (SPEC §17.6): reload during puzzle 3 resumes puzzle 3 with identical puzzles; reload
 * on S5 shows the same pair. The autosave flushes on pagehide, so a reload never loses state.
 */
test('AT-30: autosave and resume on S3 and S5', async ({ page }) => {
  await firstLaunchToSpace(page);
  await page.getByTestId('mission-button').click();
  await page.getByTestId('start-A').click();

  for (let i = 0; i < 2; i++) await solveWithMouse(page, await waitForMission(page, i));

  const before = await waitForMission(page, 2);
  await expect(page.getByTestId('progress')).toContainText('Question 3 of 4');
  await page.reload();

  // Straight back into puzzle 3 of the same mission, with focus on the heading.
  await expect(page.getByTestId('s3')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByTestId('progress')).toContainText('Question 3 of 4');
  await expect(page.getByTestId('tracker')).toHaveAttribute('data-solved', '2');
  const after = await waitForMission(page, 2);
  expect(after.puzzles).toEqual(before.puzzles);
  expect(after.results).toHaveLength(2);
  await expect(page.getByTestId('puzzle')).toHaveAttribute('data-kind', after.puzzles[2]!.kind);

  for (let i = 2; i < 4; i++) await solveWithMouse(page, await waitForMission(page, i));
  await expect(page.getByTestId('s5')).toBeVisible();
  const completed = await waitForCompletedMission(page);
  expect(completed.state).toBe('COMPLETED');

  await page.reload();
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByTestId('prize-tile-space.moonBed')).toBeVisible();
  await expect(page.getByTestId('prize-tile-space.cloudPyjamas')).toBeVisible();
  const again = await readSave(page);
  expect(again.mission?.prizePair).toEqual(completed.prizePair);
  expect(again.mission?.state).toBe('COMPLETED');
  // Nothing was granted by the reload; the grant happens once, on the button press.
  expect(again.themes.space.owned).not.toContain('space.moonBed');

  await page.getByTestId('apply-button').click();
  await expect(page.locator('.s1').getByTestId('slot-BED')).toHaveAttribute(
    'data-item',
    'space.moonBed',
  );
});
