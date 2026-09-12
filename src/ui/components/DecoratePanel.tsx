import type { RefObject } from 'preact';
import { assetUrl } from '../../assets.ts';
import { requireItem, type Item } from '../../catalog/index.ts';
import { isNewItem } from '../../core/inventory.ts';
import type { ItemId, SlotType, Theme } from '../../core/types.ts';
import { SLOT_TYPES } from '../../core/types.ts';
import { save } from '../../state/store.ts';
import type { StringKey } from '../../strings/index.ts';
import { groupKeyHandler } from '../hooks.ts';
import { t } from '../i18n.ts';
import { SidePanel } from './SidePanel.tsx';

interface Props {
  theme: Theme;
  /** Tile picked with the mouse, waiting for a slot click. */
  armed: ItemId | null;
  onArm: (item: ItemId | null) => void;
  /** Keyboard placement: Enter on a tile places it into its (only) compatible slot. */
  onPlace: (item: ItemId) => void;
  onGhost: (item: ItemId | null) => void;
  onClose: () => void;
  /** The button that opened the panel; focus returns to it on close (AT-38). */
  opener?: RefObject<HTMLElement | null>;
}

/** Owned decorations of the theme for one slot: the starter first, then earned in pool order. */
function itemsFor(theme: Theme, slot: SlotType): Item[] {
  return save.value.themes[theme].owned
    .map(requireItem)
    .filter((i) => i.slot === slot)
    .sort((a, b) => Number(b.starter) - Number(a.starter) || a.order - b.order);
}

/**
 * Decorate mode panel (SPEC §4.2): owned decorations grouped by slot type in table order,
 * each tile with the item, its name and an "In room" or "New" label. Mouse: pick a tile, then
 * click a slot; keyboard: arrows between tiles, Enter places. Hover or focus previews a ghost.
 */
export function DecoratePanel({ theme, armed, onArm, onPlace, onGhost, onClose, opener }: Props) {
  const state = save.value;
  const slots = state.themes[theme].slots;
  return (
    <SidePanel
      titleId="decorate-title"
      title={t('s1.decorate')}
      onClose={onClose}
      opener={opener}
      testId="decorate-panel"
    >
      <p class="panel-hint" aria-live="polite" data-testid="decorate-hint">
        {armed ? t('ui.pickSlot') : ''}
      </p>
      <div
        class="tiles"
        role="group"
        aria-label={t('panel.decorations')}
        onKeyDown={groupKeyHandler}
      >
        {SLOT_TYPES.map((slot) => (
          <section key={slot} class="tile-group">
            <h3 class="tile-group-title">{t(`slot.${slot}`)}</h3>
            <div class="tile-grid">
              {itemsFor(theme, slot).map((item) => {
                const inRoom = slots[slot] === item.id;
                const isNew = isNewItem(state, item.id);
                const name = t(item.nameKey as StringKey);
                const pressed = armed === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    class={`tile${inRoom ? ' tile-inroom' : ''}${pressed ? ' tile-armed' : ''}`}
                    aria-pressed={pressed}
                    data-testid={`tile-${item.id}`}
                    data-inroom={inRoom ? 'true' : undefined}
                    data-new={isNew ? 'true' : undefined}
                    onClick={(e) => {
                      if (inRoom) {
                        onArm(null);
                        return;
                      }
                      // detail 0 = keyboard activation (Enter or Space): place straight away.
                      if (e.detail === 0) onPlace(item.id);
                      else onArm(pressed ? null : item.id);
                    }}
                    onMouseEnter={() => onGhost(item.id)}
                    onMouseLeave={() => onGhost(null)}
                    onFocus={() => onGhost(item.id)}
                    onBlur={() => onGhost(null)}
                  >
                    <img src={assetUrl(item.art.tile)} alt="" draggable={false} />
                    <span class="tile-name">{name}</span>
                    {inRoom && (
                      <span class="tile-badge tile-badge-inroom">{t('panel.inRoom')}</span>
                    )}
                    {isNew && !inRoom && (
                      <span class="tile-badge tile-badge-new">{t('panel.new')}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </SidePanel>
  );
}
