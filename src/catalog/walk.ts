import type { SlotType, Theme } from '../core/types.ts';
import {
  COMPANION_GEOMETRY,
  COMPANION_Z,
  FLOOR_GEOMETRY,
  HEROINE_BED_Z,
  HEROINE_GEOMETRY,
  HEROINE_Z,
  type StageBox,
} from './slots.ts';
import type { RestSpot } from './types.ts';

/**
 * Walking geometry (SPEC §4.3 "walk, bed, sit"): pure functions over stage px, shared by the
 * room renderer, the walk hook and the unit tests. A position is a feet point (bottom centre
 * of the figure); boxes come out of it the way `slotBox` does for the slots.
 */
export interface Point {
  x: number;
  y: number;
}

export type HeroinePose = 'stand' | 'bed' | 'sit';

/** Heroine figure canvas (SPEC §4.5) and companion pose canvas, in asset px. */
export const HEROINE_CANVAS = [600, 900] as const;
export const COMPANION_CANVAS = [400, 480] as const;

/** Walking speeds in stage px per second, and the bounds of one walk. */
export const HEROINE_SPEED = 260;
export const COMPANION_SPEED = 320;
export const WALK_MIN_MS = 350;
export const WALK_MAX_MS = 2200;
/** The companion sets off this long after the heroine and stops this far beside her. */
export const FOLLOW_DELAY_MS = 250;
export const FOLLOW_GAP = 190;
/** Standing up from a bed or a nook takes this long before a walk continues. */
export const STAND_MS = 320;
/** Arrow keys walk the heroine by this much (SPEC §13.1). */
export const KEY_STEP = 160;

/** Fraction of the figure canvas from the top to the centre of the head. */
const HEAD_Y = 0.17;
/** Fraction of the figure canvas from the top to her hips. */
const HIP_Y = 0.56;
/** In bed the figure is drawn a little smaller, so her head fits the pillow. */
const BED_SCALE = 0.88;
/** Sitting figure canvas (SPEC §4.3) and its height relative to the standing figure's. */
export const SIT_CANVAS = [600, 600] as const;
const SIT_SCALE = 0.62;
/** Sleeping head canvas, its height relative to the standing figure's, and its tilt onto the pillow. */
export const SLEEP_CANVAS = [360, 320] as const;
const SLEEP_SCALE = 0.31;
export const SLEEP_ROTATE = -62;

/** Where the heroine and the companion stand on entering the room. */
export function homePoints(theme: Theme): { heroine: Point; companion: Point } {
  const h = HEROINE_GEOMETRY[theme];
  const c = COMPANION_GEOMETRY[theme];
  return { heroine: { x: h.x, y: h.y }, companion: { x: c.x, y: c.y } };
}

/**
 * The figure grows a little towards the front of the room and shrinks towards the wall, so a
 * walk to the back reads as depth; 1 at the home row.
 */
export function depthScale(theme: Theme, y: number): number {
  return 1 + (y - HEROINE_GEOMETRY[theme].y) * 0.0006;
}

export function clampToFloor(theme: Theme, p: Point): Point {
  const f = FLOOR_GEOMETRY[theme];
  return {
    x: Math.min(f.right, Math.max(f.left, Math.round(p.x))),
    y: Math.min(f.bottom, Math.max(f.top, Math.round(p.y))),
  };
}

function boxAt(p: Point, canvas: readonly [number, number], height: number, z: number): StageBox {
  const width = (height * canvas[0]) / canvas[1];
  return { left: p.x - width / 2, top: p.y - height, width, height, z };
}

/** A room layer a walker can step in front of (the bed, the nook): its floor line and z. */
export interface Occluder {
  bottom: number;
  z: number;
}

/**
 * Stacking of a walker whose feet are at `feetY`: behind the beds and nooks by default
 * (SPEC §4.1), in front of each one whose floor line it has passed; the companion goes one
 * above the heroine so it stays in front of her at the same depth.
 */
export function walkerZ(feetY: number, occluders: Occluder[], who: 'heroine' | 'companion') {
  let z = who === 'heroine' ? HEROINE_Z : COMPANION_Z;
  const lift = who === 'heroine' ? 1 : 2;
  for (const o of occluders) if (feetY > o.bottom) z = Math.max(z, o.z + lift);
  return z;
}

/** Stage box of the heroine standing with her feet at `p`. */
export function heroineBoxAt(theme: Theme, p: Point, occluders: Occluder[] = []): StageBox {
  const height = HEROINE_GEOMETRY[theme].height * depthScale(theme, p.y);
  return boxAt(p, HEROINE_CANVAS, height, walkerZ(p.y, occluders, 'heroine'));
}

/** Stage box of the companion with its feet at `p`. */
export function companionBoxAt(theme: Theme, p: Point, occluders: Occluder[] = []): StageBox {
  const height = COMPANION_GEOMETRY[theme].height * depthScale(theme, p.y);
  return boxAt(p, COMPANION_CANVAS, height, walkerZ(p.y, occluders, 'companion'));
}

/**
 * Stage box of the heroine resting on an item (SPEC §4.3). With the pose art (`art`): in bed
 * her sleeping head is centred on the pillow (`rest.fx, fy` of the bed box) over the bed;
 * on a nook the sitting figure sits on top of the cushion with its bottom edge at the rest
 * point. Without it (placeholders): the standing figure with its head centre on the pillow,
 * the CSS masking her below the shoulders; or behind the cushion with her hips at the rest
 * point and her legs masked, so the cushion reads as her seat.
 */
export function restBox(
  theme: Theme,
  pose: 'bed' | 'sit',
  item: StageBox,
  rest: RestSpot,
  art = false,
): StageBox {
  const px = item.left + item.width * rest.fx;
  const py = item.top + item.height * rest.fy;
  const bed = pose === 'bed';
  const base = HEROINE_GEOMETRY[theme].height;
  if (art && bed) {
    const height = base * SLEEP_SCALE;
    const width = (height * SLEEP_CANVAS[0]) / SLEEP_CANVAS[1];
    return { left: px - width / 2, top: py - height / 2, width, height, z: HEROINE_BED_Z };
  }
  if (art) {
    const height = base * SIT_SCALE * depthScale(theme, item.top + item.height);
    const width = (height * SIT_CANVAS[0]) / SIT_CANVAS[1];
    const bottom = item.top + item.height * (rest.sitY ?? rest.fy);
    return { left: px - width / 2, top: bottom - height, width, height, z: item.z + 1 };
  }
  const height = base * (bed ? BED_SCALE : depthScale(theme, item.top + item.height));
  const width = (height * HEROINE_CANVAS[0]) / HEROINE_CANVAS[1];
  return {
    left: px - width / 2,
    top: py - height * (bed ? HEAD_Y : HIP_Y),
    width,
    height,
    z: bed ? HEROINE_BED_Z : HEROINE_Z,
  };
}

/** Duration of a walk between two feet points; 0 when motion is reduced (SPEC §13.3). */
export function walkMs(from: Point, to: Point, speed: number, reduced = false): number {
  if (reduced) return 0;
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  if (d < 1) return 0;
  return Math.round(Math.min(WALK_MAX_MS, Math.max(WALK_MIN_MS, (d / speed) * 1000)));
}

/** Which way a walker faces after moving from `from` to `to`: 1 right, -1 left. */
export function facingOf(from: Point, to: Point, current: 1 | -1): 1 | -1 {
  if (Math.abs(to.x - from.x) < 8) return current;
  return to.x > from.x ? 1 : -1;
}

/** Standing beside an item leaves this much between its box and hers, so it stays clickable. */
const BESIDE_GAP = 20;

/**
 * Where the heroine stands to use a slot item: just in front of a bed or nook (so she draws
 * over it and can get in), and beside anything else, on the side she comes from, so she
 * never covers the item she went to; all clamped to the floor band.
 */
export function standPointFor(theme: Theme, slot: SlotType, item: StageBox, from: Point): Point {
  const bottom = item.top + item.height;
  const centre = item.left + item.width / 2;
  if (slot === 'BED' || slot === 'NOOK') return clampToFloor(theme, { x: centre, y: bottom + 18 });
  const f = FLOOR_GEOMETRY[theme];
  const reach = item.width / 2 + heroineBoxAt(theme, from).width / 2 + BESIDE_GAP;
  const side = from.x <= centre ? -1 : 1;
  let x = centre + side * reach;
  if (x < f.left || x > f.right) x = centre - side * reach;
  return clampToFloor(theme, { x, y: bottom });
}

/**
 * Where the companion waits while the heroine uses an item: just outside the item's box on
 * the side it comes from, so it never sits in front of the bed's pillow or the cushion.
 */
export function besidePoint(theme: Theme, item: StageBox, companion: Point): Point {
  const f = FLOOR_GEOMETRY[theme];
  const gap = companionBoxAt(theme, companion).width / 2 + BESIDE_GAP;
  const centre = item.left + item.width / 2;
  const side = companion.x < centre ? -1 : 1;
  let x = side < 0 ? item.left - gap : item.left + item.width + gap;
  if (x < f.left || x > f.right) x = side < 0 ? item.left + item.width + gap : item.left - gap;
  return clampToFloor(theme, { x, y: item.top + item.height + 10 });
}

/** Where the companion stops when following the heroine to `target`: beside her, on the free side. */
export function followPoint(theme: Theme, target: Point, companion: Point): Point {
  const f = FLOOR_GEOMETRY[theme];
  const side = companion.x >= target.x ? 1 : -1;
  let x = target.x + side * FOLLOW_GAP;
  if (x > f.right || x < f.left) x = target.x - side * FOLLOW_GAP;
  return clampToFloor(theme, { x, y: target.y + 6 });
}
