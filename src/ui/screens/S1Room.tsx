import type { Theme } from '../../core/types.ts';
import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import { SLOT_TYPES } from '../../core/types.ts';
import { collectedCount } from '../../core/inventory.ts';
import { earnableTotal } from '../../catalog/index.ts';
import { save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import { t } from '../i18n.ts';
import { useFocusOnMount } from '../hooks.ts';
import { HeroinePreview } from '../components/Heroine.tsx';

interface Props {
  theme: Theme;
}

/**
 * S1 Room (SPEC §3.4). M0 stub: shows the room background, the seven slot contents as
 * placeholders, the heroine, the fixed chrome and the way back to S0. Panels come in M3.
 */
export function S1Room({ theme }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const state = save.value.themes[theme];
  return (
    <main class={`screen s1 s1-${theme}`} aria-labelledby="s1-title">
      <img src={assetUrl(`${theme}/room/background`)} alt="" class="room-bg" draggable={false} />
      <header class="s1-topleft">
        <h1 id="s1-title" class="room-badge" tabIndex={-1} ref={heading}>
          {t(`room.${theme}`)}
        </h1>
        <button
          type="button"
          class="btn"
          data-testid="rooms-button"
          onClick={() => go({ id: 'S0' })}
        >
          {t('s1.rooms')}
        </button>
      </header>
      <div class="s1-topright">
        <span class="counter" data-testid="collected">
          ★{' '}
          {t('s1.collected', { n: collectedCount(save.value, theme), total: earnableTotal(theme) })}
        </span>
      </div>
      <div class="room-slots" aria-hidden="true">
        {SLOT_TYPES.map((slot) => {
          const item = requireItem(state.slots[slot]);
          return (
            <img
              key={slot}
              src={assetUrl(item.art.room!)}
              alt=""
              class={`slot slot-${slot}`}
              draggable={false}
            />
          );
        })}
      </div>
      <div class="room-heroine">
        <HeroinePreview face="happy" />
      </div>
      <div class="s1-bottom">
        <button type="button" class="btn btn-lg" disabled title="M3">
          {t('s1.decorate')}
        </button>
        <button type="button" class="btn btn-lg" disabled title="M3">
          {t('s1.dressup')}
        </button>
        <button type="button" class="btn btn-lg btn-primary" disabled title="M2">
          {t('s1.mission')}
        </button>
      </div>
    </main>
  );
}
