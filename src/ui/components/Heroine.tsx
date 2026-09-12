import { assetUrl } from '../../assets.ts';
import { requireItem } from '../../catalog/index.ts';
import { save } from '../../state/store.ts';

type Face = 'neutral' | 'happy' | 'thinking' | 'cheering';

interface Props {
  face?: Face;
}

/**
 * Layered heroine (SPEC §4.5): body, hair, outfit, shoes, extra and a face overlay, all on
 * one 600 × 900 canvas so garments need no per-item offsets. Placeholder layers for now.
 */
export function HeroinePreview({ face = 'neutral' }: Props) {
  const h = save.value.heroine;
  const layers = [
    assetUrl('shared/heroine/body'),
    assetUrl(requireItem(h.hair).art.heroineLayer!),
    assetUrl(requireItem(h.outfit).art.heroineLayer!),
    assetUrl(requireItem(h.shoes).art.heroineLayer!),
    h.extra ? assetUrl(requireItem(h.extra).art.heroineLayer!) : null,
  ];
  return (
    <span class="heroine" role="img" aria-label="Heroine">
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
