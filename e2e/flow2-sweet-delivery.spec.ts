import { expect, test } from '@playwright/test';
import { readSave, seedSave, seededSave, solveWithMouse, waitForMission } from './helpers.ts';

/**
 * Smoke flow 2 (SPEC §17.8): Sweet → mission B at E3 for the first time → puzzle 4 is
 * 14:30 → 19:15 → a wrong answer, the hint, the correct answer → prize kept ("Keep playing")
 * → the "New" badge in the Decorate panel. Also covers the Sweet strings and scene ids
 * (SPEC §3.7, §5.4) and the letterbox entry object.
 */
test('flow 2: Toy delivery at Long journeys, 14:30 → 19:15 with a wrong pick and the hint, prize kept', async ({
  page,
}) => {
  await seedSave(page, seededSave());
  await page.goto('/');
  await page.getByTestId('room-card-sweet').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sweet Playroom');
  await expect(page.getByTestId('collected')).toContainText('0 / 12 collected');
  await expect(page.locator('.s1').getByTestId('room-companion')).toHaveAttribute(
    'aria-label',
    'Mimi',
  );

  // The toy letterbox reacts (flag art swaps in) and opens the board.
  await page.getByTestId('entry-object').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a mission');
  await expect(page.getByTestId('mission-card-B')).toContainText('Toy delivery');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Flower cushion');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Floral pyjamas');
  await page.getByTestId('level-e3').click();
  await expect(page.getByTestId('level-e3')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('start-B').click();
  await expect(page.getByTestId('s4')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Toy delivery');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'A parcel is coming to the playroom!',
  );

  // Puzzles 1–3 straight through; the vehicle advances a quarter per solved puzzle. One of
  // them is the ARRIVE kind (D14): the Sweet wording and the unknown arrival display.
  let arrived = false;
  for (let i = 0; i < 3; i++) {
    const m = await waitForMission(page, i);
    expect(m.theme).toBe('sweet');
    expect(m.level).toBe(3);
    await expect(page.getByTestId('journey')).toHaveAttribute('data-solved', String(i));
    if (m.puzzles[i]!.kind === 'ARRIVE') {
      await expect(page.getByTestId('question')).toContainText('When does the parcel arrive?');
      await expect(page.getByTestId('arrives-unknown')).toBeVisible();
      arrived = true;
    }
    await solveWithMouse(page, m);
  }
  expect(arrived).toBe(true);

  // Puzzle 4 is the required example (SPEC §7.5, AT-17): 14:30 → 19:15.
  const m = await waitForMission(page, 3);
  const p = m.puzzles[3]!;
  expect(p.kind).toBe('ELAPSED');
  expect(p.start).toBe(14 * 60 + 30);
  expect(p.end).toBe(19 * 60 + 15);
  expect([...p.choices!].sort((a, b) => a - b)).toEqual([255, 285, 300]);
  await expect(page.getByTestId('question')).toHaveText('How long does the delivery take?');
  await expect(page.getByTestId('question')).toBeFocused();
  await expect(page.getByTestId('s4')).toContainText('14:30');
  await expect(page.getByTestId('s4')).toContainText('19:15');

  // Wrong answer: shake, ✕, the option stays disabled, no reshuffle.
  const wrong = page.locator('[data-testid="answer"][data-value="255"]');
  await wrong.click();
  await expect(page.getByTestId('feedback')).toContainText('Not yet, try again.');
  await expect(wrong).toBeDisabled();
  await expect(page.locator('[data-testid="answer"]')).toHaveCount(3);

  // Hint: the jump timeline with +4 h → 18:30, +30 min → 19:00, +15 min → 19:15.
  await page.getByTestId('hint-button').click();
  await expect(page.getByTestId('hint-button')).toHaveAttribute('aria-pressed', 'true');
  const jumps = page.getByTestId('jump-timeline');
  await expect(jumps).toBeVisible();
  await expect(jumps).toContainText('+4 h');
  await expect(jumps).toContainText('18:30');
  await expect(jumps).toContainText('+30 min');
  await expect(jumps).toContainText('19:00');
  await expect(jumps).toContainText('+15 min');
  await expect(jumps).toContainText('19:15');

  await page.locator('[data-testid="answer"][data-value="285"]').click();
  await expect(page.getByTestId('feedback')).toContainText(/Yes!|That's it!|Great!/);
  await expect(page.getByTestId('next-button')).toBeFocused();
  await page.getByTestId('next-button').click();

  // S5 in the Sweet theme: Flower cushion pre-selected; "Keep playing" grants without placing.
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByTestId('prize-tile-sweet.flowerCushion')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('apply-button')).toHaveText('Put it in my room');
  await page.getByTestId('keep-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sweet Playroom');
  await expect(page.locator('.s1').getByTestId('slot-NOOK')).toHaveAttribute(
    'data-item',
    'sweet.yellowCushion',
  );
  await expect(page.getByTestId('collected')).toContainText('1 / 12 collected');

  // "New" badge in the Decorate panel; placing it clears the badge.
  await page.getByTestId('decorate-button').click();
  const tile = page.getByTestId('tile-sweet.flowerCushion');
  await expect(tile).toHaveAttribute('data-new', 'true');
  await expect(tile).toContainText('New');
  await expect(page.getByTestId('tile-sweet.yellowCushion')).toHaveAttribute('data-inroom', 'true');
  await tile.click();
  await page.locator('.s1').getByTestId('slot-NOOK').click();
  await expect(page.locator('.s1').getByTestId('slot-NOOK')).toHaveAttribute(
    'data-item',
    'sweet.flowerCushion',
  );
  await expect(tile).not.toHaveAttribute('data-new');
  await expect(tile).toHaveAttribute('data-inroom', 'true');

  // The record is gone, the first E3 mission is marked, the item is owned and no longer new.
  await expect
    .poll(async () => (await readSave(page)).themes.sweet.slots['NOOK'])
    .toBe('sweet.flowerCushion');
  const save = await readSave(page);
  expect(save.mission).toBeNull();
  expect(save.themes.sweet.owned).toContain('sweet.flowerCushion');
  expect(save.newItems).not.toContain('sweet.flowerCushion');
  expect(save.wardrobe).not.toContain('sweet.floralPyjamas');
  expect(save.progress.history.at(-1)).toMatchObject({ activity: 'B', level: 3 });
});
