import { useEffect, useRef, useState } from 'preact/hooks';
import { formatDuration } from '../../core/elapsed.ts';
import { isCorrectAnswer, PUZZLES_PER_MISSION } from '../../core/mission.ts';
import { formatTime, hour12Of, minutesOf, periodOf } from '../../core/time.ts';
import {
  isInputKind,
  type DigitalMode,
  type Mission,
  type Puzzle,
  type ReadingLevel,
  type TimeValue,
} from '../../core/types.ts';
import { formatTimeWords } from '../../core/words.ts';
import { dispatch, language, save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { useElapsedSeconds } from '../hooks.ts';
import { play } from '../sound.ts';
import { AnalogClock, CLOCK_SIZE } from '../components/AnalogClock.tsx';
import { ChoiceGroup, type ChoiceOption } from '../components/ChoiceGroup.tsx';
import type { CompanionPose } from '../components/Companion.tsx';
import { DigitalBuilder } from '../components/DigitalBuilder.tsx';
import { DigitalDisplay } from '../components/DigitalDisplay.tsx';
import { MissionFrame, PuzzleFooter } from '../components/MissionFrame.tsx';
import { SetClock, type SetStatus } from '../components/SetClock.tsx';

const LETTERS = ['A', 'B', 'C'];

interface Props {
  mission: Mission;
}

/** S3 Activity A (SPEC §3.6): READ, MATCH, SET, SHIFT and DIGITS puzzles inside the mission frame. */
export function S3ActivityA({ mission }: Props) {
  const theme = mission.theme;
  const solved = mission.current.solved;
  const pose: CompanionPose = solved ? 'cheer' : mission.current.wrongAttempts > 0 ? 'hmm' : 'idle';
  const variant = solved ? mission.results.length % 4 : mission.current.wrongAttempts % 2;
  // The feedback line lives here so the companion can repeat it in its bubble; on the first
  // puzzle, before any answer, the companion says the story line instead.
  const [feedback, setFeedback] = useState<StringKey | null>(null);
  const story = t(`a.story.${theme}`);
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
      title={t(`mission.a.${theme}`)}
      story={story}
      companionPose={pose}
      companionVariant={variant}
      bubble={bubble}
    >
      <PuzzleA
        key={mission.index}
        mission={mission}
        feedback={feedback}
        onFeedback={setFeedback}
        onNext={next}
      />
    </MissionFrame>
  );
}

interface PuzzleProps {
  mission: Mission;
  feedback: StringKey | null;
  onFeedback: (key: StringKey | null) => void;
  onNext: () => void;
}

/** One puzzle; remounted per `index`, so the wrong picks and messages reset (SPEC §9.1). */
function PuzzleA({ mission, feedback, onFeedback: setFeedback, onNext }: PuzzleProps) {
  const puzzle = mission.puzzles[mission.index]!;
  const level = mission.level as ReadingLevel;
  const theme = mission.theme;
  const lang = language.value;
  const mode: DigitalMode = save.value.settings.hour24Reading ? '24h' : '12h';
  if (puzzle.kind === 'ELAPSED' || puzzle.kind === 'ARRIVE' || puzzle.kind === 'SCHEDULE') {
    throw new Error('Activity A expects reading puzzles');
  }
  const target = puzzle.target;
  // SHIFT shows the start on its clock; the badge belongs to what is shown (SPEC §6.1).
  const period = mode === '24h' ? periodOf(puzzle.kind === 'SHIFT' ? puzzle.start : target) : null;
  /** The prompt time as digits or, for word-form puzzles (SPEC §7.7), in words. */
  const shownTime =
    puzzle.kind !== 'SHIFT' && puzzle.words
      ? formatTimeWords(target, lang)
      : formatTime(target, mode);
  const elapsed = useElapsedSeconds();
  const question = useRef<HTMLParagraphElement>(null);
  const [wrong, setWrong] = useState<number[]>([]);
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
      // The fourth right answer completes the mission (SPEC §15.4: fanfare).
      play(mission.results.length + 1 >= PUZZLES_PER_MISSION ? 'fanfare' : 'correct');
    } else {
      play('wrong');
      setWrong((w) => [...w, choice]);
      const key =
        isInputKind(puzzle.kind) && mission.current.wrongAttempts === 0
          ? 'fb.setWrong'
          : `fb.wrong.${(totalWrong % 3) + 1}`;
      setFeedback(key as StringKey);
      setSetStatus('wrong');
    }
    dispatch({ type: 'mission/answer', choice, seconds: elapsed() });
  };

  const hint = () => {
    play('hint');
    dispatch({ type: 'mission/hint' });
  };

  const questionText =
    puzzle.kind === 'SHIFT'
      ? t(`a.shift.${puzzle.delta > 0 ? 'later' : 'ago'}.${theme}`, {
          delta: formatDuration(Math.abs(puzzle.delta), lang),
        })
      : puzzle.kind === 'READ'
        ? t('a.read.q')
        : puzzle.kind === 'MATCH'
          ? t('a.match.q', { time: shownTime })
          : puzzle.kind === 'DIGITS'
            ? t('a.digits.q')
            : t('a.set.q', { time: shownTime });

  return (
    <div
      class="puzzle"
      data-testid="puzzle"
      data-kind={puzzle.kind}
      data-index={mission.index}
      data-words={puzzle.kind !== 'SHIFT' && puzzle.words ? 'true' : undefined}
    >
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
        {puzzle.kind === 'SHIFT' && (
          <ShiftPuzzle
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
        {puzzle.kind === 'DIGITS' && (
          // DIGITS (D20): the clock to read on the left, the display to build on the right;
          // the hint is the READ hint beside the display.
          <div class="read-clock">
            <AnalogClock
              time={target}
              level={level}
              theme={theme}
              size={CLOCK_SIZE.puzzle}
              period={period}
              sweep={hintUsed}
            />
            <div class="digits-side">
              <DigitalBuilder
                target={target}
                level={level}
                mode={mode}
                status={setStatus}
                attempt={mission.current.wrongAttempts}
                disabled={solved}
                onChange={() => setSetStatus('idle')}
                onCheck={answer}
              />
              {hintUsed && <ReadHint target={target} />}
            </div>
          </div>
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

/**
 * READ: a 440 px clock over three answer buttons, digital or in words (SPEC §7.7);
 * hint = sweep and hour caption (§9.3).
 */
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
  const lang = language.value;
  const options: ChoiceOption[] = puzzle.choices.map((c) => ({
    value: c,
    content: puzzle.words ? (
      formatTimeWords(c, lang)
    ) : (
      <DigitalDisplay time={c} mode={mode} size="button" />
    ),
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
        class={puzzle.words ? 'choices-words' : 'choices-digital'}
      />
    </>
  );
}

interface ShiftProps extends Omit<ReadProps, 'puzzle'> {
  puzzle: Extract<Puzzle, { kind: 'SHIFT' }>;
}

/**
 * SHIFT (SPEC §3.6): the clock shows the start, the question names the shift, three digital
 * answers; the hint draws the target as faint ghost hands with a caption (§9.3).
 */
function ShiftPuzzle({
  puzzle,
  level,
  mode,
  theme,
  period,
  hint,
  wrong,
  solved,
  onPick,
}: ShiftProps) {
  const options: ChoiceOption[] = puzzle.choices.map((c) => ({
    value: c,
    content: <DigitalDisplay time={c} mode={mode} size="button" />,
  }));
  return (
    <>
      <div class="read-clock">
        <AnalogClock
          time={puzzle.start}
          level={level}
          theme={theme}
          size={CLOCK_SIZE.puzzle}
          period={period}
          label={t('a.shift.clockLabel')}
          ghost={hint && !solved ? puzzle.target : null}
        />
        {hint && (
          <p class="hint-hour" role="status" data-testid="shift-hint">
            {t('hint.shift')}
          </p>
        )}
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

/**
 * MATCH: a big digital prompt (or the time in words, SPEC §7.7) over three 240 px clock
 * buttons labelled A/B/C (SPEC §3.6).
 */
function MatchPuzzle({ puzzle, level, mode, theme, hint, wrong, solved, onPick }: MatchProps) {
  const lang = language.value;
  const options: ChoiceOption[] = puzzle.choices.map((c, i) => ({
    value: c,
    letter: LETTERS[i]!,
    label: t('a.match.label', { letter: LETTERS[i]! }),
    content: (
      <AnalogClock time={c} level={level} theme={theme} size={CLOCK_SIZE.option} decorative />
    ),
  }));
  const shown = formatTime(puzzle.target, mode);
  const words = puzzle.words ? formatTimeWords(puzzle.target, lang) : null;
  return (
    <>
      {hint ? (
        <MatchHint target={puzzle.target} mode={mode} words={words} />
      ) : words ? (
        <p class="words-big" role="img" aria-label={words} data-testid="words-prompt">
          {words}
        </p>
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

interface MatchHintProps {
  target: TimeValue;
  mode: DigitalMode;
  /** The word form of a words puzzle, shown with its digits above the split (SPEC §9.3). */
  words: string | null;
}

/** The digital display split into its hour and minute parts with hand captions (SPEC §9.3). */
function MatchHint({ target, mode, words }: MatchHintProps) {
  const [hours, minutes] = formatTime(target, mode).split(':') as [string, string];
  const m = minutesOf(target);
  return (
    <div class="match-hint" data-testid="match-hint" role="group" aria-label={t('q.hint')}>
      {words && (
        <p class="hint-caption match-words" data-testid="words-hint">
          {t('hint.wordsDigital', { words, time: formatTime(target, mode) })}
        </p>
      )}
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
