import { useEffect, useRef, useState } from 'preact/hooks';
import {
  READING_24H_FIRST_HOUR,
  READING_24H_LAST_HOUR,
  READING_LEVELS,
} from '../../core/generate.ts';
import {
  formatTime,
  hour12Of,
  hoursOf,
  initialSetTime,
  makeTime,
  minutesOf,
} from '../../core/time.ts';
import type { DigitalMode, ReadingLevel, TimeValue } from '../../core/types.ts';
import { t } from '../i18n.ts';
import { Burst } from './Burst.tsx';
import type { SetStatus } from './SetClock.tsx';

interface Props {
  /** The time to build; only used for the start position, which never equals it. */
  target: TimeValue;
  level: ReadingLevel;
  mode: DigitalMode;
  status?: SetStatus;
  /** Wrong-attempt count; alternates the shake animation so every wrong check shakes. */
  attempt?: number;
  disabled?: boolean;
  onCheck: (time: TimeValue) => void;
  onChange?: (time: TimeValue) => void;
}

/**
 * The DIGITS input: a digital display whose hours and minutes the child steps with up and
 * down buttons, or with the keyboard while the display has focus (Up/Down ± 1 hour,
 * Left/Right ± one step, Enter = Check), mirroring the SET clock (SPEC §6.4). Hours cycle
 * over the face (1–12) in 12-hour mode and over the reading window (06–21) in 24-hour mode;
 * minutes cycle over the level's allowed set. It starts at 12:00 or 06:00 like the SET
 * clock, so it never starts on the target.
 */
export function DigitalBuilder({
  target,
  level,
  mode,
  status = 'idle',
  attempt = 0,
  disabled = false,
  onCheck,
  onChange,
}: Props) {
  const step = READING_LEVELS[level].step;
  const wholeHours = level === 1;
  const [time, setTimeState] = useState<TimeValue>(() => initialSetTime(target));
  const timeRef = useRef(time);
  const panel = useRef<HTMLDivElement>(null);

  const setTime = (next: TimeValue) => {
    if (next === timeRef.current) return;
    timeRef.current = next;
    setTimeState(next);
    onChange?.(next);
  };

  useEffect(() => {
    timeRef.current = initialSetTime(target);
    setTimeState(timeRef.current);
  }, [target]);

  /** ± 1 hour, wrapping inside the mode's hour range; minutes unchanged. */
  const stepHour = (delta: 1 | -1) => {
    if (disabled) return;
    const m = minutesOf(timeRef.current);
    if (mode === '24h') {
      const span = READING_24H_LAST_HOUR - READING_24H_FIRST_HOUR + 1;
      const h = hoursOf(timeRef.current) - READING_24H_FIRST_HOUR;
      setTime(makeTime(READING_24H_FIRST_HOUR + ((((h + delta) % span) + span) % span), m));
    } else {
      // Hours 1–12, stored as 12-hour faces are (12:30 is 750), the way the generator stores them.
      const h = hour12Of(timeRef.current);
      setTime(makeTime(((h - 1 + delta + 12) % 12) + 1, m));
    }
  };

  /** ± one level step, wrapping within the hour so the hour never changes. */
  const stepMinute = (delta: 1 | -1) => {
    if (disabled || wholeHours) return;
    const h = hoursOf(timeRef.current);
    const m = (((minutesOf(timeRef.current) + delta * step) % 60) + 60) % 60;
    setTime(makeTime(h, m));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowUp':
        stepHour(1);
        break;
      case 'ArrowDown':
        stepHour(-1);
        break;
      case 'ArrowRight':
        stepMinute(1);
        break;
      case 'ArrowLeft':
        stepMinute(-1);
        break;
      case 'Enter':
        onCheck(timeRef.current);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const [hh, mm] = formatTime(time, mode).split(':') as [string, string];

  return (
    <div class={`digits digits-${status}`} data-testid="digits" data-shake={attempt % 2}>
      <div
        ref={panel}
        class="digits-panel"
        data-testid="digits-panel"
        role="group"
        aria-label={t('a.digits.label')}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        <DigitColumn
          value={hh}
          caption={t('a.digits.hours')}
          upLabel={t('a.digits.hourUp')}
          downLabel={t('a.digits.hourDown')}
          testId="digits-hour"
          disabled={disabled}
          onUp={() => stepHour(1)}
          onDown={() => stepHour(-1)}
        />
        <span class="digits-colon" aria-hidden="true">
          :
        </span>
        <DigitColumn
          value={mm}
          caption={t('a.digits.minutes')}
          upLabel={t('a.digits.minuteUp')}
          downLabel={t('a.digits.minuteDown')}
          testId="digits-minute"
          disabled={disabled}
          locked={wholeHours}
          onUp={() => stepMinute(1)}
          onDown={() => stepMinute(-1)}
        />
        {/* The built time, for the keyboard user; the digits themselves are decorative. */}
        <span class="visually-hidden" role="status" data-testid="digits-value">
          {formatTime(time, mode)}
        </span>
        {status === 'correct' && <Burst />}
      </div>
      {wholeHours && (
        <p class="set-clock-note" role="note">
          {t('a.digits.wholeHours')}
        </p>
      )}
      <button
        type="button"
        class="btn btn-primary"
        disabled={disabled}
        data-testid="digits-check"
        data-sound="none"
        onClick={() => onCheck(timeRef.current)}
      >
        {t('a.set.check')}
      </button>
    </div>
  );
}

interface ColumnProps {
  value: string;
  caption: string;
  upLabel: string;
  downLabel: string;
  testId: string;
  disabled: boolean;
  /** Whole-hour level: the minutes show 00 and have no buttons. */
  locked?: boolean;
  onUp: () => void;
  onDown: () => void;
}

/** One pair of digits with its up and down buttons and a caption under it. */
function DigitColumn({
  value,
  caption,
  upLabel,
  downLabel,
  testId,
  disabled,
  locked = false,
  onUp,
  onDown,
}: ColumnProps) {
  return (
    <div class={`digits-col${locked ? ' digits-col-locked' : ''}`}>
      {!locked && (
        <button
          type="button"
          class="btn digits-step"
          aria-label={upLabel}
          data-testid={`${testId}-up`}
          disabled={disabled}
          onClick={onUp}
        >
          <span aria-hidden="true">▲</span>
        </button>
      )}
      <span class="digital digital-big digits-display" aria-hidden="true" data-testid={testId}>
        <span class="digital-digits">{value}</span>
      </span>
      {!locked && (
        <button
          type="button"
          class="btn digits-step"
          aria-label={downLabel}
          data-testid={`${testId}-down`}
          disabled={disabled}
          onClick={onDown}
        >
          <span aria-hidden="true">▼</span>
        </button>
      )}
      <span class="digits-caption" aria-hidden="true">
        {caption}
      </span>
    </div>
  );
}
