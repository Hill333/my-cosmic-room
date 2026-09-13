import type { ItemId, ItemKind, SlotMap, SlotType, Theme } from '../core/types.ts';
import { SLOT_TYPES } from '../core/types.ts';
import { sharedItems } from './shared.ts';
import { spaceCollections, spaceItems } from './space.ts';
import { sweetCollections, sweetItems } from './sweet.ts';
import type { Collection, Item } from './types.ts';
import { figureId, sitFigureId, sleepHeadId } from './helpers.ts';

export type { Collection, Item } from './types.ts';
export { defaultHeroine } from './shared.ts';
export { figureId, sitFigureId, sleepHeadId } from './helpers.ts';

export const allItems: readonly Item[] = [...sharedItems, ...spaceItems, ...sweetItems];
export const allCollections: readonly Collection[] = [...spaceCollections, ...sweetCollections];

const byId = new Map<ItemId, Item>(allItems.map((i) => [i.id, i]));

export function itemById(id: ItemId): Item | undefined {
  return byId.get(id);
}

export function requireItem(id: ItemId): Item {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown catalogue item: ${id}`);
  return item;
}

export function isWardrobeKind(kind: ItemKind): boolean {
  return kind !== 'decoration';
}

/** Manifest id of the figure the heroine shows for an outfit and a hairstyle (SPEC §4.5). */
export function heroineFigure(outfit: ItemId, hair: ItemId): string {
  return figureId(requireItem(outfit).art.figure!, requireItem(hair).art.figure!);
}

/** Sitting figure id for the worn outfit and hairstyle (SPEC §4.3). */
export function heroineSitFigure(outfit: ItemId, hair: ItemId): string {
  return sitFigureId(requireItem(outfit).art.figure!, requireItem(hair).art.figure!);
}

/** Sleeping head id for the worn hairstyle (SPEC §4.3). */
export function heroineSleepHead(hair: ItemId): string {
  return sleepHeadId(requireItem(hair).art.figure!);
}

/** Earnable items of a theme in pool order (collection order, then item order). SPEC §10.2. */
export function earnableItems(theme: Theme): Item[] {
  const collectionOrder = new Map(allCollections.map((c) => [c.id, c.order]));
  return allItems
    .filter((i) => i.theme === theme && !i.starter && i.collection)
    .sort((a, b) => {
      const ca = collectionOrder.get(a.collection!) ?? 0;
      const cb = collectionOrder.get(b.collection!) ?? 0;
      return ca - cb || a.order - b.order;
    });
}

/** Starter decorations of a theme, one per slot (SPEC §4.1). */
export function starterDecorations(theme: Theme): Item[] {
  return allItems.filter((i) => i.theme === theme && i.starter && i.kind === 'decoration');
}

/** Shared wardrobe starters (SPEC §4.4). */
export function starterWardrobe(): Item[] {
  return allItems.filter((i) => i.theme === 'shared' && i.starter);
}

/** Initial slot map of a theme: each slot holds its starter. */
export function starterSlots(theme: Theme): SlotMap {
  const slots = {} as Partial<SlotMap>;
  for (const slot of SLOT_TYPES) {
    const starter = starterDecorations(theme).find((i) => i.slot === slot);
    if (!starter) throw new Error(`No starter for slot ${slot} in theme ${theme}`);
    slots[slot] = starter.id;
  }
  return slots as SlotMap;
}

/** Number of earnable items in a theme; feeds "n / total collected" (SPEC §10.4). */
export function earnableTotal(theme: Theme): number {
  return earnableItems(theme).length;
}

export function slotOf(id: ItemId): SlotType | undefined {
  return byId.get(id)?.slot;
}
