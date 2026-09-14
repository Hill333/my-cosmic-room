# Tick-Tock: two new playrooms — development handoff

Saved 13 September 2026. This folder contains the complete concept-stage handoff. Open the two PNGs as well as this document before implementing.

## User request and status

The user's daughter loved the existing game and requested two additional room themes with similar mechanics: answer questions, win items, decorate, and dress up. Theme 1 is a playroom filled with hearts. Theme 2 is based on **K-pop Demon Hunters**. The user requested conceptual drawings similar to the previous playrooms, then asked to preserve enough context to resume development in a new session.

Two concepts have been generated and saved. No game code, production assets, repository documentation, saves, or deployment were changed in this session. The user has not yet given specific visual revision feedback or approved every pictured item. The concepts are proposed art direction; exact titles, catalog sizes, item choices and scene layouts are not fixed product decisions.

## Correct project and starting point

- Game: **Tick-Tock**, a browser clock-learning game; earlier working title: My Cosmic Room.
- Repository: `/Users/emret/Documents/ChatGPT/saat`.
- This is distinct from the user's DressMakeUp project. Early exploration in this conversation looked at DressMakeUp, but the final images use the correct **saat** references.
- Inspected HEAD: `b5892e117c6637845a8af7f2c156cb08ce0ffff1`; `git status --short` was empty. Recheck both in the next session.
- Stack: Preact, TypeScript, Vite, Vitest, Playwright; Node >=22.12.0.
- Read repository instructions, then `README.md`, `docs/PRD.md`, `docs/SPEC.md`, `docs/NEXT_SESSION.md`, and `docs/concepts/README.md` before changing code.
- The existing handoff calls the project release candidate 0.1.0 and reports 150 unit and 29 end-to-end tests passing. Those are historical repository claims, not tests rerun in this concept session. It also records remaining art/wording/release review work; recheck current status. The user's positive play feedback does not prove every release checklist item is complete.

## Concept files

| File | Direction |
| --- | --- |
| [01-heart-playroom.png](01-heart-playroom.png) | My Heart Room: blush/rose/peach, heart rug and shelving, canopy reading nook, heart garlands and lamp, kind-notes letterbox, heart cardigan, familiar cat companion. |
| [02-kpop-demon-hunters-playroom.png](02-kpop-demon-hunters-playroom.png) | My K-pop Room: purple/lilac/gold, HUNTR/X poster, small karaoke stage, microphones, light sticks, music lamp, pop-star jacket, friendly blue tiger and magpie references, evening city window. |
| [prompts.md](prompts.md) | Exact generation prompts for both drawings, generated with the built-in image tool. |

Both images are 1536 × 1024 landscape mockups. They match the existing rounded dark-plum outlines, cosy painted cartoon room, brown-haired girl with two buns, tactile pastel furniture and large rounded controls. Preserve this family resemblance when making individual production assets. The K-pop room should retain the requested film connection and its musical, friendly fantasy mood.

Original references in the game repository:

- `docs/concepts/01-room-and-wardrobe.png`: Space room, heroine, mission entry, wardrobe and collection UI; primary composition/style reference.
- `docs/concepts/early-playroom.png`: Sweet room palette, toys and cat; supporting reference.
- `docs/concepts/02-space-delivery-elapsed-time.png` and `03-mission-reward.png`: existing mission/reward flow.
- `docs/screenshots/`: actual implemented room and wardrobe screenshots; compare these with the aspirational concepts before implementation.

## Gameplay and scope

Add two rooms alongside Space and Sweet. Reuse the shared clock-learning, four-puzzle mission, reward claiming, inventory, decoration, wardrobe and persistence systems. Preserve existing rooms and earned progress. Existing puzzle kinds are READ, MATCH, SET and ELAPSED; current defaults are Reading 2 / Elapsed 1. The game supports English, Turkish and Dutch.

The mockups show a decorated room on the left and a reward/question preview on the right. Their `8 / 12 collected` is illustrative, not a requirement for twelve rewards. Derive real counts from the catalog. The sample `2 hours after 3:00?` is illustrative too: the existing ELAPSED model asks for a duration between start and end, so do not silently add a new question engine just to reproduce the drawing. Reuse actual mission screens and correct clock rendering. Buttons, text, clocks, reward state and decorations must be real interactive UI, not a single baked screenshot.

Proposed first reward candidates (not an exhaustive approved catalog):

- Hearts: heart lamp, heart beanbag/nook, heart garland, heart cardigan; expandable with a heart rug, wall art and shelf toys.
- K-pop: star microphone, blue tiger plush, purple/gold jacket, glowing music lamp; expandable with stage/nook furnishings, star rug and music wall art.

Distinguish an active companion from an earnable plush decoration in the final catalog; the K-pop concept depicts the tiger in both roles without specifying implementation. A microphone, stage or new clothing should use suitable existing slots/item kinds where possible. No new rhythm/combat mechanics were requested.

## Implementation map and concrete risks

| Area | Files to inspect and extend |
| --- | --- |
| Theme IDs and models | `src/core/types.ts`: `Theme` currently only `'space' \| 'sweet'`; several records depend on it. `src/catalog/types.ts` also hardcodes the two themes in `Collection`. Proposed new IDs: `hearts`, `kpop` (not yet implemented). |
| Catalog registration | `src/catalog/space.ts`, `sweet.ts`, `index.ts`, `shared.ts`, `helpers.ts`; add theme catalogs and collections. Every theme needs starter decorations for all seven slots. |
| Slots and walking | `src/catalog/slots.ts`, `walk.ts`; slots are BED, RUG, LAMP, WALL, SHELF, HANGING, NOOK. Respect layering, floor walking region, item reactions and bed/nook `rest` anchors. |
| Save compatibility | `src/core/save.ts`, `inventory.ts`, `settings.ts`, `src/state/store.ts`. Fresh theme state, theme validation and `firstE3Done` are currently explicit Space/Sweet structures. Add a migration/defaulting path for existing saves before enforcing four-theme validation. Preserve owned items, placements, wardrobe, settings, history and active missions. |
| Storage | Current version is 1, primary key `mcr.save.v1`; backup/quarantine keys share the legacy prefix. Do not orphan old saves by simply renaming the key. Verify load, import, export and round trips with old two-room data. |
| Room selection and screens | `src/ui/screens/S0Title.tsx`, `S1Room.tsx`, `S2Board.tsx`, `S3ActivityA.tsx`, `S4ActivityB.tsx`, `S5Complete.tsx`; inspect two-theme branches and assumptions about two room cards. |
| Room and companion components | `src/ui/components/RoomScene.tsx`, `Companion.tsx`, `SceneLife.tsx`, `MissionFrame.tsx`, `RoomCard.tsx`, `DecoratePanel.tsx`, `DressUpPanel.tsx`; `src/styles/room.css`, `mission.css`. |
| Localization | `src/strings/en.ts`, `tr.ts`, `nl.ts`; add all new labels, mission text and item names through the existing string system. Concept English is not production localization. |
| Assets | `assets/manifest.json`, `src/assets.ts`, `src/assetTypes.ts`, `tools/build-manifest.ts`, `tools/check-assets.ts`, existing asset tooling. Inspect generation workflow before invoking it. |

Search the code and tools for hardcoded `space`/`sweet`, theme arrays, binary ternaries and asset-path selection. Extending the type alone is insufficient.

Production art must be split into room backgrounds, transparent placeable items, tiles, room thumbnails, companion poses and any scene art required by reused activities. Keep earnable items out of the fixed background so removal and replacement work. New outfits require the existing full-body outfit × hairstyle figures, sitting variants, wardrobe tiles and tuned shoe/face/extra anchors; do not treat a jacket thumbnail as a complete wearable. Retain existing art approval metadata and tuned anchors. Do not run manifest rebuilding concurrently with asset generation because both rewrite the manifest.

## Suggested development sequence

1. Read the current repository docs/instructions, inspect actual app screenshots and these concepts, and check git status. Copy this concept folder into a dated repository documentation folder when beginning repository work, so future sessions find it through the repository's concept index.
2. Establish a shared theme list/config where it simplifies the existing implementation. Extend catalog registration, theme selection, strings and persistence with backward-compatible loading and migration tests.
3. Implement one room end to end using the shared gameplay. Add real starter/reward assets and test a mission, reward claim, placement, dress-up, walk/sit interactions and reload. Repeat for the other theme.
4. Verify four-room selection and independent room state, shared wardrobe behavior, old-save import, active-mission resumption, localization, keyboard controls and reduced motion. Ensure existing Space/Sweet flows still pass.
5. Capture actual room, mission and reward screenshots and compare them to the concepts. Update PRD/SPEC/catalog documentation and the repository next-session handoff with actual decisions and remaining work.

Run relevant tests during development; before completing implementation run the repository verification commands:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

Build includes asset validation; Playwright uses the production build and installed Google Chrome. Useful existing tests: `src/core/save.test.ts`, `inventory.test.ts`, `mission.test.ts`, `src/catalog/catalog.test.ts`, `walk.test.ts`, `heroine.test.ts`, `src/strings/strings.test.ts`, `e2e/at26-theme-switch.spec.ts`, `e2e/flow1-first-mission.spec.ts`. Add meaningful coverage for four themes and migration rather than screenshot-only checks.

## Paste into a new session

> Continue development of Tick-Tock in `/Users/emret/Documents/ChatGPT/saat`. Read `/Users/emret/Documents/Codex/2026-09-13/my-daughter-loved-the-game-very/outputs/START_HERE.md` and view both linked concepts first. Add the requested Heart and K-pop Demon Hunters playrooms alongside Space and Sweet using the existing question → reward → decorate/dress-up mechanics. Preserve existing saves and progress. Use the handoff to locate the current architecture and distinguish proposed visual details from requirements; inspect the current repository before implementing. Carry the concepts and handoff into the repository documentation as part of the work.
