import { useEffect, useRef } from 'preact/hooks';

/** Moves focus to the element on mount (SPEC §13.1: focus moves to the new screen's heading). */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
