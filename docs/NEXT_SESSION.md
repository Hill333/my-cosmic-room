# Next-session handoff

## Suggested opening prompt

> Read README.md, CHANGELOG.md, docs/SPEC.md and docs/NEXT_SESSION.md in this project. Milestone M0 is committed. Continue with milestone M1 (clock engine) from SPEC §18, following the module map in §16.2 and acceptance tests AT-01 to AT-22 in §17. Keep placeholder art. Do not deploy or publish anything unless I ask; commit only when I ask.

## What exists now

- [docs/PRD.md](PRD.md) and [docs/SPEC.md](SPEC.md): unchanged product requirements and specification.
- M0 implemented and committed (see [CHANGELOG.md](../CHANGELOG.md)): Vite + Preact + TypeScript scaffold; `src/core` (time, save, inventory invariants, settings reducer; `elapsed.ts`, `generate.ts`, `mission.ts` are typed stubs); `src/catalog` (complete first-release catalogue); `src/strings` (EN/TR/NL); `src/state` (single-signal store, autosave); `src/ui` (Stage, S0 title, S1 room stub); `assets/manifest.json` with 134 entries and SVG placeholders; `tools/` (build-manifest, gen-placeholders, check-assets, gen-assets).
- Codex CLI smoke test passed: `assets/.gen/space/decorations/starLamp.png` (sol-med) and `moonBed.png` (astra-light). Presets: astra-light = `gpt-6-astra` at effort low, sol-med = `gpt-5.6-sol` at effort medium, pinned in `tools/gen-assets.ts`.
- Tests: 46 unit (Vitest), 2 e2e (Playwright on the installed Google Chrome, project `chrome`). CI workflow runs lint, typecheck, unit, build and e2e.
- No deployment.

## Decisions

The §19.4 confirmations (D1, D3, D4, D5, D11, D9, D16) were presented on 12 September 2026 and not overridden, so the proposals stand. The user can still change them; SPEC §1 lists what each override touches.

## M1 scope (SPEC §18)

Deliverable: AnalogClock, DigitalDisplay, time maths, generators, elapsed decomposition, mission reducer. Done when AT-01 to AT-22 pass with a placeholder UI harness.

1. `core/elapsed.ts`: `formatDuration` (§8.2, via string helpers), `durationChoices` (§8.3), `decomposeJumps` (§8.4). Tests AT-11 to AT-14, AT-16.
2. `core/generate.ts`: `pickTarget` with §7.2 weighting, `makeReadingChoices` (§7.4), `makeActivityAMission` (§7.3), `pickInterval` and `makeActivityBMission` (§7.5, `firstEverAtE3`). Tests AT-05 to AT-10, AT-15, AT-17, property-based over 5,000 seeded missions per level.
3. `core/mission.ts` reducer (§10.1) and `core/inventory.ts` `nextPair`, place, wear, stars (§10.2–§10.5). Tests AT-18 to AT-22, AT-33 property test on §11.4 invariants.
4. `ui/components/AnalogClock.tsx` (§6.1 geometry, hands via `rotate(angle 100 100)`), `DigitalDisplay.tsx` (§6.2), SET interaction (§6.4: drag, buttons, keyboard).
5. A dev harness screen (dev builds only, `?screen=harness`) to eyeball clocks at every level.

## Context to retain

- The child is seven and already reads whole hours. Defaults: Reading R2 (half hours), Elapsed E1 (whole-hour gaps).
- 14:30 → 19:15 = 4 hours 45 minutes, distractors 4 h 15 min and 5 h, jumps +4 h → 18:30, +30 min → 19:00, +15 min → 19:15; guaranteed in each theme's first E3 mission.
- Hour hand moves continuously (3:30 → 105°). No timers, lives, penalties, purchases, ads, analytics or accounts.
- `core/` must stay free of DOM and Preact imports (enforced by ESLint).
