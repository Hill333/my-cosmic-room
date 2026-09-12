import { MAX_STARS } from '../../core/inventory.ts';
import type { Theme } from '../../core/types.ts';
import { t } from '../i18n.ts';

interface Props {
  theme: Theme;
  stars: number;
  /** Extra class for placement (the room poster or the S5 card). */
  class?: string;
  style?: Record<string, string>;
  testId?: string | undefined;
}

const COLUMNS = 6;
const ROWS = 4;
/** Five-point star around the origin, outer radius 30, inner 13. */
const STAR_POINTS =
  '0,-30 7.6,-10.5 28.5,-9.3 12.4,4 17.6,24.3 0,13 -17.6,24.3 -12.4,4 -28.5,-9.3 -7.6,-10.5';

/**
 * Star chart poster (SPEC §10.5): 24 outlined stars in a 6 × 4 grid on a 600 × 400 poster,
 * theme-tinted by CSS, one star filled per completed mission after the pool is empty, and a
 * golden frame once all 24 are filled. Hand-drawn SVG, drawn inline so the fill is state.
 */
export function StarChart({ theme, stars, class: className, style, testId }: Props) {
  const filled = Math.max(0, Math.min(MAX_STARS, stars));
  const full = filled >= MAX_STARS;
  return (
    <svg
      viewBox="0 0 600 400"
      class={`star-chart star-chart-${theme}${full ? ' star-chart-full' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`${t('ui.starChart')}: ${t('s5.starCount', { n: filled, total: MAX_STARS })}`}
      style={style}
      data-testid={testId}
      data-stars={filled}
    >
      <rect class="star-chart-frame" x="8" y="8" width="584" height="384" rx="28" />
      {full && <rect class="star-chart-inner" x="26" y="26" width="548" height="348" rx="18" />}
      {Array.from({ length: ROWS * COLUMNS }, (_, i) => {
        const cx = 75 + (i % COLUMNS) * 90;
        const cy = 68 + Math.floor(i / COLUMNS) * 88;
        return (
          <polygon
            key={i}
            class={`star-chart-star${i < filled ? ' star-chart-filled' : ''}`}
            points={STAR_POINTS}
            transform={`translate(${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}
