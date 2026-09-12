# Changelog

All notable changes to My Cosmic Room. Milestones follow docs/SPEC.md §18.

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
