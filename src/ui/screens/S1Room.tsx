import type { FunctionComponent } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ItemId, SlotType, Theme } from '../../core/types.ts';
import { assetUrl } from '../../assets.ts';
import { collectedCount } from '../../core/inventory.ts';
import { suggestedLevel } from '../../core/mission.ts';
import { earnableTotal, requireItem } from '../../catalog/index.ts';
import { ENTRY_GEOMETRY } from '../../catalog/slots.ts';
import { devFace, devTick, dispatch, save, soundOn } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { play } from '../sound.ts';
import { DecoratePanel } from '../components/DecoratePanel.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { DressUpPanel } from '../components/DressUpPanel.tsx';
import { HoldButton } from '../components/HoldButton.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { GEAR_HOLD_MS } from './S6Parent.tsx';
import { RoomScene, type RoomMode, type RoomReaction } from '../components/RoomScene.tsx';

interface Props {
  theme: Theme;
  /** Item just applied from S5: shown in place with a sparkle (SPEC §3.4). */
  sparkle?: ItemId | null;
  /** Arriving from S5: the progression suggestion may show once (SPEC §7.1). */
  suggest?: boolean;
}

const ENTRY_ART: Record<Theme, { idle: string; react: string }> = {
  space: { idle: 'space/entry/toyRocket', react: 'space/entry/toyRocketReaction' },
  sweet: { idle: 'sweet/entry/toyLetterbox', react: 'sweet/entry/toyLetterboxFlag' },
};

/** Safety net: a reaction ends on `animationend`, or after this long if it never fires. */
const REACTION_TIMEOUT_MS = 2500;
const ENTRY_TIMEOUT_MS = 900;

/**
 * S1 Room (SPEC §3.4): the room scene with its slots, the fixed chrome, Decorate and Dress-up
 * panels (§4.2, §4.4), free-play reactions (§4.3) and the way to S2. UI-only state (open panel,
 * armed tile, ghost, running reaction) lives here; every save change goes through `dispatch`.
 */
export function S1Room({ theme, sparkle = null, suggest = false }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  void devTick.value; // the slot debug overlay nudges geometry in place (dev only)
  const state = save.value;
  const themeState = state.themes[theme];
  const [mode, setMode] = useState<RoomMode>('free');
  const [armed, setArmed] = useState<ItemId | null>(null);
  const [ghost, setGhost] = useState<ItemId | null>(null);
  const [pop, setPop] = useState<SlotType | null>(null);
  const [reaction, setReaction] = useState<RoomReaction | null>(null);
  const [entryReacting, setEntryReacting] = useState(false);
  const [announce, setAnnounce] = useState('');
  const entryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decorateButton = useRef<HTMLButtonElement>(null);
  const dressupButton = useRef<HTMLButtonElement>(null);

  // Progression suggestion (SPEC §7.1): "Ready for a bigger challenge?" once after a mission.
  const [suggestOpen, setSuggestOpen] = useState(suggest);
  const lastActivity = state.progress.history[state.progress.history.length - 1]?.activity;
  const suggestion = suggestOpen && lastActivity ? suggestedLevel(state, lastActivity) : null;
  const answerSuggestion = (accept: boolean) => {
    if (lastActivity) {
      dispatch({
        type: accept ? 'mission/suggestionAccepted' : 'mission/suggestionDeclined',
        activity: lastActivity,
      });
    }
    setSuggestOpen(false);
    heading.current?.focus({ preventScroll: true });
  };
  // Focus moves to the heading on arrival (SPEC §13.1) unless the suggestion card is up; the
  // card takes focus itself and hands it to the heading when answered.
  const suggestionAtMount = useRef(suggestion !== null);
  useEffect(() => {
    if (!suggestionAtMount.current) heading.current?.focus({ preventScroll: true });
  }, []);

  const openBoard = useCallback(() => {
    if (entryTimer.current !== null) clearTimeout(entryTimer.current);
    entryTimer.current = null;
    go({ id: 'S2', theme });
  }, [theme]);

  // The toy rocket / letterbox reacts first (SPEC §4.3), then opens the board.
  const pokeEntry = () => {
    if (entryReacting) return;
    setEntryReacting(true);
    entryTimer.current = setTimeout(openBoard, ENTRY_TIMEOUT_MS);
  };
  useEffect(
    () => () => {
      if (entryTimer.current !== null) clearTimeout(entryTimer.current);
    },
    [],
  );

  const closePanel = useCallback(() => {
    setMode('free');
    setArmed(null);
    setGhost(null);
  }, []);
  const toggle = useCallback((next: RoomMode) => {
    setMode((current) => (current === next ? 'free' : next));
    setArmed(null);
    setGhost(null);
  }, []);

  // Keyboard shortcuts (SPEC §13.1): D decorate, W dress up, M mission board, Escape closes
  // the open panel. Registered once; state is read through setters and a ref so a key that
  // arrives between a render and its effects never sees a stale closure.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const key = e.key.toLowerCase();
      if (key === 'escape' && modeRef.current !== 'free') closePanel();
      else if (key === 'm') openBoard();
      else if (key === 'd') toggle('decorate');
      else if (key === 'w') toggle('dressup');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel, openBoard, toggle]);

  const place = (item: ItemId) => {
    const slot = requireItem(item).slot!;
    dispatch({ type: 'inventory/place', theme, item });
    play('place');
    setArmed(null);
    setGhost(null);
    setPop(slot);
    setAnnounce(t('ui.placed', { item: t(requireItem(item).nameKey as StringKey) }));
  };

  // Reactions (SPEC §4.3): visual only; LAMP is the one that persists (lighting per theme).
  const react = (target: RoomReaction['target']) => {
    if (mode === 'decorate') return;
    if (target !== 'heroine' && target !== 'companion') {
      const item = requireItem(themeState.slots[target]);
      if (item.reaction === 'lamp') {
        dispatch({ type: 'inventory/lamp', theme, on: !themeState.lampOn });
      }
    }
    setReaction({ target, key: Date.now() });
    play('tap');
  };
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(() => setReaction(null), REACTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [reaction]);
  const endReaction = useCallback(() => {
    setReaction(null);
    setPop(null);
  }, []);

  const onSlotClick = (slot: SlotType) => {
    if (mode !== 'decorate') {
      react(slot);
      return;
    }
    if (armed && requireItem(armed).slot === slot) place(armed);
  };

  // Clicking anywhere except a tile or a target slot cancels the armed tile (SPEC §4.2).
  const onMainClick = (e: MouseEvent) => {
    if (!armed) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest('.tile, .slot-target')) return;
    setArmed(null);
  };

  const panelOpen = mode !== 'free';

  return (
    <main
      class={`screen s1 s1-${theme}${panelOpen ? ' s1-panel-open' : ''}`}
      aria-labelledby="s1-title"
      data-mode={mode}
      onClick={onMainClick}
    >
      <div class={`room-wrap${panelOpen ? ' room-wrap-scaled' : ''}`}>
        <RoomScene
          theme={theme}
          slots={themeState.slots}
          heroine={state.heroine}
          sparkle={sparkle}
          face={import.meta.env.DEV ? devFace.value : 'neutral'}
          lampOn={themeState.lampOn}
          stars={themeState.stars}
          interaction={{
            mode,
            armed,
            ghost,
            pop,
            reaction,
            onSlotClick,
            onHeroineClick: () => react('heroine'),
            onCompanionClick: () => react('companion'),
            onReactionEnd: endReaction,
          }}
        />
        <button
          type="button"
          class={`entry-object${entryReacting ? ' entry-react' : ''}`}
          style={entryStyle(theme)}
          aria-label={t('s1.mission')}
          data-testid="entry-object"
          onClick={pokeEntry}
          onAnimationEnd={() => {
            if (entryReacting) openBoard();
          }}
        >
          <img
            src={assetUrl(entryReacting ? ENTRY_ART[theme].react : ENTRY_ART[theme].idle)}
            alt=""
            draggable={false}
          />
          {theme === 'space' ? (
            <span class="entry-smoke" aria-hidden="true" />
          ) : (
            <span class="entry-envelope" aria-hidden="true" />
          )}
        </button>
        {import.meta.env.DEV && <DebugLoader theme={theme} />}
      </div>
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
          ★ {t('s1.collected', { n: collectedCount(state, theme), total: earnableTotal(theme) })}
        </span>
        <IconButton
          label={soundOn.value ? t('ui.soundOn') : t('ui.soundOff')}
          pressed={soundOn.value}
          testId="sound-toggle"
          onClick={() => dispatch({ type: 'settings/sound', sound: !soundOn.value })}
        >
          <span aria-hidden="true">{soundOn.value ? '🔊' : '🔇'}</span>
        </IconButton>
        <HoldButton
          label={t('ui.parentCorner')}
          holdMs={GEAR_HOLD_MS}
          testId="parent-gear"
          onHold={() => go({ id: 'S6', returnTo: { id: 'S1', theme } })}
        >
          <span aria-hidden="true">⚙️</span>
        </HoldButton>
      </div>
      <div class="s1-bottom">
        <button
          type="button"
          class="btn btn-lg"
          aria-pressed={mode === 'decorate'}
          aria-keyshortcuts="D"
          data-testid="decorate-button"
          ref={decorateButton}
          onClick={() => toggle('decorate')}
        >
          <span aria-hidden="true">🛋️ </span>
          {t('s1.decorate')}
        </button>
        <button
          type="button"
          class="btn btn-lg"
          aria-pressed={mode === 'dressup'}
          aria-keyshortcuts="W"
          data-testid="dressup-button"
          ref={dressupButton}
          onClick={() => toggle('dressup')}
        >
          <span aria-hidden="true">👗 </span>
          {t('s1.dressup')}
        </button>
        <button
          type="button"
          class="btn btn-lg btn-primary"
          aria-keyshortcuts="M"
          data-testid="mission-button"
          onClick={openBoard}
        >
          <span aria-hidden="true">{theme === 'space' ? '🚀 ' : '✉️ '}</span>
          {t('s1.mission')}
        </button>
      </div>
      <p class="visually-hidden" aria-live="polite" data-testid="room-announce">
        {announce}
      </p>
      {suggestion !== null && lastActivity && (
        <Dialog
          titleId="suggest-title"
          onClose={() => answerSuggestion(false)}
          testId="suggest-dialog"
        >
          <h2 id="suggest-title" class="dialog-title">
            {t('prog.title')}
          </h2>
          <div class="dialog-actions">
            <button
              type="button"
              class="btn btn-primary"
              data-testid="suggest-try"
              onClick={() => answerSuggestion(true)}
            >
              {t('prog.try', {
                level: t(`level.${lastActivity === 'A' ? 'r' : 'e'}${suggestion}` as StringKey),
              })}
            </button>
            <button
              type="button"
              class="btn"
              data-testid="suggest-notyet"
              onClick={() => answerSuggestion(false)}
            >
              {t('prog.notYet')}
            </button>
          </div>
        </Dialog>
      )}
      {mode === 'decorate' && (
        <DecoratePanel
          theme={theme}
          armed={armed}
          onArm={setArmed}
          onPlace={place}
          onGhost={setGhost}
          onClose={closePanel}
          opener={decorateButton}
        />
      )}
      {mode === 'dressup' && (
        <DressUpPanel
          theme={theme}
          onClose={closePanel}
          opener={dressupButton}
          onWear={(id) =>
            setAnnounce(
              id
                ? t('ui.worn', { item: t(requireItem(id).nameKey as StringKey) })
                : t('panel.nothing'),
            )
          }
        />
      )}
    </main>
  );
}

function entryStyle(theme: Theme) {
  const g = ENTRY_GEOMETRY[theme];
  const width = (g.height * 320) / 400;
  return {
    left: `${g.x - width / 2}px`,
    top: `${g.y - g.height}px`,
    width: `${width}px`,
    height: `${g.height}px`,
  };
}

/**
 * `?debug=slots` and `?debug=heroine` (SPEC §16.4): load the slot geometry overlay or the
 * heroine anchor overlay on demand, dev builds only.
 */
function DebugLoader({ theme }: { theme: Theme }) {
  const [Overlay, setOverlay] = useState<FunctionComponent<{ theme: Theme }> | null>(null);
  const wanted =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('debug') : null;
  useEffect(() => {
    if (wanted === 'slots' && !Overlay) {
      void import('../components/SlotDebug.tsx').then((m) => setOverlay(() => m.SlotDebug));
    } else if (wanted === 'heroine' && !Overlay) {
      void import('../components/HeroineDebug.tsx').then((m) => setOverlay(() => m.HeroineDebug));
    }
  }, [wanted, Overlay]);
  return wanted && Overlay ? <Overlay theme={theme} /> : null;
}
