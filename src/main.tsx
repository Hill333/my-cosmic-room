import { render } from 'preact';
import { App } from './App.tsx';
import './styles/fonts.css';
import './styles/base.css';
import './styles/mission.css';
import './styles/room.css';
import './styles/parent.css';

render(<App />, document.getElementById('app')!);
