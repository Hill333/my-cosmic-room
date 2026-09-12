import { useEffect, useRef, useState } from 'preact/hooks';
import { READING_LEVELS } from '../../core/generate.ts';
import type { DayPeriod } from '../../core/time.ts';
import {
  dragHourHand,
  dragMinuteHand,
  initialSetTime,
  pointerAngle,
  stepSetTime,
} from '../../core/time.ts';
import type { ReadingLevel, Theme, TimeValue } from '../../core/types.ts';
import { t } from '../i18n.ts';
import { AnalogClock, CLOCK, CLOCK_SIZE, hitTestHand, type Hand } from './AnalogClock.tsx';

export type SetStatus = 'idle' | 'correct' | 'wrong';

interface Props {
  /** The time to set; only used for the start position and the optional ghost hands. */
  target: TimeValue;
  level: ReadingLevel;
  theme?: Theme;
  size?: number;
  /** Faint target hands (SET hint, SPEC §9.3). */
  showGhost?: boolean;
  /** Day-period badge of the target in 24-hour reading mode (SPEC §6.4). */
  period?: DayPeriod | null;
  status?: SetStatus;
  /** Locks the clock after a correct answer. */
  disabled?: boolean;
  onCheck: (time: TimeValue) => void;
  onChange?: (time: TimeValue) => void;
}

/**
 * The SET clock (SPEC §6.4): drag a hand, press the step buttons, or use the keyboard while the
 * clock has focus (Up/Down ± 1 hour, Left/Right ± one step, Enter = Check). The drag is the
 * only JavaScript-driven animation in the game (SPEC §16.3).
 */
export function SetClock({
  target,
  level,
  theme = 'space',
  size = CLOCK_SIZE.puzzle,
  showGhost = false,
  period = null,
  status = 'idle',
  disabled = false,
  onCheck,
  onChange,
}: Props) {
  const step = READING_LEVELS[level].step;
  const wholeHours = level === 1;
  const [time, setTimeState] = useState<TimeValue>(() => initialSetTime(target));
  const [dragging, setDraggingState] = useState<Hand | null>(null);
  const [lockedNote, setLockedNote] = useState(false);
  // Pointer events can arrive faster than re-renders, so the handlers read live values from
  // refs; the state mirrors them for rendering.
  const timeRef = useRef(time);
  const draggingRef = useRef<Hand | null>(null);
  const previousTheta = useRef(0);
  const face = useRef<HTMLDivElement>(null);

  const setTime = (next: TimeValue) => {
    if (next === timeRef.current) return;
    timeRef.current = next;
    setTimeState(next);
    onChange?.(next);
  };
  const setDragging = (hand: Hand | null) => {
    draggingRef.current = hand;
    setDraggingState(hand);
  };

  useEffect(() => {
    timeRef.current = initialSetTime(target);
    setTimeState(timeRef.current);
    setDragging(null);
    setLockedNote(false);
  }, [target]);

  /** Pointer position in viewBox units. */
  const toViewBox = (e: PointerEvent): [number, number] => {
    const rect = face.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * (CLOCK.centre * 2),
      ((e.clientY - rect.top) / rect.height) * (CLOCK.centre * 2),
    ];
  };

  const onPointerDown = (e: PointerEvent) => {
    if (disabled || e.button !== 0) return;
    const [x, y] = toViewBox(e);
    const hand = hitTestHand(x, y, timeRef.current);
    if (!hand) return;
    e.preventDefault();
    face.current?.focus({ preventScroll: true });
    if (hand === 'minute' && wholeHours) {
      setLockedNote(true);
      return;
    }
    previousTheta.current = pointerAngle(x, y, CLOCK.centre, CLOCK.centre);
    setDragging(hand);
    face.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const hand = draggingRef.current;
    if (!hand) return;
    const [x, y] = toViewBox(e);
    const theta = pointerAngle(x, y, CLOCK.centre, CLOCK.centre);
    const current = timeRef.current;
    const next =
      hand === 'minute'
        ? dragMinuteHand(current, theta, previousTheta.current, step)
        : dragHourHand(current, theta);
    previousTheta.current = theta;
    setTime(next);
  };

  const endDrag = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    setDragging(null);
    if (face.current?.hasPointerCapture(e.pointerId))
      face.current.releasePointerCapture(e.pointerId);
  };

  const nudge = (minutes: number) => {
    if (disabled) return;
    setTime(stepSetTime(timeRef.current, minutes));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowUp':
        nudge(60);
        break;
      case 'ArrowDown':
        nudge(-60);
        break;
      case 'ArrowRight':
        nudge(step);
        break;
      case 'ArrowLeft':
        nudge(-step);
        break;
      case 'Enter':
        onCheck(timeRef.current);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div class={`set-clock set-clock-${status}`} data-testid="set-clock">
      <div
        ref={face}
        class="set-clock-face"
        style={{ width: `${size}px` }}
        role="group"
        aria-label={t('a.set.clockLabel')}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <AnalogClock
          time={time}
          level={level}
          theme={theme}
          size={size}
          decorative
          interactive={!disabled}
          dragging={dragging}
          minuteLocked={wholeHours}
          ghost={showGhost ? target : null}
          period={period}
        />
      </div>
      {wholeHours && lockedNote && (
        <p class="set-clock-note" role="status">
          {t('a.set.wholeHours')}
        </p>
      )}
      <div class="set-clock-strip" role="group">
        <button type="button" class="btn" disabled={disabled} onClick={() => nudge(-60)}>
          {t('a.set.minusHour')}
        </button>
        <button type="button" class="btn" disabled={disabled} onClick={() => nudge(60)}>
          {t('a.set.plusHour')}
        </button>
        {!wholeHours && (
          <>
            <button type="button" class="btn" disabled={disabled} onClick={() => nudge(-step)}>
              {t('a.set.minusStep', { m: step })}
            </button>
            <button type="button" class="btn" disabled={disabled} onClick={() => nudge(step)}>
              {t('a.set.plusStep', { m: step })}
            </button>
          </>
        )}
        <button
          type="button"
          class="btn btn-primary"
          disabled={disabled}
          data-testid="set-check"
          onClick={() => onCheck(timeRef.current)}
        >
          {t('a.set.check')}
        </button>
      </div>
    </div>
  );
}
