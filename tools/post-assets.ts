/**
 * Post-processing of generated art (SPEC §15.6): background removal, crop to the silhouette
 * with 8 px padding, resize to the manifest size, PNG compression and the tile copy for the
 * panel. Reads assets/.gen/<id>.png and writes assets/<theme>/<category>/<name>.png, then
 * updates the manifest entry's path, size and pivot. Not part of the app bundle.
 *
 *   node tools/post-assets.ts [--only <id>...] [--force] [--dry-run]
 *
 * Without --only every entry whose gen.status is 'generated' and whose raw file exists is
 * processed once (entries already pointing at a PNG are skipped unless --force). Entries
 * marked 'approved' are never touched.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import type { AssetEntry, AssetManifest } from '../src/assetTypes.ts';
import { ASSETS_DIR, assetFile, readManifest, writeManifest } from './lib/manifest.ts';

const PADDING = 8;
/** Channels at or above this value count as the plain white background. */
const WHITE = 236;
/** Boundary pixels lighter than this get a partial alpha (anti-aliased edges). */
const FEATHER_FROM = 190;
const TILE_SIZE = 360;
const TILE_MARGIN = 20;

interface Args {
  only: string[];
  force: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { only: [], force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--only') args.only.push(argv[++i] ?? '');
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

function rawPath(id: string): string {
  return resolve(ASSETS_DIR, '.gen', `${id}.png`);
}

/** Full-frame art (rooms, scene frames) keeps its background and is only resized. */
function isFullFrame(entry: AssetEntry): boolean {
  return entry.category === 'room' || (entry.category === 'sceneA' && entry.size[0] > 2000);
}

interface Cutout {
  data: Buffer;
  width: number;
  height: number;
  box: { left: number; top: number; width: number; height: number };
}

/**
 * Makes the plain white background transparent by flood-filling from the borders (so white
 * areas inside the object stay), feathers the boundary, and returns the silhouette's box.
 */
function cutOut(data: Buffer, width: number, height: number): Cutout {
  const n = width * height;
  const background = new Uint8Array(n);
  const stack: number[] = [];
  const isWhite = (i: number) =>
    data[i * 4]! >= WHITE && data[i * 4 + 1]! >= WHITE && data[i * 4 + 2]! >= WHITE;
  const push = (i: number) => {
    if (!background[i] && isWhite(i)) {
      background[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (y > 0) push(i - width);
    if (y < height - 1) push(i + width);
  }
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < n; i++) {
    if (background[i]) {
      data[i * 4 + 3] = 0;
      continue;
    }
    const x = i % width;
    const y = (i - x) / width;
    const nearBackground =
      (x > 0 && background[i - 1]) ||
      (x < width - 1 && background[i + 1]) ||
      (y > 0 && background[i - width]) ||
      (y < height - 1 && background[i + width]);
    if (nearBackground) {
      const light = Math.min(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
      if (light > FEATHER_FROM) {
        data[i * 4 + 3] = Math.round(((255 - light) / (255 - FEATHER_FROM)) * 255);
      }
    }
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0) throw new Error('image is entirely background');
  const left = Math.max(0, minX - PADDING);
  const top = Math.max(0, minY - PADDING);
  const right = Math.min(width - 1, maxX + PADDING);
  const bottom = Math.min(height - 1, maxY + PADDING);
  return {
    data,
    width,
    height,
    box: { left, top, width: right - left + 1, height: bottom - top + 1 },
  };
}

async function processEntry(
  id: string,
  entry: AssetEntry,
  manifest: AssetManifest,
  dryRun: boolean,
): Promise<string> {
  const raw = rawPath(id);
  const outRel = `${id}.png`;
  const out = assetFile(outRel);
  const [targetW, targetH] = entry.size;
  if (dryRun) return `${outRel} (dry run)`;
  mkdirSync(dirname(out), { recursive: true });

  if (isFullFrame(entry)) {
    // Never upscale: a 1536 × 1024 generation stays at its native size (SPEC §15.2 item 4
    // asks for about 1 MB; the 2× target only applies when the tool produced it).
    const meta = await sharp(raw).metadata();
    const w = Math.min(targetW, meta.width ?? targetW);
    const h = Math.round((w * targetH) / targetW);
    const info = await sharp(raw)
      .resize(w, h, { fit: 'cover' })
      .png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 })
      .toFile(out);
    entry.path = outRel;
    entry.size = [info.width, info.height];
    return `${outRel} ${info.width}×${info.height} ${(statSync(out).size / 1024).toFixed(0)} KB`;
  }

  const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cut = cutOut(data, info.width, info.height);
  const pivotRatio = entry.pivot
    ? [entry.pivot[0] / entry.size[0], entry.pivot[1] / entry.size[1]]
    : null;
  const cropped = sharp(cut.data, { raw: { width: cut.width, height: cut.height, channels: 4 } })
    .extract(cut.box)
    .png();
  const croppedBuffer = await cropped.toBuffer();
  const result = await sharp(croppedBuffer)
    .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: true })
    .png({ palette: true, quality: 92, compressionLevel: 9, effort: 8 })
    .toFile(out);
  entry.path = outRel;
  entry.size = [result.width, result.height];
  if (pivotRatio) {
    entry.pivot = [
      Math.round(pivotRatio[0]! * result.width),
      Math.round(pivotRatio[1]! * result.height),
    ];
  }

  // Tile copy for the panel (SPEC §15.2 item 3): the cut-out fitted into 360 × 360.
  const tileId = Object.keys(manifest.assets).find(
    (tid) => manifest.assets[tid]!.derivedFrom === id && manifest.assets[tid]!.category === 'tile',
  );
  let tileNote = '';
  if (tileId) {
    const tile = manifest.assets[tileId]!;
    const tileRel = `${tileId}.png`;
    const tileOut = assetFile(tileRel);
    mkdirSync(dirname(tileOut), { recursive: true });
    const inner = TILE_SIZE - 2 * TILE_MARGIN;
    const fitted = await sharp(croppedBuffer)
      .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
      .toBuffer({ resolveWithObject: true });
    await sharp({
      create: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: fitted.data,
          left: Math.round((TILE_SIZE - fitted.info.width) / 2),
          top: Math.round((TILE_SIZE - fitted.info.height) / 2),
        },
      ])
      .png({ palette: true, quality: 92, compressionLevel: 9, effort: 8 })
      .toFile(tileOut);
    tile.path = tileRel;
    tile.size = [TILE_SIZE, TILE_SIZE];
    tileNote = `, tile → ${tileRel}`;
  }
  return `${outRel} ${result.width}×${result.height} ${(statSync(out).size / 1024).toFixed(0)} KB${tileNote}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readManifest();
  let candidates = Object.entries(manifest.assets).filter(
    ([id, e]) => e.gen && e.gen.status !== 'approved' && existsSync(rawPath(id)),
  );
  if (args.only.length) candidates = candidates.filter(([id]) => args.only.includes(id));
  else if (!args.force) candidates = candidates.filter(([, e]) => e.path.endsWith('.svg'));

  if (candidates.length === 0) {
    console.log('post-assets: nothing to process');
    return;
  }
  console.log(`post-assets: ${candidates.length} asset(s)`);
  let failures = 0;
  for (const [id, entry] of candidates) {
    process.stdout.write(`- ${id} ... `);
    try {
      const note = await processEntry(id, entry, manifest, args.dryRun);
      if (!args.dryRun && entry.gen && entry.gen.status === 'placeholder') {
        entry.gen.status = 'generated';
        entry.gen.generatedAt ??= new Date().toISOString();
      }
      console.log(note);
    } catch (err) {
      failures++;
      console.log(`FAILED: ${(err as Error).message}`);
    }
    if (!args.dryRun) {
      // Merge into a fresh read so a generator running alongside never loses its writes.
      const fresh = readManifest();
      for (const tid of [
        id,
        ...Object.keys(fresh.assets).filter((k) => fresh.assets[k]!.derivedFrom === id),
      ]) {
        const updated = manifest.assets[tid];
        const target = fresh.assets[tid];
        if (!updated || !target) continue;
        target.path = updated.path;
        target.size = updated.size;
        if (updated.pivot) target.pivot = updated.pivot;
        if (target.gen && updated.gen) target.gen.status = updated.gen.status;
      }
      writeManifest(fresh);
    }
  }
  if (failures) process.exit(1);
}

await main();
