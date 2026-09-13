import { assetEntry, assetUrl } from '../../assets.ts';
import type { AnchorKind } from '../../assetTypes.ts';
import { FALLBACK_ANCHORS, overlayStyles } from '../../catalog/heroine.ts';
import { defaultHeroine, heroineFigure, requireItem } from '../../catalog/index.ts';
import type { HeroineState } from '../../core/types.ts';
import { save } from '../../state/store.ts';

export type Face = 'neutral' | 'happy' | 'thinking' | 'cheering';

interface Props {
  face?: Face;
  /** Explicit layers (S5 preview); defaults to the saved heroine. */
  heroine?: HeroineState | undefined;
}

/**
 * Heroine (SPEC §4.5): one raster figure per outfit × hairstyle (neutral face, white socks)
 * with overlays snapped to the figure's manifest anchors: shoes at the feet, an extra at the
 * head or behind the back, and a face overlay for the happy / thinking / cheering
 * expressions. A shoe overlay is drawn as two halves, one per leg, and a shoe clipped at the
 * ankle gets an outline along the clip line (a `heroine-cuff` span filled through the shoe's
 * own alpha as a CSS mask). The `data-*` attributes name the worn items for tests and styling.
 */
export function HeroinePreview({ face = 'neutral', heroine }: Props) {
  const h = heroine ?? save.value.heroine;
  let figureId = heroineFigure(h.outfit, h.hair);
  // A figure that is still a placeholder falls back to the outfit's default-hair figure when
  // that one is real art, so an ungenerated hairstyle never shows a placeholder doll.
  if (assetEntry(figureId).path.endsWith('.svg')) {
    const fallback = heroineFigure(h.outfit, defaultHeroine.hair);
    if (!assetEntry(fallback).path.endsWith('.svg')) figureId = fallback;
  }
  const figure = assetEntry(figureId);
  const anchors = figure.anchors ?? FALLBACK_ANCHORS;
  const overlays: { id: string; cls: string }[] = [
    { id: requireItem(h.shoes).art.heroineLayer!, cls: 'heroine-shoes' },
  ];
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
      class="heroine"
      role="img"
      aria-label="Heroine"
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
