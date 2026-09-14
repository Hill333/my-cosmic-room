/**
 * Per-room presentation (SPEC §3.4–§3.8, §5.4, D21): the art ids, animation names and icons
 * that differ between the playrooms. Everything keyed by `Theme` that is not slot geometry
 * (`catalog/slots.ts`) or a string (`strings/*.ts`, keyed `<prefix>.<theme>`) lives here, so
 * adding a room means adding one entry.
 */
import type { Activity, Theme } from '../core/types.ts';
import type { CompanionPose } from './components/Companion.tsx';

export interface ThemeUi {
  /** Companion art folder under `<theme>/companion/` (SPEC §3.6). */
  companion: string;
  /**
   * Free-play reactions (SPEC §4.3): the companion's own tap and what it does when the bed is
   * tapped (a CSS class in room.css and the pose art shown meanwhile).
   */
  companionReact: { special: string; bed: string; bedPose: CompanionPose };
  /** Mission entry object (SPEC §3.4): idle and reacting art, and its CSS effect element. */
  entry: { idle: string; react: string; effect: 'smoke' | 'envelope' | 'heart' | 'note' };
  /** Icon in front of the "Play & earn" button. */
  missionIcon: string;
  /** Badge on earned garments in the wardrobe (SPEC §4.4). */
  badge: string;
  /** Icon before the room's name on its title-screen card (SPEC §3.3). */
  cardIcon: string;
  /**
   * Which side of the backdrop the card thumbnail shows (CSS `object-position` x): the
   * empty backdrops are blank in the middle by design, so the card looks at the window or
   * the shelving that makes the room recognisable.
   */
  cardFocus: 'left' | 'right';
  /** S2 mission card art. */
  cardArt: Record<Activity, string>;
  /** The scene behind the mission panel (SPEC §3.6): a set for A, the room for B. */
  scene: Record<Activity, string>;
  /** Activity A preparation tracker icons under `<theme>/sceneA/step/`. */
  steps: readonly [string, string, string, string];
  /** Icon after the finishing verb on the fourth puzzle. */
  finishIcon: Record<Activity, string>;
  /** Activity B journey strip art. */
  journey: { from: string; to: string; vehicle: string };
  /** S5 story reaction (SPEC §3.6): a vehicle that lifts off, or a set that arrives with four pops. */
  celebration: { kind: 'launch'; vehicle: string; flame: string } | { kind: 'arrive'; set: string };
}

export const THEME_UI: Record<Theme, ThemeUi> = {
  space: {
    companion: 'pip',
    companionReact: { special: 'react-spin', bed: 'react-jump', bedPose: 'cheer' },
    entry: {
      idle: 'space/entry/toyRocket',
      react: 'space/entry/toyRocketReaction',
      effect: 'smoke',
    },
    missionIcon: '🚀',
    badge: '🚀',
    cardIcon: '🚀',
    cardFocus: 'right',
    cardArt: { A: 'space/sceneA/rocket', B: 'space/sceneB/rocketParcel' },
    scene: { A: 'space/sceneA/cockpitFrame', B: 'space/room/background' },
    steps: ['fuel', 'hatch', 'lights', 'countdown'],
    finishIcon: { A: '🚀', B: '📦' },
    journey: {
      from: 'space/sceneB/planet',
      to: 'space/sceneB/moon',
      vehicle: 'space/sceneB/rocketParcel',
    },
    celebration: {
      kind: 'launch',
      vehicle: 'space/sceneA/rocket',
      flame: 'space/sceneA/launchFlame',
    },
  },
  sweet: {
    companion: 'mimi',
    companionReact: { special: 'react-stretch', bed: 'react-curl', bedPose: 'idle' },
    entry: {
      idle: 'sweet/entry/toyLetterbox',
      react: 'sweet/entry/toyLetterboxFlag',
      effect: 'envelope',
    },
    missionIcon: '✉️',
    badge: '💗',
    cardIcon: '🌸',
    cardFocus: 'left',
    cardArt: { A: 'sweet/sceneA/teaTable', B: 'sweet/sceneB/balloonParcel' },
    scene: { A: 'sweet/sceneA/kitchenFrame', B: 'sweet/room/background' },
    steps: ['cups', 'cake', 'teapot', 'guests'],
    finishIcon: { A: '🎉', B: '📦' },
    journey: {
      from: 'sweet/sceneB/toyShop',
      to: 'sweet/sceneB/window',
      vehicle: 'sweet/sceneB/balloonParcel',
    },
    celebration: { kind: 'arrive', set: 'sweet/sceneA/teaTable' },
  },
  // Heart Playroom (D21): Lulu the bunny, a heart music box as the way to the missions, the
  // kind-notes post as Activity A and a lovebird's letter delivery as Activity B.
  hearts: {
    companion: 'lulu',
    companionReact: { special: 'react-hop', bed: 'react-curl', bedPose: 'idle' },
    entry: { idle: 'hearts/entry/heartBox', react: 'hearts/entry/heartBoxOpen', effect: 'heart' },
    missionIcon: '💌',
    badge: '💖',
    cardIcon: '💗',
    cardFocus: 'left',
    cardArt: { A: 'hearts/sceneA/postBag', B: 'hearts/sceneB/birdLetter' },
    scene: { A: 'hearts/sceneA/craftFrame', B: 'hearts/room/background' },
    steps: ['note', 'envelope', 'stamp', 'ribbon'],
    finishIcon: { A: '💌', B: '💌' },
    journey: {
      from: 'hearts/sceneB/postOffice',
      to: 'hearts/sceneB/heartHouse',
      vehicle: 'hearts/sceneB/birdLetter',
    },
    celebration: {
      kind: 'launch',
      vehicle: 'hearts/sceneA/heartBalloons',
      flame: 'hearts/sceneA/balloonHearts',
    },
  },
  // K-pop Playroom (D21): Bori the blue tiger cub, a toy microphone as the way to the
  // missions, the concert set-up as Activity A and the tour bus delivery as Activity B.
  kpop: {
    companion: 'bori',
    companionReact: { special: 'react-dance', bed: 'react-jump', bedPose: 'cheer' },
    entry: { idle: 'kpop/entry/toyMic', react: 'kpop/entry/toyMicGlow', effect: 'note' },
    missionIcon: '🎤',
    badge: '🎵',
    cardIcon: '🎤',
    cardFocus: 'right',
    cardArt: { A: 'kpop/sceneA/stage', B: 'kpop/sceneB/tourBus' },
    scene: { A: 'kpop/sceneA/stageFrame', B: 'kpop/room/background' },
    steps: ['lights', 'speaker', 'costume', 'curtain'],
    finishIcon: { A: '🎤', B: '📦' },
    journey: {
      from: 'kpop/sceneB/concertHall',
      to: 'kpop/sceneB/window',
      vehicle: 'kpop/sceneB/tourBus',
    },
    celebration: { kind: 'arrive', set: 'kpop/sceneA/stage' },
  },
};
