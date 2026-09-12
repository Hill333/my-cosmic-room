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
    expect(r.summary.collected).toEqual({ space: 2, sweet: 0 });
    expect(r.summary.stars).toEqual({ space: 0, sweet: 3 });
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
