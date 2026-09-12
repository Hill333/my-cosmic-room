/**
 * Derives the S0 room-card thumbnails from the two room backgrounds (SPEC §16.3: the title
 * screen must not pull both full 1536 × 1024 backgrounds before it paints): 960 × 640 WebP
 * copies in assets/<theme>/room/thumb.webp, recorded in the manifest as derived entries.
 *
 *   node tools/gen-thumbs.ts
 *
 * Re-run after a room background is regenerated. Deterministic for the same input.
 */
import { statSync } from 'node:fs';
import sharp from 'sharp';
import { assetFile, readManifest, writeManifest } from './lib/manifest.ts';

export const THUMB_SIZE: [number, number] = [960, 640];

const manifest = readManifest();
for (const theme of ['space', 'sweet'] as const) {
  const source = manifest.assets[`${theme}/room/background`];
  const entry = manifest.assets[`${theme}/room/thumb`];
  if (!source || !entry) throw new Error(`Run tools/build-manifest.ts first (${theme})`);
  const target = assetFile(entry.path);
  await sharp(assetFile(source.path))
    .resize(THUMB_SIZE[0], THUMB_SIZE[1], { fit: 'cover' })
    .webp({ quality: 82, effort: 6 })
    .toFile(target);
  entry.size = THUMB_SIZE;
  console.log(`${entry.path}: ${(statSync(target).size / 1024).toFixed(0)} KB`);
}
writeManifest(manifest);
