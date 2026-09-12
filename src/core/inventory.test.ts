import { describe, expect, it } from 'vitest';
import {
  addStar,
  checkInvariants,
  collectedCount,
  grantItem,
  inventoryReducer,
  nextPair,
  placeItem,
  pool,
  wearItem,
} from './inventory.ts';
import { createFreshSave } from './save.ts';

describe('pool and nextPair (SPEC §10.2)', () => {
  it('lists unowned earnables in collection order', () => {
    const s = createFreshSave();
    expect(pool(s, 'space')).toHaveLength(12);
    expect(pool(s, 'space').slice(0, 3)).toEqual([
      'space.moonBed',
      'space.starLamp',
      'space.astroBunny',
    ]);
    expect(pool(s, 'sweet')[0]).toBe('sweet.flowerCushion');
    expect(nextPair(s, 'sweet')).toEqual(['sweet.flowerCushion', 'sweet.floralPyjamas']);
  });
  it('drops granted items from the pool and moves on to the next collection', () => {
    let s = createFreshSave();
    for (const id of ['space.moonBed', 'space.starLamp', 'space.astroBunny'])
      s = grantItem(s, 'space', id);
    expect(nextPair(s, 'space')).toEqual(['space.rainbowRug', 'space.cloudPyjamas']);
  });
});

describe('grant, place and wear (SPEC §10.3, §4.1, §4.4)', () => {
  it('grants decorations to the theme and garments to the shared wardrobe, once', () => {
    let s = createFreshSave();
    s = grantItem(s, 'space', 'space.moonBed');
    s = grantItem(s, 'space', 'space.moonBed');
    s = grantItem(s, 'space', 'space.cloudPyjamas');
    expect(s.themes.space.owned.filter((id) => id === 'space.moonBed')).toHaveLength(1);
    expect(s.wardrobe).toContain('space.cloudPyjamas');
    expect(collectedCount(s, 'space')).toBe(2);
    expect(collectedCount(s, 'sweet')).toBe(0);
    // Wrong theme or unknown ids change nothing.
    expect(grantItem(s, 'sweet', 'space.starLamp')).toBe(s);
    expect(grantItem(s, 'space', 'space.nothing')).toBe(s);
  });
  it('places only owned decorations of the theme and swaps the starter back to the panel', () => {
    let s = createFreshSave();
    expect(placeItem(s, 'space', 'space.moonBed')).toBe(s); // unowned
    s = grantItem(s, 'space', 'space.moonBed');
    s = placeItem(s, 'space', 'space.moonBed');
    expect(s.themes.space.slots.BED).toBe('space.moonBed');
    expect(s.themes.space.owned).toContain('space.plainBed');
    expect(placeItem(s, 'space', 'space.moonBed')).toBe(s); // already placed
    expect(placeItem(s, 'sweet', 'space.moonBed')).toBe(s); // wrong room
    expect(placeItem(s, 'space', 'space.cloudPyjamas')).toBe(s); // not a decoration
    s = placeItem(s, 'space', 'space.plainBed'); // starters can return (AT-25 core part)
    expect(s.themes.space.slots.BED).toBe('space.plainBed');
    expect(checkInvariants(s)).toEqual([]);
  });
  it('wears only owned wardrobe items of the matching kind', () => {
    let s = createFreshSave();
    expect(wearItem(s, 'space.spaceBoots')).toBe(s); // unowned
    s = grantItem(s, 'space', 'space.spaceBoots');
    s = wearItem(s, 'space.spaceBoots');
    expect(s.heroine.shoes).toBe('space.spaceBoots');
    expect(wearItem(s, 'space.spaceBoots')).toBe(s);
    expect(wearItem(s, 'space.plainBed')).toBe(s);
    s = wearItem(s, 'shared.shoesMaryJanes');
    expect(s.heroine.shoes).toBe('shared.shoesMaryJanes');
    s = grantItem(s, 'sweet', 'sweet.bowHeadband');
    s = inventoryReducer(s, { type: 'inventory/wear', item: 'sweet.bowHeadband' });
    expect(s.heroine.extra).toBe('sweet.bowHeadband');
    s = inventoryReducer(s, { type: 'inventory/removeExtra' });
    expect(s.heroine.extra).toBeNull();
    expect(inventoryReducer(s, { type: 'inventory/removeExtra' })).toBe(s);
    expect(checkInvariants(s)).toEqual([]);
  });
  it('reduces place and lamp events', () => {
    let s = grantItem(createFreshSave(), 'sweet', 'sweet.heartLamp');
    s = inventoryReducer(s, { type: 'inventory/place', theme: 'sweet', item: 'sweet.heartLamp' });
    expect(s.themes.sweet.slots.LAMP).toBe('sweet.heartLamp');
    s = inventoryReducer(s, { type: 'inventory/lamp', theme: 'sweet', on: true });
    expect(s.themes.sweet.lampOn).toBe(true);
    expect(s.themes.space.lampOn).toBe(false);
    expect(inventoryReducer(s, { type: 'inventory/lamp', theme: 'sweet', on: true })).toBe(s);
  });
});

describe('stars (SPEC §10.5)', () => {
  it('increase by one per call up to 24', () => {
    let s = createFreshSave();
    for (let i = 0; i < 30; i++) s = addStar(s, 'sweet');
    expect(s.themes.sweet.stars).toBe(24);
    expect(s.themes.space.stars).toBe(0);
    expect(addStar(s, 'sweet')).toBe(s);
  });
});
