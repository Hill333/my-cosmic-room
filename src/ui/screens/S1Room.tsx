import { useEffect } from 'preact/hooks';
import type { ItemId, Theme } from '../../core/types.ts';
import { assetUrl } from '../../assets.ts';
import { collectedCount } from '../../core/inventory.ts';
import { earnableTotal } from '../../catalog/index.ts';
import { save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import { t } from '../i18n.ts';
import { useFocusOnMount } from '../hooks.ts';
import { RoomScene } from '../components/RoomScene.tsx';

interface Props {
  theme: Theme;
  /** Item just applied from S5: shown in place with a sparkle (SPEC §3.4). */
  sparkle?: ItemId | null;
}

const ENTRY_ART: Record<Theme, string> = {
  space: 'space/entry/toyRocket',
  sweet: 'sweet/entry/toyLetterbox',
};

/**
 * S1 Room (SPEC §3.4). M0/M2 state: the room scene, the fixed chrome, the way back to S0 and
 * the mission entry (button, entry object and the M key). Decorate and Dress-up panels come in M3.
 */
export function S1Room({ theme, sparkle = null }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const state = save.value.themes[theme];
  const openBoard = () => go({ id: 'S2', theme });

  // Keyboard shortcuts (SPEC §13.1): M opens the mission board.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) openBoard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [theme]);

  return (
    <main class={`screen s1 s1-${theme}`} aria-labelledby="s1-title">
      <RoomScene theme={theme} slots={state.slots} heroine={save.value.heroine} sparkle={sparkle} />
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
      <button
        type="button"
        class="entry-object"
        aria-label={t('s1.mission')}
        data-testid="entry-object"
        onClick={openBoard}
      >
        <img src={assetUrl(ENTRY_ART[theme])} alt="" draggable={false} />
      </button>
      <div class="s1-bottom">
        <button type="button" class="btn btn-lg" disabled title="M3">
          {t('s1.decorate')}
        </button>
        <button type="button" class="btn btn-lg" disabled title="M3">
          {t('s1.dressup')}
        </button>
        <button
          type="button"
          class="btn btn-lg btn-primary"
          data-testid="mission-button"
          onClick={openBoard}
        >
          <span aria-hidden="true">{theme === 'space' ? '🚀 ' : '✉️ '}</span>
          {t('s1.mission')}
        </button>
      </div>
    </main>
  );
}
