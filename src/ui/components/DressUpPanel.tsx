import type { RefObject } from 'preact';
import { useState } from 'preact/hooks';
import { assetUrl } from '../../assets.ts';
import { allCollections, requireItem } from '../../catalog/index.ts';
import { isNewItem, nextPair } from '../../core/inventory.ts';
import type { ItemId, Theme, WardrobeKind } from '../../core/types.ts';
import { dispatch, save } from '../../state/store.ts';
import type { StringKey } from '../../strings/index.ts';
import { groupKeyHandler } from '../hooks.ts';
import { t } from '../i18n.ts';
import { SidePanel } from './SidePanel.tsx';

interface Props {
  theme: Theme;
  onClose: () => void;
  /** The button that opened the panel; focus returns to it on close (AT-38). */
  opener?: RefObject<HTMLElement | null>;
  /** Called after a garment is equipped, with its name (for the live announcement). */
  onWear?: (item: ItemId | null) => void;
}

const TABS: { kind: WardrobeKind; key: StringKey }[] = [
  { kind: 'outfit', key: 'panel.clothes' },
  { kind: 'shoes', key: 'panel.shoes' },
  { kind: 'hair', key: 'panel.hair' },
  { kind: 'extra', key: 'panel.extras' },
];

const THEME_BADGE: Record<'space' | 'sweet', string> = { space: '🚀', sweet: '💗' };

/**
 * Dress-up panel (SPEC §4.4): tabs Clothes / Shoes / Hair / Extras, the worn tile with a check
 * mark and thick outline, immediate equip through `inventory/wear` (Extras has a "Nothing"
 * tile → `inventory/removeExtra`), theme badges on earned garments, and "What will you earn
 * next?" with the theme's next pair and one dot per collection.
 */
export function DressUpPanel({ theme, onClose, onWear, opener }: Props) {
  const [tab, setTab] = useState<WardrobeKind>('outfit');
  const state = save.value;
  const heroine = state.heroine;
  const items = state.wardrobe.map(requireItem).filter((i) => i.kind === tab);
  const pair = nextPair(state, theme);
  const collections = allCollections.filter((c) => c.theme === theme);
  const activeCollection = pair[0] ? requireItem(pair[0]).collection : undefined;

  const wear = (id: ItemId | null) => {
    if (id === null) dispatch({ type: 'inventory/removeExtra' });
    else dispatch({ type: 'inventory/wear', item: id });
    onWear?.(id);
  };

  return (
    <SidePanel
      titleId="dressup-title"
      title={t('s1.dressup')}
      onClose={onClose}
      opener={opener}
      testId="dressup-panel"
    >
      <div class="tabs" role="tablist" aria-label={t('ui.tabs')} onKeyDown={groupKeyHandler}>
        {TABS.map(({ kind, key }) => (
          <button
            key={kind}
            type="button"
            role="tab"
            id={`tab-${kind}`}
            class="chip tab"
            aria-selected={tab === kind}
            aria-controls={`tabpanel-${kind}`}
            tabIndex={tab === kind ? 0 : -1}
            data-testid={`tab-${kind}`}
            onClick={() => setTab(kind)}
            onFocus={() => setTab(kind)}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        class="tile-grid"
        onKeyDown={groupKeyHandler}
        data-testid="wardrobe-tiles"
      >
        {tab === 'extra' && (
          <button
            type="button"
            class="tile tile-nothing"
            aria-pressed={heroine.extra === null}
            data-testid="tile-nothing"
            onClick={() => wear(null)}
          >
            <span class="tile-check" aria-hidden="true">
              {heroine.extra === null ? '✓' : ''}
            </span>
            <span class="tile-nothing-mark" aria-hidden="true">
              ∅
            </span>
            <span class="tile-name">{t('panel.nothing')}</span>
          </button>
        )}
        {items.map((item) => {
          const worn = heroine[tab] === item.id;
          const badgeTheme = item.theme === 'space' || item.theme === 'sweet' ? item.theme : null;
          return (
            <button
              key={item.id}
              type="button"
              class={`tile${worn ? ' tile-worn' : ''}`}
              aria-pressed={worn}
              data-testid={`tile-${item.id}`}
              data-new={isNewItem(state, item.id) ? 'true' : undefined}
              onClick={() => wear(item.id)}
            >
              <span class="tile-check" aria-hidden="true">
                {worn ? '✓' : ''}
              </span>
              {badgeTheme && !item.starter && (
                <span
                  class={`tile-theme tile-theme-${badgeTheme}`}
                  role="img"
                  aria-label={t(`ui.themeBadge.${badgeTheme}`)}
                >
                  {THEME_BADGE[badgeTheme]}
                </span>
              )}
              <img src={assetUrl(item.art.tile)} alt="" draggable={false} />
              <span class="tile-name">{t(item.nameKey as StringKey)}</span>
              {isNewItem(state, item.id) && (
                <span class="tile-badge tile-badge-new">{t('panel.new')}</span>
              )}
            </button>
          );
        })}
      </div>
      <section class="next-prizes" data-testid="next-prizes">
        <h3 class="next-prizes-title">{t('s1.nextPrizes')}</h3>
        {pair.length > 0 ? (
          <ul class="next-prizes-list">
            {pair.map((id) => {
              const item = requireItem(id);
              return (
                <li key={id} class="next-prize">
                  <img src={assetUrl(item.art.tile)} alt="" draggable={false} />
                  <span>{t(item.nameKey as StringKey)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="next-prizes-empty">{t('s2.allCollected')}</p>
        )}
        <div class="collection-dots" role="img" aria-label={t('ui.collectionDots')}>
          {collections.map((c) => (
            <span
              key={c.id}
              class={`dot${c.id === activeCollection ? ' dot-active' : ''}`}
              title={t(c.nameKey as StringKey)}
            />
          ))}
        </div>
      </section>
    </SidePanel>
  );
}
