import { useEffect, useRef } from 'preact/hooks';

/** Moves focus to the element on mount (SPEC §13.1: focus moves to the new screen's heading). */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

/**
 * Arrow-key movement inside a group of buttons (SPEC §13.1: arrow keys move inside answers,
 * tiles, chips and tabs; Home/End jump to the ends). Attach to the group's `onKeyDown`.
 * Disabled buttons are skipped; Tab order is untouched.
 */
export function groupKeyHandler(e: KeyboardEvent): void {
  const group = e.currentTarget as HTMLElement | null;
  if (!group) return;
  const target = e.target as HTMLElement | null;
  const items = [...group.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
  const index = items.findIndex((el) => el === target || el.contains(target));
  if (index < 0 || items.length === 0) return;
  let next: number;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = (index + 1) % items.length;
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      next = (index - 1 + items.length) % items.length;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = items.length - 1;
      break;
    default:
      return;
  }
  e.preventDefault();
  items[next]?.focus();
}

/** Seconds since the component (re)mounted; used for the per-puzzle `seconds` record (SPEC §9.4). */
export function useElapsedSeconds(): () => number {
  const started = useRef(Date.now());
  useEffect(() => {
    started.current = Date.now();
  }, []);
  return () => Math.round((Date.now() - started.current) / 1000);
}
