/**
 * Inventory rules (SPEC §10.2–§10.5, §11.4): prize pairs, granting, placing, wearing,
 * counters, stars and the invariant checker. Pure; every change returns a new Save.
 */
import { earnableItems, itemById, isWardrobeKind } from '../catalog/index.ts';
import type { ItemId, Save, Theme, WardrobeKind } from './types.ts';
import { SLOT_TYPES } from './types.ts';

export const MAX_STARS = 24;

export type InventoryEvent =
  | { type: 'inventory/place'; theme: Theme; item: ItemId }
  | { type: 'inventory/wear'; item: ItemId }
  | { type: 'inventory/removeExtra' }
  | { type: 'inventory/lamp'; theme: Theme; on: boolean };

export function inventoryReducer(save: Save, event: InventoryEvent): Save {
  switch (event.type) {
    case 'inventory/place':
      return placeItem(save, event.theme, event.item);
    case 'inventory/wear':
      return wearItem(save, event.item);
    case 'inventory/removeExtra':
      return save.heroine.extra === null
        ? save
        : { ...save, heroine: { ...save.heroine, extra: null } };
    case 'inventory/lamp': {
      const state = save.themes[event.theme];
      if (state.lampOn === event.on) return save;
      return { ...save, themes: { ...save.themes, [event.theme]: { ...state, lampOn: event.on } } };
    }
  }
}

/** Every owned id of a theme: its decorations plus the shared wardrobe. */
export function ownedIds(save: Save, theme: Theme): Set<ItemId> {
  return new Set(save.themes[theme].owned.concat(save.wardrobe));
}

/** Unowned earnable items of a theme in pool order (SPEC §19.3 "pool"). */
export function pool(save: Save, theme: Theme): ItemId[] {
  const owned = ownedIds(save, theme);
  return earnableItems(theme)
    .map((i) => i.id)
    .filter((id) => !owned.has(id));
}

/**
 * Next prize pair (SPEC §10.2): the first unowned decoration and the first unowned dress-up
 * item; when one kind is exhausted, the first two items of the pool (2, 1 or 0 items).
 */
export function nextPair(save: Save, theme: Theme): ItemId[] {
  const ids = pool(save, theme);
  const deco = ids.find((id) => itemById(id)?.kind === 'decoration');
  const dress = ids.find((id) => {
    const kind = itemById(id)?.kind;
    return kind === 'outfit' || kind === 'shoes' || kind === 'extra';
  });
  if (deco && dress) return [deco, dress];
  return ids.slice(0, 2);
}

/** Adds an item to the theme's owned list or to the shared wardrobe. No-op when owned. */
export function grantItem(save: Save, theme: Theme, id: ItemId): Save {
  const item = itemById(id);
  if (!item || item.theme !== theme) return save;
  if (item.kind === 'decoration') {
    const state = save.themes[theme];
    if (state.owned.includes(id)) return save;
    return {
      ...save,
      themes: { ...save.themes, [theme]: { ...state, owned: [...state.owned, id] } },
    };
  }
  if (save.wardrobe.includes(id)) return save;
  return { ...save, wardrobe: [...save.wardrobe, id] };
}

/**
 * Places an owned decoration of the theme into the slot of its type (SPEC §4.1, §10.3).
 * The previous occupant simply stays owned. Returns the save unchanged when not allowed.
 */
export function placeItem(save: Save, theme: Theme, id: ItemId): Save {
  const item = itemById(id);
  const state = save.themes[theme];
  if (!item || item.kind !== 'decoration' || !item.slot || item.theme !== theme) return save;
  if (!state.owned.includes(id)) return save;
  if (state.slots[item.slot] === id) return save;
  return {
    ...save,
    themes: {
      ...save.themes,
      [theme]: { ...state, slots: { ...state.slots, [item.slot]: id } },
    },
  };
}

/** Equips an owned wardrobe item on the heroine (SPEC §4.4, §10.3). */
export function wearItem(save: Save, id: ItemId): Save {
  const item = itemById(id);
  if (!item || !isWardrobeKind(item.kind) || !save.wardrobe.includes(id)) return save;
  const kind = item.kind as WardrobeKind;
  if (save.heroine[kind] === id) return save;
  return { ...save, heroine: { ...save.heroine, [kind]: id } };
}

/** Fills one star on the theme's chart, capped at 24 (SPEC §10.5). */
export function addStar(save: Save, theme: Theme): Save {
  const state = save.themes[theme];
  if (state.stars >= MAX_STARS) return save;
  return { ...save, themes: { ...save.themes, [theme]: { ...state, stars: state.stars + 1 } } };
}

/** Returns a list of violated invariants (SPEC §11.4); empty when the save is consistent. */
export function checkInvariants(save: Save): string[] {
  const problems: string[] = [];

  for (const theme of ['space', 'sweet'] as const satisfies readonly Theme[]) {
    const state = save.themes[theme];
    const owned = new Set(state.owned);
    for (const id of state.owned) {
      const item = itemById(id);
      if (!item) problems.push(`${theme}.owned references unknown item ${id}`);
      else if (item.kind !== 'decoration')
        problems.push(`${theme}.owned holds non-decoration ${id}`);
      else if (item.theme !== theme) problems.push(`${theme}.owned holds ${item.theme} item ${id}`);
    }
    for (const slot of SLOT_TYPES) {
      const id = state.slots[slot];
      const item = itemById(id);
      if (!item) problems.push(`${theme}.slots.${slot} references unknown item ${id}`);
      else {
        if (item.kind !== 'decoration' || item.slot !== slot) {
          problems.push(`${theme}.slots.${slot} holds ${id} which is not a ${slot} decoration`);
        }
        if (item.theme !== theme)
          problems.push(`${theme}.slots.${slot} holds ${item.theme} item ${id}`);
        if (!owned.has(id)) problems.push(`${theme}.slots.${slot} holds unowned item ${id}`);
      }
    }
    if (!Number.isInteger(state.stars) || state.stars < 0 || state.stars > MAX_STARS) {
      problems.push(`${theme}.stars out of range: ${state.stars}`);
    }
  }

  const wardrobe = new Set(save.wardrobe);
  for (const id of save.wardrobe) {
    const item = itemById(id);
    if (!item) problems.push(`wardrobe references unknown item ${id}`);
    else if (!isWardrobeKind(item.kind)) problems.push(`wardrobe holds decoration ${id}`);
  }
  const h = save.heroine;
  const check = (id: string | null, kind: string, allowNull: boolean) => {
    if (id === null) {
      if (!allowNull) problems.push(`heroine.${kind} is null`);
      return;
    }
    const item = itemById(id);
    if (!item) problems.push(`heroine.${kind} references unknown item ${id}`);
    else if (item.kind !== kind) problems.push(`heroine.${kind} holds ${item.kind} ${id}`);
    else if (!wardrobe.has(id)) problems.push(`heroine.${kind} holds unowned ${id}`);
  };
  check(h.hair, 'hair', false);
  check(h.outfit, 'outfit', false);
  check(h.shoes, 'shoes', false);
  check(h.extra, 'extra', true);

  const mission = save.mission;
  if (mission) {
    const owned = new Set(save.themes[mission.theme].owned.concat(save.wardrobe));
    for (const id of mission.prizePair) {
      const item = itemById(id);
      if (!item) problems.push(`mission.prizePair references unknown item ${id}`);
      else if (item.theme !== mission.theme) {
        problems.push(
          `mission.prizePair holds ${item.theme} item ${id} in a ${mission.theme} mission`,
        );
      } else if (mission.state === 'IN_PROGRESS' && owned.has(id)) {
        problems.push(`mission.prizePair holds already owned item ${id}`);
      }
    }
  }
  return problems;
}

/** Owned earnable items of a theme (starters excluded); feeds the collection counter. */
export function collectedCount(save: Save, theme: Theme): number {
  const owned = new Set(save.themes[theme].owned.concat(save.wardrobe));
  let n = 0;
  for (const id of owned) {
    const item = itemById(id);
    if (item && item.theme === theme && !item.starter && item.collection) n++;
  }
  return n;
}
