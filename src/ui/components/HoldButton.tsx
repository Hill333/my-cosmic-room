import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../i18n.ts';

interface Props {
  label: string;
  /** How long the button must be held before `onHold` fires (SPEC §3.9: 1.5 s gate, 2 s reset). */
  holdMs: number;
  onHold: () => void;
  /** `icon` is the round gear; `wide` is a normal wide button with the ring at its end. */
  variant?: 'icon' | 'wide';
  testId?: string;
  children: ComponentChildren;
}

/**
 * Press-and-hold button (SPEC §3.9, §13.1): a ring fills while the pointer is down or Enter
 * or Space is held; releasing early cancels. The ring is a CSS animation (respects
 * `data-motion`); the hold itself is a timer, so reduced motion changes nothing about the gate.
 * Key repeats are ignored, so a held key counts once, and Space never clicks on release.
 */
export function HoldButton({ label, holdMs, onHold, variant = 'icon', testId, children }: Props) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const begin = () => {
    if (timer.current !== null) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onHold();
    }, holdMs);
  };
  useEffect(() => cancel, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) begin();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') cancel();
  };

  return (
    <button
      type="button"
      class={`hold-btn hold-${variant}${holding ? ' holding' : ''}`}
      style={{ '--hold-ms': `${holdMs}ms` }}
      aria-label={variant === 'icon' ? label : undefined}
      title={variant === 'icon' ? `${label} (${t('s6.hold')})` : undefined}
      data-testid={testId}
      data-holding={holding ? 'true' : undefined}
      onPointerDown={(e) => {
        if (e.button === 0) begin();
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={cancel}
      onClick={(e) => e.preventDefault()}
    >
      {children}
      <span class="hold-ring" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle class="hold-ring-track" cx="50" cy="50" r="44" />
          <circle class="hold-ring-fill" cx="50" cy="50" r="44" />
        </svg>
      </span>
      {variant === 'wide' && <span class="visually-hidden">{t('s6.hold')}</span>}
    </button>
  );
}
