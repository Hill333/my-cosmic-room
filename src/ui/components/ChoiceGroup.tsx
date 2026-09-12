import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { t } from '../i18n.ts';
import { groupKeyHandler } from '../hooks.ts';

export interface ChoiceOption {
  /** The value dispatched as the answer: a time for READ/MATCH, a duration for ELAPSED. */
  value: number;
  /** Accessible name when the content is decorative (MATCH clocks: "Clock A"). */
  label?: string;
  /** Plain letter shown above the option (MATCH). */
  letter?: string;
  content: ComponentChildren;
}

interface Props {
  label: string;
  options: ChoiceOption[];
  /** Values already picked wrongly: shown with ✕ "Try again", disabled and dimmed (SPEC §9.1). */
  wrong: readonly number[];
  /** The value answered correctly: ✓ and a thick outline. */
  correct: number | null;
  onPick: (value: number) => void;
  class?: string;
}

/**
 * Three answer buttons as one group (SPEC §9.1): arrow keys move inside it, wrong picks stay
 * disabled without re-shuffling, and the correct pick locks the group. When the focused
 * option becomes disabled, focus moves to the next enabled one so the keyboard never
 * falls off the screen.
 */
export function ChoiceGroup({ label, options, wrong, correct, onPick, class: className }: Props) {
  const group = useRef<HTMLDivElement>(null);
  // True when the last pick was made from a focused option; the browser drops focus to the
  // body once that option is disabled, so the effect below moves it to the next enabled one.
  const pickedWithFocus = useRef(false);
  const solved = correct !== null;

  useEffect(() => {
    const el = group.current;
    if (!el || solved || !pickedWithFocus.current) return;
    pickedWithFocus.current = false;
    const active = document.activeElement;
    const enabled = el.querySelector<HTMLButtonElement>('button:not([disabled])');
    if (!(active instanceof HTMLButtonElement) || !el.contains(active) || active.disabled) {
      enabled?.focus();
    }
  }, [wrong, solved]);

  const pick = (e: MouseEvent, value: number) => {
    pickedWithFocus.current = document.activeElement === e.currentTarget;
    onPick(value);
  };

  return (
    <div
      ref={group}
      class={['choice-group', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
      onKeyDown={groupKeyHandler}
    >
      {options.map((o) => {
        const isWrong = wrong.includes(o.value);
        const isCorrect = correct === o.value;
        const state = isCorrect ? 'correct' : isWrong ? 'wrong' : 'idle';
        return (
          <div key={o.value} class="choice-cell">
            {o.letter && (
              <span class="choice-letter" aria-hidden="true">
                {o.letter}
              </span>
            )}
            <button
              type="button"
              class={`choice choice-${state}`}
              data-testid="answer"
              data-value={o.value}
              data-state={state}
              disabled={isWrong || solved}
              aria-label={o.label}
              onClick={(e) => pick(e, o.value)}
            >
              <span class="choice-content">{o.content}</span>
              {isWrong && (
                <span class="choice-mark choice-mark-wrong">
                  <span aria-hidden="true">✕</span> {t('fb.tryAgain')}
                </span>
              )}
              {isCorrect && (
                <span class="choice-mark choice-mark-correct" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
