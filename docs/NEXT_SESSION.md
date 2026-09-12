# Next-session handoff

## Suggested opening prompt

> Read README.md, CHANGELOG.md, docs/SPEC.md and docs/NEXT_SESSION.md in this project. Milestones M0 and M1 are committed. Continue with milestone M2 (missions playable) from SPEC §18: S2, S3, S4 and S5 in the Space theme with placeholder art, hints, feedback and keyboard operation, following the module map in §16.2 and the acceptance tests in §17. Keep placeholder art. Do not deploy or publish anything unless I ask; commit only when I ask.

## What exists now

- [docs/PRD.md](PRD.md) and [docs/SPEC.md](SPEC.md): unchanged product requirements and specification.
- M0 (see [CHANGELOG.md](../CHANGELOG.md)): Vite + Preact + TypeScript scaffold; `src/core` time and save layers; `src/catalog`; `src/strings` (EN/TR/NL); `src/state` (single-signal store, autosave); `src/ui` (Stage, S0 title, S1 room stub); `assets/manifest.json` with 134 entries and SVG placeholders; `tools/`.
- M1 (clock engine), all in `src/core` unless noted:
  - `elapsed.ts`: `formatDuration`, `formatJump`, `durationChoices`, `decomposeJumps`.
  - `generate.ts`: `READING_LEVELS`, `ELAPSED_LEVELS`, `pickTarget`, `makeReadingChoices`, `makeActivityAMission`, `pickInterval`, `makeActivityBMission`, `REQUIRED_E3_PAIR`; `rng.ts`: `createRng`, `shuffle`, `pick`, `randomInt`, `chance`.
  - `mission.ts`: `missionReducer` with events `mission/start {theme, activity, seed, now}`, `mission/answer {choice, seconds}` (`choice` is the chosen value: a time for READ/MATCH/SET, a duration for ELAPSED), `mission/hint`, `mission/next`, `mission/choose {item}`, `mission/apply {now}`, `mission/keep {now}`, `mission/leave`; `isCorrectAnswer`. `Mission.current = { wrongAttempts, hintUsed, solved }` tracks the puzzle on screen; `next` advances `index` and performs the single guarded completion at 4.
  - `inventory.ts`: `nextPair`, `pool`, `grantItem`, `placeItem`, `wearItem`, `addStar`, `inventoryReducer` (`inventory/place`, `inventory/wear`, `inventory/removeExtra`, `inventory/lamp`).
  - `time.ts`: SET maths (`pointerAngle`, `dragMinuteHand`, `dragHourHand`, `stepSetTime`, `initialSetTime`).
  - `src/ui/components/AnalogClock.tsx` (props: `time`, `level`, `theme`, `size`, `label`, `decorative`, `ghost`, `period`), `DigitalDisplay.tsx` (`time`, `mode`, `caption`, `size: 'big' | 'button'`, `label`), `SetClock.tsx` (`target`, `level`, `theme`, `showGhost`, `period`, `status`, `disabled`, `onCheck`, `onChange`; drag, buttons, arrow keys, Enter).
  - `src/state/store.ts`: `dispatch` routes `mission/*` and `inventory/*` events; `mission` computed signal; `newSeed()` honours `?seed=<n>` in dev builds. `src/state/nav.ts` knows `{ id: 'harness' }`.
  - Dev harness `src/ui/screens/DevHarness.tsx` at `?screen=harness` (dev only, dynamic import). Its `PuzzleView` renders READ, MATCH, SET and ELAPSED with the components and is a starting point for S3/S4.
- Tests: 126 unit (Vitest; AT-01 to AT-22, AT-31 to AT-33 plus helpers), 2 e2e (Playwright on the installed Google Chrome, project `chrome`). CI workflow runs lint, typecheck, unit, build and e2e.
- No deployment.

## Decisions

The §19.4 confirmations (D1, D3, D4, D5, D11, D9, D16) were presented on 12 September 2026 and not overridden, so the proposals stand. The user can still change them; SPEC §1 lists what each override touches.

M1 recorded one deviation in `generate.ts`: §7.2's literal rule (non-new minutes from the full allowed set) yields about 80 % new minutes, contradicting AT-09's 50–70 % window; `pickTarget` draws the remainder from the level's other allowed minutes instead (about 60 %). Choices also reject a candidate that shares a face with the target twelve hours apart in 24-hour mode (stricter than §7.4).

## M2 scope (SPEC §18)

Deliverable: S2, S3, S4, S5 in the Space theme with placeholder art; hints; feedback; keyboard operation. Done when AT-28 and smoke flows 1 and 3 (§17.8) pass with placeholders.

1. S2 Mission board (§3.5): two mission cards, level chips (`settings/readingLevel`, `settings/elapsedLevel`; disabled with a lock icon when `levelsLocked`, AT-29), "Prizes waiting" from `nextPair`, Start dispatches `mission/start` with `newSeed()` and navigates to S3/S4. Enable "Choose a mission" on S1 (currently disabled) and the M key.
2. S3 Activity A (§3.6, §9.1, §9.2): panel with mission name and story line, question line, READ (AnalogClock 440 px + three `DigitalDisplay` answer buttons), MATCH (big display + three 240 px clock buttons labelled Clock A/B/C), SET (`SetClock`, Check). Wrong option: shake, ✕ + "Try again", disabled and dimmed, `mission/answer` with the wrong value; after two wrong picks only the correct option stays enabled. Correct: ✓ icon, "Next" appears and receives focus, tracker advances. Options never re-shuffle. Bottom row: Hint, "Question k of 4" with dots, Next.
3. S4 Activity B (§3.7, §8.5): journey strip, Leaves/Arrives displays (24-hour), three duration buttons (`formatDuration`), collapsible "Show the jumps" timeline (`JumpTimeline` component from `decomposeJumps`, equal spacing, 300 ms reveal, instant under reduced motion).
4. Hints (§9.3): READ sweep + counter and hour-hand caption (`hint.minutes`, `hint.hourPast`, `hint.hourExact`), MATCH split captions, SET ghost hands (`SetClock showGhost`), ELAPSED timeline; each dispatches `mission/hint` once per puzzle.
5. S5 Mission complete (§3.8): reads `mission.state === 'COMPLETED' | 'CLAIMED'`; tiles for `prizePair`, `mission/choose` on selection, "Put it in my room" / "Wear it" → `mission/apply`, "Keep playing" → `mission/keep`; star card when `claimed === 'star'`. Reload on S5 must reopen S5 (nav from save state).
6. Leave dialog (§10.1 leave, strings `leave.*`) dispatching `mission/leave`; Escape handling; focus management (§13.1, §13.4: focus to the heading on navigation, dialogs trap focus).
7. Resume: `nav.ts` initial screen from `save.mission` (S3/S4 while IN_PROGRESS, S5 when COMPLETED/CLAIMED) for AT-30.
8. Playwright: smoke flow 1 (first launch → Space → mission A R2 → four correct answers → prize applied → visible in room → reload persists) and flow 3 (keyboard-only mission A including SET via arrow keys). The harness is not in production builds, so e2e must go through the real screens.

## Context to retain

- The child is seven and already reads whole hours. Defaults: Reading R2 (half hours), Elapsed E1 (whole-hour gaps).
- 14:30 → 19:15 = 4 hours 45 minutes, distractors 4 h 15 min and 5 h, jumps +4 h → 18:30, +30 min → 19:00, +15 min → 19:15; guaranteed as puzzle 4 of each theme's first completed E3 mission (`progress.firstE3Done` is set on completion, not on start, so leaving the mission keeps the example for the next attempt).
- Hour hand moves continuously (3:30 → 105°). No timers, lives, penalties, purchases, ads, analytics or accounts.
- `core/` must stay free of DOM and Preact imports (enforced by ESLint). Pointer handlers in `SetClock` read live values from refs because pointer events can outrun re-renders.
- Not yet implemented and left for M2/M3: the progression suggestion streak (`progress.suggestion`, §7.1) is never updated; the "New" badge (§10.1) has no save field yet (an owned-but-never-placed/worn set or a `newItems` list would need a save migration or an additive optional field); sounds and reduced-motion checks beyond the CSS media query.
- SPEC §7.2 vs AT-09 discrepancy (see Decisions) is worth raising with the user when convenient; the code comment in `pickTarget` explains the choice.
