import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import { PUZZLES_PER_MISSION } from '../../core/mission.ts';
import type { Mission } from '../../core/types.ts';
import { dispatch, soundOn } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { useFocusOnMount } from '../hooks.ts';
import { Companion, type CompanionPose } from './Companion.tsx';
import { Dialog } from './Dialog.tsx';
import { HeroinePreview } from './Heroine.tsx';
import { IconButton } from './IconButton.tsx';
import { SceneLife } from './SceneLife.tsx';

interface FrameProps {
  mission: Mission;
  /** Mission name and story line shown as the panel title. */
  title: string;
  story: string;
  companionPose: CompanionPose;
  companionVariant: number;
  /** What the companion says in its speech bubble (the feedback line); null hides it. */
  bubble?: string | null;
  children: ComponentChildren;
}

/**
 * The shared frame of S3 and S4 (SPEC §3.6): the light panel in the theme's scene, the
 * heroine left, the companion right, the preparation tracker under the panel, the prizes
 * waiting top right, and the only interactive elements outside the panel: "Leave" and the
 * sound toggle. "Leave" opens the confirm dialog (SPEC §10.1). The scene lives a little
 * (SceneLife), the companion repeats the feedback in a speech bubble, the heroine sways and
 * hops when a puzzle is solved, and the panel glows gold at that moment; all of it CSS under
 * the stage's motion setting.
 */
export function MissionFrame({
  mission,
  title,
  story,
  companionPose,
  companionVariant,
  bubble = null,
  children,
}: FrameProps) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const [leaving, setLeaving] = useState(false);
  const theme = mission.theme;
  const solved = mission.results.length;
  const face =
    companionPose === 'cheer' ? 'cheering' : companionPose === 'hmm' ? 'thinking' : 'happy';
  const cheering = mission.current.solved;

  const confirmLeave = () => {
    setLeaving(false);
    dispatch({ type: 'mission/leave' });
    go({ id: 'S1', theme });
  };

  return (
    <main
      class={`screen mission mission-${theme} mission-${mission.activity.toLowerCase()}`}
      aria-labelledby="mission-title"
      data-testid={`s${mission.activity === 'A' ? 3 : 4}`}
    >
      <img
        src={assetUrl(SCENE[theme][mission.activity])}
        alt=""
        class="room-bg"
        draggable={false}
      />
      <SceneLife theme={theme} activity={mission.activity} />
      <div class="mission-topleft">
        <button
          type="button"
          class="btn btn-small"
          data-testid="leave-button"
          onClick={() => setLeaving(true)}
        >
          {t('q.leave')}
        </button>
      </div>
      <div class="mission-topright">
        <div class="prize-icons" role="group" aria-label={t('s2.prizes')} data-testid="prize-icons">
          {mission.prizePair.map((id) => {
            const item = requireItem(id);
            return (
              <img
                key={id}
                src={assetUrl(item.art.tile)}
                alt={t(item.nameKey as StringKey)}
                class="prize-icon"
                draggable={false}
              />
            );
          })}
        </div>
        <IconButton
          label={soundOn.value ? t('ui.soundOn') : t('ui.soundOff')}
          pressed={soundOn.value}
          testId="sound-toggle"
          onClick={() => dispatch({ type: 'settings/sound', sound: !soundOn.value })}
        >
          <span aria-hidden="true">{soundOn.value ? '🔊' : '🔇'}</span>
        </IconButton>
      </div>
      <div class="mission-heroine" aria-hidden="true" data-cheer={cheering}>
        <HeroinePreview face={face} />
      </div>
      <div class="mission-companion">
        <Companion theme={theme} pose={companionPose} variant={companionVariant} />
        {bubble && (
          // The panel's feedback line is the live region; the bubble only repeats it.
          <span
            key={bubble}
            class={`companion-bubble companion-bubble-${companionPose}`}
            aria-hidden="true"
            data-testid="companion-bubble"
          >
            {bubble}
          </span>
        )}
      </div>
      <section class={`card mission-panel${cheering ? ' mission-panel-solved' : ''}`}>
        <h1 id="mission-title" class="mission-title" tabIndex={-1} ref={heading}>
          <span class="mission-name">{title}</span>
          <span class="mission-story">{story}</span>
        </h1>
        {children}
      </section>
      {mission.activity === 'A' && <Tracker theme={theme} solved={solved} />}
      {leaving && (
        <Dialog titleId="leave-title" onClose={() => setLeaving(false)} testId="leave-dialog">
          <h2 id="leave-title" class="dialog-title">
            {t('leave.title')}
          </h2>
          <p class="dialog-body">{t('leave.body')}</p>
          <div class="dialog-actions">
            <button
              type="button"
              class="btn btn-primary"
              data-testid="leave-cancel"
              onClick={() => setLeaving(false)}
            >
              {t('leave.cancel')}
            </button>
            <button type="button" class="btn" data-testid="leave-confirm" onClick={confirmLeave}>
              {t('leave.confirm')}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

/** The scene behind the panel (SPEC §3.6): the cockpit or kitchen for Activity A, the room for B. */
const SCENE: Record<Mission['theme'], Record<Mission['activity'], string>> = {
  space: { A: 'space/sceneA/cockpitFrame', B: 'space/room/background' },
  sweet: { A: 'sweet/sceneA/kitchenFrame', B: 'sweet/room/background' },
};

const STEP_ICONS = {
  space: ['fuel', 'hatch', 'lights', 'countdown'],
  sweet: ['cups', 'cake', 'teapot', 'guests'],
} as const;

/** Preparation tracker (SPEC §3.6): four icons under the panel, one lit per solved puzzle. */
function Tracker({ theme, solved }: { theme: Mission['theme']; solved: number }) {
  return (
    <ol
      class={`tracker${solved >= PUZZLES_PER_MISSION ? ' tracker-ready' : ''}`}
      data-testid="tracker"
      data-solved={solved}
    >
      {STEP_ICONS[theme].map((icon, i) => {
        const lit = i < solved;
        const name = t(`a.steps.${theme}.${i + 1}` as StringKey);
        return (
          <li
            key={icon}
            class={`tracker-step${lit ? ' tracker-lit' : ''}`}
            data-lit={lit}
            style={{ '--i': i }}
          >
            <img src={assetUrl(`${theme}/sceneA/step/${icon}`)} alt="" draggable={false} />
            <span class="tracker-label">
              {lit && <span aria-hidden="true">✓ </span>}
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const FINISH_ICON: Record<Mission['activity'], Record<Mission['theme'], string>> = {
  A: { space: '🚀', sweet: '🎉' },
  B: { space: '📦', sweet: '📦' },
};

interface FooterProps {
  mission: Mission;
  /** True once the hint is showing; the button then reads as pressed and does nothing more. */
  hintUsed: boolean;
  onHint: () => void;
  onNext: () => void;
}

/**
 * Bottom row of the puzzle panel (SPEC §3.6 item 4): Hint left, "Question k of 4" with dots
 * in the centre, and Next on the right once the puzzle is solved (it receives focus).
 */
export function PuzzleFooter({ mission, hintUsed, onHint, onNext }: FooterProps) {
  const nextButton = useRef<HTMLButtonElement>(null);
  const solved = mission.current.solved;
  const k = Math.min(mission.index + 1, PUZZLES_PER_MISSION);
  // The fourth right answer turns Next into the story's own verb: "Launch!", "Deliver it!".
  const finishing = solved && mission.results.length >= PUZZLES_PER_MISSION;
  const finishKey = `q.finish.${mission.activity.toLowerCase()}.${mission.theme}` as StringKey;

  useEffect(() => {
    if (solved) nextButton.current?.focus({ preventScroll: true });
  }, [solved]);

  return (
    <div class="puzzle-footer">
      <button
        type="button"
        class={`btn btn-hint${mission.current.wrongAttempts > 0 && !solved ? ' btn-pulse' : ''}`}
        data-testid="hint-button"
        data-sound="none"
        // Stays focusable after use so the keyboard never loses its place (SPEC §13.1).
        aria-pressed={hintUsed}
        disabled={solved}
        onClick={hintUsed ? undefined : onHint}
      >
        <span aria-hidden="true">💡 </span>
        {t('q.hint')}
      </button>
      <div class="progress" data-testid="progress">
        <span class="progress-text">{t('q.progress', { k })}</span>
        <span class="progress-dots" aria-hidden="true">
          {Array.from({ length: PUZZLES_PER_MISSION }, (_, i) => (
            <span
              key={i}
              class={`dot${i < mission.results.length ? ' dot-done' : i === mission.index ? ' dot-now' : ''}`}
            />
          ))}
        </span>
      </div>
      <div class="footer-next">
        {solved && (
          <button
            type="button"
            class={`btn btn-primary btn-next${finishing ? ' btn-finish' : ''}`}
            data-testid="next-button"
            data-sound="none"
            data-finish={finishing}
            ref={nextButton}
            onClick={onNext}
          >
            {finishing ? t(finishKey) : t('q.next')}
            <span aria-hidden="true">
              {finishing ? ` ${FINISH_ICON[mission.activity][mission.theme]}` : ' ▶'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
