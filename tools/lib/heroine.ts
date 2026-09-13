/**
 * Heroine compositing shared by the tools (post-assets for the wardrobe tiles, heroine-matrix
 * for the review sheet): places an overlay on the 600 × 900 figure canvas exactly as
 * components/Heroine.tsx renders it, including the two per-leg halves of a shoe, the ankle
 * clip of `clipAtAnkle` shoes and the outline drawn along the clip line.
 */
import sharp, { type OverlayOptions } from 'sharp';
import type { Anchor, AssetEntry, AssetManifest } from '../../src/assetTypes.ts';
import { ANKLE_CUFF, ANKLE_CUFF_COLOUR, overlayParts } from '../../src/catalog/heroine.ts';
import { HEROINE_CANVAS } from '../manifest-data.ts';
import { assetFile } from './manifest.ts';

export interface Placement {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Canvas y above which nothing of the overlay is drawn (a `clipAtAnkle` shoe). */
  clipTop?: number;
  /** Which half of the overlay this placement shows, split at the pivot column. */
  half?: 'left' | 'right';
  /** Overlay x of the split between the halves, as a fraction of its width. */
  split?: number;
}

/** Where the parts of an overlay land on the figure canvas, in whole px (the renderer's boxes). */
export function overlayPlacements(anchor: Anchor, overlay: AssetEntry): Placement[] {
  const [ow] = overlay.size;
  const [px] = overlay.pivot ?? [ow / 2];
  return overlayParts(anchor, overlay).map(({ box, clipTop, half }) => {
    const place: Placement = {
      left: Math.round(box.left),
      top: Math.round(box.top),
      width: Math.max(1, Math.round(box.width)),
      height: Math.max(1, Math.round(box.height)),
    };
    if (clipTop !== null) place.clipTop = Math.round(clipTop);
    if (half) {
      place.half = half;
      place.split = px / ow;
    }
    return place;
  });
}

const cuffRgb = (() => {
  const hex = ANKLE_CUFF_COLOUR.slice(1);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
})();

/** A transparent 600 × 900 canvas with the overlay's parts placed on it (clipped to the canvas). */
export async function overlayCanvas(overlayFile: string, places: Placement[]): Promise<Buffer> {
  const [w, h] = HEROINE_CANVAS;
  const layers: OverlayOptions[] = [];
  for (const place of places) {
    const resized = await sharp(overlayFile)
      .resize(place.width, place.height, { fit: 'fill' })
      .png()
      .toBuffer();
    const splitX = place.left + Math.round((place.split ?? 0.5) * place.width);
    const left = Math.max(0, place.left, place.half === 'right' ? splitX : 0);
    const top = Math.max(0, place.top, place.clipTop ?? 0);
    const right = Math.min(w, place.left + place.width, place.half === 'left' ? splitX : w);
    const bottom = Math.min(h, place.top + place.height);
    if (right <= left || bottom <= top) continue;
    const region = {
      left: left - place.left,
      top: top - place.top,
      width: right - left,
      height: bottom - top,
    };
    layers.push({ input: await sharp(resized).extract(region).png().toBuffer(), left, top });
    if (place.clipTop !== undefined && place.clipTop > place.top && place.clipTop < bottom) {
      // The cuff outline: the band under the clip line, in the overlay's own alpha.
      const band = { ...region, height: Math.min(ANKLE_CUFF, bottom - top) };
      const { data, info } = await sharp(resized)
        .extract(band)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let i = 0; i < data.length; i += 4) {
        data[i] = cuffRgb[0];
        data[i + 1] = cuffRgb[1];
        data[i + 2] = cuffRgb[2];
      }
      layers.push({
        input: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
          .png()
          .toBuffer(),
        left,
        top,
      });
    }
  }
  const empty = sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  if (!layers.length) return empty.png().toBuffer();
  return empty.composite(layers).png().toBuffer();
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
  const shoes = await overlayCanvas(assetFile(shoe.path), overlayPlacements(anchor, shoe));
  return sharp(assetFile(figure.path))
    .composite([{ input: shoes, left: 0, top: 0 }])
    .png()
    .toBuffer();
}
