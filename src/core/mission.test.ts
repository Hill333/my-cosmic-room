import { describe, expect, it } from 'vitest';
import { earnableItems } from '../catalog/index.ts';
import { REQUIRED_E3_PAIR } from './generate.ts';
import { checkInvariants, collectedCount, nextPair } from './inventory.ts';
import {
  correctValue,
  isCorrectAnswer,
  missionReducer,
  suggestedLevel,
  type MissionEvent,
} from './mission.ts';
import { createFreshSave, validateSave } from './save.ts';
import { settingsReducer } from './settings.ts';
import { makeTime } from './time.ts';
import type { Activity, Puzzle, Save, Theme } from './types.ts';

const NOW = '2026-09-12T10:00:00.000Z';
const LATER = '2026-09-12T10:05:00.000Z';

function wrongValue(p: Puzzle): number {
  if (p.kind === 'SET') return p.target + 60;
  return p.choices.find((c) => c !== correctValue(p))!;
}

function startMission(save: Save, theme: Theme, activity: Activity, seed = 1): Save {
  return missionReducer(save, { type: 'mission/start', theme, activity, seed, now: NOW });
}

/** Answers every puzzle correctly and presses Next four times. */
function solve(save: Save): Save {
  let s = save;
  for (let i = 0; i < 4; i++) {
    const p = s.mission!.puzzles[s.mission!.index]!;
    s = missionReducer(s, { type: 'mission/answer', choice: correctValue(p), seconds: 5 });
    s = missionReducer(s, { type: 'mission/next' });
  }
  return s;
}

/** Plays a full mission and claims the first offered prize with "Keep playing". */
function playAndKeep(save: Save, theme: Theme, activity: Activity, seed: number): Save {
  let s = solve(startMission(save, theme, activity, seed));
  const m = s.mission!;
  if (m.state === 'COMPLETED') {
    s = missionReducer(s, { type: 'mission/choose', item: m.prizePair[0]! });
  }
  return missionReducer(s, { type: 'mission/keep', now: LATER });
}

describe('mission start (SPEC §10.1, §7.6)', () => {
  it('creates an IN_PROGRESS record with four puzzles, the pair and the seed', () => {
    const s = startMission(createFreshSave(), 'space', 'A', 7);
    const m = s.mission!;
    expect(m).toMatchObject({
      theme: 'space',
      activity: 'A',
      level: 2,
      seed: 7,
      index: 0,
      results: [],
      prizePair: ['space.moonBed', 'space.cloudPyjamas'],
      state: 'IN_PROGRESS',
      startedAt: NOW,
      current: { wrongAttempts: 0, hintUsed: false, solved: false },
    });
    expect(m.puzzles).toHaveLength(4);
    expect(s.progress.recentReadingTargets).toHaveLength(4);
    expect(checkInvariants(s)).toEqual([]);
    expect(validateSave(JSON.parse(JSON.stringify(s))).ok).toBe(true);
  });
  it('is deterministic from the seed and ignores a second start', () => {
    const a = startMission(createFreshSave(), 'sweet', 'B', 99);
    const b = startMission(createFreshSave(), 'sweet', 'B', 99);
    expect(a.mission!.puzzles).toEqual(b.mission!.puzzles);
    const again = missionReducer(a, {
      type: 'mission/start',
      theme: 'space',
      activity: 'A',
      seed: 5,
      now: LATER,
    });
    expect(again).toBe(a);
  });
  it('uses the settings levels and the 24-hour reading mode', () => {
    let s = settingsReducer(createFreshSave(), { type: 'settings/readingLevel', level: 4 });
    s = settingsReducer(s, { type: 'settings/hour24Reading', enabled: true });
    s = startMission(s, 'space', 'A');
    expect(s.mission!.level).toBe(4);
    for (const p of s.mission!.puzzles) {
      expect(p.kind).not.toBe('ELAPSED');
      expect(p.kind).not.toBe('SCHEDULE');
      expect(correctValue(p)).toBeGreaterThanOrEqual(makeTime(6, 0));
    }
    s = settingsReducer(createFreshSave(), { type: 'settings/elapsedLevel', level: 2 });
    s = startMission(s, 'space', 'B');
    expect(s.mission!.level).toBe(2);
    expect(s.progress.recentElapsedPairs).toHaveLength(4);
  });
  it('blocks level changes during a mission', () => {
    const s = startMission(createFreshSave(), 'space', 'A');
    expect(settingsReducer(s, { type: 'settings/readingLevel', level: 3 })).toBe(s);
  });
});

describe('answers', () => {
  it('validates each puzzle kind; SET compares faces on 12 hours', () => {
    expect(isCorrectAnswer({ kind: 'READ', target: 210, choices: [] }, 210)).toBe(true);
    expect(isCorrectAnswer({ kind: 'MATCH', target: 210, choices: [] }, 240)).toBe(false);
    expect(isCorrectAnswer({ kind: 'SET', target: makeTime(15, 30) }, makeTime(3, 30))).toBe(true);
    expect(isCorrectAnswer({ kind: 'SET', target: makeTime(3, 30) }, makeTime(3, 0))).toBe(false);
    expect(isCorrectAnswer({ kind: 'ELAPSED', start: 870, end: 1155, choices: [] }, 285)).toBe(
      true,
    );
    expect(isCorrectAnswer({ kind: 'ELAPSED', start: 870, end: 1155, choices: [] }, 300)).toBe(
      false,
    );
    const shift: Puzzle = {
      kind: 'SHIFT',
      start: makeTime(12, 45),
      delta: 30,
      target: makeTime(1, 15),
      choices: [],
    };
    expect(isCorrectAnswer(shift, makeTime(1, 15))).toBe(true);
    expect(isCorrectAnswer(shift, makeTime(13, 15))).toBe(false);
    const schedule: Puzzle = {
      kind: 'SCHEDULE',
      segments: [
        { label: 1, start: makeTime(8, 0), end: makeTime(9, 15) },
        { label: 2, start: makeTime(9, 15), end: makeTime(9, 45) },
      ],
      ask: 1,
      choices: [],
    };
    expect(isCorrectAnswer(schedule, 30)).toBe(true);
    expect(isCorrectAnswer(schedule, 75)).toBe(false);
  });
  it('adds the asked schedule segment to the recent elapsed pairs (SPEC §7.5)', () => {
    for (let seed = 1; seed < 200; seed++) {
      const s = startMission(createFreshSave(), 'sweet', 'B', seed);
      const schedule = s.mission!.puzzles.find((p) => p.kind === 'SCHEDULE');
      if (!schedule || schedule.kind !== 'SCHEDULE') continue;
      const asked = schedule.segments[schedule.ask]!;
      expect(s.progress.recentElapsedPairs).toContainEqual([asked.start, asked.end]);
      expect(s.progress.recentElapsedPairs).toHaveLength(4);
      return;
    }
    throw new Error('no seed produced a SCHEDULE');
  });
  it('passes the words setting to the generator (SPEC §7.7)', () => {
    const off = settingsReducer(createFreshSave(), { type: 'settings/timeWords', enabled: false });
    for (let seed = 1; seed < 50; seed++) {
      for (const p of startMission(off, 'space', 'A', seed).mission!.puzzles) {
        expect('words' in p && p.words).toBeFalsy();
      }
    }
    let anyWords = false;
    for (let seed = 1; seed < 50 && !anyWords; seed++) {
      const m = startMission(createFreshSave(), 'space', 'A', seed).mission!;
      anyWords = m.puzzles.some((p) => 'words' in p && p.words === true);
    }
    expect(anyWords).toBe(true);
  });
  it('Next does nothing before a correct answer; answers after solving are ignored', () => {
    let s = startMission(createFreshSave(), 'space', 'A');
    expect(missionReducer(s, { type: 'mission/next' })).toBe(s);
    const p = s.mission!.puzzles[0]!;
    s = missionReducer(s, { type: 'mission/answer', choice: correctValue(p), seconds: 3 });
    expect(s.mission!.current.solved).toBe(true);
    expect(s.mission!.results).toHaveLength(1);
    expect(missionReducer(s, { type: 'mission/answer', choice: wrongValue(p), seconds: 3 })).toBe(
      s,
    );
    s = missionReducer(s, { type: 'mission/next' });
    expect(s.mission!.index).toBe(1);
    expect(s.mission!.current).toEqual({ wrongAttempts: 0, hintUsed: false, solved: false });
  });
});

describe('AT-18 single reward', () => {
  it('completing puzzle 4, replaying answer/next, or completing twice grants exactly one item', () => {
    let s = solve(startMission(createFreshSave(), 'space', 'A', 3));
    expect(s.mission!.state).toBe('COMPLETED');
    expect(s.mission!.index).toBe(4);
    expect(s.mission!.results).toHaveLength(4);
    // Replays are ignored.
    const replayed = solveAgain(s);
    expect(replayed).toBe(s);
    s = missionReducer(s, { type: 'mission/choose', item: 'space.moonBed' });
    expect(s.mission!.state).toBe('CLAIMED');
    expect(s.themes.space.owned).toContain('space.moonBed');
    // Choosing again (same or other item) grants nothing more.
    expect(missionReducer(s, { type: 'mission/choose', item: 'space.cloudPyjamas' })).toBe(s);
    expect(missionReducer(s, { type: 'mission/choose', item: 'space.moonBed' })).toBe(s);
    expect(solveAgain(s)).toBe(s);
    expect(collectedCount(s, 'space')).toBe(1);
    expect(s.wardrobe).not.toContain('space.cloudPyjamas');
    // Apply places the bed and ends the mission; a second apply is a no-op.
    s = missionReducer(s, { type: 'mission/apply', now: LATER });
    expect(s.mission).toBeNull();
    expect(s.themes.space.slots.BED).toBe('space.moonBed');
    expect(s.progress.history).toHaveLength(1);
    expect(s.progress.history[0]).toMatchObject({
      theme: 'space',
      activity: 'A',
      level: 2,
      hints: 0,
      wrong: 0,
      seconds: 20,
      endedAt: LATER,
      claimed: 'space.moonBed',
    });
    expect(missionReducer(s, { type: 'mission/apply', now: LATER })).toBe(s);
    expect(collectedCount(s, 'space')).toBe(1);
    expect(checkInvariants(s)).toEqual([]);
  });
  it('choose rejects items outside the pair', () => {
    const s = solve(startMission(createFreshSave(), 'space', 'A', 3));
    expect(missionReducer(s, { type: 'mission/choose', item: 'space.starLamp' })).toBe(s);
    expect(missionReducer(s, { type: 'mission/choose', item: 'sweet.heartLamp' })).toBe(s);
  });
});

function solveAgain(s: Save): Save {
  let r = s;
  for (const p of s.mission!.puzzles) {
    r = missionReducer(r, { type: 'mission/answer', choice: correctValue(p), seconds: 1 });
    r = missionReducer(r, { type: 'mission/next' });
  }
  return r;
}

describe('AT-19 pair selection', () => {
  it('walks the Space pool: bed + pyjamas, then lamp + pyjamas, ..., one item, then a star', () => {
    let s = createFreshSave();
    expect(nextPair(s, 'space')).toEqual(['space.moonBed', 'space.cloudPyjamas']);
    s = playAndKeep(s, 'space', 'A', 1); // chooses moonBed
    expect(nextPair(s, 'space')).toEqual(['space.starLamp', 'space.cloudPyjamas']);
    // Take every decoration: the pair then holds two dress-up items.
    const decorations = earnableItems('space').filter((i) => i.kind === 'decoration');
    let seed = 10;
    while (decorations.some((d) => !s.themes.space.owned.includes(d.id))) {
      s = playAndKeep(s, 'space', 'A', seed++);
    }
    expect(collectedCount(s, 'space')).toBe(6);
    expect(nextPair(s, 'space')).toEqual(['space.cloudPyjamas', 'space.bunnySlippers']);
    // After 11 items one item remains; after 12 the pair is empty and missions earn stars.
    while (collectedCount(s, 'space') < 11) s = playAndKeep(s, 'space', 'B', seed++);
    expect(nextPair(s, 'space')).toEqual(['space.rocketBackpack']);
    s = solve(startMission(s, 'space', 'A', seed++));
    expect(s.mission!.prizePair).toEqual(['space.rocketBackpack']);
    s = missionReducer(s, { type: 'mission/choose', item: 'space.rocketBackpack' });
    s = missionReducer(s, { type: 'mission/apply', now: LATER });
    expect(s.heroine.extra).toBe('space.rocketBackpack');
    expect(collectedCount(s, 'space')).toBe(12);
    expect(nextPair(s, 'space')).toEqual([]);
    s = solve(startMission(s, 'space', 'A', seed + 1));
    expect(s.mission).toMatchObject({ state: 'CLAIMED', claimed: 'star', prizePair: [] });
    expect(s.themes.space.stars).toBe(1);
    expect(s.themes.sweet.stars).toBe(0);
    s = missionReducer(s, { type: 'mission/keep', now: LATER });
    expect(s.mission).toBeNull();
    expect(s.progress.history.at(-1)!.claimed).toBe('star');
    // Sweet is untouched.
    expect(nextPair(s, 'sweet')).toEqual(['sweet.flowerCushion', 'sweet.floralPyjamas']);
    expect(checkInvariants(s)).toEqual([]);
  });
});

describe('AT-20 wrong answers and hints', () => {
  it('records wrongAttempts and hintUsed and still grants a prize', () => {
    let s = startMission(createFreshSave(), 'sweet', 'B', 5);
    const p0 = s.mission!.puzzles[0]!;
    s = missionReducer(s, { type: 'mission/answer', choice: wrongValue(p0), seconds: 2 });
    s = missionReducer(s, { type: 'mission/answer', choice: wrongValue(p0), seconds: 4 });
    s = missionReducer(s, { type: 'mission/hint' });
    s = missionReducer(s, { type: 'mission/hint' }); // once per puzzle
    expect(s.mission!.current).toEqual({ wrongAttempts: 2, hintUsed: true, solved: false });
    s = missionReducer(s, { type: 'mission/answer', choice: correctValue(p0), seconds: 9 });
    expect(s.mission!.results[0]).toEqual({
      kind: 'ELAPSED',
      level: 1,
      wrongAttempts: 2,
      hintUsed: true,
      seconds: 9,
    });
    // A hint after solving does nothing.
    expect(missionReducer(s, { type: 'mission/hint' })).toBe(s);
    s = missionReducer(s, { type: 'mission/next' });
    for (let i = 1; i < 4; i++) {
      const p = s.mission!.puzzles[i]!;
      s = missionReducer(s, { type: 'mission/answer', choice: correctValue(p), seconds: 1 });
      s = missionReducer(s, { type: 'mission/next' });
    }
    expect(s.mission!.state).toBe('COMPLETED');
    expect(s.mission!.prizePair).toEqual(['sweet.flowerCushion', 'sweet.floralPyjamas']);
    s = missionReducer(s, { type: 'mission/choose', item: 'sweet.floralPyjamas' });
    expect(s.wardrobe).toContain('sweet.floralPyjamas');
    s = missionReducer(s, { type: 'mission/apply', now: LATER });
    expect(s.heroine.outfit).toBe('sweet.floralPyjamas');
    expect(s.progress.history[0]).toMatchObject({ hints: 1, wrong: 2, seconds: 12 });
  });
});

describe('AT-21 leave', () => {
  it('discards the mission; inventory, slots and heroine unchanged', () => {
    const before = createFreshSave();
    let s = startMission(before, 'space', 'A', 8);
    const p = s.mission!.puzzles[0]!;
    s = missionReducer(s, { type: 'mission/answer', choice: correctValue(p), seconds: 1 });
    s = missionReducer(s, { type: 'mission/next' });
    s = missionReducer(s, { type: 'mission/leave' });
    expect(s.mission).toBeNull();
    expect(s.themes).toBe(before.themes);
    expect(s.wardrobe).toBe(before.wardrobe);
    expect(s.heroine).toBe(before.heroine);
    expect(s.progress.history).toEqual([]);
    expect(missionReducer(s, { type: 'mission/leave' })).toBe(s);
  });
  it('cannot leave a completed mission', () => {
    const s = solve(startMission(createFreshSave(), 'space', 'A', 8));
    expect(missionReducer(s, { type: 'mission/leave' })).toBe(s);
  });
});

describe('AT-22 stars', () => {
  it('caps at 24 and keeps themes independent', () => {
    let s = createFreshSave();
    // Own everything in Space so every mission earns a star.
    s = {
      ...s,
      themes: {
        ...s.themes,
        space: {
          ...s.themes.space,
          owned: [
            ...s.themes.space.owned,
            ...earnableItems('space')
              .filter((i) => i.kind === 'decoration')
              .map((i) => i.id),
          ],
        },
      },
      wardrobe: [
        ...s.wardrobe,
        ...earnableItems('space')
          .filter((i) => i.kind !== 'decoration')
          .map((i) => i.id),
      ],
    };
    expect(nextPair(s, 'space')).toEqual([]);
    for (let i = 0; i < 30; i++) {
      s = playAndKeep(s, 'space', i % 2 ? 'A' : 'B', 100 + i);
      expect(s.themes.space.stars).toBe(Math.min(i + 1, 24));
    }
    expect(s.themes.space.stars).toBe(24);
    expect(s.themes.sweet.stars).toBe(0);
    expect(s.progress.history).toHaveLength(20);
    expect(checkInvariants(s)).toEqual([]);
  });
});

describe('AT-17 first E3 mission (reducer part)', () => {
  it('shows 14:30 → 19:15 as puzzle 4 once per theme, never afterwards', () => {
    let s = settingsReducer(createFreshSave(), { type: 'settings/elapsedLevel', level: 3 });
    const isExample = (save: Save) => {
      const p = save.mission!.puzzles[3]!;
      return (
        p.kind === 'ELAPSED' && p.start === REQUIRED_E3_PAIR[0] && p.end === REQUIRED_E3_PAIR[1]
      );
    };
    s = startMission(s, 'space', 'B', 1);
    expect(isExample(s)).toBe(true);
    // Leaving does not count as having played it.
    s = missionReducer(s, { type: 'mission/leave' });
    s = startMission(s, 'space', 'B', 2);
    expect(isExample(s)).toBe(true);
    s = missionReducer(
      missionReducer(solve(s), { type: 'mission/choose', item: 'space.moonBed' }),
      {
        type: 'mission/keep',
        now: LATER,
      },
    );
    expect(s.progress.firstE3Done).toEqual({ space: true, sweet: false });
    for (let seed = 3; seed < 40; seed++) {
      s = startMission(s, 'space', 'B', seed);
      expect(isExample(s)).toBe(false);
      s = missionReducer(s, { type: 'mission/leave' });
    }
    s = startMission(s, 'sweet', 'B', 50);
    expect(isExample(s)).toBe(true);
  });
});

describe('progression suggestion (SPEC §7.1)', () => {
  /** Plays a mission; `wrong` wrong picks on puzzle 1 and optionally a hint on puzzle 2. */
  function play(save: Save, seed: number, wrong = 0, hint = false): Save {
    let s = startMission(save, 'space', 'A', seed);
    for (let i = 0; i < 4; i++) {
      const p = s.mission!.puzzles[i]!;
      if (i === 0) {
        for (let w = 0; w < wrong; w++) {
          s = missionReducer(s, { type: 'mission/answer', choice: wrongValue(p), seconds: 3 });
        }
      }
      if (i === 1 && hint) s = missionReducer(s, { type: 'mission/hint' });
      s = missionReducer(s, { type: 'mission/answer', choice: correctValue(p), seconds: 5 });
      s = missionReducer(s, { type: 'mission/next' });
    }
    if (s.mission!.state === 'COMPLETED') {
      s = missionReducer(s, { type: 'mission/choose', item: s.mission!.prizePair[0]! });
    }
    return missionReducer(s, { type: 'mission/keep', now: LATER });
  }

  it('suggests the next level after two clean missions, once, and again after two more', () => {
    let s = createFreshSave();
    s = play(s, 1);
    expect(suggestedLevel(s, 'A')).toBeNull();
    s = play(s, 2, 1);
    expect(s.progress.suggestion.A.streak).toBe(2);
    expect(suggestedLevel(s, 'A')).toBe(3);
    expect(suggestedLevel(s, 'B')).toBeNull();
    s = missionReducer(s, { type: 'mission/suggestionDeclined', activity: 'A' });
    expect(suggestedLevel(s, 'A')).toBeNull();
    s = play(s, 3);
    expect(suggestedLevel(s, 'A')).toBeNull();
    s = play(s, 4);
    expect(suggestedLevel(s, 'A')).toBe(3);
    s = missionReducer(s, { type: 'mission/suggestionAccepted', activity: 'A' });
    expect(s.settings.readingLevel).toBe(3);
    expect(s.progress.suggestion.A).toEqual({ streak: 0, declinedAt: null });
    expect(suggestedLevel(s, 'A')).toBeNull();
  });

  it('a hint, two wrong answers in total or a level change break the streak', () => {
    let s = play(createFreshSave(), 1);
    s = play(s, 2, 0, true);
    expect(s.progress.suggestion.A.streak).toBe(0);
    s = play(s, 3, 1);
    s = play(s, 4, 1);
    expect(s.progress.suggestion.A.streak).toBe(2);
    expect(suggestedLevel(s, 'A')).toBeNull(); // two wrong in total
    s = play(s, 5);
    expect(suggestedLevel(s, 'A')).toBe(3);
    s = settingsReducer(s, { type: 'settings/readingLevel', level: 1 });
    expect(suggestedLevel(s, 'A')).toBeNull();
    s = play(s, 6);
    expect(s.progress.suggestion.A.streak).toBe(1);
  });

  it('never suggests when locked or at the top level', () => {
    let s = play(play(createFreshSave(), 1), 2);
    expect(suggestedLevel(s, 'A')).toBe(3);
    const locked = settingsReducer(s, { type: 'settings/levelsLocked', locked: true });
    expect(suggestedLevel(locked, 'A')).toBeNull();
    expect(missionReducer(locked, { type: 'mission/suggestionAccepted', activity: 'A' })).toBe(
      locked,
    );
    s = settingsReducer(createFreshSave(), { type: 'settings/readingLevel', level: 4 });
    s = play(play(s, 1), 2);
    expect(s.progress.suggestion.A.streak).toBe(2);
    expect(suggestedLevel(s, 'A')).toBeNull();
  });
});

describe('AT-33 invariants over 10,000 random reducer events', () => {
  it('holds SPEC §11.4 after every event; stars never decrease', () => {
    let s = createFreshSave();
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const pickOne = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
    const allIds = ['space', 'sweet'].flatMap((t) => earnableItems(t as Theme).map((i) => i.id));
    let starsBefore = { space: 0, sweet: 0 };
    let completions = 0;
    let grants = 0;

    for (let i = 0; i < 10_000; i++) {
      const m = s.mission;
      const r = rnd();
      let event: MissionEvent;
      if (!m) {
        event = {
          type: 'mission/start',
          theme: pickOne(['space', 'sweet']),
          activity: pickOne(['A', 'B']),
          seed: i,
          now: NOW,
        };
      } else if (r < 0.6 && m.state === 'IN_PROGRESS' && m.index < 4) {
        const p = m.puzzles[m.index]!;
        event = {
          type: 'mission/answer',
          choice: rnd() < 0.7 ? correctValue(p) : wrongValue(p),
          seconds: Math.floor(rnd() * 30),
        };
      } else if (r < 0.75) {
        event = { type: 'mission/next' };
      } else if (r < 0.8) {
        event = { type: 'mission/hint' };
      } else if (r < 0.9) {
        // Mostly a legal choice, sometimes an arbitrary catalogue id.
        const item = rnd() < 0.8 && m.prizePair.length > 0 ? pickOne(m.prizePair) : pickOne(allIds);
        event = { type: 'mission/choose', item };
      } else if (r < 0.95) {
        event =
          rnd() < 0.5
            ? { type: 'mission/apply', now: LATER }
            : { type: 'mission/keep', now: LATER };
      } else {
        event = { type: 'mission/leave' };
      }
      const before = s;
      s = missionReducer(s, event);
      if (
        before.mission?.state === 'IN_PROGRESS' &&
        s.mission?.state !== 'IN_PROGRESS' &&
        s.mission
      ) {
        completions++;
      }
      if (before.mission?.state === 'COMPLETED' && s.mission?.state === 'CLAIMED') grants++;
      const problems = checkInvariants(s);
      if (problems.length > 0) throw new Error(`event ${i} ${event.type}: ${problems.join('; ')}`);
      expect(s.themes.space.stars).toBeGreaterThanOrEqual(starsBefore.space);
      expect(s.themes.sweet.stars).toBeGreaterThanOrEqual(starsBefore.sweet);
      expect(s.themes.space.stars).toBeLessThanOrEqual(24);
      starsBefore = { space: s.themes.space.stars, sweet: s.themes.sweet.stars };
      if (s.mission) {
        expect(s.mission.index).toBeLessThanOrEqual(4);
        expect(s.mission.results.length).toBe(s.mission.index + (s.mission.current.solved ? 1 : 0));
      }
    }
    expect(completions).toBeGreaterThan(50);
    expect(grants).toBeGreaterThan(10);
    expect(validateSave(JSON.parse(JSON.stringify(s))).ok).toBe(true);
  });
});
