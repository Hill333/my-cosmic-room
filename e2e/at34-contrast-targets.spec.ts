import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  completeMission,
  grantSpace,
  holdGear,
  seedForMission,
  seedSave,
  seededSave,
  solveWithMouse,
  startMission,
  waitForMission,
  wrongValue,
} from './helpers.ts';

/**
 * AT-34 (SPEC §17.7, §13.1, §13.2): on every screen and panel, every enabled pointer target
 * is at least 64 × 64 stage px and every run of text has at least 4.5:1 contrast (3:1 for
 * symbol icons such as ✓ ✕ ★) against its composited background. The audit runs inside the
 * page (`e2e/browser/audit.js`); text over a gradient or image is listed rather than guessed
 * and must be on the reviewed allowlist below (see docs/ACCESSIBILITY_REVIEW.md).
 */

const AUDIT = readFileSync(new URL('./browser/audit.js', import.meta.url), 'utf8');
const MIN_TARGET = 64;
const MIN_TEXT = 4.5;
const MIN_SYMBOL = 3;
/** Text drawn straight on the S0 gradient (reviewed by hand: ≥ 6:1 at every point). */
const GRADIENT_ALLOWLIST = new Set(['.title-lockup', '.s0-sub']);

interface Audit {
  scale: number;
  targets: { id: string; text: string; w: number; h: number }[];
  text: {
    id: string;
    text: string;
    kind: 'text' | 'symbol';
    ratio: number | null;
    bg: string;
    fg?: string;
    size?: number;
  }[];
}

async function audit(page: Page, screen: string): Promise<void> {
  const result = (await page.evaluate(AUDIT)) as Audit;
  expect(result.targets.length, `${screen}: no targets found`).toBeGreaterThan(0);
  expect(result.text.length, `${screen}: no text found`).toBeGreaterThan(0);
  if (process.env['AUDIT_DUMP']) console.log(screen, JSON.stringify(result, null, 1));
  const smallTargets = result.targets.filter((t) => t.w < MIN_TARGET || t.h < MIN_TARGET);
  expect(
    smallTargets.map((t) => `${t.id} "${t.text}" ${t.w}×${t.h}`),
    `${screen}: targets under ${MIN_TARGET} stage px`,
  ).toEqual([]);
  const lowContrast = result.text.filter(
    (t) => t.ratio !== null && t.ratio < (t.kind === 'text' ? MIN_TEXT : MIN_SYMBOL),
  );
  expect(
    lowContrast.map((t) => `${t.id} "${t.text}" ${t.fg} on ${t.bg} = ${t.ratio}:1`),
    `${screen}: text under the contrast minimum`,
  ).toEqual([]);
  const unknown = result.text.filter((t) => t.ratio === null && !GRADIENT_ALLOWLIST.has(t.id));
  expect(
    unknown.map((t) => `${t.id} "${t.text}"`),
    `${screen}: text on an unreviewed gradient or image background`,
  ).toEqual([]);
}

test('AT-34: S0, S1 with both panels, S2, S6', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page, 'S0 first launch');
  await page.getByTestId('lang-en').click();
  await expect(page.getByTestId('room-card-space')).toBeFocused();
  await audit(page, 'S0');

  await page.getByTestId('room-card-space').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Space Playroom');
  await audit(page, 'S1');
  await page.getByTestId('decorate-button').click();
  await expect(page.getByTestId('decorate-panel')).toBeVisible();
  await audit(page, 'S1 decorate panel');
  await page.getByTestId('dressup-button').click();
  await expect(page.getByTestId('dressup-panel')).toBeVisible();
  await audit(page, 'S1 dress-up panel');
  await page.getByTestId('tab-extra').click();
  await expect(page.getByTestId('tile-nothing')).toBeVisible();
  await audit(page, 'S1 dress-up panel, Extras');
  await page.keyboard.press('Escape');

  await page.getByTestId('mission-button').click();
  await expect(page.getByTestId('s2')).toBeVisible();
  await audit(page, 'S2');
  await page.getByTestId('back-button').click();

  await holdGear(page);
  await audit(page, 'S6');
  await page.getByTestId('s6-lock').click();
  await audit(page, 'S6 with the lock on');
  await page.getByTestId('s6-done').click();
  await page.getByTestId('mission-button').click();
  await expect(page.getByTestId('levels-locked').first()).toBeVisible();
  await audit(page, 'S2 with locked levels');
});

test('AT-34: S3 READ, MATCH, SET and DIGITS with hints, wrong picks and the leave dialog', async ({
  page,
}) => {
  const base = seededSave();
  // Opens with a READ and contains a DIGITS (D20), so the digital builder is audited too.
  const seed = seedForMission(
    base,
    'space',
    'A',
    (ps) => ps[0]!.kind === 'READ' && ps.some((p) => p.kind === 'DIGITS'),
  );
  await seedSave(page, startMission(base, 'space', 'A', seed));
  await page.goto('/');
  await expect(page.getByTestId('s3')).toBeVisible();

  const seen = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    const p = m.puzzles[i]!;
    if (!seen.has(p.kind)) {
      seen.add(p.kind);
      await audit(page, `S3 ${p.kind}`);
      if (p.kind !== 'SET' && p.kind !== 'DIGITS') {
        // A wrong pick shows ✕ "Try again" on the option and the feedback line.
        const wrong = p.choices!.find((c) => c !== p.target)!;
        await page.locator(`[data-testid="answer"][data-value="${wrong}"]`).click();
        await expect(page.getByTestId('feedback')).toContainText('✕');
        await audit(page, `S3 ${p.kind} after a wrong pick`);
      }
      await page.getByTestId('hint-button').click();
      await expect(page.getByTestId('hint-button')).toHaveAttribute('aria-pressed', 'true');
      await audit(page, `S3 ${p.kind} with the hint`);
    }
    if (i === 0) {
      await page.getByTestId('leave-button').click();
      await expect(page.getByTestId('leave-dialog')).toBeVisible();
      await audit(page, 'S3 leave dialog');
      await page.getByTestId('leave-cancel').click();
    }
    await solveWithMouse(page, m);
  }
  const asBase = (k: string) => (k === 'DIGITS' ? 'MATCH' : k);
  expect(
    [...seen]
      .filter((k) => k !== 'SHIFT')
      .map(asBase)
      .sort(),
  ).toEqual(['MATCH', 'READ', 'SET']);
  await expect(page.getByTestId('s5')).toBeVisible();
  await audit(page, 'S5 after the mission');
});

test('AT-34: S4 ELAPSED and ARRIVE with the jump timeline, S5 seeded', async ({ page }) => {
  const save = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  save.settings.elapsedLevel = 3;
  await seedSave(page, startMission(save, 'space', 'B', 11));
  await page.goto('/');
  await expect(page.getByTestId('s4')).toBeVisible();
  await audit(page, 'S4');
  // Every B mission has an ARRIVE (D20) among an ELAPSED and maybe a SCHEDULE: audit each
  // kind once with a wrong pick and the jumps open.
  const seen = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const m = await waitForMission(page, i);
    const p = m.puzzles[i]!;
    if (!seen.has(p.kind)) {
      seen.add(p.kind);
      await page.locator(`[data-testid="answer"][data-value="${wrongValue(p)}"]`).click();
      await page.getByTestId('show-jumps').click();
      await expect(page.getByTestId('jump-timeline')).toBeVisible();
      await audit(page, `S4 ${p.kind} with a wrong pick and the jumps`);
    }
    await solveWithMouse(page, m);
    if (i === 0) await audit(page, 'S4 puzzle 2');
  }
  expect(seen).toContain('ARRIVE');
  expect(seen).toContain('ELAPSED');
});

test('AT-34: S5 from a completed mission', async ({ page }) => {
  const save = grantSpace(seededSave(), ['space.moonBed'], ['space.cloudPyjamas']);
  await seedSave(page, completeMission(startMission(save, 'space', 'A', 3)));
  await page.goto('/');
  await expect(page.getByTestId('s5')).toBeVisible();
  await audit(page, 'S5');
  await page.locator('.prize-tile').nth(1).click();
  await audit(page, 'S5 with the second prize selected');
});
