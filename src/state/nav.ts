/**
 * In-memory screen navigation (SPEC §3.1). Missions persist in the save, so a reload
 * lands on the right screen from state alone; other screens simply restart at S0 or S1.
 */
import { signal } from '@preact/signals';
import type { Theme } from '../core/types.ts';

export type Screen =
  | { id: 'S0' }
  | { id: 'S1'; theme: Theme }
  | { id: 'S2'; theme: Theme }
  | { id: 'S3' }
  | { id: 'S4' }
  | { id: 'S5' }
  | { id: 'S6'; returnTo: Screen };

function initialScreen(): Screen {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const id = new URLSearchParams(window.location.search).get('screen');
    if (id === 'S1') return { id: 'S1', theme: 'space' };
  }
  return { id: 'S0' };
}

export const screen = signal<Screen>(initialScreen());

export function go(next: Screen): void {
  screen.value = next;
}
