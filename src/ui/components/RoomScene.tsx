import { assetEntry, assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import {
  COMPANION_GEOMETRY,
  COMPANION_Z,
  HEROINE_GEOMETRY,
  HEROINE_Z,
  SLOT_GEOMETRY,
  slotBox,
  type StageBox,
} from '../../catalog/slots.ts';
import type { HeroineState, ItemId, SlotMap, SlotType, Theme } from '../../core/types.ts';
import { SLOT_TYPES } from '../../core/types.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { Companion, type CompanionPose } from './Companion.tsx';
import { HeroinePreview } from './Heroine.tsx';

export type RoomMode = 'free' | 'decorate' | 'dressup';

/** A running reaction (SPEC §4.3); `key` restarts the CSS animation on repeated clicks. */
export interface RoomReaction {
  target: SlotType | 'heroine' | 'companion';
  key: number;
}

export interface RoomInteraction {
  mode: RoomMode;
  /** Decorate mode: the tile picked with the mouse; compatible slots get the target outline. */
  armed: ItemId | null;
  /** Decorate mode: the tile under the pointer or focus; drawn faintly in its slot. */
  ghost: ItemId | null;
  /** Slot whose item was just placed: plays the pop animation. */
  pop: SlotType | null;
  reaction: RoomReaction | null;
  onSlotClick: (slot: SlotType) => void;
  onHeroineClick: () => void;
  onCompanionClick: () => void;
  onReactionEnd: () => void;
}

interface Props {
  theme: Theme;
  slots: SlotMap;
  /** Heroine layers to draw; defaults to the saved heroine inside HeroinePreview. */
  heroine?: HeroineState;
  /** Item that was just applied: gets the sparkle (SPEC §3.4, §10.3). */
  sparkle?: ItemId | null;
  face?: 'neutral' | 'happy' | 'thinking' | 'cheering';
  /** Evening lighting from the LAMP reaction (SPEC §4.3), saved per theme. */
  lampOn?: boolean;
  /** Present on S1 only: slots, heroine and companion become buttons. */
  interaction?: RoomInteraction;
}

function boxStyle(box: StageBox) {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    zIndex: box.z,
  };
}

/** Stage box of a room layer in its slot (SPEC §4.1); shared with the debug overlay. */
export function roomLayerBox(theme: Theme, slot: SlotType, artId: string): StageBox {
  const entry = assetEntry(artId);
  return slotBox(SLOT_GEOMETRY[theme][slot], entry.size, entry.pivot);
}

/**
 * The painted room, its seven slot contents, the heroine and the companion (SPEC §3.4), laid
 * out from the catalogue's slot geometry. Purely visual when `interaction` is absent (S5 and
 * its preview); on S1 the slots react, accept placements and show the decorate previews.
 */
export function RoomScene({
  theme,
  slots,
  heroine,
  sparkle = null,
  face = 'happy',
  lampOn = false,
  interaction,
}: Props) {
  const sparkleOnHeroine =
    sparkle !== null &&
    heroine !== undefined &&
    (heroine.outfit === sparkle || heroine.shoes === sparkle || heroine.extra === sparkle);
  const armedSlot = interaction?.armed ? requireItem(interaction.armed).slot : undefined;
  const ghostItem = interaction?.ghost ? requireItem(interaction.ghost) : null;
  const reaction = interaction?.reaction ?? null;
  const hg = HEROINE_GEOMETRY[theme];
  const heroineBox: StageBox = {
    width: (hg.height * 600) / 900,
    height: hg.height,
    left: hg.x - (hg.height * 600) / 900 / 2,
    top: hg.y - hg.height,
    z: HEROINE_Z,
  };
  const cg = COMPANION_GEOMETRY[theme];
  const companionBox: StageBox = {
    width: (cg.height * 400) / 480,
    height: cg.height,
    left: cg.x - (cg.height * 400) / 480 / 2,
    top: cg.y - cg.height,
    z: COMPANION_Z,
  };
  // BED reaction: the companion jumps onto the bed and bounces (SPEC §4.3).
  const bedBox = roomLayerBox(theme, 'BED', requireItem(slots.BED).art.room!);
  const jump = {
    '--jump-dx': `${bedBox.left + bedBox.width * 0.55 - (companionBox.left + companionBox.width / 2)}px`,
    '--jump-dy': `${bedBox.top + bedBox.height * 0.45 - (companionBox.top + companionBox.height)}px`,
  };
  const companionPose: CompanionPose =
    reaction?.target === 'companion' ? 'special' : reaction?.target === 'BED' ? 'cheer' : 'idle';
  const companionClass = [
    'room-companion',
    reaction?.target === 'companion' && 'react-spin',
    reaction?.target === 'BED' && 'react-jump',
  ]
    .filter(Boolean)
    .join(' ');
  const heroineClass = [
    'room-heroine',
    sparkleOnHeroine && 'sparkle',
    interaction?.mode === 'dressup' && 'heroine-turned',
    reaction?.target === 'heroine' && 'react-wave',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div class="room-scene" aria-hidden={interaction ? undefined : true} data-theme={theme}>
      <img src={assetUrl(`${theme}/room/background`)} alt="" class="room-bg" draggable={false} />
      <div class="room-slots">
        {SLOT_TYPES.map((slot) => {
          const item = requireItem(slots[slot]);
          const box = roomLayerBox(theme, slot, item.art.room!);
          const isTarget = armedSlot === slot;
          const classes = [
            'slot',
            `slot-${slot}`,
            item.id === sparkle && 'sparkle',
            isTarget && 'slot-target',
            interaction?.pop === slot && 'slot-pop',
            reaction?.target === slot && `react-${item.reaction ?? 'generic'}`,
          ]
            .filter(Boolean)
            .join(' ');
          const img = <img src={assetUrl(item.art.room!)} alt="" draggable={false} />;
          const ghost =
            ghostItem && ghostItem.slot === slot && ghostItem.id !== item.id ? (
              <img
                src={assetUrl(ghostItem.art.room!)}
                alt=""
                class="slot-ghost"
                style={boxStyle(roomLayerBox(theme, slot, ghostItem.art.room!))}
                draggable={false}
              />
            ) : null;
          if (!interaction) {
            return (
              <div key={slot}>
                <div
                  class={classes}
                  style={boxStyle(box)}
                  data-testid={`slot-${slot}`}
                  data-item={item.id}
                >
                  {img}
                </div>
                {ghost}
              </div>
            );
          }
          const name = t(item.nameKey as StringKey);
          const label = isTarget
            ? `${t(`slot.${slot}`)}: ${t(requireItem(interaction.armed!).nameKey as StringKey)}`
            : name;
          return (
            <div key={slot}>
              <button
                type="button"
                class={classes}
                style={boxStyle(box)}
                data-testid={`slot-${slot}`}
                data-item={item.id}
                data-slot={slot}
                aria-label={label}
                onClick={() => interaction.onSlotClick(slot)}
                onAnimationEnd={interaction.onReactionEnd}
              >
                {img}
                {isTarget && <span class="slot-marker" aria-hidden="true" />}
              </button>
              {ghost}
            </div>
          );
        })}
      </div>
      {lampOn && <div class="room-lighting" data-testid="room-lighting" aria-hidden="true" />}
      {interaction ? (
        <>
          <button
            type="button"
            class={heroineClass}
            style={boxStyle(heroineBox)}
            data-testid="room-heroine"
            aria-label={t('ui.heroine')}
            onClick={interaction.onHeroineClick}
            onAnimationEnd={interaction.onReactionEnd}
          >
            <HeroinePreview face={face} heroine={heroine} />
          </button>
          <button
            type="button"
            class={companionClass}
            style={{ ...boxStyle(companionBox), ...jump }}
            data-testid="room-companion"
            aria-label={t(`companion.${theme}`)}
            onClick={interaction.onCompanionClick}
            onAnimationEnd={interaction.onReactionEnd}
          >
            <Companion theme={theme} pose={companionPose} />
          </button>
        </>
      ) : (
        <>
          <div class={heroineClass} style={boxStyle(heroineBox)} data-testid="room-heroine">
            <HeroinePreview face={face} heroine={heroine} />
          </div>
          <div class="room-companion" style={boxStyle(companionBox)}>
            <Companion theme={theme} pose="idle" />
          </div>
        </>
      )}
    </div>
  );
}
