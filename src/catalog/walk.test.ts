import { describe, expect, it } from 'vitest';
import { FLOOR_GEOMETRY, HEROINE_BED_Z, HEROINE_GEOMETRY, HEROINE_Z } from './slots.ts';
import {
  clampToFloor,
  companionBoxAt,
  depthScale,
  facingOf,
  followPoint,
  heroineBoxAt,
  homePoints,
  restBox,
  standPointFor,
  WALK_MAX_MS,
  WALK_MIN_MS,
  walkerZ,
  walkMs,
} from './walk.ts';

describe('walking geometry (SPEC §4.3)', () => {
  it('starts both walkers at their catalogue geometry', () => {
    const home = homePoints('space');
    expect(home.heroine).toEqual({ x: HEROINE_GEOMETRY.space.x, y: HEROINE_GEOMETRY.space.y });
    const box = heroineBoxAt('space', home.heroine);
    expect(box.height).toBe(HEROINE_GEOMETRY.space.height);
    expect(box.left + box.width / 2).toBeCloseTo(home.heroine.x);
    expect(box.top + box.height).toBeCloseTo(home.heroine.y);
    expect(box.z).toBe(HEROINE_Z);
    expect(companionBoxAt('sweet', home.companion).z).toBe(41);
  });

  it('keeps a click inside the floor band', () => {
    const f = FLOOR_GEOMETRY.space;
    expect(clampToFloor('space', { x: -50, y: 100 })).toEqual({ x: f.left, y: f.top });
    expect(clampToFloor('space', { x: 5000, y: 5000 })).toEqual({ x: f.right, y: f.bottom });
    expect(clampToFloor('space', { x: 700.4, y: 800.6 })).toEqual({ x: 700, y: 801 });
  });

  it('grows the figure towards the front and shrinks it towards the wall', () => {
    expect(depthScale('space', HEROINE_GEOMETRY.space.y)).toBe(1);
    expect(depthScale('space', 640)).toBeLessThan(1);
    expect(depthScale('space', 935)).toBeGreaterThan(1);
  });

  it('times a walk by distance within bounds, and instantly under reduced motion', () => {
    const a = { x: 0, y: 0 };
    expect(walkMs(a, a, 260)).toBe(0);
    expect(walkMs(a, { x: 10, y: 0 }, 260)).toBe(WALK_MIN_MS);
    expect(walkMs(a, { x: 520, y: 0 }, 260)).toBe(2000);
    expect(walkMs(a, { x: 5000, y: 0 }, 260)).toBe(WALK_MAX_MS);
    expect(walkMs(a, { x: 5000, y: 0 }, 260, true)).toBe(0);
  });

  it('faces the way it walks and keeps facing on a vertical step', () => {
    expect(facingOf({ x: 0, y: 0 }, { x: 100, y: 0 }, -1)).toBe(1);
    expect(facingOf({ x: 100, y: 0 }, { x: 0, y: 0 }, 1)).toBe(-1);
    expect(facingOf({ x: 0, y: 0 }, { x: 3, y: 200 }, -1)).toBe(-1);
  });

  it('stands in front of a bed, and beside other items on the side she comes from', () => {
    const home = homePoints('space').heroine;
    const bed = { left: 1000, top: 560, width: 300, height: 280, z: 50 };
    expect(standPointFor('space', 'BED', bed, home)).toEqual({ x: 1150, y: 858 });
    const poster = { left: 900, top: 100, width: 200, height: 150, z: 12 };
    const fromLeft = standPointFor('space', 'WALL', poster, home);
    expect(fromLeft.y).toBe(FLOOR_GEOMETRY.space.top);
    expect(fromLeft.x).toBeLessThan(poster.left - 100);
    const fromRight = standPointFor('space', 'WALL', poster, { x: 1400, y: 800 });
    expect(fromRight.x).toBeGreaterThan(poster.left + poster.width + 100);
    // At the wall she takes the other side rather than leaving the floor.
    const edge = { left: 1400, top: 300, width: 120, height: 200, z: 20 };
    expect(standPointFor('space', 'LAMP', edge, { x: 1450, y: 700 }).x).toBeLessThan(edge.left);
  });

  it('steps in front of a bed or nook once past its floor line', () => {
    const bed = { bottom: 840, z: 50 };
    const nook = { bottom: 900, z: 52 };
    expect(walkerZ(800, [bed, nook], 'heroine')).toBe(HEROINE_Z);
    expect(walkerZ(850, [bed, nook], 'heroine')).toBe(51);
    expect(walkerZ(850, [bed, nook], 'companion')).toBe(52);
    expect(walkerZ(901, [bed, nook], 'heroine')).toBe(53);
    expect(heroineBoxAt('space', { x: 0, y: 850 }, [bed]).z).toBe(51);
    expect(heroineBoxAt('space', { x: 0, y: 850 }).z).toBe(HEROINE_Z);
  });

  it('rests the head on the pillow over the bed, and the feet inside a nook behind it', () => {
    const bed = { left: 1000, top: 500, width: 400, height: 300, z: 50 };
    const inBed = restBox('space', 'bed', bed, { fx: 0.25, fy: 0.4, rotate: -20 });
    expect(inBed.z).toBe(HEROINE_BED_Z);
    expect(inBed.left + inBed.width / 2).toBeCloseTo(1100);
    expect(inBed.top + inBed.height * 0.17).toBeCloseTo(620);
    const nook = { left: 100, top: 700, width: 300, height: 200, z: 52 };
    const sitting = restBox('sweet', 'sit', nook, { fx: 0.5, fy: 0.4 });
    expect(sitting.z).toBe(HEROINE_Z);
    expect(sitting.left + sitting.width / 2).toBeCloseTo(250);
    expect(sitting.top + sitting.height * 0.56).toBeCloseTo(780);
  });

  it('follows to the free side of the heroine, swapping sides at the wall', () => {
    expect(followPoint('space', { x: 700, y: 800 }, { x: 900, y: 800 })).toEqual({
      x: 890,
      y: 806,
    });
    expect(followPoint('space', { x: 700, y: 800 }, { x: 300, y: 800 })).toEqual({
      x: 510,
      y: 806,
    });
    expect(followPoint('space', { x: 1400, y: 800 }, { x: 1450, y: 800 }).x).toBe(1210);
  });
});
