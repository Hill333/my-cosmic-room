import { assetEntry, assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import { SLOT_GEOMETRY, STAR_CHART_GEOMETRY, slotBox, type StageBox } from '../../catalog/slots.ts';
import {
  companionBoxAt,
  heroineBoxAt,
  homePoints,
  type Point,
  restBox,
  SLEEP_ROTATE,
} from '../../catalog/walk.ts';
import type { HeroineState, ItemId, SlotMap, SlotType, Theme } from '../../core/types.ts';
import { SLOT_TYPES } from '../../core/types.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { save } from '../../state/store.ts';
import { Companion, type CompanionPose } from './Companion.tsx';
import { HeroinePreview, sitFigureFor, sleepHeadFor, type Face } from './Heroine.tsx';
import { StarChart } from './StarChart.tsx';
import type { WalkState } from '../useRoomWalk.ts';
import { STAGE_WIDTH } from '../Stage.tsx';
import { THEME_UI } from '../themes.ts';

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
  /** Free-play walking (SPEC §4.3): where the heroine and companion are and what she does. */
  walk: WalkState;
  /** A click on the floor (or the wall), in stage px; the heroine walks there when picked. */
  onFloorClick: (p: Point) => void;
}

interface Props {
  theme: Theme;
  slots: SlotMap;
  /** Heroine layers to draw; defaults to the saved heroine inside HeroinePreview. */
  heroine?: HeroineState;
  /** Item that was just applied: gets the sparkle (SPEC §3.4, §10.3). */
  sparkle?: ItemId | null;
  /** Expression overlay; `neutral` is the figure's own face (SPEC §4.5). */
  face?: Face;
  /** Evening lighting from the LAMP reaction (SPEC §4.3), saved per theme. */
  lampOn?: boolean;
  /** Filled stars on the theme's poster (SPEC §10.5). */
  stars?: number;
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

function starChartStyle(theme: Theme) {
  const g = STAR_CHART_GEOMETRY[theme];
  return { left: `${g.x}px`, top: `${g.y}px`, width: `${g.width}px` };
}

/** Stage box of a room layer in its slot (SPEC §4.1); shared with the debug overlay. */
export function roomLayerBox(theme: Theme, slot: SlotType, artId: string): StageBox {
  const entry = assetEntry(artId);
  return slotBox(SLOT_GEOMETRY[theme][slot], entry.size, entry.pivot);
}

/**
 * Minimum hit area of a slot button in room px: 64 stage px (SPEC §13.1) even while a panel
 * is open and the room is scaled by 0.7135. Small art (a shelf toy, a hanging string) gets
 * an invisible margin around it; the image keeps its own box inside.
 */
const MIN_HIT = 90;

function hitBox(box: StageBox): StageBox {
  const width = Math.max(box.width, MIN_HIT);
  const height = Math.max(box.height, MIN_HIT);
  return {
    left: box.left - (width - box.width) / 2,
    top: box.top - (height - box.height) / 2,
    width,
    height,
    z: box.z,
  };
}

/** Places the art at its own box inside the (possibly larger) hit box. */
function imageStyle(box: StageBox, hit: StageBox) {
  return {
    position: 'absolute',
    left: `${box.left - hit.left}px`,
    top: `${box.top - hit.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  } as const;
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
  face = 'neutral',
  lampOn = false,
  stars = 0,
  interaction,
}: Props) {
  const sparkleOnHeroine =
    sparkle !== null &&
    heroine !== undefined &&
    (heroine.outfit === sparkle || heroine.shoes === sparkle || heroine.extra === sparkle);
  const armedSlot = interaction?.armed ? requireItem(interaction.armed).slot : undefined;
  const ghostItem = interaction?.ghost ? requireItem(interaction.ghost) : null;
  const reaction = interaction?.reaction ?? null;
  // The walkers' boxes follow their feet points (catalog/walk.ts); a resting heroine sits
  // inside the nook or lies over the bed she walked to.
  const walk = interaction?.walk;
  const home = homePoints(theme);
  const heroineAt = walk?.heroineAt ?? home.heroine;
  const bedBox = roomLayerBox(theme, 'BED', requireItem(slots.BED).art.room!);
  const nookBox = roomLayerBox(theme, 'NOOK', requireItem(slots.NOOK).art.room!);
  // Walkers step in front of the bed and the nook once they pass their floor line.
  const occluders = [bedBox, nookBox].map((b) => ({ bottom: b.top + b.height, z: b.z }));
  // The pose art (SPEC §4.3): her sleeping head on the pillow, the sitting figure on the
  // cushion; while either is still a placeholder the standing figure is masked instead.
  const drawn = heroine ?? save.value.heroine;
  const sleepHead = walk?.pose === 'bed' ? sleepHeadFor(drawn) : null;
  const sitFigure = walk?.pose === 'sit' ? sitFigureFor(drawn) : null;
  const poseArt = sleepHead !== null || sitFigure !== null;
  const heroineBox: StageBox =
    walk && walk.pose !== 'stand' && walk.resting
      ? restBox(theme, walk.pose, walk.resting.box, walk.resting.spot, poseArt)
      : heroineBoxAt(theme, heroineAt, occluders);
  const companionBox = companionBoxAt(theme, walk?.companionAt ?? home.companion, occluders);
  const restRotate =
    walk?.pose === 'bed' ? (sleepHead ? SLEEP_ROTATE : (walk.resting?.spot.rotate ?? 0)) : 0;
  const heroineVars = walk
    ? {
        '--walk-ms': `${walk.walkMs}ms`,
        '--facing': walk.facing,
        '--rest-rotate': `${restRotate}deg`,
      }
    : {};
  const companionVars = walk
    ? { '--walk-ms': `${walk.companionWalkMs}ms`, '--facing': walk.companionFacing }
    : {};
  // BED reaction: the companion jumps onto the bed and bounces (SPEC §4.3).
  const jump = {
    '--jump-dx': `${bedBox.left + bedBox.width * 0.55 - (companionBox.left + companionBox.width / 2)}px`,
    '--jump-dy': `${bedBox.top + bedBox.height * 0.45 - (companionBox.top + companionBox.height)}px`,
  };
  // Companion reactions differ per theme (SPEC §4.3, §5.4, `THEME_UI`): Pip jumps onto the bed
  // and spins; Mimi curls up on the bed and stretches with a purr; Lulu hops; Bori dances.
  const companionReact = THEME_UI[theme].companionReact;
  // The evening glow sits on the lamp, wherever the theme's LAMP slot is (SPEC §4.3).
  const lampBox = roomLayerBox(theme, 'LAMP', requireItem(slots.LAMP).art.room!);
  const lampGlow = {
    '--lamp-x': `${lampBox.left + lampBox.width / 2}px`,
    '--lamp-y': `${lampBox.top + lampBox.height * 0.35}px`,
  };
  const companionPose: CompanionPose =
    reaction?.target === 'companion'
      ? 'special'
      : reaction?.target === 'BED'
        ? companionReact.bedPose
        : 'idle';
  const companionClass = [
    'room-companion',
    walk?.companionWalking && 'companion-walking',
    reaction?.target === 'companion' && companionReact.special,
    reaction?.target === 'BED' && companionReact.bed,
  ]
    .filter(Boolean)
    .join(' ');
  // The heroine's tap reaction (SPEC §4.3) also lights up her face.
  const shownFace: Face = reaction?.target === 'heroine' && face === 'neutral' ? 'happy' : face;
  const heroineClass = [
    'room-heroine',
    sparkleOnHeroine && 'sparkle',
    interaction?.mode === 'dressup' && 'heroine-turned',
    reaction?.target === 'heroine' && !walk?.walking && 'react-wave',
    walk?.selected && 'heroine-selected',
    walk?.walking && 'heroine-walking',
    walk && walk.pose !== 'stand' && `heroine-pose-${walk.pose}`,
    poseArt && 'heroine-pose-art',
  ]
    .filter(Boolean)
    .join(' ');

  // A click on the scene that hits no button is a click on the floor (SPEC §4.3): its stage
  // coordinates come from the scene's own box, so the stage scale and the panel's room scale
  // both cancel out.
  const onSceneClick = interaction
    ? (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button')) return;
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const k = STAGE_WIDTH / rect.width;
        interaction.onFloorClick({ x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k });
      }
    : undefined;

  return (
    <div
      class="room-scene"
      aria-hidden={interaction ? undefined : true}
      data-theme={theme}
      onClick={onSceneClick}
    >
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
          const hit = interaction ? hitBox(box) : box;
          const img = (
            <img
              src={assetUrl(item.art.room!)}
              alt=""
              draggable={false}
              style={imageStyle(box, hit)}
            />
          );
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
                style={boxStyle(hit)}
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
      <StarChart
        theme={theme}
        stars={stars}
        class="room-star-chart"
        testId="room-star-chart"
        style={starChartStyle(theme)}
      />
      {(lampOn || walk?.pose === 'bed') && (
        <div
          class={`room-lighting${!lampOn ? ' room-lighting-night' : ''}`}
          style={lampGlow}
          data-testid="room-lighting"
          aria-hidden="true"
        />
      )}
      {interaction ? (
        <>
          <button
            type="button"
            class={heroineClass}
            style={{ ...boxStyle(heroineBox), ...heroineVars }}
            data-testid="room-heroine"
            data-pose={walk?.pose}
            data-walking={walk?.walking || undefined}
            aria-label={t('ui.heroine')}
            aria-pressed={walk?.selected}
            onClick={interaction.onHeroineClick}
            onAnimationEnd={interaction.onReactionEnd}
          >
            {sleepHead ? (
              <img
                src={assetUrl(sleepHead)}
                alt=""
                class="heroine-sleep"
                data-testid="heroine-sleep"
                draggable={false}
              />
            ) : (
              <HeroinePreview
                face={shownFace}
                heroine={heroine}
                pose={sitFigure ? 'sit' : 'stand'}
              />
            )}
          </button>
          <button
            type="button"
            class={companionClass}
            style={{ ...boxStyle(companionBox), ...jump, ...companionVars }}
            data-walking={walk?.companionWalking || undefined}
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
