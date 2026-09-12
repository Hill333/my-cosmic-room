import { useEffect, useRef, useState } from 'preact/hooks';
import { isCorrectAnswer } from '../../core/mission.ts';
import { formatTime, hour12Of, minutesOf, periodOf } from '../../core/time.ts';
import type { DigitalMode, Mission, Puzzle, ReadingLevel, TimeValue } from '../../core/types.ts';
import { dispatch, save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { useElapsedSeconds } from '../hooks.ts';
import { AnalogClock, CLOCK_SIZE } from '../components/AnalogClock.tsx';
import { ChoiceGroup, type ChoiceOption } from '../components/ChoiceGroup.tsx';
import type { CompanionPose } from '../components/Companion.tsx';
import { DigitalDisplay } from '../components/DigitalDisplay.tsx';
import { MissionFrame, PuzzleFooter } from '../components/MissionFrame.tsx';
import { SetClock, type SetStatus } from '../components/SetClock.tsx';

const LETTERS = ['A', 'B', 'C'];

interface Props {
  mission: Mission;
}

/** S3 Activity A (SPEC §3.6): READ, MATCH and SET puzzles inside the mission frame. */
export function S3ActivityA({ mission }: Props) {
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
      title={t(`mission.a.${theme}`)}
      story={t(`a.story.${theme}`)}
      companionPose={pose}
      companionVariant={variant}
    >
      <PuzzleA key={mission.index} mission={mission} onNext={next} />
    </MissionFrame>
  );
}

interface PuzzleProps {
  mission: Mission;
  onNext: () => void;
}

/** One puzzle; remounted per `index`, so the wrong picks and messages reset (SPEC §9.1). */
function PuzzleA({ mission, onNext }: PuzzleProps) {
  const puzzle = mission.puzzles[mission.index]!;
  const level = mission.level as ReadingLevel;
  const theme = mission.theme;
  const mode: DigitalMode = save.value.settings.hour24Reading ? '24h' : '12h';
  const target = puzzle.kind === 'ELAPSED' ? puzzle.end : puzzle.target;
  const period = mode === '24h' ? periodOf(target) : null;
  const elapsed = useElapsedSeconds();
  const question = useRef<HTMLParagraphElement>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<StringKey | null>(null);
  const [setStatus, setSetStatus] = useState<SetStatus>('idle');
  const solved = mission.current.solved;
  const hintUsed = mission.current.hintUsed;

  // Focus lands on the question line of each new puzzle; the answers follow in Tab order.
  // On a screen mount the frame's heading takes focus afterwards (SPEC §13.1).
  useEffect(() => {
    question.current?.focus({ preventScroll: true });
  }, []);

  const answer = (choice: number) => {
    if (solved) return;
    const correct = isCorrectAnswer(puzzle, choice);
    const totalWrong =
      mission.results.reduce((n, r) => n + r.wrongAttempts, 0) + mission.current.wrongAttempts;
    if (correct) {
      setFeedback(`fb.correct.${(mission.results.length % 3) + 1}` as StringKey);
      setSetStatus('correct');
    } else {
      setWrong((w) => [...w, choice]);
      const key =
        puzzle.kind === 'SET' && mission.current.wrongAttempts === 0
          ? 'fb.setWrong'
          : `fb.wrong.${(totalWrong % 3) + 1}`;
      setFeedback(key as StringKey);
      setSetStatus('wrong');
    }
    dispatch({ type: 'mission/answer', choice, seconds: elapsed() });
  };

  const hint = () => dispatch({ type: 'mission/hint' });

  const questionText =
    puzzle.kind === 'READ'
      ? t('a.read.q')
      : puzzle.kind === 'MATCH'
        ? t('a.match.q', { time: formatTime(target, mode) })
        : t('a.set.q', { time: formatTime(target, mode) });

  return (
    <div class="puzzle" data-testid="puzzle" data-kind={puzzle.kind} data-index={mission.index}>
      <p class="question" data-testid="question" tabIndex={-1} ref={question}>
        {questionText}
      </p>
      <div class="puzzle-body">
        {puzzle.kind === 'READ' && (
          <ReadPuzzle
            puzzle={puzzle}
            level={level}
            mode={mode}
            theme={theme}
            period={period}
            hint={hintUsed}
            wrong={wrong}
            solved={solved}
            onPick={answer}
          />
        )}
        {puzzle.kind === 'MATCH' && (
          <MatchPuzzle
            puzzle={puzzle}
            level={level}
            mode={mode}
            theme={theme}
            hint={hintUsed}
            wrong={wrong}
            solved={solved}
            onPick={answer}
          />
        )}
        {puzzle.kind === 'SET' && (
          <SetClock
            target={target}
            level={level}
            theme={theme}
            period={period}
            status={setStatus}
            attempt={mission.current.wrongAttempts}
            disabled={solved}
            showGhost={hintUsed && !solved}
            onChange={() => setSetStatus('idle')}
            onCheck={answer}
          />
        )}
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
      <PuzzleFooter mission={mission} hintUsed={hintUsed} onHint={hint} onNext={onNext} />
    </div>
  );
}

interface ReadProps {
  puzzle: Extract<Puzzle, { kind: 'READ' | 'MATCH' }>;
  level: ReadingLevel;
  mode: DigitalMode;
  theme: Mission['theme'];
  period: ReturnType<typeof periodOf> | null;
  hint: boolean;
  wrong: number[];
  solved: boolean;
  onPick: (value: number) => void;
}

/** READ: a 440 px clock over three digital answer buttons; hint = sweep and hour caption (§9.3). */
function ReadPuzzle({
  puzzle,
  level,
  mode,
  theme,
  period,
  hint,
  wrong,
  solved,
  onPick,
}: ReadProps) {
  const options: ChoiceOption[] = puzzle.choices.map((c) => ({
    value: c,
    content: <DigitalDisplay time={c} mode={mode} size="button" />,
  }));
  return (
    <>
      <div class="read-clock">
        <AnalogClock
          time={puzzle.target}
          level={level}
          theme={theme}
          size={CLOCK_SIZE.puzzle}
          period={period}
          sweep={hint}
        />
        {hint && <ReadHint target={puzzle.target} />}
      </div>
      <ChoiceGroup
        label={t('ui.answers')}
        options={options}
        wrong={wrong}
        correct={solved ? puzzle.target : null}
        onPick={onPick}
        class="choices-digital"
      />
    </>
  );
}

/** Minute counter that counts up with the sweep (CSS @property) and the hour-hand caption. */
function ReadHint({ target }: { target: TimeValue }) {
  const m = minutesOf(target);
  const h = hour12Of(target);
  const text = t('hint.minutes', { m });
  const at = text.indexOf(String(m));
  const before = at >= 0 ? text.slice(0, at) : '';
  const after = at >= 0 ? text.slice(at + String(m).length) : text;
  return (
    <div class="read-hint" data-testid="read-hint">
      <p class="hint-counter" role="status">
        {before}
        <span class="hint-count" style={{ '--target': m }} aria-hidden="true" />
        <span class="visually-hidden">{m}</span>
        {after}
      </p>
      <p class="hint-hour" role="status">
        {m === 0 ? t('hint.hourExact', { h }) : t('hint.hourPast', { h })}
      </p>
    </div>
  );
}

type MatchProps = Omit<ReadProps, 'period'>;

/** MATCH: a big digital prompt over three 240 px clock buttons labelled A/B/C (SPEC §3.6). */
function MatchPuzzle({ puzzle, level, mode, theme, hint, wrong, solved, onPick }: MatchProps) {
  const options: ChoiceOption[] = puzzle.choices.map((c, i) => ({
    value: c,
    letter: LETTERS[i]!,
    label: t('a.match.label', { letter: LETTERS[i]! }),
    content: (
      <AnalogClock time={c} level={level} theme={theme} size={CLOCK_SIZE.option} decorative />
    ),
  }));
  const shown = formatTime(puzzle.target, mode);
  return (
    <>
      {hint ? (
        <MatchHint target={puzzle.target} mode={mode} />
      ) : (
        <DigitalDisplay time={puzzle.target} mode={mode} label={shown} />
      )}
      <ChoiceGroup
        label={t('ui.answers')}
        options={options}
        wrong={wrong}
        correct={solved ? puzzle.target : null}
        onPick={onPick}
        class="choices-clocks"
      />
    </>
  );
}

/** The digital display split into its hour and minute parts with hand captions (SPEC §9.3). */
function MatchHint({ target, mode }: { target: TimeValue; mode: DigitalMode }) {
  const [hours, minutes] = formatTime(target, mode).split(':') as [string, string];
  const m = minutesOf(target);
  return (
    <div class="match-hint" data-testid="match-hint" role="group" aria-label={t('q.hint')}>
      <div class="match-part">
        <span class="digital digital-big" aria-hidden="true">
          <span class="digital-digits">{hours}</span>
        </span>
        <span class="hint-caption">{t('hint.matchShort', { h: hour12Of(target) })}</span>
      </div>
      <span class="match-colon" aria-hidden="true">
        :
      </span>
      <div class="match-part">
        <span class="digital digital-big" aria-hidden="true">
          <span class="digital-digits">{minutes}</span>
        </span>
        <span class="hint-caption">{t('hint.matchLong', { m: m === 0 ? 12 : m })}</span>
      </div>
    </div>
  );
}
