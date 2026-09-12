import type { FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { language } from './state/store.ts';
import { screen } from './state/nav.ts';
import { Stage } from './ui/Stage.tsx';
import { S0Title } from './ui/screens/S0Title.tsx';
import { S1Room } from './ui/screens/S1Room.tsx';

const BACKGROUNDS = {
  space: '#5A3D8A',
  sweet: '#F5B5C8',
  title: '#3B2A5E',
} as const;

export function App() {
  const current = screen.value;

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

  const background =
    current.id === 'S1' || current.id === 'S2' ? BACKGROUNDS[current.theme] : BACKGROUNDS.title;

  return (
    <Stage background={background}>
      {current.id === 'S0' && <S0Title />}
      {current.id === 'S1' && <S1Room theme={current.theme} />}
      {current.id === 'harness' && Harness && <Harness />}
    </Stage>
  );
}
