# My Cosmic Room

Browser clock-learning game concept for a seven-year-old: two distinct playrooms (Space and Sweet), sharing clock-learning games, room decoration and dress-up rewards. My Cosmic Room is a provisional working title.

- [Product requirements](docs/PRD.md)
- [Specification](docs/SPEC.md)
- [Saved visual concepts](docs/concepts/README.md)
- [Next-session handoff](docs/NEXT_SESSION.md)

Current state: milestone M0 (skeleton) implemented; see [CHANGELOG.md](CHANGELOG.md). Not deployed.

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
npm run assets:gen             # generate every placeholder entry
```

Development aids (dev builds only): `?lang=tr`, `?screen=S1`.
