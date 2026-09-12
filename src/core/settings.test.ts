import { describe, expect, it } from 'vitest';
import { createFreshSave } from './save.ts';
import { settingsReducer } from './settings.ts';

describe('settings reducer', () => {
  it('sets language, sound, motion and last theme without touching anything else', () => {
    const s0 = createFreshSave();
    const s1 = settingsReducer(s0, { type: 'settings/language', language: 'tr' });
    const s2 = settingsReducer(s1, { type: 'settings/sound', sound: false });
    const s3 = settingsReducer(s2, { type: 'settings/lastTheme', theme: 'sweet' });
    expect(s3.settings).toMatchObject({ language: 'tr', sound: false, lastTheme: 'sweet' });
    expect(s3.themes).toBe(s0.themes);
    expect(s3.wardrobe).toBe(s0.wardrobe);
    expect(s0.settings.language).toBeNull();
  });

  it('AT-29 (core part): locked levels ignore child changes but accept parent changes', () => {
    const locked = settingsReducer(createFreshSave(), {
      type: 'settings/levelsLocked',
      locked: true,
    });
    expect(
      settingsReducer(locked, { type: 'settings/readingLevel', level: 4 }).settings.readingLevel,
    ).toBe(2);
    expect(
      settingsReducer(locked, { type: 'settings/readingLevel', level: 4, byParent: true }).settings
        .readingLevel,
    ).toBe(4);
    expect(
      settingsReducer(locked, { type: 'settings/elapsedLevel', level: 3 }).settings.elapsedLevel,
    ).toBe(1);
  });
});
