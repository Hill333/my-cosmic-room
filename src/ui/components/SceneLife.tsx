import type { Activity, Theme } from '../../core/types.ts';

/**
 * Decorative life in the scene behind the mission panel (SPEC §3.6): twinkles on the stars
 * the backdrop already draws, a shooting star through the cockpit window, the radar sweep and
 * blinking console lamps in Space; sparkles and pot steam in Sweet; drifting hearts in the
 * Heart room; sparkles and a sweeping stage light in the K-pop room. Everything is CSS,
 * `aria-hidden`, never interactive, and hidden entirely under reduced motion (base.css).
 * Positions are stage px on the 1536 × 1024 backdrop, measured from the art, and all lie
 * outside the panel (x 268–1268, y 80–940). The Heart and K-pop spots are first guesses on
 * placeholder backdrops (D21); measure them again once the scene art lands.
 */

interface Spot {
  x: number;
  y: number;
  /** Size in px (a twinkle's glow diameter, a sparkle's glyph size). */
  s?: number;
  /** Animation delay in seconds so the scene never blinks in unison. */
  d?: number;
}

const TWINKLES: Record<Theme, Record<Activity, Spot[]>> = {
  space: {
    // The cockpit window band above the panel and the two corner stars.
    A: [
      { x: 263, y: 40, s: 56, d: 0 },
      { x: 535, y: 46, s: 64, d: 0.7 },
      { x: 535, y: 152, s: 44, d: 1.4 },
      { x: 849, y: 104, s: 72, d: 0.3 },
      { x: 967, y: 144, s: 36, d: 1.9 },
      { x: 1303, y: 93, s: 44, d: 1.1 },
      { x: 1347, y: 170, s: 40, d: 2.3 },
      { x: 775, y: 148, s: 28, d: 1.6 },
      { x: 1160, y: 60, s: 28, d: 0.9 },
    ],
    // The room's window (right of the panel) and the star on the left wall.
    B: [
      { x: 76, y: 283, s: 60, d: 0.2 },
      { x: 1357, y: 85, s: 48, d: 0 },
      { x: 1348, y: 238, s: 40, d: 1.2 },
      { x: 1443, y: 274, s: 44, d: 0.6 },
      { x: 1402, y: 374, s: 40, d: 1.8 },
      { x: 1500, y: 150, s: 32, d: 2.4 },
    ],
  },
  sweet: { A: [], B: [] },
  hearts: { A: [], B: [] },
  kpop: {
    // String lights above the stage and the city window's stars.
    A: [
      { x: 200, y: 90, s: 44, d: 0 },
      { x: 1330, y: 96, s: 44, d: 0.8 },
      { x: 120, y: 300, s: 36, d: 1.5 },
      { x: 1420, y: 310, s: 36, d: 0.4 },
    ],
    B: [
      { x: 1360, y: 120, s: 44, d: 0 },
      { x: 1450, y: 220, s: 36, d: 1.1 },
      { x: 1390, y: 330, s: 32, d: 0.5 },
    ],
  },
};

const SPARKLES: Record<Theme, Record<Activity, Spot[]>> = {
  space: { A: [], B: [] },
  sweet: {
    // Around the window and plants on the left, the shelves on the right.
    A: [
      { x: 120, y: 150, s: 30, d: 0 },
      { x: 250, y: 260, s: 22, d: 1.1 },
      { x: 60, y: 420, s: 26, d: 0.5 },
      { x: 1320, y: 150, s: 28, d: 0.8 },
      { x: 1470, y: 230, s: 22, d: 1.7 },
      { x: 1380, y: 400, s: 26, d: 0.3 },
      { x: 1500, y: 330, s: 20, d: 2.1 },
    ],
    B: [
      { x: 90, y: 150, s: 30, d: 0 },
      { x: 200, y: 300, s: 22, d: 1.3 },
      { x: 60, y: 430, s: 24, d: 0.6 },
      { x: 1310, y: 120, s: 28, d: 0.9 },
      { x: 1480, y: 200, s: 24, d: 1.6 },
      { x: 1400, y: 350, s: 26, d: 0.2 },
    ],
  },
  hearts: {
    // Around the window and the heart shelving on both sides of the panel.
    A: [
      { x: 110, y: 160, s: 30, d: 0 },
      { x: 230, y: 280, s: 22, d: 1.1 },
      { x: 70, y: 430, s: 26, d: 0.5 },
      { x: 1330, y: 160, s: 28, d: 0.8 },
      { x: 1460, y: 250, s: 22, d: 1.7 },
      { x: 1390, y: 410, s: 26, d: 0.3 },
    ],
    B: [
      { x: 90, y: 150, s: 30, d: 0 },
      { x: 200, y: 300, s: 22, d: 1.3 },
      { x: 1310, y: 120, s: 28, d: 0.9 },
      { x: 1470, y: 210, s: 24, d: 1.6 },
      { x: 1400, y: 360, s: 26, d: 0.2 },
    ],
  },
  kpop: {
    A: [
      { x: 90, y: 500, s: 26, d: 0.2 },
      { x: 1440, y: 520, s: 26, d: 0.9 },
    ],
    B: [
      { x: 110, y: 420, s: 24, d: 0.4 },
      { x: 1480, y: 440, s: 24, d: 1.2 },
    ],
  },
};

/** Console lamps in the cockpit art that blink (Space A); alternate delays make them chase. */
const LAMPS: Spot[] = [
  { x: 81, y: 99, s: 90, d: 0 },
  { x: 1454, y: 98, s: 90, d: 0.9 },
  { x: 238, y: 421, s: 50, d: 0.4 },
  { x: 1296, y: 422, s: 50, d: 1.3 },
  { x: 156, y: 737, s: 60, d: 0.7 },
  { x: 1376, y: 739, s: 60, d: 1.6 },
  { x: 1302, y: 493, s: 50, d: 1.0 },
  { x: 1412, y: 654, s: 64, d: 0.2 },
];

interface Props {
  theme: Theme;
  activity: Activity;
}

export function SceneLife({ theme, activity }: Props) {
  const twinkles = TWINKLES[theme][activity];
  const sparkles = SPARKLES[theme][activity];
  const space = theme === 'space';
  return (
    <div class={`scene-life scene-${theme}-${activity.toLowerCase()}`} aria-hidden="true">
      {twinkles.map((p, i) => (
        <span key={`t${i}`} class="twinkle" style={spot(p)} />
      ))}
      {sparkles.map((p, i) => (
        <span key={`s${i}`} class="sparkle-dot" style={spot(p)} />
      ))}
      {space && activity === 'A' && (
        <>
          {LAMPS.map((p, i) => (
            <span key={`l${i}`} class="lamp-glow" style={spot(p)} />
          ))}
          <span class="radar-sweep" />
          <span class="shooting-star shooting-star-window" />
        </>
      )}
      {space && activity === 'B' && <span class="shooting-star shooting-star-room" />}
      {theme === 'sweet' && activity === 'A' && (
        <span class="steam">
          <i style={{ '--i': 0 }} />
          <i style={{ '--i': 1 }} />
          <i style={{ '--i': 2 }} />
        </span>
      )}
      {theme === 'hearts' && (
        <span class="drift-hearts">
          <i style={{ '--i': 0 }} />
          <i style={{ '--i': 1 }} />
          <i style={{ '--i': 2 }} />
          <i style={{ '--i': 3 }} />
        </span>
      )}
      {theme === 'kpop' && activity === 'A' && <span class="stage-sweep" />}
    </div>
  );
}

function spot({ x, y, s = 40, d = 0 }: Spot) {
  return { '--x': `${x}px`, '--y': `${y}px`, '--s': `${s}px`, '--d': `${d}s` };
}
