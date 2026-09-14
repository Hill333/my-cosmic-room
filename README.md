# Tick-Tock

Browser clock-learning game concept for a seven-year-old: four distinct playrooms (Space, Sweet, Heart and K-pop), sharing clock-learning games, room decoration and dress-up rewards. Named Tick-Tock (decision D9); its working title during concept work was "My Cosmic Room", which the concept images and the repository URL still carry.

- [Product requirements](docs/PRD.md)
- [Specification](docs/SPEC.md)
- [Saved visual concepts](docs/concepts/README.md)
- [Next-session handoff](docs/NEXT_SESSION.md)

Current state: **release candidate 0.1.0**, milestones M0 to M5 implemented (see
[CHANGELOG.md](CHANGELOG.md)): Space and Sweet playable end to end with generated art, sounds,
reduced motion, the accessibility review ([docs/ACCESSIBILITY_REVIEW.md](docs/ACCESSIBILITY_REVIEW.md)),
the performance budget and a static build. The Heart and K-pop playrooms (D21, 13–14 September 2026) are playable end to end with all their art generated (Codex CLI and Meta Muse Image via OpenRouter), none of it approved yet. Not
deployed. What remains is the user's: the parent-and-child play session, the art generation
and approval, a native-speaker wording review and the deployment itself; see
[docs/NEXT_SESSION.md](docs/NEXT_SESSION.md).

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run e2e          # Playwright smoke flows (uses the installed Google Chrome)
npm run build        # asset check, typecheck, production build to dist/
npm run preview      # serve dist/ locally (a file:// open does not work with module scripts)
```

Full verification before a release: `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`.

Development aids (dev builds only): `?lang=tr`, `?screen=S1` (add `&theme=sweet`, `&theme=hearts` or `&theme=kpop` for the other rooms), `?screen=S2`, `?screen=S6`, `?screen=harness` (clock engine harness: clocks at every level, digital displays, SET drag/buttons/keyboard, the generators with every puzzle kind described, and a mission-reducer walkthrough that renders each kind), `?seed=<n>` (fixes the seed of new missions), `?debug=slots` (slot geometry overlay on S1: arrows nudge the selected box, `[` `]` scale it, C copies the JSON for `src/catalog/slots.ts`), `?debug=heroine` (heroine anchor overlay on S1: 1–4 select an anchor of the current figure, arrows nudge it, `[` `]` scale the overlay, `,` `.` move the ankle cut line, F cycles the face, C copies the `anchors` JSON for `assets/manifest.json`).

Asset pipeline (SPEC §15):

```bash
node tools/build-manifest.ts   # sync assets/manifest.json with the catalogue
npm run assets:placeholders    # write SVG placeholders for missing files
npm run assets:gen -- --smoke  # generate one sol-med and one astra-light asset via Codex CLI
npm run assets:gen             # generate every placeholder entry (raw PNGs in assets/.gen/)
npm run assets:gen -- --only <id> --only <id>   # named entries; --regen <id> redoes a generated one
npm run assets:gen -- --regen <id> --variant b  # a candidate next to the main file (assets/.gen/<id>.b.png)
npm run assets:gen -- --backend openrouter      # the same, through OpenRouter (default model meta/muse-image; key in .env.local)
node tools/codex-limits.ts     # the Codex usage windows the generator pauses on (see assets/.gen/run.log)
npm run assets:post            # background removal, crop, resize, tile copy, manifest update
npm run assets:post -- --only <id> --force      # redo named entries that already have a PNG
npm run assets:post -- --tiles                  # re-derive the heroine wardrobe tiles from the figures
npm run assets:sounds          # synthesize the sound effects (needs ffmpeg on PATH)
npm run assets:thumbs          # derive the S0 card thumbnails from the room backgrounds
npm run measure                # first-load timings of dist/ under network throttling
node tools/screenshots.ts      # review screenshots of the Space and Sweet rooms and the dress-up panel into docs/screenshots/
node tools/heroine-matrix.ts   # contact sheet of every outfit × shoe into docs/screenshots/heroine-shoes-matrix.png
```

Two generation backends share the prompts and reference images in `assets/manifest.json`:
Codex CLI (the default; the D16 presets `astra-light` / `sol-med`, paced by the Codex usage
windows) and OpenRouter (`--backend openrouter`, default model `meta/muse-image`, about $0.01
an image; put `OPENROUTER_API_KEY=...` in a gitignored `.env.local` at the root). Each
generated entry records the model that made it in `gen.model`. `--variant <name>` with either
backend writes a candidate next to the current file for a side-by-side.

### Walking (SPEC §4.3)

Clicking the heroine picks her; the next click on the floor, the bed, the nook or another item
walks her there (she sleeps in the bed, sits on the nook, and other items react when she
arrives); the companion follows. The floor band and stacking live in `src/catalog/walk.ts`
(`FLOOR_GEOMETRY` in `slots.ts`); where she lies or sits per bed and nook is the item's `rest`
in `src/catalog/space.ts` / `sweet.ts` (fractions of the item's room box: `fx, fy` is the
pillow point or the seat centre, `sitY` where the sitting figure's bottom edge lands; the
defaults in `helpers.ts` fit the current art). The poses are generated art: a sitting figure
per outfit × hairstyle (`shared/heroine/sit/*`) and a sleeping head per hairstyle
(`shared/heroine/sleep/*`), made like the figures (`npm run assets:gen -- --only
shared/heroine/sit/planetTee-buns`, then `npm run assets:post -- --only <id>`); while one is
still a placeholder the standing figure stands in, masked by CSS (`heroine-pose-bed`,
`heroine-pose-sit` in `src/styles/room.css`). To retune after new bed or cushion art: place
it, pick her, click it, and adjust `rest` until her head sits on the pillow or she sits on
the cushion.

### Heroine (SPEC §4.5)

The heroine is one generated full-body figure per outfit × hairstyle
(`assets/shared/heroine/figure/<outfit>-<hair>.png`, 21 in all) plus generated overlays: shoes at
the feet, an extra at the head or behind the back, and a face for the mission expressions.
Each figure's `anchors` in `assets/manifest.json` say where the overlays snap; post-processing
writes a first guess and `?debug=heroine` tunes it (press C, paste into the manifest). The
figure's own socks and feet are erased below the ankle cut (`anchors.feet.cutY`) and shoes
drawn with socks or a shaft (`clipAtAnkle`) are clipped just above it with an outline along the
clip, so no sock peeks out around a narrow shoe; a shoe is drawn as two halves, each on the leg
post-processing measured (`anchors.feet.legX`, the overlay's `footX`), since the generated pairs
stand closer together than the figure's legs. White gaps between hair strands are made
transparent. `node tools/heroine-matrix.ts` renders every outfit × shoe for a check. Wardrobe
tiles are cropped from the figures by `npm run assets:post` (`--tiles` redoes them all). To redo
one figure: `npm run assets:gen -- --regen shared/heroine/figure/planetTee-buns` then
`npm run assets:post -- --only shared/heroine/figure/planetTee-buns --force` (add
`--reset-anchors` to discard its tuned anchors).

### Art QA and approval (SPEC §15.6)

Generated entries stay `gen.status: 'generated'` until a person marks them `approved` in
`assets/manifest.json`; approved entries are never regenerated. To review: `npm run dev`, open
`http://localhost:5173/?screen=S1&debug=slots` for the Space room (add `&theme=sweet`,
`&theme=hearts` or `&theme=kpop` for the others); the overlay draws every slot box and lists the
QA checklist. For each entry that passes, edit its `gen.status` from `"generated"` to
`"approved"` in the manifest (search the id, for instance `"space/decorations/moonBed"`) and
commit. To redo one that fails: `npm run assets:gen -- --regen <id>` then
`npm run assets:post -- --only <id> --force`, and `npm run assets:thumbs` if it was a room
background.

### Adding a room (D21)

A playroom is: its id in `THEMES` (`src/core/types.ts`); a catalogue file (`src/catalog/<id>.ts`,
seven starters and two collections of six, registered in `catalog/index.ts`); one entry each in
`SLOT_GEOMETRY`, `FLOOR_GEOMETRY`, `HEROINE_GEOMETRY`, `COMPANION_GEOMETRY`, `ENTRY_GEOMETRY` and
`STAR_CHART_GEOMETRY` (`src/catalog/slots.ts`); one `THEME_UI` entry (`src/ui/themes.ts`:
companion, entry object, mission scenes, tracker icons, journey art, celebration); its strings
(`room.<id>`, `companion.<id>`, `mission.*.<id>`, `a.*.<id>`, `b.*.<id>`, `sched.<id>.*`,
`q.finish.*.<id>`, `ui.themeBadge.<id>`, collection and item names, in all three languages); its
prompts and scene assets in `tools/manifest-data.ts` (plus a `THEME_REF` concept image and a
`THEME_LABEL`); a jingle recipe in `tools/gen-sounds.ts`; the CSS hooks `room-card-<id>`,
`s1-<id>`, `clock-<id>`, `mission-<id>`, `star-chart-<id>` and the `THEME_TINTS` placeholder
colours. Then `node tools/build-manifest.ts && npm run assets:placeholders && node
tools/gen-sounds.ts --only <id>/sound/jingle && npm run assets:thumbs`; the TypeScript
`Record<Theme, …>` types point at anything missed. Saves need nothing: a room absent from a
save starts fresh.

## Deployment (SPEC §16.5)

`npm run build` writes a static `dist/` with relative paths, so it runs from any static host
and from a sub-path (verified under `/my-cosmic-room/`, the repository's current name).

- GitHub Pages: set Pages to "GitHub Actions" once in the repository settings, then either run
  the "Deploy to GitHub Pages" workflow by hand (Actions → Run workflow) or push a tag such as
  `v0.1.0`. The workflow (`.github/workflows/deploy.yml`) lints, typechecks, tests, builds and
  uploads `dist/`; it never runs on a push to `main`.
- Cloudflare Pages or any other host: build command `npm run build`, output directory `dist`.
