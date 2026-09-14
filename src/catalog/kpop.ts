import type { Collection, Item } from './types.ts';
import { decoration, garment } from './helpers.ts';

export const kpopCollections: Collection[] = [
  { id: 'kpop.stageLights', theme: 'kpop', order: 0, nameKey: 'collection.kpop.stageLights' },
  { id: 'kpop.fanClub', theme: 'kpop', order: 1, nameKey: 'collection.kpop.fanClub' },
];

/**
 * K-pop Playroom starters (SPEC §4.1) and earnables in pool order (SPEC §11.2, D21):
 * docs/concepts/2026-09-13-new-playrooms/02-kpop-demon-hunters-playroom.png is the direction.
 * The blue tiger of the concept is the room's companion (Bori), not an earnable plush; the
 * magpie is the starter shelf toy.
 */
export const kpopItems: Item[] = [
  decoration('kpop', 'plainBed', 'BED', { starter: true, order: 0, reaction: 'bed' }),
  decoration('kpop', 'plainRug', 'RUG', { starter: true, order: 1 }),
  decoration('kpop', 'plainLamp', 'LAMP', { starter: true, order: 2, reaction: 'lamp' }),
  decoration('kpop', 'notePoster', 'WALL', { starter: true, order: 3 }),
  decoration('kpop', 'magpiePlush', 'SHELF', { starter: true, order: 4 }),
  decoration('kpop', 'starLights', 'HANGING', { starter: true, order: 5 }),
  decoration('kpop', 'purpleCushion', 'NOOK', { starter: true, order: 6 }),
  // Stage Lights.
  decoration('kpop', 'musicLamp', 'LAMP', {
    collection: 'kpop.stageLights',
    order: 0,
    reaction: 'lamp',
  }),
  decoration('kpop', 'karaokeStage', 'NOOK', {
    collection: 'kpop.stageLights',
    order: 1,
    // A low round stage: she sits on top of it, so her feet land higher than on a cushion.
    rest: { fx: 0.5, fy: 0.4, sitY: 0.58 },
  }),
  decoration('kpop', 'starRug', 'RUG', { collection: 'kpop.stageLights', order: 2 }),
  garment('kpop', 'popJacket', 'outfit', { collection: 'kpop.stageLights', order: 3 }),
  garment('kpop', 'starSneakers', 'shoes', { collection: 'kpop.stageLights', order: 4 }),
  garment('kpop', 'headsetMic', 'extra', { collection: 'kpop.stageLights', order: 5 }),
  // Fan Club.
  decoration('kpop', 'starBed', 'BED', { collection: 'kpop.fanClub', order: 0, reaction: 'bed' }),
  decoration('kpop', 'discoBall', 'HANGING', { collection: 'kpop.fanClub', order: 1 }),
  decoration('kpop', 'trioPoster', 'WALL', { collection: 'kpop.fanClub', order: 2 }),
  garment('kpop', 'sparkleDress', 'outfit', { collection: 'kpop.fanClub', order: 3 }),
  garment('kpop', 'glitterBoots', 'shoes', { collection: 'kpop.fanClub', order: 4 }),
  garment('kpop', 'crownClip', 'extra', { collection: 'kpop.fanClub', order: 5 }),
];
