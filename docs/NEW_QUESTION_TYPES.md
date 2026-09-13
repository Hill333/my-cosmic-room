# Plan: three new question types from the workbook (words, before/after, schedule bar)

> Status (13 September 2026): **implemented** on branch `claude/daughter-game-question-types-3db045`
> (decision D19 in SPEC §1; SPEC §3.6, §3.7, §3.9, §7.3, §7.7, §8.6, §9.3, §17; CHANGELOG
> "Unreleased"). `npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
> pass (161 unit, 28 e2e). Left for a person: the native-speaker review of the new Dutch and
> Turkish strings (NEXT_SESSION.md item 6) and a play session with the child. The workbook
> photos that prompted this are in `~/Downloads/Photos-1-001(3).zip` (five pages of "Blok 4",
> quarter hours). The sections below are the plan as approved; the code follows it, with two
> details settled during implementation: `ShiftPuzzle` stores its `target` explicitly, and
> the schedule bar is 118 units tall with badges that shrink on 15-minute segments so the
> jump hint still fits above the feedback line.

## Context

The daughter's Dutch workbook ("Blok 4", quarter hours) drills question types the game does not
have yet. Five pages were reviewed; the exercises and how they map onto Tick-Tock:

| Workbook                                                                                                           | Game today                                 | Added by this plan                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| "Hoe laat is het? kwart ___", "Verbind de tijden" (clock ↔ _kwart voor 2_), "Teken de wijzers" from _kwart voor 1_ | READ/MATCH/SET with **digital** times only | **Time in words**: READ answers, MATCH prompt and SET prompt in words (_kwart over 4_, _half 3_; EN/TR too) |
| "Hoe laat was het een kwartier geleden?", "Wat is de nieuwe tijd? + 30 minuten"                                    | —                                          | **SHIFT** puzzle in Activity A: a clock, ± 15/30/45/60 min, three digital answers                           |
| "Hoeveel uren en minuten?" (coloured day timeline: opstaan, ontbijt, zwemmen…)                                     | —                                          | **SCHEDULE** puzzle in Activity B: themed day plan bar, "how long does refuelling take?"                    |

Decisions taken with the user: all three types; full implementation; mixed into the existing
Activity A / B missions (no new mission card). The "elapsed extras" (analog ELAPSED clocks,
elapsed-SET, twin 24h times) are out of scope.

Existing pieces to reuse: `makeReadingChoices` / `pickTarget` / `faceTime` and the level tables
in `src/core/generate.ts`; `durationChoices`, `formatDuration`, `decomposeJumps` in
`src/core/elapsed.ts`; `AnalogClock`, `DigitalDisplay`, `ChoiceGroup`, `JumpTimeline`,
`SetClock`, `MissionFrame`/`PuzzleFooter` in `src/ui/components/`; the `hour24Reading` setting
as the pattern for a parent switch; `translate`/`interpolate` in `src/strings/index.ts`.

## 1. Core types (`src/core/types.ts`)

- `PuzzleKind` gains `'SHIFT' | 'SCHEDULE'`.
- `ReadingPuzzle` and `SetPuzzle` gain `words?: true` (word-form presentation; answer values stay
  `TimeValue`, so `isCorrectAnswer`, `ChoiceGroup` and the e2e helpers keep working).
- New:
  ```ts
  interface ShiftPuzzle {
    kind: 'SHIFT';
    start: TimeValue;
    delta: number;
    choices: TimeValue[];
  }
  // delta ∈ {±15, ±30, ±45, ±60} at the level's precision; answer = face of start + delta
  interface SchedulePuzzle {
    kind: 'SCHEDULE';
    /** Contiguous, in order; `label` indexes the theme's activity names (sched.<theme>.<n>). */
    segments: { label: number; start: TimeValue; end: TimeValue }[];
    /** Index of the segment asked about. */
    ask: number;
    /** Durations in minutes; exactly one equals the asked segment's length. */
    choices: number[];
  }
  ```
- `Settings.timeWords: boolean` (default `true`) — parent switch, same shape as `hour24Reading`.
  Additive field: `validateSettings` in `src/core/save.ts` defaults it to `true` when missing
  (like `newItems`), `freshSettings()` sets it. `validateMission` casts puzzles as today; no change.

## 2. Time in words (`src/core/words.ts`, new)

- `formatTimeWords(t: TimeValue, lang: Language): string` — pure, built on string-table
  templates `words.m0`, `words.m5`, …, `words.m55` (12 keys, each with a single `{h}`
  placeholder so `strings.test.ts`'s cross-language placeholder check passes). `words.ts`
  decides per language which hour fills `{h}`:
  - reference hour: EN "half past **3**", TR "**üç** buçuk" use the current hour; NL "half **4**"
    (= 3:30) and NL "10 voor half 4" (3:20), "5 voor half 4" (3:25), "5 over half 4" (3:35),
    "10 over half 4" (3:40) use the next hour; all "to/voor/var" forms use the next hour.
  - TR inflection tables inside `words.ts` (linguistic data, not UI strings): nominative
    (bir…on iki) for `saat {h}` and `{h} buçuk`; accusative (biri, ikiyi, üçü, dördü, beşi,
    altıyı, yediyi, sekizi, dokuzu, onu, on biri, on ikiyi) for "… geçiyor"; dative (bire,
    ikiye, üçe, dörde, beşe, altıya, yediye, sekize, dokuza, ona, on bire, on ikiye) for "… var".
    EN/NL use the digit (`kwart voor 1`, as the workbook writes it).
  - Golden examples for the unit test: 3:00 → "3 o'clock" / "3 uur" / "saat üç"; 2:30 → "half
    past 2" / "half 3" / "iki buçuk"; 12:45 → "quarter to 1" / "kwart voor 1" / "bire çeyrek
    var"; 4:15 → "quarter past 4" / "kwart over 4" / "dördü çeyrek geçiyor"; 3:20 → "twenty past
    3" / "10 voor half 4" / "üçü yirmi geçiyor"; 3:35 → "twenty-five to 4" / "5 over half 4" /
    "dörde yirmi beş var".
- Only multiples of 5 are ever formatted (R4 precision); throw on anything else.

## 3. Generators (`src/core/generate.ts`)

- `makeActivityAMission(level, mode, recentTargets, rng, options: { words: boolean })`:
  - kinds: `shuffle([READ, READ, MATCH, SET])` as today; then, at R ≥ 2, the second READ becomes
    SHIFT with probability `SHIFT_PROBABILITY = 0.5`. SET is still never first; SHIFT may be.
  - words: when `options.words`, each READ/MATCH/SET puzzle gets `words: true` with probability
    `WORDS_PROBABILITY = 0.5` (independent per puzzle; SHIFT never uses words — its answers are
    digital as in the workbook).
  - SHIFT: `start = pickTarget(level, mode, rng)`; `delta = pick(rng, SHIFT_DELTAS[level])`
    with R2 → {±30, ±60}, R3/R4 → {±15, ±30, ±45, ±60}; in 24h mode retry until
    `start + delta` stays within 06:00–21:59 (`MAX_TRIES`, then fall back to ±60 inside the
    window). Target = `faceTime(hoursOf(start + delta), minutesOf(start + delta), mode)` (12h
    mode wraps 12:45 + 30 → 1:15). The target (not the start) goes into `recentTargets`.
  - `makeShiftChoices(start, delta, level, mode, rng)`: target plus two distractors from the
    ordered candidate list, validated like `makeReadingChoices` (allowed minutes, window, distinct
    faces): [start − delta (wrong direction), start (did not move), target ± 60 (hour off, sign
    of delta), start + sign(delta)·(60 − |delta|) (mirror minute)], fallback random allowed time.
- `makeActivityBMission(level, recentPairs, rng, firstEverAtE3)`:
  - after picking the four ELAPSED pairs as today, puzzle index 1 or 2 (never index 0, never the
    reserved 14:30 → 19:15 slot) becomes SCHEDULE with probability `SCHEDULE_PROBABILITY = 0.5`.
  - `makeSchedule(level, theme-independent, rng)`: 4 contiguous segments starting on a whole hour
    in 07:00–14:00; segment durations from `SCHEDULE_DURATIONS[level]` — E1 {60, 120}, E2
    {15, 30, 45, 60, 75, 90}, E3 {45, …, 180 step 15}; total span ≤ 6 h (retry); labels are 4
    distinct indices 1–6 shuffled; `ask` uniform over 0–3; `choices = durationChoices(len, level, rng)`
    (its candidate lists cover every duration above). The asked segment's `[start, end]` is
    pushed to `recentElapsedPairs` (mission.ts).
- Determinism unchanged: everything through `rng`.

## 4. Reducer and helpers (`src/core/mission.ts`)

- `isCorrectAnswer`: SHIFT → `sameFace`-free equality with the stored target (`shiftTarget(p)`);
  SCHEDULE → `choice === seg.end − seg.start`.
- New exported helpers replacing the ad-hoc `p.kind === 'ELAPSED' ? p.end : p.target` in
  `start()` and `S3ActivityA.tsx`: `correctValue(puzzle): number` (the value that answers it) and
  `readingTargetOf(puzzle): TimeValue | null` (for `recentReadingTargets`).
- `start()` passes `{ words: save.settings.timeWords }` to the A generator; collects SCHEDULE
  asked pairs into `recentElapsedPairs`.

## 5. UI

### S3 Activity A (`src/ui/screens/S3ActivityA.tsx`)

- READ with `words`: answer buttons render `formatTimeWords(c, lang)` text (new class
  `choices-words`, styled like `.choices-durations`); hint unchanged (sweep + hour caption).
- MATCH with `words`: prompt is the word form in a big pill (`.words-big`, same look as
  `.digital-big`); question `a.match.q` with `{time}` = words; hint shows the digital form
  (`hint.wordsDigital`: "{words} = {time}") above the existing split captions.
- SET with `words`: `a.set.q` with `{time}` = words; everything else unchanged (`SetClock`).
- SHIFT: new `ShiftPuzzle` block — `AnalogClock` at `CLOCK_SIZE.puzzle` showing `start` (label
  `a.shift.clockLabel`), themed question (`a.shift.later.<theme>` / `a.shift.ago.<theme>` with
  `{delta}` = `formatDuration(|delta|, lang)`), three `DigitalDisplay` answers in the current
  mode. Hint: ghost hands at the target on the clock (`AnalogClock ghost=`) plus caption
  `hint.shift`. Period badge in 24h mode as READ.
- Feedback/footer/progress unchanged.

### S4 Activity B (`src/ui/screens/S4ActivityB.tsx`)

- `PuzzleB` no longer throws on non-ELAPSED; branches on kind. SCHEDULE: question
  `b.sched.q` with `{activity}` = `t(sched.<theme>.<label>)`; body = new `ScheduleBar` component
  instead of the Leaves/Arrives displays; duration choices as today; "Show the jumps" hint =
  `JumpTimeline` for the asked segment (`decomposeJumps` reuse). Journey strip stays.
- `src/ui/components/ScheduleBar.tsx` (new, SVG like `JumpTimeline`, 880 wide): one rect per
  segment with a distinct fill **and** a pattern/icon glyph plus its name inside (never colour
  alone, SPEC §13.2); tick marks every 15 min, time labels every 30 min (every hour at E1),
  24-hour format via `formatTime`; the asked segment gets a thick outline and a "?" badge;
  `role="img"` with an `aria-label` listing "name from HH:MM to HH:MM" per segment. Styles in
  `src/styles/mission.css` (`.sched-*`), motion-free.

### S6 Parent corner (`src/ui/screens/S6Parent.tsx`)

- "Times in words" switch next to the 24-hour switch, wired to `settings/update` like
  `hour24Reading` (key `s6.timeWords`).

### Dev harness (`src/ui/screens/DevHarness.tsx`)

- `describePuzzle` and the reducer walkthrough get SHIFT / SCHEDULE / words branches so
  `?screen=harness` still renders every generated puzzle.

## 6. Strings (`src/strings/en.ts`, `tr.ts`, `nl.ts`)

All three tables (the test enforces completeness, placeholder parity and sentence case):

- `words.m0` … `words.m55` (12) — e.g. NL `words.m0` "{h} uur", `words.m15` "kwart over {h}",
  `words.m30` "half {h}", `words.m45` "kwart voor {h}", `words.m20` "10 voor half {h}";
  EN "{h} o'clock", "quarter past {h}", "half past {h}", "quarter to {h}", "twenty past {h}";
  TR "saat {h}", "{h} çeyrek geçiyor", "{h} buçuk", "{h} çeyrek var", "{h} yirmi geçiyor".
- `a.shift.later.space` "The rocket launches in {delta}. What time will it be?",
  `a.shift.ago.space` "The countdown started {delta} ago. What time was it?",
  `a.shift.later.sweet` "The guests arrive in {delta}. What time will it be?",
  `a.shift.ago.sweet` "The cake went into the oven {delta} ago. What time was it?",
  `a.shift.clockLabel` "Clock showing the time now", `hint.shift` "The faint hands show the new time.",
  `hint.wordsDigital` "{words} = {time}".
- `b.sched.q` "How long does {activity} take?", `b.sched.label` "Day plan",
  `sched.space.1..6` (waking up, breakfast, refuelling, training, launch check, stargazing),
  `sched.sweet.1..6` (waking up, baking, decorating, tea party, games, story time) — lower-case
  noun phrases so they read inside the question.
- `s6.timeWords` "Times in words (quarter past 3)".
- Dutch and Turkish drafts go in now; flag `words.*` and `sched.*` for the native-speaker review
  in `docs/NEXT_SESSION.md` (NL "half 4" and the TR case endings are the risky ones).

## 7. Tests

- `src/core/words.test.ts` (new): the golden table above for all 12 minute values × 12 hours ×
  3 languages spot-checked, reference-hour rules, TR inflection, throws on non-multiples of 5.
- `src/core/generate.test.ts`: AT-08 updated (kinds ∈ {READ, READ|SHIFT, MATCH, SET}, SET never
  first, distinct targets); new AT-08b SHIFT over 5,000 missions per level and mode (delta in the
  level set, start and target at level precision and inside the 24h window, three distinct
  choices with exactly one correct, R1 never SHIFT); AT-09 still 50–70 % new minutes (SHIFT
  targets excluded from the count or included — pick one and state it); words ratio 40–60 % when
  enabled, 0 when disabled; AT-15b SCHEDULE over 5,000 missions per E level (4 contiguous
  segments, whole-hour start, level durations, span ≤ 6 h, never index 0 or the reserved E3
  slot, `durationChoices` shape); determinism across the new kinds.
- `src/core/mission.test.ts`: `isCorrectAnswer` for SHIFT and SCHEDULE; recent pairs include the
  asked schedule segment; AT-33 invariant fuzz still passes with the new kinds.
- `src/core/save.test.ts`: `timeWords` defaults to `true` on an old save and round-trips.
- e2e (`e2e/helpers.ts`): `StoredPuzzle` kinds, `correctValue` (SHIFT → target, SCHEDULE →
  asked length); `solveWithMouse` already clicks `[data-value]`, which covers both. New
  `flow6-workbook-kinds.spec.ts`: find seeds (like `seedForFirstKind`) whose A mission contains
  SHIFT and a words puzzle and whose B mission contains SCHEDULE; solve with the mouse; assert
  `data-kind`, the word text on an answer, the schedule bar's `aria-label`, and that the S6
  switch removes words from a fresh mission.

## 8. Docs

- `docs/SPEC.md`: §3.6 (words presentation, SHIFT body), §3.7 (SCHEDULE body), §3.9 (switch),
  §7.3/§7.5 pseudocode, new §7.7 "Time in words" (templates + reference-hour rules) and §8.6
  "Schedule bar", §9.3 hint table rows, §14 new keys, §17.2/§17.3 new ATs, D-register entry
  (D19: workbook kinds mixed into missions).
- `CHANGELOG.md` entry; `docs/NEXT_SESSION.md` wording-review list gains `words.*`, `sched.*`,
  `a.shift.*`.

## Verification

1. `npm run lint && npm run typecheck && npm test` — new unit suites plus the updated AT-08/AT-15.
2. `npm run dev`, then `?screen=harness&seed=<n>`: every kind renders in the generator and
   reducer sections; `?lang=nl` to eyeball "kwart voor 1", "half 3"; `?lang=tr` for "bire çeyrek var".
3. Play in the Browser pane: Space → Rocket launch at R3 with a seed that yields SHIFT + words;
   Sweet → Toy delivery at E2 with a seed that yields SCHEDULE; use the hint on each new kind;
   check the period badge in 24h mode on SHIFT; toggle "Times in words" off in S6 and start a
   new mission.
4. `npm run build && npm run e2e` — existing flows plus `flow6-workbook-kinds`.
5. Reduced motion (`resize_window`/OS setting) — the schedule bar has no animation; jump hint
   reveals instantly as today.
