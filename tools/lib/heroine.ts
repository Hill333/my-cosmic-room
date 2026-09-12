/**
 * Heroine compositing shared by the tools (post-assets for the wardrobe tiles, heroine-matrix
 * for the review sheet): places an overlay on the 600 × 900 figure canvas exactly as
 * components/Heroine.tsx renders it, including the ankle clip of `clipAtAnkle` shoes.
 */
import sharp from 'sharp';
import type { Anchor, AssetEntry, AssetManifest } from '../../src/assetTypes.ts';
import { overlayBox, overlayClipTop } from '../../src/catalog/heroine.ts';
import { HEROINE_CANVAS } from '../manifest-data.ts';
import { assetFile } from './manifest.ts';

export interface Placement {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Canvas y above which nothing of the overlay is drawn (a `clipAtAnkle` shoe). */
  clipTop?: number;
}

/** Where an overlay lands on the figure canvas, in whole px (the renderer's overlayBox). */
export function overlayPlacement(anchor: Anchor, overlay: AssetEntry): Placement {
  const box = overlayBox(anchor, overlay);
  const place: Placement = {
    left: Math.round(box.left),
    top: Math.round(box.top),
    width: Math.max(1, Math.round(box.width)),
    height: Math.max(1, Math.round(box.height)),
  };
  const clipTop = overlayClipTop(anchor, overlay);
  if (clipTop !== null) place.clipTop = Math.round(clipTop);
  return place;
}

/** A transparent 600 × 900 canvas with the overlay placed on it (clipped to the canvas). */
export async function overlayCanvas(overlayFile: string, place: Placement): Promise<Buffer> {
  const [w, h] = HEROINE_CANVAS;
  const resized = await sharp(overlayFile)
    .resize(place.width, place.height, { fit: 'fill' })
    .png()
    .toBuffer();
  const left = Math.max(0, place.left);
  const top = Math.max(0, place.top, place.clipTop ?? 0);
  const right = Math.min(w, place.left + place.width);
  const bottom = Math.min(h, place.top + place.height);
  const empty = sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  if (right <= left || bottom <= top) return empty.png().toBuffer();
  const visible = await sharp(resized)
    .extract({
      left: left - place.left,
      top: top - place.top,
      width: right - left,
      height: bottom - top,
    })
    .png()
    .toBuffer();
  return empty
    .composite([{ input: visible, left, top }])
    .png()
    .toBuffer();
}

/** The figure with the shoe overlay composited at its feet anchor, as a 600 × 900 PNG. */
export async function composeHeroine(
  manifest: AssetManifest,
  figureId: string,
  shoeId: string,
): Promise<Buffer> {
  const figure = manifest.assets[figureId]!;
  const shoe = manifest.assets[shoeId]!;
  const anchor = figure.anchors!.feet;
  const shoes = await overlayCanvas(assetFile(shoe.path), overlayPlacement(anchor, shoe));
  return sharp(assetFile(figure.path))
    .composite([{ input: shoes, left: 0, top: 0 }])
    .png()
    .toBuffer();
}
