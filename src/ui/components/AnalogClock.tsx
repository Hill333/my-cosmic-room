import type { DayPeriod } from '../../core/time.ts';
import { hourAngle, minuteAngle } from '../../core/time.ts';
import type { ReadingLevel, Theme, TimeValue } from '../../core/types.ts';
import { t } from '../i18n.ts';

/** Geometry of the clock face in its 200 × 200 viewBox (SPEC §6.1). */
export const CLOCK = {
  centre: 100,
  faceRadius: 90,
  rimWidth: 6,
  numeralRadius: 70,
  numeralSize: 18,
  hourTick: { from: 78, to: 88, width: 3, quarterFrom: 76 },
  minuteTick: { from: 83, to: 88, width: 1.5 },
  hourHand: { length: 48, width: 9 },
  minuteHand: { length: 70, width: 6 },
  capRadius: 6,
  /** Extra hit width around a hand for dragging, in viewBox units (SPEC §6.4). */
  hitPadding: 24,
} as const;

/** Stage sizes in px (SPEC §6.1). */
export const CLOCK_SIZE = { puzzle: 440, option: 240, wall: 120 } as const;

export type Hand = 'hour' | 'minute';

interface Props {
  time: TimeValue;
  /** Controls the tick marks: quarter emphasis from R3, minute ticks at R4. */
  level?: ReadingLevel;
  theme?: Theme;
  /** Diameter in stage px. */
  size?: number;
  /** Accessible name; the time itself is never exposed (SPEC §6.1). */
  label?: string;
  /** `presentation` when a parent button carries the label (MATCH options). */
  decorative?: boolean;
  /** Faint target hands drawn under the real hands (SET hint, SPEC §9.3). */
  ghost?: TimeValue | null;
  /** Day-period badge under the clock in 24-hour reading mode. */
  period?: DayPeriod | null;
  /** Styling hooks for the SET clock. */
  interactive?: boolean;
  dragging?: Hand | null;
  minuteLocked?: boolean;
  class?: string;
}

const NUMERALS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOUR_TICKS = Array.from({ length: 12 }, (_, i) => i);
const MINUTE_TICKS = Array.from({ length: 60 }, (_, i) => i).filter((i) => i % 5 !== 0);
const PERIOD_ICON: Record<DayPeriod, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌇',
  night: '🌙',
};

/**
 * Pure analog clock (SPEC §6.1): one SVG for every clock in the game. Hands point at 12 and
 * are rotated with `rotate(angle 100 100)`; the hour hand moves continuously with the minutes.
 */
export function AnalogClock({
  time,
  level = 2,
  theme = 'space',
  size = CLOCK_SIZE.puzzle,
  label,
  decorative = false,
  ghost = null,
  period = null,
  interactive = false,
  dragging = null,
  minuteLocked = false,
  class: className,
}: Props) {
  const c = CLOCK.centre;
  const hourDeg = hourAngle(time);
  const minuteDeg = minuteAngle(time);
  const classes = ['clock', `clock-${theme}`, interactive && 'clock-interactive', className]
    .filter(Boolean)
    .join(' ');
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': label ?? t('clock.analog') };

  return (
    <div class={classes} style={{ width: `${size}px` }} data-dragging={dragging ?? undefined}>
      <svg viewBox="0 0 200 200" width={size} height={size} class="clock-svg" {...a11y}>
        <circle
          class="clock-face"
          cx={c}
          cy={c}
          r={CLOCK.faceRadius}
          stroke-width={CLOCK.rimWidth}
        />
        <g class="clock-ticks" aria-hidden="true">
          {HOUR_TICKS.map((i) => {
            const quarter = level >= 3 && i % 3 === 0;
            const from = quarter ? CLOCK.hourTick.quarterFrom : CLOCK.hourTick.from;
            return (
              <line
                key={`h${i}`}
                x1={c}
                y1={c - CLOCK.hourTick.to}
                x2={c}
                y2={c - from}
                stroke-width={CLOCK.hourTick.width}
                transform={`rotate(${i * 30} ${c} ${c})`}
              />
            );
          })}
          {level >= 4 &&
            MINUTE_TICKS.map((i) => (
              <line
                key={`m${i}`}
                x1={c}
                y1={c - CLOCK.minuteTick.to}
                x2={c}
                y2={c - CLOCK.minuteTick.from}
                stroke-width={CLOCK.minuteTick.width}
                transform={`rotate(${i * 6} ${c} ${c})`}
              />
            ))}
        </g>
        <g class="clock-numerals" aria-hidden="true" font-size={CLOCK.numeralSize}>
          {NUMERALS.map((n) => {
            const a = (n * 30 * Math.PI) / 180;
            const x = c + CLOCK.numeralRadius * Math.sin(a);
            const y = c - CLOCK.numeralRadius * Math.cos(a);
            return (
              <text key={n} x={x.toFixed(2)} y={y.toFixed(2)}>
                {n}
              </text>
            );
          })}
        </g>
        {ghost !== null && (
          <g class="clock-ghost" aria-hidden="true">
            <line
              x1={c}
              y1={c}
              x2={c}
              y2={c - CLOCK.hourHand.length}
              stroke-width={CLOCK.hourHand.width}
              transform={`rotate(${hourAngle(ghost)} ${c} ${c})`}
            />
            <line
              x1={c}
              y1={c}
              x2={c}
              y2={c - CLOCK.minuteHand.length}
              stroke-width={CLOCK.minuteHand.width}
              transform={`rotate(${minuteAngle(ghost)} ${c} ${c})`}
            />
          </g>
        )}
        <g class="clock-hands" aria-hidden="true">
          <line
            class="clock-hand clock-hand-hour"
            data-hand="hour"
            x1={c}
            y1={c}
            x2={c}
            y2={c - CLOCK.hourHand.length}
            stroke-width={CLOCK.hourHand.width}
            transform={`rotate(${hourDeg} ${c} ${c})`}
          />
          <line
            class={`clock-hand clock-hand-minute${minuteLocked ? ' clock-hand-locked' : ''}`}
            data-hand="minute"
            x1={c}
            y1={c}
            x2={c}
            y2={c - CLOCK.minuteHand.length}
            stroke-width={CLOCK.minuteHand.width}
            transform={`rotate(${minuteDeg} ${c} ${c})`}
          />
          <circle class="clock-cap" cx={c} cy={c} r={CLOCK.capRadius} />
        </g>
      </svg>
      {period && (
        <span class="clock-period" data-period={period}>
          <span aria-hidden="true">{PERIOD_ICON[period]}</span> {t(`period.${period}`)}
        </span>
      )}
    </div>
  );
}

/** Tip of a hand in viewBox coordinates for the given angle. */
function tip(angleDeg: number, length: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CLOCK.centre + length * Math.sin(a), CLOCK.centre - length * Math.cos(a)];
}

function distanceToSegment(px: number, py: number, x2: number, y2: number): number {
  const x1 = CLOCK.centre;
  const y1 = CLOCK.centre;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const cx = x1 + u * dx;
  const cy = y1 + u * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Which hand a pointer at (x, y) in viewBox units grabs (SPEC §6.4): inside the hand width
 * plus the hit padding; when both qualify, the nearer hand tip wins.
 */
export function hitTestHand(x: number, y: number, time: TimeValue): Hand | null {
  const hourTip = tip(hourAngle(time), CLOCK.hourHand.length);
  const minuteTip = tip(minuteAngle(time), CLOCK.minuteHand.length);
  const hourHit =
    distanceToSegment(x, y, ...hourTip) <= (CLOCK.hourHand.width + CLOCK.hitPadding) / 2;
  const minuteHit =
    distanceToSegment(x, y, ...minuteTip) <= (CLOCK.minuteHand.width + CLOCK.hitPadding) / 2;
  if (hourHit && minuteHit) {
    const dh = Math.hypot(x - hourTip[0], y - hourTip[1]);
    const dm = Math.hypot(x - minuteTip[0], y - minuteTip[1]);
    return dh <= dm ? 'hour' : 'minute';
  }
  if (hourHit) return 'hour';
  if (minuteHit) return 'minute';
  return null;
}
