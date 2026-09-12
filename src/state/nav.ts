/**
 * In-memory screen navigation (SPEC §3.1). Missions persist in the save, so a reload
 * lands on the right screen from state alone (AT-30); other screens simply restart at S0.
 */
import { signal } from '@preact/signals';
import type { ItemId, Mission, Theme } from '../core/types.ts';
import { save } from './store.ts';

export type Screen =
  | { id: 'S0' }
  | { id: 'S1'; theme: Theme; sparkle?: ItemId | null; suggest?: boolean }
  | { id: 'S2'; theme: Theme }
  | { id: 'S3' }
  | { id: 'S4' }
  | { id: 'S5' }
  | { id: 'S6'; returnTo: Screen }
  /** Development harness (SPEC §16.4), dev builds only. */
  | { id: 'harness' };

/** The screen a mission record belongs on: S3/S4 while in progress, S5 once completed. */
export function missionScreen(mission: Mission | null): Screen | null {
  if (!mission) return null;
  if (mission.state === 'IN_PROGRESS') return { id: mission.activity === 'A' ? 'S3' : 'S4' };
  return { id: 'S5' };
}

function initialScreen(): Screen {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('screen');
    const theme = params.get('theme') === 'sweet' ? 'sweet' : 'space';
    if (id === 'S1') return { id: 'S1', theme };
    if (id === 'S2') return { id: 'S2', theme: save.value.settings.lastTheme };
    if (id === 'S6') return { id: 'S6', returnTo: { id: 'S0' } };
    if (id === 'harness') return { id: 'harness' };
  }
  return missionScreen(save.value.mission) ?? { id: 'S0' };
}

export const screen = signal<Screen>(initialScreen());

export function go(next: Screen): void {
  screen.value = next;
}
