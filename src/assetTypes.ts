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

export type AnchorKind = 'face' | 'feet' | 'head' | 'back';
export type TileCrop = 'torso' | 'head' | 'feet';

/** One anchor of a heroine figure: a point in figure px and a multiplier on the overlay size. */
export interface Anchor {
  x: number;
  y: number;
  scale: number;
  /**
   * Feet only: the ankle cut line in figure px. Post-processing erases the figure's own socks
   * and feet below it (extruding the legs a little way down behind the shoes), and shoe
   * overlays marked `clipAtAnkle` are clipped just above it.
   */
  cutY?: number;
  /**
   * Feet only: the centre x of the left and right leg at the ankle cut, in figure px (measured
   * by post-processing). A shoe overlay with `footX` is drawn as two halves, each moved so its
   * foot sits on the matching leg, since the generated pairs stand closer together than the
   * figure's legs.
   */
  legX?: [number, number];
}

export type FigureAnchors = Record<AnchorKind, Anchor>;
export type GenStatus = 'placeholder' | 'generated' | 'approved';

export interface GenRecord {
  preset: GenPreset;
  prompt: string;
  references: string[];
  attempts: number;
  generatedAt: string | null;
  status: GenStatus;
  fallback?: string;
  /** The model that made the current file (a Codex preset's model, or an OpenRouter model id). */
  model?: string;
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
  /**
   * Heroine layer (SPEC §4.5): `figure` is a full-body standing raster (one per outfit ×
   * hairstyle) and `sit` the same girl sitting cross-legged (SPEC §4.3 "walk, bed, sit");
   * `sleep` is her sleeping head (one per hairstyle) drawn on a bed's pillow; `shoes`, `extra`
   * and `face` are overlays snapped to one of a figure's anchors.
   */
  layer?: 'figure' | 'sit' | 'sleep' | 'face' | 'shoes' | 'extra';
  /** Overlays: the figure anchor the overlay's pivot lands on; `back` draws behind the figure. */
  anchor?: AnchorKind;
  /** Overlays: extra shift from the anchor in figure px (a clip sits beside the parting). */
  offset?: [number, number];
  /** Overlays: own size multiplier on top of the anchor's (faces differ in how they fill their box). */
  scale?: number;
  /**
   * Shoes that draw socks or legs above the shoe: the overlay is clipped just above the
   * figure's ankle cut (`anchors.feet.cutY`) so those never paint over the shin or a trouser hem.
   */
  clipAtAnkle?: boolean;
  /** Feet overlays: the centre x of each foot in overlay px (measured by post-processing); see `Anchor.legX`. */
  footX?: [number, number];
  /** Figures: where the overlays snap, in figure px; tuned with `?debug=heroine`. */
  anchors?: FigureAnchors;
  /** Wardrobe tiles derived from a figure or overlay: which region of the figure to show. */
  tileCrop?: TileCrop;
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
