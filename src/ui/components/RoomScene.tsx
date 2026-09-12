import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import type { HeroineState, ItemId, SlotMap, Theme } from '../../core/types.ts';
import { SLOT_TYPES } from '../../core/types.ts';
import { HeroinePreview } from './Heroine.tsx';

interface Props {
  theme: Theme;
  slots: SlotMap;
  /** Heroine layers to draw; defaults to the saved heroine inside HeroinePreview. */
  heroine?: HeroineState;
  /** Item that was just applied: gets the sparkle (SPEC §3.4, §10.3). */
  sparkle?: ItemId | null;
  face?: 'neutral' | 'happy' | 'thinking' | 'cheering';
}

/**
 * The painted room, its seven slot contents and the heroine (SPEC §3.4). Purely visual and
 * driven by the props, so S5's preview can show a slot or garment before it is applied.
 */
export function RoomScene({ theme, slots, heroine, sparkle = null, face = 'happy' }: Props) {
  const sparkleOnHeroine =
    sparkle !== null &&
    heroine !== undefined &&
    (heroine.outfit === sparkle || heroine.shoes === sparkle || heroine.extra === sparkle);
  return (
    <div class="room-scene" aria-hidden="true">
      <img src={assetUrl(`${theme}/room/background`)} alt="" class="room-bg" draggable={false} />
      <div class="room-slots">
        {SLOT_TYPES.map((slot) => {
          const item = requireItem(slots[slot]);
          const classes = ['slot', `slot-${slot}`, item.id === sparkle && 'sparkle']
            .filter(Boolean)
            .join(' ');
          return (
            <img
              key={slot}
              src={assetUrl(item.art.room!)}
              alt=""
              class={classes}
              data-testid={`slot-${slot}`}
              data-item={item.id}
              draggable={false}
            />
          );
        })}
      </div>
      <div class={`room-heroine${sparkleOnHeroine ? ' sparkle' : ''}`} data-testid="room-heroine">
        <HeroinePreview face={face} heroine={heroine} />
      </div>
    </div>
  );
}
