import { describe, expect, it } from 'vitest';
import { checkInvariants } from './inventory.ts';
import {
  BACKUP_KEY,
  createFreshSave,
  exportSave,
  importSave,
  loadSave,
  MemoryStore,
  NOTICE_KEY,
  QUARANTINE_KEY,
  resetSave,
  SAVE_KEY,
  storeSave,
  validateSave,
} from './save.ts';
import type { Save } from './types.ts';

const NOW = new Date('2026-09-12T10:00:00.000Z');

function seeded(): { store: MemoryStore; save: Save } {
  const store = new MemoryStore();
  const save = createFreshSave(NOW);
  save.settings.language = 'nl';
  save.themes.space.owned.push('space.moonBed');
  save.themes.space.slots.BED = 'space.moonBed';
  save.wardrobe.push('space.spaceBoots');
  save.heroine.shoes = 'space.spaceBoots';
  save.themes.sweet.stars = 3;
  storeSave(store, save, NOW);
  return { store, save };
}

describe('fresh save', () => {
  it('matches the SPEC §11.3 defaults and satisfies the invariants', () => {
    const save = createFreshSave(NOW);
    expect(save.version).toBe(1);
    expect(save.settings).toEqual({
      language: null,
      sound: true,
      motion: 'system',
      readingLevel: 2,
      elapsedLevel: 1,
      levelsLocked: false,
      hour24Reading: false,
      timeWords: true,
      lastTheme: 'space',
    });
    expect(save.themes.space.owned).toHaveLength(7);
    expect(save.themes.sweet.owned).toHaveLength(7);
    expect(save.wardrobe).toHaveLength(8);
    expect(save.mission).toBeNull();
    expect(checkInvariants(save)).toEqual([]);
    expect(validateSave(JSON.parse(JSON.stringify(save))).ok).toBe(true);
  });

  it('loads fresh when storage is empty', () => {
    const r = loadSave(new MemoryStore(), NOW);
    expect(r.status).toBe('fresh');
    expect(r.notice).toBeNull();
    expect(r.save.settings.language).toBeNull();
  });
});

describe('store and load', () => {
  it('round-trips through storage and keeps the previous write as backup', () => {
    const { store, save } = seeded();
    const first = store.getItem(SAVE_KEY);
    save.themes.space.stars = 1;
    storeSave(store, save, new Date(NOW.getTime() + 1000));
    expect(store.getItem(BACKUP_KEY)).toBe(first);
    const r = loadSave(store, NOW);
    expect(r.status).toBe('loaded');
    expect(r.save.themes.space.stars).toBe(1);
    expect(r.save.settings.language).toBe('nl');
    expect(r.save.heroine.shoes).toBe('space.spaceBoots');
  });
});

describe('AT-31 damaged save', () => {
  it('restores the backup, quarantines the damaged main and records a notice', () => {
    const { store, save } = seeded();
    save.themes.space.stars = 2;
    storeSave(store, save, new Date(NOW.getTime() + 1000)); // backup = stars 0 state
    store.setItem(SAVE_KEY, '{"version":1,"broken":tru');
    const r = loadSave(store, NOW);
    expect(r.status).toBe('restored-backup');
    expect(r.save.themes.space.stars).toBe(0);
    expect(r.save.settings.language).toBe('nl');
    expect(r.notice).toEqual({ kind: 'damaged', at: NOW.toISOString() });
    expect(store.getItem(QUARANTINE_KEY)).toBe('{"version":1,"broken":tru');
    expect(store.getItem(NOTICE_KEY)).not.toBeNull();
    // The restored save is written back as main so the next load is clean.
    expect(loadSave(store, NOW).status).toBe('loaded');
  });

  it('starts fresh and quarantines when both main and backup are corrupt', () => {
    const { store } = seeded();
    store.setItem(SAVE_KEY, 'not json');
    store.setItem(BACKUP_KEY, '{"version":1}');
    const r = loadSave(store, NOW);
    expect(r.status).toBe('fresh-after-damage');
    expect(r.save.settings.language).toBeNull();
    expect(store.getItem(QUARANTINE_KEY)).toBe('not json');
    expect(r.notice?.kind).toBe('damaged');
  });

  it('treats a save that breaks the invariants as damaged', () => {
    const { store, save } = seeded();
    storeSave(store, {
      ...save,
      themes: { ...save.themes, sweet: { ...save.themes.sweet, stars: 4 } },
    });
    const bad = JSON.parse(store.getItem(SAVE_KEY)!) as Save;
    bad.themes.space.slots.BED = 'space.rainbowRug'; // a rug in the bed slot
    store.setItem(SAVE_KEY, JSON.stringify(bad));
    const r = loadSave(store, NOW);
    expect(r.status).toBe('restored-backup');
  });

  it('quarantines a save from a newer version and starts fresh with a notice', () => {
    const { store } = seeded();
    const newer = JSON.parse(store.getItem(SAVE_KEY)!) as Record<string, unknown>;
    newer['version'] = 2;
    store.setItem(SAVE_KEY, JSON.stringify(newer));
    const r = loadSave(store, NOW);
    expect(r.status).toBe('fresh-after-newer');
    expect(r.notice?.kind).toBe('newer-version');
    expect(store.getItem(QUARANTINE_KEY)).toContain('"version":2');
  });
});

describe('AT-32 export / import', () => {
  it('re-imports an exported file to an identical state', () => {
    const { save } = seeded();
    const text = exportSave(save);
    const r = importSave(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save).toEqual(save);
    expect(r.summary.collected).toEqual({ space: 2, sweet: 0, hearts: 0, kpop: 0 });
    expect(r.summary.stars).toEqual({ space: 0, sweet: 3, hearts: 0, kpop: 0 });
    expect(r.summary.language).toBe('nl');
  });

  it('refuses a file with a higher version', () => {
    const { save } = seeded();
    const text = exportSave({ ...save, version: 2 as unknown as 1 });
    const r = importSave(text);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('newer-version');
  });

  it('refuses garbage and structurally wrong files', () => {
    expect(importSave('hello').ok).toBe(false);
    expect(importSave('{"version":1}').ok).toBe(false);
    const { save } = seeded();
    const noHeroine = JSON.parse(exportSave(save)) as Record<string, unknown>;
    delete noHeroine['heroine'];
    expect(importSave(JSON.stringify(noHeroine)).ok).toBe(false);
  });
});

describe('reset', () => {
  it('removes main, backup and notice but keeps the quarantine copy', () => {
    const { store } = seeded();
    store.setItem(QUARANTINE_KEY, 'old');
    store.setItem(NOTICE_KEY, '{"kind":"damaged","at":"2026-01-01T00:00:00.000Z"}');
    resetSave(store);
    expect(store.getItem(SAVE_KEY)).toBeNull();
    expect(store.getItem(BACKUP_KEY)).toBeNull();
    expect(store.getItem(NOTICE_KEY)).toBeNull();
    expect(store.getItem(QUARANTINE_KEY)).toBe('old');
    expect(loadSave(store, NOW).status).toBe('fresh');
  });
});

describe('newItems (M3 additive field)', () => {
  it('loads a v1 save written before the field existed with an empty list', () => {
    const store = new MemoryStore();
    const legacy = createFreshSave(NOW) as Partial<Save>;
    delete legacy.newItems;
    store.setItem(SAVE_KEY, JSON.stringify(legacy));
    const result = loadSave(store, NOW);
    expect(result.status).toBe('loaded');
    expect(result.save.newItems).toEqual([]);
  });
  it('keeps the list through store, load, export and import', () => {
    const { store, save } = seeded();
    save.newItems = ['space.spaceBoots'];
    storeSave(store, save, NOW);
    expect(loadSave(store, NOW).save.newItems).toEqual(['space.spaceBoots']);
    const imported = importSave(exportSave(save));
    expect(imported.ok && imported.save.newItems).toEqual(['space.spaceBoots']);
  });
  it('rejects a malformed list and an unowned or starter entry', () => {
    const save = createFreshSave(NOW);
    expect(validateSave({ ...save, newItems: 'nope' }).ok).toBe(false);
    expect(validateSave({ ...save, newItems: ['space.rainbowRug'] }).ok).toBe(false);
    expect(validateSave({ ...save, newItems: ['space.plainRug'] }).ok).toBe(false);
  });
});

describe('settings.timeWords (SPEC §7.7 additive field)', () => {
  it('loads a save written before the field existed with words on', () => {
    const store = new MemoryStore();
    const legacy = createFreshSave(NOW);
    delete (legacy.settings as Partial<Save['settings']>).timeWords;
    store.setItem(SAVE_KEY, JSON.stringify(legacy));
    const result = loadSave(store, NOW);
    expect(result.status).toBe('loaded');
    expect(result.save.settings.timeWords).toBe(true);
  });
  it('round-trips an off switch and rejects a non-boolean', () => {
    const { store, save } = seeded();
    save.settings.timeWords = false;
    storeSave(store, save, NOW);
    expect(loadSave(store, NOW).save.settings.timeWords).toBe(false);
    const imported = importSave(exportSave(save));
    expect(imported.ok && imported.save.settings.timeWords).toBe(false);
    const bad = { ...save, settings: { ...save.settings, timeWords: 'yes' } };
    expect(validateSave(bad).ok).toBe(false);
  });
});

describe('four rooms (D21): a two-room save loads with fresh Heart and K-pop rooms', () => {
  /** A save exactly as the game wrote it before the Heart and K-pop rooms existed. */
  function twoRoomSave(): Record<string, unknown> {
    const { save } = seeded();
    const legacy = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
    const themes = legacy['themes'] as Record<string, unknown>;
    delete themes['hearts'];
    delete themes['kpop'];
    const progress = legacy['progress'] as Record<string, unknown>;
    progress['firstE3Done'] = { space: true, sweet: false };
    return legacy;
  }

  it('loads, keeps the old rooms and progress and starts the new rooms fresh', () => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(twoRoomSave()));
    const result = loadSave(store, NOW);
    expect(result.status).toBe('loaded');
    const save = result.save;
    expect(save.themes.space.slots.BED).toBe('space.moonBed');
    expect(save.themes.sweet.stars).toBe(3);
    expect(save.heroine.shoes).toBe('space.spaceBoots');
    expect(save.themes.hearts).toEqual(createFreshSave(NOW).themes.hearts);
    expect(save.themes.kpop).toEqual(createFreshSave(NOW).themes.kpop);
    expect(save.themes.hearts.owned).toHaveLength(7);
    expect(save.themes.kpop.slots.NOOK).toBe('kpop.purpleCushion');
    expect(save.progress.firstE3Done).toEqual({
      space: true,
      sweet: false,
      hearts: false,
      kpop: false,
    });
    expect(checkInvariants(save)).toEqual([]);
    // Written back, the save carries all four rooms from then on.
    storeSave(store, save, NOW);
    const again = JSON.parse(store.getItem(SAVE_KEY)!) as Save;
    expect(Object.keys(again.themes).sort()).toEqual(['hearts', 'kpop', 'space', 'sweet']);
  });

  it('imports an exported two-room file the same way', () => {
    const imported = importSave(JSON.stringify(twoRoomSave()));
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.save.themes.hearts.owned).toHaveLength(7);
    expect(imported.summary.collected).toEqual({ space: 2, sweet: 0, hearts: 0, kpop: 0 });
  });

  it('still rejects a malformed room and an unknown room in lastTheme', () => {
    const legacy = twoRoomSave();
    (legacy['themes'] as Record<string, unknown>)['hearts'] = { owned: 'nope' };
    expect(validateSave(legacy).ok).toBe(false);
    const wrongTheme = twoRoomSave();
    (wrongTheme['settings'] as Record<string, unknown>)['lastTheme'] = 'garden';
    expect(validateSave(wrongTheme).ok).toBe(false);
  });

  it('keeps Heart and K-pop progress apart from the other rooms', () => {
    const save = createFreshSave(NOW);
    save.themes.hearts.owned.push('hearts.heartRug');
    save.themes.hearts.slots.RUG = 'hearts.heartRug';
    save.themes.kpop.stars = 5;
    save.settings.lastTheme = 'kpop';
    save.wardrobe.push('kpop.popJacket');
    save.heroine.outfit = 'kpop.popJacket';
    expect(checkInvariants(save)).toEqual([]);
    const r = validateSave(JSON.parse(JSON.stringify(save)));
    expect(r.ok && r.save).toEqual(save);
    // A Heart decoration cannot sit in the K-pop room.
    save.themes.kpop.owned.push('hearts.heartRug');
    expect(checkInvariants(save)).toContain('kpop.owned holds hearts item hearts.heartRug');
  });
});

describe('invariants (SPEC §11.4)', () => {
  it('flags unowned slot items, wrong kinds and star overflow', () => {
    const save = createFreshSave(NOW);
    save.themes.space.slots.RUG = 'space.rainbowRug';
    save.heroine.extra = 'sweet.bowHeadband';
    save.themes.sweet.stars = 25;
    const problems = checkInvariants(save);
    expect(problems.some((p) => p.includes('space.slots.RUG') && p.includes('unowned'))).toBe(true);
    expect(problems.some((p) => p.includes('heroine.extra'))).toBe(true);
    expect(problems.some((p) => p.includes('sweet.stars'))).toBe(true);
  });
});
