import { useEffect, useState } from 'preact/hooks';
import { requireItem } from '../../catalog/index.ts';
import {
  COMPANION_GEOMETRY,
  ENTRY_GEOMETRY,
  HEROINE_GEOMETRY,
  SLOT_GEOMETRY,
} from '../../catalog/slots.ts';
import type { SlotType, Theme } from '../../core/types.ts';
import { SLOT_TYPES } from '../../core/types.ts';
import { devTick, save } from '../../state/store.ts';
import { roomLayerBox } from './RoomScene.tsx';

type Target = SlotType | 'heroine' | 'companion' | 'entry';

const QA_CHECKLIST = [
  'Outline weight and palette match neighbouring assets',
  'Silhouette reads at tile size',
  'No text or artefacts',
  'Fits its slot without covering the standing area',
  'Companion poses match the reference sheet',
];

/**
 * Slot debug overlay (SPEC §16.4, §15.6 QA checklist), dev builds only: draws every slot box
 * and anchor, and nudges the geometry in place for tuning. Click a box to select it; arrow keys
 * move the anchor (Shift = 10 px), [ and ] change the scale, C copies the theme's geometry as
 * JSON to the clipboard and logs it. Nothing here is persisted: paste the JSON into slots.ts.
 */
export function SlotDebug({ theme }: { theme: Theme }) {
  const [selected, setSelected] = useState<Target>('BED');
  const [, rerender] = useState(0);
  const slots = save.value.themes[theme].slots;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      const geo =
        selected === 'heroine'
          ? HEROINE_GEOMETRY[theme]
          : selected === 'companion'
            ? COMPANION_GEOMETRY[theme]
            : selected === 'entry'
              ? ENTRY_GEOMETRY[theme]
              : SLOT_GEOMETRY[theme][selected];
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft':
          geo.x -= step;
          break;
        case 'ArrowRight':
          geo.x += step;
          break;
        case 'ArrowUp':
          geo.y -= step;
          break;
        case 'ArrowDown':
          geo.y += step;
          break;
        case '[':
          if ('scale' in geo) geo.scale = Math.round((geo.scale - 0.05) * 100) / 100;
          else geo.height -= 10;
          break;
        case ']':
          if ('scale' in geo) geo.scale = Math.round((geo.scale + 0.05) * 100) / 100;
          else geo.height += 10;
          break;
        case 'c':
        case 'C': {
          const json = JSON.stringify(
            {
              slots: SLOT_GEOMETRY[theme],
              heroine: HEROINE_GEOMETRY[theme],
              companion: COMPANION_GEOMETRY[theme],
              entry: ENTRY_GEOMETRY[theme],
            },
            null,
            2,
          );
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
  }, [selected, theme]);

  const boxes = SLOT_TYPES.map((slot) => {
    const g = SLOT_GEOMETRY[theme][slot];
    const box = roomLayerBox(theme, slot, requireItem(slots[slot]).art.room!);
    return { id: slot as Target, box, anchor: { x: g.x, y: g.y }, note: `×${g.scale} z${g.z}` };
  });
  const h = HEROINE_GEOMETRY[theme];
  const c = COMPANION_GEOMETRY[theme];
  const en = ENTRY_GEOMETRY[theme];
  boxes.push(
    {
      id: 'heroine',
      box: {
        left: h.x - h.height / 3,
        top: h.y - h.height,
        width: (h.height * 2) / 3,
        height: h.height,
        z: 0,
      },
      anchor: { x: h.x, y: h.y },
      note: `h${h.height}`,
    },
    {
      id: 'companion',
      box: {
        left: c.x - (c.height * 400) / 480 / 2,
        top: c.y - c.height,
        width: (c.height * 400) / 480,
        height: c.height,
        z: 0,
      },
      anchor: { x: c.x, y: c.y },
      note: `h${c.height}`,
    },
    {
      id: 'entry',
      box: {
        left: en.x - (en.height * 320) / 400 / 2,
        top: en.y - en.height,
        width: (en.height * 320) / 400,
        height: en.height,
        z: 0,
      },
      anchor: { x: en.x, y: en.y },
      note: `h${en.height}`,
    },
  );

  return (
    <div class="slot-debug" data-testid="slot-debug">
      {boxes.map(({ id, box, anchor, note }) => (
        <div
          key={id}
          class={`slot-debug-box${selected === id ? ' slot-debug-selected' : ''}`}
          style={{
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(id);
          }}
        >
          <span class="slot-debug-label">
            {id} {Math.round(anchor.x)},{Math.round(anchor.y)} {note}
          </span>
          <span
            class="slot-debug-anchor"
            style={{ left: `${anchor.x - box.left}px`, top: `${anchor.y - box.top}px` }}
          />
        </div>
      ))}
      <div class="slot-debug-help">
        <strong>{selected}</strong> arrows move (Shift ×10), [ ] scale, C copies JSON
        <ul>
          {QA_CHECKLIST.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
