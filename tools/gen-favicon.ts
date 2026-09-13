/**
 * Rasterises public/favicon.svg into the PNG fallbacks index.html links to: Safari and iOS
 * ignore SVG favicons, so they get a 32 px favicon and a 180 px apple-touch-icon.
 *
 *   node tools/gen-favicon.ts
 *
 * Re-run after editing favicon.svg. Deterministic for the same input.
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const svg = readFileSync(publicDir + 'favicon.svg');

// iOS paints transparent apple-touch-icon pixels black, so that one is flattened onto cream.
const targets: Array<[file: string, size: number, background?: string]> = [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180, '#fff7ee'],
];
for (const [file, size, background] of targets) {
  const target = publicDir + file;
  // Render at high density and downscale so the outlines stay crisp at small sizes.
  let image = sharp(svg, { density: 72 * (size / 64) * 4 }).resize(size, size);
  if (background) image = image.flatten({ background });
  await image.png({ compressionLevel: 9 }).toFile(target);
  console.log(`${file}: ${size} × ${size}, ${(statSync(target).size / 1024).toFixed(1)} KB`);
}
