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
  Theme,
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
  | { type: 'mission/leave' };

export const PUZZLES_PER_MISSION = 4;
const RECENT_TARGETS = 8;
const RECENT_PAIRS = 8;
const HISTORY_LENGTH = 20;

/** True when `choice` answers the puzzle (SPEC §9.1, §9.2). SET compares faces on 12 hours. */
export function isCorrectAnswer(puzzle: Puzzle, choice: number): boolean {
  switch (puzzle.kind) {
    case 'READ':
    case 'MATCH':
      return choice === puzzle.target;
    case 'SET':
      return sameFace(choice, puzzle.target);
    case 'ELAPSED':
      return choice === puzzle.end - puzzle.start;
  }
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
  }
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
    ).puzzles;
    const targets = puzzles.map((p) => (p.kind === 'ELAPSED' ? p.end : p.target));
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
    const pairs = puzzles.flatMap((p) =>
      p.kind === 'ELAPSED' ? [[p.start, p.end] as [number, number]] : [],
    );
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
  return {
    ...save,
    progress: {
      ...save.progress,
      history: [...save.progress.history, summary].slice(-HISTORY_LENGTH),
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
