import { useEffect } from 'preact/hooks';
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

  const background =
    current.id === 'S1' || current.id === 'S2' ? BACKGROUNDS[current.theme] : BACKGROUNDS.title;

  return (
    <Stage background={background}>
      {current.id === 'S0' && <S0Title />}
      {current.id === 'S1' && <S1Room theme={current.theme} />}
    </Stage>
  );
}
