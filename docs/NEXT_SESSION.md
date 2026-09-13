# Release handoff: 0.1.0 release candidate

Every milestone (M0 to M5, the M3b heroine and backdrop rework, the Tick-Tock title, and the
heroine ankle and hair-gap fixes of 13 September 2026) is implemented and committed (see
[CHANGELOG.md](../CHANGELOG.md)). The build passes
`npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
(141 unit tests, 27 end-to-end tests). Nothing is deployed, tagged or pushed. What remains
before the release is "done" in the sense of SPEC §18 needs a person; this file is that
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
   to scale, `,` `.` to move the ankle cut line, F to cycle the face, C to copy the JSON into
   the figure's `anchors` in `assets/manifest.json`). `docs/screenshots/heroine-shoes-matrix.png`
   (from `node tools/heroine-matrix.ts`) shows every outfit × shoe at once. Check S3 / S4 for
   the happy, thinking and cheering faces and S5 for the happy face. All 21 figures and every
   overlay are generated; to redo one, see "Heroine" in the README (`npm run assets:gen --
   --regen <id>` pauses by itself when the Codex five-hour window is full, then
   `npm run assets:post -- --only <id> --force` and retune its anchors).
4. **Backdrop QA.** The runner-up candidates of both rooms are kept as
   `assets/.gen/<theme>/room/background.<a|b>.png`; the chosen one is `background.png`. To swap:
   copy the candidate over `background.png`, run
   `npm run assets:post -- --only <theme>/room/background --force`, `npm run assets:thumbs`,
   and retune `SLOT_GEOMETRY` in `src/catalog/slots.ts` with `?debug=slots`.
5. **Repository name.** The game is "Tick-Tock" everywhere in the app and docs (D9), but the
   GitHub repository, its Pages URL (`/my-cosmic-room/`) and `.github/workflows` still carry
   the working title; rename them if you want (the `mcr.*` localStorage keys keep the legacy
   prefix on purpose so saves survive).
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

## Known limitations

- Shoes are clipped at the figure's ankle (`clipAtAnkle`) with a drawn outline along the clip,
  so the sneakers' yellow crew socks show as ankle socks and the space boots as low boots
  (their cuff strap is above the clip); the slippers' ears stand in front of the shin. The
  extruded leg under the cut is a flat colour for 50 px; each shoe half sits on its own leg
  (`legX` / `footX`), so it only shows where a sock is narrower than the leg. On the spacesuit
  a little ankle skin shows between the cuff and the sock, as the figure is drawn.
- The white gaps between hair strands are punched by a heuristic in `post-assets`
  (`punchHairGaps`: small white pockets within 24 px of the outside through outline or hair,
  in the top 60 % of the silhouette, surrounded mostly by hair colour). The thresholds are a
  knife edge between the last strand gaps and a daisy petal on a sleeve; a regenerated figure
  with a white print near the hair could trip it, so check the figure after `assets:post`
  and adjust the `GAP_*` constants if so.
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
