import type { Collection, Item } from './types.ts';
import { decoration, garment } from './helpers.ts';

export const spaceCollections: Collection[] = [
  {
    id: 'space.moonSleepover',
    theme: 'space',
    order: 0,
    nameKey: 'collection.space.moonSleepover',
  },
  {
    id: 'space.rainbowExplorer',
    theme: 'space',
    order: 1,
    nameKey: 'collection.space.rainbowExplorer',
  },
];

/** Space Playroom starters (SPEC §4.1) and earnables in pool order (SPEC §11.2). */
export const spaceItems: Item[] = [
  // Starters, one per slot, in slot order.
  decoration('space', 'plainBed', 'BED', { starter: true, order: 0, reaction: 'bed' }),
  decoration('space', 'plainRug', 'RUG', { starter: true, order: 1 }),
  decoration('space', 'plainLamp', 'LAMP', { starter: true, order: 2, reaction: 'lamp' }),
  decoration('space', 'rocketPoster', 'WALL', { starter: true, order: 3 }),
  decoration('space', 'astronautFigure', 'SHELF', { starter: true, order: 4 }),
  decoration('space', 'paperStars', 'HANGING', { starter: true, order: 5 }),
  decoration('space', 'purpleBeanbag', 'NOOK', { starter: true, order: 6 }),
  // Moon Sleepover.
  decoration('space', 'moonBed', 'BED', {
    collection: 'space.moonSleepover',
    order: 0,
    reaction: 'bed',
  }),
  decoration('space', 'starLamp', 'LAMP', {
    collection: 'space.moonSleepover',
    order: 1,
    reaction: 'lamp',
  }),
  decoration('space', 'astroBunny', 'SHELF', { collection: 'space.moonSleepover', order: 2 }),
  garment('space', 'cloudPyjamas', 'outfit', { collection: 'space.moonSleepover', order: 3 }),
  garment('space', 'bunnySlippers', 'shoes', { collection: 'space.moonSleepover', order: 4 }),
  garment('space', 'starClip', 'extra', { collection: 'space.moonSleepover', order: 5 }),
  // Rainbow Explorer.
  decoration('space', 'rainbowRug', 'RUG', { collection: 'space.rainbowExplorer', order: 0 }),
  decoration('space', 'planetMobile', 'HANGING', { collection: 'space.rainbowExplorer', order: 1 }),
  decoration('space', 'galaxyPoster', 'WALL', { collection: 'space.rainbowExplorer', order: 2 }),
  garment('space', 'spacesuit', 'outfit', { collection: 'space.rainbowExplorer', order: 3 }),
  garment('space', 'spaceBoots', 'shoes', { collection: 'space.rainbowExplorer', order: 4 }),
  garment('space', 'rocketBackpack', 'extra', { collection: 'space.rainbowExplorer', order: 5 }),
];
