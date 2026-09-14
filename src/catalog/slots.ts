import type { SlotType, Theme } from '../core/types.ts';

/**
 * Slot geometry (SPEC §4.1): anchor point, scale and z-order per slot and per theme.
 * Anchors are stage px (1536 × 1024). The manifest entry's `pivot` lands on the anchor, so a
 * bed sits on the floor by its bottom centre and a mobile hangs from its top centre. Values
 * are tuned with the `?debug=slots` overlay (SPEC §16.4); nothing here is fixed by the spec.
 */
export interface SlotGeometry {
  /** Where the asset's pivot lands, in stage px. */
  x: number;
  y: number;
  /** Multiplier on the asset's stage size (asset px ÷ 2, SPEC §15.2). */
  scale: number;
  /** Stacking order inside the room; see HEROINE_Z and COMPANION_Z. */
  z: number;
}

/** Heroine and companion sit in front of RUG and behind BED and NOOK (SPEC §4.1). */
export const HEROINE_Z = 40;
export const COMPANION_Z = 41;
/** In bed (SPEC §4.3) her head and shoulders show above the blanket, so she draws over the bed. */
export const HEROINE_BED_Z = 51;

/**
 * The floor band the heroine and companion can walk on (SPEC §4.3): limits for the feet
 * point in stage px, inside the painted floor and clear of the bottom buttons.
 */
export const FLOOR_GEOMETRY: Record<
  Theme,
  { left: number; right: number; top: number; bottom: number }
> = {
  space: { left: 110, right: 1460, top: 640, bottom: 935 },
  sweet: { left: 110, right: 1460, top: 640, bottom: 935 },
  hearts: { left: 110, right: 1460, top: 640, bottom: 935 },
  kpop: { left: 110, right: 1460, top: 640, bottom: 935 },
};

/** Where the heroine's feet land (bottom centre of the 600 × 900 canvas) and her stage height. */
export const HEROINE_GEOMETRY: Record<Theme, { x: number; y: number; height: number }> = {
  space: { x: 470, y: 856, height: 450 },
  sweet: { x: 470, y: 856, height: 450 },
  hearts: { x: 470, y: 856, height: 450 },
  // K-pop: the standing group starts further right, clear of the rail's shelf toy.
  kpop: { x: 600, y: 856, height: 450 },
};

/** Companion feet (bottom centre of the 400 × 480 pose) and stage height. */
export const COMPANION_GEOMETRY: Record<Theme, { x: number; y: number; height: number }> = {
  space: { x: 665, y: 858, height: 230 },
  sweet: { x: 665, y: 858, height: 230 },
  hearts: { x: 665, y: 858, height: 230 },
  kpop: { x: 795, y: 858, height: 230 },
};

/** Mission entry object (toy rocket / letterbox / heart box / toy mic): bottom centre and stage height. */
export const ENTRY_GEOMETRY: Record<Theme, { x: number; y: number; height: number }> = {
  space: { x: 1420, y: 880, height: 240 },
  sweet: { x: 1462, y: 900, height: 200 },
  hearts: { x: 1462, y: 905, height: 200 },
  kpop: { x: 1480, y: 925, height: 240 },
};

/** Star chart poster (SPEC §10.5): a small fixed poster, top-left corner and stage width (3:2). */
export const STAR_CHART_GEOMETRY: Record<Theme, { x: number; y: number; width: number }> = {
  space: { x: 430, y: 130, width: 172 },
  sweet: { x: 330, y: 150, width: 148 },
  hearts: { x: 400, y: 120, width: 148 },
  kpop: { x: 520, y: 90, width: 172 },
};

export const SLOT_GEOMETRY: Record<Theme, Record<SlotType, SlotGeometry>> = {
  // Space (M3b backdrop, docs/concepts/01-room-and-wardrobe.png): the lamp stands on the
  // painted nightstand under the arched window, the shelf toy on top of the low bookshelf at
  // the left, the poster on the blank wall left of the window, the beanbag in front of the
  // bookshelf; the wall centre stays clear for the hanging (SPEC §15.2 item 4).
  space: {
    BED: { x: 1200, y: 840, scale: 1.35, z: 50 },
    RUG: { x: 560, y: 800, scale: 1.2, z: 10 },
    LAMP: { x: 1105, y: 482, scale: 0.85, z: 20 },
    WALL: { x: 960, y: 180, scale: 0.9, z: 12 },
    SHELF: { x: 280, y: 400, scale: 0.8, z: 21 },
    HANGING: { x: 700, y: 40, scale: 1.1, z: 22 },
    NOOK: { x: 250, y: 900, scale: 1.25, z: 52 },
  },
  // Sweet (M3b backdrop, docs/concepts/early-playroom.png): the lamp stands on the painted
  // mint cabinet under the window, the shelf toy on an empty shelf of the tall unit at the
  // left, the poster on the blank wall, the bunting across the ceiling left of the window,
  // the bed in front of the window wall, the cushion in front of the shelf unit.
  sweet: {
    BED: { x: 1080, y: 890, scale: 1.25, z: 50 },
    RUG: { x: 560, y: 800, scale: 1.2, z: 10 },
    LAMP: { x: 1440, y: 468, scale: 0.85, z: 20 },
    WALL: { x: 900, y: 330, scale: 0.9, z: 12 },
    SHELF: { x: 140, y: 500, scale: 0.75, z: 21 },
    HANGING: { x: 640, y: 44, scale: 1, z: 22 },
    NOOK: { x: 300, y: 900, scale: 1.25, z: 52 },
  },
  // Hearts (D21 backdrop from docs/concepts/2026-09-13-new-playrooms/01-heart-playroom.png):
  // the shelf toy on the free half of the heart shelf's middle board, the lamp on the heart
  // cabinet under the window (left of the trailing plant), the poster on the blank wall, the
  // hanging from the ceiling left of centre, the bed in front of the cabinet, the cushion in
  // front of the craft desk.
  hearts: {
    BED: { x: 1080, y: 890, scale: 1.25, z: 50 },
    RUG: { x: 560, y: 800, scale: 1.2, z: 10 },
    LAMP: { x: 1380, y: 452, scale: 0.85, z: 20 },
    WALL: { x: 760, y: 300, scale: 0.9, z: 12 },
    SHELF: { x: 230, y: 298, scale: 0.75, z: 21 },
    HANGING: { x: 640, y: 44, scale: 1, z: 22 },
    NOOK: { x: 300, y: 900, scale: 1.25, z: 52 },
  },
  // K-pop (D21 backdrop from 02-kpop-demon-hunters-playroom.png): the shelf toy on the
  // empty lower board of the clothes rail (the shelf unit is full of albums), the lamp on
  // the nightstand under the window, the poster on the blank wall, the hanging from the
  // ceiling centre, the bed in front of the window wall, the cushion in front of the shelf unit.
  kpop: {
    BED: { x: 1180, y: 850, scale: 1.35, z: 50 },
    RUG: { x: 690, y: 800, scale: 1.2, z: 10 },
    LAMP: { x: 1410, y: 492, scale: 0.85, z: 20 },
    WALL: { x: 700, y: 370, scale: 0.9, z: 12 },
    SHELF: { x: 410, y: 542, scale: 0.75, z: 21 },
    HANGING: { x: 900, y: 40, scale: 1.1, z: 22 },
    NOOK: { x: 250, y: 900, scale: 1.25, z: 52 },
  },
};

export interface StageBox {
  left: number;
  top: number;
  width: number;
  height: number;
  z: number;
}

/**
 * Stage box of an asset of `size` px (at 2×) with `pivot` placed on the slot's anchor.
 * Pure geometry, shared by the room renderer and the debug overlay.
 */
export function slotBox(
  geometry: SlotGeometry,
  size: readonly [number, number],
  pivot: readonly [number, number] | undefined,
): StageBox {
  const k = geometry.scale / 2;
  const [w, h] = size;
  const [px, py] = pivot ?? [w / 2, h];
  return {
    left: geometry.x - px * k,
    top: geometry.y - py * k,
    width: w * k,
    height: h * k,
    z: geometry.z,
  };
}
