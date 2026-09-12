/**
 * Mission reducer: start / answer / next / complete / choose / apply / leave (SPEC §10).
 * Implemented in M1. This file only fixes the event vocabulary for now.
 */
import type { Activity, ItemId, Theme } from './types.ts';

export type MissionEvent =
  | { type: 'mission/start'; theme: Theme; activity: Activity; seed: number; now: string }
  | { type: 'mission/answer'; choice: number; seconds: number }
  | { type: 'mission/hint' }
  | { type: 'mission/next' }
  | { type: 'mission/choose'; item: ItemId }
  | { type: 'mission/apply' }
  | { type: 'mission/keep' }
  | { type: 'mission/leave' };
