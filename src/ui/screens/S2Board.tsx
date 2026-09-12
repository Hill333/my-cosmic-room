import type { ComponentChildren } from 'preact';
import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import { MAX_STARS, nextPair } from '../../core/inventory.ts';
import type { Activity, ElapsedLevel, ReadingLevel, Theme } from '../../core/types.ts';
import { dispatch, newSeed, save } from '../../state/store.ts';
import { go, missionScreen } from '../../state/nav.ts';
import type { StringKey } from '../../strings/index.ts';
import { t } from '../i18n.ts';
import { groupKeyHandler, useFocusOnMount } from '../hooks.ts';

interface Props {
  theme: Theme;
}

const READING: ReadingLevel[] = [1, 2, 3, 4];
const ELAPSED: ElapsedLevel[] = [1, 2, 3];
const CARD_ART: Record<Theme, Record<Activity, string>> = {
  space: { A: 'space/sceneA/rocket', B: 'space/sceneB/rocketParcel' },
  sweet: { A: 'sweet/sceneA/teaTable', B: 'sweet/sceneB/balloonParcel' },
};

/**
 * S2 Mission board (SPEC §3.5): two mission cards with level chips and Start, the prizes
 * waiting, and the way back. Start creates the mission record and opens S3 or S4.
 */
export function S2Board({ theme }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const settings = save.value.settings;
  const pair = nextPair(save.value, theme);
  const stars = save.value.themes[theme].stars;

  const start = (activity: Activity) => {
    dispatch({
      type: 'mission/start',
      theme,
      activity,
      seed: newSeed(),
      now: new Date().toISOString(),
    });
    // An existing record wins over a new start (SPEC §10.1: at most one mission at a time).
    const next = missionScreen(save.value.mission);
    if (next) go(next);
  };

  return (
    <main class={`screen s2 s2-${theme}`} aria-labelledby="s2-title" data-testid="s2">
      <img src={assetUrl(`${theme}/room/background`)} alt="" class="room-bg" draggable={false} />
      <header class="s2-header">
        <button
          type="button"
          class="btn"
          data-testid="back-button"
          onClick={() => go({ id: 'S1', theme })}
        >
          <span aria-hidden="true">◀ </span>
          {t('s2.back')}
        </button>
        <h1 id="s2-title" class="s2-title" tabIndex={-1} ref={heading}>
          {t('s1.mission')}
        </h1>
      </header>
      <div class="mission-cards">
        <MissionCard theme={theme} activity="A" onStart={() => start('A')}>
          <LevelChips
            activity="A"
            current={settings.readingLevel}
            locked={settings.levelsLocked}
            onChange={(level) =>
              dispatch({ type: 'settings/readingLevel', level: level as ReadingLevel })
            }
          />
        </MissionCard>
        <MissionCard theme={theme} activity="B" onStart={() => start('B')}>
          <LevelChips
            activity="B"
            current={settings.elapsedLevel}
            locked={settings.levelsLocked}
            onChange={(level) =>
              dispatch({ type: 'settings/elapsedLevel', level: level as ElapsedLevel })
            }
          />
        </MissionCard>
      </div>
      <section class="card prizes-box" aria-labelledby="prizes-title" data-testid="prizes-waiting">
        <h2 id="prizes-title" class="prizes-title">
          {t('s2.prizes')}
        </h2>
        {pair.length > 0 ? (
          <ul class="prizes-list">
            {pair.map((id) => {
              const item = requireItem(id);
              return (
                <li key={id} class="prize" data-testid={`prize-${id}`}>
                  <img src={assetUrl(item.art.tile)} alt="" draggable={false} />
                  <span>{t(item.nameKey as StringKey)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="prizes-empty">
            {t('s2.allCollected')}{' '}
            <span class="prizes-stars">★ {t('s5.starCount', { n: stars, total: MAX_STARS })}</span>
          </p>
        )}
      </section>
    </main>
  );
}

interface CardProps {
  theme: Theme;
  activity: Activity;
  onStart: () => void;
  children: ComponentChildren;
}

function MissionCard({ theme, activity, onStart, children }: CardProps) {
  const key = activity.toLowerCase() as 'a' | 'b';
  const titleId = `mission-card-${key}`;
  return (
    <section
      class="card mission-card"
      aria-labelledby={titleId}
      data-testid={`mission-card-${activity}`}
    >
      <img
        src={assetUrl(CARD_ART[theme][activity])}
        alt=""
        class="mission-card-art"
        draggable={false}
      />
      <h2 id={titleId} class="mission-card-title">
        {t(`mission.${key}.${theme}`)}
      </h2>
      <p class="mission-card-desc">{t(`mission.${key}.${theme}.desc`)}</p>
      {children}
      <button
        type="button"
        class="btn btn-lg btn-primary"
        data-testid={`start-${activity}`}
        onClick={onStart}
      >
        {t('s2.start')}
        <span aria-hidden="true"> ▶</span>
      </button>
    </section>
  );
}

interface ChipsProps {
  activity: Activity;
  current: number;
  locked: boolean;
  onChange: (level: number) => void;
}

/** Level chips (SPEC §3.5): the current level is pressed; locked levels show a lock icon (AT-29). */
function LevelChips({ activity, current, locked, onChange }: ChipsProps) {
  const levels: number[] = activity === 'A' ? READING : ELAPSED;
  const prefix = activity === 'A' ? 'r' : 'e';
  return (
    <div class="level-chips">
      <div
        class="chips"
        role="group"
        aria-label={t('s6.levels')}
        data-testid={`levels-${activity}`}
        onKeyDown={groupKeyHandler}
      >
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            class="chip"
            aria-pressed={current === level}
            disabled={locked}
            data-testid={`level-${prefix}${level}`}
            onClick={() => onChange(level)}
          >
            {t(`level.${prefix}${level}` as StringKey)}
          </button>
        ))}
      </div>
      {locked && (
        <p class="chips-locked" data-testid="levels-locked">
          <span aria-hidden="true">🔒 </span>
          {t('s2.locked')}
        </p>
      )}
    </div>
  );
}
