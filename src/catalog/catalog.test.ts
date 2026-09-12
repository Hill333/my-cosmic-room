import { describe, expect, it } from 'vitest';
import { SLOT_TYPES } from '../core/types.ts';
import {
  allCollections,
  allItems,
  defaultHeroine,
  earnableItems,
  earnableTotal,
  itemById,
  starterDecorations,
  starterSlots,
  starterWardrobe,
} from './index.ts';

describe('catalogue shape (SPEC §4.1, §4.4, §11.2)', () => {
  it('has unique ids', () => {
    const ids = allItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has 12 earnable items per theme in two collections of six, three decorations each', () => {
    for (const theme of ['space', 'sweet'] as const) {
      const pool = earnableItems(theme);
      expect(pool).toHaveLength(12);
      expect(earnableTotal(theme)).toBe(12);
      const collections = allCollections.filter((c) => c.theme === theme);
      expect(collections).toHaveLength(2);
      for (const c of collections) {
        const members = pool.filter((i) => i.collection === c.id);
        expect(members).toHaveLength(6);
        expect(members.filter((i) => i.kind === 'decoration')).toHaveLength(3);
        expect(members.map((i) => i.order)).toEqual([0, 1, 2, 3, 4, 5]);
      }
    }
  });

  it('starts each Space pool with Moon bed then Star lamp; first dress-up is Cloud pyjamas', () => {
    const pool = earnableItems('space').map((i) => i.id);
    expect(pool.slice(0, 2)).toEqual(['space.moonBed', 'space.starLamp']);
    expect(pool.find((id) => itemById(id)?.kind !== 'decoration')).toBe('space.cloudPyjamas');
  });

  it('has exactly one starter per slot in each room', () => {
    for (const theme of ['space', 'sweet'] as const) {
      const starters = starterDecorations(theme);
      expect(starters).toHaveLength(7);
      const slots = starterSlots(theme);
      for (const slot of SLOT_TYPES) {
        expect(itemById(slots[slot])?.slot).toBe(slot);
        expect(itemById(slots[slot])?.theme).toBe(theme);
      }
    }
  });

  it('decorations carry a slot and every earnable slot type has a starter to swap with', () => {
    for (const item of allItems) {
      if (item.kind === 'decoration') {
        expect(item.slot).toBeDefined();
        expect(item.art.room).toBeDefined();
      } else if (item.kind === 'outfit' || item.kind === 'hair') {
        expect(item.slot).toBeUndefined();
        expect(item.art.figure).toBeTruthy();
        expect(item.art.heroineLayer).toBeUndefined();
      } else {
        expect(item.slot).toBeUndefined();
        expect(item.art.heroineLayer).toBeDefined();
        expect(item.art.figure).toBeUndefined();
      }
      expect(item.art.tile).toBeTruthy();
    }
  });

  it('has the shared starter wardrobe: 3 hair, 3 outfits, 2 shoes, 0 extras', () => {
    const w = starterWardrobe();
    expect(w.filter((i) => i.kind === 'hair')).toHaveLength(3);
    expect(w.filter((i) => i.kind === 'outfit')).toHaveLength(3);
    expect(w.filter((i) => i.kind === 'shoes')).toHaveLength(2);
    expect(w.filter((i) => i.kind === 'extra')).toHaveLength(0);
    expect(itemById(defaultHeroine.hair)?.kind).toBe('hair');
    expect(itemById(defaultHeroine.outfit)?.kind).toBe('outfit');
    expect(itemById(defaultHeroine.shoes)?.kind).toBe('shoes');
  });
});
