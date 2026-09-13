import { expect, test } from '@playwright/test';
import { firstLaunchToSpace, readSave, solveWithMouse, waitForMission } from './helpers.ts';

/**
 * Smoke flow 1 (SPEC §17.8): first launch → language → Space → mission A (R2) → four correct
 * answers → prize applied → visible in room → reload persists. Also covers the S2 board,
 * the tracker, the feedback and the S5 preview along the way.
 */
test('flow 1: first launch, Rocket launch at half hours, Moon bed placed and kept', async ({
  page,
}) => {
  await firstLaunchToSpace(page);

  // S1 → S2: the mission button opens the board with R2 pre-selected and the first pair.
  await page.getByTestId('mission-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a mission');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(page.getByTestId('level-r2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Moon bed');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Cloud pyjamas');

  // Level chips change the level; R2 is restored for the flow.
  await page.getByTestId('level-r3').click();
  await expect(page.getByTestId('level-r3')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('level-r2').click();
  await expect(page.getByTestId('level-r2')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('start-A').click();
  await expect(page.getByTestId('s3')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rocket launch');
  await expect(page.getByTestId('prize-icons').getByRole('img')).toHaveCount(2);

  const kinds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    expect(m.level).toBe(2);
    await expect(page.getByTestId('progress')).toContainText(`Question ${i + 1} of 4`);
    await expect(page.getByTestId('tracker')).toHaveAttribute('data-solved', String(i));
    kinds.push(await solveWithMouse(page, m));
  }
  // READ, MATCH, SET and one extra kind (D14).
  expect(kinds.filter((k) => ['MATCH', 'READ', 'SET'].includes(k)).sort()).toEqual([
    'MATCH',
    'READ',
    'SET',
  ]);
  expect(kinds.filter((k) => ['WORDS', 'LATER', 'DIGITS'].includes(k))).toHaveLength(1);

  // S5: Moon bed pre-selected, the preview shows it in the BED slot, "Put it in my room".
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mission complete!');
  await expect(page.getByTestId('prize-tile-space.moonBed')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('room-preview').getByTestId('slot-BED')).toHaveAttribute(
    'data-item',
    'space.moonBed',
  );
  await page.getByTestId('prize-tile-space.cloudPyjamas').click();
  await expect(page.getByTestId('apply-button')).toHaveText('Wear it');
  await expect(page.getByTestId('room-preview').locator('.heroine')).toHaveAttribute(
    'data-outfit',
    'space.cloudPyjamas',
  );
  await page.getByTestId('prize-tile-space.moonBed').click();
  await expect(page.getByTestId('apply-button')).toHaveText('Put it in my room');
  await page.getByTestId('apply-button').click();

  // S1: the Moon bed is in the BED slot with a sparkle; the counter counts it.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  const bed = page.locator('.s1').getByTestId('slot-BED');
  await expect(bed).toHaveAttribute('data-item', 'space.moonBed');
  await expect(bed).toHaveClass(/sparkle/);
  await expect(page.getByTestId('collected')).toContainText('1 / 12 collected');

  // Reload persists the room and ends the mission.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tick-Tock');
  await page.getByTestId('room-card-space').click();
  await expect(page.locator('.s1').getByTestId('slot-BED')).toHaveAttribute(
    'data-item',
    'space.moonBed',
  );
  await expect(page.getByTestId('collected')).toContainText('1 / 12 collected');
  const save = await readSave(page);
  expect(save.mission).toBeNull();
  expect(save.themes.space.owned).toContain('space.moonBed');
  expect(save.wardrobe).not.toContain('space.cloudPyjamas');

  // The next pair on the board moves on to Star lamp + Cloud pyjamas (SPEC §10.2, AT-19).
  await page.getByTestId('entry-object').click();
  await expect(page.getByTestId('prizes-waiting')).toContainText('Star lamp');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Cloud pyjamas');
});
