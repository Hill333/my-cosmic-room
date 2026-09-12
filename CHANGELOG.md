# Changelog

All notable changes to My Cosmic Room. Milestones follow docs/SPEC.md §18.

## Unreleased — M1 Clock engine

- `core/elapsed.ts`: `formatDuration` and `formatJump` (SPEC §8.2, via the string table),
  `durationChoices` (§8.3) and `decomposeJumps` (§8.4).
- `core/generate.ts`: `pickTarget` with the new-minutes weighting, `makeReadingChoices` (§7.4
  mistake-modelling distractors), `makeActivityAMission` (§7.3), `pickInterval` and
  `makeActivityBMission` (§7.5, `firstEverAtE3` → 14:30 → 19:15 as puzzle 4). `core/rng.ts`
  holds the seeded PRNG and shuffle so every mission replays from its seed (§7.6).
- `core/mission.ts`: reducer for start / answer / hint / next / choose / apply / keep / leave
  (§10.1) with the single guarded completion, star fallback, history and recent-target lists.
  `Mission` gained a `current` record (wrong attempts, hint, solved) for the puzzle on screen;
  the save validator checks it.
- `core/inventory.ts`: `nextPair`, `pool`, `grantItem`, `placeItem`, `wearItem`, `addStar` and an
  `inventoryReducer` (place, wear, remove extra, lamp) next to the existing invariant checker.
- `core/time.ts`: SET maths (`pointerAngle`, `dragMinuteHand`, `dragHourHand`, `stepSetTime`,
  `initialSetTime`, §6.4).
- `ui/components/AnalogClock.tsx` (§6.1 geometry, hands via `rotate(angle 100 100)`, level ticks,
  ghost hands, day-period badge, `hitTestHand`), `DigitalDisplay.tsx` (§6.2) and `SetClock.tsx`
  (§6.4: hand drag with pointer capture, step buttons, arrow keys and Enter).
- Store: mission and inventory events dispatch through the same single-signal root reducer;
  `newSeed()` honours `?seed=<n>` in dev builds.
- Dev harness at `?screen=harness` (dev builds only, loaded on demand): clocks at every level,
  digital displays, SET playground, generator listing and a reducer walkthrough that renders
  READ, MATCH, SET and ELAPSED puzzles with the components.
- Two new strings (`a.set.clockLabel`, `clock.analog`) in EN/TR/NL.
- Unit tests AT-01 to AT-22 and AT-33 (126 tests, up from 46): 5,000 seeded missions per level
  for AT-05 to AT-10 and AT-15, 10,000 random reducer events for AT-33.
- `npm run e2e` now selects the `chrome` project (installed Google Chrome) so it runs locally
  without a Playwright browser download; CI still runs `--project=chromium-ci`.
- Deviation noted in code: §7.2 says the non-new minutes come from the full allowed set, which
  gives about 80 % new minutes; AT-09 requires 50–70 %, so `pickTarget` draws the remainder
  from the other allowed minutes (about 60 %).

## Unreleased — M0 Skeleton

- Vite + Preact + TypeScript (strict) project with ESLint, Prettier, Vitest and Playwright.
- Module map from SPEC §16.2: `core/` (time, save, inventory invariants, settings reducer;
  elapsed/generate/mission typed stubs for M1), `catalog/` (full first-release catalogue),
  `strings/` (EN/TR/NL string table), `ui/` (Stage, S0, S1 stub), `state/` (single-signal store
  with debounced autosave and backup).
- Save format v1 with validation, backup restore, quarantine, export/import and reset.
- `assets/manifest.json` (134 entries) generated from the catalogue; SVG placeholders for all;
  build gate `tools/check-assets.ts`.
- `tools/gen-assets.ts` drives Codex CLI with the sol-med (`gpt-5.6-sol`, medium) and astra-light
  (`gpt-6-astra`, low) presets. Smoke test passed: Star lamp (sol-med) and Moon bed (astra-light)
  generated into `assets/.gen/space/decorations/`.
- S0 Title with first-launch language choice, two room cards, language switch, sound toggle.
- Unit tests AT-01 to AT-04, AT-31, AT-32 (plus catalogue and string-table checks); e2e smoke
  for S0 and persistence; CI workflow running lint, typecheck, unit tests, build and e2e.
