import type { Theme } from '../../core/types.ts';
import { assetUrl } from '../../assets.ts';
import { HeroinePreview } from './Heroine.tsx';
import { Companion } from './Companion.tsx';
import { THEME_UI } from '../themes.ts';

interface Props {
  theme: Theme;
  name: string;
  onOpen: () => void;
  cardRef?: ((el: HTMLButtonElement | null) => void) | undefined;
}

/**
 * Room card on S0: painted thumbnail (a small derived copy, so the title screen never loads
 * the full room backgrounds, SPEC §16.3) looking at the room's recognisable side, the
 * heroine in her current outfit with the room's companion beside her, and the room name
 * with its icon (D21: four cards must read apart at a glance).
 */
export function RoomCard({ theme, name, onOpen, cardRef }: Props) {
  const ui = THEME_UI[theme];
  return (
    <button
      type="button"
      class={`room-card room-card-${theme}`}
      data-testid={`room-card-${theme}`}
      onClick={onOpen}
      {...(cardRef ? { ref: cardRef } : {})}
    >
      <span class="room-card-thumb" aria-hidden="true">
        <img
          src={assetUrl(`${theme}/room/thumb`)}
          alt=""
          class="room-card-bg"
          style={{ objectPosition: `${ui.cardFocus} center` }}
        />
        <span class="room-card-companion">
          <Companion theme={theme} pose="idle" />
        </span>
        <span class="room-card-heroine">
          <HeroinePreview />
        </span>
      </span>
      <span class="room-card-name">
        <span class="room-card-icon" aria-hidden="true">
          {ui.cardIcon}
        </span>
        {name}
      </span>
    </button>
  );
}
