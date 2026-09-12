/**
 * Stage: a 1536 × 1024 logical drawing area scaled uniformly to the window and
 * letterboxed with the theme's background colour (SPEC §13.2, §16.3).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

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
  children: ComponentChildren;
}

export function Stage({ background, children }: StageProps) {
  const scale = useStageScale();
  return (
    <div class="stage-viewport" style={{ background }} data-scale={scale.toFixed(3)}>
      <div
        class="stage"
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
