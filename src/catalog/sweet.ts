import type { Collection, Item } from './types.ts';
import { decoration, garment } from './helpers.ts';

export const sweetCollections: Collection[] = [
  {
    id: 'sweet.sweetSleepover',
    theme: 'sweet',
    order: 0,
    nameKey: 'collection.sweet.sweetSleepover',
  },
  { id: 'sweet.sunnyGarden', theme: 'sweet', order: 1, nameKey: 'collection.sweet.sunnyGarden' },
];

/** Sweet Playroom starters (SPEC §4.1) and earnables in pool order (SPEC §11.2). */
export const sweetItems: Item[] = [
  decoration('sweet', 'plainBed', 'BED', { starter: true, order: 0, reaction: 'bed' }),
  decoration('sweet', 'plainRug', 'RUG', { starter: true, order: 1 }),
  decoration('sweet', 'plainLamp', 'LAMP', { starter: true, order: 2, reaction: 'lamp' }),
  decoration('sweet', 'tulipPicture', 'WALL', { starter: true, order: 3 }),
  decoration('sweet', 'bunnyPlush', 'SHELF', { starter: true, order: 4 }),
  decoration('sweet', 'bunting', 'HANGING', { starter: true, order: 5 }),
  decoration('sweet', 'yellowCushion', 'NOOK', { starter: true, order: 6 }),
  // Sweet Sleepover.
  decoration('sweet', 'flowerCushion', 'NOOK', { collection: 'sweet.sweetSleepover', order: 0 }),
  decoration('sweet', 'pastelRug', 'RUG', { collection: 'sweet.sweetSleepover', order: 1 }),
  decoration('sweet', 'heartLamp', 'LAMP', {
    collection: 'sweet.sweetSleepover',
    order: 2,
    reaction: 'lamp',
  }),
  garment('sweet', 'floralPyjamas', 'outfit', { collection: 'sweet.sweetSleepover', order: 3 }),
  garment('sweet', 'catSlippers', 'shoes', { collection: 'sweet.sweetSleepover', order: 4 }),
  garment('sweet', 'flowerClip', 'extra', { collection: 'sweet.sweetSleepover', order: 5 }),
  // Sunny Garden.
  decoration('sweet', 'daisyBed', 'BED', {
    collection: 'sweet.sunnyGarden',
    order: 0,
    reaction: 'bed',
    // The daisy headboard sits high: her head goes a little lower, clear of the petals.
    rest: { fx: 0.3, fy: 0.47, rotate: -24 },
  }),
  decoration('sweet', 'butterflyMobile', 'HANGING', { collection: 'sweet.sunnyGarden', order: 1 }),
  decoration('sweet', 'sunPoster', 'WALL', { collection: 'sweet.sunnyGarden', order: 2 }),
  garment('sweet', 'strawberryDress', 'outfit', { collection: 'sweet.sunnyGarden', order: 3 }),
  garment('sweet', 'rainbowSandals', 'shoes', { collection: 'sweet.sunnyGarden', order: 4 }),
  garment('sweet', 'bowHeadband', 'extra', { collection: 'sweet.sunnyGarden', order: 5 }),
];
