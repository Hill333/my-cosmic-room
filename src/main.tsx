import { render } from 'preact';
import { App } from './App.tsx';
import { initSound } from './ui/sound.ts';
import './styles/fonts.css';
import './styles/base.css';
import './styles/mission.css';
import './styles/room.css';
import './styles/parent.css';

initSound();
render(<App />, document.getElementById('app')!);
