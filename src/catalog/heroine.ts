import type { Anchor, AssetEntry, FigureAnchors } from '../assetTypes.ts';

/**
 * Heroine geometry (SPEC §4.5): the figure is a 600 × 900 raster; overlays (shoes, extras,
 * faces) snap to the figure's manifest anchors. Pure maths, shared by the renderer, the
 * `?debug=heroine` overlay and the post-processing that composites wardrobe tiles.
 */

/** Anchors of a figure entry that has none yet (a placeholder): the manifest's default guess. */
export const FALLBACK_ANCHORS: FigureAnchors = {
  face: { x: 300, y: 190, scale: 1 },
  head: { x: 300, y: 80, scale: 0.8 },
  feet: { x: 300, y: 895, scale: 0.78 },
  back: { x: 300, y: 420, scale: 0.9 },
};

/**
 * How far above the ankle cut a `clipAtAnkle` shoe overlay still shows, in figure px: enough
 * to cover the cut edge without reaching a trouser hem (the hems sit at least this far up).
 */
export const ANKLE_CLIP_OVERLAP = 12;

/**
 * Thickness in figure px of the outline drawn along the clipped top of a `clipAtAnkle` overlay
 * (the sock cuff or boot top), so the clip reads as a drawn edge and not a raw cut. Its colour
 * matches the outlines of the generated art.
 */
export const ANKLE_CUFF = 3;
export const ANKLE_CUFF_COLOUR = '#381a3e';

export interface OverlayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where an overlay lands on the figure canvas, in figure px: its pivot (bottom centre for
 * shoes, centre otherwise) on the anchor plus the overlay's own offset, sized by the anchor's
 * scale multiplier times the overlay's own.
 */
export function overlayBox(
  anchor: Anchor,
  overlay: Pick<AssetEntry, 'size' | 'pivot' | 'offset' | 'scale'>,
): OverlayBox {
  const [ow, oh] = overlay.size;
  const [px, py] = overlay.pivot ?? [ow / 2, oh / 2];
  const [dx, dy] = overlay.offset ?? [0, 0];
  const s = anchor.scale * (overlay.scale ?? 1);
  return {
    left: anchor.x + dx - px * s,
    top: anchor.y + dy - py * s,
    width: ow * s,
    height: oh * s,
  };
}

/**
 * Figure-px line above which a `clipAtAnkle` overlay is hidden (the figure's ankle cut minus
 * the overlap), or null when the overlay is not clipped or the anchor has no cut.
 */
export function overlayClipTop(
  anchor: Anchor,
  overlay: Pick<AssetEntry, 'clipAtAnkle'>,
): number | null {
  if (!overlay.clipAtAnkle || anchor.cutY === undefined) return null;
  return anchor.cutY - ANKLE_CLIP_OVERLAP;
}

/**
 * One drawn piece of an overlay: its box in figure px, the ankle clip line if any, and which
 * half of the overlay it shows. A feet overlay with `footX` on a figure with `legX` is drawn as
 * two halves split at the overlay's pivot column (the gap between the shoes), each moved
 * sideways so its foot sits on the matching leg; every other overlay is one whole part.
 */
export interface OverlayPart {
  box: OverlayBox;
  /** Figure-px line above which the part is hidden (a `clipAtAnkle` shoe), or null. */
  clipTop: number | null;
  half: 'left' | 'right' | null;
}

export function overlayParts(
  anchor: Anchor,
  overlay: Pick<AssetEntry, 'size' | 'pivot' | 'offset' | 'scale' | 'clipAtAnkle' | 'footX'>,
): OverlayPart[] {
  const box = overlayBox(anchor, overlay);
  const clipTop = overlayClipTop(anchor, overlay);
  const { footX } = overlay;
  const { legX } = anchor;
  if (!footX || !legX) return [{ box, clipTop, half: null }];
  const s = anchor.scale * (overlay.scale ?? 1);
  return (['left', 'right'] as const).map((half, i) => ({
    box: { ...box, left: legX[i]! - footX[i]! * s },
    clipTop,
    half,
  }));
}

/** A type alias (not an interface) so it is assignable to preact's CSSProperties. */
export type OverlayStyle = {
  left: string;
  top: string;
  width: string;
  height: string;
  /** Present when part of the box is hidden: the ankle clip and / or the other half. */
  clipPath?: string;
};

export interface OverlayPartStyle {
  style: OverlayStyle;
  /**
   * For a clipped part: the same box clipped to the `ANKLE_CUFF` band under the clip line,
   * to be filled with `ANKLE_CUFF_COLOUR` through the overlay's own alpha (a CSS mask).
   */
  cuff?: OverlayStyle;
}

/**
 * The parts of an overlay as CSS percentages of the figure canvas, so they scale with the
 * display size; the clips are percentages of the part's own box.
 */
export function overlayStyles(
  figureSize: readonly [number, number],
  anchor: Anchor,
  overlay: Pick<AssetEntry, 'size' | 'pivot' | 'offset' | 'scale' | 'clipAtAnkle' | 'footX'>,
): OverlayPartStyle[] {
  const [fw, fh] = figureSize;
  const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;
  const [ow] = overlay.size;
  const [px] = overlay.pivot ?? [ow / 2];
  return overlayParts(anchor, overlay).map(({ box, clipTop, half }) => {
    const style: OverlayStyle = {
      left: pct(box.left, fw),
      top: pct(box.top, fh),
      width: pct(box.width, fw),
      height: pct(box.height, fh),
    };
    // Insets are percentages of the box: top for the ankle clip, a side for the other half.
    const top =
      clipTop !== null ? Math.min(100, Math.max(0, ((clipTop - box.top) / box.height) * 100)) : 0;
    const right = half === 'left' ? (1 - px / ow) * 100 : 0;
    const left = half === 'right' ? (px / ow) * 100 : 0;
    const inset = (t: number, r: number, b: number, l: number) =>
      `inset(${t.toFixed(3)}% ${r.toFixed(3)}% ${b.toFixed(3)}% ${l.toFixed(3)}%)`;
    if (top > 0 || right > 0 || left > 0) style.clipPath = inset(top, right, 0, left);
    const part: OverlayPartStyle = { style };
    if (top > 0 && top < 100) {
      const bottom = Math.max(0, 100 - top - (ANKLE_CUFF / box.height) * 100);
      part.cuff = { ...style, clipPath: inset(top, right, bottom, left) };
    }
    return part;
  });
}
