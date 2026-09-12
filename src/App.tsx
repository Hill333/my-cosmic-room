import type { FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { language, mission, motion } from './state/store.ts';
import { screen } from './state/nav.ts';
import { Stage } from './ui/Stage.tsx';
import { S0Title } from './ui/screens/S0Title.tsx';
import { S1Room } from './ui/screens/S1Room.tsx';
import { S2Board } from './ui/screens/S2Board.tsx';
import { S3ActivityA } from './ui/screens/S3ActivityA.tsx';
import { S4ActivityB } from './ui/screens/S4ActivityB.tsx';
import { S5Complete } from './ui/screens/S5Complete.tsx';
import { S6Parent } from './ui/screens/S6Parent.tsx';

const BACKGROUNDS = {
  space: '#5A3D8A',
  sweet: '#F5B5C8',
  title: '#3B2A5E',
} as const;

export function App() {
  const current = screen.value;
  const m = mission.value;

  // The root element carries the language (SPEC §13.4).
  useEffect(() => {
    document.documentElement.lang = language.value;
  }, [language.value]);

  // The development harness (SPEC §16.4) is loaded on demand and only in dev builds, so the
  // production bundle never contains it.
  const [Harness, setHarness] = useState<FunctionComponent | null>(null);
  useEffect(() => {
    if (import.meta.env.DEV && current.id === 'harness' && !Harness) {
      void import('./ui/screens/DevHarness.tsx').then((m) => setHarness(() => m.DevHarness));
    }
  }, [current.id, Harness]);

  const theme =
    current.id === 'S1' || current.id === 'S2'
      ? current.theme
      : (current.id === 'S3' || current.id === 'S4' || current.id === 'S5') && m
        ? m.theme
        : null;
  const background = theme ? BACKGROUNDS[theme] : BACKGROUNDS.title;

  // Mission screens need a record in the right state; without one (for instance a mission
  // that ended in another tab) they fall back to the title.
  const inProgress = m?.state === 'IN_PROGRESS' ? m : null;
  const ended = m && m.state !== 'IN_PROGRESS' ? m : null;

  return (
    <Stage background={background} motion={motion.value}>
      {current.id === 'S0' && <S0Title />}
      {current.id === 'S1' && (
        <S1Room
          key={current.theme}
          theme={current.theme}
          sparkle={current.sparkle ?? null}
          suggest={current.suggest ?? false}
        />
      )}
      {current.id === 'S2' && <S2Board theme={current.theme} />}
      {(current.id === 'S3' || current.id === 'S4') &&
        (inProgress ? (
          inProgress.activity === 'A' ? (
            <S3ActivityA mission={inProgress} />
          ) : (
            <S4ActivityB mission={inProgress} />
          )
        ) : (
          <S0Title />
        ))}
      {current.id === 'S5' && (ended ? <S5Complete mission={ended} /> : <S0Title />)}
      {current.id === 'S6' && <S6Parent returnTo={current.returnTo} />}
      {current.id === 'harness' && Harness && <Harness />}
    </Stage>
  );
}
