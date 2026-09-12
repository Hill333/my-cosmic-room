# Changelog

All notable changes to My Cosmic Room. Milestones follow docs/SPEC.md §18.

## Unreleased — M3 Space room

- Slot geometry is catalogue data (`catalog/slots.ts`): anchor, scale and z-order per slot and
  per theme, plus the heroine, companion and entry-object boxes. `RoomScene` lays the room out
  from it (the asset's manifest `pivot` lands on the anchor); the heroine and Pip stand in
  front of RUG and behind BED and NOOK. Dev aid `?debug=slots` (lazy-loaded, dev builds only)
  draws every box and anchor, nudges geometry with the arrow keys, `[` `]` and copies JSON with
  C, and lists the §15.6 QA checklist.
- S1 (`screens/S1Room.tsx`): Decorate (D) and Dress up (W) buttons open a 440 px `SidePanel`
  on the right while the room scales to the left; the close button and Escape close it and
  focus returns to the panel's button (AT-38). The bottom bar and counter move out from under
  the panel. Sound toggle added top right.
- Decorate mode (`components/DecoratePanel.tsx`, SPEC §4.2): owned decorations grouped by slot
  in table order, 180 × 180 tiles two per row with "In room" / "New" labels. Mouse: click a
  tile, compatible slots get a dashed outline and pulsing marker, click the slot to place;
  clicking elsewhere cancels. Keyboard: arrows between tiles, Enter places into the compatible
  slot. Hover or focus shows a faint ghost in the slot. Placing dispatches `inventory/place`,
  pops the item with a CSS scale and announces it through a live region.
- Dress-up mode (`components/DressUpPanel.tsx`, SPEC §4.4): tabs Clothes / Shoes / Hair /
  Extras (arrow keys, automatic selection), check mark and thick outline on the worn tile,
  immediate `inventory/wear` (Extras has "Nothing" → `inventory/removeExtra`), rocket / heart
  theme badge on earned garments, "What will you earn next?" from `nextPair` with one dot per
  collection. The heroine turns slightly toward the panel.
- "New" badge: additive save field `newItems: ItemId[]` (validated, defaulted to `[]` for
  saves written before it, covered by invariants and `save.test.ts`); `grantItem` adds,
  `placeItem` / `wearItem` remove, so both the reducer path and `mission/apply` clear it.
- Reactions (SPEC §4.3, free play and dress-up mode, never in decorate mode): generic 400 ms
  bob with a sparkle on any placed decoration; LAMP toggles evening lighting (tinted overlay
  with a warm glow at the lamp, persisted through `inventory/lamp`); BED makes Pip jump onto
  the bed and bounce twice; the toy rocket wobbles, puffs smoke and shows its lit-window art
  before opening S2; the heroine waves and blinks; Pip spins with his special pose. All CSS
  keyframes ending on `animationend` (with a timeout fallback), respecting `data-motion`; no
  reaction writes to the save except the lamp.
- Space art through the Codex pipeline (SPEC §15.6): 29 entries generated (14 astra-light,
  15 sol-med, all one attempt, about one minute each): Space room background, seven Space
  starters, Moon bed, Star lamp, Astronaut bunny, heroine reference sheet, Pip's four poses,
  toy rocket and its reaction state, cockpit frame, rocket, launch flame, four step overlays,
  planet, moon, rocket-with-parcel and parcel. Entries are marked `generated`, never
  `approved` (that is the human QA step in the slot overlay). Prompts for wall, floor and
  hanging items now say how the object is seen so it fits its slot.
- `tools/post-assets.ts` (sharp): flood-fill background removal from the borders with a
  feathered edge, crop to the silhouette with 8 px padding, fit to the manifest size without
  enlarging, palette PNG compression, 360 × 360 tile copy, and the manifest entry's `path`,
  `size` and `pivot` updated (pivots keep their ratio). Full-frame art (rooms, cockpit) is
  kept at its native 1536 × 1024 (about 500 KB) instead of being upscaled to 2×.
  `gen-assets.ts` now merges only the finished entry into a fresh read of the manifest, so a
  generator and the post-processor can run side by side.
- Heroine as scripted SVG layers (`tools/gen-heroine.ts`, SPEC §15.2 item 2): body, four
  faces, three hair styles, five outfits (three starters, Cloud pyjamas, spacesuit), four
  shoes (two starters, Bunny slippers, Space boots) and two extras (Star hair clip, Rocket
  backpack) on the shared 600 × 900 template, with wardrobe tiles as cropped views of the same
  drawings. Sweet garments stay placeholders until M4.
- Font (SPEC §13.2): Nunito (SIL OFL) bundled locally as latin and latin-ext WOFF2 subsets,
  variable weight 700–900; ç ğ ı İ ö ş ü ë ï é verified in the browser.
- Strings added in EN/TR/NL: `ui.heroine`, `ui.tiles`, `ui.tabs`, `ui.themeBadge.*`,
  `ui.collectionDots`, `ui.pickSlot`, `ui.placed`, `ui.worn`.
- Fix: the room scene is an isolated stacking context, so slot z-orders no longer cover the S5
  card; in decorate mode the heroine and Pip never intercept a slot click.
- Tests: 130 unit (up from 126: `newItems` load / round trip / validation, "New" badge
  lifecycle); 10 e2e (up from 7): `e2e/at23-apply-decoration.spec.ts` (AT-23),
  `e2e/at24-apply-clothing.spec.ts` (AT-24), `e2e/at25-swap-revert.spec.ts` (AT-25 plus both
  panels by mouse and keyboard, D / W / Escape, focus return, lamp persistence and the other
  reactions leaving the save untouched). `e2e/helpers.ts` gained `seedSave`, `seededSave` and
  `grantSpace` (write-once seeding through `addInitScript`).
- Not done in M3: the story reaction after puzzle 4 (rocket launch before S5) and sounds;
  Rainbow Explorer decorations, the Sweet theme and the title logo remain placeholders (M4);
  the countdown step overlay was generated with segment digits and should be checked against
  the "digits are UI" rule during QA.

## Unreleased — M2 Missions playable

- Screens S2 Mission board (`ui/screens/S2Board.tsx`), S3 Activity A (`S3ActivityA.tsx`), S4
  Activity B (`S4ActivityB.tsx`) and S5 Mission complete (`S5Complete.tsx`), all in the Space
  theme with placeholder art; Sweet renders through the same code with its own strings and
  scene assets.
- S2: two mission cards with level chips (`settings/readingLevel`, `settings/elapsedLevel`;
  disabled with a lock icon and `s2.locked` when `levelsLocked`, AT-29), "Prizes waiting" from
  `nextPair` (or the star count when the pool is empty), Start → `mission/start` with
  `newSeed()`. An existing mission record wins over a new start.
- S3: READ (440 px clock, three digital answer buttons), MATCH (big display, three 240 px clock
  buttons labelled Clock A/B/C), SET (`SetClock`, Check). Wrong picks shake, show ✕ "Try again",
  stay disabled and dimmed without re-shuffling; after two wrong picks only the correct option
  remains. Correct picks show ✓ with a thick outline, rotate three feedback phrases, advance
  the preparation tracker (fuel, hatch, lights, countdown) and reveal "Next", which takes
  focus. Companion Pip switches between idle, hmm (two variants) and cheer (four variants).
- S4: journey strip whose vehicle advances a quarter per solved puzzle, Leaves/Arrives 24-hour
  displays, three duration buttons, collapsible "Show the jumps" hint rendered by
  `JumpTimeline` (equal spacing, arcs with arrowheads, 300 ms reveal per jump, instant under
  reduced motion). The footer's Hint button opens the same panel.
- Hints (§9.3), one per puzzle through `mission/hint`: READ sweeps the minute hand from 12
  while a CSS `@property` counter counts up to "{m} minutes", then highlights the hour hand
  with `hint.hourPast` / `hint.hourExact`; MATCH splits the display into hour and minute parts
  with `hint.matchShort` / `hint.matchLong`; SET shows ghost hands until solved; ELAPSED shows
  the timeline. The Hint button stays focusable after use (pressed state) so keyboard focus is
  never lost.
- S5: dimmed room with CSS confetti, prize tiles with check mark and thick outline, action
  label by kind ("Put it in my room" / "Wear it"), "Keep playing", a live room preview
  (`RoomScene` with the selected item placed or worn), and the star card when
  `claimed === 'star'`. The grant happens on the button press (`mission/choose` then
  `mission/apply` or `mission/keep`), so a reload on S5 shows the same pair and nothing has
  been granted yet.
- Leave dialog (`Dialog` component: focus trap, Escape, focus returned to the opener)
  dispatching `mission/leave`; focus moves to each screen's heading on navigation and to the
  question line on each new puzzle.
- Resume (AT-30): `nav.ts` derives the initial screen from `save.mission` (S3/S4 while
  IN_PROGRESS, S5 when COMPLETED or CLAIMED); `App` routes S3/S4 by the record's activity.
- S1: "Choose a mission" enabled, the toy rocket / letterbox entry object is a button, the M
  key opens the board; returning from S5 with a prize applied shows it in place with a sparkle.
  `RoomScene` extracted from S1 and shared with S5.
- New components: `ChoiceGroup` (arrow keys inside the group, focus recovery when the focused
  option is disabled), `Dialog`, `JumpTimeline`, `Companion`, `RoomScene`, `MissionFrame`
  (frame, tracker, footer). `AnalogClock` gained `sweep`; `SetClock` gained `attempt` (so every
  wrong check shakes) and test ids on its buttons. `SidePanel` and `HoldButton` are not needed
  before M3/M4 and were not created.
- Motion (§13.3): the S6 setting is exposed as `data-motion` on the stage; "reduced" or the
  system preference (when "system") zeroes animation durations and delays and hides confetti.
- Strings added in EN/TR/NL: `ui.answers`, `s5.starCount`. Dev aid `?screen=S2`.
- Fix: on first launch the S0 title no longer steals focus from the language dialog, so Tab
  reaches the language buttons (keyboard-only first launch).
- Playwright (7 e2e, up from 2): `e2e/flow1-first-mission.spec.ts` (smoke flow 1),
  `e2e/flow3-keyboard.spec.ts` (smoke flow 3 and AT-28 for both activities, plus the leave
  dialog), `e2e/at30-resume.spec.ts` (AT-30). Tests run against the production build, so they
  read the autosaved mission from localStorage (`e2e/helpers.ts`) instead of `?seed`.
- Not done in M2: the story reaction after puzzle 4 (rocket launch / tea party animation)
  and sounds; the READ hint counter animates the number inside the translated sentence
  rather than counting in a separate element.

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
