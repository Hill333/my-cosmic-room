import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface Props {
  titleId: string;
  /** Called on Escape; the caller decides what closing means. */
  onClose: () => void;
  testId?: string;
  children: ComponentChildren;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex="0"]';

/**
 * Modal dialog (SPEC §13.1): traps Tab inside, closes on Escape and returns focus to the
 * element that was focused when it opened. Focus lands on the first button so Enter acts.
 */
export function Dialog({ titleId, onClose, testId, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const first = box.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? box.current)?.focus({ preventScroll: true });
    return () => {
      if (opener.current instanceof HTMLElement) opener.current.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div class="overlay" onKeyDown={onKeyDown}>
      <div
        ref={box}
        class="card dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  );
}
