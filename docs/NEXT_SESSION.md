# Next-session handoff

## Suggested opening prompt

> Read README.md, docs/SPEC.md and docs/PRD.md in this project. The specification is complete; its §1 decision register resolves every open decision as a proposal and §19.4 lists the ones I should confirm first. Ask me those confirmations in one message, then start implementation from milestone M0 in SPEC §18, following the module map in §16.2 and the tests in §17. Build with placeholder art first. Do not deploy or publish anything unless I ask.

## What exists now

- [docs/PRD.md](PRD.md): concept-approved product requirements (unchanged).
- [docs/SPEC.md](SPEC.md): full specification. Every requirement is tagged [C] confirmed, [P] proposed or [D] deferred. Covers screens and flows, room and wardrobe, two-theme state, clock rendering and manipulation, level tables and generators, elapsed-time maths and hints, validation and feedback, mission/reward state machine, catalogue and save format, repeat play, accessibility and language, string table seed (EN + TR + NL), asset inventory and production approach including the Codex CLI generation pipeline (§15.6), implementation boundaries, acceptance tests AT-01 to AT-38, milestones M0 to M5.
- [docs/concepts/](concepts/README.md): six concept images; references only, not game art.
- No source code, no dependencies, no site registration, no deployment. The git repository has no commits yet.

## Decisions to confirm before coding (SPEC §1, §19.4)

1. D1 Language: string table with English, Turkish and Dutch (Dutch was requested on 12 September 2026 and is confirmed), first-launch language choice. Alternative: fewer languages.
2. D3 Rewards: 12 earnable items per theme in two collections, prize pair previewed before and chosen after the mission, stars after the pool is empty. Alternative: fewer items or choose-before.
3. D4 Room interaction: seven typed placement slots, no dragging. Alternative: constrained dragging.
4. D5 Character: one shared heroine, wardrobe shared across rooms, hair included with three styles.
5. D11 Reading puzzles use 12-hour digits ("3:30") by default; a parent toggle enables 24-hour digits with a day-period badge.
6. D9 Title: keep "My Cosmic Room" or pick one of the candidates in the register.
7. D16 Asset generation presets are confirmed (astra-light for high-complexity assets because astra is the more capable model, sol-med for low-complexity ones). Only the exact model identifiers behind the two preset names still need verifying against the installed Codex CLI.

Everything else in the register (persistence, audio, browsers, stack, hosting, mission names, companions) can be changed later without rework.

## Context to retain

- The child is seven and already reads whole hours. Default levels: Reading R2 (half hours), Elapsed E1 (whole-hour gaps).
- Two distinct playrooms are required in the first release; both share the same learning content and reward loop.
- Elapsed time must include 14:30 → 19:15 = 4 hours 45 minutes with distractors 4 h 15 min and 5 h, and the hint jumps +4 h → 18:30, +30 min → 19:00, +15 min → 19:15. The generator guarantees this in each theme's first E3 mission (SPEC §7.5).
- The hour hand must move continuously with the minutes (3:30 → 105°).
- No timers, lives, penalties, purchases, ads, analytics or accounts.
- Asset generation goes through Codex CLI (installed locally, version 0.153.4) using two presets chosen by asset complexity: astra-light (astra is the more capable model) for scenes, characters and multi-part items, sol-med for simple single objects (SPEC §15.6). Only `gpt-6-astra` is configured locally today, so verify the preset names in M0.

## First implementation steps (M0, SPEC §18)

1. Scaffold Vite + Preact + TypeScript (strict), ESLint, Prettier, Vitest, Playwright.
2. Create the module map from SPEC §16.2 with empty modules and the `Save` type from §11.3.
3. Implement `core/time.ts` and `core/save.ts` with their unit tests (AT-01 to AT-04, AT-31, AT-32).
4. Build `Stage` scaling and S0 with placeholder room cards and the language choice.
5. Add the placeholder asset generator and `assets/manifest.json` covering every catalogue id in §11.2.
6. Write `tools/gen-assets.ts` and run the Codex CLI smoke test: one asset with sol-med, one with astra-light (SPEC §15.6).
7. Commit the first milestone when the user asks for a commit.
