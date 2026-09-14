import { assetUrl } from '../../assets.ts';
import type { Theme } from '../../core/types.ts';
import { t } from '../i18n.ts';
import { THEME_UI } from '../themes.ts';

export type CompanionPose = 'idle' | 'hmm' | 'cheer' | 'special';

interface Props {
  theme: Theme;
  pose?: CompanionPose;
  /** Rotates the cheer animation (SPEC §9.4: four cheers, two "hmm" poses). */
  variant?: number;
}

/** Pip, Mimi, Lulu or Bori (SPEC §3.6): one image per pose; the pose animates through CSS. */
export function Companion({ theme, pose = 'idle', variant = 0 }: Props) {
  return (
    <span
      class={`companion companion-${pose} companion-v${variant}`}
      role="img"
      aria-label={t(`companion.${theme}`)}
      data-pose={pose}
    >
      <img
        src={assetUrl(`${theme}/companion/${THEME_UI[theme].companion}/${pose}`)}
        alt=""
        draggable={false}
      />
    </span>
  );
}
