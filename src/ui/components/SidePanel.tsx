import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../i18n.ts';

interface Props {
  titleId: string;
  title: string;
  /** Called on the close button and on Escape; the caller owns the open state. */
  onClose: () => void;
  /** Element to focus on close (the panel's button); defaults to what was focused on open. */
  opener?: RefObject<HTMLElement | null> | undefined;
  testId?: string;
  children: ComponentChildren;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex="0"]';

/**
 * Slide-in panel on the right of the room (SPEC §3.4, §16.2): 440 stage px wide, the room
 * stays visible and scaled to the left. Focus moves into the panel on open and returns to
 * the opener on close; Escape closes it (SPEC §13.1, AT-38). Not modal: the room behind it
 * stays clickable, because Decorate mode places items by clicking a slot.
 */
export function SidePanel({ titleId, title, onClose, opener, testId, children }: Props) {
  const box = useRef<HTMLElement>(null);
  const previous = useRef<Element | null>(null);

  useEffect(() => {
    previous.current = document.activeElement;
    const first = box.current?.querySelector<HTMLElement>(`.panel-body ${FOCUSABLE}`);
    (first ?? box.current)?.focus({ preventScroll: true });
    return () => {
      const target = opener?.current ?? previous.current;
      if (target instanceof HTMLElement && target.isConnected) {
        target.focus({ preventScroll: true });
      }
    };
  }, []); // the opener ref is stable for the life of the panel

  // Escape anywhere in the room closes the open panel (SPEC §13.1).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      ref={box}
      class="side-panel"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-testid={testId}
    >
      <header class="panel-header">
        <h2 id={titleId} class="panel-title">
          {title}
        </h2>
        <button
          type="button"
          class="icon-btn panel-close"
          aria-label={t('panel.close')}
          title={t('panel.close')}
          data-testid="panel-close"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>
      <div class="panel-body">{children}</div>
    </aside>
  );
}
