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
   * Asset ids in assets/manifest.json (SPEC §15.5). `heroineBack` is the part of a garment
   * drawn behind the body (the rocket backpack's tank), if it has one.
   */
  art: { room?: string; tile: string; heroineLayer?: string; heroineBack?: string };
  reaction?: ItemReaction;
}

export interface Collection {
  id: string;
  theme: 'space' | 'sweet';
  order: number;
  nameKey: string;
}
