/**
 * Review screenshots for docs/screenshots/ (M3b): both rooms on S1 with the heroine and the
 * new backdrops, the dress-up panel, S3 with the thinking face and S5. Runs against the dev
 * server (`npm run dev` on port 5173 by default) with the installed Google Chrome, seeding a
 * save that owns every earnable item. Not part of the app bundle.
 *
 *   node tools/screenshots.ts [--url http://localhost:5173]
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { completeMission, startMission } from '../e2e/helpers.ts';
import { allItems } from '../src/catalog/index.ts';
import { createFreshSave } from '../src/core/save.ts';
import type { Save } from '../src/core/types.ts';
import { ROOT } from './lib/manifest.ts';

const SAVE_KEY = 'mcr.save.v1';
const OUT = resolve(ROOT, 'docs', 'screenshots');
const url = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]!
  : 'http://localhost:5173';

const save = createFreshSave();
save.settings.language = 'en';
for (const item of allItems) {
  if (item.starter) continue;
  if (item.kind === 'decoration') save.themes[item.theme as 'space' | 'sweet'].owned.push(item.id);
  else save.wardrobe.push(item.id);
}
save.themes.space.slots = {
  BED: 'space.moonBed',
  RUG: 'space.rainbowRug',
  LAMP: 'space.starLamp',
  WALL: 'space.galaxyPoster',
  SHELF: 'space.astroBunny',
  HANGING: 'space.planetMobile',
  NOOK: 'space.purpleBeanbag',
};
save.themes.sweet.slots = {
  BED: 'sweet.daisyBed',
  RUG: 'sweet.pastelRug',
  LAMP: 'sweet.heartLamp',
  WALL: 'sweet.sunPoster',
  SHELF: 'sweet.bunnyPlush',
  HANGING: 'sweet.butterflyMobile',
  NOOK: 'sweet.flowerCushion',
};
save.heroine = {
  hair: 'shared.hairBuns',
  outfit: 'shared.outfitPlanetTee',
  shoes: 'shared.shoesSneakers',
  extra: null,
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1536, height: 1024 },
  deviceScaleFactor: 1,
});

async function open(path: string, heroine?: Partial<typeof save.heroine>, base: Save = save) {
  const seeded = { ...base, heroine: { ...base.heroine, ...heroine } };
  await page.addInitScript(([key, json]) => localStorage.setItem(key, json), [
    SAVE_KEY,
    JSON.stringify(seeded),
  ] as const);
  await page.goto(`${url}${path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

async function shot(name: string) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log(`docs/screenshots/${name}.png`);
}

await open('/?screen=S1', {
  outfit: 'space.spacesuit',
  shoes: 'space.spaceBoots',
  extra: 'space.rocketBackpack',
});
await shot('space-room');
await page.getByRole('button', { name: 'Dress up' }).click();
await page.waitForTimeout(500);
await shot('dress-up-clothes');
await page.getByTestId('tab-shoes').click();
await page.waitForTimeout(300);
await shot('dress-up-shoes');
await page.getByTestId('tab-extra').click();
await page.waitForTimeout(300);
await shot('dress-up-extras');
await page.getByTestId('tab-hair').click();
await page.waitForTimeout(300);
await shot('dress-up-hair');

await open('/?screen=S1&theme=sweet', {
  outfit: 'sweet.strawberryDress',
  shoes: 'sweet.rainbowSandals',
  extra: 'sweet.bowHeadband',
  hair: 'shared.hairLoose',
});
await shot('sweet-room');

await open('/', {
  outfit: 'space.cloudPyjamas',
  shoes: 'space.bunnySlippers',
  extra: 'space.starClip',
});
await shot('title-cards');

// S5 after a completed Space mission (the heroine wears the happy face on the celebration).
const done = completeMission(startMission(structuredClone(save), 'space', 'A', 7));
await open('/', { outfit: 'shared.outfitFloralSweater', shoes: 'shared.shoesMaryJanes' }, done);
await shot('mission-complete');

await browser.close();
