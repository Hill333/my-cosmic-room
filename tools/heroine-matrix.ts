/**
 * Contact sheet of the heroine's shoe overlays on her figures (M3b review): every outfit × shoe
 * with the buns hairstyle, plus one row of ponytail figures and one of loose figures, composited
 * exactly as components/Heroine.tsx does (figure, ankle patch, shoe at the feet anchor) and
 * scaled to the room size. Writes docs/screenshots/heroine-shoes-matrix.png; with --zoom also a
 * 1:1 close-up of the legs next to it, for checking that no sock or ankle of the figure peeks
 * out around the overlay. Not part of the app bundle.
 *
 *   node tools/heroine-matrix.ts [--out <file>] [--zoom]
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { HEROINE_GEOMETRY } from '../src/catalog/slots.ts';
import { allItems, figureId } from '../src/catalog/index.ts';
import { ROOT, readManifest } from './lib/manifest.ts';
import { composeHeroine } from './lib/heroine.ts';

const args = process.argv.slice(2);
const out = args.includes('--out')
  ? resolve(args[args.indexOf('--out') + 1]!)
  : resolve(ROOT, 'docs', 'screenshots', 'heroine-shoes-matrix.png');
const zoom = args.includes('--zoom');

const manifest = readManifest();
const outfits = allItems.filter((i) => i.kind === 'outfit').map((i) => i.art.figure!);
const shoes = allItems.filter((i) => i.kind === 'shoes').map((i) => i.art.heroineLayer!);
const exists = (id: string) => manifest.assets[id]?.path.endsWith('.png') ?? false;

/** Rows of the sheet: the figure of each cell and the shoe per column. */
const rows: { label: string; cells: { figure: string; shoe: string }[] }[] = outfits.map(
  (outfit) => ({
    label: `${outfit}-buns`,
    cells: shoes.map((shoe) => ({ figure: figureId(outfit, 'buns'), shoe })),
  }),
);
for (const hair of ['ponytail', 'loose'] as const) {
  // One row per other hairstyle: the generated figures of that hairstyle, cycling the shoes.
  const figures = outfits.map((o) => figureId(o, hair)).filter(exists);
  if (!figures.length) continue;
  rows.push({
    label: hair,
    cells: shoes.map((shoe, i) => ({ figure: figures[i % figures.length]!, shoe })),
  });
}

const scale = HEROINE_GEOMETRY.space.height / 900;
const CELL_W = Math.round(600 * scale);
const CELL_H = Math.round(900 * scale);
const GAP = 8;
const LEG_BAND = { top: 700, height: 200 };
const zoomW = zoom ? 600 + GAP : 0;
const colW = CELL_W + zoomW + GAP;
const rowH = Math.max(CELL_H, zoom ? LEG_BAND.height : 0) + GAP;
const width = GAP + shoes.length * colW;
const height = GAP + rows.length * rowH;

const layers: { input: Buffer; left: number; top: number }[] = [];
for (const [r, row] of rows.entries()) {
  for (const [c, cell] of row.cells.entries()) {
    if (!exists(cell.figure)) continue;
    const full = await composeHeroine(manifest, cell.figure, cell.shoe);
    const left = GAP + c * colW;
    const top = GAP + r * rowH;
    layers.push({
      input: await sharp(full).resize(CELL_W, CELL_H).png().toBuffer(),
      left,
      top,
    });
    if (zoom) {
      layers.push({
        input: await sharp(full)
          .extract({ left: 0, top: LEG_BAND.top, width: 600, height: LEG_BAND.height })
          .png()
          .toBuffer(),
        left: left + CELL_W + GAP,
        top,
      });
    }
  }
}
mkdirSync(dirname(out), { recursive: true });
await sharp({
  create: { width, height, channels: 4, background: { r: 132, g: 196, b: 120, alpha: 1 } },
})
  .composite(layers)
  .png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 })
  .toFile(out);
console.log(
  `${out} (${width}×${height}): rows ${rows.map((r) => r.label).join(', ')}; columns ${shoes.map((s) => s.split('/').pop()).join(', ')}`,
);
