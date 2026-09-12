# My Cosmic Room

Browser clock-learning game concept for a seven-year-old: two distinct playrooms (Space and Sweet), sharing clock-learning games, room decoration and dress-up rewards. My Cosmic Room is a provisional working title.

- [Product requirements](docs/PRD.md)
- [Specification](docs/SPEC.md)
- [Saved visual concepts](docs/concepts/README.md)
- [Next-session handoff](docs/NEXT_SESSION.md)

Current state: milestones M0 (skeleton), M1 (clock engine), M2 (missions playable), M3 (Space room) and M4 (Sweet room and full catalogue: all art generated through the Codex pipeline, both Sweet collections and Rainbow Explorer, Sweet reactions and missions, theme switching, star chart, Parent corner with export / import / reset, progression suggestion, Turkish and Dutch layouts reviewed) implemented; both rooms are playable end to end with real art, none of it approved by human QA yet; see [CHANGELOG.md](CHANGELOG.md). Next is M5 (sounds, reduced motion and accessibility review, performance, static build). Not deployed.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run e2e          # Playwright smoke flows (uses the installed Google Chrome)
npm run build        # asset check, typecheck, production build to dist/
```

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
```

Generated entries stay `gen.status: 'generated'` until a person marks them `approved` in the
manifest (the QA checklist is shown by `?debug=slots`); approved entries are never regenerated.

Development aids (dev builds only): `?lang=tr`, `?screen=S1`, `?screen=S2`, `?screen=S6`, `?screen=harness` (clock engine harness: clocks at every level, digital displays, SET drag/buttons/keyboard, generators and a mission-reducer walkthrough), `?seed=<n>` (fixes the seed of new missions), `?debug=slots` (slot geometry overlay on S1: arrows nudge the selected box, `[` `]` scale it, C copies the JSON for `src/catalog/slots.ts`).
