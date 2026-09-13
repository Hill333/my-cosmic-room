/**
 * Syncs assets/manifest.json with the catalogue and tools/manifest-data.ts.
 * Missing entries are created; existing entries keep their path and gen record
 * (prompts, attempts, status), so re-running never loses generation history.
 *
 *   node tools/build-manifest.ts
 */
import { allItems, defaultHeroine, figureId, requireItem } from '../src/catalog/index.ts';
import type { AssetEntry, AssetManifest, GenRecord } from '../src/assetTypes.ts';
import {
  DECORATION_GEN,
  DEFAULT_ANCHORS,
  EXTRA_ASSETS,
  GARMENT_LABELS,
  HEROINE_CANVAS,
  HEROINE_SHEET,
  OVERLAY_GEN,
  SIZE_OVERRIDES,
  SLOT_SIZES,
  SOUNDS,
  SPACE_REF,
  SWEET_REF,
  TILE_SIZE,
  figurePrompt,
} from './manifest-data.ts';
import { readManifest, writeManifest } from './lib/manifest.ts';

function placeholderPath(id: string): string {
  return `${id}.svg`;
}

function newGen(preset: GenRecord['preset'], prompt: string, references: string[]): GenRecord {
  return { preset, prompt, references, attempts: 0, generatedAt: null, status: 'placeholder' };
}

function titleCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const desired = new Map<string, AssetEntry>();
const defaultOutfit = requireItem(defaultHeroine.outfit).art.figure!;
const defaultHair = requireItem(defaultHeroine.hair).art.figure!;

for (const item of allItems) {
  const label = titleCase(
    GARMENT_LABELS[item.id] ??
      item.id
        .split('.')[1]!
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase(),
  );
  if (item.kind === 'decoration' && item.slot && item.art.room) {
    const geo = SIZE_OVERRIDES[item.id] ?? SLOT_SIZES[item.slot];
    const g = DECORATION_GEN[item.id];
    if (!g) throw new Error(`No generation prompt for ${item.id} in tools/manifest-data.ts`);
    const ref = item.theme === 'sweet' ? SWEET_REF : SPACE_REF;
    desired.set(item.art.room, {
      path: placeholderPath(item.art.room),
      theme: item.theme,
      category: 'decoration',
      size: geo.size,
      pivot: geo.pivot,
      slot: item.slot,
      label,
      gen: newGen(g.preset, g.prompt, [ref]),
    });
    desired.set(item.art.tile, {
      path: placeholderPath(item.art.tile),
      theme: item.theme,
      category: 'tile',
      size: TILE_SIZE,
      label,
      derivedFrom: item.art.room,
    });
  } else if (item.kind === 'outfit' || item.kind === 'hair') {
    // The figure is created below (one per outfit × hairstyle); the tile is a cropped view
    // of the figure that shows this garment with the default counterpart (SPEC §4.5).
    const outfit = item.kind === 'outfit' ? item.art.figure! : defaultOutfit;
    const hair = item.kind === 'hair' ? item.art.figure! : defaultHair;
    desired.set(item.art.tile, {
      path: placeholderPath(item.art.tile),
      theme: item.theme,
      category: 'tile',
      size: TILE_SIZE,
      label,
      derivedFrom: figureId(outfit, hair),
      tileCrop: item.kind === 'outfit' ? 'torso' : 'head',
    });
  } else if (item.art.heroineLayer) {
    const name = item.art.heroineLayer.split('/').pop()!;
    const spec = OVERLAY_GEN[name];
    if (!spec) throw new Error(`No overlay spec for ${item.id} in tools/manifest-data.ts`);
    const entry: AssetEntry = {
      path: placeholderPath(item.art.heroineLayer),
      theme: 'shared',
      category: 'garment',
      size: spec.size,
      pivot: spec.pivot,
      layer: item.kind === 'shoes' ? 'shoes' : 'extra',
      anchor: spec.anchor,
      label,
      gen: newGen(spec.preset, spec.prompt, [HEROINE_SHEET]),
    };
    if (spec.offset) entry.offset = spec.offset;
    if (spec.clipAtAnkle) entry.clipAtAnkle = true;
    desired.set(item.art.heroineLayer, entry);
    desired.set(item.art.tile, {
      path: placeholderPath(item.art.tile),
      theme: item.theme,
      category: 'tile',
      size: TILE_SIZE,
      label,
      derivedFrom: item.art.heroineLayer,
      tileCrop: spec.tileCrop,
    });
  }
}

// Heroine figures (SPEC §4.5): one full-body raster per outfit × hairstyle.
for (const outfit of allItems.filter((i) => i.kind === 'outfit')) {
  for (const hair of allItems.filter((i) => i.kind === 'hair')) {
    const id = figureId(outfit.art.figure!, hair.art.figure!);
    desired.set(id, {
      path: placeholderPath(id),
      theme: 'shared',
      category: 'heroine',
      size: HEROINE_CANVAS,
      layer: 'figure',
      anchors: structuredClone(DEFAULT_ANCHORS),
      label: `${titleCase(GARMENT_LABELS[outfit.id] ?? outfit.id)}, ${GARMENT_LABELS[hair.id] ?? hair.id}`,
      gen: newGen('astra-light', figurePrompt(outfit.art.figure!, hair.art.figure!), [
        HEROINE_SHEET,
      ]),
    });
  }
}

for (const extra of EXTRA_ASSETS) {
  const { id, prompt, preset, references, ...rest } = extra;
  const entry: AssetEntry = { path: placeholderPath(id), ...rest };
  if (prompt && preset) entry.gen = newGen(preset, prompt, references ?? []);
  desired.set(id, entry);
}

// Sounds (SPEC §15.4) have no placeholder: tools/gen-sounds.ts writes the files and their duration.
for (const sound of SOUNDS) {
  desired.set(sound.id, {
    path: `${sound.id}.mp3`,
    theme: sound.theme,
    category: 'sound',
    size: [0, 0],
    label: sound.label,
    source: 'synthesized',
  });
}

// S0 card thumbnails (SPEC §16.3), derived from the backgrounds by tools/gen-thumbs.ts.
for (const theme of ['space', 'sweet'] as const) {
  desired.set(`${theme}/room/thumb`, {
    path: `${theme}/room/thumb.webp`,
    theme,
    category: 'room',
    size: [960, 640],
    label: `${theme === 'space' ? 'Space' : 'Sweet'} room card thumbnail`,
    derivedFrom: `${theme}/room/background`,
  });
}

const existing = readManifest();
const next: AssetManifest = { version: 1, assets: {} };
let created = 0;
let kept = 0;
for (const [id, entry] of desired) {
  const old = existing.assets[id];
  if (old) {
    // Keep the current file and generation history; refresh static metadata. Processed art
    // (a PNG written by tools/post-assets.ts) keeps its measured size and pivot.
    const merged: AssetEntry = { ...entry, path: old.path };
    if (old.path.endsWith('.png')) {
      merged.size = old.size;
      if (old.pivot) merged.pivot = old.pivot;
    }
    // Hand-tuned figure anchors (with the ankle cut) and overlay offsets / scales survive a
    // rebuild, on any overlay (a face's offset has no counterpart in manifest-data).
    if (old.anchors && entry.anchors) merged.anchors = old.anchors;
    if (old.offset && entry.anchor) merged.offset = old.offset;
    if (old.scale !== undefined && entry.anchor) merged.scale = old.scale;
    if (old.footX && entry.anchor) merged.footX = old.footX; // measured by post-assets
    if (old.duration !== undefined) merged.duration = old.duration;
    if (old.gen && entry.gen) {
      merged.gen = {
        ...entry.gen,
        ...old.gen,
        prompt: entry.gen.prompt,
        preset: entry.gen.preset,
        references: entry.gen.references,
      };
      if (old.gen.status === 'approved') merged.gen.prompt = old.gen.prompt; // approved art keeps the prompt that made it
    }
    next.assets[id] = merged;
    kept++;
  } else {
    next.assets[id] = entry;
    created++;
  }
}
const removed = Object.keys(existing.assets).filter((id) => !desired.has(id));
writeManifest(next);
console.log(
  `manifest: ${created} created, ${kept} kept, ${removed.length} removed${removed.length ? ' (' + removed.join(', ') + ')' : ''}; total ${desired.size}`,
);
