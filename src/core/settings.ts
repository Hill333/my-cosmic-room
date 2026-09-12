/**
 * Settings reducer (SPEC §3.9, §11.3). Pure; every change returns a new Save.
 */
import type { ElapsedLevel, Language, MotionSetting, ReadingLevel, Save, Theme } from './types.ts';

export type SettingsEvent =
  | { type: 'settings/language'; language: Language }
  | { type: 'settings/sound'; sound: boolean }
  | { type: 'settings/motion'; motion: MotionSetting }
  | { type: 'settings/readingLevel'; level: ReadingLevel; byParent?: boolean }
  | { type: 'settings/elapsedLevel'; level: ElapsedLevel; byParent?: boolean }
  | { type: 'settings/levelsLocked'; locked: boolean }
  | { type: 'settings/hour24Reading'; enabled: boolean }
  | { type: 'settings/lastTheme'; theme: Theme };

export function settingsReducer(save: Save, event: SettingsEvent): Save {
  const s = save.settings;
  switch (event.type) {
    case 'settings/language':
      return withSettings(save, { language: event.language });
    case 'settings/sound':
      return withSettings(save, { sound: event.sound });
    case 'settings/motion':
      return withSettings(save, { motion: event.motion });
    case 'settings/readingLevel':
      // Level changes during a mission are not possible (SPEC §10.1); the child cannot change locked levels.
      if (save.mission && save.mission.state === 'IN_PROGRESS') return save;
      if (s.levelsLocked && !event.byParent) return save;
      return withSettings(save, { readingLevel: event.level });
    case 'settings/elapsedLevel':
      if (save.mission && save.mission.state === 'IN_PROGRESS') return save;
      if (s.levelsLocked && !event.byParent) return save;
      return withSettings(save, { elapsedLevel: event.level });
    case 'settings/levelsLocked':
      return withSettings(save, { levelsLocked: event.locked });
    case 'settings/hour24Reading':
      return withSettings(save, { hour24Reading: event.enabled });
    case 'settings/lastTheme':
      return withSettings(save, { lastTheme: event.theme });
  }
}

function withSettings(save: Save, patch: Partial<Save['settings']>): Save {
  return { ...save, settings: { ...save.settings, ...patch } };
}
