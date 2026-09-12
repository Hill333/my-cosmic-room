/**
 * Sound effects (SPEC §13.3, §15.4): about ten short clips, off with the one persisted toggle
 * (`settings.sound`), and silent until the first user gesture because browsers refuse to
 * start audio before one. Everything here is UI; `core/` never touches audio.
 *
 * `play(name)` is safe to call anywhere: it is a no-op before the first gesture, while the
 * toggle is off, and in environments without `Audio` (tests). Each clip is an
 * `HTMLAudioElement` created on first use; a clip that is still playing restarts.
 */
import { assetUrl } from '../assets.ts';
import { soundOn } from '../state/store.ts';

export type SoundName =
  | 'tap'
  | 'place'
  | 'wear'
  | 'correct'
  | 'wrong'
  | 'hint'
  | 'next'
  | 'fanfare'
  | 'jingleSpace'
  | 'jingleSweet'
  | 'star';

const ASSET: Record<SoundName, string> = {
  tap: 'shared/sound/tap',
  place: 'shared/sound/place',
  wear: 'shared/sound/wear',
  correct: 'shared/sound/correct',
  wrong: 'shared/sound/wrong',
  hint: 'shared/sound/hint',
  next: 'shared/sound/next',
  fanfare: 'shared/sound/fanfare',
  jingleSpace: 'space/sound/jingle',
  jingleSweet: 'sweet/sound/jingle',
  star: 'shared/sound/star',
};

/** Playback gain per clip; the wrong-answer sound stays soft (SPEC §15.4 "wrong (soft)"). */
const GAIN: Partial<Record<SoundName, number>> = { wrong: 0.5, tap: 0.6, fanfare: 0.85 };

let unlocked = false;
const clips = new Map<SoundName, HTMLAudioElement>();

function unlock(): void {
  unlocked = true;
  document.removeEventListener('pointerdown', unlock, true);
  document.removeEventListener('keydown', unlock, true);
  // Warm the short clips so the first tap has no fetch in front of it.
  if (soundOn.value)
    for (const name of ['tap', 'place', 'wear', 'correct', 'wrong'] as const) clip(name);
}

/**
 * Buttons that tap when activated (SPEC §15.4 "tap"); controls with their own sound (answers,
 * tiles, Hint, Next, Check, the S5 prize buttons) carry `data-sound="none"` or another class.
 */
const TAP_SELECTOR =
  '.btn, .chip, .icon-btn, .room-card, .tab, .radio-row, .switch, .panel-close, .entry-object';

function onClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  const button = target?.closest?.('button');
  if (!button || button.disabled || !button.matches(TAP_SELECTOR)) return;
  if (button.closest('[data-sound="none"]')) return;
  play('tap');
}

/** Arms the first-gesture gate and the generic tap; called once from `main.tsx`. */
export function initSound(): void {
  if (typeof document === 'undefined' || typeof Audio === 'undefined') return;
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('click', onClick);
}

function clip(name: SoundName): HTMLAudioElement {
  let audio = clips.get(name);
  if (!audio) {
    audio = new Audio(assetUrl(ASSET[name]));
    audio.preload = 'auto';
    audio.volume = GAIN[name] ?? 0.7;
    clips.set(name, audio);
  }
  return audio;
}

/** Plays a clip if sound is on and a user gesture has happened; never throws. */
export function play(name: SoundName): void {
  if (!unlocked || !soundOn.value || typeof Audio === 'undefined') return;
  try {
    const audio = clip(name);
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    // Autoplay refused or the clip failed to load: sound is decorative.
  }
}

/** The theme's launch / tea-party jingle (SPEC §15.4). */
export function playJingle(theme: 'space' | 'sweet'): void {
  play(theme === 'space' ? 'jingleSpace' : 'jingleSweet');
}

/** True once a user gesture has unlocked audio (exposed for the development harness). */
export function soundUnlocked(): boolean {
  return unlocked;
}
