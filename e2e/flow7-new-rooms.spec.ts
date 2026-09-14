import { expect, test } from '@playwright/test';
import {
  grantItems,
  readSave,
  SAVE_KEY,
  seedSave,
  seededSave,
  solveWithMouse,
  waitForMission,
} from './helpers.ts';

/**
 * Smoke flow 7 (D21): the Heart and K-pop playrooms sit beside Space and Sweet on the title
 * screen and run the shared loop end to end: entry object → board → a four-puzzle mission →
 * prize applied → the room shows it → dress-up of a room garment in another room → reload.
 * Also covers the four-room save loading an old two-room save without losing anything.
 */
test('flow 7a: Heart Playroom mission, Heart beanbag placed, cardigan worn in the K-pop room', async ({
  page,
}) => {
  await seedSave(page, seededSave());
  await page.goto('/');
  await expect(page.getByTestId('room-card-space')).toBeVisible();
  await expect(page.getByTestId('room-card-sweet')).toBeVisible();
  await expect(page.getByTestId('room-card-hearts')).toBeVisible();
  await expect(page.getByTestId('room-card-kpop')).toBeVisible();

  await page.getByTestId('room-card-hearts').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Heart Playroom');
  await expect(page.getByTestId('collected')).toContainText('0 / 12 collected');
  await expect(page.locator('.s1').getByTestId('room-companion')).toHaveAttribute(
    'aria-label',
    'Lulu',
  );
  // Lulu hops when tapped; the heart box (entry object) opens the board.
  await page.locator('.s1').getByTestId('room-companion').click();
  await expect(page.locator('.s1').getByTestId('room-companion')).toHaveClass(/react-hop/);
  await page.getByTestId('entry-object').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a mission');
  await expect(page.getByTestId('mission-card-A')).toContainText('Kind-notes post');
  await expect(page.getByTestId('mission-card-B')).toContainText('Letter delivery');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Heart beanbag');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Heart cardigan');

  await page.getByTestId('start-A').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kind-notes post');
  await expect(page.getByTestId('tracker')).toContainText('Note');
  await expect(page.getByTestId('tracker')).toContainText('Ribbon');
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    expect(m.theme).toBe('hearts');
    await solveWithMouse(page, m);
  }

  // S5 in the Heart theme: the beanbag pre-selected, the celebration mounted; apply it.
  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByTestId('celebration')).toHaveClass(/celebration-hearts/);
  await expect(page.getByTestId('prize-tile-hearts.heartBeanbag')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByTestId('apply-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Heart Playroom');
  await expect(page.locator('.s1').getByTestId('slot-NOOK')).toHaveAttribute(
    'data-item',
    'hearts.heartBeanbag',
  );
  await expect(page.getByTestId('collected')).toContainText('1 / 12 collected');
  await expect
    .poll(async () => (await readSave(page)).themes.hearts.slots['NOOK'])
    .toBe('hearts.heartBeanbag');

  // A Heart garment, once owned, is wearable in the K-pop room with its badge.
  await page.evaluate(
    ([key, id]) => {
      const save = JSON.parse(localStorage.getItem(key as string)!) as {
        wardrobe: string[];
        newItems: string[];
      };
      save.wardrobe.push(id as string);
      save.newItems.push(id as string);
      localStorage.setItem(key as string, JSON.stringify(save));
    },
    [SAVE_KEY, 'hearts.heartCardigan'] as const,
  );
  await page.reload();
  await page.getByTestId('room-card-kpop').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('K-pop Playroom');
  await page.getByTestId('dressup-button').click();
  const tile = page.getByTestId('tile-hearts.heartCardigan');
  await expect(tile).toHaveAttribute('data-new', 'true');
  await expect(tile.getByRole('img')).toHaveAttribute('aria-label', 'From the Heart Playroom');
  await tile.click();
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-outfit',
    'hearts.heartCardigan',
  );
  await page.getByTestId('panel-close').click();

  // Rooms are independent: the Heart beanbag stayed in the Heart room, K-pop is untouched.
  await expect(page.locator('.s1').getByTestId('slot-NOOK')).toHaveAttribute(
    'data-item',
    'kpop.purpleCushion',
  );
  await page.reload();
  const save = await readSave(page);
  expect(save.themes.hearts.slots['NOOK']).toBe('hearts.heartBeanbag');
  expect(save.themes.kpop.slots['NOOK']).toBe('kpop.purpleCushion');
  expect(save.heroine.outfit).toBe('hearts.heartCardigan');
  expect(save.settings).toMatchObject({ language: 'en' });
});

test('flow 7b: K-pop Playroom delivery mission, Music lamp lights the room, jacket worn', async ({
  page,
}) => {
  await seedSave(page, seededSave());
  await page.goto('/');
  await page.getByTestId('room-card-kpop').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('K-pop Playroom');
  await expect(page.locator('.s1').getByTestId('room-companion')).toHaveAttribute(
    'aria-label',
    'Bori',
  );
  // Bori jumps onto the bed when it is tapped (the Space-style reaction), dances when tapped.
  await page.locator('.s1').getByTestId('slot-BED').click();
  await expect(page.locator('.s1').getByTestId('room-companion')).toHaveClass(/react-jump/);
  await page.locator('.s1').getByTestId('room-companion').click();
  await expect(page.locator('.s1').getByTestId('room-companion')).toHaveClass(/react-dance/);

  await page.getByTestId('mission-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a mission');
  await expect(page.getByTestId('mission-card-B')).toContainText('Tour-bus delivery');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Glowing music lamp');
  await expect(page.getByTestId('prizes-waiting')).toContainText('Pop-star jacket');
  await page.getByTestId('start-B').click();
  await expect(page.getByTestId('s4')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'The tour bus is on its way!',
  );
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    expect(m.theme).toBe('kpop');
    await expect(page.getByTestId('journey')).toHaveAttribute('data-solved', String(i));
    await solveWithMouse(page, m);
  }

  await expect(page.getByTestId('s5')).toBeVisible();
  await expect(page.getByTestId('celebration')).toHaveClass(/celebration-kpop/);
  await page.getByTestId('prize-tile-kpop.popJacket').click();
  await expect(page.getByTestId('apply-button')).toHaveText('Wear it');
  await page.getByTestId('apply-button').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('K-pop Playroom');
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-outfit',
    'kpop.popJacket',
  );

  // The music lamp is next in the pool; granted, placed and switched on it lights the room.
  await expect.poll(async () => (await readSave(page)).heroine.outfit).toBe('kpop.popJacket');
  await page.evaluate(
    ([key, id]) => {
      const save = JSON.parse(localStorage.getItem(key as string)!) as {
        themes: Record<string, { owned: string[] }>;
        newItems: string[];
      };
      save.themes['kpop']!.owned.push(id as string);
      save.newItems.push(id as string);
      localStorage.setItem(key as string, JSON.stringify(save));
    },
    [SAVE_KEY, 'kpop.musicLamp'] as const,
  );
  await page.reload();
  await page.getByTestId('room-card-kpop').click();
  // The room focuses its heading itself; shortcut keys go in after that (Preact effects defer).
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.keyboard.press('d');
  await page.getByTestId('tile-kpop.musicLamp').click();
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.locator('.s1').getByTestId('slot-LAMP')).toHaveAttribute(
    'data-item',
    'kpop.musicLamp',
  );
  await page.keyboard.press('Escape');
  await page.locator('.s1').getByTestId('slot-LAMP').click();
  await expect(page.getByTestId('room-lighting')).toBeVisible();
  await expect.poll(async () => (await readSave(page)).themes.kpop.lampOn).toBe(true);
  const save = await readSave(page);
  expect(save.themes.hearts.lampOn).toBe(false);
  expect(save.themes.space.lampOn).toBe(false);
});

test('flow 7c: a save from before the new rooms loads with four rooms and nothing lost', async ({
  page,
}) => {
  const save = grantItems(seededSave(), 'sweet', ['sweet.flowerCushion'], ['sweet.catSlippers']);
  save.themes.sweet.slots.NOOK = 'sweet.flowerCushion';
  save.heroine.shoes = 'sweet.catSlippers';
  save.themes.space.stars = 4;
  const legacy = JSON.parse(JSON.stringify(save)) as {
    themes: Record<string, unknown>;
    progress: { firstE3Done: Record<string, boolean> };
  };
  delete legacy.themes['hearts'];
  delete legacy.themes['kpop'];
  legacy.progress.firstE3Done = { space: true, sweet: false };
  await page.addInitScript(
    ([key, json]) => {
      if (sessionStorage.getItem('mcr.e2e.seeded') === '1') return;
      sessionStorage.setItem('mcr.e2e.seeded', '1');
      localStorage.setItem(key, json);
    },
    [SAVE_KEY, JSON.stringify(legacy)] as const,
  );
  await page.goto('/');
  // No language dialog: the save was accepted, not replaced by a fresh one.
  await expect(page.getByTestId('room-card-hearts')).toBeVisible();
  await expect(page.getByTestId('switch-en')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('room-card-sweet').click();
  await expect(page.locator('.s1').getByTestId('slot-NOOK')).toHaveAttribute(
    'data-item',
    'sweet.flowerCushion',
  );
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'sweet.catSlippers',
  );
  await expect(page.getByTestId('collected')).toContainText('2 / 12 collected');
  await page.getByTestId('rooms-button').click();
  await page.getByTestId('room-card-hearts').click();
  await expect(page.getByTestId('collected')).toContainText('0 / 12 collected');
  await expect(page.locator('.s1').getByTestId('slot-NOOK')).toHaveAttribute(
    'data-item',
    'hearts.pinkCushion',
  );
  await expect(page.locator('.s1').locator('.heroine')).toHaveAttribute(
    'data-shoes',
    'sweet.catSlippers',
  );
  // Opening a room writes the save back (last room used), now in the four-room shape.
  await expect
    .poll(async () => Object.keys((await readSave(page)).themes).sort())
    .toEqual(['hearts', 'kpop', 'space', 'sweet']);
  const stored = await readSave(page);
  expect(stored.themes.space.stars).toBe(4);
  expect(stored.themes.kpop.owned).toHaveLength(7);
});
