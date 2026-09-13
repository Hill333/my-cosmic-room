import { formatTime } from '../../core/time.ts';
import type { ScheduleSegment, Theme } from '../../core/types.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';

interface Props {
  theme: Theme;
  segments: ScheduleSegment[];
  /** Index of the segment the question asks about: outlined in the bar and the legend. */
  ask: number;
}

/** Geometry in SVG units, the same width as the jump timeline (SPEC §8.6). */
const WIDTH = 880;
const HEIGHT = 90;
const PAD = 40;
const BAR = { y: 4, height: 50 };
const TICK = { minor: 6, major: 12, y: BAR.y + BAR.height };
const LABEL_Y = TICK.y + 31;
/** Badge radius, shrunk on a segment too narrow for the full circle (a 15-minute one at E2). */
const BADGE = { radius: 18, min: 12 };
/** Hour labels only when the bar spans more than this, so they never collide. */
const HALF_HOUR_LABELS_UP_TO = 180;

const ORDINALS = ['1', '2', '3', '4'];

/**
 * The day-plan bar (SPEC §8.6): contiguous coloured segments over a quarter-hour tick scale
 * with 24-hour time labels. Each segment carries its ordinal badge and the legend below pairs
 * the badge, the colour and the activity name, so colour is never the only cue (SPEC §13.2).
 * The asked segment is outlined in the bar and in the legend. No animation.
 */
export function ScheduleBar({ theme, segments, ask }: Props) {
  const first = segments[0]!.start;
  const last = segments[segments.length - 1]!.end;
  const span = last - first;
  const scale = (WIDTH - 2 * PAD) / span;
  const x = (time: number) => PAD + (time - first) * scale;
  const labelStep = span <= HALF_HOUR_LABELS_UP_TO ? 30 : 60;
  const ticks: number[] = [];
  for (let m = first; m <= last; m += 15) ticks.push(m);
  const name = (segment: ScheduleSegment) => t(`sched.${theme}.${segment.label}` as StringKey);
  const description = segments
    .map((s) =>
      t('b.sched.segment', {
        activity: name(s),
        start: formatTime(s.start, '24h'),
        end: formatTime(s.end, '24h'),
      }),
    )
    .join('; ');

  return (
    <div class="sched" data-testid="schedule">
      <svg
        class="sched-bar"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={`${t('b.sched.label')}: ${description}`}
        data-testid="schedule-bar"
      >
        {segments.map((s, i) => {
          const left = x(s.start);
          const width = x(s.end) - left;
          const asked = i === ask;
          const radius = Math.max(BADGE.min, Math.min(BADGE.radius, width / 2 - 4));
          return (
            <g key={i} class={`sched-segment sched-fill-${s.label}${asked ? ' sched-asked' : ''}`}>
              <rect x={left} y={BAR.y} width={width} height={BAR.height} rx={10} />
              <circle
                cx={left + width / 2}
                cy={BAR.y + BAR.height / 2}
                r={radius}
                class="sched-badge"
              />
              <text
                x={left + width / 2}
                y={BAR.y + BAR.height / 2}
                text-anchor="middle"
                dominant-baseline="central"
                class="sched-badge-text"
                style={{ fontSize: `${radius * 1.2}px` }}
              >
                {ORDINALS[i]}
              </text>
            </g>
          );
        })}
        {ticks.map((m) => {
          const major = m % labelStep === 0;
          return (
            <g key={m} class="sched-tick">
              <line
                x1={x(m)}
                y1={TICK.y}
                x2={x(m)}
                y2={TICK.y + (major ? TICK.major : TICK.minor)}
              />
              {major && (
                <text x={x(m)} y={LABEL_Y} text-anchor="middle" class="sched-time">
                  {formatTime(m, '24h')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ol class="sched-legend" aria-hidden="true">
        {segments.map((s, i) => (
          <li
            key={i}
            class={`sched-key sched-fill-${s.label}${i === ask ? ' sched-asked' : ''}`}
            data-testid="schedule-key"
          >
            <span class="sched-swatch">{ORDINALS[i]}</span>
            <span class="sched-name">{name(s)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
