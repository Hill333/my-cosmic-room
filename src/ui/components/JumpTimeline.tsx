import { decomposeJumps, formatJump } from '../../core/elapsed.ts';
import { formatTime } from '../../core/time.ts';
import type { TimeValue } from '../../core/types.ts';
import { language } from '../../state/store.ts';

interface Props {
  start: TimeValue;
  end: TimeValue;
}

/** Geometry in SVG units; the timeline is a sequence of equally spaced jumps (SPEC §8.5). */
const WIDTH = 880;
const HEIGHT = 150;
const PAD = 90;
const BASE_Y = 92;
const ARC_TOP = 30;
const LABEL_Y = 26;
const PILL = { width: 110, height: 38, y: 108 };
/** Reveal delay per jump (SPEC §8.5: 300 ms each; instant under reduced motion via CSS). */
const REVEAL_MS = 300;

/**
 * The jump timeline (SPEC §8.4–§8.5): points spaced equally regardless of duration, a pill
 * with the 24-hour time under each point, and an arc with an arrowhead and a short label
 * per jump. Jumps reveal one after another with CSS animation delays.
 */
export function JumpTimeline({ start, end }: Props) {
  const lang = language.value;
  const jumps = decomposeJumps(start, end);
  const points = [start, ...jumps.map((j) => j.to)];
  const stepX = (WIDTH - 2 * PAD) / Math.max(1, points.length - 1);
  const x = (i: number) => PAD + i * stepX;
  const description = jumps
    .map((j) => `${formatJump(j.minutes, lang)} → ${formatTime(j.to, '24h')}`)
    .join(', ');

  return (
    <svg
      class="jumps"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={description}
      data-testid="jump-timeline"
      data-jumps={jumps.length}
    >
      <defs>
        <marker
          id="jump-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" class="jump-arrowhead" />
        </marker>
      </defs>
      <line class="jump-base" x1={x(0)} y1={BASE_Y} x2={x(points.length - 1)} y2={BASE_Y} />
      <Point x={x(0)} time={start} />
      {jumps.map((j, i) => {
        const from = x(i);
        const to = x(i + 1);
        const mid = (from + to) / 2;
        return (
          <g
            key={i}
            class="jump-reveal"
            style={{ animationDelay: `${i * REVEAL_MS}ms` }}
            data-testid="jump"
          >
            <path
              class="jump-arc"
              d={`M ${from} ${BASE_Y - 10} Q ${mid} ${ARC_TOP} ${to - 6} ${BASE_Y - 12}`}
              marker-end="url(#jump-arrow)"
            />
            <text class="jump-label" x={mid} y={LABEL_Y} text-anchor="middle">
              {formatJump(j.minutes, lang)}
            </text>
            <Point x={to} time={j.to} />
          </g>
        );
      })}
    </svg>
  );
}

function Point({ x, time }: { x: number; time: TimeValue }) {
  return (
    <g class="jump-point">
      <circle cx={x} cy={BASE_Y} r={9} />
      <rect
        x={x - PILL.width / 2}
        y={PILL.y}
        width={PILL.width}
        height={PILL.height}
        rx={PILL.height / 2}
        class="jump-pill"
      />
      <text
        class="jump-pill-text"
        x={x}
        y={PILL.y + PILL.height / 2}
        text-anchor="middle"
        dominant-baseline="central"
      >
        {formatTime(time, '24h')}
      </text>
    </g>
  );
}
