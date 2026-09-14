import { useEffect, useRef, useState } from 'preact/hooks';
import { assetUrl } from '../../assets.ts';
import { formatDuration } from '../../core/elapsed.ts';
import {
  askedSegment,
  correctValue,
  isCorrectAnswer,
  PUZZLES_PER_MISSION,
} from '../../core/mission.ts';
import { formatTime } from '../../core/time.ts';
import type { Mission, Theme } from '../../core/types.ts';
import { dispatch, language, save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { useElapsedSeconds } from '../hooks.ts';
import { play } from '../sound.ts';
import { ChoiceGroup, type ChoiceOption } from '../components/ChoiceGroup.tsx';
import type { CompanionPose } from '../components/Companion.tsx';
import { DigitalDisplay } from '../components/DigitalDisplay.tsx';
import { JumpTimeline } from '../components/JumpTimeline.tsx';
import { MissionFrame, PuzzleFooter } from '../components/MissionFrame.tsx';
import { ScheduleBar } from '../components/ScheduleBar.tsx';
import { THEME_UI } from '../themes.ts';

interface Props {
  mission: Mission;
}

/** S4 Activity B (SPEC §3.7): elapsed-time puzzles with the journey strip and the jump hint. */
export function S4ActivityB({ mission }: Props) {
  const theme = mission.theme;
  const solved = mission.current.solved;
  const pose: CompanionPose = solved ? 'cheer' : mission.current.wrongAttempts > 0 ? 'hmm' : 'idle';
  const variant = solved ? mission.results.length % 4 : mission.current.wrongAttempts % 2;
  const [feedback, setFeedback] = useState<StringKey | null>(null);
  const story = t(`b.story.${theme}`);
  const bubble = feedback ? t(feedback) : mission.index === 0 && !solved ? story : null;

  const next = () => {
    play('next');
    setFeedback(null);
    dispatch({ type: 'mission/next' });
    const m = save.value.mission;
    if (m && m.state !== 'IN_PROGRESS') go({ id: 'S5' });
  };

  return (
    <MissionFrame
      mission={mission}
      title={t(`mission.b.${theme}`)}
      story={story}
      companionPose={pose}
      companionVariant={variant}
      bubble={bubble}
    >
      <JourneyStrip theme={theme} solved={mission.results.length} />
      <PuzzleB
        key={mission.index}
        mission={mission}
        feedback={feedback}
        onFeedback={setFeedback}
        onNext={next}
      />
    </MissionFrame>
  );
}

const TRAIL = [0, 1, 2, 3, 4];
const STOPS = [1, 2, 3];

/**
 * Origin, dashed path and destination; the vehicle advances a quarter per solved puzzle.
 * Three stop lights on the path come on as it passes them; the vehicle bobs while it waits
 * and boosts off with a burst of sparks on every advance (both keyed on `solved`, so the CSS
 * animations replay); the destination glows once the parcel arrives.
 */
function JourneyStrip({ theme, solved }: { theme: Theme; solved: number }) {
  const art = THEME_UI[theme].journey;
  const done = Math.min(solved, PUZZLES_PER_MISSION);
  const progress = done / PUZZLES_PER_MISSION;
  return (
    <div class="journey" aria-hidden="true" data-testid="journey" data-solved={solved}>
      <img src={assetUrl(art.from)} alt="" class="journey-end journey-from" draggable={false} />
      <div class="journey-path">
        {STOPS.map((i) => (
          <i
            key={i}
            class={`journey-stop${done >= i ? ' journey-stop-lit' : ''}`}
            style={{ left: `${(i / PUZZLES_PER_MISSION) * 100}%` }}
          />
        ))}
        <div class="journey-vehicle" style={{ left: `${progress * 100}%` }}>
          <span key={`trail-${done}`} class="journey-trail">
            {TRAIL.map((i) => (
              <i key={i} style={{ '--i': i }} />
            ))}
          </span>
          <img
            key={`vehicle-${done}`}
            src={assetUrl(art.vehicle)}
            alt=""
            class="journey-vehicle-img"
            draggable={false}
          />
        </div>
      </div>
      <img src={assetUrl(art.to)} alt="" class="journey-end journey-to" draggable={false} />
    </div>
  );
}

interface PuzzleProps {
  mission: Mission;
  feedback: StringKey | null;
  onFeedback: (key: StringKey | null) => void;
  onNext: () => void;
}

/**
 * One elapsed, arrival or schedule puzzle; remounted per `index`, so the jumps panel and
 * wrong picks reset. ELAPSED and SCHEDULE ask for a duration: between two digital displays,
 * or for one segment of the day-plan bar (SPEC §8.6). ARRIVE (D20) shows the start and the
 * duration and asks for the arrival time; its jump hint hides the reached times until
 * solved. The jump hint covers the puzzle's interval either way.
 */
function PuzzleB({ mission, feedback, onFeedback: setFeedback, onNext }: PuzzleProps) {
  const puzzle = mission.puzzles[mission.index]!;
  if (puzzle.kind !== 'ELAPSED' && puzzle.kind !== 'ARRIVE' && puzzle.kind !== 'SCHEDULE') {
    throw new Error('Activity B expects ELAPSED, ARRIVE or SCHEDULE puzzles');
  }
  const arrive = puzzle.kind === 'ARRIVE';
  const theme = mission.theme;
  const lang = language.value;
  const elapsed = useElapsedSeconds();
  const question = useRef<HTMLParagraphElement>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [jumpsOpen, setJumpsOpen] = useState(false);
  const solved = mission.current.solved;
  const { start, end } = puzzle.kind === 'SCHEDULE' ? askedSegment(puzzle) : puzzle;
  const correct = correctValue(puzzle);
  const duration = formatDuration(end - start, lang);
  const questionText =
    puzzle.kind === 'ELAPSED'
      ? t(`b.q.${theme}`)
      : puzzle.kind === 'ARRIVE'
        ? t(`b.arrive.q.${theme}`, { dur: duration })
        : t('b.sched.q', {
            activity: t(`sched.${theme}.${askedSegment(puzzle).label}` as StringKey),
          });

  useEffect(() => {
    question.current?.focus({ preventScroll: true });
  }, []);

  const answer = (choice: number) => {
    if (solved) return;
    const totalWrong =
      mission.results.reduce((n, r) => n + r.wrongAttempts, 0) + mission.current.wrongAttempts;
    if (isCorrectAnswer(puzzle, choice)) {
      setFeedback(`fb.correct.${(mission.results.length % 3) + 1}` as StringKey);
      play(mission.results.length + 1 >= PUZZLES_PER_MISSION ? 'fanfare' : 'correct');
    } else {
      play('wrong');
      setWrong((w) => [...w, choice]);
      setFeedback(`fb.wrong.${(totalWrong % 3) + 1}` as StringKey);
    }
    dispatch({ type: 'mission/answer', choice, seconds: elapsed() });
  };

  /** "Show the jumps" and the footer's Hint both open the timeline and record the hint (§8.5). */
  const showJumps = () => {
    play('hint');
    setJumpsOpen(true);
    dispatch({ type: 'mission/hint' });
  };
  const toggleJumps = () => (jumpsOpen ? setJumpsOpen(false) : showJumps());

  const options: ChoiceOption[] = puzzle.choices.map((c) => ({
    value: c,
    content: arrive ? (
      <DigitalDisplay time={c} mode="24h" size="button" />
    ) : (
      formatDuration(c, lang)
    ),
  }));

  return (
    <div class="puzzle" data-testid="puzzle" data-kind={puzzle.kind} data-index={mission.index}>
      <p class="question" data-testid="question" tabIndex={-1} ref={question}>
        {questionText}
      </p>
      <div class="puzzle-body">
        {puzzle.kind === 'SCHEDULE' ? (
          <ScheduleBar theme={theme} segments={puzzle.segments} ask={puzzle.ask} />
        ) : (
          <div class="journey-times">
            <DigitalDisplay
              time={start}
              mode="24h"
              caption={t('b.leaves')}
              label={`${t('b.leaves')} ${formatTime(start, '24h')}`}
            />
            <div class="journey-times-middle">
              <img
                src={assetUrl(THEME_UI[theme].journey.vehicle)}
                alt=""
                class="journey-times-icon"
                draggable={false}
              />
              {arrive && (
                <span class="journey-takes" data-testid="journey-takes">
                  <span class="journey-takes-caption">{t('b.takes')}</span>
                  {duration}
                </span>
              )}
            </div>
            {arrive ? (
              <span
                class="digital digital-big digital-unknown"
                role="img"
                aria-label={t('b.arrivesUnknown')}
                data-testid="arrives-unknown"
              >
                <span class="digital-caption">{t('b.arrives')}</span>
                <span class="digital-digits">?:??</span>
              </span>
            ) : (
              <DigitalDisplay
                time={end}
                mode="24h"
                caption={t('b.arrives')}
                label={`${t('b.arrives')} ${formatTime(end, '24h')}`}
              />
            )}
          </div>
        )}
        <ChoiceGroup
          label={t('ui.answers')}
          options={options}
          wrong={wrong}
          correct={solved ? correct : null}
          onPick={answer}
          class={arrive ? 'choices-digital' : 'choices-durations'}
        />
        <div class="jumps-box">
          <button
            type="button"
            class="btn btn-small"
            data-testid="show-jumps"
            data-sound={jumpsOpen ? undefined : 'none'}
            aria-expanded={jumpsOpen}
            onClick={toggleJumps}
          >
            {jumpsOpen ? t('b.hideJumps') : t('b.showJumps')}
          </button>
          {jumpsOpen && (
            <div class="jumps-panel">
              <JumpTimeline start={start} end={end} hideTimes={arrive && !solved} />
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
