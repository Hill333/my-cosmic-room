/**
 * Stage: a 1536 × 1024 logical drawing area scaled uniformly to the window and
 * letterboxed with the theme's background colour (SPEC §13.2, §16.3).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { MotionSetting } from '../core/types.ts';

export const STAGE_WIDTH = 1536;
export const STAGE_HEIGHT = 1024;

function computeScale(): number {
  return Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
}

export function useStageScale(): number {
  const [scale, setScale] = useState(() => computeScale());
  useEffect(() => {
    const update = () => setScale(computeScale());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

interface StageProps {
  background: string;
  /** Motion setting (SPEC §13.3); the CSS reads it from `data-motion` on the stage. */
  motion?: MotionSetting;
  children: ComponentChildren;
}

export function Stage({ background, motion = 'system', children }: StageProps) {
  const scale = useStageScale();
  return (
    <div class="stage-viewport" style={{ background }} data-scale={scale.toFixed(3)}>
      <div
        class="stage"
        data-motion={motion}
        style={{
          width: `${STAGE_WIDTH}px`,
          height: `${STAGE_HEIGHT}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
