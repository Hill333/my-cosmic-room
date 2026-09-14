import type { Collection, Item } from './types.ts';
import { decoration, garment } from './helpers.ts';

export const heartsCollections: Collection[] = [
  { id: 'hearts.cosyHearts', theme: 'hearts', order: 0, nameKey: 'collection.hearts.cosyHearts' },
  { id: 'hearts.kindNotes', theme: 'hearts', order: 1, nameKey: 'collection.hearts.kindNotes' },
];

/**
 * Heart Playroom starters (SPEC §4.1) and earnables in pool order (SPEC §11.2, D21):
 * docs/concepts/2026-09-13-new-playrooms/01-heart-playroom.png is the direction.
 */
export const heartsItems: Item[] = [
  decoration('hearts', 'plainBed', 'BED', { starter: true, order: 0, reaction: 'bed' }),
  decoration('hearts', 'plainRug', 'RUG', { starter: true, order: 1 }),
  decoration('hearts', 'plainLamp', 'LAMP', { starter: true, order: 2, reaction: 'lamp' }),
  decoration('hearts', 'heartDrawing', 'WALL', { starter: true, order: 3 }),
  decoration('hearts', 'heartBunny', 'SHELF', { starter: true, order: 4 }),
  decoration('hearts', 'paperHearts', 'HANGING', { starter: true, order: 5 }),
  decoration('hearts', 'pinkCushion', 'NOOK', { starter: true, order: 6 }),
  // Cosy Hearts.
  decoration('hearts', 'heartBeanbag', 'NOOK', { collection: 'hearts.cosyHearts', order: 0 }),
  decoration('hearts', 'heartRug', 'RUG', { collection: 'hearts.cosyHearts', order: 1 }),
  decoration('hearts', 'glowHeartLamp', 'LAMP', {
    collection: 'hearts.cosyHearts',
    order: 2,
    reaction: 'lamp',
  }),
  garment('hearts', 'heartCardigan', 'outfit', { collection: 'hearts.cosyHearts', order: 3 }),
  garment('hearts', 'heartSneakers', 'shoes', { collection: 'hearts.cosyHearts', order: 4 }),
  garment('hearts', 'heartClip', 'extra', { collection: 'hearts.cosyHearts', order: 5 }),
  // Kind Notes.
  decoration('hearts', 'heartBed', 'BED', {
    collection: 'hearts.kindNotes',
    order: 0,
    reaction: 'bed',
  }),
  decoration('hearts', 'heartGarland', 'HANGING', { collection: 'hearts.kindNotes', order: 1 }),
  decoration('hearts', 'kindNotePoster', 'WALL', { collection: 'hearts.kindNotes', order: 2 }),
  garment('hearts', 'rosePyjamas', 'outfit', { collection: 'hearts.kindNotes', order: 3 }),
  garment('hearts', 'heartSlippers', 'shoes', { collection: 'hearts.kindNotes', order: 4 }),
  garment('hearts', 'heartHeadband', 'extra', { collection: 'hearts.kindNotes', order: 5 }),
];
