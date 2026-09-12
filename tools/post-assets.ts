/**
 * Post-processing of generated art (SPEC §15.6): background removal, crop to the silhouette
 * with 8 px padding, resize to the manifest size, PNG compression and the tile copy for the
 * panel. Reads assets/.gen/<id>.png and writes assets/<theme>/<category>/<name>.png, then
 * updates the manifest entry's path, size and pivot. Not part of the app bundle.
 *
 *   node tools/post-assets.ts [--only <id>...] [--force] [--reset-anchors] [--tiles] [--dry-run]
 *
 * Without --only every entry whose gen.status is 'generated' and whose raw file exists is
 * processed once (entries already pointing at a PNG are skipped unless --force). Entries
 * marked 'approved' are never touched.
 *
 * Heroine art (SPEC §4.5): a figure is cut out and normalised onto the 600 × 900 canvas, feet
 * on the bottom edge, centred; its anchors get a proportional guess the first time (or with
 * --reset-anchors) and are otherwise kept, since they are tuned by hand. The figure's own
 * white socks and feet are erased below the ankle cut (`anchors.feet.cutY`, guessed from the
 * sock silhouette the first time) and its legs extruded a little way down behind the shoes,
 * so a narrow shoe overlay never has socks or feet peeking out around it. Shoes, extras and
 * faces are cut out and fitted to their manifest size (faces get a soft elliptical edge).
 * Wardrobe tiles are cropped views of the figure: torso for outfits and the backpack, head for
 * hair and clips, feet for shoes, with the overlay composited at its anchor. --tiles re-derives
 * every heroine tile from the current files.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import type {
  Anchor,
  AssetEntry,
  AssetManifest,
  FigureAnchors,
  TileCrop,
} from '../src/assetTypes.ts';
import { defaultHeroine, figureId, requireItem } from '../src/catalog/index.ts';
import { overlayCanvas, overlayPlacement } from './lib/heroine.ts';
import { ASSETS_DIR, assetFile, readManifest, writeManifest } from './lib/manifest.ts';
import { DEFAULT_ANCHORS, FACE_SIZE, HEROINE_CANVAS } from './manifest-data.ts';

const PADDING = 8;
/** Channels at or above this value count as the plain white background. */
const WHITE = 236;
/** Boundary pixels lighter than this get a partial alpha (anti-aliased edges). */
const FEATHER_FROM = 190;
const TILE_SIZE = 360;
const TILE_MARGIN = 20;
/** Face overlays keep this vertical band of the generated skin oval (eyebrows to mouth). */
const FACE_BAND: [number, number] = [0.05, 0.97];
/** Normalised radius where the face patch starts fading out. */
const FACE_FEATHER_FROM = 0.9;
/** Channels at or above this value count as the white of the figure's socks. */
const SOCK_WHITE = 225;
/** A row with at least this many sock-white pixels is part of the socks. */
const SOCK_ROW = 6;
/** The ankle cut sits this far above the first skin row over the socks (clears the sock outline). */
const CUT_ABOVE_SOCKS = 2;
/** Channels all below this value are an outline, not skin or cloth. */
const OUTLINE_DARK = 120;
/** Margin the cut keeps above a hem outline it had to move over. */
const CUT_ABOVE_OUTLINE = 4;
/** Rows just above the cut that are averaged into the extruded leg. */
const LEG_SAMPLE_ROWS = 3;
/** How far the legs are extruded below the cut, behind the shoe overlay, and the fade at the end. */
const LEG_EXTRUDE = 50;
const LEG_EXTRUDE_FADE = 8;

interface Args {
  only: string[];
  force: boolean;
  dryRun: boolean;
  resetAnchors: boolean;
  tiles: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { only: [], force: false, dryRun: false, resetAnchors: false, tiles: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--only') args.only.push(argv[++i] ?? '');
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--reset-anchors') args.resetAnchors = true;
    else if (a === '--tiles') args.tiles = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

const BASE_FIGURE = figureId(
  requireItem(defaultHeroine.outfit).art.figure!,
  requireItem(defaultHeroine.hair).art.figure!,
);

function isFigure(entry: AssetEntry): boolean {
  return entry.category === 'heroine' && entry.layer === 'figure';
}

function isOverlay(entry: AssetEntry): boolean {
  return entry.layer === 'shoes' || entry.layer === 'extra' || entry.layer === 'face';
}

/**
 * Proportional guess of a figure's anchors from where the girl lands on the canvas (she is
 * bottom-aligned and centred; `top` and `height` are her silhouette's): the default anchors
 * stretched over her height. Tuned by hand later.
 */
function guessAnchors(top: number, height: number, padding = 0): FigureAnchors {
  const [w, h] = HEROINE_CANVAS;
  const y = (canvasY: number) => Math.round(top + (height * canvasY) / h);
  const at = (a: Anchor, yy: number): Anchor => ({ x: w / 2, y: yy, scale: a.scale });
  return {
    face: at(DEFAULT_ANCHORS.face, y(DEFAULT_ANCHORS.face.y)),
    head: at(DEFAULT_ANCHORS.head, y(DEFAULT_ANCHORS.head.y)),
    feet: at(DEFAULT_ANCHORS.feet, h - Math.round(padding)),
    back: at(DEFAULT_ANCHORS.back, y(DEFAULT_ANCHORS.back.y)),
  };
}

/** Square crop of the figure canvas a wardrobe tile shows, in figure px. */
function tileCropBox(crop: TileCrop, anchors: FigureAnchors) {
  const [w, h] = HEROINE_CANVAS;
  const clampBox = (cx: number, cy: number, size: number) => {
    const left = Math.round(Math.min(Math.max(0, cx - size / 2), w - size));
    const top = Math.round(Math.min(Math.max(0, cy - size / 2), h - size));
    return { left, top, width: size, height: size };
  };
  switch (crop) {
    case 'torso':
      return clampBox(w / 2, (anchors.face.y + 80 + anchors.feet.y - 160) / 2, 480);
    case 'head':
      return clampBox(anchors.head.x, anchors.face.y - 40, 340);
    case 'feet':
      return clampBox(anchors.feet.x, anchors.feet.y - 115, 250);
  }
}

/** Alpha falls off smoothly towards the edge of the overlay's ellipse (face patches). */
function featherEllipse(data: Buffer, width: number, height: number, from = 0.72): void {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / (width / 2);
      const ny = (y - cy) / (height / 2);
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r <= from) continue;
      const k = Math.max(0, Math.min(1, (1 - r) / (1 - from)));
      const i = (y * width + x) * 4 + 3;
      data[i] = Math.round(data[i]! * k);
    }
  }
}

function pngOptions() {
  return { palette: true, quality: 92, compressionLevel: 9, effort: 8 } as const;
}

async function tileFromBuffer(input: Buffer, tileOut: string): Promise<void> {
  const inner = TILE_SIZE - 2 * TILE_MARGIN;
  const fitted = await sharp(input)
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
    .png(pngOptions())
    .toFile(tileOut);
}

/**
 * Derives one heroine wardrobe tile (SPEC §4.4) from the current files: a crop of the figure it
 * derives from, or of the default figure with the overlay composited at its anchor. Returns a
 * note, or null when the inputs are still placeholders (the tile keeps its placeholder).
 */
async function deriveHeroineTile(tileId: string, manifest: AssetManifest): Promise<string | null> {
  const tile = manifest.assets[tileId]!;
  const source = manifest.assets[tile.derivedFrom!];
  if (!source || !tile.tileCrop || !source.path.endsWith('.png')) return null;
  const tileRel = `${tileId}.png`;
  const tileOut = assetFile(tileRel);
  mkdirSync(dirname(tileOut), { recursive: true });
  const [, h] = HEROINE_CANVAS;
  let layered: Buffer;
  let figure: AssetEntry;
  if (isFigure(source)) {
    figure = source;
    layered = await sharp(assetFile(figure.path)).png().toBuffer();
  } else {
    const base = manifest.assets[BASE_FIGURE];
    const overlayFile = assetFile(source.path);
    if (!base || !base.path.endsWith('.png') || !base.anchors) {
      // No figure to show it on yet: the overlay alone, fitted into the tile.
      await tileFromBuffer(await sharp(overlayFile).toBuffer(), tileOut);
      tile.path = tileRel;
      tile.size = [TILE_SIZE, TILE_SIZE];
      return `${tileRel} (overlay only)`;
    }
    figure = base;
    const canvas = await overlayCanvas(
      overlayFile,
      overlayPlacement(base.anchors[source.anchor ?? 'feet'], source),
    );
    const figureBuffer = await sharp(assetFile(base.path)).png().toBuffer();
    layered =
      source.anchor === 'back'
        ? await sharp(canvas)
            .composite([{ input: figureBuffer, left: 0, top: 0 }])
            .png()
            .toBuffer()
        : await sharp(figureBuffer)
            .composite([{ input: canvas, left: 0, top: 0 }])
            .png()
            .toBuffer();
  }
  const anchors = figure.anchors ?? guessAnchors(0, h);
  const box = tileCropBox(tile.tileCrop, anchors);
  const cropped = await sharp(layered).extract(box).png().toBuffer();
  await tileFromBuffer(cropped, tileOut);
  tile.path = tileRel;
  tile.size = [TILE_SIZE, TILE_SIZE];
  return tileRel;
}

/** Tiles that show a figure or overlay: theirs, plus every overlay tile when the base figure changes. */
function dependentTiles(id: string, manifest: AssetManifest): string[] {
  const ids = Object.keys(manifest.assets).filter((tid) => {
    const t = manifest.assets[tid]!;
    if (t.category !== 'tile' || !t.tileCrop) return false;
    if (t.derivedFrom === id) return true;
    const src = manifest.assets[t.derivedFrom!];
    return id === BASE_FIGURE && src !== undefined && isOverlay(src);
  });
  return ids;
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

/**
 * Guesses the ankle cut of a normalised figure from its silhouette: scanning up from the
 * soles, the socks are the rows with plain white in them and the first run of rows without
 * any is the skin (or a trouser hem) above them. The cut goes just above the sock's outline,
 * and moves further up when the rows the leg is extruded from still hold an outline (a pyjama
 * hem sitting right on the sock), so the extrusion continues the leg or the cuff, never a line.
 */
function guessAnkleCut(data: Buffer, width: number, height: number): number {
  const opaque = (i: number) => data[i * 4 + 3]! > 128;
  const whiteInRow = (y: number) => {
    let n = 0;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (
        opaque(i) &&
        data[i * 4]! >= SOCK_WHITE &&
        data[i * 4 + 1]! >= SOCK_WHITE &&
        data[i * 4 + 2]! >= SOCK_WHITE
      )
        n++;
    }
    return n;
  };
  /** Whether the row has an outline-dark pixel away from the silhouette's edges. */
  const darkInside = (y: number) => {
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const on = x < width && opaque(y * width + x);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        const margin = Math.round((x - start) * 0.25);
        for (let xx = start + margin; xx < x - margin; xx++) {
          const i = (y * width + xx) * 4;
          if (Math.max(data[i]!, data[i + 1]!, data[i + 2]!) < OUTLINE_DARK) return true;
        }
        start = -1;
      }
    }
    return false;
  };
  let seenSocks = false;
  let bare = 0;
  let cut = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    if (whiteInRow(y) >= SOCK_ROW) {
      seenSocks = true;
      bare = 0;
      continue;
    }
    if (!seenSocks) continue;
    bare++;
    if (bare === 3) {
      cut = y + 2 - CUT_ABOVE_SOCKS;
      break;
    }
  }
  const sampleHasOutline = (c: number) => {
    for (let y = Math.max(0, c - LEG_SAMPLE_ROWS); y < c; y++) if (darkInside(y)) return true;
    return false;
  };
  let clean = cut;
  while (clean > LEG_SAMPLE_ROWS && sampleHasOutline(clean)) clean--;
  return clean === cut ? cut : clean - CUT_ABOVE_OUTLINE;
}

/**
 * Erases the figure below the ankle cut and extrudes the legs down behind the shoes: every
 * row from the cut down is the average of the rows just above it, fading out at the end.
 * Whatever shoe overlay is worn then only ever meets the leg, never the figure's own socks.
 */
function cutAnkles(data: Buffer, width: number, height: number, cutY: number): void {
  const sample = new Float32Array(width * 4);
  const from = Math.max(0, cutY - LEG_SAMPLE_ROWS);
  const rows = cutY - from;
  for (let y = from; y < cutY; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3]! / 255;
      // Premultiplied average so transparent neighbours do not darken the edge.
      sample[x * 4] = sample[x * 4]! + data[i]! * a;
      sample[x * 4 + 1] = sample[x * 4 + 1]! + data[i + 1]! * a;
      sample[x * 4 + 2] = sample[x * 4 + 2]! + data[i + 2]! * a;
      sample[x * 4 + 3] = sample[x * 4 + 3]! + a;
    }
  }
  for (let y = cutY; y < height; y++) {
    const t = y - cutY;
    const fade = t >= LEG_EXTRUDE ? 0 : Math.min(1, (LEG_EXTRUDE - t) / LEG_EXTRUDE_FADE);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = rows ? sample[x * 4 + 3]! / rows : 0;
      if (a <= 0 || fade <= 0) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
        continue;
      }
      const sum = sample[x * 4 + 3]!;
      data[i] = Math.round(sample[x * 4]! / sum);
      data[i + 1] = Math.round(sample[x * 4 + 1]! / sum);
      data[i + 2] = Math.round(sample[x * 4 + 2]! / sum);
      data[i + 3] = Math.round(a * fade * 255);
    }
  }
}

async function processEntry(
  id: string,
  entry: AssetEntry,
  manifest: AssetManifest,
  args: Args,
): Promise<string> {
  const raw = rawPath(id);
  const outRel = `${id}.png`;
  const out = assetFile(outRel);
  const [targetW, targetH] = entry.size;
  if (args.dryRun) return `${outRel} (dry run)`;
  mkdirSync(dirname(out), { recursive: true });

  if (isFigure(entry)) {
    // Heroine figure (SPEC §4.5): cut out, fit inside the canvas, feet on the bottom edge.
    const [w, h] = HEROINE_CANVAS;
    const { data, info } = await sharp(raw)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cut = cutOut(data, info.width, info.height);
    const cropped = await sharp(cut.data, {
      raw: { width: cut.width, height: cut.height, channels: 4 },
    })
      .extract(cut.box)
      .png()
      .toBuffer();
    const fitted = await sharp(cropped)
      .resize(w, h, { fit: 'inside', withoutEnlargement: false })
      .toBuffer({ resolveWithObject: true });
    const left = Math.round((w - fitted.info.width) / 2);
    const top = h - fitted.info.height;
    const canvas = await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: fitted.data, left, top }])
      .raw()
      .toBuffer();
    const firstTime = !entry.path.endsWith('.png');
    if (firstTime || args.resetAnchors || !entry.anchors) {
      // The cut-out keeps PADDING px under the soles; the feet anchor sits on the soles.
      const bottomPad = PADDING * (fitted.info.height / cut.box.height);
      entry.anchors = guessAnchors(top, fitted.info.height, bottomPad);
    }
    // The ankle cut is guessed from the socks once and then kept (tuned in ?debug=heroine).
    entry.anchors.feet.cutY ??= guessAnkleCut(canvas, w, h);
    cutAnkles(canvas, w, h, entry.anchors.feet.cutY);
    await sharp(canvas, { raw: { width: w, height: h, channels: 4 } })
      .png(pngOptions())
      .toFile(out);
    entry.path = outRel;
    entry.size = [w, h];
    const notes: string[] = [];
    for (const tid of dependentTiles(id, manifest)) {
      const note = await deriveHeroineTile(tid, manifest);
      if (note) notes.push(note);
    }
    return `${outRel} ${w}×${h} (figure ${fitted.info.width}×${fitted.info.height}, ankle cut ${entry.anchors.feet.cutY}) ${(statSync(out).size / 1024).toFixed(0)} KB${notes.length ? ', tiles → ' + notes.join(', ') : ''}`;
  }

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
  let result: { width: number; height: number };
  if (entry.layer === 'face') {
    // Face overlay: the generated skin oval is trimmed to the band from the eyebrows to the
    // mouth (so it never tints the fringe or the neck), fitted to its box and feathered so the
    // patch melts into the figure's face.
    const meta = await sharp(croppedBuffer).metadata();
    const top = Math.round(meta.height! * FACE_BAND[0]);
    const band = await sharp(croppedBuffer)
      .extract({
        left: 0,
        top,
        width: meta.width!,
        height: Math.round(meta.height! * FACE_BAND[1]) - top,
      })
      .toBuffer();
    // The target is the fixed box from manifest-data, not the entry's last measured size, so
    // reprocessing with --force is idempotent.
    const fitted = await sharp(band)
      .resize(FACE_SIZE[0], FACE_SIZE[1], { fit: 'inside', withoutEnlargement: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    featherEllipse(fitted.data, fitted.info.width, fitted.info.height, FACE_FEATHER_FROM);
    result = await sharp(fitted.data, {
      raw: { width: fitted.info.width, height: fitted.info.height, channels: 4 },
    })
      .png(pngOptions())
      .toFile(out);
  } else {
    result = await sharp(croppedBuffer)
      .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: !isOverlay(entry) })
      .png(pngOptions())
      .toFile(out);
  }
  entry.path = outRel;
  entry.size = [result.width, result.height];
  if (pivotRatio) {
    entry.pivot = [
      Math.round(pivotRatio[0]! * result.width),
      Math.round(pivotRatio[1]! * result.height),
    ];
  }
  if (isOverlay(entry)) {
    const notes: string[] = [];
    for (const tid of dependentTiles(id, manifest)) {
      const note = await deriveHeroineTile(tid, manifest);
      if (note) notes.push(note);
    }
    return `${outRel} ${result.width}×${result.height} ${(statSync(out).size / 1024).toFixed(0)} KB${notes.length ? ', tile → ' + notes.join(', ') : ''}`;
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
  if (args.tiles) {
    const tiles = Object.keys(manifest.assets).filter((tid) => manifest.assets[tid]!.tileCrop);
    console.log(`post-assets: ${tiles.length} heroine tile(s)`);
    for (const tid of tiles) {
      process.stdout.write(`- ${tid} ... `);
      try {
        console.log((await deriveHeroineTile(tid, manifest)) ?? 'skipped (placeholder inputs)');
      } catch (err) {
        console.log(`FAILED: ${(err as Error).message}`);
      }
    }
    if (!args.dryRun) {
      const fresh = readManifest();
      for (const tid of tiles) {
        fresh.assets[tid]!.path = manifest.assets[tid]!.path;
        fresh.assets[tid]!.size = manifest.assets[tid]!.size;
      }
      writeManifest(fresh);
    }
    return;
  }
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
      const note = await processEntry(id, entry, manifest, args);
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
        ...dependentTiles(id, fresh),
      ]) {
        const updated = manifest.assets[tid];
        const target = fresh.assets[tid];
        if (!updated || !target) continue;
        target.path = updated.path;
        target.size = updated.size;
        if (updated.pivot) target.pivot = updated.pivot;
        if (updated.anchors) target.anchors = updated.anchors;
        if (target.gen && updated.gen) target.gen.status = updated.gen.status;
      }
      writeManifest(fresh);
    }
  }
  if (failures) process.exit(1);
}

await main();
