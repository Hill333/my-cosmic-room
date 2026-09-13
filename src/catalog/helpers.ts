import type { SlotType, Theme, WardrobeKind } from '../core/types.ts';
import type { Item, ItemReaction, RestSpot } from './types.ts';

interface DecorationOptions {
  order: number;
  starter?: boolean;
  collection?: string;
  reaction?: ItemReaction;
  rest?: RestSpot;
}

/** Default rest spots (SPEC §4.3): a bed's pillow is at its top left, a nook's seat centre. */
const DEFAULT_REST: Partial<Record<SlotType, RestSpot>> = {
  BED: { fx: 0.26, fy: 0.37, rotate: -24 },
  NOOK: { fx: 0.5, fy: 0.47, sitY: 0.64 },
};

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
  const rest = o.rest ?? DEFAULT_REST[slot];
  if (rest) item.rest = rest;
  return item;
}

/**
 * Builds an earnable garment. Garments are theme-tagged but wearable in both rooms (D5).
 * Outfits are part of the figure (`art.figure`); shoes and extras are overlays.
 */
export function garment(theme: Theme, name: string, kind: WardrobeKind, o: GarmentOptions): Item {
  const item: Item = {
    id: `${theme}.${name}`,
    theme,
    kind,
    order: o.order,
    starter: o.starter ?? false,
    nameKey: `item.${theme}.${name}`,
    art:
      kind === 'outfit' || kind === 'hair'
        ? { tile: `${theme}/tiles/${name}`, figure: name }
        : { tile: `${theme}/tiles/${name}`, heroineLayer: `shared/heroine/${kind}/${name}` },
  };
  if (o.collection) item.collection = o.collection;
  return item;
}

/** Manifest id of the heroine figure for an outfit and a hairstyle (SPEC §4.5). */
export function figureId(outfitFigure: string, hairFigure: string): string {
  return `shared/heroine/figure/${outfitFigure}-${hairFigure}`;
}

/** Manifest id of the sitting figure for an outfit and a hairstyle (SPEC §4.3). */
export function sitFigureId(outfitFigure: string, hairFigure: string): string {
  return `shared/heroine/sit/${outfitFigure}-${hairFigure}`;
}

/** Manifest id of the sleeping head for a hairstyle (SPEC §4.3). */
export function sleepHeadId(hairFigure: string): string {
  return `shared/heroine/sleep/${hairFigure}`;
}
