# Changelog

All notable changes to Tick-Tock. Milestones follow docs/SPEC.md §18.

## 0.1.0 — release candidate (M0 to M5)

- Heroine walks (SPEC §4.3 "Walk, bed, sit", D18): clicking her picks her (pulsing ring,
  `aria-pressed`); the next click on the floor walks her there, the bed puts her to sleep
  (head on the pillow over the bed, "z z z", the room darkens without saving a lamp
  change), the nook seats her, any other slot walks her up beside the item and then plays
  its reaction; Pip / Mimi trot after her. Arrow keys walk her while picked; Escape or a panel
  drops the pick and stands her up. Pure geometry in `catalog/walk.ts` (floor band
  `FLOOR_GEOMETRY`, depth scale, stacking in front of the bed and nook once past their floor
  line, `rest` spots per bed and nook in the catalogue), the state machine in
  `ui/useRoomWalk.ts`, the CSS in `room.css` (`--walk-ms`, `--facing`, `heroine-walking`,
  `heroine-pose-bed`, `heroine-pose-sit`, `heroine-selected`); reduced motion lands every move
  at once. New unit tests (`catalog/walk.test.ts`) and `e2e/walk.spec.ts`.
- Pose art for the walking heroine (SPEC §4.3, §4.5): 21 generated **sitting figures**
  (`shared/heroine/sit/<outfit>-<hair>`, cross-legged, feet tucked so no shoe overlay is
  needed, own anchors for clips, headband, backpack and faces) and 3 generated **sleeping
  heads** (`shared/heroine/sleep/<hair>`, closed eyes, drawn rotated onto the pillow). The
  manifest, `build-manifest`, `post-assets` (a `sit` branch: cut out, bottom aligned, no
  ankle cut) and `HeroinePreview` (`pose="sit"`) know the new layers; the companion waits
  beside the bed or cushion instead of in front of the pillow; the standing figure stays
  as a masked stand-in while a pose entry is a placeholder.
- Mission screens brought to life (S3 / S4, SPEC §3.6–§3.7), all CSS under the stage's motion
  setting: the scene behind the panel twinkles on the stars its backdrop already draws, a
  shooting star crosses the window, the cockpit radar sweeps and its lamps blink, the Sweet
  kitchen sparkles and its pot steams (`components/SceneLife.tsx`, hidden under reduced
  motion); the companion floats and repeats the feedback line in a speech bubble, saying the
  story line on the first puzzle; the heroine sways and hops when a puzzle is solved; each
  puzzle slides in with its answers popping up in turn (translations only, so AT-34 samples
  full-size targets and full-contrast text at every frame); a right answer throws sparks
  (`components/Burst.tsx`, also on the SET clock), pops, and flashes the panel gold; a lit
  tracker step bounces and all four wave; the journey strip is bigger, with stop lights along
  the path, a bobbing vehicle that boosts off with a spark trail on every advance and a
  destination that glows on arrival; the last Next reads the story's verb ("Launch!",
  "Deliver it!", "Start the party!", keys `q.finish.*`) and glows. The mission progress dots
  now show their state (room.css's `.dot` rule for the collection dots was overriding them).

- Renamed to Tick-Tock (D9): `app.title` in all three languages (the name stays untranslated),
  the page title, the package name, the export filename (`tick-tock-save.json`), the S6
  import message, the docs and the e2e checks. The `mcr.*` localStorage keys are kept on
  purpose so existing saves survive. The title logo (`shared/ui/logo`) was regenerated with
  the new lettering and is shown on S0 in place of the text lockup (`TITLE_LOGO`), the
  heading keeping the title text for assistive technology. The GitHub repository, its Pages
  URL and the branch still say `my-cosmic-room`.
- Favicon: the friendly clock from the title logo, drawn as `public/favicon.svg` in the
  palette, with PNG fallbacks for Safari and iOS (`favicon-32.png`, `apple-touch-icon.png`)
  rasterised by `npm run assets:favicon` (`tools/gen-favicon.ts`).

The first complete build: two playrooms (Space and Sweet) with generated art, the clock
engine (reading at four levels, elapsed time at three), four-puzzle missions with hints and
feedback, prizes into the room or the wardrobe, a star chart when the pool is empty, a parent
corner with levels, lock, 24-hour clocks, sound, motion, export / import / reset, three
languages (English, Turkish, Dutch), ten synthesized sound effects, reduced-motion support,
an accessibility review (AT-34 to AT-38) and a static build for GitHub Pages or any static
host. 133 unit tests, 27 Playwright end-to-end tests. Not yet done, all the user's: the §17.9
parent-and-child session, the §15.6 art approval (no manifest entry is `approved`), the
native-speaker wording review of Turkish and Dutch, and the deployment itself.

## M3b Heroine and backdrops

- Heroine as raster figures (SPEC §4.5, D17): the traced SVG heroine (`tools/gen-heroine.ts`,
  `assets/shared/heroine/**.svg`) is replaced by generated full-body figures, one per
  outfit × hairstyle (`shared/heroine/figure/<outfit>-<hair>`, 21 entries, astra-light, the
  reference sheet attached, neutral face, white socks, no shoes), normalised by
  `tools/post-assets.ts` onto the 600 × 900 canvas with the feet on the bottom edge. Shoes
  (6) and extras (4) are generated overlays (sol-med) and the happy / thinking / cheering
  faces are generated face patches (astra-light, feathered edge); each snaps to one of the
  figure's manifest `anchors` (`face`, `feet`, `head`, `back`, each `{ x, y, scale }` in figure
  px) by its `pivot` and `offset`; the rocket backpack uses the `back` anchor and is drawn
  behind the figure. `catalog/heroine.ts` holds the pure geometry (`overlayBox`,
  `overlayStyle`); `components/Heroine.tsx` keeps its props and the DOM contract (`.heroine`,
  `data-outfit`, `data-shoes`, now also `data-hair`, `data-extra`, `data-face`). Catalogue:
  outfits and hair carry `art.figure`; shoes and extras keep `art.heroineLayer`;
  `heroineBack` is gone. The room shows the neutral figure (the happy face lights up during
  the tap reaction); S5 shows the happy face; missions unchanged.
- Wardrobe tiles are cropped views of the composited figure (`tileCrop`: torso for outfits
  and the backpack, head for hair and clips, feet for shoes), derived by
  `npm run assets:post` (`--tiles` redoes them all).
- `?debug=heroine` (SPEC §16.4): dev overlay on S1 that draws the current figure's anchors and
  the worn overlays' boxes, nudges them with the keyboard and copies the `anchors` JSON.
- Codex usage guard (SPEC §15.6): `tools/codex-limits.ts` reads the five-hour and weekly
  windows through `codex app-server`; `tools/gen-assets.ts` checks before every generation,
  prints `PAUSED until <time>` and sleeps until the reset at 95 % (or a reported limit, or a
  run whose output mentions a usage limit), stops at 95 % of the weekly window, prints the
  counter after each image and appends everything to `assets/.gen/run.log`. `--variant <name>`
  writes a candidate (`assets/.gen/<id>.<name>.png`) for side-by-side picks.
- Room backdrops: `space/room/background` and `sweet/room/background` regenerated with the
  concept image as the primary reference and a prompt describing its layout and palette
  (two candidates each, the runner-up kept in `assets/.gen/`), slot regions and the standing
  area empty; slot, heroine, companion, entry and lamp geometry retuned; S0 thumbnails
  re-derived.
- A hairstyle whose figure is still a placeholder shows the outfit's two-buns figure (the
  ponytail and loose sets were generated last; the last four loose figures were generated on
  13 September after the Codex window reset, so all 21 figures now exist). The heroine stands
  450 stage px tall (was 420).
- Dev aids: `?screen=S1&theme=sweet` opens the Sweet room directly; `tools/screenshots.ts`
  writes the review screenshots in `docs/screenshots/` (both rooms, the four dress-up tabs,
  the title cards, S5) with Playwright against the dev server.
- Tests: `catalog/heroine.test.ts` (5) covers the figure ids, the manifest shape (21 figures
  with anchors, overlays with anchor and pivot, tiles with crops) and the overlay maths.
  e2e unchanged in count (27); the AT-24/25/26 assertions on `data-outfit` / `data-shoes`
  still hold on the raster heroine, so no spec needed changing.
- Fix: the figure's own white socks and feet showed around the narrower shoe overlays (pink
  mary-janes on every outfit, a white sock seam above the sneakers' yellow socks on the
  pyjamas). The shoe overlays are drawn at a different leg spacing than the figures, so no
  placement alone could cover the socks. Now `tools/post-assets.ts` erases each figure below
  an **ankle cut** (`anchors.feet.cutY`, guessed from the sock silhouette the first time, then
  kept like the other anchors; a hem outline right on the sock moves the guess up) and
  extrudes the leg (or the pyjama cuff) 50 px down behind the shoe, fading out, so a shoe
  only ever meets the leg. Shoes drawn with socks, legs or a shaft above the shoe
  (`clipAtAnkle` in `OVERLAY_GEN`: sneakers, mary-janes, rainbow sandals, space boots) are
  clipped 12 px above the cut (`ANKLE_CLIP_OVERLAP`, a `clip-path: inset()` on the overlay
  in `components/Heroine.tsx`, the same in the tools) so they never paint over the shin or a
  trouser hem; the slippers, whose ears rise above the ankle, are not clipped. Their
  `scale` is retuned so the overlay's ankles line up with the figure's legs (sneakers 1.18,
  mary-janes 1.11, boots 1.3, sandals 1.45 on the feet anchor's 0.78). Bare-leg figures cut
  about 25 px above the socks so a little of the overlay's own sock shows; trouser figures
  cut just under the hem. `?debug=heroine` draws the cut line and moves it with `,` and `.`
  (the overlay clip follows live; the figure itself is re-cut by
  `npm run assets:post -- --only <figure> --force`). `tools/heroine-matrix.ts` composites
  every outfit × shoe (plus a ponytail and a loose row) into
  `docs/screenshots/heroine-shoes-matrix.png` for review (`--zoom` adds 1:1 leg crops).
  `tools/build-manifest.ts` keeps a hand-tuned `offset` on any overlay (the thinking face's
  was dropped on a rebuild before). Tests: 140 unit (2 new on the clip maths and the
  manifest), 27 e2e.
- Fix: the ankle still looked cut off: the generated shoe pairs stand about 12 px closer
  together than the figure's legs (the widths match, the spacing does not), so leg skin
  showed beside each sock, and the ankle clip was a bare straight edge. Now post-processing
  measures the centre of each leg at the cut (`anchors.feet.legX`) and of each foot of a feet
  overlay (`footX`, kept by `build-manifest`), and a shoe is drawn as two halves split at its
  pivot column (the gap between the shoes), each moved so its foot sits on its leg
  (`overlayParts` / `overlayStyles` in `catalog/heroine.ts`; `clip-path` insets in
  `components/Heroine.tsx`, the same in `tools/lib/heroine.ts`). A `clipAtAnkle` shoe also
  gets an outline along the clip line (`ANKLE_CUFF`, 3 px in the art's outline colour: a
  `heroine-cuff` span filled through the shoe's own alpha with a CSS mask, so it takes the
  sock's exact width), so the clip reads as a sock cuff or boot top. Sneakers' `scale` 1.22
  (was 1.18) so their sock is never narrower than a leg; `planetTee-loose` and
  `strawberryDress-loose` had their cut left at the sock-top guess (the latter below the sock
  top, so the extruded leg was sock-white) and now sit ~20 px above it like their siblings.
- Fix: white gaps between the hair strands (the arcs at the top of the buns, loops in the
  ponytail and loose hair) rendered as opaque white: they are background in the generation,
  walled off from the border by the strands' outlines, so the flood fill never reached them.
  `post-assets` now punches them on figures: a small white pocket (8–1800 px² of the raw)
  that the search reaches from the background across at most 24 px of outline or hair (a
  strand often lies between a gap and the outside), in the top 60 % of the silhouette,
  whose surroundings past its rim are mostly hair-coloured (within 60 of the median of the
  silhouette's top 12 %; the outline's blend with white counts as hair, other colours may
  not outnumber them 1.4:1, since light strands fall outside the tolerance) becomes
  transparent and feathered like the outer edge. Eye whites (enclosed by skin), socks and
  the dress collar (too large) and the white prints on the clothes (a daisy on a sleeve, the
  clouds on the pyjamas: cloth around them) stay; every threshold was checked against all
  21 figures by diffing the output.
  All 21 figures re-processed (`--force` from the raws; `legX` measured, anchors kept), the
  six shoe overlays too (`footX`), tiles and the matrix sheet re-derived. Tests: 141 unit
  (the parts / halves maths), 27 e2e.

## M5 Polish and release

- Sounds (SPEC §13.3, §15.4): eleven short clips synthesized by `tools/gen-sounds.ts` (PCM
  chimes and plops rendered in Node, encoded to MP3 at 96 kbps with ffmpeg, 1.5–22 KB each,
  deterministic, nothing downloaded): tap, place, wear, correct, wrong (soft), hint, next,
  mission-complete fanfare, launch jingle (Space), tea-party jingle (Sweet), star earned.
  Manifest category `sound` with a `duration` field (`tools/build-manifest.ts`, `SOUNDS` in
  `tools/manifest-data.ts`). `ui/sound.ts`: `HTMLAudioElement` clips created on first use,
  `play(name)` is a no-op before the first pointer or key gesture and while `settings.sound`
  is off; a delegated click listener taps for `.btn`, `.chip`, `.icon-btn`, `.room-card`,
  `.tab`, `.radio-row`, `.switch`, `.panel-close` and the entry object unless the control
  carries `data-sound="none"` (Hint, Next, Check, the S5 action button, "Show the jumps").
  Hook points: `place()` and reactions in S1, `wear()` in the dress-up panel, `answer()` in
  S3 / S4 (the fourth right answer plays the fanfare), the hints, `next()`, the S5 celebration
  (theme jingle), the star card, and "Put it in my room" / "Wear it" (place / wear).
  `core/` stays audio-free. `e2e/sound.spec.ts` (2 tests) stubs `Audio` and checks the gate,
  the toggle and every hook point.
- Reduced motion (AT-36): `data-motion` also forces `animation-iteration-count: 1`; the S5
  celebration becomes a static scene (rocket on its pad, flame off, tea table fully set) with
  a "✦" sparkle icon on the card; the hold ring keeps its real duration (progress feedback for
  the gate). `e2e/at36-reduced-motion.spec.ts` (3 tests) runs with the OS preference and with
  the S6 setting and asserts no confetti, the sweep and counter ending at once, the hour
  caption and the jump timeline visible within a frame, and every state change still shown.
- Contrast and targets (AT-34): `e2e/at34-contrast-targets.spec.ts` (4 tests) with the
  in-page audit `e2e/browser/audit.js` over 25 screen states. Fixes it forced: `--coral-text`
  (#b8432c) for coral text and the hold ring (was 2.9:1); tracker labels no longer dimmed
  (3.4:1); slot buttons get an invisible ≥ 90 room px hit box (the astronaut figure was
  51 × 80); wardrobe tabs 64 px tall; the "Nothing" mark in purple; the S0 gradient highlight
  darkened so the title stays ≥ 4.9:1.
- Focus (AT-38): `e2e/at38-focus.spec.ts` (3 tests) with `e2e/browser/focus.js` walks every
  screen and dialog with Tab and checks the ring, Escape and where focus returns. Fixes: the
  focus ring wins over the decorate-mode dashed outline; the first-launch language card traps
  Tab (`trapTab`, shared with `Dialog`); S6's Escape listener is registered once and reads
  state through refs (the first Escape after the import dialog used to be lost).
- Not colour alone (AT-35) and Turkish / Dutch (AT-37), manual, written up in
  [docs/ACCESSIBILITY_REVIEW.md](docs/ACCESSIBILITY_REVIEW.md): selected wardrobe tabs carry
  "✓"; earned stars on the star chart carry a solid inner star; Dutch two-line tile names no
  longer collide with the "In room" badge (tile art 96 px, badge lower). Layouts checked at
  1024 × 640 in Dutch and Turkish on every screen.
- Performance (SPEC §3.3, §16.3): `tools/measure-load.ts` serves `dist/`, throttles through
  CDP and reports S0 interactive / painted and the Space room after the click. Optimisations:
  `build.assetsInlineLimit: 0` (no SVG or MP3 inlined into the JS bundle, 272 → 190 KB);
  derived 960 × 640 WebP card thumbnails (`tools/gen-thumbs.ts`, `<theme>/room/thumb`, 37 and
  43 KB) so S0 no longer loads both full backgrounds; S0 warms the last-used room's
  background after it is interactive. Measured on the production build with a cold cache:
  S0 interactive 0.24 s (10 Mbps / 40 ms), 0.41 s (4 Mbps / 100 ms), 1.89 s (Fast 3G preset,
  1.6 Mbps / 562.5 ms); S0 painted 0.33 / 0.84 / 3.05 s (was 0.95 / 2.31 / 6.67 s); the Space
  room fully painted +0.60 / +1.49 / +3.73 s after the click; 1.14 MB in 27 requests for the
  Space room from a first launch (was 1.47 MB; budget 4 MB).
- Release (SPEC §16.5): version 0.1.0 (shown in S6); `.github/workflows/deploy.yml` deploys
  `dist/` to GitHub Pages only on manual dispatch or a `v*` tag, never on a push; the
  relative-base build verified under a sub-path (`/my-cosmic-room/`). Not deployed.
- Art QA support: the Rocket backpack's tank is a new `extraBack` heroine layer drawn behind
  the body (`art.heroineBack`, `garment(..., { back: true })`, `HeroinePreview`), wider than the
  torso so it shows beside the shoulders; the straps stay in front; the wardrobe tile shows the
  whole backpack. Regenerating the heroine changed only the backpack files.
- Title logo (D9): `shared/ui/logo` is wired in S0 behind `TITLE_LOGO = false`; the text
  lockup stays until the title is confirmed.
- e2e helpers: `startMission`, `completeMission` and `seedForFirstKind` build mission records
  through the real reducer in Node, so specs open straight on S3 / S4 / S5 with known puzzles.
- Tests: 133 unit (unchanged); 27 e2e (up from 15): AT-34 (4), AT-36 (3), AT-38 (3),
  sounds (2).

## Unreleased — M4 Sweet room and full catalogue

- S6 Parent corner (`ui/screens/S6Parent.tsx`, `styles/parent.css`, SPEC §3.9) behind a
  press-and-hold gear (`components/HoldButton.tsx`: 1.5 s with the pointer or a held Enter or
  Space, a ring fills, releasing early cancels, key repeats ignored) on S0 and now also on S1
  top right. Sections: language chips; reading and elapsed levels as radio rows with the
  child-facing name plus an adult description and the "Lock levels" switch (changes go through
  the settings reducer with `byParent`); "24-hour digital clocks" switch; sound switch and
  motion radio (Follow system / Reduced / Full); save file: export (downloads
  `my-cosmic-room-save.json`), import (file picker → `importSave` → summary dialog → confirm;
  the previous save becomes the backup on the next write; broken and newer-version files are
  refused with a status line), reset (hold 2 s → `resetSave`, fresh save, first-launch flow);
  recent missions table from `progress.history` (newest first, ten rows); the damaged-save
  notice with a dismiss button; version (`__APP_VERSION__` from package.json), credits and
  privacy line. "Done" and Escape return to the opening screen. Dev aid `?screen=S6`.
- Progression suggestion (SPEC §7.1): `end()` in the mission reducer keeps
  `progress.suggestion[activity]` as a streak of consecutive missions at the same level with no
  hint and at most one wrong answer; `suggestedLevel(save, activity)` returns the next level
  when the last two such missions have at most one wrong answer in total, the next level
  exists, levels are unlocked and "Not yet" has not suppressed it (`declinedAt`, two more
  qualifying missions). S1 shows "Ready for a bigger challenge?" once on arrival from S5 with
  "Try {level}" (`mission/suggestionAccepted`) and "Not yet" (`mission/suggestionDeclined`).
- Star chart poster (SPEC §10.5): `components/StarChart.tsx`, an inline hand-drawn SVG (24
  outlined stars in 6 × 4, theme-tinted by CSS, golden frame at 24) hung as a small fixed
  poster per theme (`STAR_CHART_GEOMETRY` in `catalog/slots.ts`) and used large on the S5 star
  card; `assets/shared/ui/starChart.svg` is the static empty poster.
- Sweet reactions (SPEC §4.3): Mimi walks over and curls up on the bed (`react-curl`, idle
  pose), purrs and stretches with a note (`react-stretch`, special pose); the toy letterbox
  wobbles, its flag art swaps in and a small CSS envelope pops out (`entry-envelope`; the smoke
  puff is Space only). The evening glow now follows the theme's LAMP slot through CSS variables
  set from the slot box.
- Story reaction after puzzle 4 (SPEC §3.6, §5.4): S5 plays a CSS celebration beside the card,
  the rocket launching with its flame in Space and the tea table arriving with cups, cake,
  teapot and guests popping in for Sweet (instant under reduced motion). S3 now sits inside the
  cockpit frame / kitchen frame (generated in M3 but unused until now); S4 keeps the room.
- Sweet slot geometry tuned against the generated background: lamp on the painted nightstand,
  bunny on the cabinet's middle shelf, bed in front of the cabinet, letterbox at the right,
  bunting from the ceiling hook (its manifest size is now 720 × 220 through `SIZE_OVERRIDES`
  in `tools/manifest-data.ts`).
- Art: all 33 remaining placeholders generated through the Codex pipeline on the first
  attempt, two chains in parallel (`mimi/idle` and `toyLetterbox` first so the other poses and
  the flag state could attach them as references): 13 astra-light in 12 minutes (title logo,
  Planet mobile, Mimi ×4, Butterfly mobile, Daisy bed, Sweet plain bed, Sweet room background,
  kitchen frame, tea table, balloon parcel with cat courier) and 20 sol-med in 20 minutes
  (Galaxy poster, Rainbow rug, ten Sweet starters and Sleepover / Sunny Garden decorations, toy
  letterbox and its flag state, four step overlays, toy shop, window). Post-processed with
  `npm run assets:post`; every generated entry is `generated`, none `approved` (human QA in the
  slot overlay, SPEC §15.6). Full-frame art stays at 1536 × 1024 (Sweet room 408 KB, kitchen
  443 KB). No placeholder is left in the manifest; the stale placeholder SVGs were removed.
  The generated title logo is not yet wired into S0 (D9 pending; the text lockup stays).
- Heroine: the six Sweet garments drawn in `tools/gen-heroine.ts` (Floral pyjamas,
  Strawberry dress, Cat slippers, Rainbow sandals, Flower hair clip, Bow headband) with their
  tiles; 45 SVG files rewritten.
- `tools/build-manifest.ts` keeps the measured size and pivot of processed PNGs instead of
  resetting them to the slot defaults (running it after `assets:post` used to shrink every
  generated room layer).
- Layout (AT-37): the wardrobe tabs are a 2 × 2 grid in every language; the S1 counter shrinks
  while a panel is open so the top row fits in Dutch and Turkish with the new gear button.
  Checked at 1024 × 640 in Dutch (S6, S1 with both panels, S2, S3, S5) and Turkish (S2, S3).
  `Dialog` no longer sends focus to the body when nothing was focused at open.
- Strings added in EN/TR/NL: S6 sections, level descriptions, import/export status and
  dialog, table headers, `ui.on` / `ui.off`, `ui.starChart` (35 keys).
- First-load measurement on the production build: opening the Space room from a first launch
  transfers 1.51 MB in 15 requests (both room backgrounds, since S0 shows both cards), nothing
  Sweet-only; budget 4 MB (SPEC §16.3).
- Tests: 133 unit (up from 130: suggestion streak, decline / accept, lock and top level);
  15 e2e (up from 10): `e2e/flow2-sweet-delivery.spec.ts` (smoke flow 2, AT-17 end to end),
  `e2e/at26-theme-switch.spec.ts` (AT-26 / flow 4 with the Sweet reactions and the star chart,
  plus the golden frame), `e2e/flow5-parent-corner.spec.ts` (flow 5, AT-27, AT-29, AT-32 end
  to end, keyboard hold, reset), `e2e/prog-suggestion.spec.ts` (SPEC §7.1). `e2e/helpers.ts`
  gained `grantSweet`, `roomAndInventory`, `holdGear`.
- Not done in M4: sounds (M5); the Rocket backpack is still drawn in front of the torso; the
  title logo decision (D9); native-speaker review of the Turkish and Dutch wording (the
  automated checks and layouts pass, the wording review is a person's job).

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
