# My Cosmic Room

Browser clock-learning game concept for a seven-year-old: two distinct playrooms (Space and Sweet), sharing clock-learning games, room decoration and dress-up rewards. My Cosmic Room is a provisional working title.

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

Development aids (dev builds only): `?lang=tr`, `?screen=S1`, `?screen=S2`, `?screen=S6`, `?screen=harness` (clock engine harness: clocks at every level, digital displays, SET drag/buttons/keyboard, generators and a mission-reducer walkthrough), `?seed=<n>` (fixes the seed of new missions), `?debug=slots` (slot geometry overlay on S1: arrows nudge the selected box, `[` `]` scale it, C copies the JSON for `src/catalog/slots.ts`).

Asset pipeline (SPEC §15):

```bash
node tools/build-manifest.ts   # sync assets/manifest.json with the catalogue
npm run assets:placeholders    # write SVG placeholders for missing files
npm run assets:gen -- --smoke  # generate one sol-med and one astra-light asset via Codex CLI
npm run assets:gen             # generate every placeholder entry (raw PNGs in assets/.gen/)
npm run assets:gen -- --only <id> --only <id>   # named entries; --regen <id> redoes a generated one
npm run assets:post            # background removal, crop, resize, tile copy, manifest update
npm run assets:post -- --only <id> --force      # redo named entries that already have a PNG
npm run assets:heroine         # redraw the heroine SVG layers and wardrobe tiles
npm run assets:sounds          # synthesize the sound effects (needs ffmpeg on PATH)
npm run assets:thumbs          # derive the S0 card thumbnails from the room backgrounds
npm run measure                # first-load timings of dist/ under network throttling
```

### Art QA and approval (SPEC §15.6)

Generated entries stay `gen.status: 'generated'` until a person marks them `approved` in
`assets/manifest.json`; approved entries are never regenerated. To review: `npm run dev`, open
`http://localhost:5173/?screen=S1&debug=slots` for the Space room (for Sweet open the Sweet
card from `http://localhost:5173/?debug=slots`); the overlay draws every slot box and lists the
QA checklist. For each entry that passes, edit its `gen.status` from `"generated"` to
`"approved"` in the manifest (search the id, for instance `"space/decorations/moonBed"`) and
commit. To redo one that fails: `npm run assets:gen -- --regen <id>` then
`npm run assets:post -- --only <id> --force`, and `npm run assets:thumbs` if it was a room
background.

## Deployment (SPEC §16.5)

`npm run build` writes a static `dist/` with relative paths, so it runs from any static host
and from a sub-path (verified under `/my-cosmic-room/`).

- GitHub Pages: set Pages to "GitHub Actions" once in the repository settings, then either run
  the "Deploy to GitHub Pages" workflow by hand (Actions → Run workflow) or push a tag such as
  `v0.1.0`. The workflow (`.github/workflows/deploy.yml`) lints, typechecks, tests, builds and
  uploads `dist/`; it never runs on a push to `main`.
- Cloudflare Pages or any other host: build command `npm run build`, output directory `dist`.
