import { useEffect, useState } from 'preact/hooks';
import { assetEntry, manifest } from '../../assets.ts';
import type { AnchorKind, FigureAnchors } from '../../assetTypes.ts';
import { heroineFigure, requireItem } from '../../catalog/index.ts';
import { HEROINE_GEOMETRY } from '../../catalog/slots.ts';
import type { Theme } from '../../core/types.ts';
import { devFace, devTick, save } from '../../state/store.ts';
import { FALLBACK_ANCHORS, overlayStyle } from '../../catalog/heroine.ts';
import type { Face } from './Heroine.tsx';

const KINDS: AnchorKind[] = ['face', 'feet', 'head', 'back'];
const FACES: Face[] = ['neutral', 'happy', 'thinking', 'cheering'];

/**
 * Heroine anchor overlay (`?debug=heroine`, SPEC §16.4), dev builds only: draws the current
 * figure's four anchors over the room heroine and nudges them in place. 1–4 or click select an
 * anchor; arrows move it in figure px (Shift = 10); [ and ] change its scale; F cycles the
 * face overlay; C copies `{ "<figure id>": { anchors } }` for assets/manifest.json to the
 * clipboard and logs it. Nothing is persisted: paste the JSON into the manifest.
 */
export function HeroineDebug({ theme }: { theme: Theme }) {
  const [selected, setSelected] = useState<AnchorKind>('face');
  const [, rerender] = useState(0);
  const h = save.value.heroine;
  const figureId = heroineFigure(h.outfit, h.hair);
  const figure = assetEntry(figureId);
  if (!figure.anchors) figure.anchors = structuredClone(FALLBACK_ANCHORS);
  const anchors: FigureAnchors = figure.anchors;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      const a = anchors[selected];
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft':
          a.x -= step;
          break;
        case 'ArrowRight':
          a.x += step;
          break;
        case 'ArrowUp':
          a.y -= step;
          break;
        case 'ArrowDown':
          a.y += step;
          break;
        case '[':
          a.scale = Math.round((a.scale - 0.02) * 100) / 100;
          break;
        case ']':
          a.scale = Math.round((a.scale + 0.02) * 100) / 100;
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          setSelected(KINDS[Number(e.key) - 1]!);
          break;
        case 'f':
        case 'F':
          devFace.value = FACES[(FACES.indexOf(devFace.value) + 1) % FACES.length]!;
          break;
        case 'c':
        case 'C': {
          const json = JSON.stringify({ [figureId]: { anchors } }, null, 2);
          console.log(json);
          void navigator.clipboard?.writeText(json);
          break;
        }
        default:
          handled = false;
      }
      if (!handled) return;
      e.preventDefault();
      e.stopPropagation();
      devTick.value += 1;
      rerender((n) => n + 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selected, anchors, figureId]);

  const g = HEROINE_GEOMETRY[theme];
  const width = (g.height * figure.size[0]) / figure.size[1];
  const box = { left: g.x - width / 2, top: g.y - g.height, width, height: g.height };
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const worn: { kind: AnchorKind; id: string }[] = [
    { kind: 'feet', id: requireItem(h.shoes).art.heroineLayer! },
  ];
  if (h.extra) {
    const id = requireItem(h.extra).art.heroineLayer!;
    worn.push({ kind: assetEntry(id).anchor ?? 'head', id });
  }
  if (devFace.value !== 'neutral')
    worn.push({ kind: 'face', id: `shared/heroine/face/${devFace.value}` });

  return (
    <div class="slot-debug heroine-debug" data-testid="heroine-debug">
      <div
        class="heroine-debug-box"
        style={{
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
        }}
      >
        {worn.map(({ kind, id }) => (
          <div
            key={id}
            class={`heroine-debug-overlay${selected === kind ? ' heroine-debug-selected' : ''}`}
            style={overlayStyle(figure.size, anchors[kind], manifest.assets[id]!)}
          />
        ))}
        {KINDS.map((kind) => {
          const a = anchors[kind];
          return (
            <span
              key={kind}
              class={`slot-debug-anchor heroine-debug-anchor${selected === kind ? ' heroine-debug-selected' : ''}`}
              style={{ left: pct(a.x, figure.size[0]), top: pct(a.y, figure.size[1]) }}
              title={kind}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(kind);
              }}
            />
          );
        })}
      </div>
      <div class="slot-debug-help heroine-debug-help">
        <strong>{figureId}</strong>
        <ul>
          {KINDS.map((kind, i) => {
            const a = anchors[kind];
            return (
              <li key={kind} class={selected === kind ? 'heroine-debug-current' : ''}>
                {i + 1} {kind}: {a.x},{a.y} ×{a.scale}
              </li>
            );
          })}
        </ul>
        1–4 select, arrows move (Shift ×10), [ ] scale, F face ({devFace.value}), C copies JSON
      </div>
    </div>
  );
}
