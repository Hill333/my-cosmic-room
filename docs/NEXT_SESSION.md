# Release handoff: 0.1.0 release candidate

Milestones M0 to M5 are implemented and committed (see [CHANGELOG.md](../CHANGELOG.md)). The
build passes `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
(133 unit tests, 27 end-to-end tests). Nothing is deployed, tagged or pushed. What remains
before the release is "done" in the sense of SPEC §18 is yours to do; this file is the
checklist, followed by the known limitations and the open spec questions.

## Your checklist

1. **Parent-and-child play session (SPEC §17.9).** Run `npm run dev` (or `npm run preview`
   after `npm run build`) and play for at least twenty minutes with the child. Note: whether
   the instructions were understood without you reading them out; whether Reading level R2
   (half hours) and Elapsed level E1 (whole-hour gaps) felt right; whether decorating between
   missions held interest; and any wrong-answer moment that felt discouraging. Feed the
   findings into the level defaults (`createFreshSave()` in `src/core/save.ts`) and the wording
   (`src/strings/*.ts`). No analytics exist, so the notes are the only record.
2. **Art QA and approval (SPEC §15.6).** Nothing in `assets/manifest.json` is `approved` yet.
   Follow "Art QA and approval" in [README.md](../README.md): open the slot overlay
   (`?screen=S1&debug=slots` for Space; the Sweet card from `?debug=slots`), go through the
   checklist per entry, set `gen.status` to `"approved"` for the ones that pass, and
   regenerate the ones that do not. Known candidates: the countdown step overlay was generated
   with segment digits ("digits are UI" rule); the Sweet bed stands in front of the cabinet;
   the toy letterbox overlaps the bed's foot; the Rocket backpack now has its tank behind the
   body (fixed in M5; check it reads as a backpack on the heroine and in the wardrobe tile).
3. **Title decision (D9).** The game is called "My Cosmic Room" (working title). If you keep
   it, set `TITLE_LOGO = true` in `src/ui/screens/S0Title.tsx` to show the generated logo
   (`assets/shared/ui/logo.png`) in place of the text lockup; the heading keeps the title text
   for assistive technology and the tests. If you change the name, update `app.title` in all
   three string files and regenerate the logo (`npm run assets:gen -- --regen shared/ui/logo`
   after editing its prompt in `tools/manifest-data.ts`), or leave the text lockup.
4. **Native-speaker wording review (SPEC §13.4, AT-37).** Have a Turkish and a Dutch speaker
   read `src/strings/tr.ts` and `src/strings/nl.ts`. Layout and glyphs are verified; wording
   is not. Start with the longest sentences: the S2 mission descriptions
   (`mission.*.desc`), the S6 level descriptions (`level.*.desc`) and import summary
   (`s6.importSummary`), and the hint captions (`hint.*`). `npm test` enforces sentence case
   and that every key exists in all three languages, so edits are safe to make directly.
5. **Deploy (SPEC §16.5).** When you are happy: commit, then either push a tag
   (`git tag v0.1.0 && git push origin main v0.1.0`) or run the "Deploy to GitHub Pages"
   workflow by hand from the Actions tab. Pages must be set to "GitHub Actions" as the source
   once, in the repository settings. For Cloudflare Pages: build command `npm run build`,
   output `dist`. The build uses relative paths and was verified under a sub-path.

## What M5 delivered (for orientation)

- Sounds: eleven synthesized clips (`npm run assets:sounds`, needs ffmpeg), `src/ui/sound.ts`,
  silent before the first gesture and when the toggle is off.
- AT-34, AT-36, AT-38 as Playwright specs; AT-35 and AT-37 as a manual review, both written up
  with the fixes they forced in [docs/ACCESSIBILITY_REVIEW.md](ACCESSIBILITY_REVIEW.md).
- Performance: S0 interactive in 0.24 s on a 10 Mbps connection, 0.41 s on 4 Mbps, 1.89 s on
  the Fast 3G preset; 1.14 MB for the Space room from a first launch (budget 4 MB).
  Re-measure with `npm run measure` after `npm run build`.
- Release: version 0.1.0, `.github/workflows/deploy.yml` (manual dispatch or `v*` tag only).
- The Rocket backpack behind layer; the logo wired behind `TITLE_LOGO`.

## Known limitations

- No native-speaker review of Turkish and Dutch yet (item 4).
- No art is approved yet (item 2); the countdown overlay's digits, the Sweet bed / cabinet
  overlap and the letterbox / bed overlap are known.
- Sounds are synthesized chimes, not recorded effects; they are pleasant and small but plain.
  Replacing a clip: drop a new MP3 (under 50 KB, 96 kbps) at the manifest path and update the
  `duration` field, or edit its recipe in `tools/gen-sounds.ts` and re-run.
- Room backgrounds are 400–500 KB PNGs (the generated art is PNG throughout). On the Fast 3G
  preset the Space room takes about 3.7 s after the click to paint fully; the screen is
  interactive before that. WebP backgrounds would cut roughly 800 KB if that ever matters.
- Touch is untested and not a goal (SPEC §16.6); the stage scales on tablets.
- The in-app Browser pane cannot activate buttons with synthetic keys; keyboard behaviour is
  verified by Playwright, not by hand in the pane.
- The suggestion card, the S5 celebration and the sounds after a reload are gated by a user
  gesture, so a reload onto S5 is silent by design (browser autoplay rules).

## Open spec discrepancies that need your decision

- **§7.2 vs AT-09.** §7.2's literal rule ("the non-new minutes come from the full allowed
  set") yields about 80 % new minutes; AT-09 requires 50–70 %. `pickTarget` in
  `src/core/generate.ts` draws the remainder from the level's other allowed minutes (about
  60 %) and says so in a comment. Either amend §7.2 or relax AT-09.
- **§13.3 "celebrations become a static card with a sparkle icon".** Implemented as: the S5
  card gets a "✦" icon and the celebration scene is static (rocket on its pad, tea table set)
  rather than removed. If you prefer the scene hidden entirely under reduced motion, hide
  `.celebration` in `src/styles/base.css`.
- **Hint button after solving.** The M2 note says the Hint button is "never disabled"; the
  code disables it once the puzzle is solved (it stays focusable and pressed while unsolved
  after use). Harmless, but the note and the code disagree.

## Context worth keeping

- The child is seven and reads whole hours; defaults R2 / E1. The §17.9 session may move them.
- `core/` stays free of DOM, Preact and audio (ESLint enforces the imports); every state
  change goes through `dispatch`; all animation is CSS under `data-motion`; window key
  listeners are registered once and read state through refs (S1, S6).
- Playwright runs against the production build; specs seed the save in localStorage
  (`e2e/helpers.ts`: `seedSave`, `startMission`, `completeMission`, `seedForFirstKind`) and
  pass browser code as strings or plain JS files under `e2e/browser/` (the e2e project has no
  DOM types). Preact effects are deferred, so wait for the focus the UI sets itself
  (`toBeFocused`) before pressing shortcut keys.
- Assets: `tools/build-manifest.ts` keeps processed sizes, sound durations and the derived
  thumbnails; `npm run check:assets` gates the build; regenerating the heroine is
  deterministic (only edited layers change).
