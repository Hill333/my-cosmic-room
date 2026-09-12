import { useEffect, useState } from 'preact/hooks';
import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import { MAX_STARS } from '../../core/inventory.ts';
import type { HeroineState, ItemId, Mission, SlotMap } from '../../core/types.ts';
import { dispatch, save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { groupKeyHandler, useFocusOnMount } from '../hooks.ts';
import { play, playJingle } from '../sound.ts';
import { RoomScene } from '../components/RoomScene.tsx';
import { StarChart } from '../components/StarChart.tsx';

interface Props {
  mission: Mission;
}

const CONFETTI = Array.from({ length: 24 }, (_, i) => i);

/**
 * S5 Mission complete and prize choice (SPEC §3.8): the dimmed room behind a card with the
 * prize tiles, the action button for the selected kind, "Keep playing", and a live room
 * preview. The grant happens on the button press through `mission/choose`, followed by
 * `mission/apply` or `mission/keep` (SPEC §10.1); reloading here reopens S5 unchanged.
 */
export function S5Complete({ mission }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const theme = mission.theme;
  const state = save.value;
  const claimedItem = mission.claimed && mission.claimed !== 'star' ? mission.claimed : null;
  const [picked, setPicked] = useState<ItemId | null>(claimedItem ?? mission.prizePair[0] ?? null);
  const selected = claimedItem ?? picked;
  const star = mission.claimed === 'star';
  const now = () => new Date().toISOString();

  const finish = (how: 'apply' | 'keep') => {
    if (!star) {
      if (!selected) return;
      dispatch({ type: 'mission/choose', item: selected });
      if (how === 'apply') play(requireItem(selected).kind === 'decoration' ? 'place' : 'wear');
    }
    dispatch({ type: how === 'apply' ? 'mission/apply' : 'mission/keep', now: now() });
    go({ id: 'S1', theme, sparkle: how === 'apply' ? selected : null, suggest: true });
  };

  // Preview: the room with the selected decoration in its slot, or the heroine wearing the
  // selected garment (computed locally; nothing is granted until the button press).
  const preview = previewState(state.themes[theme].slots, state.heroine, selected);
  const selectedKind = selected ? requireItem(selected).kind : null;

  return (
    <main class={`screen s5 s5-${theme}`} aria-labelledby="s5-title" data-testid="s5">
      <div class="s5-room">
        <RoomScene
          theme={theme}
          slots={state.themes[theme].slots}
          heroine={state.heroine}
          stars={state.themes[theme].stars}
        />
      </div>
      <div class="s5-dim" aria-hidden="true" />
      <Celebration theme={theme} />
      {!star && (
        <div class="confetti" aria-hidden="true">
          {CONFETTI.map((i) => (
            <span key={i} class="confetti-piece" style={{ '--i': i }} />
          ))}
        </div>
      )}
      <section class="card s5-card">
        <span class="s5-sparkle" aria-hidden="true" data-testid="s5-sparkle">
          ✦
        </span>
        <h1 id="s5-title" class="s5-title" tabIndex={-1} ref={heading}>
          {t('s5.title')}
        </h1>
        <p class="s5-sub">{t('s5.sub')}</p>
        {star ? (
          <StarCard theme={theme} stars={state.themes[theme].stars} onBack={() => finish('keep')} />
        ) : (
          <>
            <h2 class="s5-choose">{t('s5.choose')}</h2>
            <div
              class="prize-tiles"
              role="group"
              aria-label={t('s5.choose')}
              onKeyDown={groupKeyHandler}
            >
              {mission.prizePair.map((id) => {
                const item = requireItem(id);
                const isSelected = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    class={`prize-tile${isSelected ? ' prize-tile-selected' : ''}`}
                    aria-pressed={isSelected}
                    data-testid={`prize-tile-${id}`}
                    disabled={claimedItem !== null && !isSelected}
                    onClick={() => setPicked(id)}
                  >
                    <span class="prize-tile-check" aria-hidden="true">
                      {isSelected ? '✓' : ''}
                    </span>
                    <img src={assetUrl(item.art.tile)} alt="" draggable={false} />
                    <span class="prize-tile-name">{t(item.nameKey as StringKey)}</span>
                  </button>
                );
              })}
            </div>
            <div class="s5-actions">
              <button
                type="button"
                class="btn btn-lg btn-primary"
                data-testid="apply-button"
                data-sound="none"
                disabled={!selected}
                onClick={() => finish('apply')}
              >
                {selectedKind === 'decoration' ? t('s5.place') : t('s5.wear')}
              </button>
              <button
                type="button"
                class="btn btn-lg"
                data-testid="keep-button"
                disabled={!selected}
                onClick={() => finish('keep')}
              >
                {t('s5.keep')}
              </button>
            </div>
          </>
        )}
      </section>
      {!star && (
        <div class="s5-preview" role="img" aria-label={t('s5.preview')} data-testid="room-preview">
          <div class="s5-preview-scene">
            <RoomScene
              theme={theme}
              slots={preview.slots}
              heroine={preview.heroine}
              sparkle={selected}
              stars={state.themes[theme].stars}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function previewState(
  slots: SlotMap,
  heroine: HeroineState,
  selected: ItemId | null,
): { slots: SlotMap; heroine: HeroineState } {
  if (!selected) return { slots, heroine };
  const item = requireItem(selected);
  if (item.kind === 'decoration' && item.slot) {
    return { slots: { ...slots, [item.slot]: selected }, heroine };
  }
  if (item.kind === 'outfit' || item.kind === 'shoes' || item.kind === 'extra') {
    return { slots, heroine: { ...heroine, [item.kind]: selected } };
  }
  return { slots, heroine };
}

const TEA_STEPS = ['cups', 'cake', 'teapot', 'guests'] as const;

/**
 * Story reaction after the fourth puzzle (SPEC §3.6, §5.4): the rocket launches past the card
 * in Space; in Sweet the tea table arrives and the cups, cake, teapot and guests pop in. Pure
 * CSS, decorative, ends on its own (instantly under reduced motion).
 */
function Celebration({ theme }: { theme: Mission['theme'] }) {
  // The jingle plays with the celebration (SPEC §15.4); after a reload it stays silent
  // because no gesture has unlocked audio yet.
  useEffect(() => playJingle(theme), [theme]);
  if (theme === 'space') {
    return (
      <div class="celebration celebration-space" aria-hidden="true" data-testid="celebration">
        <img src={assetUrl('space/sceneA/launchFlame')} alt="" class="celebration-flame" />
        <img src={assetUrl('space/sceneA/rocket')} alt="" class="celebration-rocket" />
      </div>
    );
  }
  return (
    <div class="celebration celebration-sweet" aria-hidden="true" data-testid="celebration">
      <img src={assetUrl('sweet/sceneA/teaTable')} alt="" class="celebration-table" />
      {TEA_STEPS.map((step, i) => (
        <img
          key={step}
          src={assetUrl(`sweet/sceneA/step/${step}`)}
          alt=""
          class="celebration-step"
          style={{ '--i': i }}
        />
      ))}
    </div>
  );
}

/** Star card (SPEC §3.8, §10.5): shown when the pool is empty and a star was added. */
function StarCard({
  theme,
  stars,
  onBack,
}: {
  theme: Mission['theme'];
  stars: number;
  onBack: () => void;
}) {
  const full = stars >= MAX_STARS;
  useEffect(() => play('star'), []);
  return (
    <div class="star-card" data-testid="star-card">
      <p class="s5-choose">{full ? t('s5.starFull') : t('s5.star')}</p>
      <StarChart theme={theme} stars={stars} class="s5-star-chart" testId="s5-star-chart" />
      <p class="star-count">{t('s5.starCount', { n: stars, total: MAX_STARS })}</p>
      <button type="button" class="btn btn-lg btn-primary" data-testid="back-room" onClick={onBack}>
        {t('s5.backRoom')}
      </button>
    </div>
  );
}
