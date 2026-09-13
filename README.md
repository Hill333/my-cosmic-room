# Tick-Tock

Browser clock-learning game concept for a seven-year-old: two distinct playrooms (Space and Sweet), sharing clock-learning games, room decoration and dress-up rewards. Named Tick-Tock (decision D9); its working title during concept work was "My Cosmic Room", which the concept images and the repository URL still carry.

- [Product requirements](docs/PRD.md)
- [Specification](docs/SPEC.md)
- [Saved visual concepts](docs/concepts/README.md)
- [Next-session handoff](docs/NEXT_SESSION.md)

Current state: **release candidate 0.1.0**, milestones M0 to M5 implemented (see
[CHANGELOG.md](CHANGELOG.md)): both rooms playable end to end with generated art, sounds,
reduced motion, the accessibility review ([docs/ACCESSIBILITY_REVIEW.md](docs/ACCESSIBILITY_REVIEW.md)),
the performance budget and a static build. Not deployed. What remains is the user's: the
parent-and-child play session, the art approval, the title decision, a native-speaker wording
review and the deployment itself; see [docs/NEXT_SESSION.md](docs/NEXT_SESSION.md).

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

Development aids (dev builds only): `?lang=tr`, `?screen=S1` (add `&theme=sweet` for the Sweet room), `?screen=S2`, `?screen=S6`, `?screen=harness` (clock engine harness: clocks at every level, digital displays, SET drag/buttons/keyboard, generators and a mission-reducer walkthrough), `?seed=<n>` (fixes the seed of new missions), `?debug=slots` (slot geometry overlay on S1: arrows nudge the selected box, `[` `]` scale it, C copies the JSON for `src/catalog/slots.ts`), `?debug=heroine` (heroine anchor overlay on S1: 1–4 select an anchor of the current figure, arrows nudge it, `[` `]` scale the overlay, `,` `.` move the ankle cut line, F cycles the face, C copies the `anchors` JSON for `assets/manifest.json`).

Asset pipeline (SPEC §15):

```bash
node tools/build-manifest.ts   # sync assets/manifest.json with the catalogue
npm run assets:placeholders    # write SVG placeholders for missing files
npm run assets:gen -- --smoke  # generate one sol-med and one astra-light asset via Codex CLI
npm run assets:gen             # generate every placeholder entry (raw PNGs in assets/.gen/)
npm run assets:gen -- --only <id> --only <id>   # named entries; --regen <id> redoes a generated one
npm run assets:gen -- --regen <id> --variant b  # a candidate next to the main file (assets/.gen/<id>.b.png)
node tools/codex-limits.ts     # the Codex usage windows the generator pauses on (see assets/.gen/run.log)
npm run assets:post            # background removal, crop, resize, tile copy, manifest update
npm run assets:post -- --only <id> --force      # redo named entries that already have a PNG
npm run assets:post -- --tiles                  # re-derive the heroine wardrobe tiles from the figures
npm run assets:sounds          # synthesize the sound effects (needs ffmpeg on PATH)
npm run assets:thumbs          # derive the S0 card thumbnails from the room backgrounds
npm run measure                # first-load timings of dist/ under network throttling
node tools/screenshots.ts      # review screenshots of both rooms and the dress-up panel into docs/screenshots/
node tools/heroine-matrix.ts   # contact sheet of every outfit × shoe into docs/screenshots/heroine-shoes-matrix.png
```

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
`http://localhost:5173/?screen=S1&debug=slots` for the Space room (add `&theme=sweet` for
the Sweet room); the overlay draws every slot box and lists the
QA checklist. For each entry that passes, edit its `gen.status` from `"generated"` to
`"approved"` in the manifest (search the id, for instance `"space/decorations/moonBed"`) and
commit. To redo one that fails: `npm run assets:gen -- --regen <id>` then
`npm run assets:post -- --only <id> --force`, and `npm run assets:thumbs` if it was a room
background.

## Deployment (SPEC §16.5)

`npm run build` writes a static `dist/` with relative paths, so it runs from any static host
and from a sub-path (verified under `/my-cosmic-room/`, the repository's current name).

- GitHub Pages: set Pages to "GitHub Actions" once in the repository settings, then either run
  the "Deploy to GitHub Pages" workflow by hand (Actions → Run workflow) or push a tag such as
  `v0.1.0`. The workflow (`.github/workflows/deploy.yml`) lints, typechecks, tests, builds and
  uploads `dist/`; it never runs on a push to `main`.
- Cloudflare Pages or any other host: build command `npm run build`, output directory `dist`.
