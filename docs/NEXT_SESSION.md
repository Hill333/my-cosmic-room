# Release handoff: 0.1.0 release candidate (after M3b)

Milestones M0 to M5 and the follow-up M3b (heroine as raster figures, room backdrops matching
the concepts) are implemented and committed (see [CHANGELOG.md](../CHANGELOG.md)). The build
passes `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
(138 unit tests, 27 end-to-end tests). Nothing is deployed, tagged or pushed. What remains
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
   (`?screen=S1&debug=slots` for Space; add `&theme=sweet` for Sweet), go through the
   checklist per entry, set `gen.status` to `"approved"` for the ones that pass, and
   regenerate the ones that do not. Known candidates: the countdown step overlay was generated
   with segment digits ("digits are UI" rule); the Sweet bed and cabinet overlap depends on the
   new backdrop (check it); the toy letterbox overlaps the bed's foot.
3. **Heroine QA (SPEC §4.5, new in M3b).** Review `docs/screenshots/` first (both rooms and
   the dress-up panel, taken from the app). Then in the app: open Dress up and try every
   outfit, hairstyle, pair of shoes and extra; open `?screen=S1&debug=heroine` and check the
   overlays sit right on every figure (press 1–4 to select an anchor, arrows to nudge, `[` `]`
   to scale, F to cycle the face, C to copy the JSON into the figure's `anchors` in
   `assets/manifest.json`). Check S3 / S4 for the happy, thinking and cheering faces and S5
   for the happy face. Figures or overlays that are still placeholders are listed under
   "Known limitations" below; generate them with `npm run assets:gen` (it pauses by itself
   when the Codex five-hour window is full) and `npm run assets:post`, then tune their anchors.
   A hairstyle whose figure is still a placeholder shows the outfit's two-buns figure instead.
4. **Backdrop QA.** The runner-up candidates of both rooms are kept as
   `assets/.gen/<theme>/room/background.<a|b>.png`; the chosen one is `background.png`. To swap:
   copy the candidate over `background.png`, run
   `npm run assets:post -- --only <theme>/room/background --force`, `npm run assets:thumbs`,
   and retune `SLOT_GEOMETRY` in `src/catalog/slots.ts` with `?debug=slots`.
5. **Title decision (D9).** The game is called "My Cosmic Room" (working title). If you keep
   it, set `TITLE_LOGO = true` in `src/ui/screens/S0Title.tsx` to show the generated logo
   (`assets/shared/ui/logo.png`) in place of the text lockup; the heading keeps the title text
   for assistive technology and the tests. If you change the name, update `app.title` in all
   three string files and regenerate the logo (`npm run assets:gen -- --regen shared/ui/logo`
   after editing its prompt in `tools/manifest-data.ts`), or leave the text lockup.
6. **Native-speaker wording review (SPEC §13.4, AT-37).** Have a Turkish and a Dutch speaker
   read `src/strings/tr.ts` and `src/strings/nl.ts`. Layout and glyphs are verified; wording
   is not. Start with the longest sentences: the S2 mission descriptions
   (`mission.*.desc`), the S6 level descriptions (`level.*.desc`) and import summary
   (`s6.importSummary`), and the hint captions (`hint.*`). `npm test` enforces sentence case
   and that every key exists in all three languages, so edits are safe to make directly.
7. **Deploy (SPEC §16.5).** When you are happy: commit, then either push a tag
   (`git tag v0.1.0 && git push origin main v0.1.0`) or run the "Deploy to GitHub Pages"
   workflow by hand from the Actions tab. Pages must be set to "GitHub Actions" as the source
   once, in the repository settings. For Cloudflare Pages: build command `npm run build`,
   output `dist`. The build uses relative paths and was verified under a sub-path.

## What M3b delivered (for orientation)

- The heroine is generated art: one full-body figure per outfit × hairstyle
  (`assets/shared/heroine/figure/<outfit>-<hair>.png`, 600 × 900, neutral face, white socks),
  with generated shoes, extras and expression faces as overlays snapped to per-figure
  `anchors` in the manifest (SPEC §4.5, D17). `tools/gen-heroine.ts` and the SVG heroine are
  gone. Wardrobe tiles are crops of the composited figure (`npm run assets:post -- --tiles`).
- `tools/codex-limits.ts` reads the Codex usage windows; `tools/gen-assets.ts` pauses on a
  full five-hour window and logs every check and asset to `assets/.gen/run.log`.
- Both room backgrounds regenerated from the concepts (two candidates each), geometry retuned,
  S0 thumbnails re-derived; screenshots in `docs/screenshots/`.

## Codex usage state at the end of M3b

M3b generated 34 images on 12 September 2026 (4 room candidates, 17 figures, 6 shoes,
4 extras, 3 faces) in one evening: the five-hour window was at 81 % when the run started,
filled up after the four backgrounds (paused 20:12 to 20:34), reset to 0 % and reached 96 %
after the third loose-hair figure at 21:03, when the generator paused until 01:35 on
13 September and was stopped by hand. The weekly window was at 46 %. An astra-light figure
costs 3–6 % of the five-hour window, a sol-med overlay 1–3 %. `assets/.gen/run.log` (ignored
by git, so only on this machine) has every check and asset.

**Still placeholders (4 figures):** `shared/heroine/figure/planetTee-loose`,
`spacesuit-loose`, `starHoodie-loose`, `strawberryDress-loose`. Until they exist, "Loose with
clip" shows the two-buns figure for those outfits and its wardrobe tile shows the loose head
from `planetTee-loose` only once that figure exists (the tile is a placeholder now). To finish:
`npm run assets:gen` (picks up the four placeholder entries; pauses by itself if the window is
full), then `npm run assets:post` (normalises them, writes the default anchors and the hair
tile), then check them with `?screen=S1&debug=heroine` wearing each outfit with loose hair;
the three existing loose figures use `face` y 200 × 0.9, `head` y 92, `back` y 430, so copy
those into the new entries' `anchors` if the defaults look off.

## Known limitations

- Four loose-hair figures are still placeholders (see "Codex usage state" above); the
  generator resumes them with `npm run assets:gen`.
- Generated figures keep small white hair highlights at the top of the buns and the ponytail
  (they were invisible on the white generation background); regenerate a figure if they
  bother you, or paint them out in the raw PNG and re-run `npm run assets:post -- --only
  <id> --force`.
- The thinking face is a patch over the figure's neutral face; on figures whose mouth sits a
  little lower (the ponytail sweater and dress) a hint of the neutral smile can show under
  it; nudge `face.y` per figure with `?debug=heroine` if it shows.
- No native-speaker review of Turkish and Dutch yet (item 6).
- No art is approved yet (item 2).
- Sounds are synthesized chimes, not recorded effects; they are pleasant and small but plain.
  Replacing a clip: drop a new MP3 (under 50 KB, 96 kbps) at the manifest path and update the
  `duration` field, or edit its recipe in `tools/gen-sounds.ts` and re-run.
- Room backgrounds are 400–600 KB PNGs (the generated art is PNG throughout). On the Fast 3G
  preset the Space room takes a few seconds after the click to paint fully; the screen is
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
- Assets: `tools/build-manifest.ts` keeps processed sizes, sound durations, tuned heroine
  anchors and the derived thumbnails; `npm run check:assets` gates the build. Do not run
  `build-manifest` while `gen-assets` is running (both rewrite the manifest).
