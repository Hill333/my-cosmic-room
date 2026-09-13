/**
 * Mission reducer: start / answer / hint / next / choose / apply / keep / leave (SPEC §10.1).
 * Pure; the caller supplies the seed and the clock, so every transition is reproducible.
 */
import { itemById } from '../catalog/index.ts';
import { makeActivityAMission, makeActivityBMission } from './generate.ts';
import { addStar, grantItem, nextPair, placeItem, wearItem } from './inventory.ts';
import { createRng } from './rng.ts';
import { sameFace } from './time.ts';
import type {
  Activity,
  ElapsedLevel,
  ItemId,
  Mission,
  MissionSummary,
  Puzzle,
  PuzzleResult,
  ReadingLevel,
  Save,
  SchedulePuzzle,
  ScheduleSegment,
  Theme,
  TimeValue,
} from './types.ts';

export type MissionEvent =
  | { type: 'mission/start'; theme: Theme; activity: Activity; seed: number; now: string }
  /** `choice` is the chosen value: a time for READ/MATCH/SET, a duration in minutes for ELAPSED. */
  | { type: 'mission/answer'; choice: number; seconds: number }
  | { type: 'mission/hint' }
  | { type: 'mission/next' }
  | { type: 'mission/choose'; item: ItemId }
  | { type: 'mission/apply'; now: string }
  | { type: 'mission/keep'; now: string }
  | { type: 'mission/leave' }
  /** Progression suggestion answers (SPEC §7.1): "Try {level}" or "Not yet". */
  | { type: 'mission/suggestionAccepted'; activity: Activity }
  | { type: 'mission/suggestionDeclined'; activity: Activity };

export const PUZZLES_PER_MISSION = 4;
const RECENT_TARGETS = 8;
const RECENT_PAIRS = 8;
const HISTORY_LENGTH = 20;

/** The asked segment of a schedule puzzle. */
export function askedSegment(puzzle: SchedulePuzzle): ScheduleSegment {
  return puzzle.segments[puzzle.ask]!;
}

/**
 * The value that answers a puzzle: a time for READ, MATCH, SET and SHIFT, a duration in
 * minutes for ELAPSED and SCHEDULE.
 */
export function correctValue(puzzle: Puzzle): number {
  switch (puzzle.kind) {
    case 'READ':
    case 'MATCH':
    case 'SET':
    case 'SHIFT':
      return puzzle.target;
    case 'ELAPSED':
      return puzzle.end - puzzle.start;
    case 'SCHEDULE': {
      const seg = askedSegment(puzzle);
      return seg.end - seg.start;
    }
  }
}

/** The reading target a puzzle adds to `recentReadingTargets` (SPEC §7.3), or null. */
export function readingTargetOf(puzzle: Puzzle): TimeValue | null {
  return puzzle.kind === 'ELAPSED' || puzzle.kind === 'SCHEDULE' ? null : puzzle.target;
}

/** The interval a puzzle adds to `recentElapsedPairs` (SPEC §7.5), or null. */
export function elapsedPairOf(puzzle: Puzzle): [TimeValue, TimeValue] | null {
  if (puzzle.kind === 'ELAPSED') return [puzzle.start, puzzle.end];
  if (puzzle.kind === 'SCHEDULE') {
    const seg = askedSegment(puzzle);
    return [seg.start, seg.end];
  }
  return null;
}

/** True when `choice` answers the puzzle (SPEC §9.1, §9.2). SET compares faces on 12 hours. */
export function isCorrectAnswer(puzzle: Puzzle, choice: number): boolean {
  if (puzzle.kind === 'SET') return sameFace(choice, puzzle.target);
  return choice === correctValue(puzzle);
}

export function missionReducer(save: Save, event: MissionEvent): Save {
  switch (event.type) {
    case 'mission/start':
      return start(save, event.theme, event.activity, event.seed, event.now);
    case 'mission/answer':
      return answer(save, event.choice, event.seconds);
    case 'mission/hint':
      return hint(save);
    case 'mission/next':
      return next(save);
    case 'mission/choose':
      return choose(save, event.item);
    case 'mission/apply':
      return apply(save, event.now);
    case 'mission/keep':
      return keep(save, event.now);
    case 'mission/leave':
      return leave(save);
    case 'mission/suggestionAccepted':
      return acceptSuggestion(save, event.activity);
    case 'mission/suggestionDeclined':
      return declineSuggestion(save, event.activity);
  }
}

export const MAX_LEVEL: Record<Activity, number> = { A: 4, B: 3 };

/** A mission counts toward the suggestion streak with no hints and at most one wrong answer. */
function qualifies(summary: MissionSummary): boolean {
  return summary.hints === 0 && summary.wrong <= 1;
}

/**
 * The level to suggest after a mission (SPEC §7.1), or null: the last two missions of the
 * activity at the current level were completed with zero hints and at most one wrong answer
 * in total, the next level exists, levels are not locked, and "Not yet" has not suppressed
 * the card within the last two qualifying missions.
 */
export function suggestedLevel(save: Save, activity: Activity): number | null {
  if (save.settings.levelsLocked) return null;
  const s = save.progress.suggestion[activity];
  if (s.streak < 2) return null;
  if (s.declinedAt !== null && s.streak - s.declinedAt < 2) return null;
  const current = activity === 'A' ? save.settings.readingLevel : save.settings.elapsedLevel;
  if (current >= MAX_LEVEL[activity]) return null;
  const last = save.progress.history.filter((h) => h.activity === activity).slice(-2);
  if (last.length < 2) return null;
  if (last.some((h) => h.level !== current || !qualifies(h))) return null;
  if (last[0]!.wrong + last[1]!.wrong > 1) return null;
  return current + 1;
}

function withSuggestion(
  save: Save,
  activity: Activity,
  state: Save['progress']['suggestion']['A'],
): Save {
  return {
    ...save,
    progress: {
      ...save.progress,
      suggestion: { ...save.progress.suggestion, [activity]: state },
    },
  };
}

/** "Try {level}": the level changes (never when locked) and the streak starts over. */
function acceptSuggestion(save: Save, activity: Activity): Save {
  const next = suggestedLevel(save, activity);
  if (next === null) return save;
  const settings =
    activity === 'A'
      ? { ...save.settings, readingLevel: next as ReadingLevel }
      : { ...save.settings, elapsedLevel: next as ElapsedLevel };
  return withSuggestion({ ...save, settings }, activity, { streak: 0, declinedAt: null });
}

/** "Not yet": suppressed until two more qualifying missions. */
function declineSuggestion(save: Save, activity: Activity): Save {
  const s = save.progress.suggestion[activity];
  return withSuggestion(save, activity, { ...s, declinedAt: s.streak });
}

// ---------------------------------------------------------------------------

function withMission(save: Save, mission: Mission): Save {
  return { ...save, mission };
}

function start(save: Save, theme: Theme, activity: Activity, seed: number, now: string): Save {
  // At most one mission exists at a time (SPEC §10.1).
  if (save.mission !== null) return save;
  const rng = createRng(seed);
  const progress = save.progress;
  let level: number;
  let puzzles: Puzzle[];
  let nextProgress: Save['progress'];
  if (activity === 'A') {
    level = save.settings.readingLevel;
    const mode = save.settings.hour24Reading ? '24h' : '12h';
    puzzles = makeActivityAMission(
      level as ReadingLevel,
      mode,
      progress.recentReadingTargets,
      rng,
      { words: save.settings.timeWords },
    ).puzzles;
    const targets = puzzles.flatMap((p) => {
      const t = readingTargetOf(p);
      return t === null ? [] : [t];
    });
    nextProgress = {
      ...progress,
      recentReadingTargets: [...progress.recentReadingTargets, ...targets].slice(-RECENT_TARGETS),
    };
  } else {
    level = save.settings.elapsedLevel;
    const firstEverAtE3 = level === 3 && !progress.firstE3Done[theme];
    puzzles = makeActivityBMission(
      level as ElapsedLevel,
      progress.recentElapsedPairs,
      rng,
      firstEverAtE3,
    ).puzzles;
    const pairs = puzzles.flatMap((p) => {
      const pair = elapsedPairOf(p);
      return pair === null ? [] : [pair];
    });
    nextProgress = {
      ...progress,
      recentElapsedPairs: [...progress.recentElapsedPairs, ...pairs].slice(-RECENT_PAIRS),
    };
  }
  const mission: Mission = {
    id: `${theme}-${activity}${level}-${seed.toString(16)}-${now}`,
    theme,
    activity,
    level,
    seed,
    puzzles,
    index: 0,
    results: [],
    prizePair: nextPair(save, theme),
    state: 'IN_PROGRESS',
    startedAt: now,
    current: freshCurrent(),
  };
  return { ...save, progress: nextProgress, mission };
}

function freshCurrent(): Mission['current'] {
  return { wrongAttempts: 0, hintUsed: false, solved: false };
}

function answer(save: Save, choice: number, seconds: number): Save {
  const m = save.mission;
  if (!m || m.state !== 'IN_PROGRESS' || m.index >= PUZZLES_PER_MISSION || m.current.solved) {
    return save;
  }
  const puzzle = m.puzzles[m.index]!;
  if (!isCorrectAnswer(puzzle, choice)) {
    return withMission(save, {
      ...m,
      current: { ...m.current, wrongAttempts: m.current.wrongAttempts + 1 },
    });
  }
  const result: PuzzleResult = {
    kind: puzzle.kind,
    level: m.level,
    wrongAttempts: m.current.wrongAttempts,
    hintUsed: m.current.hintUsed,
    seconds: Math.max(0, seconds),
  };
  return withMission(save, {
    ...m,
    results: [...m.results, result],
    current: { ...m.current, solved: true },
  });
}

function hint(save: Save): Save {
  const m = save.mission;
  if (!m || m.state !== 'IN_PROGRESS' || m.current.solved || m.current.hintUsed) return save;
  return withMission(save, { ...m, current: { ...m.current, hintUsed: true } });
}

/** Advances to the next puzzle; on the fourth, the single guarded completion (SPEC §10.1). */
function next(save: Save): Save {
  const m = save.mission;
  if (!m || m.state !== 'IN_PROGRESS' || !m.current.solved) return save;
  const advanced: Mission = { ...m, index: m.index + 1, current: freshCurrent() };
  if (advanced.index < PUZZLES_PER_MISSION) return withMission(save, advanced);
  return complete(withMission(save, advanced));
}

function complete(save: Save): Save {
  const m = save.mission;
  // The only place a reward is created; guarded so replays cannot grant twice.
  if (!m || m.state !== 'IN_PROGRESS' || m.index !== PUZZLES_PER_MISSION) return save;
  let next: Save = save;
  if (m.activity === 'B' && m.level === 3 && !save.progress.firstE3Done[m.theme]) {
    next = {
      ...next,
      progress: {
        ...next.progress,
        firstE3Done: { ...next.progress.firstE3Done, [m.theme]: true },
      },
    };
  }
  if (m.prizePair.length === 0) {
    next = addStar(next, m.theme);
    return withMission(next, { ...m, state: 'CLAIMED', claimed: 'star' });
  }
  return withMission(next, { ...m, state: 'COMPLETED' });
}

function choose(save: Save, item: ItemId): Save {
  const m = save.mission;
  if (!m || m.state !== 'COMPLETED' || !m.prizePair.includes(item)) return save;
  const granted = grantItem(save, m.theme, item);
  return withMission(granted, { ...m, state: 'CLAIMED', claimed: item });
}

/** "Put it in my room" / "Wear it": applies the claimed item and ends the mission (SPEC §10.3). */
function apply(save: Save, now: string): Save {
  const m = save.mission;
  if (!m || m.state !== 'CLAIMED') return save;
  let next = save;
  if (m.claimed && m.claimed !== 'star') {
    const item = itemById(m.claimed);
    if (item?.kind === 'decoration') next = placeItem(save, m.theme, m.claimed);
    else if (item) next = wearItem(save, m.claimed);
  }
  return end(next, now);
}

/** "Keep playing" or "Back to my room": ends the mission without applying. */
function keep(save: Save, now: string): Save {
  const m = save.mission;
  if (!m || m.state !== 'CLAIMED') return save;
  return end(save, now);
}

function end(save: Save, now: string): Save {
  const m = save.mission!;
  const summary: MissionSummary = {
    theme: m.theme,
    activity: m.activity,
    level: m.level,
    hints: m.results.filter((r) => r.hintUsed).length,
    wrong: m.results.reduce((n, r) => n + r.wrongAttempts, 0),
    seconds: m.results.reduce((n, r) => n + r.seconds, 0),
    endedAt: now,
    claimed: m.claimed ?? null,
  };
  // Suggestion streak (SPEC §7.1): consecutive qualifying missions of this activity at the
  // same level; a miss or a level change starts over and clears an earlier "Not yet".
  const previous = [...save.progress.history].reverse().find((h) => h.activity === m.activity);
  const sameLevel = previous !== undefined && previous.level === m.level;
  const before = save.progress.suggestion[m.activity];
  const suggestion = qualifies(summary)
    ? {
        streak: sameLevel ? before.streak + 1 : 1,
        declinedAt: sameLevel ? before.declinedAt : null,
      }
    : { streak: 0, declinedAt: null };
  return {
    ...save,
    progress: {
      ...save.progress,
      history: [...save.progress.history, summary].slice(-HISTORY_LENGTH),
      suggestion: { ...save.progress.suggestion, [m.activity]: suggestion },
    },
    mission: null,
  };
}

/** Leaving during IN_PROGRESS deletes the record; nothing else changes (SPEC §10.1). */
function leave(save: Save): Save {
  const m = save.mission;
  if (!m || m.state !== 'IN_PROGRESS') return save;
  return { ...save, mission: null };
}
