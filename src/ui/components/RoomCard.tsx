import type { Theme } from '../../core/types.ts';
import { assetUrl } from '../../assets.ts';
import { HeroinePreview } from './Heroine.tsx';

interface Props {
  theme: Theme;
  name: string;
  onOpen: () => void;
  cardRef?: ((el: HTMLButtonElement | null) => void) | undefined;
}

/**
 * Room card on S0: painted thumbnail (a small derived copy, so the title screen never loads
 * the full room backgrounds, SPEC §16.3), heroine in her current outfit and the room name.
 */
export function RoomCard({ theme, name, onOpen, cardRef }: Props) {
  return (
    <button
      type="button"
      class={`room-card room-card-${theme}`}
      data-testid={`room-card-${theme}`}
      onClick={onOpen}
      {...(cardRef ? { ref: cardRef } : {})}
    >
      <span class="room-card-thumb" aria-hidden="true">
        <img src={assetUrl(`${theme}/room/thumb`)} alt="" class="room-card-bg" />
        <span class="room-card-heroine">
          <HeroinePreview />
        </span>
      </span>
      <span class="room-card-name">{name}</span>
    </button>
  );
}
