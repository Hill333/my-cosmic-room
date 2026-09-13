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
 * so a narrow shoe overlay never has socks or feet peeking out around it; the centre of each
 * leg at the cut is measured (`anchors.feet.legX`) so the shoes can be drawn one per leg.
 * White gaps enclosed between hair strands (background in the generation, walled off from
 * the border by the strands' outlines) are made transparent too. Shoes, extras and faces are
 * cut out and fitted to their manifest size (faces get a soft elliptical edge); feet overlays
 * get the centre of each foot measured (`footX`).
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
import { overlayCanvas, overlayPlacements } from './lib/heroine.ts';
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
/** An opaque run at least this wide (px) counts as a leg or a foot when measuring their centres. */
const LIMB_MIN_WIDTH = 10;
/** Hair gaps: how many px of outline or hair the search from the background may cross to reach one. */
const GAP_REACH = 24;
/** Hair gaps: largest white pocket taken for one, in px² of the generated image (socks are far bigger). */
const GAP_MAX_AREA = 1800;
/** Hair gaps: the pocket's non-outline surroundings must be within this of the hair colour, per channel. */
const GAP_HAIR_TOLERANCE = 60;
/** Hair gaps: smallest pocket worth punching, in px² of the generated image (specks in the outline stay). */
const GAP_MIN_AREA = 8;
/** Hair gaps: the surroundings are sampled this many px out from the pocket, past its anti-aliased rim. */
const GAP_RIM = 3;
/** Hair gaps: a sample this unsaturated (max minus min channel) is the rim's blend of outline and white. */
const GAP_RIM_SATURATION = 30;
/** Hair gaps: a pocket is kept when other colours outnumber the hair and rim samples by this factor. */
const GAP_OTHER_RATIO = 1.4;
/** Hair gaps: fraction of the silhouette's height, from the top, sampled for the hair colour. */
const HAIR_BAND = 0.12;
/** Hair gaps: only pockets within this fraction of the silhouette's height from the top are considered (hair ends at the chest). */
const HAIR_REGION = 0.6;

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
      overlayPlacements(base.anchors[source.anchor ?? 'feet'], source),
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
 * areas inside the object stay, except a figure's hair gaps), feathers the boundary, and
 * returns the silhouette's box.
 */
function cutOut(data: Buffer, width: number, height: number, hairGaps = false): Cutout {
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
  const neighbours = (i: number, visit: (j: number) => void) => {
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (y > 0) visit(i - width);
    if (y < height - 1) visit(i + width);
  };
  while (stack.length) neighbours(stack.pop()!, push);
  if (hairGaps) punchHairGaps(data, width, height, background, isWhite, neighbours);
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
 * Makes the white pockets enclosed between hair strands transparent. They are background in
 * the generation (the same white), but the strands' outlines wall them off from the border so
 * the flood fill never reaches them. A pocket counts when the search from the background
 * reaches it by crossing at most GAP_REACH px of outline-dark or hair-coloured pixels (a
 * strand often lies between a gap and the outside), it is small
 * (GAP_MIN_AREA to GAP_MAX_AREA), it lies in the top HAIR_REGION of the silhouette (hair
 * reaches the chest at most), and what surrounds it is hair-coloured rather than some
 * other colour (the hair colour is the median of the top HAIR_BAND of the silhouette, which
 * is hair on every figure; the surroundings are sampled GAP_RIM px out, past the pocket's
 * anti-aliased rim, and the outline and its blend with white are not counted). Eye whites
 * are enclosed by skin, socks are far larger, and white prints on the clothes (a daisy on a
 * sleeve, a cloud on the pyjamas) sit against cloth, so they all stay.
 */
function punchHairGaps(
  data: Buffer,
  width: number,
  height: number,
  background: Uint8Array,
  isWhite: (i: number) => boolean,
  neighbours: (i: number, visit: (j: number) => void) => void,
): void {
  const n = width * height;
  const isDark = (i: number) =>
    Math.max(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!) < OUTLINE_DARK;
  // The hair colour: the median colour of the top band of the silhouette, outline and white aside.
  let minY = height;
  let maxY = -1;
  for (let i = 0; i < n; i++) {
    if (background[i]) continue;
    const y = Math.floor(i / width);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxY < 0) return;
  const bandEnd = minY + Math.round((maxY - minY) * HAIR_BAND);
  const hairBottom = minY + Math.round((maxY - minY) * HAIR_REGION);
  const samples: [number[], number[], number[]] = [[], [], []];
  for (let i = minY * width; i < Math.min(n, (bandEnd + 1) * width); i++) {
    if (background[i] || isWhite(i) || isDark(i)) continue;
    for (let c = 0; c < 3; c++) samples[c]!.push(data[i * 4 + c]!);
  }
  if (!samples[0].length) return;
  const hair = samples.map((s) => s.sort((a, b) => a - b)[s.length >> 1]!);
  const isHair = (i: number) =>
    [0, 1, 2].every((c) => Math.abs(data[i * 4 + c]! - hair[c]!) <= GAP_HAIR_TOLERANCE);

  // Breadth-first from the background through outline and hair pixels, at most GAP_REACH deep.
  const passable = (i: number) => isDark(i) || isHair(i);
  const seen = new Uint8Array(n);
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!background[i]) continue;
    neighbours(i, (j) => {
      if (!background[j] && !seen[j] && passable(j)) {
        seen[j] = 1;
        frontier.push(j);
      }
    });
  }
  const pocket = new Uint8Array(n);
  for (let depth = 1; depth <= GAP_REACH && frontier.length; depth++) {
    const next: number[] = [];
    for (const i of frontier) {
      neighbours(i, (j) => {
        if (background[j] || seen[j]) return;
        if (passable(j)) {
          seen[j] = 1;
          next.push(j);
          return;
        }
        if (!isWhite(j) || pocket[j]) return;
        // A white pocket: flood it, then judge it by its size and its surroundings.
        const members = [j];
        pocket[j] = 1;
        for (let k = 0; k < members.length; k++) {
          neighbours(members[k]!, (m) => {
            if (!background[m] && !pocket[m] && isWhite(m)) {
              pocket[m] = 1;
              members.push(m);
            }
          });
        }
        if (members.length > GAP_MAX_AREA || members.length < GAP_MIN_AREA) return;
        if (members.some((m) => Math.floor(m / width) > hairBottom)) return;
        // Sample the surroundings past the rim: the outline does not count, its blend with
        // white counts with the hair, and the pocket is a gap unless a different colour
        // (cloth, skin) clearly outweighs them (light strands fall outside the hair tolerance).
        let hairEdge = 0;
        let rimEdge = 0;
        let otherEdge = 0;
        for (const m of members) {
          const x = m % width;
          const y = (m - x) / width;
          for (const [dx, dy] of [
            [GAP_RIM, 0],
            [-GAP_RIM, 0],
            [0, GAP_RIM],
            [0, -GAP_RIM],
          ]) {
            const xx = x + dx!;
            const yy = y + dy!;
            if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
            const e = yy * width + xx;
            if (background[e] || pocket[e] || isDark(e)) continue;
            const r = data[e * 4]!;
            const g = data[e * 4 + 1]!;
            const b = data[e * 4 + 2]!;
            if (Math.min(r, g, b) > FEATHER_FROM) continue; // the pocket's own rim
            if (Math.max(r, g, b) - Math.min(r, g, b) < GAP_RIM_SATURATION) rimEdge++;
            else if (isHair(e)) hairEdge++;
            else otherEdge++;
          }
        }
        if (otherEdge > GAP_OTHER_RATIO * (hairEdge + rimEdge)) return;
        for (const m of members) background[m] = 1;
      });
    }
    frontier = next;
  }
}

/** Centres of the opaque runs (at least LIMB_MIN_WIDTH wide) across a row: the legs or feet. */
function limbCentres(data: Buffer, width: number, y: number): number[] {
  const centres: number[] = [];
  let start = -1;
  for (let x = 0; x <= width; x++) {
    const on = x < width && data[(y * width + x) * 4 + 3]! > 128;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      if (x - start >= LIMB_MIN_WIDTH) centres.push((start + x - 1) / 2);
      start = -1;
    }
  }
  return centres;
}

/**
 * The centre x of the left and right leg just above the ankle cut (`anchors.feet.legX`),
 * or undefined when the rows there do not show exactly two legs.
 */
function guessLegs(data: Buffer, width: number, cutY: number): [number, number] | undefined {
  const rows: number[][] = [];
  for (let y = Math.max(0, cutY - LEG_SAMPLE_ROWS); y < cutY; y++) {
    const c = limbCentres(data, width, y);
    if (c.length === 2) rows.push(c);
  }
  if (!rows.length) return undefined;
  const mean = (i: number) => Math.round(rows.reduce((a, r) => a + r[i]!, 0) / rows.length);
  return [mean(0), mean(1)];
}

/**
 * The centre x of each foot of a processed feet overlay (`footX`): the mean over the rows that
 * show exactly two opaque runs, so the sock, the shoe and the sole all count.
 */
async function measureFeet(file: string): Promise<[number, number] | undefined> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows: number[][] = [];
  for (let y = 0; y < info.height; y++) {
    const c = limbCentres(data, info.width, y);
    if (c.length === 2) rows.push(c);
  }
  if (rows.length < info.height / 4) return undefined;
  const mean = (i: number) => Math.round(rows.reduce((a, r) => a + r[i]!, 0) / rows.length);
  return [mean(0), mean(1)];
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
    const cut = cutOut(data, info.width, info.height, true);
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
    // The leg centres are measured from the art every time (nothing to tune by hand).
    const legX = guessLegs(canvas, w, entry.anchors.feet.cutY);
    if (legX) entry.anchors.feet.legX = legX;
    else delete entry.anchors.feet.legX;
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
    return `${outRel} ${w}×${h} (figure ${fitted.info.width}×${fitted.info.height}, ankle cut ${entry.anchors.feet.cutY}, legs ${legX ? legX.join('/') : 'not found'}) ${(statSync(out).size / 1024).toFixed(0)} KB${notes.length ? ', tiles → ' + notes.join(', ') : ''}`;
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
    if ((entry.anchor ?? 'feet') === 'feet') {
      const footX = await measureFeet(out);
      if (footX) entry.footX = footX;
      else delete entry.footX;
    }
    const notes: string[] = [];
    for (const tid of dependentTiles(id, manifest)) {
      const note = await deriveHeroineTile(tid, manifest);
      if (note) notes.push(note);
    }
    return `${outRel} ${result.width}×${result.height}${entry.footX ? ` (feet ${entry.footX.join('/')})` : ''} ${(statSync(out).size / 1024).toFixed(0)} KB${notes.length ? ', tile → ' + notes.join(', ') : ''}`;
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
        if (updated.footX) target.footX = updated.footX;
        else delete target.footX;
        if (target.gen && updated.gen) target.gen.status = updated.gen.status;
      }
      writeManifest(fresh);
    }
  }
  if (failures) process.exit(1);
}

await main();
