import { assetUrl } from '../../assets.ts';
import type { Theme } from '../../core/types.ts';
import { t } from '../i18n.ts';

export type CompanionPose = 'idle' | 'hmm' | 'cheer' | 'special';

interface Props {
  theme: Theme;
  pose?: CompanionPose;
  /** Rotates the cheer animation (SPEC §9.4: four cheers, two "hmm" poses). */
  variant?: number;
}

const COMPANION: Record<Theme, string> = { space: 'pip', sweet: 'mimi' };

/** Pip or Mimi (SPEC §3.6): a placeholder image per pose; the pose animates through CSS. */
export function Companion({ theme, pose = 'idle', variant = 0 }: Props) {
  return (
    <span
      class={`companion companion-${pose} companion-v${variant}`}
      role="img"
      aria-label={t(`companion.${theme}`)}
      data-pose={pose}
    >
      <img
        src={assetUrl(`${theme}/companion/${COMPANION[theme]}/${pose}`)}
        alt=""
        draggable={false}
      />
    </span>
  );
}
