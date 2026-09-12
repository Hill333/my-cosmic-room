import type { ItemId, ItemKind, ItemTheme, SlotType } from '../core/types.ts';

export type ItemReaction = 'generic' | 'lamp' | 'bed' | 'entry';

/** Catalogue item (SPEC §11.1). Static data; one module per theme plus shared. */
export interface Item {
  id: ItemId;
  theme: ItemTheme;
  kind: ItemKind;
  /** Decorations only. */
  slot?: SlotType;
  /** Earnable items only: collection id, e.g. 'space.moonSleepover'. */
  collection?: string;
  /** Position inside its collection, or starter order. */
  order: number;
  starter: boolean;
  /** String-table key for the item's name. */
  nameKey: string;
  /**
   * Asset ids in assets/manifest.json (SPEC §15.5). Outfits and hair styles carry a `figure`
   * name: the heroine is one raster figure per outfit × hairstyle (`figureId`, SPEC §4.5).
   * Shoes and extras carry `heroineLayer`, an overlay snapped to a figure anchor.
   */
  art: { room?: string; tile: string; heroineLayer?: string; figure?: string };
  reaction?: ItemReaction;
}

export interface Collection {
  id: string;
  theme: 'space' | 'sweet';
  order: number;
  nameKey: string;
}
