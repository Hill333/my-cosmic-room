import { useState } from 'preact/hooks';
import { requireItem } from '../../catalog/index.ts';
import { decomposeJumps, formatDuration, formatJump } from '../../core/elapsed.ts';
import {
  createRng,
  makeActivityAMission,
  makeActivityBMission,
  pickTarget,
  type GeneratedMission,
} from '../../core/generate.ts';
import { isCorrectAnswer } from '../../core/mission.ts';
import { formatTime, makeTime, periodOf, sameFace } from '../../core/time.ts';
import type {
  Activity,
  DigitalMode,
  ElapsedLevel,
  Puzzle,
  ReadingLevel,
  Theme,
  TimeValue,
} from '../../core/types.ts';
import { dispatch, language, newSeed, save } from '../../state/store.ts';
import { go } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { AnalogClock, CLOCK_SIZE } from '../components/AnalogClock.tsx';
import { DigitalDisplay } from '../components/DigitalDisplay.tsx';
import { SetClock, type SetStatus } from '../components/SetClock.tsx';

const READING: ReadingLevel[] = [1, 2, 3, 4];
const ELAPSED: ElapsedLevel[] = [1, 2, 3];
const SAMPLE: Record<ReadingLevel, TimeValue> = {
  1: makeTime(3, 0),
  2: makeTime(3, 30),
  3: makeTime(6, 45),
  4: makeTime(9, 35),
};

/**
 * Development harness (SPEC §16.4, `?screen=harness`, dev builds only): clocks at every level,
 * digital displays, the SET interaction and generated missions driven through the reducer.
 * Placeholder layout and plain English; nothing here ships in production builds.
 */
export function DevHarness() {
  return (
    <main class="screen harness">
      <header class="harness-header">
        <h1>M1 clock engine harness</h1>
        <button type="button" class="btn" onClick={() => go({ id: 'S0' })}>
          Back to S0
        </button>
      </header>
      <ClockGallery />
      <DigitalGallery />
      <SetPlayground />
      <GeneratorPanel />
      <ReducerPanel />
    </main>
  );
}

function ClockGallery() {
  return (
    <section class="harness-section">
      <h2>Analog clocks per level (option size 240 px)</h2>
      <div class="harness-row">
        {READING.map((level) => (
          <figure key={level}>
            <AnalogClock
              time={SAMPLE[level]}
              level={level}
              theme="space"
              size={CLOCK_SIZE.option}
            />
            <figcaption>
              R{level} · {formatTime(SAMPLE[level], '12h')}
            </figcaption>
          </figure>
        ))}
        <figure>
          <AnalogClock
            time={makeTime(14, 30)}
            level={3}
            theme="sweet"
            size={CLOCK_SIZE.option}
            period={periodOf(makeTime(14, 30))}
          />
          <figcaption>Sweet rim, 24-hour badge · 14:30</figcaption>
        </figure>
        <figure>
          <AnalogClock
            time={makeTime(19, 15)}
            level={2}
            theme="sweet"
            size={CLOCK_SIZE.wall}
            ghost={makeTime(14, 30)}
          />
          <figcaption>Wall size, ghost hands</figcaption>
        </figure>
      </div>
    </section>
  );
}

function DigitalGallery() {
  return (
    <section class="harness-section">
      <h2>Digital displays</h2>
      <div class="harness-row">
        <DigitalDisplay time={makeTime(3, 30)} mode="12h" label="3:30" />
        <DigitalDisplay time={makeTime(9, 15)} mode="24h" caption={t('b.leaves')} label="09:15" />
        <DigitalDisplay time={makeTime(14, 30)} mode="24h" caption={t('b.arrives')} label="14:30" />
        <DigitalDisplay time={makeTime(12, 0)} mode="12h" size="button" />
        <DigitalDisplay time={makeTime(19, 15)} mode="24h" size="button" />
      </div>
    </section>
  );
}

function SetPlayground() {
  const [level, setLevel] = useState<ReadingLevel>(2);
  const [seed, setSeed] = useState(1);
  const [status, setStatus] = useState<SetStatus>('idle');
  const [ghost, setGhost] = useState(false);
  const [value, setValue] = useState<TimeValue | null>(null);
  const mode: DigitalMode = save.value.settings.hour24Reading ? '24h' : '12h';
  const target = pickTarget(level, mode, createRng(seed * 7919 + level));
  const reroll = () => {
    setSeed((s) => s + 1);
    setStatus('idle');
    setValue(null);
  };
  return (
    <section class="harness-section">
      <h2>SET interaction</h2>
      <div class="harness-controls">
        {READING.map((l) => (
          <button
            key={l}
            type="button"
            class="chip"
            aria-pressed={level === l}
            onClick={() => {
              setLevel(l);
              setStatus('idle');
              setValue(null);
            }}
          >
            R{l}
          </button>
        ))}
        <button type="button" class="btn" onClick={reroll}>
          New target
        </button>
        <button type="button" class="chip" aria-pressed={ghost} onClick={() => setGhost(!ghost)}>
          Ghost hands
        </button>
        <span>
          Target: <strong>{formatTime(target, mode)}</strong>
          {value !== null && <> · set: {formatTime(value, '24h')}</>}
          {' · '}
          <output data-testid="set-status">{status}</output>
        </span>
      </div>
      <SetClock
        key={`${level}-${seed}`}
        target={target}
        level={level}
        theme="space"
        showGhost={ghost}
        period={mode === '24h' ? periodOf(target) : null}
        status={status}
        onChange={setValue}
        onCheck={(time) => setStatus(sameFace(time, target) ? 'correct' : 'wrong')}
      />
    </section>
  );
}

function GeneratorPanel() {
  const [activity, setActivity] = useState<Activity>('A');
  const [rLevel, setRLevel] = useState<ReadingLevel>(2);
  const [eLevel, setELevel] = useState<ElapsedLevel>(3);
  const [seed, setSeed] = useState(7);
  const [firstE3, setFirstE3] = useState(true);
  const mode: DigitalMode = save.value.settings.hour24Reading ? '24h' : '12h';
  const mission: GeneratedMission =
    activity === 'A'
      ? makeActivityAMission(rLevel, mode, [], createRng(seed))
      : makeActivityBMission(eLevel, [], createRng(seed), firstE3);
  return (
    <section class="harness-section">
      <h2>Generators (pure, seed {seed})</h2>
      <div class="harness-controls">
        {(['A', 'B'] as const).map((a) => (
          <button
            key={a}
            type="button"
            class="chip"
            aria-pressed={activity === a}
            onClick={() => setActivity(a)}
          >
            Activity {a}
          </button>
        ))}
        {activity === 'A'
          ? READING.map((l) => (
              <button
                key={l}
                type="button"
                class="chip"
                aria-pressed={rLevel === l}
                onClick={() => setRLevel(l)}
              >
                R{l}
              </button>
            ))
          : ELAPSED.map((l) => (
              <button
                key={l}
                type="button"
                class="chip"
                aria-pressed={eLevel === l}
                onClick={() => setELevel(l)}
              >
                E{l}
              </button>
            ))}
        {activity === 'B' && (
          <button
            type="button"
            class="chip"
            aria-pressed={firstE3}
            onClick={() => setFirstE3(!firstE3)}
          >
            first E3
          </button>
        )}
        <button type="button" class="btn" onClick={() => setSeed((s) => s + 1)}>
          Next seed
        </button>
      </div>
      <ol class="harness-list" data-testid="generated">
        {mission.puzzles.map((p, i) => (
          <li key={i}>{describePuzzle(p, mode)}</li>
        ))}
      </ol>
    </section>
  );
}

function describePuzzle(p: Puzzle, mode: DigitalMode): string {
  const lang = language.value;
  if (p.kind === 'ELAPSED') {
    const jumps = decomposeJumps(p.start, p.end)
      .map((j) => `${formatJump(j.minutes, lang)} → ${formatTime(j.to, '24h')}`)
      .join(', ');
    const choices = p.choices.map((c) => formatDuration(c, lang)).join(' | ');
    return `ELAPSED ${formatTime(p.start, '24h')} → ${formatTime(p.end, '24h')} = ${formatDuration(p.end - p.start, lang)}; choices: ${choices}; jumps: ${jumps}`;
  }
  const target = formatTime(p.target, mode);
  if (p.kind === 'SET') return `SET ${target}`;
  return `${p.kind} ${target}; choices: ${p.choices.map((c) => formatTime(c, mode)).join(' | ')}`;
}

/** Drives the mission reducer through the store, rendering the current puzzle with the components. */
function ReducerPanel() {
  const s = save.value;
  const m = s.mission;
  const mode: DigitalMode = s.settings.hour24Reading ? '24h' : '12h';
  const [theme, setTheme] = useState<Theme>('space');
  const [status, setStatus] = useState<SetStatus>('idle');
  const now = () => new Date().toISOString();

  const answer = (choice: number) => {
    if (!m) return;
    const correct = isCorrectAnswer(m.puzzles[m.index]!, choice);
    setStatus(correct ? 'correct' : 'wrong');
    dispatch({ type: 'mission/answer', choice, seconds: 1 });
  };
  const next = () => {
    setStatus('idle');
    dispatch({ type: 'mission/next' });
  };

  return (
    <section class="harness-section" data-testid="reducer">
      <h2>Mission reducer (store)</h2>
      <div class="harness-controls">
        {(['space', 'sweet'] as const).map((th) => (
          <button
            key={th}
            type="button"
            class="chip"
            aria-pressed={theme === th}
            onClick={() => setTheme(th)}
          >
            {th}
          </button>
        ))}
        <span>R:</span>
        {READING.map((l) => (
          <button
            key={l}
            type="button"
            class="chip"
            aria-pressed={s.settings.readingLevel === l}
            onClick={() => dispatch({ type: 'settings/readingLevel', level: l, byParent: true })}
          >
            {l}
          </button>
        ))}
        <span>E:</span>
        {ELAPSED.map((l) => (
          <button
            key={l}
            type="button"
            class="chip"
            aria-pressed={s.settings.elapsedLevel === l}
            onClick={() => dispatch({ type: 'settings/elapsedLevel', level: l, byParent: true })}
          >
            {l}
          </button>
        ))}
        <button
          type="button"
          class="chip"
          aria-pressed={s.settings.hour24Reading}
          onClick={() =>
            dispatch({ type: 'settings/hour24Reading', enabled: !s.settings.hour24Reading })
          }
        >
          24-hour
        </button>
      </div>
      <div class="harness-controls">
        <button
          type="button"
          class="btn btn-primary"
          disabled={m !== null}
          data-testid="start-a"
          onClick={() =>
            dispatch({ type: 'mission/start', theme, activity: 'A', seed: newSeed(), now: now() })
          }
        >
          Start A
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={m !== null}
          data-testid="start-b"
          onClick={() =>
            dispatch({ type: 'mission/start', theme, activity: 'B', seed: newSeed(), now: now() })
          }
        >
          Start B
        </button>
        <button
          type="button"
          class="btn"
          disabled={!m}
          onClick={() => dispatch({ type: 'mission/hint' })}
        >
          Hint
        </button>
        <button
          type="button"
          class="btn"
          disabled={!m?.current.solved}
          data-testid="next"
          onClick={next}
        >
          Next
        </button>
        <button
          type="button"
          class="btn"
          disabled={!m}
          onClick={() => dispatch({ type: 'mission/leave' })}
        >
          Leave
        </button>
        <button
          type="button"
          class="btn"
          disabled={!m}
          onClick={() => dispatch({ type: 'mission/apply', now: now() })}
        >
          Apply
        </button>
        <button
          type="button"
          class="btn"
          disabled={!m}
          onClick={() => dispatch({ type: 'mission/keep', now: now() })}
        >
          Keep
        </button>
      </div>
      <p class="harness-status" data-testid="mission-state">
        {m
          ? `${m.theme} ${m.activity}${m.level} · ${m.state} · index ${m.index} · wrong ${m.current.wrongAttempts} · hint ${m.current.hintUsed} · solved ${m.current.solved} · pair [${m.prizePair.join(', ')}]${m.claimed ? ` · claimed ${m.claimed}` : ''}`
          : `no mission · space ${s.themes.space.owned.length} owned, ${s.themes.space.stars} stars · sweet ${s.themes.sweet.owned.length} owned, ${s.themes.sweet.stars} stars · wardrobe ${s.wardrobe.length} · history ${s.progress.history.length}`}
      </p>
      {m && m.state === 'IN_PROGRESS' && m.index < 4 && (
        <PuzzleView
          puzzle={m.puzzles[m.index]!}
          level={m.level}
          mode={mode}
          theme={m.theme}
          solved={m.current.solved}
          status={status}
          onAnswer={answer}
        />
      )}
      {m && m.state === 'COMPLETED' && (
        <div class="harness-controls">
          {m.prizePair.map((id) => (
            <button
              key={id}
              type="button"
              class="btn"
              data-testid={`choose-${id}`}
              onClick={() => dispatch({ type: 'mission/choose', item: id })}
            >
              Choose {t(requireItem(id).nameKey as StringKey)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

interface PuzzleViewProps {
  puzzle: Puzzle;
  level: number;
  mode: DigitalMode;
  theme: Theme;
  solved: boolean;
  status: SetStatus;
  onAnswer: (choice: number) => void;
}

function PuzzleView({ puzzle: p, level, mode, theme, solved, status, onAnswer }: PuzzleViewProps) {
  const lang = language.value;
  const rLevel = level as ReadingLevel;
  const period = mode === '24h' && p.kind !== 'ELAPSED' ? periodOf(p.target) : null;
  if (p.kind === 'READ') {
    return (
      <div class="harness-puzzle">
        <p>{t('a.read.q')}</p>
        <AnalogClock time={p.target} level={rLevel} theme={theme} period={period} />
        <div class="harness-row">
          {p.choices.map((c) => (
            <button
              key={c}
              type="button"
              class="btn answer"
              disabled={solved}
              onClick={() => onAnswer(c)}
            >
              <DigitalDisplay time={c} mode={mode} size="button" />
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (p.kind === 'MATCH') {
    return (
      <div class="harness-puzzle">
        <p>{t('a.match.q', { time: formatTime(p.target, mode) })}</p>
        <DigitalDisplay time={p.target} mode={mode} label={formatTime(p.target, mode)} />
        <div class="harness-row">
          {p.choices.map((c, i) => (
            <button
              key={c}
              type="button"
              class="btn answer"
              disabled={solved}
              aria-label={t('a.match.label', { letter: 'ABC'[i]! })}
              onClick={() => onAnswer(c)}
            >
              <AnalogClock
                time={c}
                level={rLevel}
                theme={theme}
                size={CLOCK_SIZE.option}
                decorative
              />
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (p.kind !== 'ELAPSED') {
    return (
      <div class="harness-puzzle">
        <p>{t('a.set.q', { time: formatTime(p.target, mode) })}</p>
        <SetClock
          target={p.target}
          level={rLevel}
          theme={theme}
          period={period}
          status={status}
          disabled={solved}
          showGhost={status === 'wrong'}
          onCheck={onAnswer}
        />
      </div>
    );
  }
  const jumps = decomposeJumps(p.start, p.end);
  return (
    <div class="harness-puzzle">
      <p>{t(`b.q.${theme}`)}</p>
      <div class="harness-row">
        <DigitalDisplay
          time={p.start}
          mode="24h"
          caption={t('b.leaves')}
          label={formatTime(p.start, '24h')}
        />
        <DigitalDisplay
          time={p.end}
          mode="24h"
          caption={t('b.arrives')}
          label={formatTime(p.end, '24h')}
        />
      </div>
      <div class="harness-row">
        {p.choices.map((c) => (
          <button
            key={c}
            type="button"
            class="btn answer"
            disabled={solved}
            onClick={() => onAnswer(c)}
          >
            {formatDuration(c, lang)}
          </button>
        ))}
      </div>
      <p class="harness-jumps">
        {t('b.showJumps')}:{' '}
        {jumps.map((j) => `${formatJump(j.minutes, lang)} → ${formatTime(j.to, '24h')}`).join('  ')}
      </p>
    </div>
  );
}
