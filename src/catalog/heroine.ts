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

/** A type alias (not an interface) so it is assignable to preact's CSSProperties. */
export type OverlayStyle = {
  left: string;
  top: string;
  width: string;
  height: string;
  /** Present for a `clipAtAnkle` overlay: hides the part above the figure's ankle cut. */
  clipPath?: string;
};

/** The same box as CSS percentages of the figure canvas, so it scales with the display size. */
export function overlayStyle(
  figureSize: readonly [number, number],
  anchor: Anchor,
  overlay: Pick<AssetEntry, 'size' | 'pivot' | 'offset' | 'scale' | 'clipAtAnkle'>,
): OverlayStyle {
  const box = overlayBox(anchor, overlay);
  const [fw, fh] = figureSize;
  const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;
  const style: OverlayStyle = {
    left: pct(box.left, fw),
    top: pct(box.top, fh),
    width: pct(box.width, fw),
    height: pct(box.height, fh),
  };
  const clipTop = overlayClipTop(anchor, overlay);
  if (clipTop !== null && clipTop > box.top) {
    // The inset is a percentage of the overlay's own box, so it scales with it.
    const inset = Math.min(100, ((clipTop - box.top) / box.height) * 100);
    style.clipPath = `inset(${inset.toFixed(3)}% 0 0 0)`;
  }
  return style;
}
