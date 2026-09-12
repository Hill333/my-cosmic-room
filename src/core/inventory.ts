/**
 * Inventory rules (SPEC §10.2–§10.5, §11.4). M0 ships the invariant checker and
 * the read-only helpers; place / wear / stars reducers arrive in M1–M3.
 */
import { itemById, isWardrobeKind } from '../catalog/index.ts';
import type { Save, Theme } from './types.ts';
import { SLOT_TYPES } from './types.ts';

export const MAX_STARS = 24;

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
