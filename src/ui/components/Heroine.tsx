import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import type { HeroineState } from '../../core/types.ts';
import { save } from '../../state/store.ts';

type Face = 'neutral' | 'happy' | 'thinking' | 'cheering';

interface Props {
  face?: Face;
  /** Explicit layers (S5 preview); defaults to the saved heroine. */
  heroine?: HeroineState | undefined;
}

/**
 * Layered heroine (SPEC §4.5): an optional behind layer (the rocket backpack's tank), body,
 * hair, outfit, shoes, extra and a face overlay, all on one 600 × 900 canvas so garments need
 * no per-item offsets.
 */
export function HeroinePreview({ face = 'neutral', heroine }: Props) {
  const h = heroine ?? save.value.heroine;
  const back = h.extra ? requireItem(h.extra).art.heroineBack : undefined;
  const layers = [
    back ? assetUrl(back) : null,
    assetUrl('shared/heroine/body'),
    assetUrl(requireItem(h.hair).art.heroineLayer!),
    assetUrl(requireItem(h.outfit).art.heroineLayer!),
    assetUrl(requireItem(h.shoes).art.heroineLayer!),
    h.extra ? assetUrl(requireItem(h.extra).art.heroineLayer!) : null,
  ];
  return (
    <span
      class="heroine"
      role="img"
      aria-label="Heroine"
      data-outfit={h.outfit}
      data-shoes={h.shoes}
    >
      {layers.map(
        (url, i) => url && <img key={i} src={url} alt="" class="heroine-layer" draggable={false} />,
      )}
      <img
        src={assetUrl(`shared/heroine/face/${face}`)}
        alt=""
        class="heroine-face"
        draggable={false}
      />
    </span>
  );
}
