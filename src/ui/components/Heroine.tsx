import { assetEntry, assetUrl } from '../../assets.ts';
import type { AnchorKind } from '../../assetTypes.ts';
import { FALLBACK_ANCHORS, overlayStyles } from '../../catalog/heroine.ts';
import {
  defaultHeroine,
  heroineFigure,
  heroineSitFigure,
  heroineSleepHead,
  requireItem,
} from '../../catalog/index.ts';
import type { HeroineState } from '../../core/types.ts';
import { save } from '../../state/store.ts';

export type Face = 'neutral' | 'happy' | 'thinking' | 'cheering';

interface Props {
  face?: Face;
  /** Explicit layers (S5 preview); defaults to the saved heroine. */
  heroine?: HeroineState | undefined;
  /**
   * Standing (default) or sitting cross-legged (SPEC §4.3): the sitting figure is its own
   * raster on a 600 × 600 canvas with no shoes drawn (her feet are tucked away).
   */
  pose?: 'stand' | 'sit';
}

/** Whether a manifest entry has real art (a placeholder is still an SVG). */
export function hasArt(id: string): boolean {
  return !assetEntry(id).path.endsWith('.svg');
}

/** The sitting figure to draw for a heroine, or null while it is still a placeholder. */
export function sitFigureFor(h: HeroineState): string | null {
  const id = heroineSitFigure(h.outfit, h.hair);
  return hasArt(id) ? id : null;
}

/** The sleeping head to draw for a heroine's hairstyle, or null while it is a placeholder. */
export function sleepHeadFor(h: HeroineState): string | null {
  const id = heroineSleepHead(h.hair);
  return hasArt(id) ? id : null;
}

/**
 * Heroine (SPEC §4.5): one raster figure per outfit × hairstyle (neutral face, white socks)
 * with overlays snapped to the figure's manifest anchors: shoes at the feet, an extra at the
 * head or behind the back, and a face overlay for the happy / thinking / cheering
 * expressions. A shoe overlay is drawn as two halves, one per leg, and a shoe clipped at the
 * ankle gets an outline along the clip line (a `heroine-cuff` span filled through the shoe's
 * own alpha as a CSS mask). The `data-*` attributes name the worn items for tests and styling.
 */
export function HeroinePreview({ face = 'neutral', heroine, pose = 'stand' }: Props) {
  const h = heroine ?? save.value.heroine;
  // Sitting only with real sitting art; otherwise the standing figure (the room then masks it).
  const sitting = pose === 'sit' ? sitFigureFor(h) : null;
  let figureId = sitting ?? heroineFigure(h.outfit, h.hair);
  // A figure that is still a placeholder falls back to the outfit's default-hair figure when
  // that one is real art, so an ungenerated hairstyle never shows a placeholder doll.
  if (!hasArt(figureId)) {
    const fallback = heroineFigure(h.outfit, defaultHeroine.hair);
    if (hasArt(fallback)) figureId = fallback;
  }
  const figure = assetEntry(figureId);
  const anchors = figure.anchors ?? FALLBACK_ANCHORS;
  const overlays: { id: string; cls: string }[] = [];
  if (!sitting) overlays.push({ id: requireItem(h.shoes).art.heroineLayer!, cls: 'heroine-shoes' });
  if (h.extra) overlays.push({ id: requireItem(h.extra).art.heroineLayer!, cls: 'heroine-extra' });
  if (face !== 'neutral') overlays.push({ id: `shared/heroine/face/${face}`, cls: 'heroine-face' });
  const placed = overlays.map(({ id, cls }) => {
    const entry = assetEntry(id);
    const kind: AnchorKind = entry.anchor ?? 'feet';
    return { id, cls, kind, parts: overlayStyles(figure.size, anchors[kind], entry) };
  });
  const img = (o: (typeof placed)[number]) => {
    const src = assetUrl(o.id);
    return o.parts.flatMap(({ style, cuff }, i) => {
      const nodes = [
        <img
          key={`${o.id}-${i}`}
          src={src}
          alt=""
          class={`heroine-overlay ${o.cls}`}
          data-anchor={o.kind}
          style={style}
          draggable={false}
        />,
      ];
      if (cuff)
        nodes.push(
          <span
            key={`${o.id}-${i}-cuff`}
            class="heroine-overlay heroine-cuff"
            style={{ ...cuff, '--cuff-mask': `url("${src}")` }}
          />,
        );
      return nodes;
    });
  };
  return (
    <span
      class={sitting ? 'heroine heroine-sitting' : 'heroine'}
      role="img"
      aria-label="Heroine"
      data-pose={sitting ? 'sit' : 'stand'}
      data-outfit={h.outfit}
      data-shoes={h.shoes}
      data-hair={h.hair}
      data-extra={h.extra ?? undefined}
      data-face={face}
      data-figure={figureId}
    >
      {placed.filter((o) => o.kind === 'back').flatMap(img)}
      <img src={assetUrl(figureId)} alt="" class="heroine-figure" draggable={false} />
      {placed.filter((o) => o.kind !== 'back').flatMap(img)}
    </span>
  );
}
