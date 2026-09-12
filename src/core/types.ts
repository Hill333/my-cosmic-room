/**
 * Shared types for the pure game core (SPEC §6–§11).
 * This module has no runtime code and no DOM or framework imports.
 */

/** Minutes since midnight, integer 0–1439 (SPEC §0). */
export type TimeValue = number;

export type Language = 'en' | 'tr' | 'nl';
export type Theme = 'space' | 'sweet';
export type ItemTheme = Theme | 'shared';
export type MotionSetting = 'system' | 'reduced' | 'full';

/** Digital display mode (SPEC §6.2, D11). */
export type DigitalMode = '12h' | '24h';

export type SlotType = 'BED' | 'RUG' | 'LAMP' | 'WALL' | 'SHELF' | 'HANGING' | 'NOOK';
export const SLOT_TYPES: readonly SlotType[] = [
  'BED',
  'RUG',
  'LAMP',
  'WALL',
  'SHELF',
  'HANGING',
  'NOOK',
];

export type ItemKind = 'decoration' | 'outfit' | 'shoes' | 'hair' | 'extra';
export type WardrobeKind = Exclude<ItemKind, 'decoration'>;
export type ItemId = string;

/** Reading levels R1–R4 and elapsed levels E1–E3 (SPEC §7.1). */
export type ReadingLevel = 1 | 2 | 3 | 4;
export type ElapsedLevel = 1 | 2 | 3;

export type Activity = 'A' | 'B';
export type PuzzleKind = 'READ' | 'MATCH' | 'SET' | 'ELAPSED';

export interface ReadingPuzzle {
  kind: 'READ' | 'MATCH';
  target: TimeValue;
  choices: TimeValue[];
}

export interface SetPuzzle {
  kind: 'SET';
  target: TimeValue;
}

export interface ElapsedPuzzle {
  kind: 'ELAPSED';
  start: TimeValue;
  end: TimeValue;
  /** Durations in minutes; exactly one equals end − start. */
  choices: number[];
}

export type Puzzle = ReadingPuzzle | SetPuzzle | ElapsedPuzzle;

export interface PuzzleResult {
  kind: PuzzleKind;
  level: number;
  wrongAttempts: number;
  hintUsed: boolean;
  seconds: number;
}

export type MissionState = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED';

/** Attempt record of the puzzle at `index` while it is on screen (SPEC §9.1–§9.3). */
export interface CurrentPuzzle {
  wrongAttempts: number;
  hintUsed: boolean;
  /** True once answered correctly; "Next" then advances `index`. */
  solved: boolean;
}

/** Mission record (SPEC §10.1). */
export interface Mission {
  id: string;
  theme: Theme;
  activity: Activity;
  level: number;
  seed: number;
  puzzles: Puzzle[];
  /** Next puzzle to show; 4 = all solved. */
  index: number;
  results: PuzzleResult[];
  prizePair: ItemId[];
  state: MissionState;
  claimed?: ItemId | 'star';
  startedAt: string;
  current: CurrentPuzzle;
}

export interface MissionSummary {
  theme: Theme;
  activity: Activity;
  level: number;
  hints: number;
  wrong: number;
  seconds: number;
  endedAt: string;
  claimed: ItemId | 'star' | null;
}

export interface Settings {
  language: Language | null;
  sound: boolean;
  motion: MotionSetting;
  readingLevel: ReadingLevel;
  elapsedLevel: ElapsedLevel;
  levelsLocked: boolean;
  hour24Reading: boolean;
  lastTheme: Theme;
}

export interface HeroineState {
  hair: ItemId;
  outfit: ItemId;
  shoes: ItemId;
  extra: ItemId | null;
}

export type SlotMap = Record<SlotType, ItemId>;

export interface ThemeState {
  owned: ItemId[];
  slots: SlotMap;
  lampOn: boolean;
  stars: number;
}

export interface SuggestionState {
  streak: number;
  declinedAt: number | null;
}

export interface Progress {
  recentReadingTargets: TimeValue[];
  recentElapsedPairs: [TimeValue, TimeValue][];
  firstE3Done: Record<Theme, boolean>;
  suggestion: Record<Activity, SuggestionState>;
  history: MissionSummary[];
}

/** Save format v1 (SPEC §11.3). */
export interface Save {
  version: 1;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  heroine: HeroineState;
  wardrobe: ItemId[];
  themes: Record<Theme, ThemeState>;
  progress: Progress;
  mission: Mission | null;
}
