# Accessibility review (M5, SPEC §13 and §17.7)

Review of release candidate 0.1.0 against AT-34 to AT-38, held on 12 September 2026 on the
production build in Google Chrome. The automated parts run in CI as Playwright specs; the
manual parts were done screen by screen in the in-app browser at 1024 × 640 (the minimum
supported window, SPEC §13.2) in English, Dutch and Turkish.

| Test                       | How it is checked                                                                                                          | Result                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| AT-34 contrast and targets | `e2e/at34-contrast-targets.spec.ts` (4 tests, 25 screen states) with the in-page audit `e2e/browser/audit.js`              | Pass after fixes below                                 |
| AT-35 not colour alone     | Manual, every screen (this document)                                                                                       | Pass after fixes below                                 |
| AT-36 reduced motion       | `e2e/at36-reduced-motion.spec.ts` (3 tests: OS setting, S6 "Reduced", S6 "Full" overriding the OS)                         | Pass after fixes below                                 |
| AT-37 Turkish and Dutch    | `src/strings/strings.test.ts` (every key in all three languages, sentence case, glyphs) plus the manual layout check below | Layouts pass; native-speaker wording review still open |
| AT-38 focus                | `e2e/at38-focus.spec.ts` (3 tests) with the in-page probe `e2e/browser/focus.js`                                           | Pass after fixes below                                 |

## What the automated audit does (AT-34, AT-38)

`e2e/browser/audit.js` runs inside the page and returns every enabled, visible focusable
control with its size in stage px (bounding box divided by the stage scale) and every visible
run of text with its contrast ratio (WCAG 2.x relative luminance) against the composited
background of its ancestors, including semi-transparent layers and inherited opacity.
Thresholds: 64 × 64 stage px for targets, 4.5:1 for text, 3:1 for symbol-only strings (✓ ✕ ★
◀ ▶ ●). Emoji are skipped (coloured glyphs), disabled controls are skipped (inactive
components carry no requirement), the dev-only slot overlay is ignored, and text on a
gradient or image background is listed instead of guessed: only `.title-lockup` and `.s0-sub`
are allowed there (see S0 below). SVG text (clock numerals, jump labels and pills, the star
chart) is not sampled by the audit and was checked by hand: plum on cream 11.9:1, plum on
white 12.5:1, white on plum 12.5:1.

`e2e/browser/focus.js` reports the active element and whether `:focus-visible` matches with a
solid outline of at least 4 px and a halo; the spec tabs round the whole cycle of every screen
and dialog, then checks Escape and where focus lands.

## Findings and fixes

Real problems the review found, all fixed in this milestone:

1. **Coral text at 2.9:1** (AT-34): the wrong-answer feedback line and the ✕ "Try again" mark
   were `--coral` (#e8735f) on the light panel. A darker `--coral-text` (#b8432c, 5.2:1 on the
   panel, 5.4:1 on white) is now used for coral text and for the hold ring's progress stroke;
   `--coral` stays a fill colour.
2. **Unlit tracker steps at 3.4:1** (AT-34): the whole step was at 55 % opacity, dimming its
   label. Only the icon is dimmed now; the label keeps full plum, the unlit border is lavender.
3. **Slot buttons smaller than 64 px** (AT-34): slot hit areas followed the cropped art, so the
   astronaut figure was 51 × 80 and the paper-star string 40 px wide. Slot buttons now have an
   invisible hit box of at least 90 room px (≥ 64 stage px even with a panel open and the room
   scaled by 0.7135); the art keeps its own box inside.
4. **Wardrobe tabs 56 px tall** (AT-34): now 64 px.
5. **"Nothing" tile mark at 2.2:1** (AT-34): the ∅ was lavender; now purple (8.5:1).
6. **S0 gradient highlight** (AT-34): the star-yellow title over the brightest point of the
   radial gradient was 3.8:1; the highlight is now #6a4c9e, so the title is at least 4.9:1
   and the white subtitle at least 6.7:1 anywhere on the gradient.
7. **Focus ring hidden in decorate mode** (AT-38): the dashed "compatible slot" outline had
   higher specificity than `:focus-visible`, so a focused slot showed a 35 % dashed line. The
   ring now wins; a focused target slot keeps its marker and tint.
8. **First-launch language card did not trap Tab** (AT-38): Tab left the card for the room
   cards underneath. `trapTab` (shared with `Dialog`) keeps focus inside.
9. **Escape lost after the import dialog** (AT-38): the first Escape after closing the import
   summary was swallowed because S6 re-registered its window listener in a deferred effect.
   The listener is registered once and reads state through refs.
10. **Selected wardrobe tab was fill-only** (AT-35): selected tabs now carry the same ✓ prefix
    as pressed chips.
11. **Star chart filled by colour only** (AT-35): earned stars are star-yellow, empty ones
    cream (1.3:1 apart). Earned stars now also carry a solid plum inner star.
12. **Dutch tile names collided with the badge** (AT-37): "Gewoon rond kleed" wrapped onto the
    "In de kamer" badge. Tile art is 96 px and the badge sits lower, so two-line names fit.
13. **Reduced motion left looping animations running** (AT-36): `animation-iteration-count`
    is forced to 1 as well; the celebration is a static scene (rocket on its pad, no flame,
    tea table fully set) with a sparkle icon on the card; the hold ring keeps its real
    duration because it is progress feedback for the 1.5 s gate, not decoration.

## Screen by screen (AT-35 not colour alone, AT-37 layout)

Checked in Dutch first (longest strings), then Turkish, at 1024 × 640.

### S0 Title

- Language chips: pressed = filled plus "✓"; sound toggle: 🔊 / 🔇 icons with distinct labels.
- Gradient text: title (star yellow) ≥ 4.9:1, subtitle (white) ≥ 6.7:1 (fix 6).
- Dutch "Ruimtespeelkamer" / "Zoete speelkamer", Turkish "Uzay Oyun Odası" fit the card name bar.
- First-launch card: Tab trapped (fix 8); no Escape, a language must be chosen.

### S1 Room, free play

- Lamp lit state: the whole room dims and a glow appears; it is a reaction, not a setting.
- Counter "★ 7 / 12 verzameld" fits beside the sound and gear buttons; with a panel open the
  counter shrinks (M4) and everything still fits in Dutch and Turkish.
- Slot targets ≥ 64 stage px (fix 3), ring visible on every slot, heroine, companion, rocket.

### S1 Decorate panel

- Armed tile: "✓" badge, thick border, star tint; compatible slot: dashed outline plus a
  pulsing marker plus the tile name in the slot's accessible label.
- "In room" tile: dimmed art plus the "In de kamer" / "Odada" badge; "New" badge in words.
- Dutch two-line names no longer collide with the badge (fix 12).

### S1 Dress-up panel

- Worn tile: "✓" and a thick outline; selected tab: "✓" prefix (fix 10); "Nothing" tile with
  the ∅ mark in purple (fix 5).
- Tabs 2 × 2 in every language: "✓ Ayakkabılar", "✓ Schoenen" fit.
- "What will you earn next?": one dot per collection, the active one filled and enlarged; the
  group has an accessible label. Decorative.

### S2 Mission board

- Level chips pressed = filled plus "✓"; locked levels = disabled plus a lock icon plus the
  sentence "Levels are locked by a grown-up" in all three languages.
- Dutch descriptions ("Lees en zet klokken om de raket klaar te maken.") fit the card.

### S3 Activity A (READ, MATCH, SET), hints, leave dialog

- Wrong pick: "✕ Probeer opnieuw" on the option, disabled and dimmed, plus the feedback line
  "✕ Nog niet, probeer het nog eens." in the darker coral (fix 1).
- Correct pick: "✓" badge, thick green outline, "✓ Ja!" feedback; SET: hands glow and "✓
  Super!"; tracker step gets "✓" and the star background (fix 2).
- Hints: pressed Hint button in lilac (6.8:1); READ counter "30 dakika", "Akrep 7 rakamını
  biraz geçmiş."; MATCH captions "kleine wijzer → 7" / "grote wijzer → 12"; SET ghost hands are
  20 % plum by design (a ghost, SPEC §9.3) and carry no information the strip does not.
- Leave dialog: "Görevden çıkılsın mı?" fits; Escape returns focus to Leave.

### S4 Activity B

- Durations "4 saat 45 dakika" / "4 uur 45 minuten" fit the 290 px buttons at 32 px.
- Jump timeline: pills white on plum, labels plum; "Adımları gizle" / "Verberg de sprongen".

### S5 Mission complete

- Selected prize: "✓" badge and a thick purple outline; action label changes with the kind.
- Reduced motion: no confetti, static celebration, "✦" sparkle icon on the card (fix 13).
- Star card: "n of 24" written out; earned stars carry the inner star (fix 11).

### S6 Parent corner

- Radio rows: "●" mark plus a thicker border; switches: knob position plus "Aan / Uit",
  "Açık / Kapalı"; motion chips: "✓". 24 px body text throughout; two-column layout scrolls.
- Import dialog: Escape returns focus to Import (fix 9); Escape then closes the corner.

## Reduced motion (AT-36), what was reviewed

Every animation added since M2: the hold ring (exempt, progress), `react-*` reactions,
`entry-envelope` and `entry-smoke`, the S5 celebration, the suggestion dialog (no animation),
the side panel slide-in, the READ sweep and counter, the hour caption, the jump reveal, the
journey vehicle transition, the lighting fade, the slot marker pulse, the placement pop, the
sparkle, confetti. All are CSS and end in their final frame at once under `data-motion`; the
spec asserts the sweep duration, the counter value, the caption and the jumps within a frame,
the confetti hidden, the rocket static, and that feedback, disabled picks, the tracker, panels,
placements and the lighting still show.

## Still open (for the user)

- The question types added after this review (D19: words, SHIFT, SCHEDULE; D20: DIGITS,
  ARRIVE) are audited automatically only in part: AT-34 measures a DIGITS and an ARRIVE
  (jumps open) and whichever SHIFT or SCHEDULE its seeds happen to include; AT-38 walks
  focus through S3 and S4; `flow6-workbook-kinds` checks behaviour, not contrast. None of
  them has the screen-by-screen wording notes above; look at them in the §17.9 session, in
  particular the words pill, the day-plan bar, the "?:??" arrival display and the ▲/▼
  digit buttons.
- Native-speaker wording review of `src/strings/tr.ts` and `src/strings/nl.ts` (SPEC §13.4).
  The longest sentences to look at first: the S2 mission descriptions, the S6 level
  descriptions and import summary, the hint captions.
- The parent-and-child session (SPEC §17.9) may surface wording that is understood only with
  adult reading; that feeds back into the same files.
