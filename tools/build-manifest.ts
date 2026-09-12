/**
 * Syncs assets/manifest.json with the catalogue and tools/manifest-data.ts.
 * Missing entries are created; existing entries keep their path and gen record
 * (prompts, attempts, status), so re-running never loses generation history.
 *
 *   node tools/build-manifest.ts
 */
import { allItems } from '../src/catalog/index.ts';
import type { AssetEntry, AssetManifest, GenRecord } from '../src/assetTypes.ts';
import {
  DECORATION_GEN,
  EXTRA_ASSETS,
  GARMENT_LABELS,
  HEROINE_CANVAS,
  SIZE_OVERRIDES,
  SLOT_SIZES,
  SPACE_REF,
  SWEET_REF,
  TILE_SIZE,
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
  } else if (item.art.heroineLayer && item.kind !== 'decoration') {
    const layer = item.kind;
    desired.set(item.art.heroineLayer, {
      path: placeholderPath(item.art.heroineLayer),
      theme: 'shared',
      category: 'garment',
      size: HEROINE_CANVAS,
      layer,
      label,
      source: 'hand-drawn',
    });
    desired.set(item.art.tile, {
      path: placeholderPath(item.art.tile),
      theme: item.theme,
      category: 'tile',
      size: TILE_SIZE,
      label,
      derivedFrom: item.art.heroineLayer,
    });
  }
}

for (const extra of EXTRA_ASSETS) {
  const { id, prompt, preset, references, ...rest } = extra;
  const entry: AssetEntry = { path: placeholderPath(id), ...rest };
  if (prompt && preset) entry.gen = newGen(preset, prompt, references ?? []);
  desired.set(id, entry);
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
