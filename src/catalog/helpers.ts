import type { SlotType, Theme, WardrobeKind } from '../core/types.ts';
import type { Item, ItemReaction } from './types.ts';

interface DecorationOptions {
  order: number;
  starter?: boolean;
  collection?: string;
  reaction?: ItemReaction;
}

interface GarmentOptions {
  order: number;
  starter?: boolean;
  collection?: string;
}

/** Builds a decoration item whose asset ids follow SPEC §15.5 naming. */
export function decoration(theme: Theme, name: string, slot: SlotType, o: DecorationOptions): Item {
  const item: Item = {
    id: `${theme}.${name}`,
    theme,
    kind: 'decoration',
    slot,
    order: o.order,
    starter: o.starter ?? false,
    nameKey: `item.${theme}.${name}`,
    art: { room: `${theme}/decorations/${name}`, tile: `${theme}/tiles/${name}` },
    reaction: o.reaction ?? 'generic',
  };
  if (o.collection) item.collection = o.collection;
  return item;
}

/** Builds an earnable garment. Garments are theme-tagged but wearable in both rooms (D5). */
export function garment(theme: Theme, name: string, kind: WardrobeKind, o: GarmentOptions): Item {
  const item: Item = {
    id: `${theme}.${name}`,
    theme,
    kind,
    order: o.order,
    starter: o.starter ?? false,
    nameKey: `item.${theme}.${name}`,
    art: { tile: `${theme}/tiles/${name}`, heroineLayer: `shared/heroine/${kind}/${name}` },
  };
  if (o.collection) item.collection = o.collection;
  return item;
}
