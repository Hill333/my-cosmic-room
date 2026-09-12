import { useEffect, useRef, useState } from 'preact/hooks';
import { assetUrl } from '../../assets.ts';
import { formatDuration } from '../../core/elapsed.ts';
import { isCorrectAnswer, PUZZLES_PER_MISSION } from '../../core/mission.ts';
import { formatTime } from '../../core/time.ts';
import type { Mission, Theme } from '../../core/types.ts';
import { dispatch, language, save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { useElapsedSeconds } from '../hooks.ts';
import { ChoiceGroup, type ChoiceOption } from '../components/ChoiceGroup.tsx';
import type { CompanionPose } from '../components/Companion.tsx';
import { DigitalDisplay } from '../components/DigitalDisplay.tsx';
import { JumpTimeline } from '../components/JumpTimeline.tsx';
import { MissionFrame, PuzzleFooter } from '../components/MissionFrame.tsx';

interface Props {
  mission: Mission;
}

/** S4 Activity B (SPEC §3.7): elapsed-time puzzles with the journey strip and the jump hint. */
export function S4ActivityB({ mission }: Props) {
  const theme = mission.theme;
  const solved = mission.current.solved;
  const pose: CompanionPose = solved ? 'cheer' : mission.current.wrongAttempts > 0 ? 'hmm' : 'idle';
  const variant = solved ? mission.results.length % 4 : mission.current.wrongAttempts % 2;

  const next = () => {
    dispatch({ type: 'mission/next' });
    const m = save.value.mission;
    if (m && m.state !== 'IN_PROGRESS') go({ id: 'S5' });
  };

  return (
    <MissionFrame
      mission={mission}
      title={t(`mission.b.${theme}`)}
      story={t(`b.story.${theme}`)}
      companionPose={pose}
      companionVariant={variant}
    >
      <JourneyStrip theme={theme} solved={mission.results.length} />
      <PuzzleB key={mission.index} mission={mission} onNext={next} />
    </MissionFrame>
  );
}

const JOURNEY = {
  space: {
    from: 'space/sceneB/planet',
    to: 'space/sceneB/moon',
    vehicle: 'space/sceneB/rocketParcel',
  },
  sweet: {
    from: 'sweet/sceneB/toyShop',
    to: 'sweet/sceneB/window',
    vehicle: 'sweet/sceneB/balloonParcel',
  },
} as const;

/** Origin, dashed path and destination; the vehicle advances a quarter per solved puzzle. */
function JourneyStrip({ theme, solved }: { theme: Theme; solved: number }) {
  const art = JOURNEY[theme];
  const progress = Math.min(solved, PUZZLES_PER_MISSION) / PUZZLES_PER_MISSION;
  return (
    <div class="journey" aria-hidden="true" data-testid="journey" data-solved={solved}>
      <img src={assetUrl(art.from)} alt="" class="journey-end" draggable={false} />
      <div class="journey-path">
        <img
          src={assetUrl(art.vehicle)}
          alt=""
          class="journey-vehicle"
          style={{ left: `${progress * 100}%` }}
          draggable={false}
        />
      </div>
      <img src={assetUrl(art.to)} alt="" class="journey-end" draggable={false} />
    </div>
  );
}

interface PuzzleProps {
  mission: Mission;
  onNext: () => void;
}

/** One elapsed puzzle; remounted per `index`, so the jumps panel and wrong picks reset. */
function PuzzleB({ mission, onNext }: PuzzleProps) {
  const puzzle = mission.puzzles[mission.index]!;
  if (puzzle.kind !== 'ELAPSED') throw new Error('Activity B expects ELAPSED puzzles');
  const theme = mission.theme;
  const lang = language.value;
  const elapsed = useElapsedSeconds();
  const question = useRef<HTMLParagraphElement>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<StringKey | null>(null);
  const [jumpsOpen, setJumpsOpen] = useState(false);
  const solved = mission.current.solved;
  const correct = puzzle.end - puzzle.start;

  useEffect(() => {
    question.current?.focus({ preventScroll: true });
  }, []);

  const answer = (choice: number) => {
    if (solved) return;
    const totalWrong =
      mission.results.reduce((n, r) => n + r.wrongAttempts, 0) + mission.current.wrongAttempts;
    if (isCorrectAnswer(puzzle, choice)) {
      setFeedback(`fb.correct.${(mission.results.length % 3) + 1}` as StringKey);
    } else {
      setWrong((w) => [...w, choice]);
      setFeedback(`fb.wrong.${(totalWrong % 3) + 1}` as StringKey);
    }
    dispatch({ type: 'mission/answer', choice, seconds: elapsed() });
  };

  /** "Show the jumps" and the footer's Hint both open the timeline and record the hint (§8.5). */
  const showJumps = () => {
    setJumpsOpen(true);
    dispatch({ type: 'mission/hint' });
  };
  const toggleJumps = () => (jumpsOpen ? setJumpsOpen(false) : showJumps());

  const options: ChoiceOption[] = puzzle.choices.map((c) => ({
    value: c,
    content: formatDuration(c, lang),
  }));

  return (
    <div class="puzzle" data-testid="puzzle" data-kind="ELAPSED" data-index={mission.index}>
      <p class="question" data-testid="question" tabIndex={-1} ref={question}>
        {t(`b.q.${theme}`)}
      </p>
      <div class="puzzle-body">
        <div class="journey-times">
          <DigitalDisplay
            time={puzzle.start}
            mode="24h"
            caption={t('b.leaves')}
            label={`${t('b.leaves')} ${formatTime(puzzle.start, '24h')}`}
          />
          <img
            src={assetUrl(JOURNEY[theme].vehicle)}
            alt=""
            class="journey-times-icon"
            draggable={false}
          />
          <DigitalDisplay
            time={puzzle.end}
            mode="24h"
            caption={t('b.arrives')}
            label={`${t('b.arrives')} ${formatTime(puzzle.end, '24h')}`}
          />
        </div>
        <ChoiceGroup
          label={t('ui.answers')}
          options={options}
          wrong={wrong}
          correct={solved ? correct : null}
          onPick={answer}
          class="choices-durations"
        />
        <div class="jumps-box">
          <button
            type="button"
            class="btn btn-small"
            data-testid="show-jumps"
            aria-expanded={jumpsOpen}
            onClick={toggleJumps}
          >
            {jumpsOpen ? t('b.hideJumps') : t('b.showJumps')}
          </button>
          {jumpsOpen && (
            <div class="jumps-panel">
              <JumpTimeline start={puzzle.start} end={puzzle.end} />
            </div>
          )}
        </div>
      </div>
      <p
        class={`feedback feedback-${solved ? 'correct' : feedback ? 'wrong' : 'none'}`}
        role="status"
        data-testid="feedback"
      >
        {feedback && (
          <>
            <span aria-hidden="true">{solved ? '✓ ' : '✕ '}</span>
            {t(feedback)}
          </>
        )}
      </p>
      <PuzzleFooter mission={mission} hintUsed={jumpsOpen} onHint={showJumps} onNext={onNext} />
    </div>
  );
}
