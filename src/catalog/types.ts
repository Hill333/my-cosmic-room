import type { ItemId, ItemKind, ItemTheme, SlotType, Theme } from '../core/types.ts';

export type ItemReaction = 'generic' | 'lamp' | 'bed' | 'entry';

/**
 * Where the heroine rests on a bed or a nook item (SPEC §4.3 "walk, bed, sit"), as fractions
 * of the item's room box: on a bed `fx, fy` is where the centre of her head lands on the
 * pillow and `rotate` how far she leans back (degrees, negative = head to the left); on a
 * nook it is where her feet land, so the cushion in front hides her legs.
 */
export interface RestSpot {
  fx: number;
  fy: number;
  /** Bed, without the sleeping-head art: tilt of the masked standing figure. */
  rotate?: number;
  /** Nook, with the sitting art: where the sitting figure's bottom edge lands (defaults to `fy`). */
  sitY?: number;
}

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
  /** Beds and nooks: where the heroine lies or sits (SPEC §4.3). */
  rest?: RestSpot;
}

export interface Collection {
  id: string;
  theme: Theme;
  order: number;
  nameKey: string;
}
