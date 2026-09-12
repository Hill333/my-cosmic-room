/**
 * Shape of assets/manifest.json (SPEC §15.5, §15.6). Shared by the app and the tools.
 */
import type { ItemTheme, SlotType } from './core/types.ts';

export type AssetCategory =
  | 'room'
  | 'decoration'
  | 'tile'
  | 'heroine'
  | 'garment'
  | 'companion'
  | 'entry'
  | 'sceneA'
  | 'sceneB'
  | 'ui'
  | 'logo'
  | 'sound';

export type GenPreset = 'sol-med' | 'astra-light';
export type GenStatus = 'placeholder' | 'generated' | 'approved';

export interface GenRecord {
  preset: GenPreset;
  prompt: string;
  references: string[];
  attempts: number;
  generatedAt: string | null;
  status: GenStatus;
  fallback?: string;
}

export interface AssetEntry {
  /** Current best file, relative to assets/ (a placeholder .svg until art lands). */
  path: string;
  theme: ItemTheme;
  category: AssetCategory;
  /** Target pixel size at 2× (SPEC §15.2); `[0, 0]` for sounds. */
  size: [number, number];
  /** Anchor point inside the image for room layers, in the same pixel space. */
  pivot?: [number, number];
  slot?: SlotType;
  /** Heroine layer name for garments (SPEC §4.5). */
  layer?:
    | 'body'
    | 'face'
    | 'hairBack'
    | 'hairFront'
    | 'hair'
    | 'outfit'
    | 'shoes'
    | 'extra'
    | 'extraBack';
  /** English label used on placeholders and in the debug overlay. */
  label: string;
  /** Tiles and other copies derived from another asset by post-processing. */
  derivedFrom?: string;
  /**
   * Hand-drawn SVG assets are never generated (SPEC §15.2 items 2 and 5); synthesized sounds
   * come from tools/gen-sounds.ts (SPEC §15.4).
   */
  source?: 'hand-drawn' | 'synthesized';
  /** Sounds: duration in seconds, written by tools/gen-sounds.ts. */
  duration?: number;
  gen?: GenRecord;
}

export interface AssetManifest {
  version: 1;
  /** Asset id → entry. Ids follow `<theme|shared>/<category>/<name>` (SPEC §15.5). */
  assets: Record<string, AssetEntry>;
}
