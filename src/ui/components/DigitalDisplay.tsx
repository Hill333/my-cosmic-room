import { formatTime } from '../../core/time.ts';
import type { DigitalMode, TimeValue } from '../../core/types.ts';

interface Props {
  time: TimeValue;
  mode: DigitalMode;
  /** Optional caption above the digits ("Leaves" / "Arrives"). */
  caption?: string;
  /** 72 px digits on the big display, 44 px inside answer buttons (SPEC §6.2). */
  size?: 'big' | 'button';
  /**
   * Accessible name, only when the display is a question input. Without one the display is
   * hidden from the accessibility tree, so an answer option never reveals its meaning.
   */
  label?: string;
  class?: string;
}

/** Digital time display (SPEC §6.2): dark rounded panel, rounded UI font, static colon. */
export function DigitalDisplay({
  time,
  mode,
  caption,
  size = 'big',
  label,
  class: className,
}: Props) {
  const classes = ['digital', `digital-${size}`, className].filter(Boolean).join(' ');
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };
  return (
    <span class={classes} {...a11y}>
      {caption && <span class="digital-caption">{caption}</span>}
      <span class="digital-digits">{formatTime(time, mode)}</span>
    </span>
  );
}
