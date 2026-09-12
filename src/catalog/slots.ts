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

/** Where the heroine's feet land (bottom centre of the 600 × 900 canvas) and her stage height. */
export const HEROINE_GEOMETRY: Record<Theme, { x: number; y: number; height: number }> = {
  space: { x: 470, y: 850, height: 420 },
  sweet: { x: 470, y: 850, height: 420 },
};

/** Companion feet (bottom centre of the 400 × 480 pose) and stage height. */
export const COMPANION_GEOMETRY: Record<Theme, { x: number; y: number; height: number }> = {
  space: { x: 665, y: 858, height: 230 },
  sweet: { x: 665, y: 858, height: 230 },
};

/** Mission entry object (toy rocket / letterbox): bottom centre and stage height. */
export const ENTRY_GEOMETRY: Record<Theme, { x: number; y: number; height: number }> = {
  space: { x: 1420, y: 880, height: 240 },
  sweet: { x: 1420, y: 880, height: 210 },
};

export const SLOT_GEOMETRY: Record<Theme, Record<SlotType, SlotGeometry>> = {
  space: {
    BED: { x: 1200, y: 840, scale: 1.35, z: 50 },
    RUG: { x: 560, y: 800, scale: 1.2, z: 10 },
    LAMP: { x: 1138, y: 508, scale: 0.85, z: 20 },
    WALL: { x: 1080, y: 168, scale: 0.9, z: 12 },
    SHELF: { x: 1100, y: 292, scale: 0.8, z: 21 },
    HANGING: { x: 880, y: 92, scale: 1.1, z: 22 },
    NOOK: { x: 215, y: 885, scale: 1.25, z: 52 },
  },
  sweet: {
    BED: { x: 1200, y: 840, scale: 1.35, z: 50 },
    RUG: { x: 560, y: 800, scale: 1.2, z: 10 },
    LAMP: { x: 1138, y: 508, scale: 0.85, z: 20 },
    WALL: { x: 1080, y: 168, scale: 0.9, z: 12 },
    SHELF: { x: 1100, y: 292, scale: 0.8, z: 21 },
    HANGING: { x: 880, y: 92, scale: 1.1, z: 22 },
    NOOK: { x: 215, y: 885, scale: 1.25, z: 52 },
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
